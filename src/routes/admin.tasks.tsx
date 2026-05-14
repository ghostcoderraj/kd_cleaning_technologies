import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2, X, AlertTriangle, MapPin, Clock, User, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/tasks")({
  head: () => ({
    meta: [
      { title: "Manage Tasks — KD Cleaning Technologies Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminTasksPage,
});

type TaskStatus = "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
type Worker = { user_id: string; full_name: string | null };
type Site = { id: string; name: string; address: string; latitude: number | null; longitude: number | null; client_user_id: string | null };
type ServiceLite = { id: string; title: string };
type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  urgency: "low" | "medium" | "high" | "emergency";
  scheduled_at: string | null;
  address_snapshot: string | null;
  special_instructions: string | null;
  assigned_worker_id: string | null;
  site_id: string | null;
  service_id: string | null;
  client_user_id: string | null;
  latitude: number | null;
  longitude: number | null;
};

const urgencyStyles = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-amber-100 text-amber-800",
  emergency: "bg-red-100 text-red-800 animate-pulse",
} as const;

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  in_progress: "bg-emerald-100 text-emerald-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-200 text-gray-700",
};

function AdminTasksPage() {
  const [editing, setEditing] = useState<Partial<Task> | null>(null);

  return (
    <AdminShell
      title="Tasks"
      subtitle="Assign cleaning jobs to workers and track them in real time."
      action={
        <button
          onClick={() => setEditing({ urgency: "medium", status: "pending" })}
          className="inline-flex items-center gap-2 rounded-xl gradient-hero text-primary-foreground px-4 py-2.5 text-sm font-semibold shadow-soft"
        >
          <Plus className="size-4" /> New Task
        </button>
      }
    >
      <TasksTable onEdit={setEditing} />
      {editing && <TaskDialog initial={editing} onClose={() => setEditing(null)} />}
    </AdminShell>
  );
}

