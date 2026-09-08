import { describe, it, expect } from 'vitest';
import {
  BLUEPRINT_CORNERS,
  DEFAULT_BLUEPRINT,
  calibrate,
  cornerWorld,
  createPlacement,
  distanceFt,
  fitToHall,
  isSafeBlueprintUrl,
  normalizeBlueprint,
  sanitizeBlueprintUrl,
  scaleAbout,
  type BlueprintPlacement,
} from '@/lib/blueprint';

const place = (over: Partial<BlueprintPlacement> = {}): BlueprintPlacement => ({
  ...DEFAULT_BLUEPRINT,
  x: 4,
  y: 7,
  width: 60,
  height: 40,
  ...over,
});

const centre = (b: BlueprintPlacement) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

/**
 * Scaling maps every world point by `anchor + k * (p - anchor)`, so a material
 * point of the image ends up here after the blueprint is rescaled.
 */
const mapPoint = (p: { x: number; y: number }, anchor: { x: number; y: number }, k: number) => ({
  x: anchor.x + k * (p.x - anchor.x),
  y: anchor.y + k * (p.y - anchor.y),
});

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('calibrate', () => {
  // Rotation must not disturb any of this: a rotation about the centre
  // preserves distances, and the anchor formula is derived to survive it.
  for (const rotation of [0, 37, 90, 180, 270]) {
    describe(`at ${rotation}°`, () => {
      const bp = place({ rotation });
      const from = { x: 10, y: 12 };
      const to = { x: 30, y: 32 };
      const measured = dist(from, to);
      const realFt = 40;
      const next = calibrate(bp, from, to, realFt)!;
      const k = next.width / bp.width;

      it('scales by realFt / measured', () => {
        expect(next).not.toBeNull();
        expect(k).toBeCloseTo(realFt / measured, 4);
      });

      it('holds the first clicked point still', () => {
        const moved = mapPoint(from, from, k);
        expect(moved.x).toBeCloseTo(from.x, 6);
        expect(moved.y).toBeCloseTo(from.y, 6);
      });

      it('puts the two marked points exactly realFt apart', () => {
        expect(dist(from, mapPoint(to, from, k))).toBeCloseTo(realFt, 2);
      });

      it('preserves rotation and aspect ratio', () => {
        expect(next.rotation).toBe(rotation);
        expect(next.width / next.height).toBeCloseTo(bp.width / bp.height, 3);
      });

      it('moves the centre to anchor + k * (centre - anchor)', () => {
        const c = centre(bp);
        const expected = mapPoint(c, from, k);
        expect(centre(next).x).toBeCloseTo(expected.x, 1);
        expect(centre(next).y).toBeCloseTo(expected.y, 1);
      });
    });
  }

  it('refuses two points that are effectively the same spot', () => {
    expect(calibrate(place(), { x: 5, y: 5 }, { x: 5.001, y: 5 }, 10)).toBeNull();
  });

  it('refuses a non-positive or unparseable real distance', () => {
    const bp = place();
    const from = { x: 0, y: 0 };
    const to = { x: 10, y: 0 };
    expect(calibrate(bp, from, to, 0)).toBeNull();
    expect(calibrate(bp, from, to, -5)).toBeNull();
    expect(calibrate(bp, from, to, NaN)).toBeNull();
  });

  it('shrinks when the real distance is smaller than what is drawn', () => {
    const bp = place();
    const next = calibrate(bp, { x: 0, y: 0 }, { x: 20, y: 0 }, 10)!;
    expect(next.width).toBeCloseTo(bp.width / 2, 2);
  });
});

describe('scaleAbout', () => {
  it.each(BLUEPRINT_CORNERS.map((c, i) => [i, c] as const))(
    'dragging handle %i pins the opposite corner, at any rotation',
    (_i, corner) => {
      for (const rotation of [0, 45, 90, 210]) {
        const bp = place({ x: 10, y: 5, width: 40, height: 25, rotation });
        const anchor = cornerWorld(bp, (1 - corner.ix) as 0 | 1, (1 - corner.iy) as 0 | 1);
        const next = scaleAbout(bp, 1.5, anchor.x, anchor.y);
        const after = cornerWorld(next, (1 - corner.ix) as 0 | 1, (1 - corner.iy) as 0 | 1);

        expect(after.x).toBeCloseTo(anchor.x, 1);
        expect(after.y).toBeCloseTo(anchor.y, 1);
      }
    }
  );

  it('scales both sides by the same factor', () => {
    const next = scaleAbout(place({ x: 0, y: 0, width: 40, height: 20 }), 1.5, 0, 0);
    expect(next.width).toBeCloseTo(60, 2);
    expect(next.height).toBeCloseTo(30, 2);
  });

  it('is a pure function of the snapshot, so a drag cannot compound', () => {
    const start = place({ x: 0, y: 0, width: 40, height: 20, rotation: 0 });
    expect(scaleAbout(start, 2, 0, 0)).toEqual(scaleAbout(start, 2, 0, 0));
    expect(start.width).toBe(40); // untouched
  });

  it('ignores a nonsensical factor', () => {
    const bp = place();
    expect(scaleAbout(bp, 0, 0, 0)).toBe(bp);
    expect(scaleAbout(bp, -1, 0, 0)).toBe(bp);
    expect(scaleAbout(bp, NaN, 0, 0)).toBe(bp);
  });

  it('will not shrink below the minimum footprint', () => {
    const next = scaleAbout(place({ width: 2, height: 2 }), 0.001, 0, 0);
    expect(next.width).toBeGreaterThanOrEqual(1);
    expect(next.height).toBeGreaterThanOrEqual(1);
  });
});

