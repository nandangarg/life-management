import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: taskId } = await params;
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await request.json();

  const maxPosition = await prisma.taskAction.aggregate({
    where: { taskId },
    _max: { position: true },
  });

  const action = await prisma.taskAction.create({
    data: {
      taskId,
      text: body.text,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  return NextResponse.json(action, { status: 201 });
}