function TasksTable({ onEdit }: { onEdit: (t: Task) => void }) {
  const qc = useQueryClient();
  const [fUrgency, setFUrgency] = useState<string>("");
  const [fStatus, setFStatus] = useState<string>("");
  const [fWorker, setFWorker] = useState<string>("");
  const [fDate, setFDate] = useState<string>("");
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["admin-tasks", { fUrgency, fStatus, fWorker, fDate }],
    queryFn: async () => {
      let q = supabase.from("tasks").select("*")
        .order("scheduled_at", { ascending: true, nullsFirst: false });
      if (fUrgency) q = q.eq("urgency", fUrgency as Task["urgency"]);
      if (fStatus) q = q.eq("status", fStatus as TaskStatus);
      if (fWorker === "__unassigned") q = q.is("assigned_worker_id", null);
      else if (fWorker) q = q.eq("assigned_worker_id", fWorker);
      if (fDate) {
        // fDate is YYYY-MM-DD in local time; build [start, end) in local TZ
        const start = new Date(`${fDate}T00:00:00`);
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        q = q.gte("scheduled_at", start.toISOString()).lt("scheduled_at", end.toISOString());
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  const { data: workers } = useQuery({
    queryKey: ["admin-workers-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("worker_profiles").select("user_id,full_name");
      if (error) throw error;
      return (data ?? []) as Worker[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task deleted");
      qc.invalidateQueries({ queryKey: ["admin-tasks"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const workerName = (id: string | null) => {
    if (!id) return "Unassigned";
    const w = workers?.find((w) => w.user_id === id);
    return w?.full_name?.trim() || id.slice(0, 8);
  };

  const filtered = tasks ?? [];

  const anyFilter = fUrgency || fStatus || fWorker || fDate;
  const clearFilters = () => { setFUrgency(""); setFStatus(""); setFWorker(""); setFDate(""); };

  const Filters = (
    <div className="rounded-2xl border bg-card p-3 mb-4 flex flex-wrap gap-2 items-center">
      <select value={fUrgency} onChange={(e) => setFUrgency(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
        <option value="">All urgencies</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="emergency">Emergency</option>
      </select>
      <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="accepted">Accepted</option>
        <option value="in_progress">In progress</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <select value={fWorker} onChange={(e) => setFWorker(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
        <option value="">All workers</option>
        <option value="__unassigned">Unassigned</option>
        {workers?.map((w) => (
          <option key={w.user_id} value={w.user_id}>{w.full_name?.trim() || w.user_id.slice(0, 8)}</option>
        ))}
      </select>
      <input
        type="date"
        value={fDate}
        onChange={(e) => setFDate(e.target.value)}
        className="rounded-lg border bg-background px-3 py-2 text-sm"
      />
      {anyFilter ? (
        <button onClick={clearFilters} className="ml-auto inline-flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg hover:bg-secondary">
          <X className="size-3.5" /> Clear filters
        </button>
      ) : null}
      <span className="text-xs text-muted-foreground ml-auto">{filtered.length} {filtered.length === 1 ? "task" : "tasks"}</span>
    </div>
  );

  if (isLoading) {
    return <div className="p-12 grid place-items-center rounded-2xl border bg-card"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }
  if (!tasks?.length) {
    return <div className="p-12 text-center text-muted-foreground text-sm rounded-2xl border bg-card">No tasks yet — create your first.</div>;
  }

  return (
    <>
      {Filters}
      {filtered.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground text-sm rounded-2xl border bg-card">No tasks match the current filters.</div>
      ) : (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3">Task</th>
            <th className="text-left px-4 py-3 hidden md:table-cell">Worker</th>
            <th className="text-left px-4 py-3 hidden lg:table-cell">Schedule</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="px-4 py-3 w-24"></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((t) => (
            <tr key={t.id} className="border-t border-border">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${urgencyStyles[t.urgency]}`}>
                    {t.urgency === "emergency" && <AlertTriangle className="size-3 inline mr-1" />}
                    {t.urgency}
                  </span>
                </div>
                <div className="font-medium">{t.title}</div>
                {t.address_snapshot && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3" /> {t.address_snapshot}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="flex items-center gap-1.5 text-sm">
                  <User className="size-3.5 text-muted-foreground" />
                  {workerName(t.assigned_worker_id)}
                </div>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell text-sm">
                {t.scheduled_at ? (
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-muted-foreground" />
                    {new Date(t.scheduled_at).toLocaleString()}
                  </div>
                ) : <span className="text-muted-foreground">—</span>}
              </td>
              <td className="px-4 py-3">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${statusStyles[t.status] ?? ""}`}>
                  {t.status.replace("_", " ")}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-1">
                  <button
                    onClick={() => onEdit(t)}
                    className="size-8 grid place-items-center rounded-lg hover:bg-secondary"
                    aria-label="Edit"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm("Delete this task?")) remove.mutate(t.id); }}
                    className="size-8 grid place-items-center rounded-lg hover:bg-destructive/10 text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
      )}
    </>
  );
}

function TaskDialog({ initial, onClose }: { initial: Partial<Task>; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Task>>(initial);
  const isEdit = !!initial.id;

  const { data: workers } = useQuery({
    queryKey: ["admin-workers-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("worker_profiles").select("user_id,full_name").eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as Worker[];
    },
  });

  const { data: sites } = useQuery({
    queryKey: ["admin-sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_sites").select("id,name,address,latitude,longitude,client_user_id");
      if (error) throw error;
      return (data ?? []) as Site[];
    },
  });

  const { data: services } = useQuery({
    queryKey: ["admin-services-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("id,title").eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as ServiceLite[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title?.trim()) throw new Error("Title is required");
      const payload = {
        title: form.title.trim(),
        description: form.description ?? "",
        urgency: (form.urgency ?? "medium") as Task["urgency"],
        status: (form.status ?? "pending") as TaskStatus,
        scheduled_at: form.scheduled_at || null,
        special_instructions: form.special_instructions || null,
        assigned_worker_id: form.assigned_worker_id || null,
        site_id: form.site_id || null,
        service_id: form.service_id || null,
        client_user_id: form.client_user_id || null,
        address_snapshot: form.address_snapshot || null,
        latitude: form.latitude ?? null,
        longitude: form.longitude ?? null,
      };
      if (isEdit && form.id) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("tasks").insert({ ...payload, created_by: u.user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Task updated" : "Task created");
      qc.invalidateQueries({ queryKey: ["admin-tasks"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  // When site is picked, snapshot its address + GPS
  const pickSite = (siteId: string) => {
    const s = sites?.find((x) => x.id === siteId);
    setForm((f) => ({
      ...f,
      site_id: siteId || null,
      address_snapshot: s?.address ?? f.address_snapshot ?? null,
      latitude: s?.latitude ?? f.latitude ?? null,
      longitude: s?.longitude ?? f.longitude ?? null,
      client_user_id: s?.client_user_id ?? f.client_user_id ?? null,
    }));
  };

  // datetime-local needs YYYY-MM-DDTHH:mm in LOCAL time, not UTC
  const dtValue = form.scheduled_at
    ? (() => {
        const d = new Date(form.scheduled_at);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      })()
    : "";

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border bg-card shadow-2xl my-8">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold">{isEdit ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="size-9 grid place-items-center rounded-lg hover:bg-secondary"><X className="size-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Title *">
            <input
              value={form.title ?? ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Office Deep Cleaning — Floor 3"
              className="input"
              maxLength={200}
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="What needs to be done"
              className="input"
              maxLength={2000}
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Assign worker">
              <select
                value={form.assigned_worker_id ?? ""}
                onChange={(e) => setForm({ ...form, assigned_worker_id: e.target.value || null })}
                className="input"
              >
                <option value="">Unassigned</option>
                {workers?.map((w) => (
                  <option key={w.user_id} value={w.user_id}>{w.full_name?.trim() || w.user_id.slice(0, 8)}</option>
                ))}
              </select>
            </Field>

            <Field label="Service type">
              <select
                value={form.service_id ?? ""}
                onChange={(e) => setForm({ ...form, service_id: e.target.value || null })}
                className="input"
              >
                <option value="">— None —</option>
                {services?.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </Field>

            <Field label="Site">
              <select
                value={form.site_id ?? ""}
                onChange={(e) => pickSite(e.target.value)}
                className="input"
              >
                <option value="">— None —</option>
                {sites?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Urgency">
              <select
                value={form.urgency ?? "medium"}
                onChange={(e) => setForm({ ...form, urgency: e.target.value as Task["urgency"] })}
                className="input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="emergency">Emergency 🚨</option>
              </select>
            </Field>

            <Field label="Scheduled for">
              <input
                type="datetime-local"
                value={dtValue}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="input"
              />
            </Field>

            {isEdit && (
              <Field label="Status">
                <select
                  value={form.status ?? "pending"}
                  onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
                  className="input"
                >
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>
            )}
          </div>

          <Field label="Address (shown to worker)">
            <input
              value={form.address_snapshot ?? ""}
              onChange={(e) => setForm({ ...form, address_snapshot: e.target.value })}
              placeholder="Street, city"
              className="input"
              maxLength={300}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitude (optional)">
              <input
                type="number" step="any"
                value={form.latitude ?? ""}
                onChange={(e) => setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : null })}
                className="input"
              />
            </Field>
            <Field label="Longitude (optional)">
              <input
                type="number" step="any"
                value={form.longitude ?? ""}
                onChange={(e) => setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : null })}
                className="input"
              />
            </Field>
          </div>

          <Field label="Special instructions">
            <textarea
              value={form.special_instructions ?? ""}
              onChange={(e) => setForm({ ...form, special_instructions: e.target.value })}
              rows={3}
              placeholder="Access code, key location, hazards, etc."
              className="input"
              maxLength={1000}
            />
          </Field>
        </div>

        <div className="p-5 border-t flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-secondary">Cancel</button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="rounded-xl gradient-hero text-primary-foreground px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create task"}
          </button>
        </div>
      </div>

      <style>{`.input{width:100%;border:1px solid hsl(var(--border));background:hsl(var(--background));border-radius:0.75rem;padding:0.625rem 0.75rem;font-size:0.875rem;outline:none}.input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</span>
      {children}
    </label>
  );
}
