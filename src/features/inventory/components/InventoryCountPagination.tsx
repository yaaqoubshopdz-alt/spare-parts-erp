import { ArrowLeft, ArrowRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function InventoryCountPagination({
  page, totalPages, onPageChange,
}: PaginationProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-background_primary/60 backdrop-blur-xl border border-border_default/40 rounded-full shadow-lg shadow-black/20">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="p-1.5 rounded-full text-text_muted hover:text-text_primary hover:bg-background_card disabled:opacity-25 disabled:cursor-not-allowed transition-all"
      >
        <ArrowRight size={14} />
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 7) {
            pageNum = i + 1;
          } else if (page <= 4) {
            pageNum = i + 1;
          } else if (page >= totalPages - 3) {
            pageNum = totalPages - 6 + i;
          } else {
            pageNum = page - 3 + i;
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[30px] h-7 rounded-full text-xs font-numbers font-bold transition-all ${
                page === pageNum
                  ? 'bg-primary_blue/90 text-white shadow-sm shadow-primary_blue/25'
                  : 'text-text_muted hover:text-text_primary hover:bg-background_card/50'
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
        className="p-1.5 rounded-full text-text_muted hover:text-text_primary hover:bg-background_card disabled:opacity-25 disabled:cursor-not-allowed transition-all"
      >
        <ArrowLeft size={14} />
      </button>
    </div>
  );
}
