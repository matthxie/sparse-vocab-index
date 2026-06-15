# PRODUCT SPECIFICATION: `sparse-vocab-index`

A zero-dependency TypeScript library for memory-efficient sparse vocabulary indexing and similarity search. Quantizes vocabulary alignment scores into a 7-bit packed byte format and provides fast in-memory nearest-neighbor search over a serializable binary index. Designed to run in Vercel Edge Functions, Node.js, and browsers.

---

## 1. DESIGN CONSTRAINTS

- **Language:** Strict TypeScript. Target ES2022+.
- **Zero dependencies:** No third-party packages. Use only `ArrayBuffer`, `Uint8Array`, `DataView`, and `TextEncoder`/`TextDecoder`.
- **Runtime targets:** Vercel Edge Runtime, Node.js 18+, modern browsers (no Node built-ins like `fs` or `crypto`).
- **Memory:** Minimize allocations. Reuse buffers where possible. All similarity operations work directly on typed arrays.
- **Published as:** npm package. Main entry: `dist/index.js`. Types: `dist/index.d.ts`. ESM only.

---

## 2. BYTE FORMAT SPECIFICATION

Each vocabulary term occupies exactly one byte:

```
Bit 7 (MSB): Presence flag — 1 = term is active/scored, 0 = term absent (entire byte is 0x00)
Bits 6–0:    Quantized score — integer 0–127 representing a float 0.0–1.0
```

Examples:
- `0x00` — absent (presence bit = 0)
- `0xFF` — present, score = 1.0 (0x80 | 127)
- `0x80` — present, score = 0.0 (edge case: explicitly scored as zero)
- `0xC0` — present, score = 0.5 (0x80 | 64)

A vector for a vocabulary of size N is a `Uint8Array` of length N.

---

## 3. BINARY BLOB FORMAT (for Redis / Supabase storage)

The serialized index is a flat binary blob:

```
[HEADER]
  4 bytes — magic number: 0x53564958 ("SVIX")
  2 bytes — format version: uint16, currently 1
  4 bytes — vocab size: uint32
  4 bytes — item count: uint32

[ITEMS] — repeated `item count` times
  16 bytes — item ID (UUID stored as raw bytes, no dashes)
  N bytes  — packed vector (N = vocab size)
```

Total size: `14 + (16 + N) * item_count` bytes.

For N=512, 1K items: ~528KB. For 10K items: ~5.3MB.

---

## 4. REPOSITORY STRUCTURE

```
sparse-vocab-index/
├── src/
│   ├── core/
│   │   ├── VectorEncoder.ts     # Float normalization and byte packing
│   │   ├── DistanceMetrics.ts   # Cosine, dot product, Jaccard
│   │   └── UuidCodec.ts         # UUID string ↔ 16-byte Uint8Array
│   ├── VocabIndex.ts            # Main index class
│   ├── adapters/
│   │   ├── BaseAdapter.ts       # Abstract adapter interface
│   │   └── RankAdapter.ts       # Converts ranked concept lists to vectors
│   └── index.ts                 # Public API re-exports
├── tests/
│   ├── VectorEncoder.test.ts
│   ├── DistanceMetrics.test.ts
│   ├── VocabIndex.test.ts
│   └── crossModel.test.ts
├── package.json
└── tsconfig.json
```

---

## 5. COMPONENT SPECIFICATIONS

### `src/core/VectorEncoder.ts`

```typescript
class VectorEncoder {
  /**
   * Pack an array of nullable floats into a Uint8Array.
   * scores[i] = null means absent → 0x00
   * scores[i] = float 0.0–1.0 → 0x80 | Math.round(val * 127)
   * Clamp out-of-range values: negatives → 0.0, values > 1.0 → 1.0
   */
  static packFloatsToBytes(scores: (number | null)[]): Uint8Array

  /**
   * Reverse pack operation.
   * 0x00 → null (absent)
   * Any byte with MSB set → (byte & 0x7F) / 127 as float
   */
  static unpackBytesToFloats(bytes: Uint8Array): (number | null)[]

  /**
   * Pack a sparse map of { vocabIndex: score } into a fixed-length vector.
   * vocabSize determines output length. All unspecified indices → 0x00.
   */
  static packSparseMap(scores: Map<number, number>, vocabSize: number): Uint8Array
}
```

