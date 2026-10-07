import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "Habits | Life Manager",
};

export default function HabitsPage() {
  return <Dashboard initialTab="habits" />;
}
