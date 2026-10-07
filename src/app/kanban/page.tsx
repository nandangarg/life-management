import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "Kanban | Life Manager",
};

export default function KanbanPage() {
  return <Dashboard initialTab="kanban" />;
}
