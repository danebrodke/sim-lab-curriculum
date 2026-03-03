/**
 * Seed script: re-imports "other" sessions (those without tissue data)
 * from the CSV files into the database with session_type = 'other'.
 *
 * Prerequisites:
 *   1. Run migration 00005_add_session_type.sql in Supabase SQL editor
 *   2. Have .env.local with SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: node scripts/seed-other-sessions.mjs
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envPath = path.join(__dirname, '..', '.env.local');
const envText = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envText.split('\n')) {
  const [key, ...vals] = line.split('=');
  if (key?.trim()) env[key.trim()] = vals.join('=').trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_KEY in .env.local');
  process.exit(1);
}

const MONTH_MAP = {
  'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
  'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
};

function parseDate(dateStr, startYear) {
  const parts = dateStr.trim().split('-');
  if (parts.length !== 2) return null;
  const day = parseInt(parts[0]);
  const month = MONTH_MAP[parts[1]];
  if (month === undefined || isNaN(day)) return null;
  const year = month >= 6 ? startYear : startYear + 1;
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseContacts(raw) {
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

function parseCSVSimple(text) {
  const lines = text.split('\n');
  const rows = [];
  for (const line of lines) {
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { cells.push(current.trim()); current = ''; continue; }
      current += char;
    }
    cells.push(current.trim());
    rows.push(cells);
  }
  return rows;
}

function parseOtherSessions(csvText, startYear, hasFacultyCol) {
  const rows = parseCSVSimple(csvText);
  const headerIdx = rows.findIndex(r => r[0]?.toLowerCase().startsWith('date'));
  if (headerIdx === -1) throw new Error('No header found');

  const others = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cells = rows[i];
    if (!cells[0]?.trim()) continue;

    const date = parseDate(cells[0], startYear);
    if (!date) continue;

    let topic, tissue, vendor, vendorContactsRaw, faculty;
    if (hasFacultyCol) {
      // 2025-2026: Date, Vendor, Contact, Faculty, Topic, Tissue, ...
      vendor = cells[1] || null;
      vendorContactsRaw = cells[2] || '';
      faculty = cells[3]?.split(',').map(s => s.trim()).filter(Boolean) || [];
      topic = cells[4] || null;
      tissue = cells[5] || null;
    } else {
      // 2026-2027: Date, Vendor, Contact, Topic, Tissue, ...
      vendor = cells[1] || null;
      vendorContactsRaw = cells[2] || '';
      faculty = [];
      topic = cells[3] || null;
      tissue = cells[4] || null;
    }

    // Only import sessions WITHOUT tissue data (these are the "other" type)
    if (tissue && tissue.trim()) continue;

    // Must have at least a topic to be worth importing
    if (!topic || !topic.trim()) continue;

    others.push({
      session_date: date,
      session_type: 'other',
      topic,
      faculty,
      vendor,
      vendor_contacts: parseContacts(vendorContactsRaw),
      equipment: [],
      tissue: null,
      bdp_superficial: null,
      bdp_compartments: null,
      bdp_bony_structures: null,
      bdp_vasculature: null,
      collaboration: null,
      notes: null,
      sort_order: 0,
    });
  }

  return others;
}

async function supabaseFetch(endpoint, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  return res;
}

async function main() {
  // 1. Fetch academic years to get IDs
  const yearsRes = await fetch(`${SUPABASE_URL}/rest/v1/academic_years?select=id,label`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  });
  const years = await yearsRes.json();
  console.log('Academic years:', years.map(y => y.label).join(', '));

  const year2526 = years.find(y => y.label === '2025-2026');
  const year2627 = years.find(y => y.label === '2026-2027');

  if (!year2526 || !year2627) {
    console.error('Could not find academic years. Found:', years);
    process.exit(1);
  }

  // 2. Read and parse CSVs
  const dataDir = path.resolve(__dirname, '..', '..');
  const csv2526 = fs.readFileSync(
    path.join(dataDir, '2025-2026 Friday Curr w-tissue notes, rev 102325.csv'),
    'utf-8'
  );
  const csv2627 = fs.readFileSync(
    path.join(dataDir, '2026-2027 Friday Curr w-tissue notes Brady start for 26 27.csv'),
    'utf-8'
  );

  const others2526 = parseOtherSessions(csv2526, 2025, true);
  const others2627 = parseOtherSessions(csv2627, 2026, false);

  console.log(`Found ${others2526.length} 'other' sessions for 2025-2026`);
  console.log(`Found ${others2627.length} 'other' sessions for 2026-2027`);

  // 3. Check for existing sessions on these dates to avoid duplicates
  const allDates = [
    ...others2526.map(s => s.session_date),
    ...others2627.map(s => s.session_date),
  ];

  const existingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/sessions?select=session_date,academic_year_id&session_date=in.(${allDates.map(d => `"${d}"`).join(',')})`,
    {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    }
  );
  const existing = await existingRes.json();
  const existingSet = new Set(existing.map(e => `${e.session_date}|${e.academic_year_id}`));

  // 4. Filter out duplicates and add academic_year_id
  const toInsert2526 = others2526
    .filter(s => !existingSet.has(`${s.session_date}|${year2526.id}`))
    .map(s => ({ ...s, academic_year_id: year2526.id }));

  const toInsert2627 = others2627
    .filter(s => !existingSet.has(`${s.session_date}|${year2627.id}`))
    .map(s => ({ ...s, academic_year_id: year2627.id }));

  const allToInsert = [...toInsert2526, ...toInsert2627];

  if (allToInsert.length === 0) {
    console.log('No new sessions to insert (all already exist).');
    return;
  }

  console.log(`Inserting ${allToInsert.length} sessions (${toInsert2526.length} for 2025-2026, ${toInsert2627.length} for 2026-2027)...`);

  // 5. Insert in batches
  const BATCH_SIZE = 20;
  for (let i = 0; i < allToInsert.length; i += BATCH_SIZE) {
    const batch = allToInsert.slice(i, i + BATCH_SIZE);
    await supabaseFetch('sessions', {
      method: 'POST',
      body: JSON.stringify(batch),
    });
    console.log(`  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allToInsert.length / BATCH_SIZE)}`);
  }

  console.log('Done! All "other" sessions have been imported.');
  console.log('\nSample topics imported:');
  allToInsert.slice(0, 10).forEach(s => {
    console.log(`  ${s.session_date}: ${s.topic}`);
  });
  if (allToInsert.length > 10) {
    console.log(`  ... and ${allToInsert.length - 10} more`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
