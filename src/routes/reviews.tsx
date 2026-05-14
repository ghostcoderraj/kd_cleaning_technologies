import { createFileRoute } from "@tanstack/react-router";
import { PageHero, Section } from "@/components/Section";
import { reviews } from "@/lib/site-data";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews — KD Cleaning Technologies" },
      { name: "description", content: "Read what 1,200+ happy KD Cleaning Technologies customers are saying." },
      { property: "og:title", content: "KD Cleaning Technologies Reviews" },
      { property: "og:description", content: "Real stories from real customers." },
    ],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % reviews.length), 5000);
    return () => clearInterval(t);
  }, []);
  const r = reviews[i];

  return (
    <>
      <PageHero
        eyebrow="Reviews"
        title="Loved by 1,200+ clients"
        subtitle="A 4.9★ average rating across thousands of completed cleans."
      />

      <Section>
        <div className="max-w-3xl mx-auto rounded-3xl p-10 glass-card shadow-soft relative overflow-hidden">
          <div className="absolute inset-0 gradient-glow pointer-events-none" />
          <AnimatePresence mode="wait">
            <motion.div
              key={r.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="relative text-center"
            >
              <div className="flex justify-center">{[...Array(r.rating)].map((_, k) => <Star key={k} className="size-5 fill-accent text-accent" />)}</div>
              <p className="mt-5 text-lg md:text-xl">"{r.text}"</p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <div className="size-12 rounded-full gradient-hero text-primary-foreground grid place-items-center font-semibold">
                  {r.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="text-left">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.role}</div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex justify-center gap-2 relative">
            <button onClick={() => setI((i - 1 + reviews.length) % reviews.length)} className="size-10 grid place-items-center rounded-full glass hover:bg-secondary"><ChevronLeft className="size-5" /></button>
            <button onClick={() => setI((i + 1) % reviews.length)} className="size-10 grid place-items-center rounded-full glass hover:bg-secondary"><ChevronRight className="size-5" /></button>
          </div>
        </div>
      </Section>

      <Section className="bg-secondary/40" eyebrow="More stories" title="What clients say">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((r, idx) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="rounded-2xl p-6 bg-card border border-border hover-lift"
            >
              <div className="flex">{[...Array(r.rating)].map((_, k) => <Star key={k} className="size-4 fill-accent text-accent" />)}</div>
              <p className="mt-3 text-sm leading-relaxed">"{r.text}"</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="size-10 rounded-full gradient-hero text-primary-foreground grid place-items-center font-semibold text-sm">
                  {r.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <div className="font-semibold text-sm">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>
    </>
  );
}
