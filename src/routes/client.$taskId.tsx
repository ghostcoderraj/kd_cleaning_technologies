import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, MapPin, Clock, AlertTriangle, Loader2, CheckCircle2,
  Image as ImageIcon, Send, Star, Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/client/$taskId")({
  component: ClientTaskDetail,
});

type TaskStatus = "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  urgency: "low" | "medium" | "high" | "emergency";
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  address_snapshot: string | null;
  special_instructions: string | null;
  client_user_id: string | null;
};
type Photo = { id: string; phase: "before" | "during" | "after"; image_url: string; taken_at: string };
type Note = { id: string; body: string; kind: "general" | "material" | "damage" | "feedback"; created_at: string; author_id: string };
type StatusEvent = { id: string; from_status: TaskStatus | null; to_status: TaskStatus; changed_at: string };

const urgencyStyles = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
  emergency: "bg-red-100 text-red-800 border-red-200 animate-pulse",
} as const;

const statusLabel: Record<TaskStatus, string> = {
  pending: "Scheduled",
  accepted: "Accepted by worker",
  in_progress: "Cleaning in progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function ClientTaskDetail() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: task, isLoading } = useQuery({
    queryKey: ["client-task", taskId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).single();
      if (error) throw error;
      return data as Task;
    },
    refetchInterval: 30_000,
  });

  const { data: photos } = useQuery({
    queryKey: ["client-task-photos", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_photos").select("id,phase,image_url,taken_at")
        .eq("task_id", taskId).order("taken_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Photo[];
    },
    refetchInterval: 30_000,
  });

  const { data: notes } = useQuery({
    queryKey: ["client-task-notes", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_notes").select("id,body,kind,created_at,author_id")
        .eq("task_id", taskId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Note[];
    },
  });

  const { data: history } = useQuery({
    queryKey: ["client-task-history", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_status_history").select("id,from_status,to_status,changed_at")
        .eq("task_id", taskId).order("changed_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as StatusEvent[];
    },
  });

  if (isLoading || !task) {
    return <div className="py-20 grid place-items-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }

  const before = (photos ?? []).filter((p) => p.phase === "before");
  const during = (photos ?? []).filter((p) => p.phase === "during");
  const after = (photos ?? []).filter((p) => p.phase === "after");

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate({ to: "/client" })}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to dashboard
      </button>

      {/* Header */}
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${urgencyStyles[task.urgency]}`}>
            {task.urgency === "emergency" && <AlertTriangle className="size-3 inline mr-1" />}
            {task.urgency}
          </span>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {statusLabel[task.status]}
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
          </div>
        )}
        {task.completed_at && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4" />
            Completed {new Date(task.completed_at).toLocaleString()}
          </div>
        )}
      </div>

      {/* Status timeline */}
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3"><Activity className="size-4" /> Status timeline</h2>
        {history && history.length > 0 ? (
          <ol className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 text-sm">
                <span className="size-2 rounded-full bg-primary shrink-0" />
                <span className="font-medium">{statusLabel[h.to_status]}</span>
                <span className="text-muted-foreground ml-auto text-xs">{new Date(h.changed_at).toLocaleString()}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        )}
      </section>

      {/* Before / After Gallery */}
      <section className="rounded-2xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <ImageIcon className="size-4" /> Before & After
          <span className="text-xs text-muted-foreground font-normal ml-auto">{photos?.length ?? 0} photos</span>
        </h2>
        <PhotoGroup label="Before" photos={before} />
        <PhotoGroup label="During" photos={during} />
        <PhotoGroup label="After" photos={after} />
        {(photos?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
        )}
      </section>

      {/* Worker notes (non-feedback) */}
      {notes && notes.some((n) => n.kind !== "feedback") && (
        <section className="rounded-2xl border bg-card p-5 space-y-2">
          <h2 className="font-semibold mb-2">Worker notes</h2>
          <ul className="space-y-2">
            {notes.filter((n) => n.kind !== "feedback").map((n) => (
              <li key={n.id} className="rounded-xl border bg-background p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-secondary capitalize">{n.kind}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <p className="whitespace-pre-wrap">{n.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Feedback form (clients only — RLS already restricts) */}
      <FeedbackSection
        taskId={taskId}
        userId={userId}
        canSubmit={task.client_user_id === userId && task.status === "completed"}
        feedback={(notes ?? []).filter((n) => n.kind === "feedback")}
      />
    </div>
  );
}

function PhotoGroup({ label, photos }: { label: string; photos: Photo[] }) {
  if (photos.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{label} ({photos.length})</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((p) => (
          <a
            key={p.id}
            href={p.image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative rounded-xl overflow-hidden border bg-card group"
          >
            <img src={p.image_url} alt={`${label} photo`} loading="lazy" className="w-full aspect-square object-cover group-hover:scale-105 transition" />
            <span className="absolute bottom-1 right-1 text-[10px] bg-background/90 px-1.5 py-0.5 rounded">
              {new Date(p.taken_at).toLocaleDateString()}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function FeedbackSection({
  taskId, userId, canSubmit, feedback,
}: {
  taskId: string;
  userId: string | null;
  canSubmit: boolean;
  feedback: Note[];
}) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not signed in");
      if (rating === 0 && !body.trim()) throw new Error("Add a rating or message");
      const stars = rating > 0 ? `${"★".repeat(rating)}${"☆".repeat(5 - rating)}\n` : "";
      const { error } = await supabase.from("task_notes").insert({
        task_id: taskId,
        author_id: userId,
        kind: "feedback",
        body: `${stars}${body.trim()}`.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks for the feedback!");
      setRating(0); setBody("");
      qc.invalidateQueries({ queryKey: ["client-task-notes", taskId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <section className="rounded-2xl border bg-card p-5 space-y-3">
      <h2 className="font-semibold">Your feedback</h2>

      {feedback.length > 0 && (
        <ul className="space-y-2">
          {feedback.map((n) => (
            <li key={n.id} className="rounded-xl border bg-background p-3 text-sm whitespace-pre-wrap">
              <div className="text-xs text-muted-foreground mb-1">{new Date(n.created_at).toLocaleString()}</div>
              {n.body}
            </li>
          ))}
        </ul>
      )}

      {canSubmit ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n === rating ? 0 : n)}
                className="p-1"
                aria-label={`${n} stars`}
              >
                <Star className={`size-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="How did the cleaning go? Anything we should know?"
            rows={3}
            className="w-full rounded-xl border bg-background p-3 text-sm resize-none"
            maxLength={1000}
          />
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || (rating === 0 && !body.trim())}
            className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Submit feedback
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {feedback.length === 0 && "Feedback can be submitted once the task is marked completed."}
        </p>
      )}
    </section>
  );
}
