import { default as express } from "express";
import { default as cors } from "cors";
import { HttpStatus, fileUploader, validateSchema } from "./utils";
import { CreateTaskDto, CreateTaskDtoSchema } from "./schema";
import { SqliteEngine } from "./db";
import { TaskService } from "./task";
import path from "path";
import { existsSync, unlinkSync } from "fs";

const srv = express();
const db = new SqliteEngine();
const taskSvc = new TaskService(db);
const PORT = 8080;
const HOST = "127.0.0.1";

srv.use(cors());
srv.use(express.json());

srv.get("/:taskId", async (req, res) => {
  const id = req.params.taskId;
  console.log(`Getting task ${id}`);

  const getRes = await taskSvc.getTask(id);
  if (getRes.isErr()) {
    const { type, message } = getRes.error;
    let status;
    if (type === "read-error") {
      status = HttpStatus.NotFound;
    } else status = HttpStatus.ServerError;

    res.status(status).send({
      status,
      message,
    });

    return;
  }

  const task = getRes.value;
  res.status(HttpStatus.Ok).send({
    status: HttpStatus.Ok,
    task,
  });
});

srv.post("/", async (req, res) => {
  const body = req.body;
  const validationRes = await validateSchema<CreateTaskDto>(CreateTaskDtoSchema, body);
  if (validationRes.isErr()) {
    const { error } = validationRes;
    res.status(400).send({
      type: error.type,
      errors: error.issues,
    });
    return;
  }

  const data = validationRes.value;
  console.log("Creating task", data);
  const createRes = await taskSvc.createTask(data);

  if (createRes.isErr()) {
    const { type, message } = createRes.error;
    res.status(HttpStatus.ServerError).send({
      status: HttpStatus.ServerError,
      message,
      type,
    });

    return;
  }

  res.status(HttpStatus.Ok).send({
    status: HttpStatus.Ok,
    task: createRes.value,
  });
});

srv.delete("/:taskId", async (req, res) => {
  const id = req.params.taskId;
  console.log(`Deleting task ${id}`);

  const deleteRes = await taskSvc.deleteTask(id);
  if (deleteRes.isErr()) {
    const { message, type } = deleteRes.error;
    res.status(HttpStatus.ServerError).send({
      status: HttpStatus.ServerError,
      type,
      message,
    });

    return;
  }

  const task = deleteRes.value;
  const fp = path.resolve("./data".concat(task.input));

  if (existsSync(fp)) {
    console.log(`Deleting file @ ${fp}`);
    unlinkSync(fp);
  }

  res.status(HttpStatus.Ok).send({
    status: HttpStatus.Ok,
    task: deleteRes.value,
  });
});

srv.put("/", fileUploader.single("file"), async (req, res) => {
  if (!req.file) {
    res.send({
      status: HttpStatus.ServerError,
      message: `File was not uploaded`,
    });
    return;
  }
  const body = req.body;
  const validationRes = await validateSchema<CreateTaskDto>(CreateTaskDtoSchema, body);
  if (validationRes.isErr()) {
    const { type, issues } = validationRes.error;
    res.status(HttpStatus.ValidationError).send({
      status: HttpStatus.ValidationError,
      type,
      issues,
    });

    return;
  }

  const data = validationRes.value;
  if (data.type !== "file") data.type = "file";
  data.input = req.file.filename;
  console.log("Creating task", req.file, data);

  const createRes = await taskSvc.createTask(data);
  if (createRes.isErr()) {
    const { type, message } = createRes.error;
    res.status(HttpStatus.ServerError).send({
      status: HttpStatus.ServerError,
      type,
      message,
    });

    return;
  }

  const task = createRes.value;
  res.status(HttpStatus.Ok).send({
    status: HttpStatus.Ok,
    task,
  });
});

async function main() {
  console.log("Starting server");
  srv.listen(PORT, HOST, async (err) => {
    if (err) {
      console.error(err);
      console.log("Stopping server");
      return process.exit(1);
    }
    console.log(`Server started on ${HOST}:${PORT}\n`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
