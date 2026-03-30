import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const boards = await prisma.board.findMany({
    include: {
      categories: { orderBy: { position: "asc" } },
      tasks: {
        include: { category: true, schedules: true },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { position: "asc" },
  });
  return NextResponse.json(boards);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const maxPosition = await prisma.board.aggregate({ _max: { position: true } });
  const board = await prisma.board.create({
    data: {
      name: body.name,
      color: body.color || "#6366f1",
      position: (maxPosition._max.position ?? -1) + 1,
    },
    include: { categories: true, tasks: true },
  });
  return NextResponse.json(board, { status: 201 });
}
