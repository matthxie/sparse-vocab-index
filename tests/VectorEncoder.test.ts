import { describe, it, expect } from 'vitest';
import { VectorEncoder } from '../src/core/VectorEncoder.js';

describe('VectorEncoder', () => {
  it('packs 0.0 as 0x80 (present, score 0)', () => {
    expect(VectorEncoder.packFloatsToBytes([0.0])[0]).toBe(0x80);
  });

  it('packs 1.0 as 0xFF (present, score 127)', () => {
    expect(VectorEncoder.packFloatsToBytes([1.0])[0]).toBe(0xff);
  });

  it('packs null as 0x00 (absent)', () => {
    expect(VectorEncoder.packFloatsToBytes([null])[0]).toBe(0x00);
  });

  it('clamps negative values to 0x80', () => {
    expect(VectorEncoder.packFloatsToBytes([-0.5])[0]).toBe(0x80);
  });

  it('clamps values > 1.0 to 0xFF', () => {
    expect(VectorEncoder.packFloatsToBytes([1.5])[0]).toBe(0xff);
  });

  it('round-trips 0.5 within quantization error', () => {
    const packed = VectorEncoder.packFloatsToBytes([0.5]);
    const unpacked = VectorEncoder.unpackBytesToFloats(packed);
    expect(unpacked[0]).toBeCloseTo(0.5, 1);
  });

  it('packSparseMap with vocabSize=4, entry at index 2 only', () => {
    const vec = VectorEncoder.packSparseMap(new Map([[2, 1.0]]), 4);
    expect(vec[0]).toBe(0x00);
    expect(vec[1]).toBe(0x00);
    expect(vec[2]).toBe(0xff);
    expect(vec[3]).toBe(0x00);
  });
});
