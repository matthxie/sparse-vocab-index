export interface RawModelOutput {
  [key: string]: unknown;
}

export abstract class BaseAdapter {
  constructor(protected vocabulary: string[]) {}

  abstract encode(raw: RawModelOutput): Uint8Array;
}
