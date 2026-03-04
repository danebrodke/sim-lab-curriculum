import { NextRequest, NextResponse } from 'next/server';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { createAdminClient } from '@/lib/supabase/admin';

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

  const supabase = createAdminClient();

  // Verify token exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('calendar_token', token)
    .single();

  if (!profile) {
    return new NextResponse('Invalid calendar token', { status: 404 });
  }

  // Get sessions from current, future, and recent past academic years
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  let query = supabase
    .from('sessions')
    .select('session_date, session_type, topic, faculty, vendor, academic_years!inner(label, is_current, start_date, end_date)')
    .or(`is_current.eq.true,end_date.gte.${oneYearAgo}`, { referencedTable: 'academic_years' })
    .order('session_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (filter === 'simulation') {
    query = query.neq('session_type', 'other');
  }

  const { data: sessions } = await query;

  const calendar = ical({
    name: filter === 'simulation' ? 'OHSU Ortho Sim Lab - Simulation' : 'OHSU Ortho Sim Lab - All Sessions',
    timezone: 'America/Los_Angeles',
    method: ICalCalendarMethod.PUBLISH,
    ttl: 3600,
  });

  if (sessions) {
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
  }

  return new NextResponse(calendar.toString(), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ohsu-sim-lab.ics"',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
