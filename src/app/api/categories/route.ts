import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { randomDarkColor } from "@/lib/color";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const board = await prisma.board.findFirst({
    where: { id: body.boardId, userId },
  });
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const maxPosition = await prisma.category.aggregate({
    where: { boardId: body.boardId },
    _max: { position: true },
  });
  const category = await prisma.category.create({
    data: {
      boardId: body.boardId,
      name: body.name,
      color: body.color || "#8b5cf6",
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });
  return NextResponse.json(category, { status: 201 });
}

export async function PATCH() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    where: { board: { userId } },
    select: { id: true },
  });
  await Promise.all(
    categories.map((cat) =>
      prisma.category.update({ where: { id: cat.id }, data: { color: randomDarkColor() } })
    )
  );
  return NextResponse.json({ updated: categories.length });
}
