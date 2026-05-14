import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, Section } from "@/components/Section";
import { plans, faqs } from "@/lib/site-data";
import { Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — KD Cleaning Technologies" },
      { name: "description", content: "Transparent pricing for home and office cleaning. Basic, Standard, and Premium plans." },
      { property: "og:title", content: "KD Cleaning Technologies Pricing" },
      { property: "og:description", content: "Three simple plans. No hidden fees." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Simple, transparent pricing"
        subtitle="No hidden fees. Cancel anytime. Pick the plan that fits your space."
      />
      <Section>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-3xl p-8 border ${
                p.popular
                  ? "bg-card border-primary/30 ring-glow scale-[1.02]"
                  : "bg-card border-border"
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold gradient-hero text-primary-foreground shadow-soft inline-flex items-center gap-1">
                  <Sparkles className="size-3" /> Most Popular
                </div>
              )}
              <h3 className="font-display text-xl font-bold">{p.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-bold">${p.price}</span>
                <span className="text-muted-foreground">{p.period}</span>
              </div>
              <Link
                to="/book"
                className={`mt-6 block text-center rounded-2xl px-5 py-3 font-semibold transition-all ${
                  p.popular
                    ? "gradient-hero text-primary-foreground shadow-soft hover:shadow-glow"
                    : "border border-border hover:bg-secondary"
                }`}
              >
                Get started
              </Link>
              <ul className="mt-8 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3">
                    <Check className="size-5 text-accent shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section className="bg-secondary/40" eyebrow="FAQ" title="Pricing questions">
        <PricingFaq />
      </Section>
    </>
  );
}

function PricingFaq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {faqs.map((f, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
          <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left font-semibold">
            {f.q}
            <ChevronDown className={`size-5 transition-transform ${open === i ? "rotate-180" : ""}`} />
          </button>
          {open === i && <div className="px-5 pb-5 text-sm text-muted-foreground">{f.a}</div>}
        </div>
      ))}
    </div>
  );
}
