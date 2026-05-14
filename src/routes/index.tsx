import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Star, ShieldCheck, Users, Clock, Loader2, Phone, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-cleaning.jpg";
import cleaningModern from "@/assets/cleaning-modern.jpg";
import gallery1 from "@/assets/gallery-1.jpg";
import gallery2 from "@/assets/gallery-2.jpg";
import gallery3 from "@/assets/gallery-3.jpg";
import gallery4 from "@/assets/gallery-4.jpg";
import { Section } from "@/components/Section";
import { ServiceIconGrid } from "@/components/ServiceIconGrid";
import { Counter } from "@/components/Counter";
import { features, stats, reviews, faqs } from "@/lib/site-data";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KD Cleaning Technologies — Premium Cleaning for Homes & Offices" },
      { name: "description", content: "Trusted, eco-friendly cleaning by trained professionals. Same-day service, transparent pricing, satisfaction guaranteed." },
      { property: "og:title", content: "KD Cleaning Technologies — Premium Cleaning" },
      { property: "og:description", content: "Book vetted, eco-friendly cleaners in 60 seconds." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <ServicesPreview />
      <MoreServices />
      <WhyUs />
      <ShowcaseSection />
      <StatsSection />
      <GallerySection />
      <ReviewsPreview />
      <FaqSection />
      <CtaBanner />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 gradient-glow pointer-events-none" />
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-20 md:pt-20 md:pb-28 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/20">
            <Sparkles className="size-3.5" /> Eco-friendly • Vetted pros
          </span>
          <h1 className="mt-5 text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            Professional Cleaning for{" "}
            <span className="text-gradient">Homes & Offices</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-xl">
            Trusted, affordable, and eco-friendly cleaning solutions delivered by trained professionals.
            Book in 60 seconds — sparkle the same day.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/book"
              className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-semibold gradient-hero text-primary-foreground shadow-soft hover:shadow-glow transition-all"
            >
              Book Now <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-semibold glass-card hover:bg-secondary transition-colors"
            >
              Get Free Quote
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
            {[
              { icon: Users, label: "1000+ Happy Customers" },
              { icon: Clock, label: "24/7 Support" },
              { icon: ShieldCheck, label: "Verified Staff" },
            ].map((b) => (
              <div key={b.label} className="glass-card rounded-2xl p-3 text-center">
                <b.icon className="size-5 mx-auto text-primary" />
                <p className="mt-2 text-xs font-medium text-muted-foreground">{b.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="relative"
        >
          <div className="absolute -inset-8 gradient-hero opacity-20 blur-3xl rounded-full" />
          <div className="relative glass-card rounded-3xl p-6 shadow-soft animate-float">
            <img
              src={heroImg}
              alt="Professional KD Cleaning Technologies cleaner"
              width={1280}
              height={1024}
              className="w-full h-auto rounded-2xl"
            />
          </div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="absolute -left-4 bottom-10 glass-card rounded-2xl p-4 shadow-soft hidden md:flex items-center gap-3"
          >
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-4 fill-accent text-accent" />
              ))}
            </div>
            <div className="text-sm">
              <div className="font-semibold">4.9 / 5</div>
              <div className="text-xs text-muted-foreground">From 1,200+ reviews</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function TrustBar() {
  const logos = ["Acme Co.", "Globex", "Stark Inc.", "Initech", "Umbrella", "Hooli"];
  return (
    <div className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Trusted by teams at</span>
        {logos.map((l) => (
          <span key={l} className="font-display font-bold text-muted-foreground/70 hover:text-foreground transition-colors">{l}</span>
        ))}
      </div>
    </div>
  );
}

const POPULAR_SLUGS = new Set(["deep-clean", "standard-home", "bathroom-deep"]);

function ServicesPreview() {
  const { data: items, isLoading } = useQuery({
    queryKey: ["services-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, title, slug, description, image_url, price, original_price, duration, phone, whatsapp")
        .eq("is_active", true)
        .order("display_order")
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const fmt = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

  return (
    <Section
      eyebrow="What we clean"
      title={<>Services tailored to <span className="text-gradient">every space</span></>}
      subtitle="From a quick refresh to a full deep clean, our trained pros handle it all with care."
    >
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {items?.map((s, i) => {
            const save = s.original_price && Number(s.original_price) > Number(s.price)
              ? Number(s.original_price) - Number(s.price)
              : 0;
            const popular = POPULAR_SLUGS.has(s.slug);
            const phone = s.phone || "";
            const wa = s.whatsapp || phone;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group relative rounded-2xl bg-card border border-border hover-lift overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[16/11] overflow-hidden bg-muted">
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full grid place-items-center gradient-hero">
                      <Sparkles className="size-10 text-primary-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
                  {popular && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-foreground shadow-soft">
                      🔥 Popular
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-4 text-center">
                    <h3 className="font-display font-bold text-lg md:text-xl text-white uppercase leading-tight drop-shadow">
                      {s.title}
                    </h3>
                    {s.duration && (
                      <span className="mt-2 inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-accent text-accent-foreground">
                        {s.duration}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-3 flex-1">
                  {s.duration && (
                    <div className="text-xs font-semibold text-accent uppercase tracking-wide">
                      {s.duration}
                    </div>
                  )}
                  <div className="font-semibold text-base leading-snug">{s.title}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {s.original_price && Number(s.original_price) > Number(s.price) && (
                      <span className="text-sm text-muted-foreground line-through">{fmt(Number(s.original_price))}</span>
                    )}
                    {save > 0 && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        SAVE {fmt(save)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(Number(s.price))}</span>
                    <span className="text-xs text-muted-foreground">/visit</span>
                  </div>
                  <div className="mt-auto flex items-center gap-2">
                    <Link
                      to="/services/$slug"
                      params={{ slug: s.slug }}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-full px-3 py-2.5 text-sm font-semibold bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
                    >
                      View Package
                    </Link>
                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        aria-label={`Call about ${s.title}`}
                        className="size-10 grid place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        <Phone className="size-4" />
                      </a>
                    )}
                    {wa && (
                      <a
                        href={`https://wa.me/${wa.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`WhatsApp about ${s.title}`}
                        className="size-10 grid place-items-center rounded-full bg-emerald-500 text-white hover:opacity-90 transition-opacity"
                      >
                        <MessageCircle className="size-4" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      <div className="mt-8 text-center">
        <Link to="/services" className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold glass-card hover:bg-secondary transition-colors">
          View all services <ArrowRight className="size-4" />
        </Link>
      </div>
    </Section>
  );
}

function MoreServices() {
  const { data: items, isLoading } = useQuery({
    queryKey: ["services-more"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, title, slug, image_url")
        .eq("is_active", true)
        .order("display_order")
        .range(5, 28);
      if (error) throw error;
      return data;
    },
  });

  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <Section
      className="bg-secondary/30"
      eyebrow="Explore more"
      title={<>More ways to keep your <span className="text-gradient">home clean</span></>}
      subtitle="Specialised add-ons and quick-fix services for every corner of your space."
    >
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-primary" /></div>
      ) : (
        <ServiceIconGrid items={items ?? []} />
      )}
    </Section>
  );
}

function WhyUs() {
  return (
    <Section
      className="bg-secondary/40"
      eyebrow="Why KD Cleaning Technologies"
      title={<>Premium quality, <span className="text-gradient">every visit</span></>}
      subtitle="We obsess over the details so you don't have to."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="rounded-2xl p-6 glass-card hover-lift"
          >
            <div className="size-11 grid place-items-center rounded-xl bg-accent/15 text-accent">
              <f.icon className="size-5" />
            </div>
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

function ShowcaseSection() {
  return (
    <Section>
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          <div className="absolute -inset-6 gradient-hero opacity-20 blur-3xl rounded-full" />
          <div className="relative glass-card rounded-3xl p-3 shadow-soft">
            <img
              src={cleaningModern}
              alt="KD Cleaning Technologies professional wiping a modern kitchen counter"
              loading="lazy"
              width={1280}
              height={896}
              className="w-full h-auto rounded-2xl"
            />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/20">
            <Sparkles className="size-3.5" /> The KD Cleaning Technologies standard
          </span>
          <h2 className="mt-5 text-3xl md:text-5xl font-bold tracking-tight">
            Real pros. Real <span className="text-gradient">sparkle</span>.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every visit is handled by a uniformed, background-checked specialist using premium eco-friendly products and a proven 50-point checklist.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {["Trained, uniformed, insured professionals","Hospital-grade, plant-based products","Detailed 50-point quality checklist"].map((t) => (
              <li key={t} className="flex gap-3"><span className="mt-1 size-2 rounded-full bg-accent" />{t}</li>
            ))}
          </ul>
          <Link to="/book" className="mt-8 inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-semibold gradient-hero text-primary-foreground shadow-soft hover:shadow-glow transition-all">
            Book your clean <ArrowRight className="size-4" />
          </Link>
        </motion.div>
      </div>
    </Section>
  );
}

function StatsSection() {
  return (
    <Section>
      <div className="rounded-3xl gradient-hero text-primary-foreground p-10 md:p-14 shadow-soft relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 20% 20%, white, transparent 40%)" }} />
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-4xl md:text-5xl font-bold">
                <Counter value={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-2 text-sm opacity-90">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function GallerySection() {
  const imgs = [gallery1, gallery2, gallery3, gallery4];
  return (
    <Section
      eyebrow="Our work"
      title={<>Spaces we made <span className="text-gradient">sparkle</span></>}
      subtitle="A peek at the homes and offices we love bringing back to life."
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {imgs.map((src, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="relative overflow-hidden rounded-2xl aspect-square group cursor-pointer"
          >
            <img src={src} alt="" loading="lazy" width={800} height={800} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

function ReviewsPreview() {
  return (
    <Section
      className="bg-secondary/40"
      eyebrow="Loved by clients"
      title={<>What people are <span className="text-gradient">saying</span></>}
    >
      <div className="grid md:grid-cols-3 gap-5">
        {reviews.slice(0, 3).map((r, i) => (
          <motion.div
            key={r.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="rounded-2xl p-6 bg-card border border-border hover-lift"
          >
            <div className="flex">{[...Array(r.rating)].map((_, i) => <Star key={i} className="size-4 fill-accent text-accent" />)}</div>
            <p className="mt-4 text-sm leading-relaxed">"{r.text}"</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="size-10 rounded-full gradient-hero text-primary-foreground grid place-items-center font-semibold">
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
      <div className="mt-8 text-center">
        <Link to="/reviews" className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold glass-card hover:bg-secondary transition-colors">
          See all reviews <ArrowRight className="size-4" />
        </Link>
      </div>
    </Section>
  );
}

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section
      eyebrow="FAQ"
      title="Questions, answered"
    >
      <div className="max-w-3xl mx-auto space-y-3">
        {faqs.map((f, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left font-semibold"
            >
              {f.q}
              <ChevronDown className={`size-5 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && (
              <div className="px-5 pb-5 text-sm text-muted-foreground animate-fade-in">
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

function CtaBanner() {
  return (
    <Section>
      <div className="rounded-3xl glass-card p-10 md:p-14 text-center relative overflow-hidden">
        <div className="absolute inset-0 gradient-glow" />
        <div className="relative">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Ready for a <span className="text-gradient">sparkling clean</span>?
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Book in 60 seconds. No commitments, no hidden fees, 100% satisfaction guaranteed.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/book" className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-semibold gradient-hero text-primary-foreground shadow-soft hover:shadow-glow transition-shadow">
              Book Now <ArrowRight className="size-4" />
            </Link>
            <Link to="/pricing" className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-semibold border border-border hover:bg-secondary transition-colors">
              See Pricing
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
