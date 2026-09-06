// @the-inclusionist/model-fetch — fetch model/asset bytes with Cache API persistence + streaming progress.
export { concatChunks } from './chunks.js';
export { HttpModelFetcher } from './fetcher.js';
export type { ModelFetcher, FetchResult, FetchOptions, HttpModelFetcherDeps } from './fetcher.js';

export const VERSION = '0.1.0';
