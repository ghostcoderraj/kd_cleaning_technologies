import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, TrendingUp, Clock, AlertTriangle, CheckCircle2, Timer, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/sla")({
  head: () => ({
    meta: [
      { title: "Performance & SLA — KD Cleaning Technologies Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSLAPage,
});

type Task = {
  id: string;
  title: string;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  urgency: "low" | "medium" | "high" | "emergency";
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  site_id: string | null;
  assigned_worker_id: string | null;
};

type StatusEvent = {
  task_id: string;
  to_status: Task["status"];
  changed_at: string;
};

type Site = { id: string; name: string };
type Worker = { user_id: string; full_name: string | null };

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

// Late arrival threshold in minutes
const LATE_THRESHOLD = 15;

function fmtMinutes(mins: number | null) {
  if (mins == null || !isFinite(mins)) return "—";
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function pct(num: number, den: number) {
  if (den === 0) return 0;
  return Math.round((num / den) * 100);
}

function scoreColor(score: number) {
  if (score >= 90) return "text-emerald-600 bg-emerald-50";
  if (score >= 75) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

function AdminSLAPage() {
  const [days, setDays] = useState<string>("30");

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(days, 10));
    return d.toISOString();
  }, [days]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-sla", days],
    queryFn: async () => {
      const [tasksRes, sitesRes, workersRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id,title,status,urgency,scheduled_at,started_at,completed_at,created_at,site_id,assigned_worker_id")
          .gte("created_at", since)
          .order("created_at", { ascending: false }),
        supabase.from("client_sites").select("id,name"),
        supabase.from("worker_profiles").select("user_id,full_name"),
      ]);
      if (tasksRes.error) throw tasksRes.error;
      if (sitesRes.error) throw sitesRes.error;
      if (workersRes.error) throw workersRes.error;

      const tasks = (tasksRes.data ?? []) as Task[];
      const taskIds = tasks.map((t) => t.id);

      let history: StatusEvent[] = [];
      if (taskIds.length) {
        const histRes = await supabase
          .from("task_status_history")
          .select("task_id,to_status,changed_at")
          .in("task_id", taskIds);
        if (histRes.error) throw histRes.error;
        history = (histRes.data ?? []) as StatusEvent[];
      }

      return {
        tasks,
        sites: (sitesRes.data ?? []) as Site[],
        workers: (workersRes.data ?? []) as Worker[],
        history,
      };
    },
  });

  const metrics = useMemo(() => {
    if (!data) return null;
    const { tasks, history } = data;

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const cancelled = tasks.filter((t) => t.status === "cancelled").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress" || t.status === "accepted").length;
    const completionRate = pct(completed, total - cancelled);

    // Response time: created -> accepted (from history)
    const acceptedEvents = history.filter((h) => h.to_status === "accepted");
    const acceptedMap = new Map<string, string>();
    for (const e of acceptedEvents) {
      const prev = acceptedMap.get(e.task_id);
      if (!prev || e.changed_at < prev) acceptedMap.set(e.task_id, e.changed_at);
    }

    const responseTimes: number[] = [];
    for (const t of tasks) {
      const accAt = acceptedMap.get(t.id);
      if (accAt) {
        const mins = (new Date(accAt).getTime() - new Date(t.created_at).getTime()) / 60000;
        if (mins >= 0) responseTimes.push(mins);
      }
    }
    const avgResponse = responseTimes.length
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null;

    // Completion duration: started -> completed
    const completionDurations: number[] = [];
    for (const t of tasks) {
      if (t.started_at && t.completed_at) {
        const mins = (new Date(t.completed_at).getTime() - new Date(t.started_at).getTime()) / 60000;
        if (mins >= 0) completionDurations.push(mins);
      }
    }
    const avgCompletion = completionDurations.length
      ? completionDurations.reduce((a, b) => a + b, 0) / completionDurations.length
      : null;

    // Late arrivals: started_at > scheduled_at + LATE_THRESHOLD
    const scheduledStarted = tasks.filter((t) => t.scheduled_at && t.started_at);
    const late = scheduledStarted.filter((t) => {
      const diff = (new Date(t.started_at!).getTime() - new Date(t.scheduled_at!).getTime()) / 60000;
      return diff > LATE_THRESHOLD;
    });
    const onTimeRate = pct(scheduledStarted.length - late.length, scheduledStarted.length);

    // Missed: scheduled in past + still pending/accepted (never started)
    const now = Date.now();
    const missed = tasks.filter(
      (t) =>
        t.scheduled_at &&
        new Date(t.scheduled_at).getTime() < now - 60 * 60 * 1000 &&
        (t.status === "pending" || t.status === "accepted") &&
        !t.started_at,
    );

    // SLA score: weighted blend
    const slaScore = Math.round(completionRate * 0.5 + onTimeRate * 0.5);

    return {
      total,
      completed,
      cancelled,
      inProgress,
      completionRate,
      avgResponse,
      avgCompletion,
      lateCount: late.length,
      onTimeRate,
      missedCount: missed.length,
      slaScore,
      missed,
    };
  }, [data]);

  const perSite = useMemo(() => {
    if (!data) return [];
    const { tasks, sites, history } = data;
    const byId = new Map(sites.map((s) => [s.id, s.name]));
    const acceptedMap = new Map<string, string>();
    for (const e of history.filter((h) => h.to_status === "accepted")) {
      const prev = acceptedMap.get(e.task_id);
      if (!prev || e.changed_at < prev) acceptedMap.set(e.task_id, e.changed_at);
    }
    const grouped = new Map<string, Task[]>();
    for (const t of tasks) {
      const k = t.site_id ?? "__none";
      if (!grouped.has(k)) grouped.set(k, []);
      grouped.get(k)!.push(t);
    }
    return Array.from(grouped.entries()).map(([siteId, list]) => {
      const completed = list.filter((t) => t.status === "completed").length;
      const cancelled = list.filter((t) => t.status === "cancelled").length;
      const completionRate = pct(completed, list.length - cancelled);
      const scheduledStarted = list.filter((t) => t.scheduled_at && t.started_at);
      const late = scheduledStarted.filter(
        (t) =>
          (new Date(t.started_at!).getTime() - new Date(t.scheduled_at!).getTime()) / 60000 >
          LATE_THRESHOLD,
      );
      const onTimeRate = pct(scheduledStarted.length - late.length, scheduledStarted.length);
      const responses: number[] = [];
      for (const t of list) {
        const acc = acceptedMap.get(t.id);
        if (acc) {
          const m = (new Date(acc).getTime() - new Date(t.created_at).getTime()) / 60000;
          if (m >= 0) responses.push(m);
        }
      }
      const avgResp = responses.length ? responses.reduce((a, b) => a + b, 0) / responses.length : null;
      const score = Math.round(completionRate * 0.5 + onTimeRate * 0.5);
      return {
        siteId,
        name: siteId === "__none" ? "Unassigned site" : byId.get(siteId) ?? "Unknown site",
        total: list.length,
        completed,
        completionRate,
        onTimeRate,
        late: late.length,
        avgResp,
        score,
      };
    }).sort((a, b) => b.total - a.total);
  }, [data]);

  const perWorker = useMemo(() => {
    if (!data) return [];
    const { tasks, workers } = data;
    const byId = new Map(workers.map((w) => [w.user_id, w.full_name ?? "Unnamed worker"]));
    const grouped = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.assigned_worker_id) continue;
      if (!grouped.has(t.assigned_worker_id)) grouped.set(t.assigned_worker_id, []);
      grouped.get(t.assigned_worker_id)!.push(t);
    }
    return Array.from(grouped.entries()).map(([wid, list]) => {
      const completed = list.filter((t) => t.status === "completed").length;
      const completionRate = pct(completed, list.length);
      const scheduledStarted = list.filter((t) => t.scheduled_at && t.started_at);
      const late = scheduledStarted.filter(
        (t) =>
          (new Date(t.started_at!).getTime() - new Date(t.scheduled_at!).getTime()) / 60000 >
          LATE_THRESHOLD,
      );
      const onTimeRate = pct(scheduledStarted.length - late.length, scheduledStarted.length);
      const durations: number[] = [];
      for (const t of list) {
        if (t.started_at && t.completed_at) {
          const m = (new Date(t.completed_at).getTime() - new Date(t.started_at).getTime()) / 60000;
          if (m >= 0) durations.push(m);
        }
      }
      const avgDur = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
      return {
        workerId: wid,
        name: byId.get(wid) ?? "Unknown worker",
        total: list.length,
        completed,
        completionRate,
        onTimeRate,
        late: late.length,
        avgDur,
      };
    }).sort((a, b) => b.total - a.total);
  }, [data]);

  return (
    <AdminShell title="Performance & SLA" subtitle="Service level analytics across tasks, sites, and workers.">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-muted-foreground">Time range:</span>
        <select
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="rounded-lg border bg-background px-3 py-1.5 text-sm"
        >
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {isLoading || !metrics ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={<Target className="size-5" />}
              label="SLA Score"
              value={`${metrics.slaScore}%`}
              tone={scoreColor(metrics.slaScore)}
            />
            <KpiCard
              icon={<CheckCircle2 className="size-5" />}
              label="Completion Rate"
              value={`${metrics.completionRate}%`}
              hint={`${metrics.completed} of ${metrics.total - metrics.cancelled}`}
              tone={scoreColor(metrics.completionRate)}
            />
            <KpiCard
              icon={<Clock className="size-5" />}
              label="On-time Arrivals"
              value={`${metrics.onTimeRate}%`}
              hint={`${metrics.lateCount} late (>${LATE_THRESHOLD}m)`}
              tone={scoreColor(metrics.onTimeRate)}
            />
            <KpiCard
              icon={<AlertTriangle className="size-5" />}
              label="Missed Schedules"
              value={`${metrics.missedCount}`}
              hint="Past start, never began"
              tone={metrics.missedCount === 0 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"}
            />
            <KpiCard
              icon={<Timer className="size-5" />}
              label="Avg Response"
              value={fmtMinutes(metrics.avgResponse)}
              hint="Created → accepted"
            />
            <KpiCard
              icon={<TrendingUp className="size-5" />}
              label="Avg Completion"
              value={fmtMinutes(metrics.avgCompletion)}
              hint="Started → completed"
            />
            <KpiCard label="In Progress" value={`${metrics.inProgress}`} />
            <KpiCard label="Total Tasks" value={`${metrics.total}`} hint={`${metrics.cancelled} cancelled`} />
          </div>

          {/* Per-site */}
          <section>
            <h2 className="text-lg font-semibold mb-3">By site</h2>
            {perSite.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks in this period.</p>
            ) : (
              <div className="rounded-2xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-left">Site</th>
                        <th className="px-4 py-2 text-right">Tasks</th>
                        <th className="px-4 py-2 text-right">Completed</th>
                        <th className="px-4 py-2 text-right">On-time</th>
                        <th className="px-4 py-2 text-right">Avg Resp</th>
                        <th className="px-4 py-2 text-right">SLA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perSite.map((r) => (
                        <tr key={r.siteId} className="border-t">
                          <td className="px-4 py-2.5 font-medium">{r.name}</td>
                          <td className="px-4 py-2.5 text-right">{r.total}</td>
                          <td className="px-4 py-2.5 text-right">{r.completionRate}%</td>
                          <td className="px-4 py-2.5 text-right">{r.onTimeRate}%</td>
                          <td className="px-4 py-2.5 text-right">{fmtMinutes(r.avgResp)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${scoreColor(r.score)}`}>
                              {r.score}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Per-worker */}
          <section>
            <h2 className="text-lg font-semibold mb-3">By worker</h2>
            {perWorker.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assigned tasks in this period.</p>
            ) : (
              <div className="rounded-2xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-left">Worker</th>
                        <th className="px-4 py-2 text-right">Tasks</th>
                        <th className="px-4 py-2 text-right">Completed</th>
                        <th className="px-4 py-2 text-right">On-time</th>
                        <th className="px-4 py-2 text-right">Late</th>
                        <th className="px-4 py-2 text-right">Avg Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perWorker.map((r) => (
                        <tr key={r.workerId} className="border-t">
                          <td className="px-4 py-2.5 font-medium">{r.name}</td>
                          <td className="px-4 py-2.5 text-right">{r.total}</td>
                          <td className="px-4 py-2.5 text-right">{r.completionRate}%</td>
                          <td className="px-4 py-2.5 text-right">{r.onTimeRate}%</td>
                          <td className="px-4 py-2.5 text-right">{r.late}</td>
                          <td className="px-4 py-2.5 text-right">{fmtMinutes(r.avgDur)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Missed schedules */}
          {metrics.missed.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="size-4 text-red-600" />
                Missed schedules
              </h2>
              <div className="rounded-2xl border divide-y">
                {metrics.missed.slice(0, 10).map((t) => (
                  <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Scheduled {t.scheduled_at ? new Date(t.scheduled_at).toLocaleString() : "—"}
                      </div>
                    </div>
                    <span className="text-xs rounded-full bg-red-50 text-red-700 px-2 py-0.5 font-semibold uppercase">
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </AdminShell>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border p-4 bg-card">
      <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wide">
        <span>{label}</span>
        {icon && <span className={`rounded-lg p-1.5 ${tone ?? "bg-muted"}`}>{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
