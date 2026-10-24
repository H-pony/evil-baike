/** Keep animation input finite and inside its normalized range. */
export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/** Cubic easing with zero velocity at both ends. */
export function smoothstep01(value: number): number {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
}

/**
 * Timeline-driven tile progress; multiply the result by 180 for its flip angle.
 * A diagonal wave starts at 0.12 and every tile finishes by 0.82.
 * Each tile runs for 0.42, with up to 0.28 of stagger (60% column / 40% row).
 * There is no direction or timing state, so reverse scene transitions are deterministic.
 * A single row or column contributes zero stagger along that axis.
 */
export function tileProgress(
  progress: number,
  row: number,
  col: number,
  rows: number,
  cols: number,
): number {
  const position = clamp01(progress);
  if (position <= 0.12) return 0;
  if (position >= 0.82) return 1;

  const columnPosition = cols > 1 ? clamp01(col / (cols - 1)) : 0;
  const rowPosition = rows > 1 ? clamp01(row / (rows - 1)) : 0;
  const diagonalPosition = columnPosition * 0.6 + rowPosition * 0.4;
  const start = 0.12 + diagonalPosition * 0.28;
  return smoothstep01((position - start) / 0.42);
}

/** A tiny first gesture must flip; the same direction on the second face scrolls. */
export function requestedScene(current: number, verticalDelta: number): 0 | 1 | null {
  if (!Number.isFinite(verticalDelta) || verticalDelta === 0) return null;
  if (current === 0 && verticalDelta > 0) return 1;
  if (current === 1 && verticalDelta < 0) return 0;
  return null;
}
