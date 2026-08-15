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
    where: date ? { date, isCancelled: false } : { isCancelled: false },
    include: { task: { include: taskInclude } },
    orderBy: { startTime: "asc" },
  });

  let projectedSchedules = schedules.map((s) => ({ ...s, task: transformTask(s.task) }));

  if (date) {
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const d = new Date(date + "T12:00:00");
    const dayOfWeekName = dayNames[d.getDay()];

    const recurringTasks = await prisma.task.findMany({
      where: {
        isRecurring: true,
        status: { not: "DONE" },
        OR: [
          { recurrenceRule: "DAILY" },
          { recurrenceRule: `WEEKLY:${dayOfWeekName}` }
        ]
      },
      include: {
        categories: { include: { category: true }, orderBy: { category: { position: "asc" } } },
        schedules: true,
        actions: { orderBy: { position: "asc" } },
      }
    });

    const allSchedulesForDate = await prisma.taskSchedule.findMany({
      where: { date },
      select: { taskId: true }
    });
    const scheduledTaskIds = new Set(allSchedulesForDate.map(s => s.taskId));

    for (const task of recurringTasks) {
      if (!scheduledTaskIds.has(task.id)) {
        projectedSchedules.push({
          id: `virtual_${task.id}`,
          taskId: task.id,
          date,
          startTime: task.startTime || "09:00",
          endTime: task.endTime || "10:00",
          isFixed: false,
          isRecurring: true,
          recurrenceRule: task.recurrenceRule,
          completedAt: null,
          notes: null,
          isCancelled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          task: transformTask(task)
        });
      }
    }

    projectedSchedules.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return NextResponse.json(projectedSchedules);
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
