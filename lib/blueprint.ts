/**
 * Blueprint overlay — a scanned or exported floor plan laid under the hall.
 *
 * The image URL lives in `events.hall_background_image`. Everything about
 * *where* it sits lives in `events.hall_blueprint` (JSONB) and is described in
 * the same unit as the rest of the plan: feet, measured from the hall's
 * top-left corner. That way a blueprint stays put when the hall is resized,
 * and a stall traced over it lands on real coordinates.
 */

export interface BlueprintPlacement {
  /** Feet from the hall's top-left corner. */
  x: number;
  y: number;
  /** Footprint in feet. */
  width: number;
  height: number;
  /** Degrees clockwise, about the blueprint's own centre. */
  rotation: number;
  /** 0.05 – 1. How strongly the image reads under the plan. */
  opacity: number;
  /** Drawn in the studio at all. */
  visible: boolean;
  /** Ignores drags and resize handles. */
  locked: boolean;
  /** Also drawn on the public visitor map. */
  showToVisitors: boolean;
}

export const BLUEPRINT_MIN_FT = 1;
export const BLUEPRINT_MAX_FT = 2000;
export const BLUEPRINT_MIN_OPACITY = 0.05;

export const DEFAULT_BLUEPRINT: BlueprintPlacement = {
  x: 0,
  y: 0,
  width: 50,
  height: 30,
  rotation: 0,
  opacity: 0.55,
  visible: true,
  locked: false,
  showToVisitors: false,
};

function round(n: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((Number(n) || 0) * factor) / factor;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function toNumber(val: any, fallback: number): number {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}

function toBool(val: any, fallback: boolean): boolean {
  if (val === true || val === false) return val;
  if (val === 'true') return true;
  if (val === 'false') return false;
  return fallback;
}

/**
 * An image URL we are willing to hand to an SVG <image href>. Blocks
 * `javascript:` and friends, which would otherwise execute on click.
 */
export function isSafeBlueprintUrl(url: any): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Site-relative path, e.g. /uploads/blueprint_123.png
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;

  if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(trimmed)) return true;

  try {
    const proto = new URL(trimmed).protocol.toLowerCase();
    return proto === 'http:' || proto === 'https:';
  } catch {
    return false;
  }
}

/** Trim and validate a URL down to something storable, or null. */
export function sanitizeBlueprintUrl(url: any): string | null {
  if (url === null || url === undefined) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  return isSafeBlueprintUrl(trimmed) ? trimmed : null;
}

/**
 * Size a fresh blueprint so it sits inside the hall at its natural aspect
 * ratio, centred, covering as much of the floor as it can without cropping.
 */
export function fitToHall(hallWidthFt: number, hallHeightFt: number, aspect?: number): Pick<BlueprintPlacement, 'x' | 'y' | 'width' | 'height'> {
  const hallW = Math.max(BLUEPRINT_MIN_FT, toNumber(hallWidthFt, DEFAULT_BLUEPRINT.width));
  const hallH = Math.max(BLUEPRINT_MIN_FT, toNumber(hallHeightFt, DEFAULT_BLUEPRINT.height));
  const ratio = aspect && isFinite(aspect) && aspect > 0 ? aspect : hallW / hallH;

  let width = hallW;
  let height = width / ratio;

  if (height > hallH) {
    height = hallH;
    width = height * ratio;
  }

  return {
    x: round((hallW - width) / 2),
    y: round((hallH - height) / 2),
    width: round(width),
    height: round(height),
  };
}

/** Build a placement for a newly attached image. */
export function createPlacement(hallWidthFt: number, hallHeightFt: number, aspect?: number): BlueprintPlacement {
  return { ...DEFAULT_BLUEPRINT, ...fitToHall(hallWidthFt, hallHeightFt, aspect) };
}

/**
 * Coerce whatever came back from the database or a request body into a
 * placement we can safely render. Returns defaults for anything missing.
 */
