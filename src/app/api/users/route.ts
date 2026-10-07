import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole, serverError } from '@/lib/api';

export async function GET() {
  const { error } = await requireRole('admin');
  if (error) return error;

  try {
    const data = await query('select * from profiles order by created_at desc');
    return NextResponse.json(data);
  } catch (err) {
    return serverError(err);
  }
}
