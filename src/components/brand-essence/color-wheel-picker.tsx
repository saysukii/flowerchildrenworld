import { useCallback, useEffect, useRef, useState } from "react";
import {
  hexToHsl,
  hexToSlPoint,
  slPointToHex,
  pointToHue,
  type Hsl,
} from "@/lib/color-utils";
import { normalizeHex } from "@/lib/brand-colors";
import { cn } from "@/lib/utils";

const WHEEL_SIZES = {
  default: 208,
  compact: 168,
  mini: 128,
} as const;

const FIELD_SIZES = {
  default: { width: 240, slHeight: 148, hueHeight: 12 },
  compact: { width: 208, slHeight: 128, hueHeight: 10 },
  mini: { width: 234, slHeight: 112, hueHeight: 10 },
} as const;

type DragTarget = "hue" | "sl" | null;
type PickerVariant = "wheel" | "field";
type PickerSize = keyof typeof WHEEL_SIZES;

type ColorWheelPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  onLiveChange?: (hex: string) => void;
  commitOnRelease?: boolean;
  variant?: PickerVariant;
  className?: string;
  size?: PickerSize;
  showValues?: boolean;
};

export function ColorWheelPicker({
  value,
  onChange,
  onLiveChange,
  commitOnRelease = false,
  variant = "wheel",
  className,
  size = "default",
  showValues = true,
}: ColorWheelPickerProps) {
  if (variant === "field") {
    return (
      <ColorFieldPicker
        value={value}
        onChange={onChange}
        onLiveChange={onLiveChange}
        commitOnRelease={commitOnRelease}
        className={className}
        size={size}
        showValues={showValues}
      />
    );
  }

  return (
    <ColorWheelPickerInner
      value={value}
      onChange={onChange}
      onLiveChange={onLiveChange}
      commitOnRelease={commitOnRelease}
      className={className}
      size={size}
      showValues={showValues}
    />
  );
}

function useColorDrag({
  value,
  onChange,
  onLiveChange,
  commitOnRelease,
  slWidth,
  slHeight,
  paintVisual,
  pointerToHex,
}: {
  value: string;
  onChange: (hex: string) => void;
  onLiveChange?: (hex: string) => void;
  commitOnRelease: boolean;
  slWidth: number;
  slHeight: number;
  paintVisual: (hex: string, hue: number, slX: number, slY: number) => void;
  pointerToHex: (
    dragHue: number,
    dragSl: { x: number; y: number },
    clientX: number,
    clientY: number,
    target: DragTarget,
  ) => { hex: string; hue: number; sl: { x: number; y: number } } | null;
}) {
  const dragRef = useRef<DragTarget>(null);
  const captureRef = useRef<HTMLElement | null>(null);
  const dragHueRef = useRef(0);
  const dragSlRef = useRef({ x: 0, y: 0 });
  const pendingHexRef = useRef<string | null>(null);
  const frameRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  const onLiveChangeRef = useRef(onLiveChange);

  const [hsl, setHsl] = useState<Hsl>(() => hexToHsl(value));
  const [displayHex, setDisplayHex] = useState(value);

  onChangeRef.current = onChange;
  onLiveChangeRef.current = onLiveChange;

  const syncFromValue = useCallback(
    (hex: string) => {
      const normalized = normalizeHex(hex);
      const nextHsl = hexToHsl(normalized);
      const sl = hexToSlPoint(normalized, nextHsl.h, slWidth, slHeight);
      dragHueRef.current = nextHsl.h;
      dragSlRef.current = sl;
      setHsl(nextHsl);
      setDisplayHex(normalized);
      paintVisual(normalized, nextHsl.h, sl.x, sl.y);
    },
    [slWidth, slHeight, paintVisual],
  );

  useEffect(() => {
    if (dragRef.current) return;
    syncFromValue(value);
  }, [value, syncFromValue]);

  const flushFrame = useCallback(() => {
    frameRef.current = null;
    const hex = pendingHexRef.current;
    if (!hex) return;
    pendingHexRef.current = null;

    if (commitOnRelease) {
      onLiveChangeRef.current?.(hex);
      return;
    }

    setHsl(hexToHsl(hex));
    setDisplayHex(hex);
    onChangeRef.current(hex);
  }, [commitOnRelease]);

  const scheduleUpdate = useCallback(
    (hex: string) => {
      pendingHexRef.current = hex;
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(flushFrame);
    },
    [flushFrame],
  );

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number, target: DragTarget) => {
      const result = pointerToHex(
        dragHueRef.current,
        dragSlRef.current,
        clientX,
        clientY,
        target,
      );
      if (!result) return;
      dragHueRef.current = result.hue;
      dragSlRef.current = result.sl;
      paintVisual(result.hex, result.hue, result.sl.x, result.sl.y);
      scheduleUpdate(result.hex);
    },
    [paintVisual, pointerToHex, scheduleUpdate],
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!dragRef.current) return;
      e.preventDefault();
      updateFromPointer(e.clientX, e.clientY, dragRef.current);
    }

    function onUp(e: PointerEvent) {
      if (!dragRef.current) return;
      dragRef.current = null;
      captureRef.current?.releasePointerCapture(e.pointerId);
      captureRef.current = null;

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      const hex = pendingHexRef.current;
      pendingHexRef.current = null;

      if (hex) {
        if (commitOnRelease) {
          onLiveChangeRef.current?.(hex);
          onChangeRef.current(hex);
          setHsl(hexToHsl(hex));
          setDisplayHex(hex);
        } else {
          setHsl(hexToHsl(hex));
          setDisplayHex(hex);
          onChangeRef.current(hex);
        }
      }
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [commitOnRelease, updateFromPointer]);

  function startDrag(target: DragTarget) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = target;
      captureRef.current = e.currentTarget as HTMLElement;
      captureRef.current.setPointerCapture(e.pointerId);
      updateFromPointer(e.clientX, e.clientY, target);
    };
  }

  const slPoint = hexToSlPoint(displayHex, hsl.h, slWidth, slHeight);

  return { hsl, displayHex, slPoint, startDrag };
}

