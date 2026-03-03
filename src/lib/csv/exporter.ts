import type { Session, UserRole } from '@/types/database';
import { canViewRestrictedFields } from '@/lib/auth/roles';

const VIEWER_HEADERS = ['Date', 'Topic', 'Faculty', 'Vendor', 'Vendor Contact', 'Equipment', 'Tissue'];
const EDITOR_HEADERS = [
  ...VIEWER_HEADERS,
  'Superficial (skin incisions)',
  'Compartments opened & soft tissues',
  'Bony structures accessed',
  'Vascular structures accessed',
  'Collaboration',
  'Notes',
];

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportSessionsToCSV(sessions: Session[], role: UserRole): string {
  const isEditor = canViewRestrictedFields(role);
  const headers = isEditor ? EDITOR_HEADERS : VIEWER_HEADERS;

  const rows = sessions.map(s => {
    const contactStr = s.vendor_contacts
      .map(c => [c.name, c.company, c.email].filter(Boolean).join(', '))
      .join('; ');

    const base = [
      s.session_date,
      s.topic || '',
      s.faculty.join(', '),
      s.vendor || '',
      contactStr,
      s.equipment.join(', '),
      s.tissue || '',
    ];

    if (isEditor) {
      base.push(
        s.bdp_superficial || '',
        s.bdp_compartments || '',
        s.bdp_bony_structures || '',
        s.bdp_vasculature || '',
        s.collaboration || '',
        s.notes || '',
      );
    }

    return base.map(escapeCSV).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
