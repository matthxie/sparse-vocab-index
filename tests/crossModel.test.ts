import { describe, it, expect } from 'vitest';
import { RankAdapter } from '../src/adapters/RankAdapter.js';
import { calculateQuantizedCosine } from '../src/core/DistanceMetrics.js';

describe('crossModel similarity', () => {
  it('minor rank drift between models produces cosine > 0.90', () => {
    const vocabulary = ['space', 'dark', 'composition'];
    const adapter = new RankAdapter(vocabulary);

    const vecA = adapter.encode({ rankedConcepts: ['space', 'dark', 'composition'] });
    const vecB = adapter.encode({ rankedConcepts: ['space', 'composition', 'dark'] });

    expect(calculateQuantizedCosine(vecA, vecB)).toBeGreaterThan(0.90);
  });
});
