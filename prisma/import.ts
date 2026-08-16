/**
 * Import data from prisma/backup.json into the new schema.
 * Run AFTER migration: npm run db:import
 *
 * Handles the schema change:
 *   - Task.categoryId (single FK) → TaskCategory join table (many-to-many)
 *   - New TaskComment table (empty, nothing to migrate)
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupPath = path.resolve(__dirname, "backup.json");

if (!fs.existsSync(backupPath)) {
  console.error(`Backup file not found at ${backupPath}`);
  console.error(`Run "npm run db:export" before the migration.`);
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

interface BackupBoard {
  id: string; name: string; color: string; position: number;
  isHidden: number | boolean; createdAt: string; updatedAt: string;
}
interface BackupCategory {
  id: string; boardId: string; name: string; color: string;
  position: number; createdAt: string; updatedAt: string;
}
interface BackupTask {
  id: string; boardId: string; categoryId: string | null; title: string;
  description: string | null; status: string; priority: string;
  estimatedMin: number | null; dueDate: string | null; position: number;
  tags: string; createdAt: string; updatedAt: string;
}
interface BackupSchedule {
  id: string; taskId: string; date: string; startTime: string; endTime: string;
  isFixed: number | boolean; isRecurring: number | boolean;
  recurrenceRule: string | null; completedAt: string | null;
  notes: string | null; createdAt: string; updatedAt: string;
}

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.resolve(__dirname, "../dev.db")}`,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`Importing from backup created at ${backup.exportedAt}`);

  // Check database is empty (safety guard)
  const existingBoards = await prisma.board.count();
  if (existingBoards > 0) {
    console.error(`Database already has ${existingBoards} boards. Clear it first or this is a mistake.`);
    console.error(`If you want to re-import, reset the DB first: npx prisma migrate reset --force`);
    process.exit(1);
  }

  // 1. Boards
  for (const b of backup.boards as BackupBoard[]) {
    await prisma.board.create({
      data: {
        id: b.id,
        name: b.name,
        color: b.color,
        position: b.position,
        isHidden: Boolean(b.isHidden),
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.updatedAt),
      },
    });
  }
  console.log(`✓ Imported ${backup.boards.length} boards`);

  // 2. Categories
  for (const c of backup.categories as BackupCategory[]) {
    await prisma.category.create({
      data: {
        id: c.id,
        boardId: c.boardId,
        name: c.name,
        color: c.color,
        position: c.position,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      },
    });
  }
  console.log(`✓ Imported ${backup.categories.length} categories`);

  // 3. Tasks + TaskCategory migration
  let taskCategoryCount = 0;
  for (const t of backup.tasks as BackupTask[]) {
    await prisma.task.create({
      data: {
        id: t.id,
        boardId: t.boardId,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        estimatedMin: t.estimatedMin,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        position: t.position,
        tags: t.tags,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      },
    });

    // Migrate single categoryId → TaskCategory join row
    if (t.categoryId) {
      await prisma.taskCategory.create({
        data: { taskId: t.id, categoryId: t.categoryId },
      });
      taskCategoryCount++;
    }
  }
  console.log(`✓ Imported ${backup.tasks.length} tasks (${taskCategoryCount} category assignments migrated)`);

  // 4. Schedules
  for (const s of backup.schedules as BackupSchedule[]) {
    await prisma.taskSchedule.create({
      data: {
        id: s.id,
        taskId: s.taskId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        isFixed: Boolean(s.isFixed),
        isRecurring: Boolean(s.isRecurring),
        recurrenceRule: s.recurrenceRule,
        completedAt: s.completedAt ? new Date(s.completedAt) : null,
        notes: s.notes,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      },
    });
  }
  console.log(`✓ Imported ${backup.schedules.length} schedules`);

  console.log(`\nImport complete. Your data has been restored with the new schema.`);
  console.log(`Each task's old single category has been kept as the first entry in the new multi-category system.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
