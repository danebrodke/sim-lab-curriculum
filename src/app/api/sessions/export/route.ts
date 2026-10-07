import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole, serverError } from '@/lib/api';
import { exportSessionsToCSV } from '@/lib/csv/exporter';
import type { Session } from '@/types/database';

export async function GET(request: NextRequest) {
  const { profile, error } = await requireRole('viewer');
  if (error) return error;

  const yearId = request.nextUrl.searchParams.get('year_id');
  if (!yearId) return NextResponse.json({ error: 'year_id required' }, { status: 400 });

  try {
    const data = await query<Session>(
      `select * from sessions
       where academic_year_id = $1
       order by session_date asc, created_at asc`,
      [yearId]
    );

    const csv = exportSessionsToCSV(data, profile.role);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="sim-lab-export.csv"`,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
