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
  const { currentUser, loading, hasSession } = useOFM();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect when there is genuinely no session. While a session exists
    // but the profile is still loading, stay and show the loader.
    if (!loading && !hasSession && !currentUser) navigate({ to: "/" });
  }, [currentUser, loading, hasSession, navigate]);

  if (loading || (hasSession && !currentUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    );
  }
  if (!currentUser) return null;
  return <Dashboard />;
}
