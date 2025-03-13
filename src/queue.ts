import { ChildProcess, fork } from "child_process";
import { SqliteEngine } from "./db";
import { Task } from "./schema";
import { TaskInfo } from "./utils";

const PollTime = 100;

const db = new SqliteEngine();
const workers: { [key: string]: ChildProcess } = {};
let timer: NodeJS.Timeout;

const msgHandler = (info: TaskInfo) => {
  const worker = workers[info.id];
  console.log(`Update on ${info.id}: Success: ${info.success ? "Yes" : "No"}`);
  if (info.success) console.log("Result", info.value);
  else console.error("Error", info.error);

  setTimeout(() => {
    console.log("Shutting down worker");
    worker.kill();
  }, 5000);
};

function shouldProcess(task: Task): boolean {
  const isTodo = task.status === "todo";
  const isFailed = task.status === "failed";
  const canRetry = task.attempts < task.retries;
  const delayAble = task.lastAttempted && Date.now() - new Date(task.lastAttempted).getTime() < 5000 ? true : false;

  return (isTodo && canRetry && !delayAble) || (isFailed && canRetry && !delayAble);
}

async function main() {
  console.log("Task Queue loop started");

  for await (const [id, task] of db.iterator<Task>()) {
    console.log(
      `ID:\t\t ${id}\nStatus:\t\t ${task.status}\nType:\t\t ${task.type}\nAttempts:\t ${task.attempts}\nRetries:\t ${
        task.retries
      }\nProcessed:\t ${task.processed ? "yes" : "no"}\n`
    );
    if (!shouldProcess(task)) {
      console.log(`Skipping task ${id}\n`);
      continue;
    }

    console.log(`Processing ${id}`);
    workers[task.id] = fork("./src/worker.ts");
    const worker = workers[task.id];
    worker.on("message", msgHandler);
    worker.send(task);
  }

  timer = setTimeout(main, PollTime);
}

main().catch((e) => {
  console.error(e);
  if (timer) {
    clearTimeout(timer);
  }
  process.exit(1);
});
