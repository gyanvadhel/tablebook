import { describe, it, expect } from 'vitest';
import { extensionRects, hallFloorAreaSqFt, shellBounds, unionAreaSqFt } from '@/lib/hallShape';

const rect = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

describe('unionAreaSqFt', () => {
  it('returns the area of a single rectangle', () => {
    expect(unionAreaSqFt([rect(0, 0, 60, 36)])).toBe(2160);
  });

  it('adds disjoint rectangles', () => {
    expect(unionAreaSqFt([rect(0, 0, 10, 10), rect(100, 100, 5, 5)])).toBe(125);
  });

  /** The whole point: welded pieces overlap, and the overlap is one floor. */
  it('counts an overlap once', () => {
    // 10x10 at origin plus 10x10 offset by 5 in both axes: 100 + 100 - 25
    expect(unionAreaSqFt([rect(0, 0, 10, 10), rect(5, 5, 10, 10)])).toBe(175);
  });

  it('counts a fully contained rectangle once', () => {
    expect(unionAreaSqFt([rect(0, 0, 20, 20), rect(5, 5, 5, 5)])).toBe(400);
  });

  it('handles an L-shape made of two rectangles sharing an edge', () => {
    // 20x10 along the top, 10x10 hanging below its left half
    expect(unionAreaSqFt([rect(0, 0, 20, 10), rect(0, 10, 10, 10)])).toBe(300);
  });

  it('handles negative coordinates', () => {
    expect(unionAreaSqFt([rect(-20, -10, 20, 10)])).toBe(200);
  });

  it('ignores degenerate and malformed rectangles', () => {
    expect(unionAreaSqFt([rect(0, 0, 0, 10), rect(0, 0, 10, 0)])).toBe(0);
    expect(unionAreaSqFt([null, undefined, rect(0, 0, 4, 4)])).toBe(16);
    expect(unionAreaSqFt([])).toBe(0);
    expect(unionAreaSqFt([{ x: NaN, y: 0, width: 5, height: 5 }])).toBe(0);
  });

  it('is independent of the order rectangles are given in', () => {
    const a = [rect(0, 0, 10, 10), rect(5, 5, 10, 10), rect(-3, 0, 6, 4)];
    expect(unionAreaSqFt(a)).toBe(unionAreaSqFt([...a].reverse()));
  });
});

describe('shellBounds', () => {
  it('wraps every rectangle', () => {
    expect(shellBounds([rect(0, 0, 60, 36), rect(-19, 8, 20, 20)])).toEqual({ x: -19, y: 0, width: 79, height: 36 });
  });

  it('extends upward for a rectangle above the hall', () => {
    expect(shellBounds([rect(0, 0, 60, 36), rect(25, -11, 34, 12)])).toEqual({ x: 0, y: -11, width: 60, height: 47 });
  });

  it('returns null when there is nothing to bound', () => {
    expect(shellBounds([])).toBeNull();
    expect(shellBounds([null, undefined])).toBeNull();
  });
});

describe('extensionRects', () => {
  it('picks out only hall_extension elements', () => {
    const elements = [
      { type: 'hall_extension', x: 1, y: 2, width: 10, height: 10 },
      { type: 'hall_room', x: 0, y: 0, width: 30, height: 20 },
      { type: 'door', x: 5, y: 0, width: 4, height: 1 },
    ];
    expect(extensionRects(elements)).toEqual([{ x: 1, y: 2, width: 10, height: 10 }]);
  });

  it('survives a missing or empty list', () => {
    expect(extensionRects()).toEqual([]);
    expect(extensionRects([])).toEqual([]);
  });
});

describe('hallFloorAreaSqFt', () => {
  it('matches the hall alone when there are no extensions', () => {
    expect(hallFloorAreaSqFt(rect(0, 0, 60, 36), [])).toBe(2160);
  });

  it('grows by the part of an extension that sits outside the hall', () => {
    // Wing 20x20 overlapping the hall by 1ft along x contributes 19x20
    const area = hallFloorAreaSqFt(rect(0, 0, 60, 36), [
      { type: 'hall_extension', x: -19, y: 8, width: 20, height: 20 },
    ]);
    expect(area).toBe(2160 + 19 * 20);
  });

  it('ignores non-extension elements entirely', () => {
    const area = hallFloorAreaSqFt(rect(0, 0, 10, 10), [
      { type: 'hall_room', x: 100, y: 100, width: 50, height: 50 },
      { type: 'stage', x: 0, y: 0, width: 5, height: 5 },
    ]);
    expect(area).toBe(100);
  });
});
