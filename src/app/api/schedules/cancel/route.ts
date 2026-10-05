import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { taskId, date } = body;

    if (!taskId || !date) {
      return NextResponse.json({ error: "Missing taskId or date" }, { status: 400 });
    }

    const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if there is already an explicit schedule for this task on this date
    const existing = await prisma.taskSchedule.findFirst({
      where: { taskId, date }
    });

    let schedule;
    if (existing) {
      schedule = await prisma.taskSchedule.update({
        where: { id: existing.id },
        data: { isCancelled: true }
      });
    } else {
      schedule = await prisma.taskSchedule.create({
        data: {
          taskId,
          date,
          startTime: "00:00",
          endTime: "00:00",
          isCancelled: true
        }
      });
    }

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("Error cancelling schedule:", error);
    return NextResponse.json({ error: "Failed to cancel schedule" }, { status: 500 });
  }
}
