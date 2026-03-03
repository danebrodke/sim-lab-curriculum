'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canEdit, isAdmin, canViewRestrictedFields } from '@/lib/auth/roles';
import type { Session, UserRole, Attachment } from '@/types/database';
import { FacultyBadges } from './faculty-badges';
import { VendorContactCards } from './vendor-contact-card';
import { EquipmentList } from './equipment-list';
import { SessionEditDialog } from './session-edit-dialog';
import { toast } from 'sonner';

/** Truncated text with tooltip on hover */
function CellText({ text, className }: { text: string | null; className?: string }) {
  if (!text) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('block truncate text-sm', className)}>{text}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm">
        <p className="whitespace-pre-wrap">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Column definitions with default widths
const BASE_COLUMNS = [
  { key: 'date', label: 'Date', defaultWidth: 76 },
  { key: 'topic', label: 'Topic', defaultWidth: 240 },
  { key: 'faculty', label: 'Faculty', defaultWidth: 100 },
  { key: 'vendor', label: 'Vendor', defaultWidth: 130 },
  { key: 'contact', label: 'Contact', defaultWidth: 150 },
  { key: 'files', label: 'Files', defaultWidth: 120, editorOnly: true },
  { key: 'equipment', label: 'Equipment', defaultWidth: 100 },
  { key: 'tissue', label: 'Tissue', defaultWidth: 220 },
] as const;

interface SessionTableProps {
  sessions: Session[];
  role: UserRole;
  highlightedDate: string | null;
  attachments: Record<string, Attachment[]>;
  showAllTypes?: boolean;
  onUpdate: (id: string, updates: Partial<Session>) => Promise<{ error: unknown }>;
  onDelete: (id: string) => Promise<{ error: unknown }>;
  onSessionSaved?: () => void;
}

