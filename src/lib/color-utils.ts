export type Hsl = { h: number; s: number; l: number };

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function clampHue(h: number) {
  return ((h % 360) + 360) % 360;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function hexToHsl(hex: string): Hsl {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 0, s: 0, l: 50 };

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = ((max + min) / 2) * 100;
  const s = delta === 0 ? 0 : (delta / (1 - Math.abs((2 * l) / 100 - 1))) * 100;

  return { h: clampHue(h), s: clamp(s), l: clamp(l) };
}

export function hslToHex(h: number, s: number, l: number) {
  const hue = clampHue(h);
  const sat = clamp(s) / 100;
  const light = clamp(l) / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function hslToRgb(h: number, s: number, l: number) {
  const hex = hslToHex(h, s, l);
  return hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
}

export function slPointToHex(h: number, x: number, y: number, width: number, height: number) {
  const nx = clamp(x / width, 0, 1);
  const ny = clamp(y / height, 0, 1);
  const pure = hslToRgb(h, 100, 50);

  const r1 = 255 + nx * (pure.r - 255);
  const g1 = 255 + nx * (pure.g - 255);
  const b1 = 255 + nx * (pure.b - 255);

  const r = r1 * (1 - ny);
  const g = g1 * (1 - ny);
  const b = b1 * (1 - ny);

  return rgbToHex(r, g, b);
}

export function hexToSlPoint(hex: string, hue: number, width: number, height: number) {
  const target = hexToRgb(hex);
  if (!target) return { x: 0, y: 0 };

  let best = { x: 0, y: 0, diff: Infinity };
  const steps = 40;
  for (let yi = 0; yi <= steps; yi++) {
    for (let xi = 0; xi <= steps; xi++) {
      const x = (xi / steps) * width;
      const y = (yi / steps) * height;
      const sample = hexToRgb(slPointToHex(hue, x, y, width, height));
      if (!sample) continue;
      const diff =
        Math.abs(sample.r - target.r) + Math.abs(sample.g - target.g) + Math.abs(sample.b - target.b);
      if (diff < best.diff) best = { x, y, diff };
    }
  }
  return { x: best.x, y: best.y };
}

export function pointToHue(cx: number, cy: number, px: number, py: number) {
  const angle = Math.atan2(py - cy, px - cx);
  return clampHue((angle * 180) / Math.PI);
}

export function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x2 - x1, y2 - y1);
}
