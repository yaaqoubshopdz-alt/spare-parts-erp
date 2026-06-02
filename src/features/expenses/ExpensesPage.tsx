/**
 * ExpensesPage — إدارة وتسجيل المصاريف اليومية عبر بطاقات
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Receipt, Plus, Trash2, FolderOpen, ArrowRight, X, Search } from 'lucide-react';
import { useShortcutStore } from '../../store/shortcutStore';
import { showSuccess, showError, showInfo } from '../../shared/utils/notifications';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { FinancialPinGate } from '../../shared/components/ui/FinancialPinGate';

const DEFAULT_CATEGORIES = [
  'كهرباء وماء', 'إيجار المحل', 'نقل وشحن', 'أجور عمال', 'إطعام', 'صيانة', 'أدوات مكتبية', 'أخرى'
];

export default function ExpensesPage() {
  const { user } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
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

  const toggleSort = useCallback((key: ExpensesSortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
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

  useEffect(() => {
    if (activeCategory) {
      loadExpenses(activeCategory);
    }
  }, [activeCategory]);

  const loadExpenses = async (cat: string) => {
    setLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:expenses:getList', { category: cat });
      if (res.success) setExpenses(res.data);
    } catch (e) {} finally { setLoading(false); }
  };

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
      } else { showError(res.error); }
    } catch (e) { showError('خطأ'); }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

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
    <div className="h-full flex flex-col relative w-full">
      <div className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {!activeCategory ? (
            <motion.div 
              key="categories"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-5 flex-1 overflow-auto custom-scrollbar"
            >
            {/* Category Cards */}
            {categories.map((cat, idx) => (
              <div 
                key={idx}
                className="relative bg-background_card border border-border_default rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:border-primary_blue/50 hover:shadow-lg min-h-[160px] group overflow-hidden"
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                  className="absolute top-3 left-3 p-1.5 bg-background_secondary text-text_muted hover:text-danger_red hover:bg-danger_red/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                >
                  <Trash2 size={16} />
                </button>
                
                <div onClick={() => setActiveCategory(cat)} className="flex-1 flex flex-col items-center justify-center relative z-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary_blue/10 to-background_secondary border border-border_default flex items-center justify-center mb-4 text-primary_blue group-hover:border-primary_blue/30 group-hover:scale-105 transition-all duration-300">
                    <FolderOpen size={28} className="group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="font-bold text-lg text-text_primary text-center group-hover:text-primary_blue transition-colors duration-300">{cat}</h3>
                </div>
              </div>
            ))}

            {/* New Category Card — at the END */}
            <div 
              onClick={() => setShowNewCatModal(true)}
              className="bg-background_card border-2 border-dashed border-primary_blue/40 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-primary_blue/5 hover:border-primary_blue transition-all min-h-[160px] group"
            >
              <div className="w-12 h-12 rounded-full bg-primary_blue/20 text-primary_blue flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <span className="font-bold text-primary_blue">إضافة عنوان مصروف</span>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="details"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col lg:flex-row min-h-0"
          >
            {/* Left Side: Form */}
            <div className="lg:w-1/3 shrink-0 bg-background_card flex flex-col overflow-hidden">
              <div className="p-6 flex items-center gap-4">
                <button 
                  onClick={() => setActiveCategory(null)}
                  className="p-2 bg-background_secondary hover:bg-primary_blue/10 rounded-xl transition-colors"
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
                    className="w-full bg-background_primary dark:bg-white/[0.10] border border-border_default rounded-xl px-4 py-4 font-numbers text-3xl font-black outline-none text-danger_red focus:border-danger_red"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm text-text_secondary mb-2 font-bold">الوصف / التفاصيل</label>
                  <textarea 
                    rows={8} value={description} onChange={e => setDescription(e.target.value)} placeholder="تفاصيل إضافية..."
                    className="w-full bg-background_primary dark:bg-white/[0.10] border border-border_default rounded-xl px-4 py-3 text-text_primary outline-none focus:border-primary_blue resize-none"
                  />
                </div>

                <button type="submit" className="w-full py-4 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-xl font-black text-lg flex justify-center items-center gap-2 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  <Plus size={22} /> تسجيل وحفظ
                </button>
              </form>
            </div>

            {/* Vertical Shadow Separator — visible divider between form & table */}
            <div className="w-[3px] shrink-0 relative bg-gradient-to-b from-transparent via-border_default/20 to-transparent">
              <div className="absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-border_default/10 to-transparent"></div>
            </div>

            {/* Right Side: Table Card */}
            <div className="flex-1 bg-background_card flex flex-col overflow-hidden min-h-0">
              {/* Header: title + search filter */}
              <div className="flex items-center justify-between p-3 border-b border-border_default bg-background_primary/80">
                <h2 className="font-bold text-lg text-text_primary px-3">سجل مصاريف ({activeCategory})</h2>
                <div className="relative w-64">
                  <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text_muted" />
                  <input
                    ref={searchInputRef}
                    type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder={`بحث في الوصف... (${shortcuts.search_product})`}
                    className="w-full bg-background_primary dark:bg-white/[0.10] border border-border_default rounded-xl h-10 pr-10 pl-4 text-sm text-text_primary font-bold placeholder:text-text_muted/50 focus:border-primary_blue focus:ring-2 focus:ring-primary_blue/20 outline-none transition-all"
                  />
                </div>
              </div>
              
              {/* Scrollable Table */}
              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-sm text-right border-collapse">
                  <thead className="sticky top-0 z-30 bg-gradient-to-b from-table_header_from to-table_header_to border-b border-b-black/30 dark:border-b-border_default/40 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                    <tr className="h-[52px]">
                      <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-l-black/50 dark:border-l-border_default cursor-pointer hover:bg-background_card select-none transition-all duration-200" onClick={() => toggleSort('time')}>
                        التاريخ{sortKey === 'time' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'time' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                      </th>
                      <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-l-black/50 dark:border-l-border_default cursor-pointer hover:bg-background_card select-none transition-all duration-200" onClick={() => toggleSort('description')}>
                        الوصف{sortKey === 'description' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'description' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                      </th>
                      <th className="px-3 font-bold text-[13px] text-text_primary uppercase tracking-wide border-l border-l-black/50 dark:border-l-border_default text-center cursor-pointer hover:bg-background_card select-none transition-all duration-200" onClick={() => toggleSort('amount')}>
                        المبلغ (د.ج){sortKey === 'amount' && sortDir === 'asc' ? <span className="mr-1 text-emerald-400">↑</span> : sortKey === 'amount' && sortDir === 'desc' ? <span className="mr-1 text-red-400">↓</span> : null}
                      </th>
                      <th className="px-3 w-16 border-l border-l-black/50 dark:border-l-border_default"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border_default">
                    {loading ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-text_muted bg-background_secondary">جاري التحميل...</td></tr>
                    ) : filteredExpenses.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-text_muted bg-background_secondary">لا توجد مصاريف مسجلة</td></tr>
                    ) : filteredExpenses.map((exp, idx) => (
                      <tr key={exp.id} className={`hover:bg-primary_blue/5 transition-colors ${idx % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg'}`}>
                        <td className="px-3 py-3 font-bold font-numbers text-text_secondary border-l border-border_default">{exp.created_at.split(' ')[0]}</td>
                        <td className="px-3 py-3 font-bold text-text_primary border-l border-border_default">{exp.description || '-'}</td>
                        <td className="px-3 py-3 text-center border-l border-border_default font-numbers font-black text-danger_red text-base">
                          {exp.amount.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 text-text_muted hover:text-danger_red hover:bg-danger_red/10 rounded-lg transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Total Footer — Prettier */}
              <div className="px-6 py-4 border-t border-border_default bg-gradient-to-r from-primary_blue/5 to-transparent flex justify-between items-center">
                <span className="font-black text-text_primary text-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary_blue"></span>
                  الإجمالي
                </span>
                <span className="text-2xl font-black font-numbers text-danger_red">
                  {totalExpenses.toFixed(2)} د.ج
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
              className="bg-background_secondary border border-border_default rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border_default flex justify-between items-center bg-background_primary">
                <h3 className="font-bold text-text_primary text-lg">إضافة عنوان مصروف</h3>
                <button onClick={() => setShowNewCatModal(false)} className="text-text_muted hover:text-text_primary transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddCategory} className="p-6">
                <label className="block text-sm text-text_secondary mb-2">اسم التصنيف الجديد</label>
                <input 
                  autoFocus type="text" required value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="مثال: فاتورة الإنترنت"
                  className="w-full bg-background_primary border border-border_default rounded-xl px-3 py-2 text-text_primary outline-none focus:border-primary_blue shadow-inner"
                />
                <button type="submit" className="w-full py-3 mt-6 bg-primary_blue hover:bg-primary_blue_hover text-white rounded-xl font-bold transition-all shadow-glow-blue">
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
