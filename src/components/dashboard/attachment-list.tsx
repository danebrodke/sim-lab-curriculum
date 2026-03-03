'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Paperclip, Download, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { Attachment } from '@/types/database';

interface AttachmentListProps {
  sessionId: string;
  canEdit: boolean;
}

export function AttachmentList({ sessionId, canEdit }: AttachmentListProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchAttachments = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('attachments')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    if (data) setAttachments(data as Attachment[]);
  };

  useEffect(() => { fetchAttachments(); }, [sessionId]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);

    const res = await fetch('/api/attachments', { method: 'POST', body: formData });
    if (res.ok) {
      toast.success('File uploaded');
      fetchAttachments();
    } else {
      toast.error('Upload failed');
    }
    setUploading(false);
  };

  const handleDownload = async (attachment: Attachment) => {
    const res = await fetch(`/api/attachments/${attachment.id}`);
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, '_blank');
    } else {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`Delete ${attachment.file_name}?`)) return;
    const res = await fetch(`/api/attachments/${attachment.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Attachment deleted');
      fetchAttachments();
    } else {
      toast.error('Delete failed');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Paperclip className="h-3 w-3" />
          Attachments ({attachments.length})
        </p>
        {canEdit && (
          <label>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = '';
              }}
            />
            <Button variant="outline" size="sm" className="h-7 text-xs cursor-pointer" asChild disabled={uploading}>
              <span>
                <Upload className="mr-1 h-3 w-3" />
                {uploading ? 'Uploading...' : 'Upload'}
              </span>
            </Button>
          </label>
        )}
      </div>
      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-2 text-xs p-1.5 rounded border bg-muted/30">
              <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate flex-1">{att.file_name}</span>
              <span className="text-muted-foreground shrink-0">{formatFileSize(att.file_size)}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownload(att)}>
                <Download className="h-3 w-3" />
              </Button>
              {canEdit && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(att)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
