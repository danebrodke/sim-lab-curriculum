'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AttachmentList } from './attachment-list';
import type { Session, SessionType, VendorContact } from '@/types/database';

interface SessionEditDialogProps {
  session?: Session;
  academicYearId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<Session>) => Promise<void>;
  onDelete?: () => void;
}

export function SessionEditDialog({ session, academicYearId, open, onOpenChange, onSave, onDelete }: SessionEditDialogProps) {
  const isCreateMode = !session;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    session_date: session?.session_date || '',
    session_type: (session?.session_type || 'simulation') as SessionType,
    topic: session?.topic || '',
    faculty: session?.faculty?.join(', ') || '',
    vendor: session?.vendor || '',
    vendor_contacts_text: session?.vendor_contacts
      ?.map(c => [c.name, c.company, c.email].filter(Boolean).join(', '))
      .join('\n') || '',
    equipment: session?.equipment?.join(', ') || '',
    tissue: session?.tissue || '',
    bdp_superficial: session?.bdp_superficial || '',
    bdp_compartments: session?.bdp_compartments || '',
    bdp_bony_structures: session?.bdp_bony_structures || '',
    bdp_vasculature: session?.bdp_vasculature || '',
    collaboration: session?.collaboration || '',
    notes: session?.notes || '',
  });

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);

    const contactLines = form.vendor_contacts_text.split('\n').filter(l => l.trim());
    const vendor_contacts: VendorContact[] = contactLines.map(line => {
      const parts = line.split(',').map(s => s.trim());
      const emailIdx = parts.findIndex(p => p.includes('@'));
      return {
        name: parts[0] || '',
        email: emailIdx >= 0 ? parts[emailIdx] : null,
        company: parts.length >= 3 && emailIdx >= 0
          ? parts.slice(1, emailIdx).join(', ') || null
          : null,
      };
    });

    const payload: Partial<Session> = {
      session_date: form.session_date,
      session_type: form.session_type,
      topic: form.topic || null,
      faculty: form.faculty.split(',').map(s => s.trim()).filter(Boolean),
      vendor: form.vendor || null,
      vendor_contacts,
      equipment: form.equipment.split(',').map(s => s.trim()).filter(Boolean),
      tissue: form.tissue || null,
      bdp_superficial: form.bdp_superficial || null,
      bdp_compartments: form.bdp_compartments || null,
      bdp_bony_structures: form.bdp_bony_structures || null,
      bdp_vasculature: form.bdp_vasculature || null,
      collaboration: form.collaboration || null,
      notes: form.notes || null,
    };

    if (isCreateMode) {
      payload.academic_year_id = academicYearId;
    }

    await onSave(payload);
    setSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      handleSave();
    }
  };

  const handleClose = async (open: boolean) => {
    if (!open && !isCreateMode) {
      await handleSave();
    } else {
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>
            {session
              ? <>Edit Session &mdash; {format(parseISO(session.session_date), 'MMMM d, yyyy')}</>
              : 'New Session'
            }
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="session_date">Date</Label>
              <Input
                id="session_date"
                type="date"
                value={form.session_date}
                onChange={e => update('session_date', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="session_type">Session Type</Label>
              <div className="flex rounded-md border overflow-hidden h-9">
                <button
                  type="button"
                  className={`flex-1 text-sm font-medium transition-colors ${
                    form.session_type === 'simulation'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  }`}
                  onClick={() => setForm(prev => ({ ...prev, session_type: 'simulation' }))}
                >
                  Simulation
                </button>
                <button
                  type="button"
                  className={`flex-1 text-sm font-medium transition-colors ${
                    form.session_type === 'other'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  }`}
                  onClick={() => setForm(prev => ({ ...prev, session_type: 'other' }))}
                >
                  Other
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="topic">Topic</Label>
            <Input id="topic" value={form.topic} onChange={e => update('topic', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="faculty">Faculty (comma-separated)</Label>
              <Input id="faculty" value={form.faculty} onChange={e => update('faculty', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Input id="vendor" value={form.vendor} onChange={e => update('vendor', e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contacts">Vendor Contacts (one per line: Name, Company, email)</Label>
            <Textarea
              id="contacts"
              rows={3}
              value={form.vendor_contacts_text}
              onChange={e => update('vendor_contacts_text', e.target.value)}
              placeholder="Bo Brennan, ConMed, bo@conmed.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="equipment">Equipment (comma-separated)</Label>
              <Input id="equipment" value={form.equipment} onChange={e => update('equipment', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tissue">Tissue</Label>
              <Textarea id="tissue" rows={2} value={form.tissue} onChange={e => update('tissue', e.target.value)} />
            </div>
          </div>

          <Separator />
          <p className="text-xs font-medium text-muted-foreground">Body Donation Program</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bdp_superficial">Superficial (skin incisions)</Label>
              <Textarea id="bdp_superficial" rows={2} value={form.bdp_superficial} onChange={e => update('bdp_superficial', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bdp_compartments">Compartments &amp; soft tissues</Label>
              <Textarea id="bdp_compartments" rows={2} value={form.bdp_compartments} onChange={e => update('bdp_compartments', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bdp_bony">Bony structures</Label>
              <Textarea id="bdp_bony" rows={2} value={form.bdp_bony_structures} onChange={e => update('bdp_bony_structures', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bdp_vasc">Vascular structures</Label>
              <Textarea id="bdp_vasc" rows={2} value={form.bdp_vasculature} onChange={e => update('bdp_vasculature', e.target.value)} />
            </div>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="collaboration">Collaboration</Label>
            <Input id="collaboration" value={form.collaboration} onChange={e => update('collaboration', e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} value={form.notes} onChange={e => update('notes', e.target.value)} />
          </div>

          {session && (
            <>
              <Separator />
              <AttachmentList sessionId={session.id} canEdit={true} />
            </>
          )}
        </div>

        <DialogFooter className="flex !justify-between">
          {onDelete ? (
            <Button variant="destructive" size="sm" onClick={onDelete} type="button">
              Delete session
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Discard</Button>
            <Button onClick={handleSave} disabled={saving || !form.session_date}>
              {saving ? 'Saving...' : isCreateMode ? 'Create session' : 'Save changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
