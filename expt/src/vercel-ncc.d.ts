// Create a file named vercel-ncc.d.ts in your project
declare module "@vercel/ncc" {
  interface NccOptions {
    cache?: boolean | string;
    externals?: string[];
    filterAssetBase?: string;
    minify?: boolean;
    sourceMap?: boolean;
    sourceMapBasePrefix?: string;
    sourceMapRegister?: boolean;
    watch?: boolean;
    v8cache?: boolean;
    quiet?: boolean;
    debugLog?: boolean;
    target?: string;
  }

  interface NccResult {
    code: string;
    map?: string;
    assets?: { [key: string]: { source: Buffer; permissions?: number } };
  }

  function ncc(entry: string, options?: NccOptions): Promise<NccResult>;

  export default ncc;
}