function ColorFieldPicker({
  value,
  onChange,
  onLiveChange,
  commitOnRelease = false,
  className,
  size = "mini",
  showValues = false,
}: Omit<ColorWheelPickerProps, "variant">) {
  const dims = FIELD_SIZES[size];
  const slAreaRef = useRef<HTMLDivElement>(null);
  const hueBarRef = useRef<HTMLDivElement>(null);
  const slHandleRef = useRef<HTMLSpanElement>(null);
  const hueHandleRef = useRef<HTMLSpanElement>(null);

  const paintVisual = useCallback(
    (hex: string, hue: number, slX: number, slY: number) => {
      if (slAreaRef.current) {
        slAreaRef.current.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
      }
      if (slHandleRef.current) {
        slHandleRef.current.style.left = `${slX}px`;
        slHandleRef.current.style.top = `${slY}px`;
        slHandleRef.current.style.backgroundColor = hex;
      }
      if (hueHandleRef.current && hueBarRef.current) {
        const pct = hue / 360;
        hueHandleRef.current.style.left = `${pct * hueBarRef.current.offsetWidth}px`;
        hueHandleRef.current.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
      }
    },
    [],
  );

  const pointerToHex = useCallback(
    (
      dragHue: number,
      dragSl: { x: number; y: number },
      clientX: number,
      clientY: number,
      target: DragTarget,
    ) => {
      if (target === "hue") {
        const bar = hueBarRef.current;
        if (!bar) return null;
        const rect = bar.getBoundingClientRect();
        const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
        const hue = (x / rect.width) * 360;
        const hex = slPointToHex(hue, dragSl.x, dragSl.y, dims.width, dims.slHeight);
        return { hex, hue, sl: dragSl };
      }

      const sl = slAreaRef.current;
      if (!sl) return null;
      const rect = sl.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const nextSl = { x, y };
      const hex = slPointToHex(dragHue, x, y, dims.width, dims.slHeight);
      return { hex, hue: dragHue, sl: nextSl };
    },
    [dims.slHeight, dims.width],
  );

  const { hsl, displayHex, slPoint, startDrag } = useColorDrag({
    value,
    onChange,
    onLiveChange,
    commitOnRelease,
    slWidth: dims.width,
    slHeight: dims.slHeight,
    paintVisual,
    pointerToHex,
  });

  const huePct = hsl.h / 360;

  return (
    <div className={cn("select-none", className)}>
      <div
        ref={slAreaRef}
        className="relative cursor-crosshair touch-none overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
        style={{
          width: dims.width,
          height: dims.slHeight,
          backgroundColor: `hsl(${hsl.h}, 100%, 50%)`,
          backgroundImage:
            "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
        }}
        onPointerDown={startDrag("sl")}
      >
        <span
          ref={slHandleRef}
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white shadow-[0_1px_4px_rgba(0,0,0,0.28)] will-change-[left,top]"
          style={{
            left: slPoint.x,
            top: slPoint.y,
            backgroundColor: displayHex,
          }}
        />
      </div>

      <div
        ref={hueBarRef}
        className="relative mt-2.5 cursor-crosshair touch-none overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
        style={{
          width: dims.width,
          height: dims.hueHeight,
          background:
            "linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))",
        }}
        onPointerDown={startDrag("hue")}
      >
        <span
          ref={hueHandleRef}
          className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white shadow-[0_1px_4px_rgba(0,0,0,0.28)] will-change-[left]"
          style={{
            left: huePct * dims.width,
            backgroundColor: `hsl(${hsl.h}, 100%, 50%)`,
          }}
        />
      </div>

      {showValues ? (
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-light text-foreground/50">
          <span>H {Math.round(hsl.h)}°</span>
          <span>S {Math.round(hsl.s)}%</span>
          <span>L {Math.round(hsl.l)}%</span>
        </div>
      ) : null}
    </div>
  );
}

