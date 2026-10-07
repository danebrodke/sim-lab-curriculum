import { NextRequest, NextResponse } from 'next/server';
import { transaction } from '@/lib/db';
import { requireRole, serverError } from '@/lib/api';

// Mark a year as the current one (unsets all others)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireRole('admin');
  if (error) return error;

  const { is_current } = await request.json();
  if (is_current !== true) {
    return NextResponse.json({ error: 'Only is_current: true is supported' }, { status: 400 });
  }

  try {
    const data = await transaction(async (client) => {
      await client.query('update academic_years set is_current = false where is_current');
      const { rows } = await client.query(
        'update academic_years set is_current = true where id = $1 returning *',
        [id]
      );
      return rows[0];
    });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    return serverError(err);
  }
}
