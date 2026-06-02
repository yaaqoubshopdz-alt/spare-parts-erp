/**
 * PaginationFooter — شريط التنقل بين الصفحات (أسفل الجدول)
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationFooterProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export default function PaginationFooter({ page, total, limit, onPageChange }: PaginationFooterProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);
      
      if (start > 2) pages.push('ellipsis');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-border_default/30 bg-background_primary/80 shrink-0">
      {/* Info */}
      <span className="text-[13px] font-bold text-text_muted">
        {total === 0 ? (
          'لا توجد نتائج'
        ) : (
          <>عرض <span className="font-numbers text-text_primary">{from}</span> إلى <span className="font-numbers text-text_primary">{to}</span> من <span className="font-numbers text-text_primary">{total}</span></>
        )}
      </span>

      {/* Page buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border_default bg-background_card text-text_muted hover:text-text_primary hover:border-primary_blue/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={16} />
        </button>

        {getPageNumbers().map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`e-${idx}`} className="w-8 h-8 flex items-center justify-center text-text_muted text-xs">•••</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                p === page
                  ? 'bg-primary_blue text-white shadow-sm'
                  : 'border border-border_default bg-background_card text-text_muted hover:text-text_primary hover:border-primary_blue/40'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border_default bg-background_card text-text_muted hover:text-text_primary hover:border-primary_blue/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={16} />
        </button>
      </div>
    </div>
  );
}
