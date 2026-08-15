import { prisma } from "@/lib/db";
import { transformTask } from "@/lib/transform";
import { NextRequest, NextResponse } from "next/server";

const taskInclude = {
  board: {
    include: { categories: { orderBy: { position: "asc" } } },
  },
  categories: { include: { category: true }, orderBy: { category: { position: "asc" } } },
  schedules: true,
  actions: { orderBy: { position: "asc" } },
  comments: { orderBy: { createdAt: "asc" } },
} as const;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const task = await prisma.task.findUniqueOrThrow({
      where: { id },
      include: taskInclude,
    });
    return NextResponse.json(transformTask(task));
  } catch (error) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.status !== undefined) data.status = body.status;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.estimatedMin !== undefined) data.estimatedMin = body.estimatedMin;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.position !== undefined) data.position = body.position;
  if (body.boardId !== undefined) data.boardId = body.boardId;
  if (body.tags !== undefined) data.tags = body.tags;
  if (body.startTime !== undefined) data.startTime = body.startTime;
  if (body.endTime !== undefined) data.endTime = body.endTime;
  if (body.isRecurring !== undefined) data.isRecurring = body.isRecurring;
  if (body.recurrenceRule !== undefined) data.recurrenceRule = body.recurrenceRule;

  // Handle many-to-many category update: replace all existing entries
  if (body.categoryIds !== undefined) {
    const categoryIds: string[] = body.categoryIds ?? [];
    await prisma.taskCategory.deleteMany({ where: { taskId: id } });
    if (categoryIds.length > 0) {
      await prisma.taskCategory.createMany({
        data: categoryIds.map((categoryId) => ({ taskId: id, categoryId })),
      });
    }
  }

  try {
    const task = await prisma.task.update({
      where: { id },
      data,
      include: taskInclude,
    });
    return NextResponse.json(transformTask(task));
  } catch (error) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
}
