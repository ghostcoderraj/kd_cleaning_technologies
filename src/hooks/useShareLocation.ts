import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Continuously shares the worker's current GPS location.
 * - Updates worker_profiles.current_lat/lng + last_seen_at
 * - If activeTaskId given, also inserts into task_locations
 */
export function useShareLocation(opts: { enabled: boolean; activeTaskId?: string | null }) {
  const { enabled, activeTaskId } = opts;

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) return;

    let cancelled = false;
    let lastSent = 0;

    const send = async (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastSent < 15_000) return; // throttle
      lastSent = now;

      const { data: u } = await supabase.auth.getUser();
      if (!u.user || cancelled) return;

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      await supabase.from("worker_profiles").update({
        current_latitude: lat,
        current_longitude: lng,
        last_seen_at: new Date().toISOString(),
      }).eq("user_id", u.user.id);

      if (activeTaskId) {
        await supabase.from("task_locations").insert({
          task_id: activeTaskId,
          worker_id: u.user.id,
          latitude: lat,
          longitude: lng,
          accuracy: pos.coords.accuracy,
        });
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      send,
      (err) => console.warn("geo error", err.message),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 }
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled, activeTaskId]);
}
