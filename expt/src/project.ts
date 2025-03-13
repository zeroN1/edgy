/**
 * This is an experiment to setup a Node.js project. In this scenario,
 * the project will be a gzip file. It must have a package.json file,
 * must have main.js defined and must have a start script to run the
 * code.
 *
 * The idea is:
 *  1. Create a virtual file system with memfs
 *  2. Get the gzip file for the project and extract it in a directory in vfs
 *  3. Next download all packages; use http to download the pkg from npm and add it to node_modules
 *  4. Check if node_modules have all the deps after this step
 *  5. Now try to run the project
 */

import { ReadStream, existsSync, readFileSync, opendirSync } from "fs";
import path from "path";
import { default as axios } from "axios";
import { Volume } from "memfs";
import { createGunzip } from "zlib";
import * as tar from "tar";
import { webpack } from "webpack";
import { webpackConfig } from "./utils";
import * as fse from "fs-extra";

export type PackageJson = {
  naem: string;
  version: string;
  main: string;
  scripts: { [key: string]: string };
  devDependencies: { [key: string]: string };
  dependencies: { [key: string]: string };
} & { [key: string]: any };

function packageJsonParser() {
  const fp = path.resolve("./data/proj-x/package.json");
  if (!existsSync(fp)) {
    throw new Error(`No such directory: ${fp}`);
  }
  const content = readFileSync(fp, { encoding: "utf-8", flag: "r" });
  const json = JSON.parse(content) as PackageJson;
  return json;
}

async function downloadPackage(dep: string, version: string) {
  const baseUrl = "https://registry.npmjs.org";
  const versWithoutPrefix = version.replace(/\^/, "");
  let endpoint;
  if (dep.includes("@")) {
    endpoint = `/${dep}/-/${dep.split("/").pop()}-${versWithoutPrefix}.tgz`;
  } else {
    endpoint = `/${dep}/-/${dep}-${versWithoutPrefix}.tgz`;
  }
  const url = baseUrl.concat(endpoint!);

  try {
    return axios.get(url, { responseType: "stream" });
  } catch (e) {
    console.error(e);
  }
}

async function setupProject() {
  const pkgJson = packageJsonParser();
  const vfs = new Volume();
  vfs.mkdirSync("/app");
  vfs.mkdirSync("/app/node_modules");
  const depNames = Object.keys(pkgJson.dependencies);
  for (const dep of depNames) {
    if (dep.startsWith("@")) {
      // for ex, @keyv/sqlite causes issues in how it's handled
      continue;
    }
    const istream = await downloadPackage(dep, pkgJson.dependencies[dep]);
    const parser = new tar.Parser();
    await new Promise<void>((resolve, reject) => {
      parser.on("entry", (entry) => {
        const fp = `/app/node_modules/${dep}/${entry.path}`;
        const dirname = path.dirname(fp);
        if (!vfs.existsSync(dirname)) {
          vfs.mkdirSync(dirname, { recursive: true });
        }
        if (entry.type === "directory") {
          vfs.mkdirSync(fp, { recursive: true });
          entry.resume();
          return;
        } else {
          const ostream = vfs.createWriteStream(fp);
          entry.pipe(ostream);
        }
      });
      parser.on("end", () => {
        resolve();
      });
      parser.on("error", (e) => reject(e));

      (istream?.data as ReadStream).pipe(createGunzip()).pipe(parser);
    });
  }

  console.log(depNames);
  console.log("Project Tree", vfs.toTree());
}

async function buildProjectExe() {
  const pkgJson = packageJsonParser();
  const vfs = new Volume();
  vfs.mkdirSync("/app");
  vfs.mkdirSync("/app/node_modules");
  const depNames = Object.keys(pkgJson.dependencies);
  for (const dep of depNames) {
    if (dep.startsWith("@")) {
      // for ex, @keyv/sqlite causes issues in how it's handled
      continue;
    }
    const istream = await downloadPackage(dep, pkgJson.dependencies[dep]);
    const parser = new tar.Parser();
    await new Promise<void>((resolve, reject) => {
      parser.on("entry", (entry) => {
        const fp = `/app/node_modules/${dep}/${entry.path}`;
        const dirname = path.dirname(fp);
        if (!vfs.existsSync(dirname)) {
          vfs.mkdirSync(dirname, { recursive: true });
        }
        if (entry.type === "directory") {
          vfs.mkdirSync(fp, { recursive: true });
          entry.resume();
          return;
        } else {
          const ostream = vfs.createWriteStream(fp);
          entry.pipe(ostream);
        }
      });
      parser.on("end", () => {
        resolve();
      });
      parser.on("error", (e) => reject(e));

      (istream?.data as ReadStream).pipe(createGunzip()).pipe(parser);
    });
  }

  // recursive copy

  const conf = webpackConfig;
  //   conf.entry = ""
  //   const compiler = webpack()
}

buildProjectExe().catch((e) => console.error(e));
