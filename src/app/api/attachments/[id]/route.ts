import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireRole, serverError } from '@/lib/api';
import { getDownloadUrl, deleteObject } from '@/lib/storage';
import type { Attachment } from '@/types/database';

// Returns a short-lived signed download URL
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireRole('editor');
  if (error) return error;

  const attachment = await queryOne<Attachment>('select * from attachments where id = $1', [id]);
  if (!attachment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const url = await getDownloadUrl(attachment.file_path, attachment.file_name);
    return NextResponse.json({ url });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireRole('editor');
  if (error) return error;

  const attachment = await queryOne<Attachment>('select * from attachments where id = $1', [id]);
  if (!attachment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    await deleteObject(attachment.file_path);
    await query('delete from attachments where id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
