import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const board = await prisma.board.update({
    where: { id },
    data: body,
    include: { categories: true, tasks: true },
  });
  return NextResponse.json(board);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.board.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