function ColorWheelPickerInner({
  value,
  onChange,
  onLiveChange,
  commitOnRelease = false,
  className,
  size = "default",
  showValues = true,
}: Omit<ColorWheelPickerProps, "variant">) {
  const SIZE = WHEEL_SIZES[size];
  const OUTER = SIZE / 2;
  const INNER = Math.round(SIZE * 0.298);
  const SL_SIZE = INNER * 2 - 8;
  const RING_MID = (OUTER + (OUTER - INNER)) / 2;
  const handleSize = size === "mini" ? 10 : size === "compact" ? 12 : 14;
  const hueHandleSize = size === "mini" ? 12 : size === "compact" ? 14 : 16;

  const rootRef = useRef<HTMLDivElement>(null);
  const slAreaRef = useRef<HTMLDivElement>(null);
  const slHandleRef = useRef<HTMLSpanElement>(null);
  const hueHandleRef = useRef<HTMLSpanElement>(null);

  const paintVisual = useCallback(
    (hex: string, hue: number, slX: number, slY: number) => {
      const hueRad = (hue * Math.PI) / 180;
      const hueX = OUTER + Math.cos(hueRad) * RING_MID;
      const hueY = OUTER + Math.sin(hueRad) * RING_MID;

      if (slAreaRef.current) {
        slAreaRef.current.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
      }
      if (slHandleRef.current) {
        slHandleRef.current.style.left = `${slX}px`;
        slHandleRef.current.style.top = `${slY}px`;
        slHandleRef.current.style.backgroundColor = hex;
      }
      if (hueHandleRef.current) {
        hueHandleRef.current.style.left = `${hueX}px`;
        hueHandleRef.current.style.top = `${hueY}px`;
        hueHandleRef.current.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
      }
    },
    [OUTER, RING_MID],
  );

  const pointerToHex = useCallback(
    (
      dragHue: number,
      dragSl: { x: number; y: number },
      clientX: number,
      clientY: number,
      target: DragTarget,
    ) => {
      if (target === "hue") {
        const root = rootRef.current;
        if (!root) return null;
        const rect = root.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const hue = pointToHue(OUTER, OUTER, x, y);
        const hex = slPointToHex(hue, dragSl.x, dragSl.y, SL_SIZE, SL_SIZE);
        return { hex, hue, sl: dragSl };
      }

      const slRect = slAreaRef.current?.getBoundingClientRect();
      if (!slRect) return null;
      const x = clientX - slRect.left;
      const y = clientY - slRect.top;
      const nextSl = { x, y };
      const hex = slPointToHex(dragHue, x, y, SL_SIZE, SL_SIZE);
      return { hex, hue: dragHue, sl: nextSl };
    },
    [OUTER, SL_SIZE],
  );

  const { hsl, displayHex, slPoint, startDrag } = useColorDrag({
    value,
    onChange,
    onLiveChange,
    commitOnRelease,
    slWidth: SL_SIZE,
    slHeight: SL_SIZE,
    paintVisual,
    pointerToHex,
  });

  const hueRad = (hsl.h * Math.PI) / 180;
  const hueHandle = {
    x: OUTER + Math.cos(hueRad) * RING_MID,
    y: OUTER + Math.sin(hueRad) * RING_MID,
  };

  return (
    <div className={cn("select-none", className)}>
      <div
        ref={rootRef}
        className="relative mx-auto touch-none"
        style={{ width: SIZE, height: SIZE }}
        aria-label="Color wheel"
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 90deg, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))",
          }}
        />
        <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,transparent_58%,rgba(255,255,255,0.15)_59%,transparent_60%)]" />
        <div
          className="pointer-events-none absolute rounded-full bg-[#FCFCFC]"
          style={{ inset: INNER }}
        />

        <div
          className="absolute inset-0 z-[1] cursor-crosshair touch-none rounded-full"
          onPointerDown={startDrag("hue")}
          aria-hidden
        />

        <div
          ref={slAreaRef}
          data-sl-area
          className="absolute z-[2] cursor-crosshair touch-none overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
          style={{
            width: SL_SIZE,
            height: SL_SIZE,
            left: OUTER - SL_SIZE / 2,
            top: OUTER - SL_SIZE / 2,
            backgroundColor: `hsl(${hsl.h}, 100%, 50%)`,
            backgroundImage:
              "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
          }}
          onPointerDown={startDrag("sl")}
        >
          <span
            ref={slHandleRef}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)] will-change-[left,top]"
            style={{
              width: handleSize,
              height: handleSize,
              left: slPoint.x,
              top: slPoint.y,
              backgroundColor: displayHex,
            }}
          />
        </div>

        <span
          ref={hueHandleRef}
          className="pointer-events-none absolute z-[3] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)] will-change-[left,top]"
          style={{
            width: hueHandleSize,
            height: hueHandleSize,
            left: hueHandle.x,
            top: hueHandle.y,
            backgroundColor: `hsl(${hsl.h}, 100%, 50%)`,
          }}
        />
      </div>

      {showValues ? (
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-light text-foreground/50">
          <span>H {Math.round(hsl.h)}°</span>
          <span>S {Math.round(hsl.s)}%</span>
          <span>L {Math.round(hsl.l)}%</span>
        </div>
      ) : null}
    </div>
  );
}
