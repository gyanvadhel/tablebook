/**
 * A hall is a main rectangle plus any number of `hall_extension` rectangles
 * welded onto it. Those pieces are expected to overlap — that is what hides
 * the wall along a joint — so the true floor area is the area of their union,
 * not the sum of their areas.
 */

export interface HallRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const usable = (r: HallRect | null | undefined): r is HallRect =>
  !!r && Number.isFinite(r.x) && Number.isFinite(r.y) && (r.width || 0) > 0 && (r.height || 0) > 0;

/**
 * Area covered by one or more axis-aligned rectangles, counting overlaps once.
 *
 * Works by compressing the distinct edge coordinates into a grid and adding up
 * the cells that fall inside at least one rectangle. Exact for any arrangement,
 * and the grid stays tiny — a hall is a handful of rectangles, not thousands.
 */
export function unionAreaSqFt(rects: Array<HallRect | null | undefined>): number {
  const boxes = rects.filter(usable);
  if (boxes.length === 0) return 0;

  const xs = Array.from(new Set(boxes.flatMap((r) => [r.x, r.x + r.width]))).sort((a, b) => a - b);
  const ys = Array.from(new Set(boxes.flatMap((r) => [r.y, r.y + r.height]))).sort((a, b) => a - b);

  let area = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    const x0 = xs[i];
    const x1 = xs[i + 1];

    for (let j = 0; j < ys.length - 1; j++) {
      const y0 = ys[j];
      const y1 = ys[j + 1];

      const covered = boxes.some((r) => r.x <= x0 && r.x + r.width >= x1 && r.y <= y0 && r.y + r.height >= y1);
      if (covered) area += (x1 - x0) * (y1 - y0);
    }
  }

  return Math.round(area * 100) / 100;
}

/** Overall extent of the assembled hall, for framing and annotations. */
export function shellBounds(rects: Array<HallRect | null | undefined>): HallRect | null {
  const boxes = rects.filter(usable);
  if (boxes.length === 0) return null;

  const minX = Math.min(...boxes.map((r) => r.x));
  const minY = Math.min(...boxes.map((r) => r.y));
  const maxX = Math.max(...boxes.map((r) => r.x + r.width));
  const maxY = Math.max(...boxes.map((r) => r.y + r.height));

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Pull the extension rectangles out of a hall's element list. */
export function extensionRects(elements: Array<{ type?: string; x?: number; y?: number; width?: number; height?: number }> = []): HallRect[] {
  return elements
    .filter((el) => el?.type === 'hall_extension')
    .map((el) => ({ x: Number(el.x) || 0, y: Number(el.y) || 0, width: Number(el.width) || 0, height: Number(el.height) || 0 }))
    .filter(usable);
}

/** Total floor area of the main hall together with everything welded onto it. */
export function hallFloorAreaSqFt(
  main: HallRect,
  elements: Array<{ type?: string; x?: number; y?: number; width?: number; height?: number }> = []
): number {
  return unionAreaSqFt([main, ...extensionRects(elements)]);
}
