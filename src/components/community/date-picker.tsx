import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type Step = "day" | "year" | "month";

function yearsBetween(minYear: number, maxYear: number) {
  const years: number[] = [];
  for (let year = maxYear; year >= minYear; year -= 1) years.push(year);
  return years;
}

export function DateMenus({
  visible,
  onVisibleChange,
  selected,
  onSelect,
  minYear,
  maxYear,
  disableAfter,
}: {
  visible: Date;
  onVisibleChange: (next: Date) => void;
  selected?: Date;
  onSelect: (date: Date) => void;
  minYear: number;
  maxYear: number;
  disableAfter?: Date;
}) {
  const [step, setStep] = useState<Step>("day");
  const yearListRef = useRef<HTMLDivElement>(null);
  const years = yearsBetween(minYear, maxYear);
  const year = visible.getFullYear();
  const month = visible.getMonth();

  useEffect(() => {
    if (step !== "year") return;
    yearListRef.current?.querySelector<HTMLElement>("[data-current='true']")?.scrollIntoView({ block: "center" });
  }, [step, visible]);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center">
        <StepButton
          label="Previous month"
          onClick={() => {
            onVisibleChange(new Date(year, month - 1, 1));
            setStep("day");
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </StepButton>
        <button
          type="button"
          onClick={() => setStep("year")}
          className="min-w-0 flex-1 text-center text-sm font-normal outline-none"
        >
          {MONTHS[month]} {year}
        </button>
        <StepButton
          label="Next month"
          onClick={() => {
            onVisibleChange(new Date(year, month + 1, 1));
            setStep("day");
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </StepButton>
      </div>
      {step === "year" ? (
        <ChoiceGrid listRef={yearListRef} columns={4} scroll>
          {years.map((value) => (
            <Choice
              key={value}
              current={value === year}
              onClick={() => {
                onVisibleChange(new Date(value, month, 1));
                setStep("month");
              }}
            >
              {value}
            </Choice>
          ))}
        </ChoiceGrid>
      ) : null}
      {step === "month" ? (
        <ChoiceGrid columns={3}>
          {MONTHS.map((name, index) => (
            <Choice
              key={name}
              current={index === month}
              onClick={() => {
                onVisibleChange(new Date(year, index, 1));
                setStep("day");
              }}
            >
              {name.slice(0, 3)}
            </Choice>
          ))}
        </ChoiceGrid>
      ) : null}
      {step === "day" ? (
        <Calendar
          mode="single"
          month={visible}
          onMonthChange={onVisibleChange}
          hideNavigation
          startMonth={new Date(minYear, 0)}
          endMonth={new Date(maxYear, 11)}
          selected={selected}
          disabled={disableAfter ? { after: disableAfter } : undefined}
          className="fcw-date-menus w-full bg-transparent p-0 [--cell-size:2.25rem]"
          classNames={{
            root: "fcw-date-menus w-full",
            months: "flex w-full max-w-none flex-col",
            month: "w-full max-w-none gap-2",
            month_grid: "w-full table-fixed",
            month_caption: "hidden",
            nav: "hidden",
            weekdays: "w-full",
            week: "w-full",
            weekday: "w-[14.2857%] text-center text-[0.7rem] font-normal text-foreground/45",
            day: "w-[14.2857%] p-0 text-center",
          }}
          onSelect={(date) => {
            if (!date) return;
            onSelect(date);
          }}
        />
      ) : null}
    </div>
  );
}

function ChoiceGrid({
  children,
  columns,
  scroll = false,
  listRef,
}: {
  children: React.ReactNode;
  columns: 3 | 4;
  scroll?: boolean;
  listRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={listRef}
      className={cn(
        "grid gap-1 rounded-2xl border border-black/5 p-1",
        columns === 4 ? "grid-cols-4" : "grid-cols-3",
        scroll && "max-h-52 overflow-y-auto",
      )}
    >
      {children}
    </div>
  );
}

function Choice({
  current,
  onClick,
  children,
}: {
  current: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-current={current ? "true" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-full px-2 py-1.5 text-sm font-normal",
        current ? "bg-[#3AB819] text-white" : "hover:bg-black/5",
      )}
    >
      {children}
    </button>
  );
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground/70 hover:bg-black/5"
    >
      {children}
    </button>
  );
}
