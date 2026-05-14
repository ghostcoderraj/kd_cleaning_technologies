import { createFileRoute } from "@tanstack/react-router";
import { PageHero, Section } from "@/components/Section";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { services } from "@/lib/site-data";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book a Cleaning — KD Cleaning Technologies" },
      { name: "description", content: "Book your home or office cleaning in 60 seconds. Choose your service, date, and we'll handle the rest." },
      { property: "og:title", content: "Book KD Cleaning Technologies" },
      { property: "og:description", content: "60-second booking, same-day service." },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setDone(true);
  };

  return (
    <>
      <PageHero
        eyebrow="Book a service"
        title="Schedule your sparkle"
        subtitle="Tell us about your space. A KD Cleaning Technologies specialist will confirm within minutes."
      />
      <Section>
        <div className="max-w-2xl mx-auto rounded-3xl p-8 md:p-10 bg-card border border-border shadow-soft">
          {done ? (
            <div className="text-center py-10 animate-fade-in">
              <div className="size-16 mx-auto grid place-items-center rounded-full bg-accent/15 text-accent">
                <CheckCircle2 className="size-8" />
              </div>
              <h3 className="mt-5 text-2xl font-bold">Booking received!</h3>
              <p className="mt-2 text-muted-foreground">We'll text you a confirmation shortly. Thanks for choosing KD Cleaning Technologies.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Full name"><input required className={inputCls} placeholder="Jane Doe" /></Field>
                <Field label="Phone"><input required type="tel" className={inputCls} placeholder="+31 6 21712992" /></Field>
              </div>
              <Field label="Email"><input required type="email" className={inputCls} placeholder="you@email.com" /></Field>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Service type">
                  <select required className={inputCls}>
                    <option value="">Select a service</option>
                    {services.map((s) => <option key={s.title}>{s.title}</option>)}
                  </select>
                </Field>
                <Field label="Preferred date"><input required type="date" className={inputCls} /></Field>
              </div>
              <Field label="Message (optional)">
                <textarea rows={4} className={inputCls} placeholder="Anything we should know about your space?" />
              </Field>
              <button
                disabled={loading}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-semibold gradient-hero text-primary-foreground shadow-soft hover:shadow-glow transition-shadow disabled:opacity-70"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading ? "Booking..." : "Confirm booking"}
              </button>
            </form>
          )}
        </div>
      </Section>
    </>
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
