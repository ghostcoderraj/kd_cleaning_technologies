import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export type ServiceIconItem = {
  id: string;
  title: string;
  slug: string;
  image_url: string | null;
};

export function ServiceIconGrid({ items }: { items: ServiceIconItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
      {items.map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: (i % 10) * 0.03 }}
        >
          <Link
            to="/services/$slug"
            params={{ slug: s.slug }}
            className="group relative flex flex-col items-center text-center p-3 md:p-4 rounded-2xl bg-white dark:bg-card border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all h-full"
          >
            <div className="w-full aspect-square rounded-xl bg-white dark:bg-card grid place-items-center overflow-hidden mb-2">
              {s.image_url ? (
                <img
                  src={s.image_url}
                  alt={s.title}
                  loading="lazy"
                  className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <Sparkles className="size-8 text-primary" />
              )}
            </div>
            <div className="text-[11px] md:text-xs font-bold leading-tight text-foreground line-clamp-2">
              {s.title}
            </div>
            <ArrowRight className="size-3.5 mt-2 self-end text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
