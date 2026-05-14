import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Phone, Clock, Check, Sparkles, Loader2 } from "lucide-react";
import { PageHero, Section } from "@/components/Section";
import { ServiceIconGrid } from "@/components/ServiceIconGrid";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Cleaning Services & Packages — KD Cleaning Technologies" },
      { name: "description", content: "Browse all KD Cleaning Technologies packages — home, deep, office and move-in/out cleaning with transparent pricing." },
      { property: "og:title", content: "All Cleaning Packages — KD Cleaning Technologies" },
      { property: "og:description", content: "Tailored cleaning packages for every space." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ServicesPage,
});

type Service = {
  id: string;
  title: string;
  slug: string;
  category: string;
  duration: string;
  description: string;
  features: string[];
  image_url: string | null;
  price: number;
  original_price: number | null;
  phone: string | null;
  whatsapp: string | null;
};

function ServicesPage() {
  const { data: services, isLoading } = useQuery({
    queryKey: ["services-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as Service[];
    },
  });

  const categories = useMemo(() => {
    const set = new Set(services?.map((s) => s.category));
    return ["All", ...Array.from(set)];
  }, [services]);
  const [active, setActive] = useState("All");

  const filtered = active === "All" ? services : services?.filter((s) => s.category === active);

  return (
    <>
      <PageHero
        eyebrow="Our Packages"
        title="Cleaning packages built for every space"
        subtitle="Transparent pricing. Trained pros. Spotless results — guaranteed."
      />
      <Section>
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                active === c
                  ? "gradient-hero text-primary-foreground shadow-soft"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filtered?.map((s, i) => (
                <ServiceCard key={s.id} s={s} delay={i * 0.05} />
              ))}
            </div>

            {services && services.length > 0 && (
              <div className="mt-16">
                <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight mb-6">
                  Explore all services
                </h2>
                <ServiceIconGrid items={services} />
              </div>
            )}
          </>
        )}
      </Section>
    </>
  );
}

function ServiceCard({ s, delay }: { s: Service; delay: number }) {
  const savings = s.original_price ? Number(s.original_price) - Number(s.price) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="group rounded-2xl bg-white dark:bg-card border border-border overflow-hidden hover-lift shadow-soft flex flex-col"
    >
      {/* Image with bold overlay title */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {s.image_url ? (
          <img
            src={s.image_url}
            alt={s.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full grid place-items-center gradient-hero">
            <Sparkles className="size-12 text-primary-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
          <h3 className="font-display text-2xl md:text-[26px] font-extrabold uppercase tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] leading-tight">
            {s.title}
          </h3>
          {s.duration && (
            <span className="mt-2 px-3 py-1 rounded-md bg-amber-400 text-[11px] font-extrabold uppercase tracking-wider text-amber-950 shadow">
              {s.duration}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Duration label (orange) */}
        {s.duration && (
          <div className="text-amber-500 font-bold text-sm">{s.duration}</div>
        )}

        {/* Title in dark navy */}
        <h4 className="mt-1 font-display font-extrabold text-[17px] leading-snug text-slate-800 dark:text-foreground line-clamp-2">
          {s.title}
        </h4>

        {/* Pricing row */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {s.original_price && Number(s.original_price) > Number(s.price) && (
            <span className="text-sm text-muted-foreground line-through">
              ₹{Number(s.original_price).toLocaleString()}
            </span>
          )}
          {savings > 0 && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              SAVE ₹{savings.toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-display font-extrabold text-emerald-600">
            ₹{Number(s.price).toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">/Adult</span>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2 items-center">
          <Link
            to="/services/$slug"
            params={{ slug: s.slug }}
            className="flex-1 text-center rounded-lg px-3 py-2.5 text-sm font-bold text-white bg-gradient-to-b from-amber-400 to-orange-500 shadow hover:shadow-md transition-shadow"
          >
            View Package
          </Link>
          {s.phone && (
            <a
              href={`tel:${s.phone}`}
              aria-label="Call"
              className="size-10 grid place-items-center rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow"
            >
              <Phone className="size-4" />
            </a>
          )}
          {s.whatsapp && (
            <a
              href={`https://wa.me/${s.whatsapp.replace(/[^\d]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="size-10 grid place-items-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3.1 4.9 4.3 2.9 1.2 2.9.8 3.4.8.5 0 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.4c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2"/>
              </svg>
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
