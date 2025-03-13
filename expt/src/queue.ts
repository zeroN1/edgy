import { ChildProcess, fork } from "child_process";
import { SqliteEngine } from "./db";
import { Task } from "./schema";
import { TaskInfo } from "./utils";

const db = new SqliteEngine();
let worker: ChildProcess;

const msgHandler = (info: TaskInfo) => {
  console.log(`Update on ${info.id}: Success: ${info.success ? "Yes" : "No"}`);
  if (info.success) console.log("Result", info.value);
  else console.log("Error", info.error);

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
  console.log("Task Queue started");

  console.log("Checking database for tasks: \n--------------------------\n");
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
    worker = fork("./src/worker.ts"); // make a map of [id]: worker so it can killed later
    worker.on("message", msgHandler);
    worker.send(task);
  }
}

// process.on("message", msgHandler);

main().catch((e) => console.error(e));
