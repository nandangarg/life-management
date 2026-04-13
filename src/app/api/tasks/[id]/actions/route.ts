import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params;
  const body = await request.json();

  const maxPosition = await prisma.taskAction.aggregate({
    where: { taskId },
    _max: { position: true },
  });

  const action = await prisma.taskAction.create({
    data: {
      taskId,
      text: body.text,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  return NextResponse.json(action, { status: 201 });
}
