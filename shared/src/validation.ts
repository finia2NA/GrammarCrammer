const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
    return 'Password must contain at least one letter and one number.';
  return null;
}
