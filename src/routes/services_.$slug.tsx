import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Clock, Check, Sparkles, Loader2, ArrowLeft, MessageCircle, Send, CheckCircle2, Tag } from "lucide-react";
import { Section } from "@/components/Section";
import { supabase } from "@/integrations/supabase/client";

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
  meta_title: string | null;
  meta_description: string | null;
};

export const Route = createFileRoute("/services_/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("slug", params.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return { service: data as Service };
  },
  head: ({ loaderData }) => {
    const s = loaderData?.service;
    if (!s) {
      return {
        meta: [
          { title: "Service — KD Cleaning Technologies" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = s.meta_title || `${s.title} — KD Cleaning Technologies`;
    const desc =
      s.meta_description ||
      s.description ||
      `Book ${s.title} from KD Cleaning Technologies. ${s.duration ? s.duration + ". " : ""}Starting at ₹${Number(s.price).toLocaleString()}.`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "product" },
    ];
    if (s.image_url) {
      meta.push({ property: "og:image", content: s.image_url });
      meta.push({ name: "twitter:image", content: s.image_url });
      meta.push({ name: "twitter:card", content: "summary_large_image" });
    }
    return {
      meta,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: s.title,
            description: desc,
            category: s.category,
            image: s.image_url || undefined,
            provider: { "@type": "Organization", name: "KD Cleaning Technologies" },
            offers: {
              "@type": "Offer",
              price: Number(s.price),
              priceCurrency: "INR",
              availability: "https://schema.org/InStock",
            },
          }),
        },
      ],
    };
  },
  component: ServiceDetailPage,
});

function ServiceDetailPage() {
  const { service } = Route.useLoaderData();
  const savings = service.original_price ? Number(service.original_price) - Number(service.price) : 0;

  return (
    <Section>
      <div className="max-w-6xl mx-auto">
        <Link to="/services" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> All services
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-muted shadow-soft"
          >
            {service.image_url ? (
              <img src={service.image_url} alt={service.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center gradient-hero">
                <Sparkles className="size-16 text-primary-foreground" />
              </div>
            )}
            <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/90 backdrop-blur text-xs font-bold text-slate-800 inline-flex items-center gap-1">
              <Tag className="size-3" /> {service.category}
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col"
          >
            {service.duration && (
              <div className="inline-flex items-center gap-1.5 text-amber-500 font-bold text-sm">
                <Clock className="size-4" /> {service.duration}
              </div>
            )}
            <h1 className="mt-2 font-display text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-foreground">
              {service.title}
            </h1>
            {service.description && (
              <p className="mt-3 text-muted-foreground leading-relaxed">{service.description}</p>
            )}

            <div className="mt-6 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-4xl font-display font-extrabold text-emerald-600">
                  ₹{Number(service.price).toLocaleString()}
                </span>
                {service.original_price && Number(service.original_price) > Number(service.price) && (
                  <span className="text-lg text-muted-foreground line-through">
                    ₹{Number(service.original_price).toLocaleString()}
                  </span>
                )}
                {savings > 0 && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-200 dark:bg-emerald-900/50 px-2.5 py-1 rounded-full">
                    SAVE ₹{savings.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">All inclusive · No hidden charges</p>
            </div>

            {service.features?.length > 0 && (
              <div className="mt-6">
                <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">What's included</h2>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {service.features.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {service.phone && (
                <a
                  href={`tel:${service.phone}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white bg-blue-500 hover:bg-blue-600 shadow transition-colors"
                >
                  <Phone className="size-4" /> Call Now
                </a>
              )}
              {service.whatsapp && (
                <a
                  href={`https://wa.me/${service.whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in ${service.title}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow transition-colors"
                >
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              )}
              <a
                href="#enquiry"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white bg-gradient-to-b from-amber-400 to-orange-500 hover:shadow-md shadow transition-shadow"
              >
                <Send className="size-4" /> Enquire
              </a>
            </div>
          </motion.div>
        </div>

        <div id="enquiry" className="mt-16 scroll-mt-24">
          <EnquiryForm serviceTitle={service.title} />
        </div>
      </div>
    </Section>
  );
}

function EnquiryForm({ serviceTitle }: { serviceTitle: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setDone(true);
  };

  return (
    <div className="max-w-2xl mx-auto rounded-3xl p-8 md:p-10 bg-card border border-border shadow-soft">
      <div className="text-center mb-6">
        <h2 className="font-display text-2xl md:text-3xl font-extrabold">Enquire about {serviceTitle}</h2>
        <p className="mt-2 text-muted-foreground text-sm">Fill the form and we'll call you back within minutes.</p>
      </div>
      {done ? (
        <div className="text-center py-8 animate-fade-in">
          <div className="size-16 mx-auto grid place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="size-8" />
          </div>
          <h3 className="mt-5 text-xl font-bold">Enquiry sent!</h3>
          <p className="mt-2 text-muted-foreground">We'll get back to you shortly.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Full name"><input required className={inputCls} placeholder="Jane Doe" /></Field>
            <Field label="Phone"><input required type="tel" className={inputCls} placeholder="+91 98765 43210" /></Field>
          </div>
          <Field label="Email"><input required type="email" className={inputCls} placeholder="you@email.com" /></Field>
          <Field label="Address / Location"><input className={inputCls} placeholder="City, area" /></Field>
          <Field label="Message">
            <textarea rows={4} className={inputCls} placeholder="Tell us a bit about your space and preferred date..." defaultValue={`I'm interested in ${serviceTitle}.`} />
          </Field>
          <button
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-semibold gradient-hero text-primary-foreground shadow-soft hover:shadow-glow transition-shadow disabled:opacity-70"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Sending..." : "Send Enquiry"}
          </button>
        </form>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl bg-background border border-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
