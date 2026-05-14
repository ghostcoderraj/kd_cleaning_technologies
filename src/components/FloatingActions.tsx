import { useEffect, useState } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";

export function FloatingActions() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
      {show && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
          className="size-12 grid place-items-center rounded-full glass shadow-soft hover:scale-105 transition-transform animate-fade-in"
        >
          <ArrowUp className="size-5" />
        </button>
      )}
      <a
        href="https://wa.me/15550107788"
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        className="size-14 grid place-items-center rounded-full text-white shadow-emerald animate-pulse-glow hover:scale-105 transition-transform"
        style={{ background: "linear-gradient(135deg, #25d366, #128c7e)" }}
      >
        <MessageCircle className="size-6" />
      </a>
    </div>
  );
}
