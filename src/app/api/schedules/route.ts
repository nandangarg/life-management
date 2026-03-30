import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  const where = date ? { date } : {};
  const schedules = await prisma.taskSchedule.findMany({
    where,
    include: {
      task: { include: { category: true, schedules: true } },
    },
    orderBy: { startTime: "asc" },
  });
  return NextResponse.json(schedules);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const schedule = await prisma.taskSchedule.create({
    data: {
      taskId: body.taskId,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      isFixed: body.isFixed || false,
      isRecurring: body.isRecurring || false,
      recurrenceRule: body.recurrenceRule || null,
      notes: body.notes || null,
    },
    include: { task: { include: { category: true, schedules: true } } },
  });
  return NextResponse.json(schedule, { status: 201 });
}
