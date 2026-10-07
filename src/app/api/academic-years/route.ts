import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireRole, serverError } from '@/lib/api';
import { getAcademicYearDates } from '@/lib/calendar/academic-year';

export async function GET() {
  const { error } = await requireRole('viewer');
  if (error) return error;

  try {
    const data = await query('select * from academic_years order by start_date desc');
    return NextResponse.json(data);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireRole('admin');
  if (error) return error;

  const { label } = await request.json();
  if (typeof label !== 'string' || !/^\d{4}-\d{4}$/.test(label)) {
    return NextResponse.json({ error: 'Format must be YYYY-YYYY (e.g., 2025-2026)' }, { status: 400 });
  }

  try {
    const dates = getAcademicYearDates(label);
    const data = await queryOne(
      'insert into academic_years (label, start_date, end_date) values ($1, $2, $3) returning *',
      [label, dates.start, dates.end]
    );
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
