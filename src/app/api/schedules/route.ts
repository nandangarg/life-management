import { prisma } from "@/lib/db";
import { transformTask } from "@/lib/transform";
import { NextRequest, NextResponse } from "next/server";

const taskInclude = {
  categories: { include: { category: true }, orderBy: { category: { position: "asc" } } },
  schedules: true,
  actions: { orderBy: { position: "asc" } },
} as const;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  const schedules = await prisma.taskSchedule.findMany({
    where: date ? { date } : {},
    include: { task: { include: taskInclude } },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(
    schedules.map((s) => ({ ...s, task: transformTask(s.task) }))
  );
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
    include: { task: { include: taskInclude } },
  });
  return NextResponse.json({ ...schedule, task: transformTask(schedule.task) }, { status: 201 });
}
