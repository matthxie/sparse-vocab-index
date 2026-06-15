import { BaseAdapter } from './BaseAdapter.js';
import { VectorEncoder } from '../core/VectorEncoder.js';

export class RankAdapter extends BaseAdapter {
  encode(raw: { rankedConcepts: string[] }): Uint8Array {
    const { rankedConcepts } = raw;
    const vocabMap = new Map<string, number>();
    for (let i = 0; i < this.vocabulary.length; i++) {
      vocabMap.set(this.vocabulary[i], i);
    }

    const scores = new Map<number, number>();
    const n = rankedConcepts.length;
    for (let rank = 0; rank < n; rank++) {
      const idx = vocabMap.get(rankedConcepts[rank]);
      if (idx !== undefined) {
        scores.set(idx, 1.0 - rank / n);
      }
    }

    return VectorEncoder.packSparseMap(scores, this.vocabulary.length);
  }
}
