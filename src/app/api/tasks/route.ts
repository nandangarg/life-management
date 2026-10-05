import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { transformTask } from "@/lib/transform";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tasks = await prisma.task.findMany({
      where: { userId },
      include: {
        categories: { include: { category: true }, orderBy: { category: { position: "asc" } } },
        schedules: true,
        actions: { orderBy: { position: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tasks.map(transformTask));
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const board = await prisma.board.findFirst({
    where: { id: body.boardId, userId },
  });
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const categoryIds: string[] = body.categoryIds ?? [];

  const maxPosition = await prisma.task.aggregate({
    where: { boardId: body.boardId, status: body.status || "TODO" },
    _max: { position: true },
  });

  const task = await prisma.task.create({
    data: {
      userId,
      boardId: body.boardId,
      title: body.title,
      description: body.description || null,
      status: body.status || "TODO",
      priority: body.priority || "MEDIUM",
      estimatedMin: body.estimatedMin || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      position: (maxPosition._max.position ?? -1) + 1,
      tags: body.tags || "[]",
      startTime: body.startTime || null,
      endTime: body.endTime || null,
      isFixed: body.isFixed || false,
      isRecurring: body.isRecurring || false,
      recurrenceRule: body.recurrenceRule || null,
      isHabit: body.isHabit || false,
      habitUnit: body.habitUnit || null,
      categories: {
        create: categoryIds.map((categoryId) => ({ categoryId })),
      },
    },
    include: {
      categories: { include: { category: true }, orderBy: { category: { position: "asc" } } },
      schedules: true,
      actions: { orderBy: { position: "asc" } },
    },
  });

  return NextResponse.json(transformTask(task), { status: 201 });
}
