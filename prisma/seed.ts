import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.taskSchedule.deleteMany();
  await prisma.task.deleteMany();
  await prisma.category.deleteMany();
  await prisma.board.deleteMany();

  // Create boards
  const office = await prisma.board.create({
    data: {
      name: "Office",
      color: "#3b82f6",
      position: 0,
      categories: {
        create: [
          { name: "Project Alpha", color: "#ef4444", position: 0 },
          { name: "Learning", color: "#f59e0b", position: 1 },
          { name: "Unit Initiatives", color: "#10b981", position: 2 },
        ],
      },
    },
    include: { categories: true },
  });

  const personal = await prisma.board.create({
    data: {
      name: "Personal",
      color: "#10b981",
      position: 1,
      categories: {
        create: [
          { name: "Health", color: "#ef4444", position: 0 },
          { name: "Finance", color: "#f59e0b", position: 1 },
          { name: "Home", color: "#6366f1", position: 2 },
        ],
      },
    },
    include: { categories: true },
  });

  const spiritual = await prisma.board.create({
    data: {
      name: "Spiritual",
      color: "#8b5cf6",
      position: 2,
      categories: {
        create: [
          { name: "Morning Practice", color: "#f59e0b", position: 0 },
          { name: "Sunday Program", color: "#3b82f6", position: 1 },
        ],
      },
    },
    include: { categories: true },
  });

  // Create sample tasks
  await prisma.task.create({
    data: {
      boardId: office.id,
      categoryId: office.categories[0].id,
      title: "Review Q2 roadmap",
      description: "Review and finalize the Q2 product roadmap",
      status: "TODO",
      priority: "HIGH",
      estimatedMin: 60,
      dueDate: new Date("2026-04-05"),
      position: 0,
    },
  });

  await prisma.task.create({
    data: {
      boardId: office.id,
      categoryId: office.categories[1].id,
      title: "Complete TypeScript course",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      estimatedMin: 120,
      position: 1,
    },
  });

  await prisma.task.create({
    data: {
      boardId: personal.id,
      categoryId: personal.categories[0].id,
      title: "Morning run",
      status: "TODO",
      priority: "HIGH",
      estimatedMin: 30,
      position: 0,
    },
  });

  const sundayTask = await prisma.task.create({
    data: {
      boardId: spiritual.id,
      categoryId: spiritual.categories[1].id,
      title: "Sunday Program",
      description: "Weekly Sunday program",
      status: "TODO",
      priority: "HIGH",
      estimatedMin: 240,
      position: 0,
    },
  });

  // Create a fixed recurring schedule for Sunday program
  await prisma.taskSchedule.create({
    data: {
      taskId: sundayTask.id,
      date: "2026-03-29",
      startTime: "16:00",
      endTime: "20:00",
      isFixed: true,
      isRecurring: true,
      recurrenceRule: "WEEKLY:SUN",
    },
  });

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
