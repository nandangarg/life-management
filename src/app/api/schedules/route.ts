import { prisma } from "@/lib/db";
import { transformTask } from "@/lib/transform";
import { NextRequest, NextResponse } from "next/server";

const taskInclude = {
  categories: { include: { category: true }, orderBy: { category: { position: "asc" } } },
  schedules: true,
  actions: { orderBy: { position: "asc" } },
} as const;

function matchesRecurrence(task: any, dateStr: string): boolean {
  if (!task.isRecurring || !task.recurrenceRule) return false;

  const reqDate = new Date(dateStr + "T12:00:00");
  const createdDate = new Date(task.createdAt);
  
  const reqTime = reqDate.getTime();
  const createdTime = new Date(createdDate.toISOString().split("T")[0] + "T12:00:00").getTime();

  if (reqTime < createdTime) return false;

  const diffDays = Math.floor((reqTime - createdTime) / (1000 * 60 * 60 * 24));

  let rule: {
    frequency: "day" | "week" | "month" | "year";
    interval: number;
    weekdays?: string[];
    until?: string | null;
  };

  try {
    if (task.recurrenceRule.startsWith("{")) {
      rule = JSON.parse(task.recurrenceRule);
    } else {
      if (task.recurrenceRule === "DAILY") {
        rule = { frequency: "day", interval: 1 };
      } else if (task.recurrenceRule.startsWith("WEEKLY:")) {
        const day = task.recurrenceRule.split(":")[1];
        rule = { frequency: "week", interval: 1, weekdays: [day] };
      } else {
        return false;
      }
    }
  } catch (err) {
    console.error("Failed to parse recurrence rule:", task.recurrenceRule, err);
    return false;
  }

  if (rule.until) {
    const untilTime = new Date(rule.until + "T12:00:00").getTime();
    if (reqTime > untilTime) return false;
  }

  const interval = rule.interval || 1;

  if (rule.frequency === "day") {
    return diffDays % interval === 0;
  }

  if (rule.frequency === "week") {
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const currentDayName = dayNames[reqDate.getDay()];
    
    const weekdays = rule.weekdays || [];
    if (weekdays.length > 0 && !weekdays.includes(currentDayName)) {
      return false;
    }

    const createdDayOfWeek = createdDate.getDay();
    const reqDayOfWeek = reqDate.getDay();
    const createdSunday = createdTime - createdDayOfWeek * (24 * 60 * 60 * 1000);
    const reqSunday = reqTime - reqDayOfWeek * (24 * 60 * 60 * 1000);
    const diffWeeks = Math.round((reqSunday - createdSunday) / (7 * 24 * 60 * 60 * 1000));

    return diffWeeks % interval === 0;
  }

  if (rule.frequency === "month") {
    if (reqDate.getDate() !== createdDate.getDate()) return false;
    const diffMonths = (reqDate.getFullYear() - createdDate.getFullYear()) * 12 + (reqDate.getMonth() - createdDate.getMonth());
    return diffMonths % interval === 0;
  }

  if (rule.frequency === "year") {
    if (reqDate.getDate() !== createdDate.getDate() || reqDate.getMonth() !== createdDate.getMonth()) return false;
    const diffYears = reqDate.getFullYear() - createdDate.getFullYear();
    return diffYears % interval === 0;
  }

  return false;
}

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
    const recurringTasks = await prisma.task.findMany({
      where: {
        isRecurring: true,
        status: { not: "DONE" },
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

    const matchingTasks = recurringTasks.filter(t => matchesRecurrence(t, date));

    for (const task of matchingTasks) {
      if (!scheduledTaskIds.has(task.id)) {
        projectedSchedules.push({
          id: `virtual_${task.id}`,
          taskId: task.id,
          date,
          startTime: task.startTime || "09:00",
          endTime: task.endTime || "10:00",
          isFixed: task.isFixed,
          isRecurring: true,
          recurrenceRule: task.recurrenceRule,
          completedAt: null,
          notes: null,
          isCancelled: false,
          actualStartTime: null,
          actualEndTime: null,
          actualMin: null,
          metricValue: null,
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
      completedAt: body.completedAt ? new Date(body.completedAt) : null,
      actualStartTime: body.actualStartTime || null,
      actualEndTime: body.actualEndTime || null,
      actualMin: body.actualMin !== undefined ? parseInt(body.actualMin) : null,
      metricValue: body.metricValue !== undefined ? parseFloat(body.metricValue) : null,
    },
    include: { task: { include: taskInclude } },
  });
  return NextResponse.json({ ...schedule, task: transformTask(schedule.task) }, { status: 201 });
}
