import React, { useState } from 'react';
import { Save, Printer, Plus, Trash2, FolderOpen, Search, AlertCircle, CheckCircle2, Banknote, Calendar, Hash, User, XCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolbarButton from '../ui/ToolbarButton';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useAppStore } from '../../../store/app.store';
import { useTranslation } from 'react-i18next';
import { useShortcutStore } from '../../../store/shortcutStore';
import { useSmoothScroll } from '../../hooks/useSmoothScroll';

interface ProInvoiceLayoutProps {
  title: string;
  invoiceNumber: string;
  date: string;
  onDateChange: (val: string) => void;
  customerSlot?: React.ReactNode;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onCancel?: () => void;
  onPrint: () => void;
  onDelete: () => void;
  totalAmount: number;
  paidAmount: number;
  onPaidAmountChange?: (val: number) => void;
  remainingAmount: number;
  dueAmount: number;
  customerBalance?: number;
  headerCells: React.ReactNode;
  productDropdown?: React.ReactNode;
  children: React.ReactNode; 
  customFooterActions?: React.ReactNode; 
  summaryActions?: React.ReactNode;
  saveLabel?: string;
  cancelLabel?: string;
  saveColor?: string;
  balanceLabel?: string;
  searchWidth?: string;
  searchActions?: React.ReactNode;
  customerSlotWidth?: string;
  onInvoiceNumberChange?: (val: string) => void;
  extraHeaderSlot?: React.ReactNode;
  searchMode?: 'bar' | 'icon';
  isSaving?: boolean;
  onSearchFocus?: () => void;
  searchRef?: React.RefObject<HTMLInputElement>;
  notes?: string;
  onNotesChange?: (val: string) => void;
  selectedCategoryId?: number | null;
  onCategoryChange?: (id: number | null) => void;
}

