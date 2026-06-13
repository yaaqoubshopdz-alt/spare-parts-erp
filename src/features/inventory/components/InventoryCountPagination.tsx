import { useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function InventoryCountPagination({
  page, totalPages, onPageChange,
}: PaginationProps) {
  const [hoveredPrev, setHoveredPrev] = useState(false);
  const [hoveredNext, setHoveredNext] = useState(false);

  const getPageItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis-next', totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, 'ellipsis-prev', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, 'ellipsis-prev', page - 1, page, page + 1, 'ellipsis-next', totalPages];
  };

  const pageItems = getPageItems();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-background_card backdrop-blur-xl border border-border_default rounded-full shadow-glass transition-all duration-300">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="p-2 rounded-full text-text_muted hover:text-text_primary hover:bg-background_card_hover hover:scale-110 active:scale-90 disabled:opacity-20 disabled:pointer-events-none transition-all duration-200 ease-out"
        title="الصفحة السابقة"
      >
        <ArrowRight size={14} className="transition-transform duration-200" />
      </button>

      <div className="flex items-center gap-1.5">
        {pageItems.map((item, idx) => {
          if (item === 'ellipsis-prev') {
            return (
              <button
                key={`ellipsis-prev-${idx}`}
                onClick={() => onPageChange(Math.max(1, page - 5))}
                onMouseEnter={() => setHoveredPrev(true)}
                onMouseLeave={() => setHoveredPrev(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text_muted hover:text-primary_blue hover:bg-background_card_hover hover:scale-105 active:scale-95 transition-all duration-200 ease-out"
                title="رجوع ٥ صفحات"
              >
                {hoveredPrev ? (
                  <ChevronsRight size={14} className="text-primary_blue animate-pulse" />
                ) : (
                  <span className="text-[12px] font-bold select-none tracking-widest">...</span>
                )}
              </button>
            );
          }

          if (item === 'ellipsis-next') {
            return (
              <button
                key={`ellipsis-next-${idx}`}
                onClick={() => onPageChange(Math.min(totalPages, page + 5))}
                onMouseEnter={() => setHoveredNext(true)}
                onMouseLeave={() => setHoveredNext(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text_muted hover:text-primary_blue hover:bg-background_card_hover hover:scale-105 active:scale-95 transition-all duration-200 ease-out"
                title="تقدم ٥ صفحات"
              >
                {hoveredNext ? (
                  <ChevronsLeft size={14} className="text-primary_blue animate-pulse" />
                ) : (
                  <span className="text-[12px] font-bold select-none tracking-widest">...</span>
                )}
              </button>
            );
          }

          const pageNum = item as number;
          const isActive = page === pageNum;

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded-full text-[12px] font-numbers font-bold transition-all duration-200 ease-out ${
                isActive
                  ? 'bg-primary_blue text-white shadow-glow-blue scale-105 pointer-events-none'
                  : 'text-text_muted hover:text-text_primary hover:bg-background_card_hover hover:scale-105 active:scale-95'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="p-2 rounded-full text-text_muted hover:text-text_primary hover:bg-background_card_hover hover:scale-110 active:scale-90 disabled:opacity-20 disabled:pointer-events-none transition-all duration-200 ease-out"
        title="الصفحة التالية"
      >
        <ArrowLeft size={14} className="transition-transform duration-200" />
      </button>
    </div>
  );
}
