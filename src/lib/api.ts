import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import type { Profile, Session, UserRole } from '@/types/database';

const ROLE_RANK: Record<UserRole, number> = { viewer: 0, editor: 1, admin: 2 };

// Returns the signed-in user's profile, or null if not signed in.
export async function getCurrentProfile(): Promise<Profile | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return queryOne<Profile>('select * from profiles where id = $1', [session.user.id]);
}

type AuthResult =
  | { profile: Profile; error?: undefined }
  | { profile?: undefined; error: NextResponse };

// Authorization for API routes (replaces Supabase RLS). Usage:
//   const { profile, error } = await requireRole('editor');
//   if (error) return error;
export async function requireRole(minRole: UserRole = 'viewer'): Promise<AuthResult> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (ROLE_RANK[profile.role] < ROLE_RANK[minRole]) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { profile };
}

export function serverError(err: unknown) {
  console.error(err);
  const message = err instanceof Error ? err.message : 'Internal error';
  return NextResponse.json({ error: message }, { status: 500 });
}

// Columns a client may write on a session row
const SESSION_WRITABLE = [
  'academic_year_id', 'session_date', 'session_type', 'topic', 'faculty', 'vendor',
  'vendor_contacts', 'links', 'equipment', 'tissue', 'bdp_superficial',
  'bdp_compartments', 'bdp_bony_structures', 'bdp_vasculature', 'collaboration',
  'notes', 'sort_order',
] as const;

const JSONB_COLUMNS = new Set(['vendor_contacts', 'links']);

// Picks writable columns from a request body. Returns column names, SQL
// placeholders (starting at $startIndex) and values, ready for insert/update.
export function sessionColumns(body: Partial<Session>, startIndex = 1) {
  const columns: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  for (const col of SESSION_WRITABLE) {
    if (!(col in body)) continue;
    const value = body[col];
    columns.push(col);
    if (JSONB_COLUMNS.has(col)) {
      placeholders.push(`$${startIndex + values.length}::jsonb`);
      values.push(JSON.stringify(value ?? []));
    } else {
      placeholders.push(`$${startIndex + values.length}`);
      values.push(value);
    }
  }
  return { columns, placeholders, values };
}

export async function insertSession(
  run: (text: string, params: unknown[]) => Promise<{ rows: unknown[] }>,
  body: Partial<Session>,
  createdBy: string
) {
  const { columns, placeholders, values } = sessionColumns(body);
  columns.push('created_by');
  placeholders.push(`$${values.length + 1}`);
  values.push(createdBy);
  const { rows } = await run(
    `insert into sessions (${columns.join(', ')}) values (${placeholders.join(', ')}) returning *`,
    values
  );
  return rows[0] as Session;
}
