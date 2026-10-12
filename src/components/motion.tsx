import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Soft page entrance — use around page bodies, keyed by route when needed. */
export function PageEnter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setVisible(true);
      return;
    }
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={cn(
        "transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Fade/slide in when scrolled into view. */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      setVisible(true);
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < window.innerHeight) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.18, rootMargin: "0px 0px -4% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const style: CSSProperties = {
    transitionDelay: visible ? `${delayMs}ms` : "0ms",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
