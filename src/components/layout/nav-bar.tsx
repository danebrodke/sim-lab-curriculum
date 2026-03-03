'use client';

import { useUser } from '@/hooks/use-user';
import { UserMenu } from './user-menu';
import { Skeleton } from '@/components/ui/skeleton';

export function NavBar() {
  const { profile, loading, signOut } = useUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative flex h-14 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3 shrink-0">
          <h1 className="text-sm lg:text-lg font-semibold tracking-tight whitespace-nowrap">
            Sim Lab Curriculum
          </h1>
          <span className="hidden sm:inline text-xs text-muted-foreground font-medium">
            OHSU Orthopaedics
          </span>
        </div>
        {/* Portal target for page-specific center content (e.g. year nav) */}
        <div id="navbar-center" className="absolute left-1/2 -translate-x-1/2 hidden lg:block" />
        <div className="flex items-center gap-2">
          {loading ? (
            <Skeleton className="h-8 w-8 rounded-full" />
          ) : profile ? (
            <UserMenu profile={profile} onSignOut={signOut} />
          ) : null}
        </div>
      </div>
    </header>
  );
}
