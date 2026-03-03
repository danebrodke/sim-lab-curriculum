import type { UserRole } from '@/types/database';

export function canEdit(role: UserRole): boolean {
  return role === 'editor' || role === 'admin';
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

export function canViewRestrictedFields(role: UserRole): boolean {
  return role === 'editor' || role === 'admin';
}
