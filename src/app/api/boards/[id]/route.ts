import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.board.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const body = await request.json();
  const board = await prisma.board.update({
    where: { id },
    data: body,
    include: { categories: true, tasks: true },
  });
  return NextResponse.json(board);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.board.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  await prisma.board.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
