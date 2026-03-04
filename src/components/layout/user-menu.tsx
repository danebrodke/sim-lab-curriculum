'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Shield, Calendar, RefreshCw, KeyRound } from 'lucide-react';
import { isAdmin } from '@/lib/auth/roles';
import type { Profile } from '@/types/database';
import { toast } from 'sonner';
import Link from 'next/link';
import { SetPasswordDialog } from './set-password-dialog';

interface UserMenuProps {
  profile: Profile;
  onSignOut: () => void;
}

export function UserMenu({ profile, onSignOut }: UserMenuProps) {
  const [regenerating, setRegenerating] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const initials = (profile.display_name || profile.email.split('@')[0])
    .split(/[\s._-]/)
    .map(s => s[0]?.toUpperCase())
    .slice(0, 2)
    .join('');

  const roleLabel = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);

  const handleCopyCalendarUrl = () => {
    const url = `${window.location.origin}/api/calendar/${profile.calendar_token}`;
    navigator.clipboard.writeText(url);
    toast.success('Calendar URL copied to clipboard');
  };

  const handleSubscribeCalendar = () => {
    const webcalUrl = `webcal://${window.location.host}/api/calendar/${profile.calendar_token}`;
    window.open(webcalUrl);
  };

  const handleRegenerateToken = async () => {
    setRegenerating(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ calendar_token: crypto.randomUUID() })
      .eq('id', profile.id);

    if (error) {
      toast.error('Failed to regenerate calendar token');
    } else {
      toast.success('Calendar token regenerated. Update your calendar subscription.');
      window.location.reload();
    }
    setRegenerating(false);
  };

  return (
    <>
    <SetPasswordDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog} />
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs font-medium bg-primary/10">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{profile.display_name || profile.email.split('@')[0]}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
            <Badge variant="secondary" className="w-fit text-xs mt-1">{roleLabel}</Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSubscribeCalendar}>
          <Calendar className="mr-2 h-4 w-4" />
          Subscribe (Apple/Outlook)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyCalendarUrl}>
          <Calendar className="mr-2 h-4 w-4" />
          Copy calendar URL (Google)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleRegenerateToken} disabled={regenerating}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Regenerate calendar token
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowPasswordDialog(true)}>
          <KeyRound className="mr-2 h-4 w-4" />
          Set password
        </DropdownMenuItem>
        {isAdmin(profile.role) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/users">
                <Shield className="mr-2 h-4 w-4" />
                Manage users
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/years">
                <Shield className="mr-2 h-4 w-4" />
                Manage academic years
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}
