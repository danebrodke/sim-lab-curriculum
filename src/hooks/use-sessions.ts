'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Session, UserRole } from '@/types/database';

async function apiError(res: Response): Promise<{ error: string | null }> {
  if (res.ok) return { error: null };
  const body = await res.json().catch(() => ({}));
  return { error: body.error || res.statusText };
}

// `role` is kept in the signature so sessions refetch when the role changes
// (the API picks visible fields by role).
export function useSessions(academicYearId: string | null, role: UserRole) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!academicYearId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/sessions?year_id=${encodeURIComponent(academicYearId)}`);
    if (res.ok) {
      setSessions((await res.json()) as Session[]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYearId, role]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const updateSession = async (id: string, updates: Partial<Session>) => {
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const { error } = await apiError(res);
    if (!error) {
      await fetchSessions();
    }
    return { error };
  };

  const createSession = async (session: Omit<Session, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>) => {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    const { error } = await apiError(res);
    if (!error) {
      await fetchSessions();
    }
    return { error };
  };

  const deleteSession = async (id: string) => {
    const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    const { error } = await apiError(res);
    if (!error) {
      await fetchSessions();
    }
    return { error };
  };

  return { sessions, loading, refetch: fetchSessions, updateSession, createSession, deleteSession };
}
