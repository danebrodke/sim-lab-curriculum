import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireRole, serverError } from '@/lib/api';
import { canViewRestrictedFields } from '@/lib/auth/roles';
import { uploadObject, deleteObject } from '@/lib/storage';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'video/mp4',
]);

// List attachments: ?session_id=<id> or ?session_ids=<id>,<id>,...
export async function GET(request: NextRequest) {
  const { profile, error } = await requireRole('viewer');
  if (error) return error;

  // Attachments are editor-only; viewers just see none
  if (!canViewRestrictedFields(profile.role)) return NextResponse.json([]);

  const params = request.nextUrl.searchParams;
  const ids = (params.get('session_ids') ?? params.get('session_id') ?? '')
    .split(',')
    .filter(Boolean);
  if (ids.length === 0) return NextResponse.json([]);

  try {
    const data = await query(
      'select * from attachments where session_id = any($1::uuid[]) order by created_at desc',
      [ids]
    );
    return NextResponse.json(data);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: NextRequest) {
  const { profile, error } = await requireRole('editor');
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const sessionId = formData.get('session_id') as string;

  if (!file || !sessionId) {
    return NextResponse.json({ error: 'file and session_id required' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds 50MB limit' }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
  }

  const filePath = `${sessionId}/${Date.now()}-${file.name}`;

  try {
    await uploadObject(filePath, file);
  } catch (err) {
    return serverError(err);
  }

  try {
    const data = await queryOne(
      `insert into attachments (session_id, file_name, file_path, file_size, mime_type, uploaded_by)
       values ($1, $2, $3, $4, $5, $6) returning *`,
      [sessionId, file.name, filePath, file.size, file.type, profile.id]
    );
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    await deleteObject(filePath).catch(() => {});
    return serverError(err);
  }
}
