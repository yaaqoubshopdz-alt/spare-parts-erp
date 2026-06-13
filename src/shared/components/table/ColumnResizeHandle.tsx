import type { MouseEvent as ReactMouseEvent } from 'react';

interface ColumnResizeHandleProps {
  onResize: (width: number) => void;
  startWidth: number;
  minWidth?: number;
}

export default function ColumnResizeHandle({
  onResize,
  startWidth,
  minWidth = 60,
}: ColumnResizeHandleProps) {
  const handleMouseDown = (e: ReactMouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.pageX;
    
    // Detect layout direction dynamically
    const isRtl = document.documentElement.dir === 'rtl' || 
                  (e.currentTarget.closest('[dir]') as HTMLElement)?.dir === 'rtl';

    document.body.style.cursor = 'col-resize';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.pageX - startX;
      // In RTL, moving left (negative deltaX) increases width
      const multiplier = isRtl ? -1 : 1;
      const newWidth = Math.max(minWidth, startWidth + deltaX * multiplier);
      onResize(newWidth);
    };

    const onMouseUp = () => {
      document.body.style.cursor = 'default';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      className="absolute left-0 top-0 w-2 h-full cursor-col-resize hover:bg-primary_blue/50 active:bg-primary_blue transition-all z-30 opacity-0 group-hover/th:opacity-100"
      onMouseDown={handleMouseDown}
      title="اسحب لتغيير العرض"
    />
  );
}
