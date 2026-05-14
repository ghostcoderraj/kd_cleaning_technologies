import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogOut, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";

export const Route = createFileRoute("/client")({
  head: () => ({
    meta: [
      { title: "Client Dashboard — KD Cleaning Technologies" },
      { name: "description", content: "Monitor your cleaning operations live." },
      { name: "robots", content: "noindex" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
    ],
  }),
  component: ClientLayout,
});

function ClientLayout() {
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
        .from("user_roles").select("role").eq("user_id", uid);
      const roleSet = new Set((roles ?? []).map((r) => r.role));
      // Clients see their own; staff can preview too
      const ok =
        roleSet.has("client") ||
        roleSet.has("admin") ||
        roleSet.has("manager") ||
        roleSet.has("supervisor");
      setAllowed(ok);
      setReady(true);
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

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
          <h1 className="text-2xl font-bold">Client access required</h1>
          <p className="text-muted-foreground">
            Your account doesn't have a <strong>client</strong> role yet. Ask an
            administrator to grant you access and link your sites.
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
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <Link to="/client" className="flex items-center gap-2 font-bold">
            <LayoutDashboard className="size-5 text-primary" />
            <span>Client Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell role="client" />
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
      <main className="mx-auto max-w-4xl px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}
