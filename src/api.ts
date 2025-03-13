import { default as express } from "express";
import { default as cors } from "cors";
import { HttpStatus, fileUploader, validateSchema } from "./utils";
import { CreateTaskDto, CreateTaskDtoSchema } from "./schema";
import { SqliteEngine } from "./db";
import { TaskService } from "./task";

const srv = express();
const db = new SqliteEngine();
const taskSvc = new TaskService(db);

const PORT = 8080;
const HOST = "127.0.0.1";

srv.use(cors());
srv.use(express.json());

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
