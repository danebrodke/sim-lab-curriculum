'use client';

import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canEdit, canViewRestrictedFields } from '@/lib/auth/roles';
import type { Session, UserRole } from '@/types/database';
import { FacultyBadges } from './faculty-badges';
import { VendorContactCards } from './vendor-contact-card';
import { EquipmentList } from './equipment-list';
import { useState } from 'react';

interface SessionCardProps {
  session: Session;
  role: UserRole;
  onEdit: (session: Session) => void;
}

export function SessionCard({ session, role, onEdit }: SessionCardProps) {
  const [bdpExpanded, setBdpExpanded] = useState(false);
  const showRestricted = canViewRestrictedFields(role);
  const userCanEdit = canEdit(role);
  const date = parseISO(session.session_date);

  const isHoliday = !session.topic ||
    session.topic.toLowerCase().includes('holiday') ||
    session.topic.toLowerCase().includes('no planned');

  return (
    <Card
      className={cn(
        'transition-colors',
        isHoliday && 'bg-muted/30 border-muted',
      )}
      data-date={session.session_date}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                {format(date, 'EEE, MMM d')}
              </span>
            </div>
            <p className={cn(
              'text-sm mt-0.5',
              !isHoliday && 'font-semibold',
              isHoliday && 'italic text-muted-foreground',
            )}>
              {session.topic || '\u2014'}
            </p>
          </div>
          {userCanEdit && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onEdit(session)}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>

        {session.faculty.length > 0 && <FacultyBadges faculty={session.faculty} />}

        {session.vendor && (
          <p className="text-xs text-muted-foreground">{session.vendor}</p>
        )}

        {session.vendor_contacts.length > 0 && (
          <VendorContactCards contacts={session.vendor_contacts} />
        )}

        {session.equipment.length > 0 && <EquipmentList equipment={session.equipment} />}

        {session.tissue && (
          <p className="text-xs text-muted-foreground line-clamp-2">{session.tissue}</p>
        )}

        {showRestricted && (session.bdp_superficial || session.bdp_compartments || session.bdp_bony_structures || session.bdp_vasculature) && (
          <div>
            <button
              onClick={() => setBdpExpanded(!bdpExpanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={cn('h-3 w-3 transition-transform', bdpExpanded && 'rotate-180')} />
              Body Donation Program
            </button>
            {bdpExpanded && (
              <div className="mt-2 space-y-1 text-xs text-muted-foreground pl-4 border-l-2 border-muted">
                {session.bdp_superficial && <p><span className="font-medium">Superficial:</span> {session.bdp_superficial}</p>}
                {session.bdp_compartments && <p><span className="font-medium">Compartments:</span> {session.bdp_compartments}</p>}
                {session.bdp_bony_structures && <p><span className="font-medium">Bony:</span> {session.bdp_bony_structures}</p>}
                {session.bdp_vasculature && <p><span className="font-medium">Vasculature:</span> {session.bdp_vasculature}</p>}
              </div>
            )}
          </div>
        )}

        {showRestricted && session.collaboration && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Collab:</span> {session.collaboration}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
