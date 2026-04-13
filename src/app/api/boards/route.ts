import { prisma } from "@/lib/db";
import { transformTask } from "@/lib/transform";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const boards = await prisma.board.findMany({
    include: {
      categories: { orderBy: { position: "asc" } },
      tasks: {
        include: {
          categories: { include: { category: true }, orderBy: { category: { position: "asc" } } },
          schedules: true,
          actions: { orderBy: { position: "asc" } },
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(
    boards.map((board) => ({
      ...board,
      tasks: board.tasks.map(transformTask),
    }))
  );
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
  return NextResponse.json({ ...board, tasks: board.tasks.map(transformTask) }, { status: 201 });
}
