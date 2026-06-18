import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_CALM, loadBrandCalm, saveBrandCalm, type CalmItem } from "@/lib/brand-calm";
import { DEFAULT_MISSION, loadBrandMission, saveBrandMission } from "@/lib/brand-mission";
import { cn } from "@/lib/utils";

const textareaCls =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-light leading-relaxed text-foreground/80 placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none resize-y min-h-[120px]";

const inputCls =
  "rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm font-light placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none";

export function MissionCard({ admin }: { admin: boolean }) {
  const [mission, setMission] = useState(DEFAULT_MISSION);
  const [calm, setCalm] = useState<CalmItem[]>(DEFAULT_CALM);
  const [editing, setEditing] = useState(false);
  const [missionDraft, setMissionDraft] = useState(DEFAULT_MISSION);
  const [calmDraft, setCalmDraft] = useState<CalmItem[]>(DEFAULT_CALM);

  useEffect(() => {
    const savedMission = loadBrandMission();
    const savedCalm = loadBrandCalm();
    setMission(savedMission);
    setCalm(savedCalm);
    setMissionDraft(savedMission);
    setCalmDraft(savedCalm);
  }, []);

  function startEditing() {
    setMissionDraft(mission);
    setCalmDraft(calm.map((item) => ({ ...item })));
    setEditing(true);
  }

  function cancelEditing() {
    setMissionDraft(mission);
    setCalmDraft(calm.map((item) => ({ ...item })));
    setEditing(false);
  }

  function save() {
    const nextMission = missionDraft.trim() || DEFAULT_MISSION;
    const nextCalm = calmDraft.map((item, index) => ({
      letter: (item.letter || DEFAULT_CALM[index]!.letter).trim().slice(0, 1).toUpperCase(),
      word: (item.word || DEFAULT_CALM[index]!.word).trim() || DEFAULT_CALM[index]!.word,
    }));

    setMission(nextMission);
    setCalm(nextCalm);
    saveBrandMission(nextMission);
    saveBrandCalm(nextCalm);
    setMissionDraft(nextMission);
    setCalmDraft(nextCalm);
    setEditing(false);
    toast.success("Mission updated.");
  }

  function updateCalmDraft(index: number, patch: Partial<CalmItem>) {
    setCalmDraft((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  return (
    <section className="group rounded-3xl border border-black/5 bg-white px-6 py-7 sm:px-7 sm:py-8">
      <div className="mb-5 flex items-start justify-between gap-3">
        <h2 className="text-lg font-normal">Mission</h2>
        {admin && !editing ? (
          <button
            type="button"
            onClick={startEditing}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-light text-foreground/60 transition-all",
              "opacity-100 lg:opacity-0 lg:group-hover:opacity-100 hover:bg-black/5 hover:text-foreground",
            )}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-6">
          <textarea
            className={textareaCls}
            value={missionDraft}
            onChange={(e) => setMissionDraft(e.target.value)}
            autoFocus
            placeholder="Write your mission..."
          />

          <div>
            <span className="font-label text-[11px] text-foreground/50">C.A.L.M.</span>
            <ul className="mt-3 space-y-2.5">
              {calmDraft.map((item, index) => (
                <li key={index} className="grid grid-cols-[1.5rem_1fr] items-center gap-x-3">
                  <input
                    className={cn(inputCls, "w-full min-w-0 px-0 text-center font-normal")}
                    value={item.letter}
                    maxLength={1}
                    onChange={(e) => updateCalmDraft(index, { letter: e.target.value.toUpperCase() })}
                    aria-label={`CALM letter ${index + 1}`}
                  />
                  <input
                    className={cn(inputCls, "w-full min-w-0")}
                    value={item.word}
                    onChange={(e) => updateCalmDraft(index, { word: e.target.value })}
                    placeholder="Word"
                    aria-label={`CALM word ${index + 1}`}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelEditing}
              className="rounded-full px-3 py-1.5 text-xs font-light text-foreground/60 hover:bg-black/5 hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-full px-3 py-1.5 text-xs font-normal text-white hover:opacity-90"
              style={{ background: "#3AB819" }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-light leading-relaxed text-foreground/80">{mission}</p>

          <div className="mt-6">
            <span className="font-label text-[11px] text-foreground/50">C.A.L.M.</span>
            <ul className="mt-3 space-y-2">
              {calm.map((c, index) => (
                <li key={`${c.letter}-${index}`} className="grid grid-cols-[1.5rem_1fr] items-baseline gap-x-3">
                  <span
                    className="text-lg font-normal text-center"
                    style={{ color: "#3AB819" }}
                  >
                    {c.letter}
                  </span>
                  <span className="text-sm font-light text-foreground/80">{c.word}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
