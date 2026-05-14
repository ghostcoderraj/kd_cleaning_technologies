import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Twitter, Linkedin, Mail, Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-16 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
            <img src={logo} alt="KD Cleaning Technologies logo" className="size-10 rounded-xl object-contain bg-background" />
            KD Cleaning Technologies
          </Link>
          <p className="mt-4 text-sm text-muted-foreground max-w-xs">
            Premium home and office cleaning services delivered by trained, vetted professionals.
          </p>
          <div className="flex gap-2 mt-5">
            {[Facebook, Instagram, Twitter, Linkedin].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="size-10 grid place-items-center rounded-xl bg-background border border-border hover:text-primary hover:border-primary transition-colors"
                aria-label="social"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-primary">About Us</Link></li>
            <li><Link to="/pricing" className="hover:text-primary">Pricing</Link></li>
            <li><Link to="/reviews" className="hover:text-primary">Reviews</Link></li>
            <li><Link to="/book" className="hover:text-primary">Book a Service</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-4">Services</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/services" className="hover:text-primary">Home Cleaning</Link></li>
            <li><Link to="/services" className="hover:text-primary">Office Cleaning</Link></li>
            <li><Link to="/services" className="hover:text-primary">Deep Cleaning</Link></li>
            <li><Link to="/services" className="hover:text-primary">Move-in / Out</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-4">Stay in touch</h4>
          <p className="text-sm text-muted-foreground mb-3">Get cleaning tips & seasonal offers.</p>
          <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
            <input
              type="email"
              required
              placeholder="you@email.com"
              className="flex-1 rounded-xl bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button className="rounded-xl px-4 py-2 text-sm font-semibold gradient-hero text-primary-foreground">
              Join
            </button>
          </form>
          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Phone className="size-4" /> +31 6 21712992</li>
            <li className="flex items-center gap-2" suppressHydrationWarning>
              <Mail className="size-4" />
              <a href="mailto:kdcleaningbv@gmail.com" className="hover:text-primary">kdcleaningbv@gmail.com</a>
            </li>
            <li className="flex items-center gap-2"><MapPin className="size-4" /> Kwikstraat 3, Oostervaart, 8211 AM Lelystad</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground" suppressHydrationWarning>
        © {new Date().getFullYear()} KD Cleaning Technologies. All rights reserved.
      </div>
    </footer>
  );
}
