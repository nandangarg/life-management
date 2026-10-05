/**
 * Import data from prisma/backup.json into the PostgreSQL database.
 * Run AFTER migration: npm run db:import
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../src/lib/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupPath = path.resolve(__dirname, "backup.json");

if (!fs.existsSync(backupPath)) {
  console.error(`Backup file not found at ${backupPath}`);
  console.error(`Run "npm run db:export" before the migration.`);
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

async function main() {
  console.log(`Importing from backup created at ${backup.exportedAt}`);

  // Check database is empty (safety guard)
  const existingBoards = await prisma.board.count();
  if (existingBoards > 0) {
    console.error(`Database already has ${existingBoards} boards. Clear it first or this is a mistake.`);
    process.exit(1);
  }

  // 1. Boards
  for (const b of backup.boards) {
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
  for (const c of backup.categories) {
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

  // 3. Tasks
  for (const t of backup.tasks) {
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
        tags: t.tags || "[]",
        startTime: t.startTime,
        endTime: t.endTime,
        isFixed: Boolean(t.isFixed),
        isRecurring: Boolean(t.isRecurring),
        recurrenceRule: t.recurrenceRule,
        isHabit: Boolean(t.isHabit),
        habitUnit: t.habitUnit,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      },
    });
  }
  console.log(`✓ Imported ${backup.tasks.length} tasks`);

  // 4. TaskCategories (many-to-many join)
  if (backup.taskCategories && backup.taskCategories.length > 0) {
    for (const tc of backup.taskCategories) {
      await prisma.taskCategory.create({
        data: {
          taskId: tc.taskId,
          categoryId: tc.categoryId,
        },
      });
    }
    console.log(`✓ Imported ${backup.taskCategories.length} taskCategory assignments`);
  }

  // 5. Schedules
  for (const s of backup.schedules) {
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
        isCancelled: Boolean(s.isCancelled),
        actualStartTime: s.actualStartTime,
        actualEndTime: s.actualEndTime,
        actualMin: s.actualMin,
        metricValue: s.metricValue,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      },
    });
  }
  console.log(`✓ Imported ${backup.schedules.length} schedules`);

  // 6. Comments
  if (backup.comments && backup.comments.length > 0) {
    for (const c of backup.comments) {
      await prisma.taskComment.create({
        data: {
          id: c.id,
          taskId: c.taskId,
          text: c.text,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        },
      });
    }
    console.log(`✓ Imported ${backup.comments.length} comments`);
  }

  // 7. Actions / Subtasks
  if (backup.actions && backup.actions.length > 0) {
    for (const a of backup.actions) {
      await prisma.taskAction.create({
        data: {
          id: a.id,
          taskId: a.taskId,
          text: a.text,
          isCompleted: Boolean(a.isCompleted),
          completedAt: a.completedAt ? new Date(a.completedAt) : null,
          position: a.position,
          createdAt: new Date(a.createdAt),
          updatedAt: new Date(a.updatedAt),
        },
      });
    }
    console.log(`✓ Imported ${backup.actions.length} actions/subtasks`);
  }

  console.log(`\nImport complete! All data successfully restored into Neon PostgreSQL.`);
}

main()
  .catch((e) => {
    console.error("Import failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
