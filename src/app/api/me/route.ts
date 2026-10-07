import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api';

// Current user's profile
export async function GET() {
  const { profile, error } = await requireRole('viewer');
  if (error) return error;
  return NextResponse.json(profile);
}
