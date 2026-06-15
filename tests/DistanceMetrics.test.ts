import { describe, it, expect } from 'vitest';
import { calculateQuantizedCosine, calculateJaccard } from '../src/core/DistanceMetrics.js';
import { VectorEncoder } from '../src/core/VectorEncoder.js';

describe('DistanceMetrics', () => {
  it('identical vectors → cosine = 1.0', () => {
    const vec = VectorEncoder.packFloatsToBytes([0.5, 1.0, 0.3]);
    expect(calculateQuantizedCosine(vec, vec)).toBeCloseTo(1.0, 5);
  });

  it('orthogonal vectors (no shared active dims) → cosine = 0.0, jaccard = 0.0', () => {
    const a = new Uint8Array([0xff, 0x00, 0x00]);
    const b = new Uint8Array([0x00, 0xff, 0x00]);
    expect(calculateQuantizedCosine(a, b)).toBe(0.0);
    expect(calculateJaccard(a, b)).toBe(0.0);
  });

  it('both zero vectors → cosine = 0.0 (no throw)', () => {
    const a = new Uint8Array([0x00, 0x00]);
    const b = new Uint8Array([0x00, 0x00]);
    expect(calculateQuantizedCosine(a, b)).toBe(0.0);
  });

  it('jaccard: [0xFF, 0xFF, 0x00] vs [0xFF, 0x00, 0xFF] → ≈0.333', () => {
    const a = new Uint8Array([0xff, 0xff, 0x00]);
    const b = new Uint8Array([0xff, 0x00, 0xff]);
    expect(calculateJaccard(a, b)).toBeCloseTo(1 / 3, 5);
  });
});
