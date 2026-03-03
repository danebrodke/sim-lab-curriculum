/**
 * Seed script: parses the CSV files and outputs JSON that can be
 * inserted into Supabase via the SQL editor or the admin UI.
 *
 * Usage: npx tsx scripts/seed.ts
 *
 * This is a standalone script. For actual seeding with Supabase,
 * use the admin UI's CSV import feature, or run this script
 * with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars set.
 */
import * as fs from 'fs';
import * as path from 'path';

// Inline the parsing logic for standalone use
interface VendorContact {
  name: string;
  email: string | null;
  company: string | null;
}

interface ParsedSession {
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
}

const MONTH_MAP: Record<string, number> = {
  'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
  'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
};

function parseDate(dateStr: string, startYear: number): string | null {
  const parts = dateStr.trim().split('-');
  if (parts.length !== 2) return null;
  const day = parseInt(parts[0]);
  const month = MONTH_MAP[parts[1]];
  if (month === undefined || isNaN(day)) return null;
  const year = month >= 6 ? startYear : startYear + 1;
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseContacts(raw: string): VendorContact[] {
  if (!raw?.trim()) return [];
  return raw.split('/').map(s => s.trim()).filter(Boolean).map(contact => {
    const normalized = contact.replace(/\s+at\s+/gi, ', ');
    const parts = normalized.split(',').map(s => s.trim());
    const emailIdx = parts.findIndex(p => p.includes('@'));
    return {
      name: parts[0] || '',
      email: emailIdx >= 0 ? parts[emailIdx] : null,
      company: parts.length >= 3 && emailIdx >= 0
        ? parts.slice(1, emailIdx).join(', ') || null
        : null,
    };
  });
}

// Read and parse both CSVs
const dataDir = path.resolve(__dirname, '..');
const csv2526 = fs.readFileSync(
  path.join(dataDir, '..', '2025-2026 Friday Curr w-tissue notes, rev 102325.csv'),
  'utf-8'
);
const csv2627 = fs.readFileSync(
  path.join(dataDir, '..', '2026-2027 Friday Curr w-tissue notes Brady start for 26 27.csv'),
  'utf-8'
);

function parseCSVManual(text: string, startYear: number, hasFactulyCol: boolean): ParsedSession[] {
  const lines = text.split('\n');
  // Find header row
  const headerIdx = lines.findIndex(l => l.toLowerCase().startsWith('date'));
  if (headerIdx === -1) throw new Error('No header found');

  const sessions: ParsedSession[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parse (handles basic quoting)
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { cells.push(current.trim()); current = ''; continue; }
      current += char;
    }
    cells.push(current.trim());

    const date = parseDate(cells[0], startYear);
    if (!date) continue;

    if (hasFactulyCol) {
      // 2025-2026: Date, Vendor, Contact, Faculty, Topic, Tissue, Superficial, Compartments, Bony, Vascular, Collab
      sessions.push({
        session_date: date,
        vendor: cells[1] || null,
        vendor_contacts: parseContacts(cells[2]),
        faculty: cells[3]?.split(',').map(s => s.trim()).filter(Boolean) || [],
        topic: cells[4] || null,
        tissue: cells[5] || null,
        equipment: [],
        bdp_superficial: cells[6] || null,
        bdp_compartments: cells[7] || null,
        bdp_bony_structures: cells[8] || null,
        bdp_vasculature: cells[9] || null,
        collaboration: cells[10] || null,
      });
    } else {
      // 2026-2027: Date, Vendor, Contact, Topic, Tissue, Superficial, Compartments, Bony, Vascular, Collab
      sessions.push({
        session_date: date,
        vendor: cells[1] || null,
        vendor_contacts: parseContacts(cells[2]),
        faculty: [],
        topic: cells[3] || null,
        tissue: cells[4] || null,
        equipment: [],
        bdp_superficial: cells[5] || null,
        bdp_compartments: cells[6] || null,
        bdp_bony_structures: cells[7] || null,
        bdp_vasculature: cells[8] || null,
        collaboration: cells[9] || null,
      });
    }
  }
  return sessions;
}

const sessions2526 = parseCSVManual(csv2526, 2025, true);
const sessions2627 = parseCSVManual(csv2627, 2026, false);

console.log(`Parsed ${sessions2526.length} sessions for 2025-2026`);
console.log(`Parsed ${sessions2627.length} sessions for 2026-2027`);

// Output SQL for seeding
const output = {
  academic_years: [
    { label: '2025-2026', start_date: '2025-07-01', end_date: '2026-06-30', is_current: true },
    { label: '2026-2027', start_date: '2026-07-01', end_date: '2027-06-30', is_current: false },
  ],
  sessions_2025_2026: sessions2526,
  sessions_2026_2027: sessions2627,
};

fs.writeFileSync(
  path.join(dataDir, 'scripts', 'seed-data.json'),
  JSON.stringify(output, null, 2)
);

console.log('Seed data written to scripts/seed-data.json');
console.log('Use the admin UI CSV import feature or upload this data via the Supabase SQL editor.');
