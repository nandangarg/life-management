import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params;
  const { text } = await request.json();
  const comment = await prisma.taskComment.update({
    where: { id: commentId },
    data: { text },
  });
  return NextResponse.json(comment);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params;
  await prisma.taskComment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}
