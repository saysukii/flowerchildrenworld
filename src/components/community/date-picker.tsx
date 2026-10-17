import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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

export type DatePickerVariant = "menus" | "years" | "fields";

const VARIANTS: { id: DatePickerVariant; label: string }[] = [
  { id: "menus", label: "Menus" },
  { id: "years", label: "Years" },
  { id: "fields", label: "Fields" },
];

function yearsBetween(minYear: number, maxYear: number) {
  const years: number[] = [];
  for (let year = maxYear; year >= minYear; year -= 1) years.push(year);
  return years;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function DatePickerChoices({
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
  onSelect: (date: Date, commit?: boolean) => void;
  minYear: number;
  maxYear: number;
  disableAfter?: Date;
}) {
  const [variant, setVariant] = useState<DatePickerVariant>("menus");
  const [yearOpen, setYearOpen] = useState(false);
  const yearListRef = useRef<HTMLDivElement>(null);
  const years = yearsBetween(minYear, maxYear);

  useEffect(() => {
    if (variant === "menus" && !yearOpen) return;
    const node = yearListRef.current?.querySelector<HTMLElement>("[data-current='true']");
    node?.scrollIntoView({ block: "center" });
  }, [variant, yearOpen, visible]);

  function pickYear(year: number) {
    onVisibleChange(new Date(year, visible.getMonth(), 1));
    setYearOpen(false);
  }

  return (
    <div className="w-full">
      {variant === "menus" ? (
        <MenusPicker
          visible={visible}
          onVisibleChange={onVisibleChange}
          selected={selected}
          onSelect={onSelect}
          years={years}
          yearOpen={yearOpen}
          onYearOpenChange={setYearOpen}
          onPickYear={pickYear}
          yearListRef={yearListRef}
          disableAfter={disableAfter}
          minYear={minYear}
          maxYear={maxYear}
        />
      ) : null}
      {variant === "years" ? (
        <YearsBesidePicker
          visible={visible}
          onVisibleChange={onVisibleChange}
          selected={selected}
          onSelect={onSelect}
          years={years}
          yearListRef={yearListRef}
          disableAfter={disableAfter}
          minYear={minYear}
          maxYear={maxYear}
          onPickYear={pickYear}
        />
      ) : null}
      {variant === "fields" ? (
        <FieldsPicker
          visible={visible}
          selected={selected}
          years={years}
          onSelect={onSelect}
          onVisibleChange={onVisibleChange}
          disableAfter={disableAfter}
        />
      ) : null}
      <div className="mt-3 flex gap-1 border-t border-black/5 pt-2">
        {VARIANTS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setVariant(item.id);
              setYearOpen(false);
            }}
            className={cn(
              "flex-1 rounded-full px-2 py-1 text-[11px] font-normal",
              variant === item.id ? "bg-[#3AB819]/15 text-[#1f6b12]" : "text-foreground/45 hover:bg-black/5",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MenusPicker({
  visible,
  onVisibleChange,
  selected,
  onSelect,
  years,
  yearOpen,
  onYearOpenChange,
  onPickYear,
  yearListRef,
  disableAfter,
  minYear,
  maxYear,
}: {
  visible: Date;
  onVisibleChange: (next: Date) => void;
  selected?: Date;
  onSelect: (date: Date, commit?: boolean) => void;
  years: number[];
  yearOpen: boolean;
  onYearOpenChange: (open: boolean) => void;
  onPickYear: (year: number) => void;
  yearListRef: React.RefObject<HTMLDivElement | null>;
  disableAfter?: Date;
  minYear: number;
  maxYear: number;
}) {
  return (
    <>
      <div className="mb-2 flex items-center gap-1.5">
        <StepButton label="Previous month" onClick={() => onVisibleChange(new Date(visible.getFullYear(), visible.getMonth() - 1, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </StepButton>
        <label className="relative min-w-0 flex-1">
          <select
            aria-label="Month"
            value={visible.getMonth()}
            onChange={(event) => onVisibleChange(new Date(visible.getFullYear(), Number(event.target.value), 1))}
            className="h-9 w-full appearance-none rounded-full border border-black/10 bg-white pl-3 pr-7 text-sm font-normal"
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/45" />
        </label>
        <button
          type="button"
          aria-label="Year"
          onClick={() => onYearOpenChange(!yearOpen)}
          className="flex h-9 w-[5.5rem] shrink-0 items-center justify-between rounded-full border border-black/10 bg-white px-3 text-sm font-normal"
        >
          {visible.getFullYear()}
          <ChevronDown className="h-3.5 w-3.5 text-foreground/45" />
        </button>
        <StepButton label="Next month" onClick={() => onVisibleChange(new Date(visible.getFullYear(), visible.getMonth() + 1, 1))}>
          <ChevronRight className="h-4 w-4" />
        </StepButton>
      </div>
      {yearOpen ? (
        <YearGrid years={years} current={visible.getFullYear()} onPick={onPickYear} listRef={yearListRef} />
      ) : (
        <DayGrid
          visible={visible}
          onVisibleChange={onVisibleChange}
          selected={selected}
          onSelect={onSelect}
          disableAfter={disableAfter}
          minYear={minYear}
          maxYear={maxYear}
        />
      )}
    </>
  );
}

function YearsBesidePicker({
  visible,
  onVisibleChange,
  selected,
  onSelect,
  years,
  yearListRef,
  disableAfter,
  minYear,
  maxYear,
  onPickYear,
}: {
  visible: Date;
  onVisibleChange: (next: Date) => void;
  selected?: Date;
  onSelect: (date: Date, commit?: boolean) => void;
  years: number[];
  yearListRef: React.RefObject<HTMLDivElement | null>;
  disableAfter?: Date;
  minYear: number;
  maxYear: number;
  onPickYear: (year: number) => void;
}) {
  return (
    <div className="flex gap-2">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center justify-between gap-1">
          <StepButton label="Previous month" onClick={() => onVisibleChange(new Date(visible.getFullYear(), visible.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </StepButton>
          <p className="text-sm font-normal">{MONTHS[visible.getMonth()]}</p>
          <StepButton label="Next month" onClick={() => onVisibleChange(new Date(visible.getFullYear(), visible.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </StepButton>
        </div>
        <DayGrid
          visible={visible}
          onVisibleChange={onVisibleChange}
          selected={selected}
          onSelect={onSelect}
          disableAfter={disableAfter}
          minYear={minYear}
          maxYear={maxYear}
        />
      </div>
      <YearGrid years={years} current={visible.getFullYear()} onPick={onPickYear} listRef={yearListRef} tall />
    </div>
  );
}

function FieldsPicker({
  visible,
  selected,
  years,
  onSelect,
  onVisibleChange,
  disableAfter,
}: {
  visible: Date;
  selected?: Date;
  years: number[];
  onSelect: (date: Date, commit?: boolean) => void;
  onVisibleChange: (next: Date) => void;
  disableAfter?: Date;
}) {
  const yearColRef = useRef<HTMLDivElement>(null);
  const year = selected?.getFullYear() ?? visible.getFullYear();
  const month = selected?.getMonth() ?? visible.getMonth();
  const day = selected?.getDate() ?? 1;
  const count = daysInMonth(year, month);

  useEffect(() => {
    yearColRef.current?.querySelector<HTMLElement>("[data-current='true']")?.scrollIntoView({ block: "center" });
  }, []);

  function choose(nextYear: number, nextMonth: number, nextDay: number, commit: boolean) {
    const clampedDay = Math.min(nextDay, daysInMonth(nextYear, nextMonth));
    const date = new Date(nextYear, nextMonth, clampedDay);
    if (disableAfter && date > disableAfter) return;
    onVisibleChange(new Date(nextYear, nextMonth, 1));
    onSelect(date, commit);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <ScrollColumn label="Month">
        {MONTHS.map((name, index) => (
          <Choice key={name} current={index === month} onClick={() => choose(year, index, day, false)}>
            {name.slice(0, 3)}
          </Choice>
        ))}
      </ScrollColumn>
      <ScrollColumn label="Day">
        {Array.from({ length: count }, (_, index) => index + 1).map((value) => (
          <Choice key={value} current={value === day} onClick={() => choose(year, month, value, true)}>
            {value}
          </Choice>
        ))}
      </ScrollColumn>
      <ScrollColumn label="Year" listRef={yearColRef}>
        {years.map((value) => (
          <Choice key={value} current={value === year} onClick={() => choose(value, month, day, false)}>
            {value}
          </Choice>
        ))}
      </ScrollColumn>
    </div>
  );
}

function DayGrid({
  visible,
  onVisibleChange,
  selected,
  onSelect,
  disableAfter,
  minYear,
  maxYear,
}: {
  visible: Date;
  onVisibleChange: (next: Date) => void;
  selected?: Date;
  onSelect: (date: Date, commit?: boolean) => void;
  disableAfter?: Date;
  minYear: number;
  maxYear: number;
}) {
  return (
    <Calendar
      mode="single"
      month={visible}
      onMonthChange={onVisibleChange}
      hideNavigation
      startMonth={new Date(minYear, 0)}
      endMonth={new Date(maxYear, 11)}
      selected={selected}
      disabled={disableAfter ? { after: disableAfter } : undefined}
      className="w-full bg-transparent p-0 [--cell-size:2.25rem]"
      classNames={{
        root: "w-full",
        months: "w-full",
        month: "w-full gap-2",
        month_caption: "hidden",
        nav: "hidden",
        weekday: "flex-1 text-center text-[0.7rem] font-normal text-foreground/45",
      }}
      onSelect={(date) => {
        if (!date) return;
        onSelect(date);
      }}
    />
  );
}

function YearGrid({
  years,
  current,
  onPick,
  listRef,
  tall = false,
}: {
  years: number[];
  current: number;
  onPick: (year: number) => void;
  listRef: React.RefObject<HTMLDivElement | null>;
  tall?: boolean;
}) {
  return (
    <div
      ref={listRef}
      className={cn(
        "overflow-y-auto rounded-2xl border border-black/5 p-1",
        tall ? "max-h-64 w-[4.5rem] shrink-0" : "grid max-h-52 grid-cols-4 gap-1",
      )}
    >
      {years.map((year) => (
        <button
          key={year}
          type="button"
          data-current={year === current ? "true" : undefined}
          onClick={() => onPick(year)}
          className={cn(
            "rounded-full px-2 py-1.5 text-sm font-normal",
            tall && "block w-full",
            year === current ? "bg-[#3AB819] text-white" : "hover:bg-black/5",
          )}
        >
          {year}
        </button>
      ))}
    </div>
  );
}

function ScrollColumn({
  label,
  children,
  listRef,
}: {
  label: string;
  children: React.ReactNode;
  listRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div>
      <p className="mb-1 text-center text-[10px] font-normal text-foreground/45">{label}</p>
      <div ref={listRef} className="max-h-52 space-y-0.5 overflow-y-auto rounded-2xl border border-black/5 p-1">
        {children}
      </div>
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
        "block w-full rounded-full px-2 py-1.5 text-sm font-normal",
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
