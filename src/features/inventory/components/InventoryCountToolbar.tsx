import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Hash, Calendar, FileText, CheckSquare, ArrowRight, Play, XOctagon, Check } from 'lucide-react';

interface ToolbarProps {
  sessionNumber: string;
  startedAt: string;
  durationStr: string;
  progressPct: number;
  checkedCount: number;
  totalProducts: number;
  isCounting: boolean;
  isReviewing: boolean;
  isApproved: boolean;
  finishing: boolean;
  categories: any[];
  selectedCategoryId: number | null;
  onCategoryChange: (id: number | null) => void;
  itemsStatusFilter: string;
  onStatusFilterChange: (val: string) => void;
  itemsZeroFilter: string;
  onZeroFilterChange: (val: string) => void;
  itemsSearch: string;
  onSearchChange: (val: string) => void;
  onFinish: () => void;
  onSummary: () => void;
  onClose: () => void;
  onApprove?: () => void;
  onCancel?: () => void;
  onStartNew?: () => void;
  allColumns: any[];
  toggleHide: (key: string) => void;
  reorder: (from: number, to: number) => void;
  reset: () => void;
}

export default function InventoryCountToolbar({
  sessionNumber, startedAt, durationStr, progressPct, checkedCount, totalProducts,
  isCounting, isReviewing, isApproved, finishing, categories, selectedCategoryId, onCategoryChange,
  itemsStatusFilter, onStatusFilterChange, itemsZeroFilter, onZeroFilterChange,
  itemsSearch, onSearchChange, onFinish, onSummary, onClose, onApprove, onCancel, onStartNew,
  allColumns, toggleHide, reorder, reset,
}: ToolbarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => setOpenDropdown(null), []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const statusLabel = !itemsStatusFilter ? 'حالة الجرد: الكل' :
    itemsStatusFilter === 'checked' ? 'مجرود' : 'غير مجرود';

  const zeroLabel = itemsZeroFilter === 'all' || !itemsZeroFilter ? 'المنتجات: الكل' :
    itemsZeroFilter === 'zero' ? 'الصفرية فقط' :
    itemsZeroFilter === 'hidden' ? 'المخفية' : 'النشطة';

  const catLabel = selectedCategoryId
    ? categories.find(c => c.id === selectedCategoryId)?.name || 'تصنيف'
    : 'جميع التصنيفات';

  const toggleDropdown = (name: string) => {
    setOpenDropdown(prev => prev === name ? null : name);
  };

  return (
    <div className="flex flex-col shrink-0 w-full bg-white/30 dark:bg-black/30 backdrop-blur-xl border-b border-black/[0.07] dark:border-white/[0.07] relative z-[50]">
      {/* ROW 1: Session info + date + duration + progress */}
      <div className="h-[59px] px-5 flex items-center justify-between border-b border-black/[0.07] dark:border-white/[0.07] bg-transparent relative z-[60]">
        <div className="flex items-center gap-6 flex-1">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-11 h-11 rounded-lg border border-border_default bg-background_card text-text_secondary hover:text-text_primary hover:bg-background_card_hover hover:border-primary_blue/30 hover:shadow-md transition-all cursor-pointer select-none active:scale-95 shrink-0"
            title="العودة لإدارة المنتجات"
          >
            <ArrowRight size={20} className="rtl:rotate-0 ltr:rotate-180 text-primary_blue" />
          </button>

          <div className="flex items-center bg-background_card border border-success_green/20 rounded-lg h-11 overflow-hidden shadow-[0_0_15px_rgba(34,197,94,0.05)] shrink-0 min-w-[180px]">
            <span className="px-3 text-[10px] font-black text-text_primary bg-background_card border-l border-border_default flex flex-col items-center justify-center h-full uppercase tracking-tighter leading-none shrink-0">
              <span>رقم</span>
              <span>الجرد</span>
            </span>
            <span className="px-4 text-base font-black font-numbers text-success_green tracking-wider">{sessionNumber}</span>
            <div className="px-2 border-r border-border_default h-full flex items-center bg-background_card">
              <Hash size={14} className="text-success_green opacity-60" />
            </div>
          </div>

          <div className="flex items-center bg-background_card border border-border_default rounded-lg h-11 overflow-hidden shadow-inner">
            <input
              type="text"
              value={new Date(startedAt + 'Z').toLocaleDateString('ar-DZ') + ' ' + new Date(startedAt + 'Z').toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
              readOnly
              className="bg-transparent text-sm text-text_primary px-3 outline-none font-numbers h-full w-[160px] cursor-default"
            />
            <span className="px-3 text-[13px] font-black text-text_primary bg-background_card border-r border-border_default flex items-center h-full tracking-wider">
              <Calendar size={14} className="ml-1.5 text-success_green" /> البداية
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-text_muted font-numbers">
            <span className="text-text_secondary">المدة:</span>
            <span className="font-bold text-text_primary">{durationStr}</span>
          </div>
        </div>

        {/* Progress bar — thin, subtle */}
        <div className="flex items-center gap-2 min-w-[140px] max-w-[200px]">
          <div className="flex-1 h-1.5 bg-background_primary rounded-full overflow-hidden border border-border_default">
            <div
              className="h-full bg-success_green rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs font-numbers font-bold text-text_primary shrink-0">{progressPct}%</span>
        </div>
      </div>

      {/* ROW 2: Search + Dropdowns + Action buttons */}
      <div className="h-[67px] px-5 flex items-center justify-between bg-transparent backdrop-blur-md relative z-50">
        <div className="flex items-center gap-4 flex-1">
          {/* Search */}
          <div className="relative w-[380px] transition-all duration-300 ease-in-out group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-success_green z-10" size={18} />
            <input
              type="text"
              value={itemsSearch}
              onChange={e => onSearchChange(e.target.value)}
              dir="auto"
              placeholder="بحث (اسم، باركود)..."
              className="w-full bg-background_card border-2 border-success_green/30 rounded-lg h-[44px] pr-10 pl-4 text-sm text-text_primary font-bold placeholder:text-text_primary focus:border-success_green focus:ring-2 focus:ring-success_green/20 focus:outline-none transition-all shadow-sm hover:border-success_green/50"
            />
          </div>

          {/* Dropdowns container */}
          <div className="flex items-center gap-3" ref={containerRef}>
            {/* Dropdown: Categories */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('category')}
                className="h-[44px] px-4 bg-background_card border-2 border-border_default rounded-lg text-sm text-text_primary outline-none hover:border-success_green/50 transition-all cursor-pointer flex items-center gap-2"
              >
                {catLabel} <span className="text-text_muted">▾</span>
              </button>
              {openDropdown === 'category' && (
                <div className="absolute top-full mt-1 w-[220px] bg-background_card border border-border_default shadow-2xl rounded-xl overflow-hidden z-[100]">
                  <button onClick={() => { onCategoryChange(null); closeDropdown(); }} className="w-full text-right px-4 py-3 text-sm text-text_primary hover:bg-background_primary transition-colors">جميع التصنيفات</button>
                  {categories.map(c => (
                    <button key={c.id} onClick={() => { onCategoryChange(c.id); closeDropdown(); }} className="w-full text-right px-4 py-3 text-sm text-text_primary hover:bg-background_primary transition-colors">{c.name}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Dropdown: Status */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('status')}
                className="h-[44px] px-4 bg-background_card border-2 border-border_default rounded-lg text-sm text-text_primary outline-none hover:border-success_green/50 transition-all cursor-pointer flex items-center gap-2 min-w-[130px]"
              >
                {statusLabel} <span className="text-text_muted">▾</span>
              </button>
              {openDropdown === 'status' && (
                <div className="absolute top-full mt-1 w-[180px] bg-background_card border border-border_default shadow-2xl rounded-xl overflow-hidden z-[100]">
                  <button onClick={() => { onStatusFilterChange(''); closeDropdown(); }} className="w-full text-right px-4 py-3 text-sm text-text_primary hover:bg-background_primary transition-colors">الكل</button>
                  <button onClick={() => { onStatusFilterChange('checked'); closeDropdown(); }} className="w-full text-right px-4 py-3 text-sm text-text_primary hover:bg-background_primary transition-colors">مجرود</button>
                  <button onClick={() => { onStatusFilterChange('unchecked'); closeDropdown(); }} className="w-full text-right px-4 py-3 text-sm text-text_primary hover:bg-background_primary transition-colors">غير مجرود</button>
                </div>
              )}
            </div>

            {/* Dropdown: Products filter */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('zero')}
                className="h-[44px] px-4 bg-background_card border-2 border-border_default rounded-lg text-sm text-text_primary outline-none hover:border-success_green/50 transition-all cursor-pointer flex items-center gap-2 min-w-[130px]"
              >
                {zeroLabel} <span className="text-text_muted">▾</span>
              </button>
              {openDropdown === 'zero' && (
                <div className="absolute top-full mt-1 w-[180px] bg-background_card border border-border_default shadow-2xl rounded-xl overflow-hidden z-[100]">
                  <button onClick={() => { onZeroFilterChange('all'); closeDropdown(); }} className="w-full text-right px-4 py-3 text-sm text-text_primary hover:bg-background_primary transition-colors">كل المنتجات</button>
                  <button onClick={() => { onZeroFilterChange('zero'); closeDropdown(); }} className="w-full text-right px-4 py-3 text-sm text-text_primary hover:bg-background_primary transition-colors">الصفرية فقط</button>
                  <button onClick={() => { onZeroFilterChange('hidden'); closeDropdown(); }} className="w-full text-right px-4 py-3 text-sm text-text_primary hover:bg-background_primary transition-colors">المخفية</button>
                  <button onClick={() => { onZeroFilterChange('active'); closeDropdown(); }} className="w-full text-right px-4 py-3 text-sm text-text_primary hover:bg-background_primary transition-colors">النشطة</button>
                </div>
              )}
            </div>


          </div>
        </div>

        {/* Action buttons — larger with available space */}
        <div className="flex items-center gap-4 mr-6">
          <button
            onClick={onSummary}
            className="flex items-center justify-center gap-2.5 px-6 h-[52px] rounded-xl border border-border_default text-text_primary hover:bg-background_card_hover hover:shadow-md transition-all active:scale-95 shrink-0"
          >
            <FileText size={18} />
            <span className="text-[14px] font-black leading-none tracking-wider">ملخص</span>
          </button>
          
          {isCounting && (
            <button
              onClick={onFinish}
              disabled={finishing}
              className="flex items-center justify-center gap-2.5 px-6 h-[52px] rounded-xl border border-success_green/40 text-success_green hover:bg-success_green/10 hover:shadow-md hover:shadow-success_green/5 transition-all active:scale-95 disabled:opacity-50 font-black cursor-pointer shrink-0"
            >
              <CheckSquare size={18} />
              <span className="text-[14px] font-black leading-none tracking-wider">إنهاء الجرد</span>
            </button>
          )}

          {isReviewing && (
            <>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="flex items-center justify-center gap-2.5 px-6 h-[52px] rounded-xl border border-danger_red/40 text-danger_red hover:bg-danger_red/10 hover:shadow-md hover:shadow-danger_red/5 transition-all active:scale-95 font-black cursor-pointer shrink-0"
                >
                  <XOctagon size={18} />
                  <span className="text-[14px] font-black leading-none tracking-wider">إلغاء الجرد</span>
                </button>
              )}
              {onApprove && (
                <button
                  onClick={onApprove}
                  className="flex items-center justify-center gap-2.5 px-6 h-[52px] rounded-xl border border-primary_blue/40 text-primary_blue hover:bg-primary_blue/10 hover:shadow-md hover:shadow-primary_blue/5 transition-all active:scale-95 font-black cursor-pointer shrink-0 animate-pulse"
                >
                  <Check size={18} />
                  <span className="text-[14px] font-black leading-none tracking-wider">اعتماد الجرد</span>
                </button>
              )}
            </>
          )}

          {isApproved && onStartNew && (
            <button
              onClick={onStartNew}
              className="flex items-center justify-center gap-2.5 px-6 h-[52px] rounded-xl border border-success_green/40 text-success_green hover:bg-success_green/10 hover:shadow-md hover:shadow-success_green/5 transition-all active:scale-95 font-black cursor-pointer shrink-0"
            >
              <Play size={18} />
              <span className="text-[14px] font-black leading-none tracking-wider">بدء جرد جديد</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
