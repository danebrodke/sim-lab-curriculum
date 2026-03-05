'use client';

import type { SessionLink } from '@/types/database';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink } from 'lucide-react';

interface SessionLinksProps {
  links: SessionLink[];
}

export function SessionLinks({ links }: SessionLinksProps) {
  if (!links || links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {links.map((link, i) => (
        <Tooltip key={i}>
          <TooltipTrigger asChild>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/5 hover:bg-primary/10 text-xs font-medium text-foreground transition-colors border border-primary/10"
            >
              <span className="truncate max-w-[100px]">{link.title}</span>
              <ExternalLink className="h-3 w-3 text-primary/60 shrink-0" />
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-0.5">
              <p className="font-medium">{link.title}</p>
              <p className="text-muted-foreground">{link.url}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
