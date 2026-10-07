import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireRole, serverError } from '@/lib/api';

// Regenerate the current user's calendar feed token
export async function POST() {
  const { profile, error } = await requireRole('viewer');
  if (error) return error;

  try {
    const data = await queryOne(
      'update profiles set calendar_token = gen_random_uuid() where id = $1 returning calendar_token',
      [profile.id]
    );
    return NextResponse.json(data);
  } catch (err) {
    return serverError(err);
  }
}
