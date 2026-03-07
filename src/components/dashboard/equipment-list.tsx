'use client';

import { Badge } from '@/components/ui/badge';

interface EquipmentListProps {
  equipment: string[];
}

export function EquipmentList({ equipment }: EquipmentListProps) {
  if (!equipment || equipment.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {equipment.map((item, i) => (
        <Badge key={i} variant="secondary" className="text-xs font-normal px-1.5 py-0">
          {item}
        </Badge>
      ))}
    </div>
  );
}