describe('cornerWorld', () => {
  it('returns the plain rectangle corners when unrotated', () => {
    const bp = place({ x: 10, y: 20, width: 30, height: 40, rotation: 0 });
    expect(cornerWorld(bp, 0, 0)).toEqual({ x: 10, y: 20 });
    expect(cornerWorld(bp, 1, 1)).toEqual({ x: 40, y: 60 });
  });

  it('rotates corners about the centre, preserving the diagonal', () => {
    const bp = place({ x: 0, y: 0, width: 40, height: 20, rotation: 90 });
    const diagonal = Math.hypot(40, 20);
    expect(dist(cornerWorld(bp, 0, 0), cornerWorld(bp, 1, 1))).toBeCloseTo(diagonal, 6);
  });
});

describe('normalizeBlueprint', () => {
  it('clamps absurd values instead of storing them', () => {
    const bp = normalizeBlueprint({ width: 99999, height: -4, opacity: 12, rotation: 450 }, 80, 55);
    expect(bp.width).toBe(2000);
    expect(bp.height).toBe(1);
    expect(bp.opacity).toBe(1);
    expect(bp.rotation).toBe(90);
  });

  it('folds negative rotation into 0–359', () => {
    expect(normalizeBlueprint({ rotation: -90 }, 80, 55).rotation).toBe(270);
  });

  it('keeps opacity above zero so a blueprint is never invisibly "on"', () => {
    expect(normalizeBlueprint({ opacity: -5 }, 80, 55).opacity).toBe(0.05);
  });

  it('accepts the JSON string Postgres hands back', () => {
    const bp = normalizeBlueprint('{"x":3,"y":4,"width":20,"height":10}', 80, 55);
    expect(bp.x).toBe(3);
    expect(bp.width).toBe(20);
  });

  it('falls back to a hall-fitted placement for junk, null, or bad JSON', () => {
    const fitted = createPlacement(80, 55);
    expect(normalizeBlueprint(null, 80, 55)).toEqual(fitted);
    expect(normalizeBlueprint('not json', 80, 55)).toEqual(fitted);
    expect(normalizeBlueprint(42, 80, 55)).toEqual(fitted);
  });

  it('coerces flags from strings', () => {
    const bp = normalizeBlueprint({ visible: 'false', locked: 'true', showToVisitors: 'true' }, 80, 55);
    expect(bp.visible).toBe(false);
    expect(bp.locked).toBe(true);
    expect(bp.showToVisitors).toBe(true);
  });

  it('hides the underlay from visitors unless it was explicitly turned on', () => {
    expect(normalizeBlueprint({}, 80, 55).showToVisitors).toBe(false);
  });
});

describe('fitToHall', () => {
  it('letterboxes a wide plan without cropping or stretching it', () => {
    const fitted = fitToHall(80, 55, 2);
    expect(fitted.width / fitted.height).toBeCloseTo(2, 3);
    expect(fitted.width).toBeLessThanOrEqual(80.01);
    expect(fitted.height).toBeLessThanOrEqual(55.01);
  });

  it('pillarboxes a tall plan the same way', () => {
    const fitted = fitToHall(80, 55, 0.5);
    expect(fitted.width / fitted.height).toBeCloseTo(0.5, 3);
    expect(fitted.height).toBeLessThanOrEqual(55.01);
  });

  it('centres what it fits', () => {
    const fitted = fitToHall(80, 55, 2);
    expect(fitted.x).toBeCloseTo((80 - fitted.width) / 2, 2);
    expect(fitted.y).toBeCloseTo((55 - fitted.height) / 2, 2);
  });

  it('falls back to the hall ratio when the image ratio is unknown', () => {
    expect(fitToHall(80, 55)).toEqual({ x: 0, y: 0, width: 80, height: 55 });
  });
});

describe('distanceFt', () => {
  it('measures a 3-4-5 triangle', () => {
    expect(distanceFt({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe('blueprint URL safety', () => {
  it.each(['/api/uploads/12.jpg', 'https://cdn.example.com/plan.png', 'http://example.com/a.gif', 'data:image/png;base64,iVBORw0KGgo='])(
    'accepts %s',
    (url) => expect(isSafeBlueprintUrl(url)).toBe(true)
  );

  it.each([
    'javascript:alert(document.cookie)',
    'JavaScript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    '//evil.example.com/x.png',
    'not a url at all',
    '',
    '   ',
  ])('rejects %s', (url) => expect(isSafeBlueprintUrl(url)).toBe(false));

  it('rejects non-strings', () => {
    expect(isSafeBlueprintUrl(null)).toBe(false);
    expect(isSafeBlueprintUrl(undefined)).toBe(false);
    expect(isSafeBlueprintUrl(123)).toBe(false);
  });

  it('sanitize trims, or returns null for anything unsafe', () => {
    expect(sanitizeBlueprintUrl('  /api/uploads/3.png  ')).toBe('/api/uploads/3.png');
    expect(sanitizeBlueprintUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeBlueprintUrl('')).toBeNull();
    expect(sanitizeBlueprintUrl(null)).toBeNull();
  });
});
