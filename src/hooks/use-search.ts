'use client';

import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { fuseOptions } from '@/lib/search/fuse-config';
import type { Session } from '@/types/database';

export function useSearch(sessions: Session[]) {
  const [query, setQuery] = useState('');

  const fuse = useMemo(() => new Fuse(sessions, fuseOptions), [sessions]);

  const filteredSessions = useMemo(() => {
    if (!query.trim()) return sessions;
    return fuse.search(query).map(result => result.item);
  }, [query, sessions, fuse]);

  return { query, setQuery, filteredSessions };
}
