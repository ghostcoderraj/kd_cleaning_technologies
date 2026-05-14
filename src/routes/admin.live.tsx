import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { LiveMap, type MapMarker } from "@/components/LiveMap";
import { Loader2, Wifi } from "lucide-react";

export const Route = createFileRoute("/admin/live")({
  head: () => ({ meta: [{ title: "Live Map — Admin" }, { name: "robots", content: "noindex" }] }),
  component: LivePage,
});

type Worker = {
  user_id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  current_latitude: number | null;
  current_longitude: number | null;
  last_seen_at: string | null;
};

function LivePage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["live-workers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_profiles")
        .select("user_id,full_name,phone,is_active,current_latitude,current_longitude,last_seen_at")
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as Worker[];
    },
    refetchInterval: 20_000,
  });

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("worker-locations")
      .on("postgres_changes", { event: "*", schema: "public", table: "worker_profiles" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refetch]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 10_000); return () => clearInterval(i); }, []);

  const workers = data ?? [];
  const withLoc = workers.filter((w) => w.current_latitude != null && w.current_longitude != null);

  const markers: MapMarker[] = withLoc.map((w) => {
    const ageMs = w.last_seen_at ? now - new Date(w.last_seen_at).getTime() : Infinity;
    const fresh = ageMs < 2 * 60_000;
    return {
      id: w.user_id,
      lat: Number(w.current_latitude),
      lng: Number(w.current_longitude),
      label: w.full_name || "Worker",
      color: fresh ? "#16a34a" : "#f59e0b",
      popupHtml: `<div><strong>${w.full_name || "Worker"}</strong><br/>${w.phone ?? ""}<br/><small>${w.last_seen_at ? new Date(w.last_seen_at).toLocaleTimeString() : "—"}</small></div>`,
    };
  });

  return (
    <AdminShell title="Live Map" subtitle="Real-time positions of active workers">
      {isLoading ? (
        <div className="py-20 grid place-items-center"><Loader2 className="size-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-2"><Wifi className="size-4 text-primary" /> {workers.length} active workers · {withLoc.length} sharing location</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full bg-green-600" /> live (&lt;2 min)</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full bg-amber-500" /> stale</span>
          </div>
          <LiveMap markers={markers} height={560} />
          {withLoc.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              No location data yet. Workers must open the worker app and allow location access.
            </p>
          )}
        </div>
      )}
    </AdminShell>
  );
}
