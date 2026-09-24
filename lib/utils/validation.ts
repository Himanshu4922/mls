/**
 * Client-side auth validation.
 *
 * Mirrors what mls-v2 enforces so the user learns about a bad field immediately
 * instead of after a round trip:
 *  - `RegisterSerializer` (accounts/serializers.py:8) requires name, email,
 *    password and phone, and runs Django's `validate_password`
 *  - `AUTH_PASSWORD_VALIDATORS` is the Django default set: minimum length 8,
 *    not entirely numeric, not a common password, and not too similar to the
 *    user's other attributes
 *
 * This is a first line of defence, never the only one — the server still
 * validates, and its message wins when the two disagree (e.g. the common-password
 * list, which we cannot replicate client-side).
 */

export const PASSWORD_MIN_LENGTH = 8;

/** Matches Django's NumericPasswordValidator. */
const ALL_DIGITS = /^\d+$/;

/**
 * Deliberately permissive: the real check is the verification email. Rejecting
 * unusual but valid addresses is worse than letting the server decide.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The handful of passwords common enough to be worth catching before submit. */
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "letmein1",
  "welcome1",
  "iloveyou",
  "admin123",
  "abc12345",
  "football",
  "baseball",
  "sunshine",
  "princess",
  "trustno1",
]);

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "Enter your email address.";
  if (!EMAIL.test(email)) return "Enter a valid email address, like you@example.com.";
  return null;
}

export function validateName(value: string): string | null {
  const name = value.trim();
  if (!name) return "Enter your full name.";
  if (name.length < 2) return "Enter your full name.";
  return null;
}

/**
 * Phone is required by the backend but stored as free text, so we only check
 * that it could plausibly be a number — digit count, ignoring formatting.
 * A stricter NANP check would reject valid international numbers.
 */
export function validatePhone(value: string): string | null {
  const phone = value.trim();
  if (!phone) return "Enter a phone number.";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return "Enter a phone number including the area code.";
  if (digits.length > 15) return "That phone number looks too long.";
  return null;
}

/**
 * Sign-in only checks presence: an existing account may predate any rule we
 * apply now, and telling someone their correct password is "invalid" would be
 * both wrong and confusing.
 */
export function validatePasswordPresence(value: string): string | null {
  if (!value) return "Enter your password.";
  return null;
}

/** Registration — mirrors Django's default validator set. */
export function validateNewPassword(
  value: string,
  context: { email?: string; name?: string } = {},
): string | null {
  if (!value) return "Choose a password.";
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (ALL_DIGITS.test(value)) {
    return "Use more than just numbers — add letters too.";
  }
  if (COMMON_PASSWORDS.has(value.toLowerCase())) {
    return "That password is too common. Choose something less predictable.";
  }

  // UserAttributeSimilarityValidator — catch the obvious cases only.
  const lowered = value.toLowerCase();
  const emailLocal = context.email?.split("@")[0]?.trim().toLowerCase();
  if (emailLocal && emailLocal.length >= 3 && lowered.includes(emailLocal)) {
    return "Your password should not contain your email address.";
  }
  const firstName = context.name?.trim().split(/\s+/)[0]?.toLowerCase();
  if (firstName && firstName.length >= 3 && lowered.includes(firstName)) {
    return "Your password should not contain your name.";
  }

  return null;
}

/** Rough strength signal for the registration meter. Not a security control. */
export type PasswordStrength = "weak" | "fair" | "strong";

export function passwordStrength(value: string): PasswordStrength {
  if (value.length < PASSWORD_MIN_LENGTH) return "weak";

  let score = 0;
  if (value.length >= 12) score += 1;
  if (value.length >= 16) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score >= 4) return "strong";
  if (score >= 2) return "fair";
  return "weak";
}
