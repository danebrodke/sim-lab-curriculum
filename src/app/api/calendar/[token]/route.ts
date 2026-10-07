import { NextRequest, NextResponse } from 'next/server';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { query, queryOne } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const filter = request.nextUrl.searchParams.get('filter');

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return new NextResponse('Invalid token', { status: 400 });
  }

  // Verify token exists
  const profile = await queryOne('select id from profiles where calendar_token = $1', [token]);

  if (!profile) {
    return new NextResponse('Invalid calendar token', { status: 404 });
  }

  // Get sessions from current, future, and recent past academic years
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sessions = await query<{
    session_date: string;
    topic: string | null;
    faculty: string[] | null;
    vendor: string | null;
  }>(
    `select s.session_date, s.topic, s.faculty, s.vendor
     from sessions s
     join academic_years ay on ay.id = s.academic_year_id
     where (ay.is_current or ay.end_date >= $1)
       and ($2::boolean = false or s.session_type <> 'other')
     order by s.session_date asc, s.created_at asc`,
    [oneYearAgo, filter === 'simulation']
  );

  const calendar = ical({
    name: filter === 'simulation' ? 'OHSU Ortho Sim Lab - Simulation' : 'OHSU Ortho Sim Lab - All Sessions',
    timezone: 'America/Los_Angeles',
    method: ICalCalendarMethod.PUBLISH,
    ttl: 3600,
  });

  for (const session of sessions) {
    if (!session.topic?.trim()) continue;

    const description = [
      session.faculty?.length ? `Faculty: ${session.faculty.join(', ')}` : null,
      session.vendor ? `Vendor: ${session.vendor}` : null,
    ].filter(Boolean).join('\n');

    calendar.createEvent({
      start: new Date(session.session_date + 'T06:30:00'),
      end: new Date(session.session_date + 'T08:30:00'),
      summary: session.topic,
      description: description || undefined,
      location: 'VirtuOHSU',
    });
  }

  return new NextResponse(calendar.toString(), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ohsu-sim-lab.ics"',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
