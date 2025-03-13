import { SqliteEngine } from "./db";

(async () => {
  const db = new SqliteEngine();

  const d = await db.add({ name: "task1", input: "x+y" });
  console.log(d._unsafeUnwrap());

  const g = await db.get(d._unsafeUnwrap().id);
  console.log(g);
})();
