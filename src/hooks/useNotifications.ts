import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  url?: string;
  createdAt: number;
  read: boolean;
  tone?: "info" | "success" | "warning" | "danger";
};

const STORAGE_KEY = "kd-notifications-v1";
const MAX_KEEP = 50;

function loadStored(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AppNotification[];
  } catch {
    return [];
  }
}

function persist(items: AppNotification[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_KEEP)));
  } catch {
    /* ignore */
  }
}

function showBrowserNotification(n: AppNotification) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const note = new Notification(n.title, {
      body: n.body,
      tag: n.id,
      icon: "/favicon.ico",
    });
    note.onclick = () => {
      window.focus();
      if (n.url) window.location.href = n.url;
      note.close();
    };
  } catch {
    /* ignore */
  }
}

export type NotificationRole = "worker" | "admin" | "client";

export function useNotifications(role: NotificationRole) {
  const [items, setItems] = useState<AppNotification[]>(() => loadStored());
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default",
  );
  const userIdRef = useRef<string | null>(null);

  const push = useCallback((n: Omit<AppNotification, "id" | "createdAt" | "read">) => {
    const note: AppNotification = {
      ...n,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      read: false,
    };
    setItems((prev) => {
      const next = [note, ...prev].slice(0, MAX_KEEP);
      persist(next);
      return next;
    });
    const toastFn =
      n.tone === "danger" ? toast.error
      : n.tone === "warning" ? toast.warning
      : n.tone === "success" ? toast.success
      : toast;
    toastFn(n.title, { description: n.body });
    showBrowserNotification(note);
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return "denied" as const;
    if (Notification.permission === "granted" || Notification.permission === "denied") {
      setPermission(Notification.permission);
      return Notification.permission;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      persist(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    persist([]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;
      userIdRef.current = data.user.id;
      const me = data.user.id;

      channel = supabase.channel(`notify-${role}-${me}`);

      if (role === "worker") {
        // New assignments to me
        channel.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "tasks", filter: `assigned_worker_id=eq.${me}` },
          (payload) => {
            const t = payload.new as { id: string; title: string; urgency: string };
            push({
              title: t.urgency === "emergency" ? "🚨 Emergency assignment" : "New task assigned",
              body: t.title,
              url: `/worker/${t.id}`,
              tone: t.urgency === "emergency" ? "danger" : "info",
            });
          },
        );
        // Re-assignments / urgency upgrades
        channel.on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "tasks", filter: `assigned_worker_id=eq.${me}` },
          (payload) => {
            const oldT = payload.old as { urgency?: string } | null;
            const t = payload.new as { id: string; title: string; urgency: string };
            if (oldT?.urgency !== "emergency" && t.urgency === "emergency") {
              push({
                title: "🚨 Task escalated to emergency",
                body: t.title,
                url: `/worker/${t.id}`,
                tone: "danger",
              });
            }
          },
        );
      }

      if (role === "admin") {
        // Status changes on any task
        channel.on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "tasks" },
          (payload) => {
            const oldT = payload.old as { status?: string } | null;
            const t = payload.new as { id: string; title: string; status: string };
            if (oldT?.status && oldT.status !== t.status) {
              const tone =
                t.status === "completed" ? "success" :
                t.status === "cancelled" ? "warning" :
                "info";
              push({
                title: `Task ${t.status.replace("_", " ")}`,
                body: t.title,
                url: `/admin/tasks`,
                tone,
              });
            }
          },
        );
        // New emergency tasks
        channel.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "tasks", filter: "urgency=eq.emergency" },
          (payload) => {
            const t = payload.new as { id: string; title: string };
            push({
              title: "🚨 New emergency task",
              body: t.title,
              url: `/admin/tasks`,
              tone: "danger",
            });
          },
        );
        // Client feedback
        channel.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "task_notes", filter: "kind=eq.feedback" },
          (payload) => {
            const n = payload.new as { body: string };
            push({
              title: "New client feedback",
              body: n.body.slice(0, 120),
              url: `/admin/tasks`,
              tone: "info",
            });
          },
        );
      }

      if (role === "client") {
        // Status changes on my tasks
        channel.on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "tasks", filter: `client_user_id=eq.${me}` },
          (payload) => {
            const oldT = payload.old as { status?: string } | null;
            const t = payload.new as { id: string; title: string; status: string };
            if (oldT?.status && oldT.status !== t.status) {
              push({
                title: `Update: ${t.status.replace("_", " ")}`,
                body: t.title,
                url: `/client/${t.id}`,
                tone: t.status === "completed" ? "success" : "info",
              });
            }
          },
        );
      }

      channel.subscribe();
    };

    setup();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [role, push]);

  const unread = items.filter((n) => !n.read).length;

  return { items, unread, permission, requestPermission, markAllRead, clear, push };
}
