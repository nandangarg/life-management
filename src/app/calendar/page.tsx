import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "Calendar | Life Manager",
};

export default function CalendarPage() {
  return <Dashboard initialTab="calendar" />;
}
