import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.category.findFirst({
    where: { id, board: { userId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const body = await request.json();
  const category = await prisma.category.update({
    where: { id },
    data: body,
  });
  return NextResponse.json(category);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.category.findFirst({
    where: { id, board: { userId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
