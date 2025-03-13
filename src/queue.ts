import { ChildProcess, fork } from "child_process";
import { SqliteEngine } from "./db";
import { Task } from "./schema";
import { TaskInfo } from "./utils";

const PollTime = 2500;

const db = new SqliteEngine();
const workers: { [key: string]: ChildProcess } = {};
let timer: NodeJS.Timeout;

const msgHandler = async (info: TaskInfo) => {
  const worker = workers[info.id];
  const tRes = await db.get(info.id);

  if (tRes.isErr()) {
    console.error(tRes.error);
    return;
  }
  const t = tRes.value.value as Task;
  const attempts = t.attempts + 1;
  console.log(t, attempts);

  console.log(`Update on ${info.id}: Success: ${info.success ? "Yes" : "No"}`);
  if (info.success) {
    console.log("Result", info.value);
    const upRes = await db.update(info.id, { result: info.value, status: "successful", attempts });
    if (upRes.isErr()) {
      console.error(upRes.error);
    }
  } else {
    console.error("Error", info.error);

    const upRes = await db.update(info.id, { status: "failed", attempts });
    if (upRes.isErr()) {
      console.error(upRes.error);
    }
  }

  setTimeout(() => {
    console.log("Shutting down worker");
    worker.kill();
  }, 5000);
};

function shouldProcess(task: Task): boolean {
  const isTodo = task.status === "todo";
  const isFailed = task.status === "failed";
  const inProgress = task.status === "inprogress";
  const canRetry = task.attempts < task.retries;
  const delayAble = task.lastAttempted && Date.now() - new Date(task.lastAttempted).getTime() < 5000 ? true : false;

  return (isTodo && canRetry && !delayAble && !inProgress) || (isFailed && canRetry && !delayAble);
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

    const upRes = await db.update(id, { status: "inprogress" });
    if (upRes.isErr()) {
      console.error("Could not update inprogress status");
      console.error(upRes.error);
    }
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
