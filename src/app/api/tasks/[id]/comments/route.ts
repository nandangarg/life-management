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

  const { text } = await request.json();

  const comment = await prisma.taskComment.create({
    data: { taskId, text },
  });

  return NextResponse.json(comment, { status: 201 });
}
