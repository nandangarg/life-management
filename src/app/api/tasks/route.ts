import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const maxPosition = await prisma.task.aggregate({
    where: { boardId: body.boardId, status: body.status || "TODO" },
    _max: { position: true },
  });
  const task = await prisma.task.create({
    data: {
      boardId: body.boardId,
      categoryId: body.categoryId || null,
      title: body.title,
      description: body.description || null,
      status: body.status || "TODO",
      priority: body.priority || "MEDIUM",
      estimatedMin: body.estimatedMin || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      position: (maxPosition._max.position ?? -1) + 1,
      tags: body.tags || "[]",
    },
    include: { category: true, schedules: true },
  });
  return NextResponse.json(task, { status: 201 });
}
