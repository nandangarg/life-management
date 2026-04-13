import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params;
  const { text } = await request.json();

  const comment = await prisma.taskComment.create({
    data: { taskId, text },
  });

  return NextResponse.json(comment, { status: 201 });
}
