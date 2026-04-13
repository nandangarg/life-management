import { prisma } from "@/lib/db";
import { randomDarkColor } from "@/lib/color";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
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
  const categories = await prisma.category.findMany({ select: { id: true } });
  await Promise.all(
    categories.map((cat) =>
      prisma.category.update({ where: { id: cat.id }, data: { color: randomDarkColor() } })
    )
  );
  return NextResponse.json({ updated: categories.length });
}
