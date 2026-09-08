import { describe, it, expect } from 'vitest';
import { FIELD_LIMITS, validateBookingInput } from '@/lib/bookingInput';

const valid = {
  customer_name: '  Aditi Trivedi ',
  customer_phone: '79908 83999',
  customer_email: ' aditi@example.com ',
  business_name: ' Artisan Crafts Studio ',
  notes: ' 2 power sockets, near main aisle ',
};

const check = (over: Record<string, unknown> = {}) => validateBookingInput({ ...valid, ...over });
const accepted = (over: Record<string, unknown> = {}) => check(over).error === null;

describe('validateBookingInput', () => {
  it('accepts a complete booking and trims every field', () => {
    const { values, error } = check();
    expect(error).toBeNull();
    expect(values).toEqual({
      name: 'Aditi Trivedi',
      phone: '79908 83999',
      email: 'aditi@example.com',
      business: 'Artisan Crafts Studio',
      notes: '2 power sockets, near main aisle',
    });
  });

  it('accepts a booking with only the required fields', () => {
    const { values, error } = validateBookingInput({ customer_name: 'A', customer_phone: '9876543210' });
    expect(error).toBeNull();
    expect(values).toMatchObject({ email: '', business: '', notes: '' });
  });

  it.each([
    ['a missing name', { customer_name: '' }],
    ['a whitespace-only name', { customer_name: '   ' }],
    ['a missing phone', { customer_phone: '' }],
  ])('rejects %s', (_label, over) => {
    expect(accepted(over)).toBe(false);
  });

  it('rejects a phone with too few digits to be real', () => {
    expect(accepted({ customer_phone: '12345' })).toBe(false);
    expect(accepted({ customer_phone: 'call me' })).toBe(false);
  });

  it('accepts a phone written with separators or a country code', () => {
    expect(accepted({ customer_phone: '+91 79908-83999' })).toBe(true);
    expect(accepted({ customer_phone: '(079) 9088 3999' })).toBe(true);
  });

  it('rejects a malformed email but allows none at all', () => {
    expect(accepted({ customer_email: 'not-an-email' })).toBe(false);
    expect(accepted({ customer_email: 'a@b' })).toBe(false);
    expect(accepted({ customer_email: 'a b@c.com' })).toBe(false);
    expect(accepted({ customer_email: '' })).toBe(true);
  });

  /** Caps are the point: an uncapped public endpoint is a free write primitive. */
  it.each([
    ['name', 'customer_name', FIELD_LIMITS.name],
    ['phone', 'customer_phone', FIELD_LIMITS.phone],
    ['business', 'business_name', FIELD_LIMITS.business],
    ['notes', 'notes', FIELD_LIMITS.notes],
  ])('caps %s at its limit', (_label, field, limit) => {
    // Digits keep the phone case passing its own sanity check
    expect(accepted({ [field]: '9'.repeat(limit) })).toBe(true);
    expect(accepted({ [field]: '9'.repeat(limit + 1) })).toBe(false);
  });

  it('caps a long email even when it is well formed', () => {
    expect(accepted({ customer_email: 'a'.repeat(FIELD_LIMITS.email) + '@example.com' })).toBe(false);
  });

  it('coerces non-string input rather than throwing', () => {
    expect(validateBookingInput({ customer_name: 123, customer_phone: 9876543210 }).error).toBeNull();
    expect(validateBookingInput(null).error).toBeTruthy();
    expect(validateBookingInput(undefined).error).toBeTruthy();
    expect(validateBookingInput('nope').error).toBeTruthy();
  });

  it('never returns both a value and an error', () => {
    const bad = check({ customer_name: '' });
    expect(bad.values).toBeNull();
    expect(bad.error).toBeTruthy();

    const good = check();
    expect(good.values).not.toBeNull();
    expect(good.error).toBeNull();
  });

  it('reports a specific reason, not a generic failure', () => {
    expect(check({ customer_name: '' }).error).toMatch(/name/i);
    expect(check({ customer_email: 'bad' }).error).toMatch(/email/i);
  });
});
