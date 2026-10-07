import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "Tasks | Life Manager",
};

export default function HomePage() {
  return <Dashboard initialTab="tasks" />;
}