### `src/core/DistanceMetrics.ts`

All functions take two `Uint8Array` vectors of equal length. They skip bytes where either vector's presence bit is 0.

```typescript
/**
 * Raw dot product over active (presence bit = 1) dimensions.
 * Extracts the 7-bit score from each byte before multiplying.
 */
function calculateDotProduct(a: Uint8Array, b: Uint8Array): number

/**
 * Cosine similarity. Returns 0 if either vector has zero magnitude.
 * Range: 0.0–1.0 (inputs are non-negative so no negative cosine).
 */
function calculateQuantizedCosine(a: Uint8Array, b: Uint8Array): number

/**
 * Jaccard similarity over presence bits only (ignores score magnitudes).
 * intersection = positions where both have presence bit = 1
 * union = positions where either has presence bit = 1
 * Returns 0 if union is empty.
 */
function calculateJaccard(a: Uint8Array, b: Uint8Array): number
```

### `src/core/UuidCodec.ts`

```typescript
/**
 * Encode a UUID string ("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx") to 16 raw bytes.
 * Throws if input is not a valid UUID.
 */
function encodeUuid(uuid: string): Uint8Array

/**
 * Decode 16 raw bytes back to a UUID string with dashes.
 */
function decodeUuid(bytes: Uint8Array): string
```

### `src/VocabIndex.ts`

The main class. Holds all items in memory, supports serialization, and exposes search.

```typescript
type SearchResult = { id: string; score: number }
type SimilarityMetric = 'cosine' | 'jaccard'

class VocabIndex {
  constructor(vocabSize: number)

  /** Number of items currently in the index. */
  readonly size: number

  /** Vocabulary dimension this index was created with. */
  readonly vocabSize: number

  /**
   * Add or replace an item. If id already exists, the vector is overwritten.
   * Throws if vector.length !== vocabSize.
   */
  add(id: string, vector: Uint8Array): void

  /**
   * Remove an item by ID. No-op if not found.
   */
  remove(id: string): void

  /**
   * Search for top-k most similar items to queryVector.
   * Uses full linear scan — O(N).
   * Returns results sorted by descending score, length <= k.
   * Items with score = 0 are excluded.
   */
  search(
    queryVector: Uint8Array,
    topK: number,
    metric?: SimilarityMetric   // default: 'cosine'
  ): SearchResult[]

  /**
   * Serialize the entire index to a binary blob matching Section 3 format.
   * Returns a Uint8Array safe to store in Redis or Supabase.
   */
  serialize(): Uint8Array

  /**
   * Reconstruct a VocabIndex from a previously serialized blob.
   * Throws if magic number or version is invalid.
   */
  static deserialize(bytes: Uint8Array): VocabIndex
}
```

### `src/adapters/BaseAdapter.ts`

```typescript
/**
 * Raw output from an LLM or embedding model.
 * Adapters normalize this into a sparse score map.
 */
interface RawModelOutput {
  [key: string]: unknown
}

abstract class BaseAdapter {
  constructor(protected vocabulary: string[])

  /**
   * Convert raw model output into a packed Uint8Array vector
   * aligned to the vocabulary. Must call VectorEncoder internally.
   */
  abstract encode(raw: RawModelOutput): Uint8Array
}
```

### `src/adapters/RankAdapter.ts`

Handles the most common LLM output format: an ordered list of concept strings from most to least relevant.

