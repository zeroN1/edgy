/**
 * In this approach, we ditch the vfs idea. We make it simpler:
 *
 * 1. Gzip upload for files
 * 2. Once uploaded, should be extracted to temp dir
 * 3. Use ncc/webpack to build a single exe
 * 4. Send this exe to worker to execute and see if it works
 */

import path from "path";
import { gunzip, gunzipSync } from "zlib";
import * as tar from "tar";
import { existsSync, writeFileSync } from "fs";
import * as ncc from "@vercel/ncc";
import { createContext, runInContext } from "vm";

async function setup() {
  const tarPath = path.resolve("./data/proj-x.tar.gz");
  if (!existsSync(tarPath)) throw new Error(`No tar @ ${tarPath}`);
  await tar.extract({ file: tarPath });

  const res = await ncc.default(path.resolve("./data/proj-x"), {});
  console.log(res.code);

  const ctx = createContext({
    __dirname,
    __filename,
    module: {},
  });
  runInContext(res.code, ctx);

  console.log(ctx);
  writeFileSync("./data/test.js", res.code, { encoding: "utf-8", flag: "w+" });
}

setup().catch((e) => console.error(e));
