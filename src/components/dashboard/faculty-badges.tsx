'use client';

import { Badge } from '@/components/ui/badge';

interface FacultyBadgesProps {
  faculty: string[];
}

export function FacultyBadges({ faculty }: FacultyBadgesProps) {
  if (!faculty || faculty.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {faculty.map((name, i) => (
        <Badge key={i} variant="secondary" className="text-xs font-normal px-1.5 py-0">
          {name}
        </Badge>
      ))}
    </div>
  );
}
