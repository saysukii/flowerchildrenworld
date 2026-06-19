import type { ReactNode } from "react";
import fcwFullLogo from "@/assets/fcw-full-logo.png.asset.json";

export function PublicFormFooter() {
  return (
    <footer className="px-4 py-6 text-center text-xs font-light text-foreground/50">
      <p>Rooted in nature. Raised in community.</p>
      <p className="mt-1">© 2026 Flower Children World</p>
    </footer>
  );
}

export function PublicFormLayout({
  label,
  title,
  subtitle,
  children,
}: {
  label: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-center px-4 pb-0 pt-4 sm:px-8">
        <img
          src={fcwFullLogo.url}
          alt="Flower Children World"
          className="h-auto w-auto max-w-[140px]"
        />
      </header>

      {/* Main */}
      <main className="flex-1 px-4 pt-0 pb-10 sm:pb-14">
        <div className="mx-auto w-full max-w-xl">
          <div className="text-center mb-8">
            <span className="font-label text-[11px] text-foreground/50">{label}</span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-normal leading-tight">{title}</h1>
            <p className="mt-3 text-sm font-light text-foreground/60">{subtitle}</p>
          </div>

          <section className="rounded-3xl border border-black/5 bg-white px-6 py-7 sm:px-8 sm:py-9">
            {children}
          </section>
        </div>
      </main>

      <PublicFormFooter />
    </div>
  );
}

export const fieldInputCls =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-base font-light placeholder:text-foreground/40 focus:border-[#3AB819] focus:outline-none focus:ring-1 focus:ring-[#3AB819] md:text-sm";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-light text-foreground/60">{label}</span>
      {children}
    </label>
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="w-full rounded-full px-4 py-3 text-sm font-normal text-white transition-opacity hover:opacity-90"
      style={{ background: "#3AB819" }}
    >
      {children}
    </button>
  );
}

export function SuccessState({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <div
        className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full text-2xl"
        style={{ background: "rgba(58,184,25,0.12)" }}
      >
        🌱
      </div>
      <p className="text-base font-light text-foreground/80">{message}</p>
    </div>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AvailabilityPicker() {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-light text-foreground/60">Availability</span>
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((d) => (
          <label
            key={d}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-black/10 px-2.5 py-1.5 text-xs font-light cursor-pointer hover:bg-black/5 has-[:checked]:border-[#3AB819] has-[:checked]:bg-[#3AB819]/10 has-[:checked]:text-foreground"
          >
            <input type="checkbox" className="h-3.5 w-3.5 accent-[#3AB819]" />
            {d}
          </label>
        ))}
      </div>
    </div>
  );
}
