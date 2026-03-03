import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: attachment } = await supabase
    .from('attachments')
    .select('*')
    .eq('id', id)
    .single();

  if (!attachment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data } = await supabase.storage
    .from('session-attachments')
    .createSignedUrl(attachment.file_path, 3600);

  if (!data?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: attachment } = await supabase
    .from('attachments')
    .select('*')
    .eq('id', id)
    .single();

  if (!attachment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete from storage
  await supabase.storage
    .from('session-attachments')
    .remove([attachment.file_path]);

  // Delete record
  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
