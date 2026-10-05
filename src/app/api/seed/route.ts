import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Clear ONLY current user's data
  const userTasks = await prisma.task.findMany({ where: { userId }, select: { id: true } });
  const taskIds = userTasks.map(t => t.id);
  const userBoards = await prisma.board.findMany({ where: { userId }, select: { id: true } });
  const boardIds = userBoards.map(b => b.id);

  if (taskIds.length > 0) {
    await prisma.taskAction.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.taskComment.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.taskCategory.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.taskSchedule.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
  }

  if (boardIds.length > 0) {
    await prisma.category.deleteMany({ where: { boardId: { in: boardIds } } });
    await prisma.board.deleteMany({ where: { id: { in: boardIds } } });
  }

  const office = await prisma.board.create({
    data: {
      userId,
      name: "Office",
      color: "#3b82f6",
      position: 0,
      categories: {
        create: [
          { name: "Project Alpha", color: "#ef4444", position: 0 },
          { name: "Learning", color: "#f59e0b", position: 1 },
          { name: "Unit Initiatives", color: "#10b981", position: 2 },
        ],
      },
    },
    include: { categories: true },
  });

  const personal = await prisma.board.create({
    data: {
      userId,
      name: "Personal",
      color: "#10b981",
      position: 1,
      categories: {
        create: [
          { name: "Health", color: "#ef4444", position: 0 },
          { name: "Finance", color: "#f59e0b", position: 1 },
          { name: "Home", color: "#6366f1", position: 2 },
        ],
      },
    },
    include: { categories: true },
  });

  const spiritual = await prisma.board.create({
    data: {
      userId,
      name: "Spiritual",
      color: "#8b5cf6",
      position: 2,
      categories: {
        create: [
          { name: "Morning Practice", color: "#f59e0b", position: 0 },
          { name: "Sunday Program", color: "#3b82f6", position: 1 },
        ],
      },
    },
    include: { categories: true },
  });

  await prisma.task.create({
    data: {
      userId,
      boardId: office.id,
      title: "Review Q2 roadmap",
      description: "Review and finalize the Q2 product roadmap",
      status: "TODO",
      priority: "HIGH",
      estimatedMin: 60,
      dueDate: new Date("2026-04-05"),
      position: 0,
      categories: { create: [{ categoryId: office.categories[0].id }] },
    },
  });

  await prisma.task.create({
    data: {
      userId,
      boardId: office.id,
      title: "Complete TypeScript course",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      estimatedMin: 120,
      position: 1,
      categories: { create: [{ categoryId: office.categories[1].id }] },
    },
  });

  await prisma.task.create({
    data: {
      userId,
      boardId: personal.id,
      title: "Morning run",
      status: "TODO",
      priority: "HIGH",
      estimatedMin: 30,
      position: 0,
      categories: { create: [{ categoryId: personal.categories[0].id }] },
    },
  });

  const sundayTask = await prisma.task.create({
    data: {
      userId,
      boardId: spiritual.id,
      title: "Sunday Program",
      description: "Weekly Sunday program",
      status: "TODO",
      priority: "HIGH",
      estimatedMin: 240,
      position: 0,
      categories: { create: [{ categoryId: spiritual.categories[1].id }] },
    },
  });

  await prisma.taskSchedule.create({
    data: {
      taskId: sundayTask.id,
      date: "2026-03-29",
      startTime: "16:00",
      endTime: "20:00",
      isFixed: true,
      isRecurring: true,
      recurrenceRule: "WEEKLY:SUN",
    },
  });

  return NextResponse.json({ success: true, message: "Seed data created" });
}
