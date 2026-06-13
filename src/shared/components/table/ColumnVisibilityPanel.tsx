import { useState, useRef, useEffect } from 'react';
import { Columns, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import type { ERPColumn } from './types';

interface ColumnVisibilityPanelProps {
  allColumns: ERPColumn[];
  toggleHide: (key: string) => void;
  reorder: (fromIdx: number, toIdx: number) => void;
  reset: () => void;
  protectedKeys?: string[];
  buttonClassName?: string;
}

export default function ColumnVisibilityPanel({
  allColumns,
  toggleHide,
  reorder,
  reset,
  protectedKeys = [],
  buttonClassName,
}: ColumnVisibilityPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const visibleCount = allColumns.filter(c => !c.hidden).length;

  return (
    <div ref={containerRef} className="relative font-cairo" dir="rtl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClassName || `flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[13px] font-bold transition-all ${
          isOpen
            ? 'bg-primary_blue text-white border-primary_blue shadow-md'
            : 'bg-background_card hover:bg-background_secondary text-text_primary border-black/10 dark:border-border_custom/20'
        }`}
      >
        <Columns size={16} />
        <span>الأعمدة</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-background_card/95 dark:bg-sidebar_bg/95 backdrop-blur-md border border-black/10 dark:border-border_custom/20 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-black/5 dark:border-border_custom/5 flex items-center justify-between">
            <span className="text-[14px] font-bold text-text_primary">إعدادات الأعمدة</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              title="إعادة تعيين"
              className="p-1 text-text_muted hover:text-danger_red hover:bg-danger_red/10 rounded-lg transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
            {allColumns.map((col, idx) => {
              const isProtected = protectedKeys.includes(col.key);
              const canToggle = visibleCount > 1 || col.hidden;

              return (
                <div
                  key={col.key}
                  draggable
                  onDragStart={(e) => {
                    setDraggedIndex(idx);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedIndex !== null && draggedIndex !== idx) {
                      reorder(draggedIndex, idx);
                    }
                    setDraggedIndex(null);
                  }}
                  onDragEnd={() => setDraggedIndex(null)}
                  className={`flex items-center justify-between p-2 rounded-xl text-right transition-colors ${
                    draggedIndex === idx ? 'bg-primary_blue/10 opacity-50' : 'hover:bg-background_secondary'
                  } cursor-grab active:cursor-grabbing`}
                >
                  <label className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={!col.hidden}
                      disabled={isProtected || (!canToggle && !col.hidden)}
                      onChange={() => toggleHide(col.key)}
                      className="rounded border-gray-300 dark:border-border_custom text-primary_blue focus:ring-primary_blue w-4 h-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className={`text-[13px] font-bold truncate ${col.hidden ? 'text-text_muted line-through' : 'text-text_primary'}`}>
                      {col.label}
                    </span>
                  </label>

                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      disabled={idx === 0}
                      onClick={() => reorder(idx, idx - 1)}
                      className="p-1 text-text_muted hover:text-primary_blue hover:bg-primary_blue/10 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      disabled={idx === allColumns.length - 1}
                      onClick={() => reorder(idx, idx + 1)}
                      className="p-1 text-text_muted hover:text-primary_blue hover:bg-primary_blue/10 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
