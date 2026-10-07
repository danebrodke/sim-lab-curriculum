import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireRole, serverError } from '@/lib/api';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireRole('admin');
  if (error) return error;

  const { role } = await request.json();
  if (!['viewer', 'editor', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    const data = await queryOne(
      'update profiles set role = $2 where id = $1 returning *',
      [id, role]
    );
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    return serverError(err);
  }
}
