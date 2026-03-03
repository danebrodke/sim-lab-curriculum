'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { useUser } from '@/hooks/use-user';
import { useSessions } from '@/hooks/use-sessions';
import { useAcademicYears } from '@/hooks/use-academic-years';
import { useSearch } from '@/hooks/use-search';
import { createClient } from '@/lib/supabase/client';
import { AcademicYearNav } from '@/components/dashboard/academic-year-nav';
import { SearchBar } from '@/components/dashboard/search-bar';
import { SessionTable, useScrollToDate } from '@/components/dashboard/session-table';
import { SessionEditDialog } from '@/components/dashboard/session-edit-dialog';
import { CalendarGrid } from '@/components/dashboard/calendar-grid';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Plus } from 'lucide-react';
import { canEdit } from '@/lib/auth/roles';
import { exportSessionsToCSV } from '@/lib/csv/exporter';
import type { Session, SessionType, Attachment } from '@/types/database';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { profile, loading: userLoading } = useUser();
  const { selectedYear, navigateYear, canNavigate, loading: yearsLoading } = useAcademicYears();
  const role = profile?.role || 'viewer';
  const { sessions, loading: sessionsLoading, updateSession, createSession, deleteSession } = useSessions(
    selectedYear?.id || null,
    role
  );
  const [viewFilter, setViewFilter] = useState<'simulation' | 'all'>('simulation');
  const typedSessions = useMemo(() => {
    if (viewFilter === 'all') return sessions;
    return sessions.filter(s => s.session_type !== 'other');
  }, [sessions, viewFilter]);
  const { query, setQuery, filteredSessions } = useSearch(typedSessions);
  const scrollToDate = useScrollToDate();
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, Attachment[]>>({});
  const [attachmentsVersion, setAttachmentsVersion] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const [navbarCenter, setNavbarCenter] = useState<Element | null>(null);

  // Portal target for year nav in the navbar
  useEffect(() => {
    setNavbarCenter(document.getElementById('navbar-center'));
  }, []);

  // Fetch attachments for all displayed sessions
  const sessionIds = useMemo(() => sessions.map(s => s.id).sort().join(','), [sessions]);
  useEffect(() => {
    if (!sessionIds) { setAttachmentsMap({}); return; }
    const fetchAttachments = async () => {
      const supabase = createClient();
      const ids = sessionIds.split(',');
      const { data } = await supabase
        .from('attachments')
        .select('*')
        .in('session_id', ids)
        .order('created_at', { ascending: false });
      if (data) {
        const map: Record<string, Attachment[]> = {};
        for (const att of data as Attachment[]) {
          if (!map[att.session_id]) map[att.session_id] = [];
          map[att.session_id].push(att);
        }
        setAttachmentsMap(map);
      }
    };
    fetchAttachments();
  }, [sessionIds, attachmentsVersion]);

  // Auto-scroll table to current date on load and year change
  useEffect(() => {
    if (sessionsLoading || sessions.length === 0 || !tableRef.current) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const target = sessions.find(s => s.session_date >= today) || sessions[sessions.length - 1];
    if (!target) return;
    requestAnimationFrame(() => {
      const row = tableRef.current?.querySelector(`tr[data-date="${target.session_date}"]`);
      if (row) row.scrollIntoView({ block: 'center', behavior: 'auto' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionsLoading, selectedYear?.id]);

  const handleDateClick = (date: string) => {
    setHighlightedDate(date);
    scrollToDate(date);
    setTimeout(() => setHighlightedDate(null), 2500);
  };

  const handleDownloadCSV = () => {
    const csv = exportSessionsToCSV(filteredSessions, role);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sim-lab-${selectedYear?.label || 'schedule'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const handleCreateSession = async (data: Partial<Session>) => {
    if (!selectedYear || !data.session_date) return;
    const newSession = {
      academic_year_id: selectedYear.id,
      session_date: data.session_date,
      session_type: data.session_type ?? 'simulation' as SessionType,
      topic: data.topic ?? null,
      faculty: data.faculty ?? [],
      vendor: data.vendor ?? null,
      vendor_contacts: data.vendor_contacts ?? [],
      equipment: data.equipment ?? [],
      tissue: data.tissue ?? null,
      bdp_superficial: data.bdp_superficial ?? null,
      bdp_compartments: data.bdp_compartments ?? null,
      bdp_bony_structures: data.bdp_bony_structures ?? null,
      bdp_vasculature: data.bdp_vasculature ?? null,
      collaboration: data.collaboration ?? null,
      notes: data.notes ?? null,
      sort_order: 0,
    };
    const { error } = await createSession(newSession as Omit<Session, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>);
    if (error) toast.error('Failed to create session');
    else {
      toast.success('Session created');
      setCreating(false);
    }
  };

  const startYear = selectedYear ? parseInt(selectedYear.label.split('-')[0]) : new Date().getFullYear();
  const loading = userLoading || yearsLoading || sessionsLoading;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Portal: year nav into the navbar center */}
      {navbarCenter && selectedYear && createPortal(
        <AcademicYearNav
          selectedYear={selectedYear}
          onNavigate={navigateYear}
          canNavigate={canNavigate}
        />,
        navbarCenter
      )}

      {/* Controls row */}
      <div className="shrink-0 px-4 lg:px-6 py-3">
        <div className="flex items-center justify-center gap-3">
          <div className="flex rounded-md border overflow-hidden h-8 shrink-0">
            <button
              className={`px-3 text-xs font-medium transition-colors ${
                viewFilter === 'simulation'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted text-muted-foreground'
              }`}
              onClick={() => setViewFilter('simulation')}
            >
              Simulation
            </button>
            <button
              className={`px-3 text-xs font-medium transition-colors ${
                viewFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted text-muted-foreground'
              }`}
              onClick={() => setViewFilter('all')}
            >
              All Sessions
            </button>
          </div>
          <div className="hidden lg:block w-96 shrink-0">
            <SearchBar value={query} onChange={setQuery} />
          </div>
          {canEdit(role) && (
            <Button variant="outline" size="sm" className="hidden lg:inline-flex" onClick={() => setCreating(true)} disabled={loading}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add
            </Button>
          )}
          <Button variant="outline" size="sm" className="hidden lg:inline-flex" onClick={handleDownloadCSV} disabled={loading}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* Split panels - independent scrolling */}
      <div className="flex-1 flex gap-6 px-4 lg:px-6 pb-4 overflow-hidden min-h-0">
        {/* Table panel */}
        <div ref={tableRef} className="flex-1 overflow-auto min-w-0 border rounded-lg">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <SessionTable
              sessions={filteredSessions}
              role={role}
              highlightedDate={highlightedDate}
              attachments={attachmentsMap}
              showAllTypes={viewFilter === 'all'}
              onUpdate={updateSession}
              onDelete={deleteSession}
              onSessionSaved={() => setAttachmentsVersion(v => v + 1)}
            />
          )}
        </div>

        {/* Calendar panel - polished box with breathing room */}
        <div className="hidden lg:block w-[250px] xl:w-[270px] shrink-0">
          <div className="border rounded-lg bg-background h-full flex flex-col overflow-hidden">
            <div className="shrink-0 border-b bg-muted/50 h-10 px-2 flex items-center justify-center">
              <span className="text-sm font-medium text-foreground">Calendar</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <CalendarGrid
                startYear={startYear}
                sessions={typedSessions}
                onDateClick={handleDateClick}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Create session dialog */}
      {creating && selectedYear && (
        <SessionEditDialog
          academicYearId={selectedYear.id}
          open={creating}
          onOpenChange={(open) => { if (!open) setCreating(false); }}
          onSave={handleCreateSession}
        />
      )}
    </div>
  );
}
