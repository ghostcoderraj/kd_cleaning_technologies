import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WorkerSearchRow = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  current_latitude: number | null;
  current_longitude: number | null;
  last_seen_at: string | null;
};

const searchSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export const searchWorkers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => searchSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    let query = supabase
      .from("worker_profiles")
      .select(
        "user_id, full_name, phone, email, is_active, current_latitude, current_longitude, last_seen_at",
      )
      .order("full_name", { ascending: true })
      .limit(data.limit);

    const q = data.q.trim();
    if (q) {
      // escape % and , for PostgREST or() filter
      const safe = q.replace(/[%,()]/g, " ").trim();
      const pattern = `%${safe}%`;
      query = query.or(
        `email.ilike.${pattern},full_name.ilike.${pattern},phone.ilike.${pattern}`,
      );
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("searchWorkers failed:", error);
      return { rows: [] as WorkerSearchRow[], error: error.message };
    }
    return { rows: (rows ?? []) as WorkerSearchRow[], error: null };
  });
