import { describe, it, expect } from 'vitest';
import { computeBoundingBox, alignBoxItems, distributeBoxItems, RectangularItem } from '@/lib/studioMath';

describe('Studio Multi-Select Math', () => {
  const sampleItems: RectangularItem[] = [
    { id: 't1', x: 10, y: 10, width: 6, height: 4 },
    { id: 't2', x: 20, y: 15, width: 6, height: 4 },
    { id: 't3', x: 40, y: 30, width: 6, height: 4 },
  ];

  it('computes correct bounding box for multiple items', () => {
    const bbox = computeBoundingBox(sampleItems);
    expect(bbox.minX).toBe(10);
    expect(bbox.maxX).toBe(46); // 40 + 6
    expect(bbox.minY).toBe(10);
    expect(bbox.maxY).toBe(34); // 30 + 4
    expect(bbox.width).toBe(36);
    expect(bbox.height).toBe(24);
    expect(bbox.centerX).toBe(28); // (10 + 46) / 2
    expect(bbox.centerY).toBe(22); // (10 + 34) / 2
  });

  it('aligns items to left, center-x, right', () => {
    // Align left: all x should become minX (10)
    const leftAligned = alignBoxItems(sampleItems, 'left');
    expect(leftAligned.every((t) => t.x === 10)).toBe(true);

    // Align right: all x should become maxX - width (46 - 6 = 40)
    const rightAligned = alignBoxItems(sampleItems, 'right');
    expect(rightAligned.every((t) => t.x === 40)).toBe(true);

    // Center X: centerX is 28, item width is 6, so x should be 28 - 3 = 25
    const centerAligned = alignBoxItems(sampleItems, 'center-x');
    expect(centerAligned.every((t) => t.x === 25)).toBe(true);
  });

  it('aligns items to top, center-y, bottom', () => {
    // Align top: all y should become minY (10)
    const topAligned = alignBoxItems(sampleItems, 'top');
    expect(topAligned.every((t) => t.y === 10)).toBe(true);

    // Align bottom: all y should become maxY - height (34 - 4 = 30)
    const bottomAligned = alignBoxItems(sampleItems, 'bottom');
    expect(bottomAligned.every((t) => t.y === 30)).toBe(true);

    // Center Y: centerY is 22, height is 4, so y should be 22 - 2 = 20
    const centerYAligned = alignBoxItems(sampleItems, 'center-y');
    expect(centerYAligned.every((t) => t.y === 20)).toBe(true);
  });

  it('distributes items horizontally with equal gaps', () => {
    // Items at x: 0 (w=10), x: 50 (w=10), x: 100 (w=10)
    // Span = 110 - 0 = 110. Widths = 30. Total gap = 80.
    // 2 gaps -> 40 each.
    // Result x: 0, 0 + 10 + 40 = 50, 50 + 10 + 40 = 100.
    const items: RectangularItem[] = [
      { id: '1', x: 0, y: 0, width: 10, height: 5 },
      { id: '2', x: 20, y: 0, width: 10, height: 5 },
      { id: '3', x: 100, y: 0, width: 10, height: 5 },
    ];

    const distributed = distributeBoxItems(items, 'horizontal');
    expect(distributed.find((i) => i.id === '1')?.x).toBe(0);
    expect(distributed.find((i) => i.id === '2')?.x).toBe(50);
    expect(distributed.find((i) => i.id === '3')?.x).toBe(100);
  });

  it('distributes items vertically with equal gaps', () => {
    const items: RectangularItem[] = [
      { id: '1', x: 0, y: 0, width: 6, height: 4 },
      { id: '2', x: 0, y: 10, width: 6, height: 4 },
      { id: '3', x: 0, y: 40, width: 6, height: 4 },
    ];
    // Span = 44 - 0 = 44. Heights = 12. Gap = 32 / 2 = 16.
    // Result y: 0, 0 + 4 + 16 = 20, 20 + 4 + 16 = 40.
    const distributed = distributeBoxItems(items, 'vertical');
    expect(distributed.find((i) => i.id === '1')?.y).toBe(0);
    expect(distributed.find((i) => i.id === '2')?.y).toBe(20);
    expect(distributed.find((i) => i.id === '3')?.y).toBe(40);
  });
});
