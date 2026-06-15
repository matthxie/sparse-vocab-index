import { describe, it, expect } from 'vitest';
import { VocabIndex } from '../src/VocabIndex.js';
import { VectorEncoder } from '../src/core/VectorEncoder.js';

const UUID_A = '550e8400-e29b-41d4-a716-446655440000';
const UUID_B = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('VocabIndex', () => {
  it('add then search returns item with score = 1.0 against itself', () => {
    const index = new VocabIndex(3);
    const vec = VectorEncoder.packFloatsToBytes([0.5, 1.0, 0.3]);
    index.add(UUID_A, vec);
    const results = index.search(vec, 1, 'cosine');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(UUID_A);
    expect(results[0].score).toBeCloseTo(1.0, 5);
  });

  it('remove then search returns empty results', () => {
    const index = new VocabIndex(3);
    const vec = VectorEncoder.packFloatsToBytes([0.5, 1.0, 0.3]);
    index.add(UUID_A, vec);
    index.remove(UUID_A);
    expect(index.search(vec, 1)).toHaveLength(0);
  });

  it('serialize → deserialize → search produces identical results', () => {
    const index = new VocabIndex(3);
    const vec1 = VectorEncoder.packFloatsToBytes([0.5, 1.0, 0.3]);
    const vec2 = VectorEncoder.packFloatsToBytes([0.1, 0.2, 0.9]);
    index.add(UUID_A, vec1);
    index.add(UUID_B, vec2);

    const restored = VocabIndex.deserialize(index.serialize());
    const query = VectorEncoder.packFloatsToBytes([0.5, 1.0, 0.3]);
    const original = index.search(query, 10);
    const after = restored.search(query, 10);

    expect(after).toHaveLength(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(after[i].id).toBe(original[i].id);
      expect(after[i].score).toBeCloseTo(original[i].score, 5);
    }
  });

  it('deserialize with wrong magic number throws', () => {
    const bad = new Uint8Array(14);
    bad[0] = 0xde; bad[1] = 0xad; bad[2] = 0xbe; bad[3] = 0xef;
    expect(() => VocabIndex.deserialize(bad)).toThrow();
  });

  it('add with wrong vector length throws', () => {
    const index = new VocabIndex(3);
    expect(() => index.add(UUID_A, new Uint8Array(5))).toThrow();
  });
});
