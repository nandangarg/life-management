import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "Daily Log | Life Manager",
};

export default function DailyLogPage() {
  return <Dashboard initialTab="daily-log" />;
}
