import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

type FontEntry = {
  name: string;
  usage: string;
  file: string;
  downloadName: string;
  previewClassName: string;
};

const FONTS: FontEntry[] = [
  {
    name: "Nohemi Regular",
    usage: "Headers",
    file: "/Nohemi-Regular.otf",
    downloadName: "Nohemi-Regular.otf",
    previewClassName: "text-2xl font-normal leading-tight",
  },
  {
    name: "Nohemi Light",
    usage: "Body",
    file: "/Nohemi-Thin.otf",
    downloadName: "Nohemi-Light.otf",
    previewClassName: "text-2xl font-light leading-tight",
  },
  {
    name: "Adigiana Toybox",
    usage: "Labels + playful accents",
    file: "/Adigiana-Toybox.ttf",
    downloadName: "Adigiana-Toybox.ttf",
    previewClassName: "font-label text-xl text-foreground",
  },
];

function downloadFont(file: string, downloadName: string) {
  const anchor = document.createElement("a");
  anchor.href = file;
  anchor.download = downloadName;
  anchor.click();
}

export function TypographyCard() {
  return (
    <section className="rounded-3xl border border-black/5 bg-white px-6 py-7 sm:px-7 sm:py-8">
      <h2 className="mb-5 text-lg font-normal">Typography</h2>
      <div className="space-y-3">
        {FONTS.map((font) => (
          <button
            key={font.file}
            type="button"
            onClick={() => downloadFont(font.file, font.downloadName)}
            className={cn(
              "group w-full rounded-2xl border border-transparent px-3 py-3 text-left transition-colors",
              "hover:border-black/5 hover:bg-[#FCFCFC]",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={font.previewClassName}>{font.name}</p>
                <p className="mt-1 text-xs font-light text-foreground/60">{font.usage}</p>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full border border-black/10 px-2.5 py-1 text-[10px] font-light text-foreground/50 transition-all",
                  "opacity-100 lg:opacity-0 lg:group-hover:opacity-100 group-hover:text-foreground",
                )}
              >
                <Download className="h-3 w-3" />
                Download
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
