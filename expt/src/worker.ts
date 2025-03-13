import { default as vm } from "vm";
import * as fs from "fs";
import path from "path";
import { Task } from "./schema";
import { TaskInfo } from "./utils";

// create ctx and inject libs

const context = {
  fs,
  path,
};

vm.createContext(context, {});
// (context as any).global = { ...context };

process.on("message", (task: Task) => {
  console.log("Worker processing task ", task);

  const code =
    "const x=1; const y=2; fs.writeFileSync('./out.txt', `Result: ${x+y}\n`, { encoding: 'utf-8', flag: 'w+' })";
  vm.runInContext(code, context);
  // console.log((context as any).result);

  process.send!({ id: task.id, success: true, value: "" } as TaskInfo);
});

// process.on("SIGKILL", (s: any) => {
//   console.log(`Got signal: ${s}. Shutting down`);
//   //   process.exit(0);
// });
