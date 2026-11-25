//! WS 下行帧压缩的**前端契约**（2026-11 远程访问优化）。
//!
//! 与 Rust 侧 `echo-web-server/src/ws_compress.rs` 是同一份协议的两端：
//!
//! ```text
//! [ 'E' 'G' 'Z' '1' ][ gzip(utf8 json) ... ]   ← 二进制帧
//! ```
//!
//! 本文件锁定四件事：
//!
//! 1. **识别是严格的**：只有二进制帧 + 魔数逐字节匹配才算压缩帧。任何歧义
//!    （文本帧、长度不足、魔数不符）都按原文处理——误判的代价是丢掉一条
//!    正常事件，比多解析一次 JSON 糟得多。
//! 2. **顺序是硬的**：压缩帧异步解压时，紧随其后的普通帧必须排在它后面交付
//!    （否则工具结果会越过它前面的叙述，ChatView 的分步边界会错）。
//! 3. **解不开不抛**：损坏的载荷只丢这一帧（`onDrop` 留痕），串行链继续。
//! 4. **往返正确**：解压结果与原文逐字节一致。

import { describe, it, expect, vi } from 'vitest';
import {
  FRAME_GZIP_PARAM,
  FRAME_MAGIC,
  FrameDecoder,
  compressedPayloadOf,
  frameGzipQuery,
  inflateFrame,
  supportsFrameGzip,
} from '../ws-codec';

/** 与 Rust `ws_compress::MAGIC` 必须一致。 */
const MAGIC: number[] = [0x45, 0x47, 0x5a, 0x31];

/** 把一段文本编成「魔数 + gzip」的二进制帧（等价服务端产物）。 */
async function binaryFrame(text: string): Promise<ArrayBuffer> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const gzipped = new Uint8Array(await new Response(stream).arrayBuffer());
  const out = new Uint8Array(MAGIC.length + gzipped.length);
  out.set(MAGIC, 0);
  out.set(gzipped, MAGIC.length);
  return out.buffer;
}

const hasStreams = typeof CompressionStream !== 'undefined';

describe('压缩帧识别（纯函数，不依赖浏览器流 API）', () => {
  it('魔数常量与 Rust 侧逐字节一致', () => {
    expect(FRAME_MAGIC).toBe('EGZ1');
    expect([...FRAME_MAGIC].map((c) => c.charCodeAt(0))).toEqual(MAGIC);
  });

  it('带魔数的二进制帧 → 剥掉 4 字节头', () => {
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    const buf = new Uint8Array(MAGIC.length + payload.length);
    buf.set(MAGIC, 0);
    buf.set(payload, MAGIC.length);
    expect(compressedPayloadOf(buf.buffer)).toEqual(payload);
  });

  it('文本帧永不被当作压缩帧', () => {
    expect(compressedPayloadOf('{"type":"event"}')).toBeNull();
  });

  it('魔数不符的二进制帧不算压缩帧（按未知二进制丢弃，不当文本解析）', () => {
    // 首字节不同：绝不能因为"是二进制"就假定它是压缩帧。
    expect(compressedPayloadOf(new Uint8Array([0x00, 0x47, 0x5a, 0x31, 0x01]).buffer)).toBeNull();
  });

  it('长度不足魔数的二进制帧不算压缩帧', () => {
    expect(compressedPayloadOf(new Uint8Array([0x45, 0x47]).buffer)).toBeNull();
    expect(compressedPayloadOf(new Uint8Array(MAGIC).buffer)).toBeNull();
  });

  it('Blob（binaryType 未设时的默认形态）不误判', () => {
    expect(compressedPayloadOf(new Blob([new Uint8Array(MAGIC)]))).toBeNull();
  });
});

describe('解压往返', () => {
  it.runIf(hasStreams)('解出来的文本与原文一致', async () => {
    const text = JSON.stringify({
      type: 'event',
      payload: { AgentContentDelta: { delta: '中文正文'.repeat(200) } },
    });
    const frame = await binaryFrame(text);
    const payload = compressedPayloadOf(frame);
    expect(payload).not.toBeNull();
    await expect(inflateFrame(payload!)).resolves.toBe(text);
  });

  it.runIf(hasStreams)('损坏载荷返回 null（不抛）', async () => {
    await expect(inflateFrame(new Uint8Array([1, 2, 3, 4, 5]))).resolves.toBeNull();
  });
});

describe('协商', () => {
  it('声明名与能力探测都从同一个出口取', () => {
    expect(FRAME_GZIP_PARAM).toBe('frame_gzip');
    // 支持 → 声明 "1"；不支持 → null（中继据此永不发压缩帧）。
    expect(frameGzipQuery()).toBe(supportsFrameGzip() ? '1' : null);
  });
});

describe('FrameDecoder 顺序与容错', () => {
  it.runIf(hasStreams)('压缩帧之后的普通帧不会越过它', async () => {
    // 这是整个设计里最容易错的地方：解压是异步的，若普通帧同步交付，
    // 就会"后到的先到"——工具结果越过叙述，ChatView 分步边界错乱。
    const order: string[] = [];
    const decoder = new FrameDecoder();
    decoder.push(await binaryFrame('压缩帧 1'), (text) => order.push(text));
    decoder.push('普通帧 2', (text) => order.push(text));
    decoder.push(await binaryFrame('压缩帧 3'), (text) => order.push(text));
    decoder.push('普通帧 4', (text) => order.push(text));
    await decoder.drain();
    expect(order).toEqual(['压缩帧 1', '普通帧 2', '压缩帧 3', '普通帧 4']);
  });

  it('链空闲时普通帧**同步**交付（不引入微任务延迟）', () => {
    const decoder = new FrameDecoder();
    let delivered: string | null = null;
    decoder.push('普通帧', (text) => {
      delivered = text;
    });
    // 没有 await：同步就应该已经交付。
    expect(delivered).toBe('普通帧');
    expect(decoder.busy).toBe(false);
  });

  it('损坏的压缩帧被丢弃并留痕，后续帧照常交付', async () => {
    const drops: string[] = [];
    const decoder = new FrameDecoder((reason) => drops.push(reason));
    const broken = new Uint8Array(MAGIC.length + 5);
    broken.set(MAGIC, 0);
    broken.set([9, 9, 9, 9, 9], MAGIC.length);
    const received: string[] = [];
    decoder.push(broken.buffer, (text) => received.push(text));
    decoder.push('之后的一帧', (text) => received.push(text));
    await decoder.drain();
    expect(received).toEqual(['之后的一帧']);
    expect(drops).toHaveLength(hasStreams ? 1 : 1);
  });

  it('未知二进制帧被丢弃，不当文本解析', () => {
    const onDrop = vi.fn();
    const decoder = new FrameDecoder(onDrop);
    const deliver = vi.fn();
    decoder.push(new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]).buffer, deliver);
    expect(deliver).not.toHaveBeenCalled();
    expect(onDrop).toHaveBeenCalledTimes(1);
  });
});
