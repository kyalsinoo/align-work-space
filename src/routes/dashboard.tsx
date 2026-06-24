import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Dashboard } from "@/components/ofm/Dashboard";
import { useOFM } from "@/lib/ofm-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — OFM System" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { currentUser } = useOFM();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
  }, [currentUser, navigate]);

  if (!currentUser) return null;
  return <Dashboard />;
}
