import { Units } from './units';
import type { AlignmentType, DistributeType } from '@/types';

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface RectangularItem {
  id?: string | number;
  _tempId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  [key: string]: any;
}

/**
 * Computes the overall bounding box enclosing a set of rectangular items (in feet).
 */
export function computeBoundingBox(items: RectangularItem[]): BoundingBox {
  if (items.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const item of items) {
    const tw = item.width || 0;
    const th = item.height || 0;
    if (item.x < minX) minX = item.x;
    if (item.x + tw > maxX) maxX = item.x + tw;
    if (item.y < minY) minY = item.y;
    if (item.y + th > maxY) maxY = item.y + th;
  }

  const width = Units.roundFt(maxX - minX);
  const height = Units.roundFt(maxY - minY);
  const centerX = Units.roundFt((minX + maxX) / 2);
  const centerY = Units.roundFt((minY + maxY) / 2);

  return { minX, maxX, minY, maxY, width, height, centerX, centerY };
}

/**
 * Aligns the given items relative to their overall bounding box.
 */
export function alignBoxItems<T extends RectangularItem>(items: T[], alignment: AlignmentType): T[] {
  if (items.length < 2) return items;

  const bbox = computeBoundingBox(items);

  return items.map((item) => {
    const tw = item.width || 0;
    const th = item.height || 0;
    let newX = item.x;
    let newY = item.y;

    switch (alignment) {
      case 'left':
        newX = bbox.minX;
        break;
      case 'center-x':
        newX = Units.roundFt(bbox.centerX - tw / 2);
        break;
      case 'right':
        newX = Units.roundFt(bbox.maxX - tw);
        break;
      case 'top':
        newY = bbox.minY;
        break;
      case 'center-y':
        newY = Units.roundFt(bbox.centerY - th / 2);
        break;
      case 'bottom':
        newY = Units.roundFt(bbox.maxY - th);
        break;
    }

    return { ...item, x: newX, y: newY };
  });
}

/**
 * Evenly distributes the spacing or centers of items along the chosen axis.
 */
export function distributeBoxItems<T extends RectangularItem>(items: T[], distribute: DistributeType): T[] {
  if (items.length < 3) return items;

  const sorted = [...items].sort((a, b) => {
    if (distribute === 'horizontal') return a.x - b.x;
    return a.y - b.y;
  });

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const posMap = new Map<string, { x: number; y: number }>();

  if (distribute === 'horizontal') {
    const firstX = first.x;
    const lastRight = last.x + (last.width || 0);
    const totalSpan = lastRight - firstX;
    const totalWidths = sorted.reduce((sum, t) => sum + (t.width || 0), 0);
    const totalGap = totalSpan - totalWidths;
    const nGaps = sorted.length - 1;

    if (totalGap >= 0 && nGaps > 0) {
      const gap = totalGap / nGaps;
      let curX = firstX;
      sorted.forEach((t) => {
        const key = String(t.id || t._tempId);
        posMap.set(key, { x: Units.roundFt(curX), y: t.y });
        curX += (t.width || 0) + gap;
      });
    } else {
      const firstCenter = firstX + (first.width || 0) / 2;
      const lastCenter = last.x + (last.width || 0) / 2;
      const centerStep = (lastCenter - firstCenter) / (sorted.length - 1);
      sorted.forEach((t, i) => {
        const key = String(t.id || t._tempId);
        const center = firstCenter + i * centerStep;
        posMap.set(key, {
          x: Units.roundFt(center - (t.width || 0) / 2),
          y: t.y,
        });
      });
    }
  } else {
    const firstY = first.y;
    const lastBottom = last.y + (last.height || 0);
    const totalSpan = lastBottom - firstY;
    const totalHeights = sorted.reduce((sum, t) => sum + (t.height || 0), 0);
    const totalGap = totalSpan - totalHeights;
    const nGaps = sorted.length - 1;

    if (totalGap >= 0 && nGaps > 0) {
      const gap = totalGap / nGaps;
      let curY = firstY;
      sorted.forEach((t) => {
        const key = String(t.id || t._tempId);
        posMap.set(key, { x: t.x, y: Units.roundFt(curY) });
        curY += (t.height || 0) + gap;
      });
    } else {
      const firstCenter = firstY + (first.height || 0) / 2;
      const lastCenter = last.y + (last.height || 0) / 2;
      const centerStep = (lastCenter - firstCenter) / (sorted.length - 1);
      sorted.forEach((t, i) => {
        const key = String(t.id || t._tempId);
        const center = firstCenter + i * centerStep;
        posMap.set(key, {
          x: t.x,
          y: Units.roundFt(center - (t.height || 0) / 2),
        });
      });
    }
  }

  return items.map((item) => {
    const key = String(item.id || item._tempId);
    const updated = posMap.get(key);
    if (updated) {
      return { ...item, x: updated.x, y: updated.y };
    }
    return item;
  });
}
