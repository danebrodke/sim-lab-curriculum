import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseCSV } from '@/lib/csv/parser';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get academic year
  const { data: year } = await supabase
    .from('academic_years')
    .select('label')
    .eq('id', id)
    .single();

  if (!year) return NextResponse.json({ error: 'Year not found' }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const csvText = await file.text();
  const startYear = parseInt(year.label.split('-')[0]);

  try {
    const parsed = parseCSV(csvText, startYear);
    const sessionsToInsert = parsed.map((s, i) => ({
      ...s,
      academic_year_id: id,
      sort_order: i,
      created_by: user.id,
    }));

    const { error } = await supabase.from('sessions').insert(sessionsToInsert);
    if (error) throw error;

    return NextResponse.json({ imported: parsed.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Import failed' },
      { status: 500 }
    );
  }
}
