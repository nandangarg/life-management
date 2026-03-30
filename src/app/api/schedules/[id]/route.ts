import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const schedule = await prisma.taskSchedule.update({
    where: { id },
    data: body,
  });
  return NextResponse.json(schedule);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.taskSchedule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
