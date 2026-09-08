/**
 * Validation for the public booking form.
 *
 * This is the one endpoint an unauthenticated stranger can write through, so
 * every field is trimmed, length-capped, and shape-checked. Without caps a
 * single request could push megabytes of text into a row.
 */

export const FIELD_LIMITS = {
  name: 120,
  phone: 32,
  email: 200,
  business: 160,
  notes: 2000,
} as const;

export interface BookingInput {
  name: string;
  phone: string;
  email: string;
  business: string;
  notes: string;
}

/**
 * Exactly one side is populated. A plain pair rather than a discriminated
 * union because this project compiles with `strict: false`, where narrowing
 * on a literal-boolean tag is unreliable.
 */
export interface BookingValidation {
  values: BookingInput | null;
  error: string | null;
}

const invalid = (error: string): BookingValidation => ({ values: null, error });

/** Deliberately loose: enough to catch a typo, not to adjudicate RFC 5322. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateBookingInput(body: any): BookingValidation {
  const src = body && typeof body === 'object' ? body : {};

  const name = String(src.customer_name ?? '').trim();
  const phone = String(src.customer_phone ?? '').trim();
  const email = String(src.customer_email ?? '').trim();
  const business = String(src.business_name ?? '').trim();
  const notes = String(src.notes ?? '').trim();

  if (!name) return invalid('Your name is required');
  if (!phone) return invalid('A phone number is required');

  if (name.length > FIELD_LIMITS.name) return invalid(`Name must be ${FIELD_LIMITS.name} characters or fewer`);
  if (phone.length > FIELD_LIMITS.phone) return invalid(`Phone number must be ${FIELD_LIMITS.phone} characters or fewer`);
  if (email.length > FIELD_LIMITS.email) return invalid(`Email must be ${FIELD_LIMITS.email} characters or fewer`);
  if (business.length > FIELD_LIMITS.business) return invalid(`Company name must be ${FIELD_LIMITS.business} characters or fewer`);
  if (notes.length > FIELD_LIMITS.notes) return invalid(`Notes must be ${FIELD_LIMITS.notes} characters or fewer`);

  // Enough digits to be a real number, whatever separators were typed
  if (phone.replace(/\D/g, '').length < 6) {
    return invalid('That phone number does not look valid');
  }

  if (email && !EMAIL_SHAPE.test(email)) {
    return invalid('That email address does not look valid');
  }

  return { values: { name, phone, email, business, notes }, error: null };
}
