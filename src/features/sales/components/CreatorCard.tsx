import React from 'react';
import { Plus } from 'lucide-react';

interface CreatorCardProps {
  onAdd: () => void;
}

export const CreatorCard = React.memo(function CreatorCard({ onAdd }: CreatorCardProps) {
  return (
    <div
      onClick={onAdd}
      className="
        relative flex flex-col w-full rounded-2xl border-2 border-dashed border-white/10
        bg-black/25 cursor-pointer transition-all duration-300
        hover:border-primary_blue/50 hover:bg-primary_blue/5 group
      "
    >
      <div className="w-full aspect-video flex items-center justify-center border-b border-white/5">
        <div className="flex flex-col items-center gap-4 text-white/20 group-hover:text-primary_blue transition-colors">
          <Plus size={54} strokeWidth={1.5} />
          <span className="text-base font-bold tracking-wide">جديد</span>
        </div>
      </div>
      {/* Empty bottom section to align heights with WorkspaceCard */}
      <div className="h-10" />
    </div>
  );
});
