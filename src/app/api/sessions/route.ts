import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VIEWER_FIELDS, EDITOR_FIELDS } from '@/types/database';
import type { UserRole } from '@/types/database';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const yearId = request.nextUrl.searchParams.get('year_id');
  if (!yearId) return NextResponse.json({ error: 'year_id required' }, { status: 400 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile?.role || 'viewer') as UserRole;
  const fields = role === 'viewer' ? VIEWER_FIELDS : EDITOR_FIELDS;

  const { data, error } = await supabase
    .from('sessions')
    .select(fields.join(', '))
    .eq('academic_year_id', yearId)
    .order('session_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from('sessions')
    .insert({ ...body, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
