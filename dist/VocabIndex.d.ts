export type SearchResult = {
    id: string;
    score: number;
};
export type SimilarityMetric = 'cosine' | 'jaccard';
export declare class VocabIndex {
    private items;
    readonly vocabSize: number;
    constructor(vocabSize: number);
    get size(): number;
    add(id: string, vector: Uint8Array): void;
    remove(id: string): void;
    search(queryVector: Uint8Array, topK: number, metric?: SimilarityMetric): SearchResult[];
    serialize(): Uint8Array;
    static deserialize(bytes: Uint8Array): VocabIndex;
}
//# sourceMappingURL=VocabIndex.d.ts.map