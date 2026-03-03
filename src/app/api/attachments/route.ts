import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const sessionId = formData.get('session_id') as string;

  if (!file || !sessionId) {
    return NextResponse.json({ error: 'file and session_id required' }, { status: 400 });
  }

  // Upload to Supabase Storage
  const filePath = `${sessionId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('session-attachments')
    .upload(filePath, file);

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Create attachment record
  const { data, error } = await supabase
    .from('attachments')
    .insert({
      session_id: sessionId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
