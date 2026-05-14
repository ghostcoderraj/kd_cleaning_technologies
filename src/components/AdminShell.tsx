import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Loader2, LogOut, Sparkles, ListChecks, Users, Briefcase, Activity, Map } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationBell";

const tabs = [
  { to: "/admin", label: "Services", icon: Briefcase },
  { to: "/admin/tasks", label: "Tasks", icon: ListChecks },
  { to: "/admin/workers", label: "Workers", icon: Users },
  { to: "/admin/live", label: "Live Map", icon: Map },
  { to: "/admin/sla", label: "SLA", icon: Activity },
] as const;

export function AdminShell({ title, subtitle, action, children }: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/auth" }); return; }
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", data.session.user.id);
      setIsAdmin(!!roles?.some((r) => r.role === "admin" || r.role === "manager"));
      setReady(true);
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  if (!ready) {
    return <div className="min-h-[60vh] grid place-items-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold">Admin access required</h1>
          <p className="text-sm text-muted-foreground">You need admin or manager role.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Admin Panel</span>
          </div>
          <h1 className="mt-1 text-3xl font-display font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex gap-2 items-center">
          {action}
          <NotificationBell role="admin" />
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}
            className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium hover:bg-secondary/80"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </div>

      <nav className="mt-6 flex gap-1 border-b overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent inline-flex items-center gap-2 whitespace-nowrap"
              activeProps={{ className: "px-4 py-2.5 text-sm font-medium text-foreground border-b-2 border-primary inline-flex items-center gap-2 whitespace-nowrap" }}
              activeOptions={{ exact: true }}
            >
              <Icon className="size-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}
