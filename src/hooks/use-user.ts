'use client';

import { useEffect, useState, useCallback } from 'react';
import { authClient } from '@/lib/auth-client';
import type { Profile } from '@/types/database';

export function useUser() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const res = await fetch('/api/me');
    setProfile(res.ok ? ((await res.json()) as Profile) : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const signOut = async () => {
    await authClient.signOut();
    window.location.href = '/login';
  };

  return { profile, loading, signOut, refetch: fetchProfile };
}
