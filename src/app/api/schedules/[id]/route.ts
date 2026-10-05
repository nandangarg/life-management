import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const schedule = await prisma.taskSchedule.update({
    where: { id },
    data,
  });
  return NextResponse.json(schedule);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id.startsWith("virtual_")) {
    return NextResponse.json({ success: true });
  }
  await prisma.taskSchedule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
