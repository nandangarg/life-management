import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function calcDurationMin(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60; // overnight span
  return diff;
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  try {
    const logs = await prisma.timeLog.findMany({
      where: {
        userId,
        ...(date ? { date } : {}),
      },
      include: {
        task: {
          include: {
            board: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching time logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { taskId, date, startTime, endTime, notes } = body;

    if (!date || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields (date, startTime, endTime)" }, { status: 400 });
    }

    let title = body.title?.trim();
    if (taskId) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, userId },
      });
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      if (!title) {
        title = task.title;
      }
    }

    if (!title) {
      title = "Untitled Activity";
    }

    const durationMin = body.durationMin && body.durationMin > 0
      ? body.durationMin
      : calcDurationMin(startTime, endTime);

    const log = await prisma.timeLog.create({
      data: {
        userId,
        taskId: taskId || null,
        title,
        date,
        startTime,
        endTime,
        durationMin,
        notes: notes?.trim() || null,
      },
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

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Error creating time log:", error);
    return NextResponse.json({ error: "Failed to create log" }, { status: 500 });
  }
}
