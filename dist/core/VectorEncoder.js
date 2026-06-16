export class VectorEncoder {
    static packFloatsToBytes(scores) {
        const bytes = new Uint8Array(scores.length);
        for (let i = 0; i < scores.length; i++) {
            const val = scores[i];
            if (val === null) {
                bytes[i] = 0x00;
            }
            else {
                const clamped = Math.max(0.0, Math.min(1.0, val));
                bytes[i] = 0x80 | Math.round(clamped * 127);
            }
        }
        return bytes;
    }
    static unpackBytesToFloats(bytes) {
        const result = new Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            if ((bytes[i] & 0x80) === 0) {
                result[i] = null;
            }
            else {
                result[i] = (bytes[i] & 0x7f) / 127;
            }
        }
        return result;
    }
    static packSparseMap(scores, vocabSize) {
        const bytes = new Uint8Array(vocabSize);
        for (const [idx, score] of scores) {
            if (idx >= 0 && idx < vocabSize) {
                const clamped = Math.max(0.0, Math.min(1.0, score));
                bytes[idx] = 0x80 | Math.round(clamped * 127);
            }
        }
        return bytes;
    }
}
//# sourceMappingURL=VectorEncoder.js.map