import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { randomDarkColor } from "@/lib/color";
import { NextRequest, NextResponse } from "next/server";

interface ImportTaskItem {
  title: string;
  description?: string | null;
  categories?: string | null;
  priority?: string | null;
  status?: string | null;
  dueDate?: string | null;
  estimatedMin?: number | null;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { boardId, categoryIds: bulkCategoryIds = [], tasks = [] } = body as {
      boardId: string;
      categoryIds?: string[];
      tasks: ImportTaskItem[];
    };

    if (!boardId) {
      return NextResponse.json({ error: "boardId is required" }, { status: 400 });
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: "No tasks provided to import" }, { status: 400 });
    }

    // Verify board belongs to user
    const board = await prisma.board.findFirst({
      where: { id: boardId, userId },
      include: { categories: true },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Map existing categories by lowercase name
    const categoryMap = new Map<string, string>();
    for (const cat of board.categories) {
      categoryMap.set(cat.name.trim().toLowerCase(), cat.id);
    }

    // Collect any new category names mentioned in task rows
    const newCategoryNames = new Set<string>();
    for (const t of tasks) {
      if (t.categories && typeof t.categories === "string") {
        const names = t.categories.split(",").map((s) => s.trim()).filter(Boolean);
        for (const name of names) {
          if (!categoryMap.has(name.toLowerCase())) {
            newCategoryNames.add(name);
          }
        }
      }
    }

    // Auto-create new categories if any were in the spreadsheet
    let curCatPos = board.categories.length;
    for (const newName of newCategoryNames) {
      const createdCat = await prisma.category.create({
        data: {
          boardId,
          name: newName,
          color: randomDarkColor(),
          position: curCatPos++,
        },
      });
      categoryMap.set(newName.toLowerCase(), createdCat.id);
    }

    // Get current max position for tasks in this board
    const maxPosAgg = await prisma.task.aggregate({
      where: { boardId },
      _max: { position: true },
    });
    let currentPosition = (maxPosAgg._max.position ?? -1) + 1;

    // Normalize and prepare tasks
    const validPriorities = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
    const validStatuses = new Set(["TODO", "IN_PROGRESS", "DONE"]);

    const createdTasks = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of tasks) {
        if (!item.title || !item.title.trim()) continue;

        // Resolve priority
        let priority = "MEDIUM";
        if (item.priority) {
          const upperP = item.priority.trim().toUpperCase();
          if (validPriorities.has(upperP)) priority = upperP;
        }

        // Resolve status
        let status = "TODO";
        if (item.status) {
          const normS = item.status.trim().toUpperCase().replace(/\s+/g, "_");
          if (validStatuses.has(normS)) status = normS;
        }

        // Parse due date if valid
        let parsedDueDate: Date | null = null;
        if (item.dueDate) {
          const d = new Date(item.dueDate);
          if (!isNaN(d.getTime())) {
            parsedDueDate = d;
          }
        }

        // Combine categories: bulk selected + row categories
        const rowCategoryIds = new Set<string>(bulkCategoryIds);
        if (item.categories && typeof item.categories === "string") {
          const names = item.categories.split(",").map((s) => s.trim()).filter(Boolean);
          for (const name of names) {
            const id = categoryMap.get(name.toLowerCase());
            if (id) rowCategoryIds.add(id);
          }
        }

        // Create the task
        const task = await tx.task.create({
          data: {
            userId,
            boardId,
            title: item.title.trim(),
            description: item.description?.trim() || null,
            status,
            priority,
            estimatedMin: item.estimatedMin ? Math.round(Number(item.estimatedMin)) : null,
            dueDate: parsedDueDate,
            position: currentPosition++,
            tags: "[]",
            categories: {
              create: Array.from(rowCategoryIds).map((categoryId) => ({
                categoryId,
              })),
            },
          },
        });

        results.push(task);
      }

      return results;
    });

    return NextResponse.json({
      success: true,
      count: createdTasks.length,
    });
  } catch (error) {
    console.error("Task import failed:", error);
    return NextResponse.json({ error: "Failed to import tasks" }, { status: 500 });
  }
}
