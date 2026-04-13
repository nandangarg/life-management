import { prisma } from "@/lib/db";
import { transformTask } from "@/lib/transform";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const categoryIds: string[] = body.categoryIds ?? [];

  const maxPosition = await prisma.task.aggregate({
    where: { boardId: body.boardId, status: body.status || "TODO" },
    _max: { position: true },
  });

  const task = await prisma.task.create({
    data: {
      boardId: body.boardId,
      title: body.title,
      description: body.description || null,
      status: body.status || "TODO",
      priority: body.priority || "MEDIUM",
      estimatedMin: body.estimatedMin || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      position: (maxPosition._max.position ?? -1) + 1,
      tags: body.tags || "[]",
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
