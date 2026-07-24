import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PublicFormLayout,
  Field,
  fieldInputCls,
  SubmitButton,
} from "@/components/public-form-layout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/donate")({
  head: () => ({
    meta: [
      { title: "Donate — Flower Children World" },
      {
        name: "description",
        content:
          "Plant a seed for Flower Children World. Your gift supports community programs, arts, and mindfulness for children.",
      },
    ],
  }),
  component: DonatePage,
});

const PRESETS = [10, 25, 50, 100] as const;
const GREEN = "#3AB819";

function DonatePage() {
  const [frequency, setFrequency] = useState<"monthly" | "one-time">("monthly");
  const [preset, setPreset] = useState<number | null>(25);
  const [customAmount, setCustomAmount] = useState("");
  const [customOn, setCustomOn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedAmount = (() => {
    if (customOn) {
      const n = parseInt(customAmount.replace(/\D/g, ""), 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    return preset;
  })();

  function selectPreset(amount: number) {
    setCustomOn(false);
    setCustomAmount("");
    setPreset(amount);
    setError("");
  }

  function onCustomFocus() {
    setCustomOn(true);
    setPreset(null);
    setError("");
  }

  function onCustomInput(value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setCustomAmount("");
      return;
    }
    setCustomAmount(parseInt(digits, 10).toLocaleString("en-US"));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!selectedAmount) {
      setError("Please choose or enter a donation amount.");
      return;
    }

    const data = new FormData(e.currentTarget);
    const first_name = String(data.get("first_name") ?? "").trim();
    const last_name = String(data.get("last_name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();

    if (!first_name || !last_name || !email) {
      setError("Please fill in your name and email.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${window.location.origin}/api/donations/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedAmount,
          frequency,
          first_name,
          last_name,
          email,
        }),
      });

      let payload: { url?: string; error?: string } = {};
      try {
        payload = (await res.json()) as { url?: string; error?: string };
      } catch {
        payload = {};
      }

      if (res.ok && payload.url) {
        window.location.href = payload.url;
        return;
      }

      setError(
        payload.error === "Donations are not configured yet"
          ? "Donations are not available right now. Please try again later."
          : (payload.error ?? "Could not start checkout. Please try again."),
      );
    } catch {
      setError("Could not reach the donation service. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const amountSuffix = frequency === "monthly" ? "/ mo" : "once";

  return (
    <PublicFormLayout
      label="Support our mission"
      title="Plant a seed"
      subtitle="Your gift helps Flower Children World grow community, arts, life skills, and mindfulness for kids."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <span className="mb-1.5 block text-xs font-light text-foreground/60">Frequency</span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "monthly", label: "Monthly" },
                { id: "one-time", label: "One-time" },
              ] as const
            ).map((option) => {
              const selected = frequency === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFrequency(option.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-light transition-colors",
                    selected
                      ? "border-[#3AB819] bg-[#3AB819]/10 text-foreground"
                      : "border-black/10 text-foreground/70 hover:bg-black/[0.03]",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-light text-foreground/60">
            {frequency === "monthly" ? "Monthly amount" : "One-time amount"}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((amount) => {
              const selected = !customOn && preset === amount;
              return (
                <button
                  key={amount}
                  type="button"
                  onClick={() => selectPreset(amount)}
                  className={cn(
                    "rounded-xl border px-3 py-4 text-center transition-colors",
                    selected
                      ? "border-[#3AB819] bg-[#3AB819]/10"
                      : "border-black/10 hover:bg-black/[0.03]",
                  )}
                >
                  <span
                    className={cn(
                      "block text-xl font-normal tracking-tight",
                      selected ? "text-foreground" : "text-foreground/80",
                    )}
                    style={selected ? { color: GREEN } : undefined}
                  >
                    ${amount}
                  </span>
                  <span className="mt-1 block text-[11px] font-light text-foreground/50">
                    {amountSuffix}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className={cn(
              "mt-2 flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors",
              customOn ? "border-[#3AB819] ring-1 ring-[#3AB819]" : "border-black/10",
            )}
          >
            <span className="text-sm font-normal text-foreground/70">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={customAmount}
              onFocus={onCustomFocus}
              onChange={(e) => onCustomInput(e.target.value)}
              placeholder="Enter your own amount"
              className="w-full bg-transparent text-base font-light outline-none placeholder:text-foreground/40 md:text-sm"
            />
            <span className="shrink-0 text-[11px] font-light text-foreground/45">{amountSuffix}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name">
            <input required name="first_name" autoComplete="given-name" className={fieldInputCls} />
          </Field>
          <Field label="Last name">
            <input required name="last_name" autoComplete="family-name" className={fieldInputCls} />
          </Field>
        </div>

        <Field label="Email">
          <input required name="email" type="email" autoComplete="email" className={fieldInputCls} />
        </Field>

        <div className="flex items-baseline justify-between rounded-xl border border-black/10 px-4 py-3">
          <span className="text-xs font-light text-foreground/50">
            {frequency === "monthly" ? "Per month" : "One-time gift"}
          </span>
          <span className="text-2xl font-normal tracking-tight">
            {selectedAmount ? `$${selectedAmount.toLocaleString("en-US")}` : "—"}
          </span>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="pt-1">
          <SubmitButton disabled={submitting}>
            {submitting ? "Redirecting…" : "Plant a seed →"}
          </SubmitButton>
        </div>
      </form>
    </PublicFormLayout>
  );
}
