import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

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
  if (body.categoryId !== undefined) data.categoryId = body.categoryId || null;
  if (body.boardId !== undefined) data.boardId = body.boardId;
  if (body.tags !== undefined) data.tags = body.tags;

  const task = await prisma.task.update({
    where: { id },
    data,
    include: { category: true, schedules: true },
  });
  return NextResponse.json(task);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
