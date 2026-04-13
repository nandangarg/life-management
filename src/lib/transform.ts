/**
 * Transforms a Prisma task result (with TaskCategory join rows) into the
 * TaskWithRelations / TaskDetail shape expected by the API and frontend.
 *
 * Prisma returns: task.categories = Array<{ taskId, categoryId, category: Category }>
 * We want:        task.categories = Category[]
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformTask(task: any) {
  return {
    ...task,
    categories: (task.categories ?? []).map((tc: { category: unknown }) => tc.category),
  };
}
