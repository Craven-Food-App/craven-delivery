/**
 * Polar layout for the upper Crave Wheel semicircle.
 * Browser y increases downward, so negative sin places items above the C.
 */

export interface Point {
  x: number;
  y: number;
}

export interface WheelLayoutItem {
  index: number;
  angleRad: number;
  x: number;
  y: number;
}

/** Responsive radius in px from viewport width. */
export function getWheelRadius(viewportWidth: number): number {
  if (viewportWidth <= 320) return 118;
  if (viewportWidth <= 360) return 128;
  if (viewportWidth <= 390) return 142;
  if (viewportWidth <= 430) return 158;
  return 168;
}

/** Item button diameter in px — sized for emoji icon glyphs. */
export function getWheelItemSize(viewportWidth: number): number {
  if (viewportWidth <= 320) return 52;
  if (viewportWidth <= 390) return 58;
  return 64;
}

/**
 * Upper arc from upper-left (~200°) through top (270°) to upper-right (~340°).
 * With browser y-down, sin(270°)=-1 places items above the C.
 */
export function getArcAngles(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [(270 * Math.PI) / 180];

  const startDeg = 205;
  const endDeg = 335;
  const start = (startDeg * Math.PI) / 180;
  const end = (endDeg * Math.PI) / 180;
  const span = end - start;

  return Array.from({ length: count }, (_, i) => start + (span * i) / (count - 1));
}

export function polarToCartesian(angleRad: number, radius: number): Point {
  // 0° = right, 90° = down, 270° = up (browser y increases downward)
  return {
    x: Math.cos(angleRad) * radius,
    y: Math.sin(angleRad) * radius,
  };
}

/** Clamp outer items so they stay inside the viewport with padding. */
export function layoutWheelItems(
  count: number,
  radius: number,
  viewportWidth: number,
  edgePadding = 8
): WheelLayoutItem[] {
  const angles = getArcAngles(count);
  const itemSize = getWheelItemSize(viewportWidth);
  const half = itemSize / 2;
  const maxX = viewportWidth / 2 - half - edgePadding;

  return angles.map((angleRad, index) => {
    let { x, y } = polarToCartesian(angleRad, radius);
    if (x > maxX) x = maxX;
    if (x < -maxX) x = -maxX;
    // Prefer keeping items above the C (negative y)
    if (y > -24) y = -24;
    return { index, angleRad, x, y };
  });
}
