import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Clock, AlertTriangle, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/worker/")({
  component: WorkerTasksList,
});

type Task = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  urgency: "low" | "medium" | "high" | "emergency";
  scheduled_at: string | null;
  address_snapshot: string | null;
  special_instructions: string | null;
};

const urgencyStyles: Record<Task["urgency"], string> = {
  low: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  medium: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  high: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  emergency: "bg-red-100 text-red-800 border-red-200 animate-pulse dark:bg-red-950 dark:text-red-300 dark:border-red-900",
};

const statusStyles: Record<Task["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  in_progress: "bg-emerald-100 text-emerald-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-200 text-gray-700",
};

const urgencyOrder = { emergency: 0, high: 1, medium: 2, low: 3 } as const;

function WorkerTasksList() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["worker-tasks"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,description,status,urgency,scheduled_at,address_snapshot,special_instructions")
        .eq("assigned_worker_id", u.user.id)
        .neq("status", "cancelled")
        .order("scheduled_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const sorted = [...(tasks ?? [])].sort((a, b) => {
    // active tasks first, then by urgency, then by schedule
    const aDone = a.status === "completed" ? 1 : 0;
    const bDone = b.status === "completed" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    const u = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (u !== 0) return u;
    return (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? "");
  });

  const active = sorted.filter((t) => t.status !== "completed");
  const done = sorted.filter((t) => t.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {active.length} active · {done.length} completed
        </p>
      </div>

      {active.length === 0 && done.length === 0 && (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">No tasks assigned yet.</p>
        </div>
      )}

      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Active
          </h2>
          {active.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </section>
      )}

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Completed
          </h2>
          {done.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </section>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  return (
    <Link
      to="/worker/$taskId"
      params={{ taskId: task.id }}
      className="block rounded-2xl border bg-card p-4 hover:shadow-soft transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${urgencyStyles[task.urgency]}`}
            >
              {task.urgency === "emergency" && <AlertTriangle className="size-3 inline mr-1" />}
              {task.urgency}
            </span>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${statusStyles[task.status]}`}>
              {task.status.replace("_", " ")}
            </span>
          </div>
          <h3 className="font-semibold leading-snug truncate">{task.title}</h3>
          {task.address_snapshot && (
            <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{task.address_snapshot}</span>
            </p>
          )}
          {task.scheduled_at && (
            <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3.5" />
              {new Date(task.scheduled_at).toLocaleString()}
            </p>
          )}
        </div>
        <ChevronRight className="size-5 text-muted-foreground mt-1 shrink-0" />
      </div>
    </Link>
  );
}
