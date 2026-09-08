import { describe, it, expect } from 'vitest';
import { Units, MAX_HALL_FT, MIN_HALL_FT, STALL_MAX_FT, STALL_MIN_FT } from '@/lib/units';

describe('feet ↔ drawing units', () => {
  it('round-trips a whole number of feet', () => {
    expect(Units.pxToFt(Units.ftToPx(37))).toBe(37);
  });

  it('treats junk as zero rather than NaN', () => {
    expect(Units.ftToPx(NaN)).toBe(0);
    expect(Units.ftToPx(undefined as any)).toBe(0);
    expect(Units.pxToFt('abc' as any)).toBe(0);
  });
});

describe('toFeet', () => {
  it('parses numeric strings', () => {
    expect(Units.toFeet('12.5')).toBe(12.5);
  });

  it('uses the fallback for empty or unparseable input', () => {
    expect(Units.toFeet('', 9)).toBe(9);
    expect(Units.toFeet(null, 9)).toBe(9);
    expect(Units.toFeet(undefined, 9)).toBe(9);
    expect(Units.toFeet('abc', 9)).toBe(9);
  });

  it('rounds to the nearest hundredth of a foot', () => {
    expect(Units.toFeet(1.239)).toBe(1.24);
  });
});

describe('formatting', () => {
  it.each([
    [5, '5 ft'],
    [0.5, '6 in'],
    [5.5, '5 ft 6 in'],
    [0, '0 ft'],
  ])('formatFeet(%s) → %s', (ft, expected) => {
    expect(Units.formatFeet(ft)).toBe(expected);
  });

  it.each([
    [5, "5'"],
    [0.5, '6"'],
    [5.5, `5'6"`],
  ])('formatFeetShort(%s) → %s', (ft, expected) => {
    expect(Units.formatFeetShort(ft)).toBe(expected);
  });

  it('formats dimensions and area', () => {
    expect(Units.formatDims(6, 4)).toBe(`6' × 4'`);
    expect(Units.formatArea(70, 37)).toBe('2,590 sq ft');
  });
});

describe('roundFt', () => {
  it('defaults to two decimals', () => {
    expect(Units.roundFt(1.2345)).toBe(1.23);
  });

  it('honours an explicit precision', () => {
    expect(Units.roundFt(1.2345, 3)).toBe(1.235);
    expect(Units.roundFt(1.6, 0)).toBe(2);
  });
});

describe('clamping', () => {
  it('keeps halls within the range the database accepts', () => {
    expect(Units.clampHallFt(5)).toBe(MIN_HALL_FT);
    expect(Units.clampHallFt(99999)).toBe(MAX_HALL_FT);
    expect(Units.clampHallFt(70)).toBe(70);
  });

  it('keeps stalls within the range the database accepts', () => {
    expect(Units.clampStallFt(0.1)).toBe(STALL_MIN_FT);
    expect(Units.clampStallFt(99999)).toBe(STALL_MAX_FT);
    expect(Units.clampStallFt(6)).toBe(6);
  });

  it('uses the fallback when the value is not a number', () => {
    expect(Units.clampHallFt('abc', 42)).toBe(42);
    expect(Units.clampStallFt(undefined, 7)).toBe(7);
  });

  /**
   * These bounds are mirrored from the CHECK constraints in lib/db.ts. If the
   * app clamps tighter than the database, a legitimate value gets silently
   * shrunk before it is ever stored.
   */
  it('is no tighter than the database CHECK constraints', () => {
    expect(MIN_HALL_FT).toBe(10);
    expect(MAX_HALL_FT).toBe(600);
    expect(STALL_MIN_FT).toBe(1);
    expect(STALL_MAX_FT).toBe(200);
  });

  it('accepts a stall larger than the old 60 ft ceiling', () => {
    expect(Units.clampStallFt(120)).toBe(120);
  });
});
