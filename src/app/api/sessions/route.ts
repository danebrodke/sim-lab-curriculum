import { NextRequest, NextResponse } from 'next/server';
import { pool, query } from '@/lib/db';
import { requireRole, insertSession, serverError } from '@/lib/api';
import { canViewRestrictedFields } from '@/lib/auth/roles';
import { VIEWER_FIELDS, EDITOR_FIELDS } from '@/types/database';

export async function GET(request: NextRequest) {
  const { profile, error } = await requireRole('viewer');
  if (error) return error;

  const yearId = request.nextUrl.searchParams.get('year_id');
  if (!yearId) return NextResponse.json({ error: 'year_id required' }, { status: 400 });

  const fields = canViewRestrictedFields(profile.role) ? EDITOR_FIELDS : VIEWER_FIELDS;

  try {
    const data = await query(
      `select ${fields.join(', ')} from sessions
       where academic_year_id = $1
       order by session_date asc, created_at asc`,
      [yearId]
    );
    return NextResponse.json(data);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: NextRequest) {
  const { profile, error } = await requireRole('editor');
  if (error) return error;

  try {
    const body = await request.json();
    const session = await insertSession((t, p) => pool.query(t, p), body, profile.id);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
