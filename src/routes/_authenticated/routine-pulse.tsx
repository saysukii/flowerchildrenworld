import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DAYS,
  DEFAULT_RITUALS,
  type DayKey,
  type Ritual,
  loadRituals,
  ritualForDay,
  saveRituals,
} from "@/lib/routine-pulse";

export const Route = createFileRoute("/_authenticated/routine-pulse")({
  head: () => ({
    meta: [
      { title: "Routine Pulse — Flower Children World" },
      { name: "description", content: "Manage your weekly ritual reminders." },
    ],
  }),
  component: RoutinePulsePage,
});

type FormState = {
  day: DayKey;
  prompt: string;
  active: boolean;
};

function RoutinePulsePage() {
  const [rituals, setRituals] = useState<Ritual[]>(DEFAULT_RITUALS);
  const [ready, setReady] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ day: "mon", prompt: "", active: true });

  useEffect(() => {
    setRituals(loadRituals());
    setReady(true);
  }, []);

  const persist = useCallback((next: Ritual[]) => {
    setRituals(next);
    saveRituals(next);
  }, []);

  function openAdd() {
    const taken = new Set(rituals.map((r) => r.day));
    const firstFree = DAYS.find((d) => !taken.has(d.key))?.key ?? "mon";
    setEditingId(null);
    setForm({ day: firstFree, prompt: "", active: true });
    setDialogOpen(true);
  }

  function openEdit(ritual: Ritual) {
    setEditingId(ritual.id);
    setForm({ day: ritual.day, prompt: ritual.prompt, active: ritual.active });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.prompt.trim()) return;
    const payload = {
      day: form.day,
      prompt: form.prompt.trim(),
      active: form.active,
    };
    if (editingId) {
      persist(rituals.map((r) => (r.id === editingId ? { ...r, ...payload } : r)));
    } else {
      const existing = ritualForDay(rituals, form.day);
      if (existing) {
        persist(rituals.map((r) => (r.id === existing.id ? { ...r, ...payload } : r)));
      } else {
        persist([...rituals, { id: crypto.randomUUID(), ...payload }]);
      }
    }
    setDialogOpen(false);
  }

  function handleDelete(id: string) {
    persist(rituals.filter((r) => r.id !== id));
  }

  function toggleActive(id: string, active: boolean) {
    persist(rituals.map((r) => (r.id === id ? { ...r, active } : r)));
  }

  const takenDays = new Set(
    rituals.filter((r) => r.id !== editingId).map((r) => r.day),
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl text-[#020202]" style={{ background: "#FCFCFC" }}>
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="font-label text-[11px] text-foreground/50">Routine Pulse</span>
            <h1 className="mt-2 text-2xl font-normal leading-tight sm:text-3xl">Your weekly rituals</h1>
            <p className="mt-2 text-sm text-foreground/60">
              Day-of-week reminders that show up on your dashboard every morning.
            </p>
          </div>
          <Button
            type="button"
            onClick={openAdd}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full px-4 py-2.5 text-sm font-normal text-white hover:opacity-90"
            style={{ background: "#3AB819" }}
          >
            <Plus className="h-4 w-4" />
            Add ritual
          </Button>
        </header>

        <div className="space-y-6">
          {DAYS.map(({ key, short }) => {
            const ritual = ready ? ritualForDay(rituals, key) : DEFAULT_RITUALS.find((r) => r.day === key);
            return (
              <section key={key}>
                <h2 className="font-label mb-3 text-[11px] text-foreground/50">{short}</h2>
                {ritual ? (
                  <div className="rounded-2xl border border-black/5 bg-white px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-label text-[11px] text-foreground/50">{short}</p>
                        <p className="mt-1 text-sm font-light leading-relaxed">{ritual.prompt}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={ritual.active}
                            onCheckedChange={(checked) => toggleActive(ritual.id, checked)}
                            className="data-[state=checked]:bg-[#3AB819]"
                            aria-label={ritual.active ? "Deactivate ritual" : "Activate ritual"}
                          />
                          <span className="text-xs text-foreground/50">
                            {ritual.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openEdit(ritual)}
                          className="rounded-md p-2 text-foreground/60 hover:bg-black/5 hover:text-foreground"
                          aria-label="Edit ritual"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ritual.id)}
                          className="rounded-md p-2 text-foreground/60 hover:bg-black/5 hover:text-foreground"
                          aria-label="Delete ritual"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-black/10 bg-white/50 px-4 py-4 text-sm text-foreground/40">
                    No ritual set
                  </p>
                )}
              </section>
            );
          })}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-normal">
                {editingId ? "Edit ritual" : "Add ritual"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="ritual-day">Day of week</Label>
                <Select
                  value={form.day}
                  onValueChange={(v) => setForm((f) => ({ ...f, day: v as DayKey }))}
                >
                  <SelectTrigger id="ritual-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d.key} value={d.key} disabled={takenDays.has(d.key)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ritual-prompt">Prompt text</Label>
                <Input
                  id="ritual-prompt"
                  value={form.prompt}
                  onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                  placeholder="What should you focus on this day?"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="ritual-active"
                  checked={form.active}
                  onCheckedChange={(active) => setForm((f) => ({ ...f, active }))}
                  className="data-[state=checked]:bg-[#3AB819]"
                />
                <Label htmlFor="ritual-active" className="font-normal">
                  Active
                </Label>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!form.prompt.trim()}
                className="text-white hover:opacity-90"
                style={{ background: "#3AB819" }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
