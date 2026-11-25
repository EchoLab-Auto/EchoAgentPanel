//! WS 下行帧的**应用层压缩**协商与解封装（2026-11 远程访问优化）。
//!
//! ## 为什么在应用层做，而不是 permessage-deflate
//!
//! 远程访问（广域网 / 隧道 / 反向代理）下 WS 同时受带宽与 RTT 制约：时间线
//! 首屏一帧（200 条）、长回答正文、工具参数与结果都是裸 JSON 文本，中文 +
//! 结构化的压缩比常在 4:1 以上。而 `axum` 0.8 的 `WebSocketUpgrade` 不暴露
//! permessage-deflate 配置，开启它得绕开升级 API 自己接裸 socket——收益相同
//! 而风险高一个数量级。
//!
//! 因此中继只对**大帧**（服务端阈值 32 KiB）做 gzip，用 WS **二进制帧**下发：
//!
//! ```text
//! [ 'E' 'G' 'Z' '1' ][ gzip(utf8 json) ... ]
//! ```
//!
//! 用二进制而不是 base64 信封：base64 会放大 33%，正好吃掉一小半收益。
//! 魔数必须与 Rust 侧 `ws_compress::MAGIC` 一致。
//!
//! ## 顺序是硬约束
//!
//! `DecompressionStream` 只有异步 API。若压缩帧异步解、普通帧同步交付，
//! 紧随其后的普通帧会**越过**仍在解压的那一帧 → Panel 收到乱序事件，表现为
//! 「工具结果先到、叙述后到」（ChatView 的 `freezeStreams` 分步边界会错）。
//!
//! 所以 [`FrameDecoder`] 维护一条串行链：**任何一帧开始解压，后续帧都排在它
//! 后面**。链空闲时普通帧同步交付，因此常态下没有额外微任务开销。
//!
//! ## 协商（不能让旧前端收到压缩帧）
//!
//! 压缩帧对不认识它的客户端就是「乱码 → 整帧丢弃」。所以连接时前端在 WS
//! query 里声明 [`FRAME_GZIP_PARAM`]，中继**只对声明过的连接**压缩。能力
//! 探测用 `DecompressionStream` 的存在性（Chrome 80+ / Safari 16.4+ /
//! Firefox 113+）；不支持就照旧拿明文，功能完全不受影响。

/** 前端声明「支持压缩帧」的 WS query 参数名（值为 `1`）。 */
export const FRAME_GZIP_PARAM = 'frame_gzip';

/**
 * 压缩帧魔数（4 字节 ASCII）。**必须与 Rust `ws_compress::MAGIC` 逐字节一致**。
 *
 * 用字符串常量而不是数字数组：两边对照时代码里能直接看出是同一组字节。
 */
export const FRAME_MAGIC = 'EGZ1';

const MAGIC_BYTES = [0x45, 0x47, 0x5a, 0x31]; // 'E' 'G' 'Z' '1'

/**
 * 本浏览器是否支持解压压缩帧。
 *
 * 只在浏览器环境调用（连接建立于浏览器）；SSR / 单元测试里
 * `DecompressionStream` 可能缺失——缺失即视为不支持，于是不声明，中继
 * 永远发明文，测试与旧环境都不受影响。
 */
export function supportsFrameGzip(): boolean {
  return typeof DecompressionStream !== 'undefined';
}

/** WS 连接要附加的协商 query 值（`null` = 不声明）。 */
export function frameGzipQuery(): string | null {
  return supportsFrameGzip() ? '1' : null;
}

/**
 * 从 WebSocket 消息里取压缩载荷。
 *
 * 只有「二进制帧 + 4 字节魔数匹配」才算压缩帧；其余（文本帧、未知二进制）
 * 返回 `null`，调用方按原样处理。**宁可多解析一次 JSON，也绝不把正常帧
 * 误判成压缩帧而丢掉**。
 */
export function compressedPayloadOf(data: unknown): Uint8Array | null {
  if (!(data instanceof ArrayBuffer)) return null;
  if (data.byteLength <= MAGIC_BYTES.length) return null;
  const bytes = new Uint8Array(data);
  for (let i = 0; i < MAGIC_BYTES.length; i++) {
    if (bytes[i] !== MAGIC_BYTES[i]) return null;
  }
  return bytes.subarray(MAGIC_BYTES.length);
}

/**
 * 解开一帧压缩载荷 → 原始 JSON 文本。
 *
 * 解不开（数据损坏 / 浏览器 API 半途失效）返回 `null` 而不是抛：调用方据此
 * 丢帧并留痕——单帧丢失可被 `since_seq` 增量补拉自愈，而抛出去会打断串行
 * 链，后面的帧全部堵死。
 */
export async function inflateFrame(payload: Uint8Array): Promise<string | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const source = new Blob([payload as unknown as BlobPart]).stream();
    const stream = source.pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  } catch {
    return null;
  }
}

/**
 * 下行帧的串行解码器：压缩帧异步解、普通帧直接交付，**顺序严格保持**。
 *
 * `deliver` 拿到的是原始 JSON 文本（压缩帧是解压后的，普通帧是入参原样）。
 * 解码失败的帧不会调用 `deliver`，回调 `onDrop` 供调用方记一条 warn。
 */
export class FrameDecoder {
  /** 串行链尾：普通帧发现链空闲时走同步快路径。 */
  private tail: Promise<void> = Promise.resolve();

  private pending = 0;

  constructor(private readonly onDrop: (reason: string) => void = () => {}) {}

  /** 是否有压缩帧正在解（测试/诊断用）。 */
  get busy(): boolean {
    return this.pending > 0;
  }

  push(data: unknown, deliver: (text: string) => void): void {
    const payload = compressedPayloadOf(data);
    if (payload === null) {
      if (typeof data !== 'string') {
        // 未知二进制帧（协议里不存在）：记一条就丢弃，绝不尝试当文本解析。
        this.onDrop('收到无法识别的二进制帧（已丢弃）');
        return;
      }
      // 普通文本帧：链空闲时同步交付（零微任务开销，时序与改前一致）。
      if (this.pending === 0) {
        deliver(data);
        return;
      }
      this.tail = this.tail.then(() => deliver(data));
      return;
    }
    this.pending += 1;
    this.tail = this.tail
      .then(async () => {
        const text = await inflateFrame(payload);
        if (text === null) {
          this.onDrop('压缩帧解压失败（帧已丢弃，将由 seq 增量补拉）');
          return;
        }
        deliver(text);
      })
      .catch((error: unknown) => {
        this.onDrop(`压缩帧解码异常：${String(error)}`);
      })
      .finally(() => {
        this.pending -= 1;
      });
  }

  /** 等待链上全部帧交付完毕（测试用；生产路径不需要）。 */
  async drain(): Promise<void> {
    await this.tail;
  }
}
