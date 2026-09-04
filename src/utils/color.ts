/** Colour maths used by the generated product art. Everything is plain hex in,
 *  plain hex out so it can be dropped straight into SVG fill attributes. */

function clamp(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)));
}

function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, '0')).join('')}`;
}

/** amount > 0 lightens toward white, amount < 0 darkens toward black. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = parse(hex);
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  return toHex(r + (target - r) * t, g + (target - g) * t, b + (target - b) * t);
}

/** Perceived luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = parse(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Readable ink for a swatch — used for the tick on a selected colour chip. */
export function contrastInk(hex: string): string {
  return luminance(hex) > 0.62 ? '#211f1f' : '#ffffff';
}
