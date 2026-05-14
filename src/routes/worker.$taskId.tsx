import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, MapPin, Clock, AlertTriangle, Camera, Loader2,
  Play, CheckCircle2, Navigation, Send, Image as ImageIcon, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/worker/$taskId")({
  component: TaskDetail,
});

type Task = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  urgency: "low" | "medium" | "high" | "emergency";
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  address_snapshot: string | null;
  special_instructions: string | null;
  latitude: number | null;
  longitude: number | null;
  estimated_duration: string | null;
  assigned_worker_id: string | null;
};

type Photo = {
  id: string;
  phase: "before" | "during" | "after";
  image_url: string;
  caption: string | null;
  taken_at: string;
};

type Note = {
  id: string;
  body: string;
  kind: "general" | "material" | "damage" | "feedback";
  created_at: string;
};

const urgencyStyles = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
  emergency: "bg-red-100 text-red-800 border-red-200 animate-pulse",
} as const;

function TaskDetail() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks").select("*").eq("id", taskId).single();
      if (error) throw error;
      return data as Task;
    },
  });

  const { data: photos } = useQuery({
    queryKey: ["task-photos", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_photos")
        .select("id,phase,image_url,caption,taken_at")
        .eq("task_id", taskId)
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Photo[];
    },
  });

  const { data: notes } = useQuery({
    queryKey: ["task-notes", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_notes")
        .select("id,body,kind,created_at")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Note[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (next: Task["status"]) => {
      const patch: { status: Task["status"]; started_at?: string; completed_at?: string } = { status: next };
      if (next === "in_progress") patch.started_at = new Date().toISOString();
      if (next === "completed") patch.completed_at = new Date().toISOString();
      const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", taskId] });
      qc.invalidateQueries({ queryKey: ["worker-tasks"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  // Live GPS pings while in_progress
  useEffect(() => {
    if (task?.status !== "in_progress" || !userId) return;
    if (!navigator.geolocation) return;
    const ping = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await supabase.from("task_locations").insert({
            task_id: taskId,
            worker_id: userId,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          await supabase
            .from("worker_profiles")
            .update({
              current_latitude: pos.coords.latitude,
              current_longitude: pos.coords.longitude,
              last_seen_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 15_000, timeout: 10_000 }
      );
    };
    ping();
    const id = setInterval(ping, 60_000);
    return () => clearInterval(id);
  }, [task?.status, userId, taskId]);

  if (isLoading || !task) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const mapsHref = task.latitude && task.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`
    : task.address_snapshot
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.address_snapshot)}`
    : null;

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate({ to: "/worker" })}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to tasks
      </button>

      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${urgencyStyles[task.urgency]}`}>
            {task.urgency === "emergency" && <AlertTriangle className="size-3 inline mr-1" />}
            {task.urgency}
          </span>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {task.status.replace("_", " ")}
          </span>
        </div>
        <h1 className="text-xl font-bold leading-tight">{task.title}</h1>
        {task.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>}

        {task.address_snapshot && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="size-4 mt-0.5 text-primary" />
            <span>{task.address_snapshot}</span>
          </div>
        )}
        {task.scheduled_at && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-primary" />
            <span>{new Date(task.scheduled_at).toLocaleString()}</span>
            {task.estimated_duration && <span className="text-muted-foreground">· {task.estimated_duration}</span>}
          </div>
        )}
        {task.special_instructions && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-sm">
            <p className="font-semibold mb-1 text-amber-900 dark:text-amber-200">Special instructions</p>
            <p className="text-amber-800 dark:text-amber-200/90 whitespace-pre-wrap">{task.special_instructions}</p>
          </div>
        )}

        {mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
          >
            <Navigation className="size-4" /> Navigate in Google Maps
          </a>
        )}
      </div>

      <ActionBar task={task} onAction={(s) => updateStatus.mutate(s)} loading={updateStatus.isPending} />

      <PhotosSection taskId={taskId} userId={userId} photos={photos ?? []} disabled={task.status === "completed"} />

      <NotesSection taskId={taskId} userId={userId} notes={notes ?? []} disabled={task.status === "completed"} />
    </div>
  );
}

function ActionBar({
  task,
  onAction,
  loading,
}: {
  task: Task;
  onAction: (s: Task["status"]) => void;
  loading: boolean;
}) {
  if (task.status === "completed") {
    return (
      <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-4 text-emerald-900 dark:text-emerald-200 text-sm flex items-center gap-2">
        <CheckCircle2 className="size-5" />
        Completed {task.completed_at && `on ${new Date(task.completed_at).toLocaleString()}`}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-2">
      {task.status === "pending" && (
        <button
          disabled={loading}
          onClick={() => onAction("accepted")}
          className="rounded-2xl bg-primary text-primary-foreground py-4 font-semibold shadow-soft active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-5 animate-spin inline" /> : "Accept Task"}
        </button>
      )}
      {task.status === "accepted" && (
        <button
          disabled={loading}
          onClick={() => onAction("in_progress")}
          className="rounded-2xl bg-emerald-600 text-white py-4 font-semibold shadow-soft active:scale-[0.99] disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="size-5 animate-spin" /> : <><Play className="size-5" /> Start Cleaning</>}
        </button>
      )}
      {task.status === "in_progress" && (
        <button
          disabled={loading}
          onClick={() => {
            if (confirm("Mark this task as completed?")) onAction("completed");
          }}
          className="rounded-2xl bg-green-600 text-white py-4 font-semibold shadow-soft active:scale-[0.99] disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="size-5 animate-spin" /> : <><CheckCircle2 className="size-5" /> Mark Completed</>}
        </button>
      )}
    </div>
  );
}

function PhotosSection({
  taskId,
  userId,
  photos,
  disabled,
}: {
  taskId: string;
  userId: string | null;
  photos: Photo[];
  disabled: boolean;
}) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<"before" | "during" | "after">("before");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!userId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${taskId}/${phase}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("task-photos").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("task-photos").getPublicUrl(path);

      // Try to capture GPS for proof
      const coords = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(null),
          { timeout: 5000 }
        );
      });

      const { error } = await supabase.from("task_photos").insert({
        task_id: taskId,
        worker_id: userId,
        phase,
        image_url: pub.publicUrl,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["task-photos", taskId] });
      toast.success(`${phase} photo uploaded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("task_photos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task-photos", taskId] }),
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <ImageIcon className="size-4" /> Photos
        </h2>
        <span className="text-xs text-muted-foreground">{photos.length} uploaded</span>
      </div>

      {!disabled && (
        <div className="rounded-2xl border bg-card p-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(["before", "during", "after"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPhase(p)}
                className={`py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border ${
                  phase === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-secondary"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 py-6 text-sm font-semibold text-primary inline-flex items-center justify-center gap-2 hover:bg-primary/10 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
            {uploading ? "Uploading..." : `Take ${phase} photo`}
          </button>
        </div>
      )}

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((ph) => (
            <div key={ph.id} className="relative group rounded-xl overflow-hidden border bg-card">
              <img src={ph.image_url} alt={ph.phase} className="w-full aspect-square object-cover" />
              <span className="absolute top-1.5 left-1.5 text-[10px] uppercase font-bold bg-background/90 text-foreground px-2 py-0.5 rounded-full">
                {ph.phase}
              </span>
              {!disabled && (
                <button
                  onClick={() => remove.mutate(ph.id)}
                  className="absolute top-1.5 right-1.5 size-7 grid place-items-center rounded-full bg-background/90 text-destructive opacity-0 group-hover:opacity-100 transition"
                  aria-label="Delete"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No photos yet.</p>
      )}
    </section>
  );
}

function NotesSection({
  taskId,
  userId,
  notes,
  disabled,
}: {
  taskId: string;
  userId: string | null;
  notes: Note[];
  disabled: boolean;
}) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<Note["kind"]>("general");

  const add = useMutation({
    mutationFn: async () => {
      if (!userId || !body.trim()) return;
      const { error } = await supabase.from("task_notes").insert({
        task_id: taskId,
        author_id: userId,
        body: body.trim(),
        kind,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["task-notes", taskId] });
      toast.success("Note added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const kindStyles: Record<Note["kind"], string> = {
    general: "bg-slate-100 text-slate-700",
    material: "bg-amber-100 text-amber-800",
    damage: "bg-red-100 text-red-800",
    feedback: "bg-blue-100 text-blue-800",
  };

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Notes</h2>

      {!disabled && (
        <div className="rounded-2xl border bg-card p-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {(["general", "material", "damage", "feedback"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                  kind === k ? "bg-primary text-primary-foreground" : kindStyles[k]
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a note (material shortage, damage, extra cleaning, etc.)"
            rows={3}
            className="w-full rounded-xl border bg-background p-3 text-sm resize-none"
          />
          <button
            onClick={() => add.mutate()}
            disabled={!body.trim() || add.isPending}
            className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {add.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Add Note
          </button>
        </div>
      )}

      {notes.length > 0 ? (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${kindStyles[n.kind]}`}>
                  {n.kind}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{n.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      )}
    </section>
  );
}
