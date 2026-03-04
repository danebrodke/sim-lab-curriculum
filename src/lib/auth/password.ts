export interface PasswordValidation {
  valid: boolean;
  message: string | null;
}

export function validatePassword(password: string): PasswordValidation {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters.' };
  }
  if (password.length > 72) {
    return { valid: false, message: 'Password must be 72 characters or fewer.' };
  }
  return { valid: true, message: null };
}
