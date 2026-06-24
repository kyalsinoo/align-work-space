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
    // Give auth state a grace period to hydrate before redirecting, so a
    // freshly-signed-in user isn't bounced back during the state race.
    if (loading || hasSession || currentUser) return;
    const t = setTimeout(() => navigate({ to: "/" }), 1500);
    return () => clearTimeout(t);
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
