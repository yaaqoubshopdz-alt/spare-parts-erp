import React from 'react';

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label?: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  shortcut?: string;
}

export default function ToolbarButton({
  icon,
  label,
  onClick,
  className = 'text-text_secondary border-border_default hover:bg-background_card',
  disabled = false,
  shortcut
}: ToolbarButtonProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center gap-1 p-2 min-w-[65px] h-[60px] rounded-xl border transition-all active:scale-95 group ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${className}`}
      title={label}
    >
      {shortcut && (
        <span className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[8.5px] font-sans font-black bg-background_card/95 backdrop-blur-md text-current rounded-lg border border-current/40 uppercase select-none leading-none shadow-[0_2px_8px_rgba(0,0,0,0.4)] group-hover:border-current group-hover:scale-105 transition-all z-20">
          {shortcut}
        </span>
      )}
      <div className="shrink-0">{icon}</div>
      {label && <span className="text-[10px] font-bold opacity-80 whitespace-nowrap">{label}</span>}
    </button>
  );
}
