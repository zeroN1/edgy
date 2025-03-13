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

process.on("message", (task: Task) => {
  console.log("Worker processing task ", task);

  const { input, type } = task;
  if (type === "code") vm.runInContext(input, context);
  else {
    const code = fs.readFileSync(resolve("./data/", input), { encoding: "utf-8", flag: "r" });
    vm.runInContext(code, context);
  }

  process.send!({ id: task.id, success: true, value: context.result } as TaskInfo);
});
