'use client';

import { useMemo, useRef, useEffect } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
} from 'date-fns';
import { cn } from '@/lib/utils';
import type { Session } from '@/types/database';

interface CalendarGridProps {
  startYear: number;
  sessions: Session[];
  onDateClick: (date: string) => void;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function CalendarGrid({ startYear, sessions, onDateClick }: CalendarGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const months = useMemo(() => {
    const start = new Date(startYear, 6, 1); // July
    return Array.from({ length: 12 }, (_, i) => addMonths(start, i));
  }, [startYear]);

  const sessionDates = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => {
      if (s.topic && s.topic.trim()) {
        set.add(s.session_date);
      }
    });
    return set;
  }, [sessions]);

  // Auto-scroll to current month on mount and year change
  useEffect(() => {
    if (!containerRef.current) return;
    const now = new Date();
    const currentMonthStr = format(now, 'yyyy-MM');
    const monthEl = containerRef.current.querySelector(`[data-month="${currentMonthStr}"]`);
    if (monthEl) {
      requestAnimationFrame(() => {
        monthEl.scrollIntoView({ block: 'start', behavior: 'auto' });
      });
    }
  }, [startYear]);

  return (
    <div ref={containerRef} className="grid grid-cols-1 gap-5">
      {months.map(month => (
        <CalendarMonth
          key={month.toISOString()}
          month={month}
          sessionDates={sessionDates}
          onDateClick={onDateClick}
        />
      ))}
    </div>
  );
}

interface CalendarMonthProps {
  month: Date;
  sessionDates: Set<string>;
  onDateClick: (date: string) => void;
}

function CalendarMonth({ month, sessionDates, onDateClick }: CalendarMonthProps) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  return (
    <div className="select-none" data-month={format(month, 'yyyy-MM')}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-1.5 px-0.5">
        {format(month, 'MMM yyyy')}
      </h3>
      <div className="grid grid-cols-7">
        {DAY_LABELS.map((label, i) => (
          <div key={i} className="flex items-center justify-center h-6 text-[11px] text-muted-foreground/60 font-medium">
            {label}
          </div>
        ))}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, new Date());
          const hasSession = sessionDates.has(dateStr);

          return (
            <div key={dateStr} className="flex items-center justify-center p-0.5">
              <button
                onClick={() => hasSession ? onDateClick(dateStr) : undefined}
                disabled={!hasSession}
                className={cn(
                  'relative w-7 h-7 flex items-center justify-center text-xs rounded-sm transition-colors',
                  !isCurrentMonth && 'text-muted-foreground/30',
                  isCurrentMonth && !hasSession && 'text-muted-foreground/70',
                  hasSession && 'font-bold text-primary cursor-pointer hover:bg-primary/10',
                  isToday && 'ring-1 ring-inset ring-primary/40',
                )}
              >
                {format(day, 'd')}
                {hasSession && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
