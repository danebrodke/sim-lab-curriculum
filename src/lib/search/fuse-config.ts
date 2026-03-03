import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Session } from '@/types/database';

export const fuseOptions: IFuseOptions<Session> = {
  keys: [
    { name: 'topic', weight: 0.35 },
    { name: 'faculty', weight: 0.2 },
    { name: 'vendor', weight: 0.15 },
    { name: 'tissue', weight: 0.1 },
    { name: 'equipment', weight: 0.1 },
    { name: 'vendor_contacts.name', weight: 0.05 },
    { name: 'collaboration', weight: 0.05 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  includeScore: true,
};

export function createSessionSearchIndex(sessions: Session[]): Fuse<Session> {
  return new Fuse(sessions, fuseOptions);
}
