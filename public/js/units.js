/**
 * TableBook — Real-World Units
 *
 * Feet are the unit of truth. Every dimension persisted in the database
 * (hall size, stall size, stall position) is stored in feet.
 *
 * The SVG floor plans draw in a "drawing unit" space where
 * 1 foot === PX_PER_FOOT drawing units. Nothing outside a renderer should
 * ever deal in drawing units — convert at the render boundary with ftToPx().
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.Units = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // Drawing scale: 15 drawing units per foot.
  const PX_PER_FOOT = 15;

  // Sane real-world bounds for an exhibition hall.
  const HALL_MIN_FT = 10;
  const HALL_MAX_FT = 600;
  const DEFAULT_HALL_WIDTH_FT = 80;
  const DEFAULT_HALL_HEIGHT_FT = 55;

  // Sane real-world bounds for a single stall.
  const STALL_MIN_FT = 1;
  const STALL_MAX_FT = 200;
  const DEFAULT_STALL_WIDTH_FT = 6;
  const DEFAULT_STALL_HEIGHT_FT = 4;

  function ftToPx(ft) {
    return (Number(ft) || 0) * PX_PER_FOOT;
  }

  function pxToFt(px) {
    return (Number(px) || 0) / PX_PER_FOOT;
  }

  /**
   * Feet are stored to the nearest 1/4 inch — finer precision is noise.
   * The second rounding trims the floating-point tail so values stay
   * presentable in a number input (53.3333 rather than 53.333333333333336).
   */
  function roundFt(ft) {
    const quarterInches = Math.round((Number(ft) || 0) * 48);
    return Math.round((quarterInches / 48) * 10000) / 10000;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /** Coerce anything to a usable measurement in feet, falling back when unusable. */
  function toFeet(value, fallback) {
    const n = typeof value === 'number' ? value : parseFloat(value);
    if (!isFinite(n)) return fallback;
    return n;
  }

  function clampHallFt(value, fallback) {
    const n = toFeet(value, fallback);
    return roundFt(clamp(n, HALL_MIN_FT, HALL_MAX_FT));
  }

  function clampStallFt(value, fallback) {
    const n = toFeet(value, fallback);
    return roundFt(clamp(n, STALL_MIN_FT, STALL_MAX_FT));
  }

  /** Split feet into whole feet plus remaining inches (rounded to the inch). */
  function splitFeetInches(ft) {
    const total = Math.round((Number(ft) || 0) * 12);
    return { feet: Math.trunc(total / 12), inches: Math.abs(total % 12) };
  }

  /** "12 ft" / "12 ft 6 in" — for labels with room to breathe. */
  function formatFeet(ft) {
    const { feet, inches } = splitFeetInches(ft);
    if (!inches) return `${feet} ft`;
    return `${feet} ft ${inches} in`;
  }

  /** "12'" / "12'6\"" — architectural shorthand for tight spaces like map labels. */
  function formatFeetShort(ft) {
    const { feet, inches } = splitFeetInches(ft);
    if (!inches) return `${feet}'`;
    return `${feet}'${inches}"`;
  }

  /** "6 ft × 4 ft" */
  function formatDims(widthFt, heightFt) {
    return `${formatFeet(widthFt)} × ${formatFeet(heightFt)}`;
  }

  /** "24 sq ft" */
  function formatArea(widthFt, heightFt) {
    const area = (Number(widthFt) || 0) * (Number(heightFt) || 0);
    const rounded = area < 10 ? Math.round(area * 10) / 10 : Math.round(area);
    return `${rounded.toLocaleString('en-IN')} sq ft`;
  }

  return {
    PX_PER_FOOT,
    HALL_MIN_FT,
    HALL_MAX_FT,
    STALL_MIN_FT,
    STALL_MAX_FT,
    DEFAULT_HALL_WIDTH_FT,
    DEFAULT_HALL_HEIGHT_FT,
    DEFAULT_STALL_WIDTH_FT,
    DEFAULT_STALL_HEIGHT_FT,
    ftToPx,
    pxToFt,
    roundFt,
    clamp,
    toFeet,
    clampHallFt,
    clampStallFt,
    splitFeetInches,
    formatFeet,
    formatFeetShort,
    formatDims,
    formatArea
  };
});