export function SessionTable({ sessions, role, highlightedDate, attachments, showAllTypes, onUpdate, onDelete, onSessionSaved }: SessionTableProps) {
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const [otherExpanded, setOtherExpanded] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  // Column resize state
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const col of BASE_COLUMNS) map[col.key] = col.defaultWidth;
    map['other_toggle'] = 50;
    map['superficial'] = 160;
    map['compartments'] = 160;
    map['bony'] = 160;
    map['vasculature'] = 160;
    map['collaboration'] = 180;
    return map;
  });
  const resizing = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      const delta = e.clientX - resizing.current.startX;
      const newWidth = Math.max(50, resizing.current.startWidth + delta);
      setColWidths(prev => ({ ...prev, [resizing.current!.key]: newWidth }));
    };
    const onMouseUp = () => { resizing.current = null; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const startResize = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = { key, startX: e.clientX, startWidth: colWidths[key] || 100 };
  };

  const showRestricted = canViewRestrictedFields(role);
  const userCanEdit = canEdit(role);
  const userIsAdmin = isAdmin(role);
  const visibleColumns = BASE_COLUMNS.filter(col => !col.editorOnly || userCanEdit);

  const isHolidayOrEmpty = (s: Session) => {
    const topic = s.topic?.toLowerCase() || '';
    return !s.topic || topic.includes('holiday') || topic.includes('no planned conference') || topic.includes('skip');
  };

  const isDidacticOnly = (s: Session) => {
    const topic = s.topic?.toLowerCase() || '';
    return (
      topic.includes('oite') ||
      topic.includes('anatomy') ||
      topic.includes('didactic') ||
      topic.includes('lecture') ||
      topic.includes('review')
    ) && !s.vendor;
  };

  const handleDelete = async (session: Session) => {
    if (!confirm(`Delete the session on ${format(parseISO(session.session_date), 'MMM d, yyyy')}?`)) return;
    const { error } = await onDelete(session.id);
    if (error) toast.error('Failed to delete session');
    else {
      toast.success('Session deleted');
      setEditingSession(null);
      onSessionSaved?.();
    }
  };

  const handleDownloadAttachment = async (attachment: Attachment, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await fetch(`/api/attachments/${attachment.id}`);
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, '_blank');
    } else {
      toast.error('Download failed');
    }
  };

  /** Resize handle rendered inside each <th> */
  const ResizeHandle = ({ colKey }: { colKey: string }) => (
    <div
      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors"
      onMouseDown={(e) => startResize(colKey, e)}
    />
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Table style={{ tableLayout: 'fixed' }}>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow className="bg-muted/50">
            {visibleColumns.map(col => (
              <TableHead
                key={col.key}
                style={{ width: colWidths[col.key] }}
                className="relative whitespace-nowrap text-sm"
              >
                {col.label}
                <ResizeHandle colKey={col.key} />
              </TableHead>
            ))}
            {showRestricted && (
              <>
                <TableHead
                  style={{ width: otherExpanded ? colWidths['other_toggle'] : colWidths['other_toggle'] }}
                  className="relative cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap text-sm"
                  onClick={() => setOtherExpanded(!otherExpanded)}
                >
                  <span className="flex items-center gap-1">
                    <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', otherExpanded && 'rotate-90')} />
                    Other
                  </span>
                </TableHead>
                {otherExpanded && (
                  <>
                    <TableHead style={{ width: colWidths['superficial'] }} className="relative text-sm">
                      Superficial
                      <ResizeHandle colKey="superficial" />
                    </TableHead>
                    <TableHead style={{ width: colWidths['compartments'] }} className="relative text-sm">
                      Compartments
                      <ResizeHandle colKey="compartments" />
                    </TableHead>
                    <TableHead style={{ width: colWidths['bony'] }} className="relative text-sm">
                      Bony Structures
                      <ResizeHandle colKey="bony" />
                    </TableHead>
                    <TableHead style={{ width: colWidths['vasculature'] }} className="relative text-sm">
                      Vasculature
                      <ResizeHandle colKey="vasculature" />
                    </TableHead>
                    <TableHead style={{ width: colWidths['collaboration'] }} className="relative text-sm">
                      Collaboration
                      <ResizeHandle colKey="collaboration" />
                    </TableHead>
                  </>
                )}
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={20} className="h-32 text-center text-muted-foreground text-sm">
                No sessions found.
              </TableCell>
            </TableRow>
          ) : (
            sessions.map(session => {
              const holiday = isHolidayOrEmpty(session);
              const didactic = isDidacticOnly(session);
              const isOtherType = session.session_type === 'other';
              const isSimType = session.session_type === 'simulation';
              const date = parseISO(session.session_date);
              const isHighlighted = highlightedDate === session.session_date;
              const sessionAttachments = attachments[session.id] || [];

              return (
                <TableRow
                  key={session.id}
                  ref={(el) => { rowRefs.current[session.session_date] = el; }}
                  className={cn(
                    'transition-colors',
                    showAllTypes && isSimType && 'bg-muted/50',
                    holiday && 'bg-muted/30 text-muted-foreground',
                    didactic && !showAllTypes && 'bg-muted/20',
                    isOtherType && !holiday && !didactic && !showAllTypes && 'bg-muted/15',
                    isHighlighted && 'row-highlight',
                  )}
                  data-date={session.session_date}
                >
                  <TableCell className="overflow-hidden whitespace-nowrap tabular-nums">
                    <div className="font-medium text-sm">{format(date, 'MMM d')}</div>
                    <div className="text-muted-foreground text-xs">{format(date, 'EEE')}</div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'overflow-hidden',
                      userCanEdit && 'cursor-pointer hover:text-primary transition-colors',
                    )}
                    onClick={userCanEdit ? () => setEditingSession(session) : undefined}
                  >
                    <span
                      className={cn(
                        'block truncate text-sm',
                        !holiday && 'font-semibold',
                        holiday && 'italic',
                        userCanEdit && !holiday && 'underline decoration-dotted underline-offset-2',
                      )}
                      title={session.topic || ''}
                    >
                      {session.topic || '\u2014'}
                    </span>
                  </TableCell>
                  <TableCell className="overflow-hidden"><FacultyBadges faculty={session.faculty} /></TableCell>
                  <TableCell className="overflow-hidden"><CellText text={session.vendor} /></TableCell>
                  <TableCell className="overflow-hidden"><VendorContactCards contacts={session.vendor_contacts} /></TableCell>
                  {userCanEdit && (
                    <TableCell className="overflow-hidden">
                      {sessionAttachments.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {sessionAttachments.map(att => (
                            <Tooltip key={att.id}>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => handleDownloadAttachment(att, e)}
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 rounded px-1.5 py-0.5 text-left max-w-full"
                                >
                                  <Download className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{att.file_name}</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p>{att.file_name}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      ) : null}
                    </TableCell>
                  )}
                  <TableCell className="overflow-hidden"><EquipmentList equipment={session.equipment} /></TableCell>
                  <TableCell className="overflow-hidden">
                    <CellText text={session.tissue} />
                  </TableCell>
                  {showRestricted && (
                    <>
                      <TableCell className="overflow-hidden text-center">
                        {!otherExpanded && (session.bdp_superficial || session.bdp_compartments || session.bdp_bony_structures || session.bdp_vasculature || session.collaboration) ? (
                          <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40" title="Click Other to expand" />
                        ) : !otherExpanded ? '' : null}
                      </TableCell>
                      {otherExpanded && (
                        <>
                          <TableCell className="overflow-hidden"><CellText text={session.bdp_superficial} /></TableCell>
                          <TableCell className="overflow-hidden"><CellText text={session.bdp_compartments} /></TableCell>
                          <TableCell className="overflow-hidden"><CellText text={session.bdp_bony_structures} /></TableCell>
                          <TableCell className="overflow-hidden"><CellText text={session.bdp_vasculature} /></TableCell>
                          <TableCell className="overflow-hidden"><CellText text={session.collaboration} /></TableCell>
                        </>
                      )}
                    </>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {editingSession && (
        <SessionEditDialog
          session={editingSession}
          open={!!editingSession}
          onOpenChange={(open) => { if (!open) { setEditingSession(null); onSessionSaved?.(); } }}
          onSave={async (updates) => {
            const { error } = await onUpdate(editingSession.id, updates);
            if (error) toast.error('Failed to save changes');
            else {
              toast.success('Session updated');
              setEditingSession(null);
              onSessionSaved?.();
            }
          }}
          onDelete={userIsAdmin ? () => handleDelete(editingSession) : undefined}
        />
      )}
    </TooltipProvider>
  );
}

export function useScrollToDate() {
  const scrollToDate = useCallback((date: string) => {
    const row = document.querySelector(`tr[data-date="${date}"]`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.remove('row-highlight');
      void (row as HTMLElement).offsetWidth;
      row.classList.add('row-highlight');
    }
  }, []);

  return scrollToDate;
}
