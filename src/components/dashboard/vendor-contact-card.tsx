'use client';

import type { VendorContact } from '@/types/database';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Mail } from 'lucide-react';

interface VendorContactCardProps {
  contacts: VendorContact[];
}

export function VendorContactCards({ contacts }: VendorContactCardProps) {
  if (!contacts || contacts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {contacts.map((contact, i) => (
        <ContactChip key={i} contact={contact} />
      ))}
    </div>
  );
}

function ContactChip({ contact }: { contact: VendorContact }) {
  const label = contact.company
    ? `${contact.name} (${contact.company})`
    : contact.name;

  if (!contact.email) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
        {contact.name}
      </span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={`mailto:${contact.email}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/5 hover:bg-primary/10 text-xs font-medium text-foreground transition-colors border border-primary/10"
        >
          <span className="truncate max-w-[120px]">{contact.name}</span>
          <Mail className="h-3 w-3 text-primary/60 shrink-0" />
        </a>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-0.5">
          <p className="font-medium">{label}</p>
          <p className="text-muted-foreground">{contact.email}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
