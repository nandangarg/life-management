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
  const task = await prisma.task.findUniqueOrThrow({
    where: { id },
    include: taskInclude,
  });
  return NextResponse.json(transformTask(task));
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

  const task = await prisma.task.update({
    where: { id },
    data,
    include: taskInclude,
  });

  return NextResponse.json(transformTask(task));
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
