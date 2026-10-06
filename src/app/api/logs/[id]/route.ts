import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function calcDurationMin(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.timeLog.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) data.title = body.title.trim();
    if (body.date !== undefined) data.date = body.date;
    if (body.startTime !== undefined) data.startTime = body.startTime;
    if (body.endTime !== undefined) data.endTime = body.endTime;
    if (body.notes !== undefined) data.notes = body.notes ? body.notes.trim() : null;
    if (body.taskId !== undefined) {
      if (body.taskId) {
        const task = await prisma.task.findFirst({ where: { id: body.taskId, userId } });
        if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
        data.taskId = body.taskId;
      } else {
        data.taskId = null;
      }
    }

    const start = (body.startTime || existing.startTime) as string;
    const end = (body.endTime || existing.endTime) as string;
    data.durationMin = body.durationMin && body.durationMin > 0
      ? body.durationMin
      : calcDurationMin(start, end);

    const updated = await prisma.timeLog.update({
      where: { id },
      data,
      include: {
        task: {
          include: {
            board: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating time log:", error);
    return NextResponse.json({ error: "Failed to update log" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.timeLog.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  try {
    await prisma.timeLog.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting time log:", error);
    return NextResponse.json({ error: "Failed to delete log" }, { status: 500 });
  }
}
