'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plus, Upload, Star } from 'lucide-react';
import { toast } from 'sonner';
import type { AcademicYear } from '@/types/database';
import Link from 'next/link';

export default function AdminYearsPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [importYearId, setImportYearId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchYears = async () => {
    const res = await fetch('/api/academic-years');
    if (res.ok) setYears((await res.json()) as AcademicYear[]);
    setLoading(false);
  };

  useEffect(() => { fetchYears(); }, []);

  const handleCreate = async () => {
    if (!/^\d{4}-\d{4}$/.test(newLabel)) {
      toast.error('Format must be YYYY-YYYY (e.g., 2025-2026)');
      return;
    }
    setCreating(true);
    const res = await fetch('/api/academic-years', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newLabel }),
    });
    if (!res.ok) toast.error((await res.json().catch(() => ({}))).error || 'Failed to create year');
    else {
      toast.success('Academic year created');
      setCreateOpen(false);
      setNewLabel('');
      fetchYears();
    }
    setCreating(false);
  };

  const handleSetCurrent = async (yearId: string) => {
    const res = await fetch(`/api/academic-years/${yearId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_current: true }),
    });
    if (!res.ok) toast.error('Failed to set current year');
    else {
      toast.success('Current year updated');
      fetchYears();
    }
  };

  const handleImport = async (file: File) => {
    if (!importYearId) return;
    setImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/academic-years/${importYearId}/import`, {
        method: 'POST',
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Import failed');

      toast.success(`Imported ${body.imported} sessions`);
      setImportYearId(null);
    } catch (err) {
      toast.error(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    setImporting(false);
  };

  return (
    <div className="px-4 lg:px-6 py-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Academic Years</h1>
            <p className="text-sm text-muted-foreground">Manage academic years and import data</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Year
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map(year => (
                <TableRow key={year.id}>
                  <TableCell className="font-medium">{year.label}</TableCell>
                  <TableCell>
                    {year.is_current ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Current</Badge>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleSetCurrent(year.id)}>
                        <Star className="mr-1 h-3 w-3" />
                        Set current
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {year.start_date} to {year.end_date}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setImportYearId(year.id); fileRef.current?.click(); }}
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      Import CSV
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
          e.target.value = '';
        }}
      />

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Academic Year</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="label">Year Label</Label>
              <Input
                id="label"
                placeholder="2026-2027"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Format: YYYY-YYYY (e.g., 2026-2027)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import loading */}
      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-2">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm font-medium">Importing sessions...</p>
          </div>
        </div>
      )}
    </div>
  );
}
