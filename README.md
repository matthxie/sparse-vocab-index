# sparse-vocab-index

Zero-dependency TypeScript library for memory-efficient sparse vocabulary indexing and similarity search. Runs in Vercel Edge Functions, Node.js 18+, and browsers.

## How it works

Each vocabulary term is packed into one byte:

- **Bit 7 (MSB):** presence flag — `1` = active, `0` = absent (`0x00`)
- **Bits 6–0:** quantized score — integer 0–127 representing a float 0.0–1.0

A document becomes a `Uint8Array` of length N (vocab size). The index holds all items in memory and does a linear scan on search.

Serialized blobs use the SVIX binary format — a 14-byte header followed by 16-byte UUID + N-byte vector per item — suitable for storage in Redis or Supabase.

## Install

```bash
npm install sparse-vocab-index
```

## Usage

```typescript
import { VocabIndex, RankAdapter } from 'sparse-vocab-index'

const vocabulary = ['astrophotography', 'dark', 'composition', 'urban']
const adapter = new RankAdapter(vocabulary)
const index = new VocabIndex(vocabulary.length)

// Encode an LLM-ranked concept list and insert
const vector = adapter.encode({ rankedConcepts: ['astrophotography', 'dark'] })
index.add('post-uuid-1', vector)

// Search
const results = index.search(vector, 10, 'cosine')
// → [{ id: 'post-uuid-1', score: 1.0 }, ...]

// Serialize for storage
const blob = index.serialize()

// Restore from storage
const restored = VocabIndex.deserialize(blob)
```

## API

### `VocabIndex`

| Method | Description |
|---|---|
| `new VocabIndex(vocabSize)` | Create an index |
| `add(id, vector)` | Insert or replace an item |
| `remove(id)` | Delete an item |
| `search(query, topK, metric?)` | Linear scan; metric is `'cosine'` (default) or `'jaccard'` |
| `serialize()` | Export to binary blob |
| `VocabIndex.deserialize(bytes)` | Reconstruct from blob |

### `VectorEncoder`

| Method | Description |
|---|---|
| `packFloatsToBytes(scores)` | `(number \| null)[]` → `Uint8Array` |
| `unpackBytesToFloats(bytes)` | `Uint8Array` → `(number \| null)[]` |
| `packSparseMap(map, vocabSize)` | Sparse `Map<index, score>` → `Uint8Array` |

### `RankAdapter`

Converts an ordered concept list to a vector using rank-decay weights: `weight = 1.0 - (rank / n)`, so rank 0 → 1.0 and the last rank → `1/n`. Concepts not in the vocabulary are silently ignored.

### Distance functions

```typescript
calculateQuantizedCosine(a, b)  // 0.0–1.0, operates on active dimensions
calculateJaccard(a, b)           // presence-only overlap
calculateDotProduct(a, b)        // raw dot product over active dimensions
```

## Build

```bash
npm run build     # emit to dist/
npm test          # vitest
npm run typecheck # tsc --noEmit
```
