import { Result, err, ok } from "neverthrow";
import { Keyv } from "keyv";
import KeyvSqlite from "@keyv/sqlite";
import { v4 as uuidV4 } from "uuid";
import { Task } from "./schema";
import path from "path";

export type Document = { id: string } & { [key: string]: any };

export type DatabaseError = {
  type: "read-error" | "write-error" | "unknown";
  message: string;
  errors?: string[];
};

export interface DatabaseEngine {
  add: (data: any) => Promise<Result<Document, DatabaseError>>;
  delete: (id: string) => Promise<Result<Document, DatabaseError>>;
  get: (id: string) => Promise<Result<Document, DatabaseError>>;
  update: (id: string, updates: any) => Promise<Result<Document, DatabaseError>>;
  iterator: <T>() => AsyncGenerator<[string, T]>;
}

export class SqliteEngine implements DatabaseEngine {
  private readonly store: Keyv;
  constructor() {
    const dbpath = path.resolve("./db/db.sqlite");
    const store = new KeyvSqlite(dbpath);
    this.store = new Keyv({ store });
  }

  async add(data: any): Promise<Result<Document, DatabaseError>> {
    const id = uuidV4();
    const doc: Document = {
      id,
      ...data,
    };

    try {
      const written = await this.store.set<Document>(id, doc);
      if (!written) {
        return err({ type: "write-error", message: "Could not write to store" });
      }

      return ok(doc);
    } catch (e) {
      return err({
        type: "write-error",
        message: `Could not write to store: ${(e as Error).message}`,
      });
    }
  }

  async delete(id: string): Promise<Result<Document, DatabaseError>> {
    try {
      const exists = await this.store.has(id);
      if (!exists) {
        return err({
          type: "write-error",
          message: `No such document with ID ${id}`,
        });
      }

      const doc = await this.store.get<Document>(id);
      const deleted = await this.store.delete(id);
      if (!deleted) {
        return err({
          type: "write-error",
          message: `Could not delete document`,
        });
      }

      return ok(doc as Document);
    } catch (e) {
      return err({ type: "write-error", message: `Could not delete document: ${(e as Error).message}` });
    }
  }

  async get(id: string): Promise<Result<Document, DatabaseError>> {
    try {
      const doc = await this.store.get<Document>(id, { raw: true });
      if (!doc) {
        return err({
          type: "read-error",
          message: `No such document with ID ${id}`,
        });
      }

      return ok(doc as Document);
    } catch (e) {
      return err({ type: "read-error", message: `Could not get document: ${(e as Error).message}` });
    }
  }

  async update(id: string, updates: Partial<Omit<Task, "id">>): Promise<Result<Document, DatabaseError>> {
    const docRes = await this.get(id);
    if (docRes.isErr()) {
      return err(docRes.error);
    }

    const oldDoc = docRes.value;
    const newDoc: Document = {
      ...oldDoc.value,
      ...updates,
    };

    try {
      const written = await this.store.set<Document>(id, newDoc);
      if (!written) {
        return err({ type: "write-error", message: `Could not update document` });
      }

      return ok(newDoc);
    } catch (e) {
      return err({ type: "write-error", message: `Could not update document: ${(e as Error).message}` });
    }
  }

  async *iterator<T>(): AsyncGenerator<[string, T]> {
    if (!this.store.iterator) {
      throw new Error("No iterator supported");
    }

    const iter = this.store.iterator!({});
    for await (const [key, doc] of iter) {
      yield [key, doc as T];
    }
  }
}
