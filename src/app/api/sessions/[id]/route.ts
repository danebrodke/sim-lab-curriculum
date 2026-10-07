import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireRole, sessionColumns, serverError } from '@/lib/api';
import { deleteObject } from '@/lib/storage';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { profile, error } = await requireRole('editor');
  if (error) return error;

  try {
    const body = await request.json();
    const { columns, placeholders, values } = sessionColumns(body, 3);
    const sets = columns.map((c, i) => `${c} = ${placeholders[i]}`);
    sets.push('updated_by = $2');

    const data = await queryOne(
      `update sessions set ${sets.join(', ')} where id = $1 returning *`,
      [id, profile.id, ...values]
    );
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireRole('admin');
  if (error) return error;

  try {
    // Attachment rows cascade; remove their files from storage too
    const files = await query<{ file_path: string }>(
      'select file_path from attachments where session_id = $1',
      [id]
    );
    await query('delete from sessions where id = $1', [id]);
    await Promise.allSettled(files.map(f => deleteObject(f.file_path)));
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
