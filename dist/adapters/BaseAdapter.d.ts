export interface RawModelOutput {
    [key: string]: unknown;
}
export declare abstract class BaseAdapter {
    protected vocabulary: string[];
    constructor(vocabulary: string[]);
    abstract encode(raw: RawModelOutput): Uint8Array;
}
//# sourceMappingURL=BaseAdapter.d.ts.map