import { NextRequest, NextResponse } from 'next/server';
import { queryOne, transaction } from '@/lib/db';
import { requireRole, insertSession } from '@/lib/api';
import { parseCSV } from '@/lib/csv/parser';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { profile, error } = await requireRole('admin');
  if (error) return error;

  const year = await queryOne<{ label: string }>(
    'select label from academic_years where id = $1',
    [id]
  );
  if (!year) return NextResponse.json({ error: 'Year not found' }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const csvText = await file.text();
  const startYear = parseInt(year.label.split('-')[0]);

  try {
    const parsed = parseCSV(csvText, startYear);

    await transaction(async (client) => {
      for (const [i, s] of parsed.entries()) {
        await insertSession(
          (t, p) => client.query(t, p),
          { ...s, academic_year_id: id, sort_order: i },
          profile.id
        );
      }
    });

    return NextResponse.json({ imported: parsed.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Import failed' },
      { status: 500 }
    );
  }
}
