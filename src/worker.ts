import { default as vm } from "vm";
import * as fs from "fs";
import path, { resolve } from "path";
import { Task } from "./schema";
import { TaskInfo } from "./utils";

// create ctx and inject libs

const context = {
  fs,
  path,
  result: null,
};

vm.createContext(context, {});

const RuntimeTimeout = new Promise<void>((_, reject) => setTimeout(() => reject(new Error("Timeout!")), 10_000));

process.on("message", async (task: Task) => {
  console.log("Worker processing task ", task);

  try {
    const { input, type } = task;
    if (type === "code") {
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          try {
            const r = vm.runInContext(input, context);
            context.result = context.result ? context.result : r;
            resolve();
          } catch (e) {
            reject(e);
          }
        }),
        RuntimeTimeout,
      ]);
    } else {
      await Promise.race([
        new Promise<void>((res, reject) => {
          try {
            const code = fs.readFileSync(resolve("./data/", input), { encoding: "utf-8", flag: "r" });
            const r = vm.runInContext(code, context);
            context.result = context.result ? context.result : r;
            res();
          } catch (e) {
            reject(e);
          }
        }),
        RuntimeTimeout,
      ]);
    }

    process.send!({ id: task.id, success: true, value: context.result } as TaskInfo);
  } catch (e) {
    process.send!({ id: task.id, success: false, value: context.result } as TaskInfo);
  }
});
