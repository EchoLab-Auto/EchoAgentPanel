//! WS 下行帧的**应用层压缩**（2026-11 远程访问优化）。
//!
//! ## 为什么需要
//!
//! 远程访问（广域网 / SSH 隧道 / 反向代理）下 WS 同时受带宽与 RTT 制约。
//! 中继此前是**纯透传**：时间线首屏一帧（200 条、压缩前约 1.4MB / 瘦身后
//! ~0.6MB）、长回答正文、工具参数与结果全是裸 JSON 文本。JSON + 中文的
//! 压缩比常在 4:1 以上，而这部分流量占整条链路的绝大部分。
//!
//! ## 为什么不用 permessage-deflate
//!
//! `axum` 0.8 的 `WebSocketUpgrade` 不暴露 permessage-deflate 配置。要开它
//! 得绕开升级 API 自己接 `WebSocketStream::from_raw_socket`，把 TLS/超时/
//! 帧上限/部署门控这些已经调好的东西重做一遍——收益相同，风险高一个数量级。
//!
//! ## 为什么用二进制帧而不是 base64 信封
//!
//! base64 会把体积放大约 33%，正好吃掉一小半压缩收益，还要在两端各加一次
//! 编解码与一个 `base64` 依赖。WS 原生有二进制帧：gzip 字节直接发，前缀
//! 4 字节魔数用于识别（也是将来的版本位）。
//!
//! 必须与前端 `web/src/ws-codec.ts` 的 [`MAGIC`] 保持一致。
//!
//! ## 只在客户端声明时启用
//!
//! 压缩帧对不认识它的客户端就是「一段乱码 → 整帧丢失」。所以浏览器必须在
//! WS query 里带 `frame_gzip=1`（见 [`client_accepts`]），否则整条连接按
//! 明文转发，行为与改前完全一致——旧前端、不支持的浏览器、命令行调试都不
//! 受影响。
//!
//! ## 阈值
//!
//! 低于 [`MIN_BYTES`] 的帧不压：单条 delta、心跳、状态刷新这类小帧的压缩
//! 收益抵不过一次 gzip + 一次解压。真正值得压的是首屏时间线与长正文。

use std::io::Write;

/// 压缩帧的魔数（二进制帧前 4 字节）。必须与前端 `ws-codec.ts` 一致。
pub const MAGIC: &[u8; 4] = b"EGZ1";

/// 低于该字节数不压缩（UTF-8 字节数，不是字符数）。
///
/// 32 KiB 对应约 1 万汉字：这个量级的帧在 5 Mbps 链路上要 ~50ms 传输，
/// 压缩的 CPU 成本才开始划算。实测首屏时间线（200 条）远超这个值，而
/// 单条流式 delta（几十到几百字节）远低于它。
pub const MIN_BYTES: usize = 32 * 1024;

/// gzip 压缩级别。6 是 zlib 的默认档：与 9 相比体积通常只差 2~3%，而 CPU
/// 时间差一半以上——这条路径在会话首屏（用户正盯着白屏）上执行。
const GZIP_LEVEL: u32 = 6;

/// 客户端是否声明支持压缩帧（WS query `frame_gzip=1`）。
///
/// 环境变量 `PANEL_WS_COMPRESS=0` 可整体关闭（排障用：怀疑压缩链路有问题时
/// 不必回滚二进制，改一行环境就回退到明文）。
pub fn client_accepts(declared: Option<&str>) -> bool {
    if std::env::var("PANEL_WS_COMPRESS").map(|v| v == "0").unwrap_or(false) {
        return false;
    }
    matches!(declared, Some("1") | Some("true"))
}

/// 把一帧 UTF-8 文本压成「魔数 + gzip」的二进制载荷。
///
/// 返回 `None` 表示**不值得压**（未达阈值）或压缩失败——调用方按明文发送，
/// 于是这条路径永远不会因为压缩而丢帧。
pub fn compress_frame(text: &str) -> Option<Vec<u8>> {
    if text.len() < MIN_BYTES {
        return None;
    }
    let mut out = Vec::with_capacity(text.len() / 4 + MAGIC.len());
    out.extend_from_slice(MAGIC);
    let mut encoder =
        flate2::write::GzEncoder::new(out, flate2::Compression::new(GZIP_LEVEL));
    encoder.write_all(text.as_bytes()).ok()?;
    let bytes = encoder.finish().ok()?;
    // 压不动（高度随机的内容）时不如发明文：省得对端白解一次。
    if bytes.len() >= text.len() + MAGIC.len() {
        return None;
    }
    Some(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;

    /// 反向解压（测试专用）：跳过魔数，gunzip 出原文。
    fn decompress(payload: &[u8]) -> String {
        assert_eq!(&payload[..4], MAGIC, "magic 前缀必须存在");
        let mut decoder = flate2::read::GzDecoder::new(&payload[4..]);
        let mut out = String::new();
        decoder.read_to_string(&mut out).expect("gunzip");
        out
    }

    #[test]
    fn below_threshold_is_not_compressed() {
        let small = "x".repeat(MIN_BYTES - 1);
        assert!(compress_frame(&small).is_none());
    }

    #[test]
    fn large_repetitive_frame_roundtrips_and_shrinks() {
        // 真实形状：JSON 数组 + 大量重复键名（时间线首屏就长这样）。
        let one = r#"{"kind":"backend","content":"这是一段回答正文，用来制造可压缩的重复结构","seq":123}"#;
        let big = format!("[{}]", vec![one; 600].join(","));
        assert!(big.len() >= MIN_BYTES);
        let payload = compress_frame(&big).expect("should compress");
        assert_eq!(&payload[..4], MAGIC);
        assert!(
            payload.len() * 3 < big.len(),
            "JSON 文本压缩比应远好于 3:1（实际 {} → {}）",
            big.len(),
            payload.len()
        );
        assert_eq!(decompress(&payload), big);
    }

    #[test]
    fn exactly_at_threshold_is_compressed_or_passes_through() {
        // 阈值边界：不 panic、不丢内容即可（压不动时按约定返回 None）。
        let text = "a".repeat(MIN_BYTES);
        if let Some(payload) = compress_frame(&text) {
            assert_eq!(decompress(&payload), text);
        }
    }

    #[test]
    fn incompressible_payload_is_rejected() {
        // 伪随机（不易压缩）内容达到阈值：宁可不压，也不发一个更大的载荷。
        let mut state: u64 = 0x9E3779B97F4A7C15;
        let mut text = String::new();
        while text.len() < MIN_BYTES * 2 {
            state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
            text.push_str(&format!("{:016x}", state));
        }
        // 十六进制仍有压缩空间，这里只断言"要么不压，要么真的更小"。
        if let Some(payload) = compress_frame(&text) {
            assert!(payload.len() < text.len() + MAGIC.len());
            assert_eq!(decompress(&payload), text);
        }
    }

    #[test]
    fn client_opt_in_is_strict() {
        assert!(client_accepts(Some("1")));
        assert!(client_accepts(Some("true")));
        assert!(!client_accepts(None));
        assert!(!client_accepts(Some("0")));
        assert!(!client_accepts(Some("")));
    }
}
