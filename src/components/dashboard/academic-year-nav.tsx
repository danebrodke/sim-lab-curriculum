'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AcademicYear } from '@/types/database';

interface AcademicYearNavProps {
  selectedYear: AcademicYear | null;
  onNavigate: (direction: 'prev' | 'next') => void;
  canNavigate: (direction: 'prev' | 'next') => boolean;
}

export function AcademicYearNav({ selectedYear, onNavigate, canNavigate }: AcademicYearNavProps) {
  if (!selectedYear) return null;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onNavigate('prev')}
        disabled={!canNavigate('prev')}
        aria-label="Previous academic year"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-semibold tabular-nums min-w-[90px] text-center">
        {selectedYear.label}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onNavigate('next')}
        disabled={!canNavigate('next')}
        aria-label="Next academic year"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
