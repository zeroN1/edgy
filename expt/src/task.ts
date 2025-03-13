import { Result, err, ok } from "neverthrow";
import { DatabaseEngine } from "./db";
import { CreateTaskDto, Task } from "./schema";

export type TaskServiceError = {
  type: "read-error" | "write-error";
  message: string;
};

export class TaskService {
  private readonly db: DatabaseEngine;

  constructor(db: DatabaseEngine) {
    this.db = db;
  }

  async getTask(id: string): Promise<Result<Task, TaskServiceError>> {
    const res = await this.db.get(id);
    if (res.isErr()) {
      return err({ type: "read-error", message: res.error.message });
    }

    return ok(res.value as Task);
  }

  async deleteTask(id: string): Promise<Result<Task, TaskServiceError>> {
    const res = await this.db.delete(id);
    if (res.isErr()) {
      return err({ type: "write-error", message: res.error.message });
    }

    return ok(res.value as Task);
  }

  async createTask(data: CreateTaskDto): Promise<Result<Task, TaskServiceError>> {
    const res = await this.db.add(data);
    if (res.isErr()) {
      return err({ type: "write-error", message: res.error.message });
    }

    return ok(res.value as Task);
  }

  async updateTask(id: string, updates: Partial<CreateTaskDto>): Promise<Result<Task, TaskServiceError>> {
    const res = await this.db.update(id, updates);
    if (res.isErr()) {
      return err({ type: "write-error", message: res.error.message });
    }

    return ok(res.value as Task);
  }
}