export function normalizeBlueprint(raw: any, hallWidthFt: number, hallHeightFt: number): BlueprintPlacement {
  let source = raw;

  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      source = null;
    }
  }

  const base = createPlacement(hallWidthFt, hallHeightFt);
  if (!source || typeof source !== 'object') return base;

  const width = clamp(round(toNumber(source.width, base.width)), BLUEPRINT_MIN_FT, BLUEPRINT_MAX_FT);
  const height = clamp(round(toNumber(source.height, base.height)), BLUEPRINT_MIN_FT, BLUEPRINT_MAX_FT);

  return {
    x: clamp(round(toNumber(source.x, base.x)), -BLUEPRINT_MAX_FT, BLUEPRINT_MAX_FT),
    y: clamp(round(toNumber(source.y, base.y)), -BLUEPRINT_MAX_FT, BLUEPRINT_MAX_FT),
    width,
    height,
    rotation: ((Math.round(toNumber(source.rotation, 0)) % 360) + 360) % 360,
    opacity: clamp(round(toNumber(source.opacity, base.opacity), 3), BLUEPRINT_MIN_OPACITY, 1),
    visible: toBool(source.visible, true),
    locked: toBool(source.locked, false),
    showToVisitors: toBool(source.showToVisitors, false),
  };
}

/**
 * Scale a placement by `factor` while pinning one point of the hall in place.
 *
 * Rotation is preserved: because a rotation about the centre maps the centre
 * to itself, the anchor stays fixed as long as the new centre satisfies
 * `c' = anchor - factor * (anchor - c)`.
 */
export function scaleAbout(
  bp: BlueprintPlacement,
  factor: number,
  anchorX: number,
  anchorY: number
): BlueprintPlacement {
  const k = toNumber(factor, 1);
  if (!isFinite(k) || k <= 0) return bp;

  const cx = bp.x + bp.width / 2;
  const cy = bp.y + bp.height / 2;

  const newWidth = clamp(bp.width * k, BLUEPRINT_MIN_FT, BLUEPRINT_MAX_FT);
  const newHeight = clamp(bp.height * k, BLUEPRINT_MIN_FT, BLUEPRINT_MAX_FT);

  const newCx = anchorX - k * (anchorX - cx);
  const newCy = anchorY - k * (anchorY - cy);

  return {
    ...bp,
    x: round(newCx - newWidth / 2),
    y: round(newCy - newHeight / 2),
    width: round(newWidth),
    height: round(newHeight),
  };
}

/**
 * Two-point calibration: the user marks two spots on the blueprint and states
 * the real distance between them. The image is rescaled so that measurement
 * comes true, with the first point held still.
 *
 * This is what turns a background picture into a tracing surface — after it,
 * a stall drawn over the image has real-world coordinates.
 */
export function calibrate(
  bp: BlueprintPlacement,
  from: { x: number; y: number },
  to: { x: number; y: number },
  realDistanceFt: number
): BlueprintPlacement | null {
  const measured = Math.hypot(to.x - from.x, to.y - from.y);
  const target = toNumber(realDistanceFt, 0);

  if (!isFinite(measured) || measured < 0.01) return null;
  if (!isFinite(target) || target <= 0) return null;

  return scaleAbout(bp, target / measured, from.x, from.y);
}

/** Distance in feet between two points, for the calibration read-out. */
export function distanceFt(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return round(Math.hypot(to.x - from.x, to.y - from.y));
}

/**
 * Where a corner of the blueprint actually sits on the floor, rotation
 * included. `ix`/`iy` are 0 for the left/top edge and 1 for the right/bottom,
 * so (0,0) is the top-left corner and (1,1) the bottom-right.
 *
 * Resize drags pin the corner opposite the one being dragged, which needs
 * that corner's true position rather than its unrotated one.
 */
export function cornerWorld(bp: BlueprintPlacement, ix: 0 | 1, iy: 0 | 1): { x: number; y: number } {
  const cx = bp.x + bp.width / 2;
  const cy = bp.y + bp.height / 2;
  const dx = bp.x + ix * bp.width - cx;
  const dy = bp.y + iy * bp.height - cy;

  const rad = ((bp.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

/** The four corners, in drag-handle order: TL, TR, BR, BL. */
export const BLUEPRINT_CORNERS: Array<{ ix: 0 | 1; iy: 0 | 1; cursor: string }> = [
  { ix: 0, iy: 0, cursor: 'nwse-resize' },
  { ix: 1, iy: 0, cursor: 'nesw-resize' },
  { ix: 1, iy: 1, cursor: 'nwse-resize' },
  { ix: 0, iy: 1, cursor: 'nesw-resize' },
];
