import { Result, ok, err } from "neverthrow";
import path from "path";
import multer from "multer";
import Zod from "zod";

export enum HttpStatus {
  Ok = 200,
  ServerError = 500,
  ValidationError = 400,
  NoContent = 204,
  NotFound = 404,
}

export type ValidationError = {
  type: "validation-error";
  issues: string | string[];
};

export type TaskInfo = {
  id: string;
  success: boolean;
  error?: any;
  value?: any;
};

export type ValidationResult<T> = Result<T, ValidationError>;

export function validateSchema<T>(schema: Zod.Schema, data: any): ValidationResult<T> {
  try {
    const r = schema.parse(data);
    return ok(r as T);
  } catch (e) {
    const type = "validation-error";
    if (e instanceof Zod.ZodError) {
      return err({
        type,
        issues: e.issues.map((i) => i.message),
      });
    }
    return err({
      type,
      issues: (e as Error).message,
    });
  }
}

const destpath = path.resolve("./data");
export const fileUploader = multer({
  dest: destpath,
  fileFilter: (req, file, cb) => {
    const mime = file.mimetype;

    const ext = file.originalname.split(".")[1];
    if (!mime || !ext) {
      console.warn("No mime or ext", mime, ext);
      return cb(null, false);
    }
    if (mime.toLocaleLowerCase() !== "text/javascript" || (ext && ext !== "js")) {
      console.warn("Not a JS file", mime, ext);
      return cb(null, false);
    }

    return cb(null, true);
  },
});
