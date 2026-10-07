import { NextRequest, NextResponse } from 'next/server';

// Called daily by Vercel Cron (see vercel.json). Supabase's free tier pauses
// projects after 7 days without activity; one small query keeps it awake.
export async function GET(request: NextRequest) {
  if (
    process.env.CRON_SECRET &&
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/academic_years?select=id&limit=1`,
    {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`Supabase keepalive failed (${res.status}): ${body}`);
    return NextResponse.json({ ok: false, status: res.status }, { status: 502 });
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