```typescript
class RankAdapter extends BaseAdapter {
  /**
   * Input: { rankedConcepts: string[] } — ordered list, most relevant first.
   * 
   * Weight assignment (rank-decay):
   *   weight(rank) = 1.0 - (rank / rankedConcepts.length)
   *   rank 0 → 1.0, last rank → approaches 0.0
   * 
   * Concepts not in vocabulary are silently ignored.
   * Concepts in vocabulary but not in rankedConcepts → absent (0x00).
   */
  encode(raw: { rankedConcepts: string[] }): Uint8Array
}
```

---

## 6. PUBLIC API (`src/index.ts`)

Export everything the consumer needs:

```typescript
export { VocabIndex } from './VocabIndex'
export { VectorEncoder } from './core/VectorEncoder'
export { calculateDotProduct, calculateQuantizedCosine, calculateJaccard } from './core/DistanceMetrics'
export { BaseAdapter } from './adapters/BaseAdapter'
export { RankAdapter } from './adapters/RankAdapter'
export type { SearchResult, SimilarityMetric } from './VocabIndex'
```

---

## 7. TESTS

### `VectorEncoder.test.ts`
- `packFloatsToBytes([0.0])` → `[0x80]` (present, score 0)
- `packFloatsToBytes([1.0])` → `[0xFF]` (present, score 127)
- `packFloatsToBytes([null])` → `[0x00]` (absent)
- `packFloatsToBytes([-0.5])` → clamps to `[0x80]` (present, score 0)
- `packFloatsToBytes([1.5])` → clamps to `[0xFF]`
- Round-trip: `unpackBytesToFloats(packFloatsToBytes([0.5]))` ≈ `[0.5]` within quantization error
- `packSparseMap` with vocabSize=4, entry at index 2 only → indices 0,1,3 are `0x00`

### `DistanceMetrics.test.ts`
- Identical vectors → cosine = 1.0
- Orthogonal vectors (no shared active dimensions) → cosine = 0.0, jaccard = 0.0
- Both zero vectors → cosine = 0.0 (no divide-by-zero throw)
- Jaccard: `[0xFF, 0xFF, 0x00]` vs `[0xFF, 0x00, 0xFF]` → intersection=1, union=3, jaccard≈0.333

### `VocabIndex.test.ts`
- `add` then `search` returns the added item with score = 1.0 against itself
- `remove` then `search` returns empty results
- Serialize → deserialize → search produces identical results
- Deserialize with wrong magic number throws
- `add` with wrong vector length throws

### `crossModel.test.ts`
- Model A output: `{ rankedConcepts: ["space", "dark", "composition"] }`
- Model B output: `{ rankedConcepts: ["space", "composition", "dark"] }` (slight reorder)
- Both encoded via `RankAdapter` with a 3-term vocabulary
- `calculateQuantizedCosine(vecA, vecB)` > 0.90
- Rationale: minor rank drift between models should not produce dissimilar vectors

---

## 8. PACKAGE.JSON REQUIREMENTS

```json
{
  "name": "sparse-vocab-index",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.4",
    "vitest": "^1.6"
  }
}
```

No `dependencies` field — zero runtime dependencies is a hard requirement.

---

## 9. USAGE EXAMPLE

```typescript
import { VocabIndex, RankAdapter } from 'sparse-vocab-index'

const vocabulary = ['astrophotography', 'dark', 'composition', 'urban', 'architecture']
const adapter = new RankAdapter(vocabulary)
const index = new VocabIndex(vocabulary.length)

// On insert (after LLM tagging)
const vector = adapter.encode({ rankedConcepts: ['astrophotography', 'dark', 'composition'] })
index.add('post-uuid-1', vector)

// On search
const queryVector = adapter.encode({ rankedConcepts: ['night sky', 'astrophotography'] })
const results = index.search(queryVector, 10, 'cosine')
// → [{ id: 'post-uuid-1', score: 0.94 }, ...]

// Serialize for Redis
const blob = index.serialize()
await redis.set('vocab-index', blob)

// Restore from Redis
const restored = VocabIndex.deserialize(await redis.getBytes('vocab-index'))
```
