import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}`;

        const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        let serviceUrls = "";
        if (SUPABASE_URL && SUPABASE_KEY) {
          const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
          const { data } = await supabase
            .from("services")
            .select("slug, updated_at")
            .eq("is_active", true);
          serviceUrls = (data ?? [])
            .map(
              (s) =>
                `<url><loc>${origin}/services/${s.slug}</loc><lastmod>${new Date(s.updated_at).toISOString()}</lastmod><changefreq>weekly</changefreq></url>`
            )
            .join("");
        }

        const staticPaths = ["/", "/services", "/about", "/contact", "/pricing", "/reviews", "/book"];
        const staticUrls = staticPaths
          .map((p) => `<url><loc>${origin}${p}</loc><changefreq>weekly</changefreq></url>`)
          .join("");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${serviceUrls}</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
