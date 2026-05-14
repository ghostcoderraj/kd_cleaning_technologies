import { createFileRoute } from "@tanstack/react-router";
import { PageHero, Section } from "@/components/Section";
import { Mail, Phone, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact KD Cleaning Technologies" },
      { name: "description", content: "Get in touch with the KD Cleaning Technologies team. We respond within minutes during business hours." },
      { property: "og:title", content: "Contact KD Cleaning Technologies" },
      { property: "og:description", content: "We'd love to hear from you." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
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
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's talk clean"
        subtitle="Questions, custom quotes, or partnerships — we'd love to hear from you."
      />
      <Section>
        <div className="grid lg:grid-cols-3 gap-6">
          {[
            { icon: Phone, title: "Call us", val: "+31 6 21712992" },
            { icon: Mail, title: "Email", val: "kdcleaningbv@gmail.com" },
            { icon: MapPin, title: "Visit", val: "Kwikstraat 3, Oostervaart, 8211 AM Lelystad" },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl p-6 glass-card hover-lift">
              <div className="size-11 grid place-items-center rounded-xl gradient-hero text-primary-foreground"><c.icon className="size-5" /></div>
              <h3 className="mt-4 font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.val}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 max-w-2xl mx-auto rounded-3xl p-8 md:p-10 bg-card border border-border shadow-soft">
          {done ? (
            <div className="text-center py-10 animate-fade-in">
              <div className="size-16 mx-auto grid place-items-center rounded-full bg-accent/15 text-accent">
                <CheckCircle2 className="size-8" />
              </div>
              <h3 className="mt-5 text-2xl font-bold">Message sent</h3>
              <p className="mt-2 text-muted-foreground">We'll be in touch shortly.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <label className="block text-sm font-medium">Name<input required className="mt-1.5 w-full rounded-xl bg-background border border-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></label>
                <label className="block text-sm font-medium">Email<input required type="email" className="mt-1.5 w-full rounded-xl bg-background border border-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></label>
              </div>
              <label className="block text-sm font-medium">Subject<input required className="mt-1.5 w-full rounded-xl bg-background border border-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></label>
              <label className="block text-sm font-medium">Message<textarea required rows={5} className="mt-1.5 w-full rounded-xl bg-background border border-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></label>
              <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-semibold gradient-hero text-primary-foreground shadow-soft hover:shadow-glow transition-shadow disabled:opacity-70">
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading ? "Sending..." : "Send message"}
              </button>
            </form>
          )}
        </div>
      </Section>
    </>
  );
}
