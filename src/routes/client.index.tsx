import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, MapPin, Clock, AlertTriangle, ChevronRight, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/client/")({
  component: ClientHome,
});

type TaskStatus = "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  urgency: "low" | "medium" | "high" | "emergency";
  scheduled_at: string | null;
  completed_at: string | null;
  started_at: string | null;
  address_snapshot: string | null;
  site_id: string | null;
  service_id: string | null;
};
type Site = { id: string; name: string };
type Service = { id: string; title: string };

const statusBadge: Record<TaskStatus, { label: string; cls: string; dot: string }> = {
  pending:     { label: "Scheduled",   cls: "bg-yellow-100 text-yellow-800",  dot: "🟡" },
  accepted:    { label: "Accepted",    cls: "bg-blue-100 text-blue-800",       dot: "🟡" },
  in_progress: { label: "In progress", cls: "bg-emerald-100 text-emerald-800", dot: "🟢" },
  completed:   { label: "Completed",   cls: "bg-green-100 text-green-800",     dot: "✅" },
  cancelled:   { label: "Cancelled",   cls: "bg-gray-200 text-gray-700",       dot: "⚪" },
};

const urgencyBadge = {
  low:       "bg-slate-100 text-slate-700",
  medium:    "bg-blue-100 text-blue-800",
  high:      "bg-amber-100 text-amber-800",
  emergency: "bg-red-100 text-red-800 animate-pulse",
} as const;

function ClientHome() {
  const [tab, setTab] = useState<"live" | "history">("live");
  const [fSite, setFSite] = useState("");
  const [fService, setFService] = useState("");
  const [fDate, setFDate] = useState("");

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["client-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks").select("*")
        .order("scheduled_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
    refetchInterval: 30_000,
  });

  const { data: sites } = useQuery({
    queryKey: ["client-sites-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_sites").select("id,name");
      if (error) throw error;
      return (data ?? []) as Site[];
    },
  });

  const { data: services } = useQuery({
    queryKey: ["client-services-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("id,title");
      if (error) throw error;
      return (data ?? []) as Service[];
    },
  });

  const siteName = (id: string | null) => sites?.find((s) => s.id === id)?.name ?? "—";
  const serviceName = (id: string | null) => services?.find((s) => s.id === id)?.title ?? "";

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);

  const summary = useMemo(() => {
    const s = { active: 0, scheduled: 0, completedToday: 0, delayed: 0 };
    for (const t of tasks ?? []) {
      if (t.status === "in_progress") s.active++;
      if (t.status === "pending" || t.status === "accepted") s.scheduled++;
      if (t.status === "completed" && t.completed_at && new Date(t.completed_at) >= today) s.completedToday++;
      if ((t.status === "pending" || t.status === "accepted") && t.scheduled_at && new Date(t.scheduled_at) < new Date()) s.delayed++;
    }
    return s;
  }, [tasks, today]);

  const liveTasks = (tasks ?? []).filter((t) => {
    if (t.status === "completed" || t.status === "cancelled") return false;
    if (!t.scheduled_at) return true;
    const d = new Date(t.scheduled_at);
    return d < tomorrow; // today or overdue
  });

  const filtered = (tasks ?? []).filter((t) => {
    if (fSite && t.site_id !== fSite) return false;
    if (fService && t.service_id !== fService) return false;
    if (fDate) {
      const ref = t.scheduled_at ?? t.completed_at;
      if (!ref) return false;
      const d = new Date(ref);
      const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (local !== fDate) return false;
    }
    return true;
  });

  const anyFilter = fSite || fService || fDate;
  const clearFilters = () => { setFSite(""); setFService(""); setFDate(""); };

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="🟢 Active now" value={summary.active} />
        <SummaryCard label="🟡 Scheduled" value={summary.scheduled} />
        <SummaryCard label="✅ Done today" value={summary.completedToday} />
        <SummaryCard label="🔴 Delayed" value={summary.delayed} accent={summary.delayed > 0} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-secondary w-fit">
        <TabBtn active={tab === "live"} onClick={() => setTab("live")}>Live</TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")}>Inspection history</TabBtn>
      </div>

      {tab === "history" && (
        <div className="rounded-2xl border bg-card p-3 flex flex-wrap gap-2 items-center">
          <Filter className="size-4 text-muted-foreground ml-1" />
          <select value={fSite} onChange={(e) => setFSite(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
            <option value="">All sites</option>
            {sites?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={fService} onChange={(e) => setFService(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
            <option value="">All services</option>
            {services?.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <input
            type="date"
            value={fDate}
            onChange={(e) => setFDate(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          />
          {anyFilter && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg hover:bg-secondary">
              <X className="size-3.5" /> Clear
            </button>
          )}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="p-12 grid place-items-center rounded-2xl border bg-card">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <TaskList
          tasks={tab === "live" ? liveTasks : filtered}
          siteName={siteName}
          serviceName={serviceName}
          empty={tab === "live" ? "No active or scheduled cleaning right now." : "No tasks match these filters."}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-card p-4 ${accent ? "ring-2 ring-red-300" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${active ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function TaskList({
  tasks, siteName, serviceName, empty,
}: {
  tasks: Task[];
  siteName: (id: string | null) => string;
  serviceName: (id: string | null) => string;
  empty: string;
}) {
  if (!tasks.length) {
    return <div className="p-12 text-center text-muted-foreground text-sm rounded-2xl border bg-card">{empty}</div>;
  }
  return (
    <div className="rounded-2xl border bg-card overflow-hidden divide-y">
      {tasks.map((t) => {
        const overdue = (t.status === "pending" || t.status === "accepted") && t.scheduled_at && new Date(t.scheduled_at) < new Date();
        const badge = statusBadge[t.status];
        return (
          <Link
            key={t.id}
            to="/client/$taskId"
            params={{ taskId: t.id }}
            className="flex items-center gap-3 p-4 hover:bg-secondary/40 transition"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${urgencyBadge[t.urgency]}`}>
                  {t.urgency === "emergency" && <AlertTriangle className="size-3 inline mr-1" />}
                  {t.urgency}
                </span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                  {badge.label}
                </span>
                {overdue && <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">Delayed</span>}
              </div>
              <div className="font-semibold truncate">{t.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {siteName(t.site_id)}</span>
                {t.scheduled_at && (
                  <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {new Date(t.scheduled_at).toLocaleString()}</span>
                )}
                {t.service_id && <span>· {serviceName(t.service_id)}</span>}
              </div>
            </div>
            <ChevronRight className="size-5 text-muted-foreground shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}
