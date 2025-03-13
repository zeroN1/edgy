import { default as zod } from "zod";

const MaxRetries = 5 as const;

const TaskType = zod.enum(["code", "file"]).optional().default("code");

export const CreateTaskDtoSchema = zod.object({
  name: zod.string().nonempty("Task name is required"),
  input: zod.string().nonempty().max(256, "Task string too long"),
  retries: zod.number().nonnegative().optional().default(MaxRetries),
  attempts: zod.number().nonnegative().optional().default(0),
  delay: zod.number().nonnegative().optional().default(5000), // in ms
  type: TaskType,
  processed: zod.boolean().default(false),
  status: zod.enum(["successful", "failed", "todo"]).default("todo"),
  lastAttempted: zod.string().datetime().optional(),
});

export type CreateTaskDto = {
  name: string;
  input: string;
  retries: number;
  attempts: number;
  delay: number;
  type: "code" | "file";
};

export type Task = {
  id: string;
  processed: boolean;
  status: "successful" | "failed" | "todo";
  lastAttempted?: string;
} & CreateTaskDto;
