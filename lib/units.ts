/**
 * Architectural Feet <-> SVG Drawing Units Scale and Measurement Helpers
 */
export const PX_PER_FOOT = 12;

export const DEFAULT_HALL_WIDTH_FT = 50;
export const DEFAULT_HALL_HEIGHT_FT = 30;
export const MIN_HALL_FT = 10;
export const MAX_HALL_FT = 500;

export const DEFAULT_STALL_WIDTH_FT = 4;
export const DEFAULT_STALL_HEIGHT_FT = 2;
export const STALL_MIN_FT = 1;
export const STALL_MAX_FT = 60;

export const Units = {
  PX_PER_FOOT,
  DEFAULT_HALL_WIDTH_FT,
  DEFAULT_HALL_HEIGHT_FT,
  MIN_HALL_FT,
  MAX_HALL_FT,
  DEFAULT_STALL_WIDTH_FT,
  DEFAULT_STALL_HEIGHT_FT,
  STALL_MIN_FT,
  STALL_MAX_FT,

  ftToPx(ft: number): number {
    return Math.round((Number(ft) || 0) * PX_PER_FOOT * 100) / 100;
  },

  pxToFt(px: number): number {
    return Math.round(((Number(px) || 0) / PX_PER_FOOT) * 100) / 100;
  },

  toFeet(val: any, fallback = 0): number {
    if (val === null || val === undefined || val === '') return fallback;
    const n = parseFloat(val);
    return isNaN(n) ? fallback : Math.round(n * 100) / 100;
  },

  formatFeet(ft: number): string {
    const totalInches = Math.round((Number(ft) || 0) * 12);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    if (inches === 0) return `${feet} ft`;
    if (feet === 0) return `${inches} in`;
    return `${feet} ft ${inches} in`;
  },

  formatFeetShort(ft: number): string {
    const totalInches = Math.round((Number(ft) || 0) * 12);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    if (inches === 0) return `${feet}'`;
    if (feet === 0) return `${inches}"`;
    return `${feet}'${inches}"`;
  },

  formatDims(widthFt: number, heightFt: number): string {
    return `${this.formatFeetShort(widthFt)} × ${this.formatFeetShort(heightFt)}`;
  },

  formatArea(widthFt: number, heightFt: number): string {
    const sqFt = Math.round((Number(widthFt) || 0) * (Number(heightFt) || 0));
    return `${sqFt.toLocaleString('en-IN')} sq ft`;
  },

  roundFt(ft: number, decimals = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round((Number(ft) || 0) * factor) / factor;
  },

  clampHallFt(val: any, fallback = DEFAULT_HALL_WIDTH_FT): number {
    const n = parseFloat(val);
    if (isNaN(n)) return fallback;
    return Math.max(MIN_HALL_FT, Math.min(MAX_HALL_FT, Math.round(n * 100) / 100));
  },

  clampStallFt(val: any, fallback = DEFAULT_STALL_WIDTH_FT): number {
    const n = parseFloat(val);
    if (isNaN(n)) return fallback;
    return Math.max(STALL_MIN_FT, Math.min(STALL_MAX_FT, Math.round(n * 100) / 100));
  },
};
