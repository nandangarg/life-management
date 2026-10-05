import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: taskId, actionId } = await params;
  const body = await request.json();

  const existing = await prisma.taskAction.findFirst({
    where: {
      id: actionId,
      taskId,
      task: { userId },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.text !== undefined) data.text = body.text;
  if (body.position !== undefined) data.position = body.position;

  // Completing an action → set completedAt + auto-comment
  if (body.isCompleted === true && !existing.isCompleted) {
    data.isCompleted = true;
    data.completedAt = new Date();
    await prisma.taskComment.create({
      data: { taskId, text: `✓ Completed action: ${existing.text}` },
    });
  }

  // Unchecking → clear completedAt, no comment
  if (body.isCompleted === false && existing.isCompleted) {
    data.isCompleted = false;
    data.completedAt = null;
  }

  const action = await prisma.taskAction.update({ where: { id: actionId }, data });
  return NextResponse.json(action);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: taskId, actionId } = await params;
  const existing = await prisma.taskAction.findFirst({
    where: {
      id: actionId,
      taskId,
      task: { userId },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  await prisma.taskAction.delete({ where: { id: actionId } });
  return NextResponse.json({ success: true });
}
