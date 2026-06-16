import { calculateQuantizedCosine, calculateJaccard } from './core/DistanceMetrics.js';
import { encodeUuid, decodeUuid } from './core/UuidCodec.js';
const MAGIC = 0x53564958;
const VERSION = 1;
export class VocabIndex {
    items = new Map();
    vocabSize;
    constructor(vocabSize) {
        this.vocabSize = vocabSize;
    }
    get size() {
        return this.items.size;
    }
    add(id, vector) {
        if (vector.length !== this.vocabSize) {
            throw new Error(`Vector length ${vector.length} !== vocabSize ${this.vocabSize}`);
        }
        this.items.set(id, vector);
    }
    remove(id) {
        this.items.delete(id);
    }
    search(queryVector, topK, metric = 'cosine') {
        const scoreFn = metric === 'jaccard' ? calculateJaccard : calculateQuantizedCosine;
        const results = [];
        for (const [id, vector] of this.items) {
            const score = scoreFn(queryVector, vector);
            if (score > 0) {
                results.push({ id, score });
            }
        }
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, topK);
    }
    serialize() {
        const itemCount = this.items.size;
        const totalSize = 14 + (16 + this.vocabSize) * itemCount;
        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);
        view.setUint32(0, MAGIC, false);
        view.setUint16(4, VERSION, false);
        view.setUint32(6, this.vocabSize, false);
        view.setUint32(10, itemCount, false);
        let offset = 14;
        for (const [id, vector] of this.items) {
            bytes.set(encodeUuid(id), offset);
            offset += 16;
            bytes.set(vector, offset);
            offset += this.vocabSize;
        }
        return bytes;
    }
    static deserialize(bytes) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const magic = view.getUint32(0, false);
        if (magic !== MAGIC) {
            throw new Error(`Invalid magic number: 0x${magic.toString(16)}`);
        }
        const version = view.getUint16(4, false);
        if (version !== VERSION) {
            throw new Error(`Unsupported version: ${version}`);
        }
        const vocabSize = view.getUint32(6, false);
        const itemCount = view.getUint32(10, false);
        const index = new VocabIndex(vocabSize);
        let offset = 14;
        for (let i = 0; i < itemCount; i++) {
            const id = decodeUuid(bytes.slice(offset, offset + 16));
            offset += 16;
            const vector = bytes.slice(offset, offset + vocabSize);
            offset += vocabSize;
            index.add(id, vector);
        }
        return index;
    }
}
//# sourceMappingURL=VocabIndex.js.map