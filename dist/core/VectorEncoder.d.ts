export declare class VectorEncoder {
    static packFloatsToBytes(scores: (number | null)[]): Uint8Array;
    static unpackBytesToFloats(bytes: Uint8Array): (number | null)[];
    static packSparseMap(scores: Map<number, number>, vocabSize: number): Uint8Array;
}
//# sourceMappingURL=VectorEncoder.d.ts.map