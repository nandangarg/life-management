/**
 * Export all data from the current SQLite database to prisma/backup.json.
 * Run BEFORE migration: npm run db:export
 *
 * Uses better-sqlite3 directly so it works regardless of Prisma client state.
 */
import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB lives at project root (dev.db) — one level up from prisma/
const dbPath = path.resolve(__dirname, "../dev.db");

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

const boards = db.prepare("SELECT * FROM Board ORDER BY position").all();
const categories = db.prepare("SELECT * FROM Category ORDER BY boardId, position").all();
const tasks = db.prepare("SELECT * FROM Task ORDER BY boardId, position").all();
const schedules = db.prepare("SELECT * FROM TaskSchedule ORDER BY taskId, date, startTime").all();

db.close();

const backup = {
  exportedAt: new Date().toISOString(),
  schemaVersion: "pre-task-categories-and-comments",
  boards,
  categories,
  tasks,
  schedules,
};

const outPath = path.resolve(__dirname, "backup.json");
fs.writeFileSync(outPath, JSON.stringify(backup, null, 2));

console.log(`✓ Backup saved to prisma/backup.json`);
console.log(`  ${boards.length} boards`);
console.log(`  ${categories.length} categories`);
console.log(`  ${(tasks as unknown[]).length} tasks`);
console.log(`  ${(schedules as unknown[]).length} schedules`);