export default function ProInvoiceLayout({
  title, invoiceNumber, date, onDateChange,
  customerSlot,
  searchQuery, onSearchChange, onSearchKeyDown,
  onNew, onOpen, onSave, onCancel, onPrint, onDelete,
  totalAmount, paidAmount, onPaidAmountChange, remainingAmount, dueAmount, customerBalance = 0,
  headerCells, productDropdown, children, customFooterActions, summaryActions,
  saveLabel, cancelLabel, saveColor = 'text-success_green border-success_green/50 hover:bg-success_green/10',
  balanceLabel,
  searchWidth = 'w-[550px]',
  searchActions,
  customerSlotWidth = 'w-[480px]',
  onInvoiceNumberChange,
  extraHeaderSlot,
  searchMode = 'bar',
  isSaving = false,
  onSearchFocus,
  searchRef,
  notes = '',
  onNotesChange,
  selectedCategoryId = null,
  onCategoryChange
}: ProInvoiceLayoutProps) {
  const { t } = useTranslation();
  const [isSearchExpanded, setIsSearchExpanded] = React.useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showNotes, setShowNotes] = React.useState(!!notes);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = useSmoothScroll<HTMLDivElement>();
  const shortcuts = useShortcutStore(state => state.shortcuts);

  const [categories, setCategories] = React.useState<any[]>([]);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = React.useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = React.useState<number>(-1);

  React.useEffect(() => {
    setActiveSuggestionIndex(-1);
  }, [searchQuery]);

  React.useEffect(() => {
    if (onCategoryChange) {
      window.electronAPI.invoke('db:categories:getAll')
        .then((res: any) => {
          if (res?.success) setCategories(res.data || []);
        })
        .catch(err => console.error(err));
    }
  }, [onCategoryChange]);

  React.useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res: any = await window.electronAPI.invoke('db:products:suggest', {
          query: searchQuery,
          category_id: selectedCategoryId
        });
        if (res?.success && res.data) {
          setSuggestions(res.data);
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategoryId]);

  React.useEffect(() => {
    if (notes && !showNotes) {
      setShowNotes(true);
    }
  }, [notes]);

  const workspaces = useWorkspaceStore(state => state.workspaces);
  const toggleSwitcher = useWorkspaceStore(state => state.toggleSwitcher);
  const workspaceCount = Object.keys(workspaces).length;
  const { direction } = useAppStore();

  const displaySaveLabel = saveLabel || t('common.save');
  const displayCancelLabel = cancelLabel || t('common.cancel_invoice');
  const displayBalanceLabel = balanceLabel || t('invoice.customer_balance');

  let glowColor = 'from-primary_blue';
  let glowOpacity = 'opacity-[0.03]';
  let textGlowClass = 'drop-shadow-[0_0_40px_rgba(37,99,235,0.3)]'; // Default blue glow when total is 0

  if (totalAmount > 0) {
    if (paidAmount >= totalAmount) {
      glowColor = 'from-success_green';
      glowOpacity = 'opacity-[0.04]';
      textGlowClass = 'drop-shadow-[0_0_40px_rgba(16,185,129,0.55)]'; // Green glow (fully paid)
    } else if (paidAmount > 0) {
      glowColor = 'from-warning_amber';
      glowOpacity = 'opacity-[0.04]';
      textGlowClass = 'drop-shadow-[0_0_40px_rgba(245,158,11,0.55)]'; // Orange/Amber glow (partially paid)
    } else {
      glowColor = 'from-danger_red';
      glowOpacity = 'opacity-[0.035]';
      textGlowClass = 'drop-shadow-[0_0_40px_rgba(239,68,68,0.55)]'; // Red glow (unpaid)
    }
  }

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchExpanded(false);
        setShowSuggestions(false);
        setShowCategoryDropdown(false);
      }
    };
    if (isSearchExpanded || showSuggestions || showCategoryDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchExpanded, showSuggestions, showCategoryDropdown]);

  return (
    <div className="relative flex flex-col h-full w-full bg-transparent text-text_primary overflow-hidden font-cairo">
      
      {/* ── TOP TOOLBAR (Header Redesigned: Two Rows) ── */}
      <div className="flex flex-col shrink-0 w-full border-b border-black/[0.07] dark:border-white/[0.07] bg-white/30 dark:bg-black/30 backdrop-blur-xl relative z-[50]">
        
        {/* ROW 1: Customer Selector, Date, Invoice Number */}
        <div className="h-[65px] px-6 flex items-center justify-between border-b border-border_default bg-transparent relative z-[60]">
           <div className="flex items-center gap-8 flex-1">
              {/* Customer Selector Slot (F3) */}
              <div className={customerSlotWidth}>
                 {customerSlot}
              </div>

              {/* Date Selector */}
              <div className="flex items-center bg-background_card border border-border_default rounded-lg h-11 overflow-hidden shadow-inner group hover:border-border_default transition-all">
                 <input 
                   type="date" 
                   value={date} 
                   onChange={e => onDateChange(e.target.value)}
                   className="bg-transparent text-lg text-text_primary px-4 outline-none font-numbers h-full w-[170px] cursor-pointer" 
                 />
                 <span className={`px-4 text-[13px] font-black text-text_primary bg-background_card border-r border-border_default flex items-center h-full uppercase group-hover:bg-background_card transition-colors ${direction === 'ltr' ? 'tracking-wider' : ''}`}>
                   <Calendar size={16} className="ml-2 text-success_green drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"/> {t('invoice.date')}
                 </span>
              </div>

              {/* Workspace Switcher Button */}
              {workspaceCount > 1 && (
                <button
                  onClick={toggleSwitcher}
                  className="flex items-center gap-2.5 px-4 h-11 rounded-lg border border-primary_blue/30 bg-primary_blue/10 hover:bg-primary_blue/20 text-primary_blue hover:text-primary_blue_hover font-bold text-sm shadow-[0_0_15px_rgba(37,99,235,0.08)] transition-all active:scale-95 group shrink-0"
                  title={t('invoice.active_workspaces')}
                >
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary_blue opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary_blue"></span>
                  </span>
                  <span>{t('invoice.workspaces')}</span>
                  <span className="font-numbers font-black bg-primary_blue text-white px-2 py-0.5 rounded-md text-xs">{workspaceCount}</span>
                </button>
              )}
           </div>

           {/* Invoice Number (Left Aligned in RTL) */}
           <div className="flex items-center bg-background_card border border-success_green/20 rounded-lg h-11 overflow-hidden shadow-[0_0_15px_rgba(34,197,94,0.05)] shrink-0 min-w-[200px]">
              <span className={`px-3 text-[10px] font-black text-text_primary bg-background_card border-l border-border_default flex flex-col items-center justify-center h-full uppercase shrink-0 leading-none ${direction === 'ltr' ? 'tracking-tighter' : ''}`}>
                {t('invoice.invoice_number')}
              </span>
              {onInvoiceNumberChange ? (
                <input 
                  type="text"
                  value={invoiceNumber}
                  onChange={e => onInvoiceNumberChange(e.target.value)}
                  className="bg-transparent text-base font-black font-numbers text-success_green tracking-wider px-3 outline-none h-full w-[140px] text-left"
                />
              ) : (
                <span className="px-4 text-base font-black font-numbers text-success_green tracking-wider">{invoiceNumber}</span>
              )}
              <div className="px-2 border-r border-border_default h-full flex items-center bg-background_card">
                <Hash size={14} className="text-success_green opacity-60"/>
              </div>
           </div>
        </div>

        {/* ROW 2: Product Search, Actions, Print */}
        <div className="h-[80px] px-6 flex items-center justify-between bg-transparent relative z-50">
           <div className="flex items-center gap-5 flex-1">
              {/* Product Search (F2) */}
              <div 
                id="product-search-container"
                className={`relative ${searchMode === 'bar' ? searchWidth : (isSearchExpanded ? searchWidth : 'w-[44px]')} transition-all duration-300 ease-in-out group`} 
                ref={searchContainerRef}
              >
                {searchMode === 'icon' && !isSearchExpanded ? (
                  <button 
                    onClick={() => setIsSearchExpanded(true)} 
                    className="w-[44px] h-[44px] flex items-center justify-center bg-background_card border-2 border-success_green/30 rounded-lg text-success_green hover:bg-success_green/10 transition-colors"
                  >
                    <Search size={18} />
                  </button>
                ) : (
                  <>
                    <div className="flex items-stretch bg-background_card border-2 border-success_green/30 rounded-lg h-[44px] focus-within:border-success_green focus-within:ring-2 focus-within:ring-success_green/20 transition-all shadow-sm hover:border-success_green/50 overflow-visible relative" dir="ltr">
                      {onCategoryChange && (
                        <div className="relative shrink-0 flex items-center h-full">
                          <button
                            type="button"
                            onClick={() => {
                              setShowCategoryDropdown(!showCategoryDropdown);
                              setShowSuggestions(false);
                            }}
                            className="h-full px-4 flex items-center gap-2 bg-background_card hover:bg-background_card_hover text-xs font-bold text-text_primary select-none cursor-pointer border-l-0 border-r-2 border-success_green/30 focus:outline-none transition-colors shrink-0"
                          >
                            <span>
                              {selectedCategoryId 
                                ? (categories.find(c => c.id === selectedCategoryId)?.name || 'الكل')
                                : 'الكل'
                              }
                            </span>
                            <span 
                              className="text-success_green text-[10px] transition-transform duration-200" 
                              style={{ display: 'inline-block', transform: showCategoryDropdown ? 'rotate(180deg)' : 'none' }}
                            >
                              ▼
                            </span>
                          </button>
                          
                          {showCategoryDropdown && (
                            <div className="absolute left-0 top-[48px] bg-background_card border border-success_green/30 rounded-xl shadow-2xl z-[70] p-1.5 min-w-[160px] flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
                              <button
                                type="button"
                                onClick={() => {
                                  onCategoryChange(null);
                                  setShowCategoryDropdown(false);
                                }}
                                className={`w-full text-right px-3 py-2 text-xs rounded-lg transition-colors font-bold ${!selectedCategoryId ? 'bg-success_green/10 text-success_green' : 'text-text_primary hover:bg-success_green/5'}`}
                              >
                                الكل
                              </button>
                              {categories.map((c: any) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    onCategoryChange(c.id);
                                    setShowCategoryDropdown(false);
                                  }}
                                  className={`w-full text-right px-3 py-2 text-xs rounded-lg transition-colors font-bold ${selectedCategoryId === c.id ? 'bg-success_green/10 text-success_green' : 'text-text_primary hover:bg-success_green/5'}`}
                                >
                                  {c.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-success_green drop-shadow-[0_0_10px_rgba(16,185,129,0.6)] z-10" size={18} />
                      <div className="flex-1 relative flex items-center h-full">
                        {/* Ghost Text Overlay */}
                        {searchQuery && suggestions.length > 0 && (suggestions.find(s => s.toLowerCase().startsWith(searchQuery.toLowerCase()))) && (
                          (() => {
                            const match = suggestions.find(s => s.toLowerCase().startsWith(searchQuery.toLowerCase())) || '';
                            const isRtl = /[\u0600-\u06FF]/.test(searchQuery[0] || '');
                            return (
                              <div 
                                className="absolute inset-0 pr-10 pl-4 flex items-center pointer-events-none select-none text-sm font-bold"
                                dir={isRtl ? 'rtl' : 'ltr'}
                              >
                                <span className="opacity-0 whitespace-pre">{searchQuery}</span>
                                <span className="text-text_muted/30">{match.slice(searchQuery.length)}</span>
                              </div>
                            );
                          })()
                        )}
                        <input 
                          ref={searchRef}
                          type="text" 
                          value={searchQuery} 
                          onChange={e => {
                            onSearchChange(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onKeyDown={(e) => {
                            const topSuggestions = suggestions.slice(0, 4);
                            if (topSuggestions.length > 0) {
                              if (e.key === 'ArrowRight') {
                                e.preventDefault();
                                const nextIdx = activeSuggestionIndex + 1;
                                if (nextIdx < topSuggestions.length) {
                                  setActiveSuggestionIndex(nextIdx);
                                  onSearchChange(topSuggestions[nextIdx]);
                                } else {
                                  setActiveSuggestionIndex(0);
                                  onSearchChange(topSuggestions[0]);
                                }
                                return;
                              }
                              if (e.key === 'ArrowLeft') {
                                e.preventDefault();
                                const prevIdx = activeSuggestionIndex - 1;
                                if (prevIdx >= 0) {
                                  setActiveSuggestionIndex(prevIdx);
                                  onSearchChange(topSuggestions[prevIdx]);
                                } else {
                                  const lastIdx = topSuggestions.length - 1;
                                  setActiveSuggestionIndex(lastIdx);
                                  onSearchChange(topSuggestions[lastIdx]);
                                }
                                return;
                              }
                              if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
                                e.preventDefault();
                                const selectedSug = topSuggestions[activeSuggestionIndex];
                                if (selectedSug) {
                                  onSearchChange(selectedSug);
                                  setShowSuggestions(false);
                                  setActiveSuggestionIndex(-1);
                                }
                                return;
                              }
                            }
                            if (onSearchKeyDown) {
                              onSearchKeyDown(e);
                            }
                          }}
                          onFocus={() => {
                            onSearchFocus?.();
                            setShowSuggestions(true);
                          }}
                          onClick={() => {
                            onSearchFocus?.();
                            setShowSuggestions(true);
                          }}
                          dir="auto"
                          placeholder={`${t('common.search_placeholder')} (${shortcuts.search_product})`}
                          className="w-full bg-transparent h-full pr-10 pl-4 text-sm text-text_primary font-bold placeholder:text-text_muted/40 focus:outline-none" 
                          autoFocus={searchMode === 'icon'}
                        />
                      </div>
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute top-[48px] inset-x-0 bg-background_secondary/90 backdrop-blur-md border border-border_default rounded-xl shadow-2xl z-50 p-2 flex items-center justify-between gap-1.5 h-11 select-none">
                        <span className="text-[10px] text-text_muted font-black px-2 border-l border-white/10 ml-1 shrink-0">اقتراحات:</span>
                        {suggestions.slice(0, 4).map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              onSearchChange(sug);
                              setShowSuggestions(false);
                              setActiveSuggestionIndex(-1);
                            }}
                            className={`flex-1 text-center truncate px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                              activeSuggestionIndex === idx 
                                ? 'bg-success_green/20 text-success_green border-success_green/50 shadow-[0_0_8px_rgba(34,197,94,0.2)] scale-[1.03]' 
                                : 'bg-white/5 text-text_secondary border-transparent hover:bg-white/10'
                            }`}
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    )}
                    <div 
                      className={`absolute left-0 right-0 ${showSuggestions && suggestions.length > 0 ? '[&>div]:!mt-0' : ''}`} 
                      style={{ 
                        top: showSuggestions && suggestions.length > 0 ? '88px' : '100%'
                      }}
                    >
                      {productDropdown}
                    </div>
                  </>
                )}
              </div>
              
              {searchActions && (
                 <div className="flex items-center gap-2">
                   {searchActions}
                 </div>
              )}

              {/* Central Action Buttons - Realigned to match search bar height */}
              <div className="flex items-center gap-3 mr-4 border-r border-border_default pr-6">
                 <ToolbarButton icon={<Plus size={18} />} label={t('common.new')} onClick={onNew} className="text-text_primary border-border_default hover:bg-background_card_hover hover:border-border_default" disabled={isSaving} shortcut={shortcuts.new_invoice} />
                 <ToolbarButton icon={<FolderOpen size={18} />} label={t('common.open')} onClick={onOpen} className="text-text_primary border-border_default hover:bg-background_card_hover hover:border-border_default" disabled={isSaving} shortcut={shortcuts.open_invoice} />
                 <ToolbarButton icon={<Save size={18} />} label={displaySaveLabel} onClick={onSave} className={`${saveColor} shadow-xl scale-105 mx-1`} disabled={isSaving} shortcut={shortcuts.save_invoice} />
                 {onCancel && (
                   <ToolbarButton icon={<XCircle size={18} />} label={displayCancelLabel} onClick={onCancel} className="text-orange-400 border-orange-400/40 hover:bg-orange-400/10" disabled={isSaving} shortcut={shortcuts.cancel_invoice} />
                 )}
                  <ToolbarButton 
                    icon={<Trash2 size={18} />} 
                    label={t('common.delete')} 
                    onClick={() => setShowClearConfirm(true)} 
                    className="text-danger_red border-danger_red/40 hover:bg-danger_red/10" 
                    disabled={isSaving} 
                  />
              </div>
           </div>

           {/* Print Button (Far Right in UI, Left in RTL flow) */}
           <div className="pl-2">
              <ToolbarButton 
                icon={<Printer size={26} />} 
                label={t('common.print')} 
                onClick={onPrint} 
                className="bg-primary_blue/20 border-primary_blue/40 text-primary_blue hover:bg-primary_blue hover:bg-primary_blue_hover text-white shadow-lg min-w-[90px] h-[70px] rounded-xl" 
                shortcut={shortcuts.print_invoice}
              />
           </div>
        </div>

        {/* Extra Header Slot (Alerts, Info) */}
        {extraHeaderSlot}
      </div>

      {/* ── DATA GRID ── */}
      {/* Table Header — ثابت خارج overflow-hidden لضمان ظهور الظل الجميل */}
      <div className="h-[52px] shrink-0 w-full bg-gradient-to-b from-table_header_from to-table_header_to border-b border-black/30 dark:border-border_default flex items-center text-sm font-bold text-white px-0 shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-30 relative overflow-hidden pro-invoice-header">
        {headerCells}
      </div>
      
      <div className="relative flex-1 min-h-0 flex flex-col bg-background_secondary pb-[80px]">
        {/* Subtle space-like radial gradient background */}
        <div className={`absolute inset-0 pointer-events-none ${glowOpacity} bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] ${glowColor} via-background_primary to-background_secondary`}></div>
        
        {/* Table Body — يمتد الآن خلف الفوتر الشفاف */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-scroll custom-scrollbar z-10 text-sm">
          <div className="min-h-full flex flex-col bg-background_secondary">
            {children}
            {/* الفاصلة تنكمش إلى 0 عندما تملأ الصفوف الوهمية المساحة — لا min-h لضمان الالتحام مع خط الـ Summary */}
            <div className="flex-1 min-h-0"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 43px, rgb(var(--border-default) / var(--border-alpha)) 43px, rgb(var(--border-default) / var(--border-alpha)) 44px)'
              }}
            />
          </div>
        </div>
      </div>

      {/* ── CURVED FOOTER (عائم فوق الجدول) ── */}
      <div className="absolute bottom-0 left-0 w-full h-[160px] z-20 pointer-events-none">
        <div className="relative w-full h-full flex items-end">
          
          {/* Full-width flat background — no border-t, seamless with the curve */}
          <div className="absolute right-0 bottom-0 w-full h-[80px] bg-bg_footer pointer-events-auto" />

          {/* الخط الفاصل المستقيم (يبدأ بعد المنحنى) */}
          <div className={`absolute bottom-[80px] h-[1px] dark:bg-white/20 bg-primary_blue/20 pointer-events-none ${
            direction === 'rtl' ? 'right-0 left-[600px]' : 'left-0 right-[600px]'
          }`} />

          {/* المنحنى الخلفي الجمالي */}
          <div className={`absolute bottom-0 w-[600px] h-[160px] pointer-events-none text-bg_footer ${
            direction === 'rtl' ? 'left-0' : 'right-0'
          }`}>
            <svg className="w-full h-full" viewBox="0 0 600 160" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ transform: direction === 'rtl' ? 'none' : 'scaleX(-1)' }}>
              <path d="M0,160 L600,160 L600,80 L530,80 C470,80 470,0 410,0 L0,0 Z" fill="currentColor" />
              {/* خط المنحنى الفاصل */}
              <path d="M0,0.5 L410,0.5 C470,0.5 470,79.5 530,79.5 L600,79.5" className="dark:stroke-white/20 stroke-primary_blue/20" strokeWidth="1" fill="none" />
            </svg>
          </div>
          
          {/* Footer Content */}
          <div className="relative w-full h-full flex justify-between items-end pointer-events-auto">
             
             {/* Summaries & Actions */}
             <div className="flex items-center gap-4 px-6 h-[80px]">
              <div className="flex items-center gap-3">
                <SummaryPill icon={<Banknote size={18}/>} label={t('invoice.due')} value={dueAmount} colorClass="text-text_primary" borderClass="border-border_default" bgClass="bg-background_card" />
                
                {/* Editable Paid Amount Pill */}
                <div className={`flex flex-col justify-center px-4 h-[60px] rounded-lg border border-success_green/40 bg-success_green/10 min-w-[190px] shadow-lg relative group`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-success_green"><CheckCircle2 size={18}/></span>
                      <span className={`text-[11px] font-bold text-text_primary uppercase ${direction === 'ltr' ? 'tracking-wider' : ''}`}>{t('invoice.paid')}</span>
                    </div>
                    {/* Link Button (Paid = Total) */}
                    <button 
                      onClick={() => onPaidAmountChange?.(totalAmount)}
                      className={`p-1 rounded-md transition-all ${paidAmount === totalAmount ? 'bg-success_green text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-background_card text-text_primary hover:bg-background_card_hover hover:text-text_primary'}`}
                      title={t('invoice.paid_link_title')}
                    >
                      <CheckCircle2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-baseline">
                    <input 
                      type="number" 
                      value={paidAmount} 
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        onPaidAmountChange?.(val);
                      }}
                      className="bg-transparent text-xl font-bold font-numbers text-success_green tracking-tight w-full focus:outline-none"
                    />
                  </div>
                </div>

                <SummaryPill icon={<AlertCircle size={18}/>} label={t('invoice.remaining')} value={remainingAmount} colorClass="text-danger_red" borderClass="border-danger_red/40" bgClass="bg-danger_red/10" />
              </div>

              {/* Discount / Global Summary Actions */}
              {summaryActions && (
                <div className="flex items-center gap-3 pr-4 border-r border-border_default">
                   {summaryActions}
                </div>
              )}
           </div>

           {/* Total Box */}
             <div className={`flex-1 h-full flex flex-col justify-center pb-2 items-end ${direction === 'rtl' ? 'pl-16' : 'pr-16'}`}>
               <div className="flex flex-row items-baseline w-full overflow-visible justify-end">
                 <span className={`leading-[1.1] font-black font-sans text-text_primary ${textGlowClass} tracking-tighter transition-all duration-300
                   ${totalAmount.toFixed(2).length > 15 ? 'text-[54px]' :
                     totalAmount.toFixed(2).length > 12 ? 'text-[68px]' : 
                     totalAmount.toFixed(2).length > 10 ? 'text-[82px]' :
                     'text-[100px]'}
                 `}>
                   {Math.floor(totalAmount)}<span className="text-[0.6em] opacity-60 font-sans">.{ (totalAmount % 1).toFixed(2).split('.')[1] || '00' }</span>
                 </span>
               </div>
               
               <div className="mt-0 w-full flex items-center gap-6 justify-end">
                  <span className={`text-sm font-black text-text_primary uppercase font-display ${direction === 'ltr' ? 'tracking-[0.2em]' : ''}`}>
                    {t('invoice.total')}
                  </span>
                  <div className="flex items-center justify-end gap-3 z-30">
                    {onNotesChange && (
                      <div className="flex items-center gap-2 bg-background_card border border-border_default rounded-full px-3.5 py-1.5 hover:bg-background_card_hover hover:border-text_muted/40 transition-all shadow-md group">
                        <button
                          type="button"
                          onClick={() => setShowNotes(!showNotes)}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-text_primary cursor-pointer border-none bg-transparent outline-none"
                          title={t('invoice.notes')}
                        >
                          <FileText size={15} className={showNotes ? "text-primary_blue drop-shadow-[0_0_8px_rgba(37,99,235,0.4)]" : "text-text_muted group-hover:text-text_primary"} />
                          <span>{t('invoice.notes')}</span>
                        </button>
                        {showNotes && (
                          <input
                            type="text"
                            value={notes}
                            onChange={e => onNotesChange(e.target.value)}
                            className="bg-transparent border-none text-[11px] font-bold text-text_primary outline-none w-48 text-right focus:ring-0 placeholder-text_muted/40 h-5"
                            placeholder="اكتب ملاحظة للفاتورة..."
                            dir="rtl"
                          />
                        )}
                      </div>
                    )}

                    <div className="group cursor-pointer flex items-center justify-between bg-background_card border border-border_default rounded-full px-5 py-2 hover:bg-background_card_hover transition-colors min-w-[240px]">
                       <span className="text-[11px] text-text_primary flex items-center gap-2"><User size={14}/> {displayBalanceLabel}</span>
                       <span className={`text-lg font-bold font-numbers blur-[6px] opacity-40 group-hover:blur-0 group-hover:opacity-100 transition-all duration-300 ${customerBalance > 0 ? 'text-danger_red' : 'text-success_green'}`}>
                         {Math.abs(customerBalance).toFixed(2)}
                       </span>
                    </div>
                  </div>
               </div>
             </div>

          </div>
        </div>
      </div>
      <AnimatePresence>
        {showClearConfirm && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-background_secondary/60 dark:bg-black/40 backdrop-blur-3xl border border-black/10 dark:border-white/10 rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.35)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.7)] w-full max-w-md p-8 flex flex-col items-center text-center space-y-6 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top gradient indicator line */}
              <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-danger_red/50 to-transparent" />

              {/* Glowing animated warning icon container */}
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-danger_red/20 rounded-full blur-2xl animate-pulse" />
                <motion.div 
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  className="relative w-20 h-20 bg-gradient-to-tr from-danger_red/15 to-danger_red/5 border-2 border-danger_red/30 dark:border-danger_red/20 rounded-full flex items-center justify-center text-danger_red shadow-[0_0_35px_rgba(239,68,68,0.25)]"
                >
                  <Trash2 size={36} />
                </motion.div>
              </div>

              {/* Text content with crisp typography */}
              <div className="space-y-2.5">
                <h4 className="text-xl font-black text-text_primary tracking-tight">تفريغ سلة المنتجات</h4>
                <p className="text-sm font-bold text-text_secondary leading-relaxed max-w-[320px] mx-auto">
                  تنبيه: أنت على وشك إزالة جميع المواد المدرجة في هذه الفاتورة وإفراغ السلة تماماً. هل تريد الاستمرار؟
                </p>
              </div>

              {/* Action buttons with animated feedback */}
              <div className="w-full grid grid-cols-2 gap-4 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowClearConfirm(false)}
                  className="px-5 py-3.5 rounded-2xl border border-border_default hover:bg-background_card/70 hover:border-text_muted/40 text-sm font-black text-text_primary transition-all cursor-pointer shadow-sm"
                >
                  إلغاء
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 10px 25px rgba(239, 68, 68, 0.35)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onDelete();
                    setShowClearConfirm(false);
                  }}
                  className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-danger_red to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-black shadow-lg shadow-danger_red/20 transition-all cursor-pointer"
                >
                  نعم، إفراغ السلة
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── SUB-COMPONENTS ──

function SummaryPill({ icon, label, value, colorClass, borderClass, bgClass }: any) {
  const { direction } = useAppStore();
  const [integer, decimal] = value.toFixed(2).split('.');
  return (
    <div className={`flex flex-col justify-center px-4 h-[60px] rounded-lg border ${borderClass} ${bgClass} min-w-[165px] shadow-lg overflow-visible`}>
      <div className="flex items-center gap-2 mb-0.5">
        <span className={colorClass}>{icon}</span>
        <span className={`text-[11px] font-bold text-text_primary uppercase ${direction === 'ltr' ? 'tracking-wider' : ''}`}>{label}</span>
      </div>
      <div className={`text-xl font-bold font-sans ${colorClass} tracking-tight leading-tight`}>
        {integer}<span className="text-[0.75em] opacity-70">.{decimal}</span>
      </div>
    </div>
  );
}
