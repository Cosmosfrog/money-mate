/**
 * India-friendly phone helpers for Better Auth phoneNumber OTP.
 * Accepts +91… or a 10-digit mobile; normalizes to E.164 (+91…).
 */

/** Strip spaces, dashes, parentheses. */
export function stripPhoneNoise(raw: string): string {
  return raw.trim().replace(/[\s\-().]/g, "");
}

/**
 * Normalize to E.164 for India (+91XXXXXXXXXX), or null if invalid.
 * Accepts: +91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX (10 digits).
 */
export function normalizeIndiaPhone(raw: string): string | null {
  let digits = stripPhoneNoise(raw);
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  if (digits.startsWith("91") && digits.length === 12) {
    // already country-coded without +
  } else if (/^[6-9]\d{9}$/.test(digits)) {
    digits = `91${digits}`;
  } else {
    return null;
  }
  if (!/^91[6-9]\d{9}$/.test(digits)) return null;
  return `+${digits}`;
}

/** Better Auth phoneNumberValidator — true for valid India mobiles. */
export function isValidIndiaPhone(phoneNumber: string): boolean {
  return normalizeIndiaPhone(phoneNumber) !== null;
}

/** Digits-only for temp email local-part. */
export function phoneDigits(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, "");
}

export function tempPhoneEmail(phoneNumber: string): string {
  return `${phoneDigits(phoneNumber)}@phone.moneymate.local`;
}
