import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const data: any = { ...body };
  if (data.completedAt !== undefined) {
    data.completedAt = data.completedAt ? new Date(data.completedAt) : null;
  }

  // Handle virtual schedule completion/update
  if (id.startsWith("virtual_")) {
    const taskId = data.taskId || id.replace("virtual_", "");
    const date = data.date || new Date().toISOString().split("T")[0];

    const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const existing = await prisma.taskSchedule.findFirst({
      where: { taskId, date },
    });

    if (existing) {
      const updated = await prisma.taskSchedule.update({
        where: { id: existing.id },
        data,
      });
      return NextResponse.json(updated);
    }

    const created = await prisma.taskSchedule.create({
      data: {
        taskId,
        date,
        startTime: data.startTime || "09:00",
        endTime: data.endTime || "10:00",
        isFixed: Boolean(data.isFixed),
        isRecurring: data.isRecurring !== undefined ? Boolean(data.isRecurring) : true,
        recurrenceRule: data.recurrenceRule || null,
        completedAt: data.completedAt || null,
      },
    });
    return NextResponse.json(created);
  }

  const existingSchedule = await prisma.taskSchedule.findFirst({
    where: { id, task: { userId } },
  });
  if (!existingSchedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const schedule = await prisma.taskSchedule.update({
    where: { id },
    data,
  });
  return NextResponse.json(schedule);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (id.startsWith("virtual_")) {
    return NextResponse.json({ success: true });
  }

  const existingSchedule = await prisma.taskSchedule.findFirst({
    where: { id, task: { userId } },
  });
  if (!existingSchedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  await prisma.taskSchedule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
