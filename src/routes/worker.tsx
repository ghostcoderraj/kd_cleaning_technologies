import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogOut, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";
import { useShareLocation } from "@/hooks/useShareLocation";

export const Route = createFileRoute("/worker")({
  head: () => ({
    meta: [
      { title: "Worker App — KD Cleaning Technologies" },
      { name: "description", content: "Cleaning staff task manager." },
      { name: "robots", content: "noindex" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
    ],
  }),
  component: WorkerLayout,
});

function WorkerLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      const uid = data.session.user.id;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      const roleSet = new Set((roles ?? []).map((r) => r.role));
      const ok =
        roleSet.has("worker") ||
        roleSet.has("admin") ||
        roleSet.has("manager") ||
        roleSet.has("supervisor");
      setAllowed(ok);
      setReady(true);
      // Ensure worker_profile row exists for active workers
      if (ok) {
        await supabase
          .from("worker_profiles")
          .upsert({ user_id: uid, last_seen_at: new Date().toISOString() }, { onConflict: "user_id" });
      }
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  useShareLocation({ enabled: allowed });

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  };

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Worker access required</h1>
          <p className="text-muted-foreground">
            Your account doesn't have a <strong>worker</strong> role yet. Ask an
            administrator to assign you the role from the admin panel.
          </p>
          <button
            onClick={signOut}
            className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 font-semibold"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          <Link to="/worker" className="flex items-center gap-2 font-bold">
            <ClipboardList className="size-5 text-primary" />
            <span>Worker App</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell role="worker" />
            <button
              onClick={signOut}
              className="size-10 grid place-items-center rounded-xl hover:bg-secondary"
              aria-label="Sign out"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}
