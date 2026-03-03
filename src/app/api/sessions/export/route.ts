import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exportSessionsToCSV } from '@/lib/csv/exporter';
import type { Session, UserRole } from '@/types/database';

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

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('academic_year_id', yearId)
    .order('session_date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = exportSessionsToCSV((data || []) as Session[], role);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sim-lab-export.csv"`,
    },
  });
}
