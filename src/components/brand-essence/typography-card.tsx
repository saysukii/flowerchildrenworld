import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

type FontEntry = {
  name: string;
  usage: string;
  file: string;
  downloadName: string;
  previewClassName: string;
};

const PREVIEW_SIZE = "text-sm leading-tight sm:text-base md:text-lg";

const FONTS: FontEntry[] = [
  {
    name: "Nohemi Regular",
    usage: "Headers",
    file: "/Nohemi-Regular.otf",
    downloadName: "Nohemi-Regular.otf",
    previewClassName: `${PREVIEW_SIZE} font-normal`,
  },
  {
    name: "Nohemi Light",
    usage: "Body",
    file: "/Nohemi-Thin.otf",
    downloadName: "Nohemi-Light.otf",
    previewClassName: `${PREVIEW_SIZE} font-light`,
  },
  {
    name: "Adigiana Toybox",
    usage: "Labels + playful accents",
    file: "/Adigiana-Toybox.ttf",
    downloadName: "Adigiana-Toybox.ttf",
    previewClassName: `${PREVIEW_SIZE} font-label tracking-[0.1em] text-foreground`,
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
            aria-label={`Download ${font.name}`}
            className={cn(
              "group w-full rounded-2xl border border-transparent px-3 py-3 text-left transition-colors",
              "hover:border-black/5 hover:bg-[#FCFCFC]",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    font.previewClassName,
                    "whitespace-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                  )}
                >
                  {font.name}
                </p>
                <p className="mt-1 text-xs font-light text-foreground/60">{font.usage}</p>
              </div>
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex shrink-0 items-center justify-center rounded-full border border-black/10 p-2 text-foreground/50 transition-all",
                  "opacity-100 lg:opacity-0 lg:group-hover:opacity-100 group-hover:text-foreground",
                )}
              >
                <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
