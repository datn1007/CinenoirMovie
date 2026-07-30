export const isBlank = (value: string | undefined | null) => !value || !value.trim();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (value: string) => EMAIL_REGEX.test(value.trim());

// Vietnamese mobile numbers: optional +84/84 prefix or leading 0, then a valid
// carrier digit (3/5/7/8/9) and 8 more digits — e.g. 0912345678, +84912345678.
const VN_PHONE_REGEX = /^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/;
export const isValidVietnamesePhone = (value: string) => VN_PHONE_REGEX.test(value.trim());

export const isNameLike = (value: string) => /^[\p{L}\s.'-]+$/u.test(value.trim());

export const isNotFutureDate = (value: string) => {
  if (isBlank(value)) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
};

export const isDateRangeValid = (start: string, end: string) => {
  if (isBlank(start) || isBlank(end)) return true;
  return new Date(start) <= new Date(end);
};

export interface PasswordCheck {
  minLength: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export type PasswordStrength = "empty" | "weak" | "medium" | "strong" | "very-strong";

export const checkPassword = (password: string): PasswordCheck => ({
  minLength: password.length >= 8,
  hasLower: /[a-z]/.test(password),
  hasUpper: /[A-Z]/.test(password),
  hasNumber: /[0-9]/.test(password),
  hasSpecial: /[^A-Za-z0-9]/.test(password),
});

export const getPasswordStrength = (password: string): PasswordStrength => {
  if (!password) return "empty";
  const checks = checkPassword(password);
  const categoryCount = [checks.hasLower, checks.hasUpper, checks.hasNumber, checks.hasSpecial].filter(Boolean).length;

  if (!checks.minLength || categoryCount <= 1) return "weak";
  if (categoryCount === 2) return "medium";
  if (categoryCount === 3) return "strong";
  return password.length >= 12 ? "very-strong" : "strong";
};

// Minimum bar to allow registration: at least 8 characters and at least 3 of
// the 4 character classes (lower/upper/number/special), matching what most
// sites (Google, Microsoft, GitHub, ...) require before accepting a password.
export const isPasswordStrongEnough = (password: string) => {
  const checks = checkPassword(password);
  const categoryCount = [checks.hasLower, checks.hasUpper, checks.hasNumber, checks.hasSpecial].filter(Boolean).length;
  return checks.minLength && categoryCount >= 3;
};

export const PASSWORD_STRENGTH_LABEL: Record<PasswordStrength, string> = {
  empty: "",
  weak: "Yếu",
  medium: "Trung bình",
  strong: "Khá mạnh",
  "very-strong": "Rất mạnh",
};
