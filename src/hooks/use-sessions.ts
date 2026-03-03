'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Session, UserRole } from '@/types/database';
import { VIEWER_FIELDS, EDITOR_FIELDS } from '@/types/database';
import { canViewRestrictedFields } from '@/lib/auth/roles';

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
    const supabase = createClient();
    const fields = canViewRestrictedFields(role) ? EDITOR_FIELDS : VIEWER_FIELDS;

    const { data, error } = await supabase
      .from('sessions')
      .select(fields.join(', '))
      .eq('academic_year_id', academicYearId)
      .order('session_date', { ascending: true });

    if (!error && data) {
      setSessions(data as unknown as Session[]);
    }
    setLoading(false);
  }, [academicYearId, role]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const updateSession = async (id: string, updates: Partial<Session>) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id);

    if (!error) {
      await fetchSessions();
    }
    return { error };
  };

  const createSession = async (session: Omit<Session, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('sessions')
      .insert(session);

    if (!error) {
      await fetchSessions();
    }
    return { error };
  };

  const deleteSession = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (!error) {
      await fetchSessions();
    }
    return { error };
  };

  return { sessions, loading, refetch: fetchSessions, updateSession, createSession, deleteSession };
}
