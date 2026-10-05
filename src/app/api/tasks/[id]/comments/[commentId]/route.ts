import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: taskId, commentId } = await params;
  const existing = await prisma.taskComment.findFirst({
    where: {
      id: commentId,
      taskId,
      task: { userId },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const { text } = await request.json();
  const comment = await prisma.taskComment.update({
    where: { id: commentId },
    data: { text },
  });
  return NextResponse.json(comment);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: taskId, commentId } = await params;
  const existing = await prisma.taskComment.findFirst({
    where: {
      id: commentId,
      taskId,
      task: { userId },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  await prisma.taskComment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}
