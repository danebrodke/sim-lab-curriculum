'use client';

import { useEffect, useState, useCallback } from 'react';
import type { AcademicYear } from '@/types/database';
import { getCurrentAcademicYearLabel } from '@/lib/calendar/academic-year';

export function useAcademicYears() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchYears = useCallback(async () => {
    const res = await fetch('/api/academic-years');

    if (res.ok) {
      const typedYears = (await res.json()) as AcademicYear[];
      setYears(typedYears);

      // Prefer the academic year that contains today's date; fall back to the
      // admin-set is_current flag, then the most recent year.
      const currentLabel = getCurrentAcademicYearLabel();
      const current = typedYears.find(y => y.label === currentLabel) ||
                      typedYears.find(y => y.is_current) ||
                      typedYears[0];

      setCurrentYear(current || null);
      if (!selectedYear) {
        setSelectedYear(current || null);
      }
    }
    setLoading(false);
  }, [selectedYear]);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const navigateYear = (direction: 'prev' | 'next') => {
    if (!selectedYear) return;
    const currentIndex = years.findIndex(y => y.id === selectedYear.id);
    const targetIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex >= 0 && targetIndex < years.length) {
      setSelectedYear(years[targetIndex]);
    }
  };

  const canNavigate = (direction: 'prev' | 'next'): boolean => {
    if (!selectedYear) return false;
    const currentIndex = years.findIndex(y => y.id === selectedYear.id);
    return direction === 'prev' ? currentIndex < years.length - 1 : currentIndex > 0;
  };

  return {
    years,
    currentYear,
    selectedYear,
    setSelectedYear,
    navigateYear,
    canNavigate,
    loading,
    refetch: fetchYears,
  };
}
