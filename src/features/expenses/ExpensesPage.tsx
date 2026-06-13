/**
 * ExpensesPage — إدارة وتسجيل المصاريف اليومية عبر بطاقات لوحة التحكم المالية
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Receipt, Plus, Trash2, FolderOpen, ArrowRight, X, Search,
  Lightbulb, Home, Truck, Users, Coffee, Wrench, PenTool, FileText,
  Clock, Calendar, TrendingUp
} from 'lucide-react';
import { useShortcutStore } from '../../store/shortcutStore';
import { showSuccess, showError, showInfo } from '../../shared/utils/notifications';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { FinancialPinGate } from '../../shared/components/ui/FinancialPinGate';
import ERPTable, { useColumnManager } from '../../shared/components/table';
import type { ERPColumn } from '../../shared/components/table/types';

const DEFAULT_CATEGORIES = [
  'كهرباء وماء', 'إيجار المحل', 'نقل وشحن', 'أجور عمال', 'إطعام', 'صيانة', 'أدوات مكتبية', 'أخرى'
];

const PRESET_AMOUNTS = [500, 1000, 2000, 5000];

export default function ExpensesPage() {
  const { user } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New Category State
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // Filter state
  const [search, setSearch] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const { shortcuts } = useShortcutStore();

  // Table container height state for dynamic ghost rows
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState(500);

  const getCategoryIcon = (cat: string) => {
    const norm = cat.trim();
    if (norm.includes('كهرباء') || norm.includes('ماء') || norm.includes('غاز') || norm.includes('كهر')) return <Lightbulb size={28} className="group-hover:scale-110 transition-transform duration-300 text-amber-400" />;
    if (norm.includes('إيجار') || norm.includes('ايجار') || norm.includes('محل') || norm.includes('كراء')) return <Home size={28} className="group-hover:scale-110 transition-transform duration-300 text-rose-400" />;
    if (norm.includes('نقل') || norm.includes('شحن') || norm.includes('توصيل')) return <Truck size={28} className="group-hover:scale-110 transition-transform duration-300 text-sky-400" />;
    if (norm.includes('أجور') || norm.includes('عمال') || norm.includes('راتب') || norm.includes('خادم')) return <Users size={28} className="group-hover:scale-110 transition-transform duration-300 text-emerald-400" />;
    if (norm.includes('إطعام') || norm.includes('اطعام') || norm.includes('أكل') || norm.includes('قهوة') || norm.includes('طعام')) return <Coffee size={28} className="group-hover:scale-110 transition-transform duration-300 text-orange-400" />;
    if (norm.includes('صيانة') || norm.includes('تصليح')) return <Wrench size={28} className="group-hover:scale-110 transition-transform duration-300 text-purple-400" />;
    if (norm.includes('أدوات') || norm.includes('مكتبية') || norm.includes('قرطاسية')) return <PenTool size={28} className="group-hover:scale-110 transition-transform duration-300 text-indigo-400" />;
    return <FileText size={28} className="group-hover:scale-110 transition-transform duration-300 text-zinc-400" />;
  };

  const getCategoryHoverClass = (cat: string) => {
    const norm = cat.trim();
    if (norm.includes('كهرباء') || norm.includes('ماء') || norm.includes('غاز') || norm.includes('كهر')) return 'hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]';
    if (norm.includes('إيجار') || norm.includes('ايجار') || norm.includes('محل') || norm.includes('كراء')) return 'hover:border-rose-500/50 hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]';
    if (norm.includes('نقل') || norm.includes('شحن') || norm.includes('توصيل')) return 'hover:border-sky-500/50 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]';
    if (norm.includes('أجور') || norm.includes('عمال') || norm.includes('راتب') || norm.includes('خادم')) return 'hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]';
    if (norm.includes('إطعام') || norm.includes('اطعام') || norm.includes('أكل') || norm.includes('قهوة') || norm.includes('طعام')) return 'hover:border-orange-500/50 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]';
    if (norm.includes('صيانة') || norm.includes('تصليح')) return 'hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]';
    if (norm.includes('أدوات') || norm.includes('مكتبية') || norm.includes('قرطاسية')) return 'hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]';
    return 'hover:border-zinc-500/50 hover:shadow-[0_0_20px_rgba(113,113,122,0.15)]';
  };

  useEffect(() => {
    if (!isUnlocked || !activeCategory) return;
    const handler = (e: KeyboardEvent) => {
      const keys = shortcuts.search_product.toLowerCase().split('+');
      const isCtrlRequired = keys.includes('ctrl');
      const isShiftRequired = keys.includes('shift');
      const isAltRequired = keys.includes('alt');
      const mainKey = keys.find(k => !['ctrl', 'shift', 'alt'].includes(k));
      
      const isCtrlPressed = e.ctrlKey || e.metaKey;
      const isShiftPressed = e.shiftKey;
      const isAltPressed = e.altKey;
      
      if (
        isCtrlPressed === isCtrlRequired &&
        isShiftPressed === isShiftRequired &&
        isAltPressed === isAltRequired &&
        e.key.toLowerCase() === mainKey
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, isUnlocked, activeCategory]);

  type ExpensesSortKey = 'time' | 'description' | 'amount';
  const [sortKey, setSortKey] = useState<ExpensesSortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);

  const toggleSort = useCallback((key: string) => {
    const k = key as ExpensesSortKey;
    if (sortKey !== k) {
      setSortKey(k);
      setSortDir('asc');
    } else {
      setSortDir(d => {
        if (d === 'asc') return 'desc';
        if (d === 'desc') return null;
        return 'asc';
      });
    }
  }, [sortKey]);

  const sortedExpenses = useMemo(() => {
    if (!sortKey || !sortDir) return expenses;
    return [...expenses].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'time') cmp = (a.created_at || '').localeCompare(b.created_at || '');
      else if (sortKey === 'description') cmp = (a.description || '').localeCompare(b.description || '');
      else if (sortKey === 'amount') cmp = (a.amount || 0) - (b.amount || 0);
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [expenses, sortKey, sortDir]);

  const filteredExpenses = useMemo(() => {
    if (!search.trim()) return sortedExpenses;
    const q = search.trim().toLowerCase();
    return sortedExpenses.filter(e =>
      (e.description || '').toLowerCase().includes(q)
    );
  }, [sortedExpenses, search]);

  useEffect(() => {
    // Load categories from local storage or use defaults
    const saved = localStorage.getItem('expense_categories');
    if (saved) {
      setCategories(JSON.parse(saved));
    } else {
      setCategories(DEFAULT_CATEGORIES);
      localStorage.setItem('expense_categories', JSON.stringify(DEFAULT_CATEGORIES));
    }
  }, []);

  const loadAllExpenses = useCallback(async () => {
    try {
      const res = await window.electronAPI.invoke('db:expenses:getList', { limit: 99999 });
      if (res.success) {
        setAllExpenses(res.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      loadAllExpenses();
    }
  }, [isUnlocked, loadAllExpenses]);

  const loadExpenses = async (cat: string) => {
    setLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:expenses:getList', { category: cat });
      if (res.success) setExpenses(res.data);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeCategory) {
      loadExpenses(activeCategory);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (!isUnlocked || !activeCategory) return;
    const el = tableContainerRef.current;
    if (!el) return;
    
    // Set initial height immediately on mount/update
    setTableHeight(el.clientHeight || 500);

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const h = el.clientHeight || entry.contentRect?.height || 500;
        setTableHeight(h);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isUnlocked, activeCategory]);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName)) {
      showError('هذا التصنيف موجود مسبقاً');
      return;
    }
    const updated = [...categories, newCategoryName.trim()];
    setCategories(updated);
    localStorage.setItem('expense_categories', JSON.stringify(updated));
    setNewCategoryName('');
    setShowNewCatModal(false);
    showSuccess('تمت إضافة تصنيف جديد');
  };

  const handleDeleteCategory = (cat: string) => {
    if(!window.confirm(`هل أنت متأكد من حذف تصنيف "${cat}"؟ (لن تحذف المصاريف السابقة)`)) return;
    const updated = categories.filter(c => c !== cat);
    setCategories(updated);
    localStorage.setItem('expense_categories', JSON.stringify(updated));
    loadAllExpenses();
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { showError('المبلغ غير صحيح'); return; }
    if (!activeCategory) return;

    try {
      const res = await window.electronAPI.invoke('db:expenses:create', {
        amount: Number(amount),
        category: activeCategory,
        description,
        _user_id: user?.id || 1
      });

      if (res.success) {
        showSuccess('تم تسجيل المصروف بنجاح');
        setAmount('');
        setDescription('');
        loadExpenses(activeCategory);
        loadAllExpenses();
      } else { showError(res.error); }
    } catch (e) { showError('خطأ'); }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    try {
      const res = await window.electronAPI.invoke('db:expenses:delete', id);
      if (res.success) {
        showSuccess('تم الحذف بنجاح');
        if (activeCategory) loadExpenses(activeCategory);
        loadAllExpenses();
      } else { showError(res.error); }
    } catch (e) { showError('خطأ'); }
  };

  const DEFAULT_COLUMNS = useMemo<ERPColumn<any>[]>(() => [
    {
      key: 'time',
      label: 'التاريخ',
      sortable: true,
      width: 150,
      resizable: true,
      draggable: true,
      render: (exp) => <span className="font-bold font-numbers text-text_secondary">{exp.created_at?.split(' ')[0]}</span>,
    },
    {
      key: 'description',
      label: 'الوصف',
      sortable: true,
      flex: 1,
      resizable: true,
      draggable: true,
      render: (exp) => <span className="font-bold text-text_primary truncate" dir="auto" title={exp.description}>{exp.description || '-'}</span>,
    },
    {
      key: 'amount',
      label: 'المبلغ (د.ج)',
      sortable: true,
      align: 'center',
      width: 160,
      resizable: true,
      draggable: true,
      render: (exp) => (
        <span className="font-numbers font-black text-danger_red text-base">
          {exp.amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'حذف',
      align: 'center',
      width: 64,
      resizable: false,
      draggable: false,
      render: (exp) => (
        <button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 text-text_muted hover:text-danger_red hover:bg-danger_red/10 rounded-lg transition-colors active:scale-90">
          <Trash2 size={16} />
        </button>
      ),
    },
  ], [handleDeleteExpense]);

  const {
    columns,
    allColumns,
    setWidth,
    toggleHide,
    reorder,
    reset,
    showAll,
  } = useColumnManager<ERPColumn<any>>('erp_columns_expenses_v1', DEFAULT_COLUMNS);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Simple week calculation (last 7 days)
    const todayTime = new Date().getTime();
    const sevenDaysAgoTime = todayTime - 7 * 24 * 60 * 60 * 1000;
    
    // Month prefix YYYY-MM
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);

    let todaySum = 0;
    let weekSum = 0;
    let monthSum = 0;

    const categoryTotals: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    allExpenses.forEach(exp => {
      const amt = exp.amount || 0;
      const expDate = exp.date || ''; // YYYY-MM-DD
      
      // Categorical calculations
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + amt;
      categoryCounts[exp.category] = (categoryCounts[exp.category] || 0) + 1;

      // Stats calculations
      if (expDate === todayStr) {
        todaySum += amt;
      }
      
      const expTime = new Date(expDate).getTime();
      if (expTime >= sevenDaysAgoTime && expTime <= todayTime) {
        weekSum += amt;
      }

      if (expDate.startsWith(currentMonthPrefix)) {
        monthSum += amt;
      }
    });

    return {
      today: todaySum,
      week: weekSum,
      month: monthSum,
      categoryTotals,
      categoryCounts
    };
  }, [allExpenses]);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const safeTableHeight = typeof tableHeight === 'number' && !isNaN(tableHeight) && tableHeight > 0 ? tableHeight : 500;
  const activeRowCount = filteredExpenses.length === 0 ? 1 : filteredExpenses.length;
  const ghostRowsCount = Math.max(0, Math.max(18, Math.ceil((safeTableHeight - 52) / 44)) - activeRowCount);

  if (!isUnlocked) {
    return (
      <div className="p-4 md:p-6 h-full overflow-y-auto custom-scrollbar bg-background_primary relative flex items-center justify-center">
        <FinancialPinGate 
          onSuccess={() => setIsUnlocked(true)} 
          title="بوابة حماية المصاريف مقفلة" 
          description="يرجى إدخال رمز الـ PIN الخاص بك لمراجعة وتسجيل المصاريف اليومية."
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative w-full bg-background_primary text-text_primary font-cairo">
      <div className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {!activeCategory ? (
            <motion.div 
              key="categories"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar pb-10"
            >
              {/* Top Stats summary panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 pb-2 shrink-0">
                <div className="bg-background_card backdrop-blur-xl border border-border_default dark:border-border_custom/3 rounded-2xl p-5 shadow-glass flex items-center justify-between group hover:border-danger_red/30 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-danger_red/10 flex items-center justify-center text-danger_red group-hover:scale-105 transition-all duration-300">
                      <Clock size={22} className="animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-text_muted uppercase tracking-wider mb-1">مصاريف اليوم</h4>
                      <span className="text-2xl font-black font-numbers text-text_primary leading-none">
                        {stats.today.toFixed(2)} <span className="text-xs font-bold opacity-60">د.ج</span>
                      </span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-danger_red animate-ping" />
                </div>

                <div className="bg-background_card backdrop-blur-xl border border-border_default dark:border-border_custom/3 rounded-2xl p-5 shadow-glass flex items-center justify-between group hover:border-warning_amber/30 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-warning_amber/10 flex items-center justify-center text-warning_amber group-hover:scale-105 transition-all duration-300">
                      <Calendar size={22} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-text_muted uppercase tracking-wider mb-1">مصاريف الأسبوع</h4>
                      <span className="text-2xl font-black font-numbers text-text_primary leading-none">
                        {stats.week.toFixed(2)} <span className="text-xs font-bold opacity-60">د.ج</span>
                      </span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-warning_amber" />
                </div>

                <div className="bg-background_card backdrop-blur-xl border border-border_default dark:border-border_custom/3 rounded-2xl p-5 shadow-glass flex items-center justify-between group hover:border-primary_blue/30 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary_blue/10 flex items-center justify-center text-primary_blue group-hover:scale-105 transition-all duration-300">
                      <TrendingUp size={22} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-text_muted uppercase tracking-wider mb-1">مصاريف الشهر</h4>
                      <span className="text-2xl font-black font-numbers text-text_primary leading-none">
                        {stats.month.toFixed(2)} <span className="text-xs font-bold opacity-60">د.ج</span>
                      </span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-primary_blue" />
                </div>
              </div>

              {/* Category Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6 shrink-0">
                {categories.map((cat, idx) => {
                  const spent = stats.categoryTotals[cat] || 0;
                  const count = stats.categoryCounts[cat] || 0;

                  return (
                    <div 
                      key={idx}
                      className={`relative bg-background_card border border-border_default dark:border-border_custom/3 rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-glass hover:scale-[1.02] min-h-[180px] group overflow-hidden ${getCategoryHoverClass(cat)}`}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                        className="absolute top-3 left-3 p-1.5 bg-background_secondary text-text_muted hover:text-danger_red hover:bg-danger_red/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                      >
                        <Trash2 size={16} />
                      </button>
                      
                      <div onClick={() => setActiveCategory(cat)} className="flex-1 flex flex-col items-center justify-center relative z-0">
                        <div className="w-16 h-16 rounded-2xl bg-background_secondary border border-border_default dark:border-border_custom/3 flex items-center justify-center mb-4 transition-all duration-300 shadow-inner group-hover:scale-105">
                          {getCategoryIcon(cat)}
                        </div>
                        <h3 className="font-black text-base text-text_primary text-center group-hover:text-primary_blue transition-colors duration-300 mb-2">{cat}</h3>
                        
                        <div className="flex flex-col items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <span className="text-[11px] font-bold text-text_muted">
                            {count} عملية
                          </span>
                          <span className="text-xs font-black font-numbers text-danger_red">
                            {spent.toFixed(2)} د.ج
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* New Category Card — at the END */}
                <div 
                  onClick={() => setShowNewCatModal(true)}
                  className="bg-background_card/40 border-2 border-dashed border-primary_blue/30 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-primary_blue/5 hover:border-primary_blue transition-all min-h-[180px] group"
                >
                  <div className="w-12 h-12 rounded-full bg-primary_blue/20 text-primary_blue flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Plus size={24} />
                  </div>
                  <span className="font-bold text-primary_blue">إضافة عنوان مصروف</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="details"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col lg:flex-row h-full lg:h-auto min-h-0 overflow-y-auto lg:overflow-hidden p-6 gap-6 custom-scrollbar"
            >
              {/* Left Side: Form */}
              <div className="lg:w-1/3 shrink-0 bg-background_card flex flex-col overflow-hidden border border-border_default dark:border-border_custom/3 shadow-glass rounded-2xl">
                <div className="p-6 flex items-center gap-4 border-b border-border_default dark:border-b-border_custom/3">
                  <button 
                    onClick={() => setActiveCategory(null)}
                    className="p-2 bg-background_secondary hover:bg-primary_blue/10 rounded-xl transition-colors active:scale-95"
                  >
                    <ArrowRight size={20} className="text-text_primary" />
                  </button>
                  <div>
                    <h2 className="font-black text-xl text-text_primary">إضافة مصروف</h2>
                    <p className="text-sm text-primary_blue font-bold">{activeCategory}</p>
                  </div>
                </div>
                
                <form onSubmit={handleAddExpense} className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm text-text_secondary mb-2 font-bold">المبلغ (د.ج) <span className="text-danger_red">*</span></label>
                    <input 
                      type="number" required value={amount} onChange={e => setAmount(e.target.value)}
                      className="w-full bg-background_primary/60 dark:bg-white/[0.02] border border-border_default dark:border-border_custom/3 rounded-xl px-4 py-4 font-numbers text-3xl font-black outline-none text-danger_red focus:border-danger_red focus:ring-2 focus:ring-danger_red/15 transition-all text-center"
                      placeholder="0.00"
                    />
                    
                    {/* Amount Presets */}
                    <div className="flex gap-2 mt-3">
                      {PRESET_AMOUNTS.map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAmount(preset.toString())}
                          className="flex-1 py-2 text-xs font-bold font-numbers text-text_primary border border-border_default dark:border-border_custom/3 hover:border-primary_blue/40 bg-background_primary/60 hover:bg-primary_blue/10 rounded-lg transition-all active:scale-95 shadow-sm"
                        >
                          {preset} د.ج
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-text_secondary mb-2 font-bold">الوصف / التفاصيل</label>
                    <textarea 
                      rows={6} value={description} onChange={e => setDescription(e.target.value)} placeholder="تفاصيل إضافية..."
                      className="w-full bg-background_primary/60 dark:bg-white/[0.02] border border-border_default dark:border-border_custom/3 rounded-xl px-4 py-3 text-text_primary outline-none focus:border-primary_blue focus:ring-2 focus:ring-primary_blue/15 resize-none transition-all"
                    />
                  </div>

                  <button type="submit" className="w-full py-4 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-xl font-black text-lg flex justify-center items-center gap-2 transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)] active:scale-98">
                    <Plus size={22} /> تسجيل وحفظ
                  </button>
                </form>
              </div>

              {/* Right Side: Table Card */}
              <div className="flex-1 bg-background_card flex flex-col overflow-hidden border border-border_default dark:border-border_custom/3 shadow-glass rounded-2xl min-h-[400px] lg:min-h-0">
                <ERPTable
                  data={filteredExpenses}
                  columns={columns}
                  loading={loading}
                  rowKey="id"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  className="h-full"
                  minRows={10}
                  emptyText="لا توجد مصاريف مسجلة"
                  onResizeColumn={setWidth}
                  onReorderColumns={reorder}
                  onToggleHideColumn={toggleHide}
                  onResetColumns={reset}
                  onShowAllColumns={showAll}
                  hasHiddenColumns={allColumns.some(c => c.hidden)}
                  toolbar={
                    <div className="flex items-center justify-between p-4 border-b border-border_default dark:border-b-border_custom/3 bg-background_primary/40 shrink-0">
                      <h2 className="font-black text-lg text-text_primary px-3">سجل مصاريف ({activeCategory})</h2>
                      <div className="flex items-center gap-3">

                        <div className="relative w-64">
                          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text_muted" />
                          <input
                            ref={searchInputRef}
                            type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder={`بحث في الوصف... (${shortcuts.search_product})`}
                            className="w-full bg-background_primary/60 dark:bg-white/[0.02] border border-border_default dark:border-border_custom/3 rounded-xl h-10 pr-10 pl-4 text-sm text-text_primary font-bold placeholder:text-text_muted/50 focus:border-primary_blue focus:ring-2 focus:ring-primary_blue/20 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  }
                />
                
                {/* Total Footer — Prettier */}
                <div className="px-6 py-5 border-t border-border_default dark:border-t-border_custom/3 bg-gradient-to-r from-danger_red/10 to-transparent flex justify-between items-center shrink-0">
                  <span className="font-black text-text_primary text-lg flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-danger_red shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                    الإجمالي
                  </span>
                  <span className="text-3xl font-black font-numbers text-danger_red tracking-tight">
                    {totalExpenses.toFixed(2)} <span className="text-sm font-bold opacity-60">د.ج</span>
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* New Category Modal */}
      <AnimatePresence>
        {showNewCatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background_secondary border border-border_default dark:border-border_custom/3 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border_default dark:border-b-border_custom/3 flex justify-between items-center bg-background_primary">
                <h3 className="font-black text-text_primary text-lg">إضافة عنوان مصروف</h3>
                <button onClick={() => setShowNewCatModal(false)} className="text-text_muted hover:text-text_primary transition-colors p-1 bg-background_secondary rounded-full active:scale-90">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddCategory} className="p-6">
                <label className="block text-sm text-text_secondary mb-2 font-bold">اسم التصنيف الجديد</label>
                <input 
                  autoFocus type="text" required value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="مثال: فاتورة الإنترنت"
                  className="w-full bg-background_primary border border-border_default dark:border-border_custom/3 rounded-xl px-4 py-3 text-text_primary font-bold outline-none focus:border-primary_blue focus:ring-2 focus:ring-primary_blue/20 shadow-inner"
                />
                <button type="submit" className="w-full py-3.5 mt-6 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-xl font-black text-base transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-95">
                  إضافة
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
