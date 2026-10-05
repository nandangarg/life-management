import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updatedBoards = await prisma.board.updateMany({
    where: { userId: null },
    data: { userId },
  });

  const updatedTasks = await prisma.task.updateMany({
    where: { userId: null },
    data: { userId },
  });

  return NextResponse.json({
    claimed: true,
    boardsCount: updatedBoards.count,
    tasksCount: updatedTasks.count,
  });
}
