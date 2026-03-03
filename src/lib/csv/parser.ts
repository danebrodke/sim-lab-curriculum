import Papa from 'papaparse';
import { parseVendorContacts, extractContactFromVendor } from './contact-parser';
import type { VendorContact } from '@/types/database';

export interface ParsedSession {
  session_date: string;
  topic: string | null;
  faculty: string[];
  vendor: string | null;
  vendor_contacts: VendorContact[];
  equipment: string[];
  tissue: string | null;
  bdp_superficial: string | null;
  bdp_compartments: string | null;
  bdp_bony_structures: string | null;
  bdp_vasculature: string | null;
  collaboration: string | null;
  notes: string | null;
}

const COLUMN_MAP: Record<string, string> = {
  'date': 'session_date',
  'vendor': 'vendor',
  'vendor contact info': 'vendor_contacts_raw',
  'faculty': 'faculty_raw',
  'topic': 'topic',
  'tissue': 'tissue',
  'superficial (skin incisions)': 'bdp_superficial',
  'compartments opened & soft tissues': 'bdp_compartments',
  'bony structures accessed': 'bdp_bony_structures',
  'vasculature accessed': 'bdp_vasculature',
  'are you open to collaboration w/ other depts?': 'collaboration',
};

const MONTH_MAP: Record<string, number> = {
  'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
  'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
};

function parseSessionDate(dateStr: string, startYear: number): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 2) return null;

  const day = parseInt(parts[0]);
  const monthStr = parts[1];
  const month = MONTH_MAP[monthStr];
  if (month === undefined || isNaN(day)) return null;

  const year = month >= 6 ? startYear : startYear + 1;
  const d = new Date(year, month, day);
  return d.toISOString().split('T')[0];
}

function parseFaculty(raw: string): string[] {
  if (!raw || raw.trim() === '') return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export function parseCSV(csvText: string, academicYearStartYear: number): ParsedSession[] {
  const result = Papa.parse(csvText, { skipEmptyLines: true });
  const rows = result.data as string[][];

  // Find the header row (contains "Date")
  const headerIndex = rows.findIndex(row =>
    row[0]?.trim().toLowerCase() === 'date'
  );
  if (headerIndex === -1) throw new Error('Could not find header row with "Date" column');

  const headers = rows[headerIndex].map(h => h.trim().toLowerCase());

  // Build column index mapping
  const colMap: Record<string, number> = {};
  headers.forEach((header, i) => {
    for (const [csvHeader, fieldName] of Object.entries(COLUMN_MAP)) {
      if (header === csvHeader || header.startsWith(csvHeader)) {
        colMap[fieldName] = i;
      }
    }
  });

  const dataRows = rows.slice(headerIndex + 1).filter(row =>
    row.some(cell => cell?.trim())
  );

  const results: ParsedSession[] = [];

  for (const row of dataRows) {
    const get = (field: string): string => {
      const idx = colMap[field];
      return idx !== undefined ? (row[idx]?.trim() || '') : '';
    };

    const dateStr = get('session_date');
    const sessionDate = parseSessionDate(dateStr, academicYearStartYear);
    if (!sessionDate) continue;

    // Parse vendor and extract any embedded contacts
    let vendor = get('vendor') || null;
    let vendorContacts = parseVendorContacts(get('vendor_contacts_raw'));

    if (vendor) {
      const { cleanVendor, contact } = extractContactFromVendor(vendor);
      if (contact) {
        vendor = cleanVendor;
        vendorContacts = [contact, ...vendorContacts];
      }
    }

    results.push({
      session_date: sessionDate,
      topic: get('topic') || null,
      faculty: parseFaculty(get('faculty_raw')),
      vendor,
      vendor_contacts: vendorContacts,
      equipment: [],
      tissue: get('tissue') || null,
      bdp_superficial: get('bdp_superficial') || null,
      bdp_compartments: get('bdp_compartments') || null,
      bdp_bony_structures: get('bdp_bony_structures') || null,
      bdp_vasculature: get('bdp_vasculature') || null,
      collaboration: get('collaboration') || null,
      notes: null,
    });
  }

  return results;
}
