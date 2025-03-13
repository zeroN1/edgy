import pm2 from "pm2";
import { Result, err, ok } from "neverthrow";

const processes: pm2.StartOptions[] = [
  {
    name: "api",
    script: "dist/src/api.js",
    output: "data/out.log",
    error: "data/error.log",
  },
  {
    name: "queue",
    script: "dist/src/queue.js",
    output: "data/out.log",
    error: "data/error.log",
  },
];

async function startProcess(opts: pm2.StartOptions): Promise<Result<void, Error>> {
  try {
    await new Promise<void>((resolve, reject) => {
      pm2.start(opts, (err) => {
        console.error(err);
        if (err) reject(err);
        else resolve();
      });
    });

    return ok(undefined);
  } catch (e) {
    return err(e as Error);
  }
}

async function main() {
  try {
    await new Promise<void>((resolve, reject) => pm2.connect((err) => (err ? reject(err) : resolve())));
    console.log("pm2 server online. Starting processes");

    for (const proc of processes) {
      const res = await startProcess(proc);
      if (res.isErr()) {
        const { error } = res;
        throw new Error(`Could not start process: ${error.message}`);
      }
    }
  } catch (e) {
    console.error(e);
    pm2.disconnect();
  }
}

main().catch((e) => console.error(e));
