import { useState } from "react";
import { Bell, BellOff, Check, Trash2 } from "lucide-react";
import { useNotifications, type NotificationRole } from "@/hooks/useNotifications";

export function NotificationBell({ role }: { role: NotificationRole }) {
  const { items, unread, permission, requestPermission, markAllRead, clear } = useNotifications(role);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (unread > 0) markAllRead();
        }}
        className="relative inline-flex items-center justify-center rounded-xl bg-secondary hover:bg-secondary/80 size-10"
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[10px] font-bold grid place-items-center px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl border bg-popover shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold">Notifications</div>
              <button
                onClick={clear}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                disabled={items.length === 0}
              >
                <Trash2 className="size-3.5" /> Clear
              </button>
            </div>

            {permission !== "granted" && (
              <button
                onClick={requestPermission}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm bg-primary/10 text-primary hover:bg-primary/20 border-b"
              >
                {permission === "denied" ? <BellOff className="size-4" /> : <Bell className="size-4" />}
                {permission === "denied"
                  ? "Browser notifications blocked"
                  : "Enable browser notifications"}
              </button>
            )}

            <div className="max-h-[60vh] overflow-y-auto divide-y">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-sm text-center text-muted-foreground">
                  You're all caught up.
                </div>
              ) : (
                items.map((n) => (
                  <a
                    key={n.id}
                    href={n.url ?? "#"}
                    className="block px-4 py-3 hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm">{n.title}</div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>
                  </a>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="px-4 py-2 border-t text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Check className="size-3" /> Marked all as read
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
