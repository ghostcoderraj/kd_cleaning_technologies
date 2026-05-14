import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, Section } from "@/components/Section";
import { Counter } from "@/components/Counter";
import { stats, features } from "@/lib/site-data";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import gallery1 from "@/assets/gallery-1.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — KD Cleaning Technologies" },
      { name: "description", content: "Meet the KD Cleaning Technologies team — vetted, trained professionals delivering eco-friendly cleaning across the city." },
      { property: "og:title", content: "About KD Cleaning Technologies" },
      { property: "og:description", content: "Our story, mission, and the team behind sparkling spaces." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="Cleaning, reimagined for modern life"
        subtitle="We started KD Cleaning Technologies to make professional cleaning effortless, ethical, and genuinely premium — for every kind of space."
      />
      <Section>
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <motion.img
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            src={gallery1}
            alt="A pristine living space"
            width={800}
            height={800}
            className="rounded-3xl shadow-soft"
            loading="lazy"
          />
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Our mission</h2>
            <p className="mt-4 text-muted-foreground">
              We believe a clean space changes how you feel, think, and live. That's why we built a service obsessed with three things: people you can trust, products that are safe, and results that make you smile.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {["Background-checked, fully insured cleaners","Eco-friendly, child & pet safe products","100% satisfaction guarantee or we re-clean free"].map((t) => (
                <li key={t} className="flex gap-3"><span className="mt-1 size-2 rounded-full bg-accent" />{t}</li>
              ))}
            </ul>
            <Link to="/book" className="mt-8 inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold gradient-hero text-primary-foreground shadow-soft hover:shadow-glow transition-shadow">
              Book your clean <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </Section>

      <Section className="bg-secondary/40" eyebrow="By the numbers" title="A track record we're proud of">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl p-6 bg-card border border-border text-center">
              <div className="text-3xl md:text-4xl font-bold text-gradient">
                <Counter value={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="What we stand for" title="Our values">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl p-6 bg-card border border-border hover-lift">
              <div className="size-11 grid place-items-center rounded-xl bg-accent/15 text-accent">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
