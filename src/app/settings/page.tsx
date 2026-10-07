import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "Settings | Life Manager",
};

export default function SettingsPage() {
  return <Dashboard initialTab="settings" />;
}
