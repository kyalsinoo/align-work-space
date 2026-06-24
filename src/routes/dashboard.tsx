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
  const { currentUser, loading } = useOFM();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !currentUser) navigate({ to: "/" });
  }, [currentUser, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    );
  }
  if (!currentUser) return null;
  return <Dashboard />;
}
