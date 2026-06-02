import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wand2, Settings2, Package, ArrowDown, Sparkles, Banknote, Car, Globe, Search, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import CreatableFitmentTags, { FitmentTag } from '../shared/CreatableFitmentTags';
import { showSuccess, showError } from '../../shared/utils/notifications';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (product: any) => void;
  onSaved?: () => void;
  initialPurchasePrice?: number;
  productId?: number | null;
  hideInitialStock?: boolean;
}

const DIVISIBLE_CODES = ['LTR', 'MTR', 'KG'];
const DIV_LABELS: Record<string, { unit: string; bulk: string; icon: string }> = {
  LTR: { unit: 'اللتر', bulk: 'العلبة/البرميل', icon: '🧴' },
  MTR: { unit: 'المتر', bulk: 'اللفة', icon: '📏' },
  KG:  { unit: 'الكيلو', bulk: 'الكيس/الشحنة', icon: '⚖️' },
};

interface CustomSelectProps {
  label: string;
  icon: React.ReactNode;
  options: { id: string | number; name: string }[];
  value: string | number;
  onChange: (val: any) => void;
  placeholder: string;
  required?: boolean;
}

function CustomSelect({ label, icon, options, value, onChange, placeholder, required }: CustomSelectProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search when dropdown opens
  useEffect(() => {
    if (isOpen && options.length > 5 && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [isOpen, options.length]);

  const selectedOption = options.find(opt => opt.id.toString() === value.toString());
  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-sm text-text_secondary block mb-2 font-bold flex items-center gap-1.5">
        {icon}
        <span>{label}</span>
        {required && <span className="text-red-500 font-bold">*</span>}
      </label>

      {/* Trigger Button */}
      <motion.button
        type="button"
        onClick={() => { setIsOpen(prev => !prev); setSearch(''); }}
        whileTap={{ scale: 0.98 }}
        className={`w-full border rounded-xl px-4 py-3 text-right text-base font-bold outline-none transition-all flex items-center justify-between shadow-inner
          ${isOpen
            ? 'bg-background_primary/80 dark:bg-white/[0.08] border-blue-500/60 ring-2 ring-blue-500/15 shadow-blue-500/10'
            : 'bg-background_secondary dark:bg-white/[0.06] border-border_default dark:border-white/10 hover:border-blue-400/40'
          }`}
      >
        <span className={selectedOption ? 'text-text_primary' : 'text-text_muted text-sm'}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }}>
          <ChevronDown size={17} className={isOpen ? 'text-blue-500' : 'text-text_muted'} />
        </motion.div>
      </motion.button>

      {/* Glass Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scaleY: 0.92, transformOrigin: 'top' }}
            animate={{ opacity: 1, y: 4, scaleY: 1, transformOrigin: 'top' }}
            exit={{ opacity: 0, y: -6, scaleY: 0.94, transformOrigin: 'top' }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="absolute z-[1100] w-full mt-1 rounded-2xl overflow-hidden flex flex-col shadow-2xl shadow-black/20 dark:shadow-black/40 border border-white/15 dark:border-white/10 bg-background_secondary/85 dark:bg-background_secondary/85 backdrop-blur-2xl"
            style={{ maxHeight: '260px' }}
          >
            {/* Inner top highlight (glass rim effect) */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

            {/* Search Bar */}
            {options.length > 5 && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-white/[0.07] dark:border-white/[0.05] bg-white/[0.03]">
                <Search size={13} className="text-text_muted shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('inventory.search_placeholder')}
                  dir="auto"
                  className="w-full bg-transparent border-none outline-none text-sm text-text_primary placeholder:text-text_muted/60 font-bold text-start"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-text_muted/60 hover:text-text_muted text-xs">✕</button>
                )}
              </div>
            )}

            {/* Options List */}
            <div className="overflow-y-auto flex-1 py-1.5 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-4 text-xs text-text_muted text-center">{t('inventory.no_results')}</div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.id.toString() === value.toString();
                  return (
                    <motion.button
                      key={opt.id}
                      type="button"
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.022, duration: 0.14 }}
                      onClick={() => { onChange(opt.id); setIsOpen(false); setSearch(''); }}
                      className={`w-full text-right px-4 py-2.5 text-sm font-bold transition-all duration-100 flex items-center justify-between rounded-lg
                        ${isSelected
                          ? 'bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300'
                          : 'text-text_primary hover:bg-white/[0.07] dark:hover:bg-white/[0.05] active:bg-blue-500/10'
                        }`}
                      style={{ margin: '1px 6px', width: 'calc(100% - 12px)' }}
                    >
                      <span>{opt.name}</span>
                      {isSelected && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                          <Check size={15} className="text-blue-500" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })
              )}
            </div>

            {/* Inner bottom shadow */}
            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background_secondary/30 to-transparent pointer-events-none rounded-b-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AddProductModal({ isOpen, onClose, onSuccess, onSaved, initialPurchasePrice = 0, productId, hideInitialStock = false }: AddProductModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [defaultMargin, setDefaultMargin] = useState(
    parseFloat(localStorage.getItem('default_retail_margin') || '30')
  );
  const [showSettings, setShowSettings] = useState(false);

  const [form, setForm] = useState({
    name: '', name_fr: '', barcode: '', internal_code: '', unit_id: 0,
    initial_stock: 0, purchase_price: initialPurchasePrice,
    retail_price: 0, retail_margin: 30,
    min_stock_level: 5, category_id: '',
  });

  const [fitments, setFitments] = useState<FitmentTag[]>([]);
  const [isFitmentModalOpen, setIsFitmentModalOpen] = useState(false);

  const [bulkQty, setBulkQty] = useState(0);
  const [containerSellPrice, setContainerSellPrice] = useState(0);
  const [containerMargin, setContainerMargin] = useState(defaultMargin);
  const [applied, setApplied] = useState(false);

  const selectedUnit = units.find(u => u.id === form.unit_id);
  const isDivisible = selectedUnit && DIVISIBLE_CODES.includes(selectedUnit.code);
  const labels = selectedUnit ? DIV_LABELS[selectedUnit.code] : null;

  const unitPurchasePrice = isDivisible && bulkQty > 0 ? (form.purchase_price / bulkQty) : form.purchase_price;

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      loadUnits();
      if (productId) {
        loadProduct(productId);
      } else {
        setForm({
          name: '', name_fr: '', barcode: '', internal_code: '',
          unit_id: form.unit_id || 0, initial_stock: 0,
          purchase_price: initialPurchasePrice, retail_price: 0,
          retail_margin: defaultMargin, min_stock_level: 5, category_id: ''
        });
        setBulkQty(0); setContainerSellPrice(0); setContainerMargin(defaultMargin);
      }
    }
  }, [isOpen, initialPurchasePrice, productId]);

  const loadProduct = async (id: number) => {
    setInitLoading(true);
    try {
      const res: any = await window.electronAPI?.invoke('db:products:getById', id);
      if (res?.success && res.data) {
        const p = res.data;
        
        let isDiv = false;
        let selectedUnitCode = '';
        try {
          const uRes: any = await window.electronAPI?.invoke('db:units:getAll');
          if (uRes?.success && uRes.data) {
            selectedUnitCode = uRes.data.find((u: any) => u.id === p.unit_id)?.code || '';
            isDiv = DIVISIBLE_CODES.includes(selectedUnitCode);
          }
        } catch (ue) {}

        let qty = p.pieces_per_box || 0;
        let bulkPurchasePrice = p.purchase_price || 0;
        let retailMargin = p.purchase_price > 0 ? Math.round(((p.retail_price / p.purchase_price) - 1) * 100) : 30;
        let cMargin = defaultMargin;
        let cSellPrice = p.wholesale_price || 0;

        if (isDiv && qty > 0) {
          bulkPurchasePrice = (p.purchase_price || 0) * qty;
          cMargin = bulkPurchasePrice > 0 ? Math.round(((p.wholesale_price / bulkPurchasePrice) - 1) * 100) : defaultMargin;
        }

        setForm({
          name: p.name || '',
          name_fr: p.name_fr || '',
          barcode: p.barcode || p.internal_code || '',
          internal_code: p.barcode || p.internal_code || '',
          unit_id: p.unit_id || 0,
          initial_stock: p.total_stock || 0,
          purchase_price: bulkPurchasePrice,
          retail_price: p.retail_price || 0,
          retail_margin: retailMargin,
          min_stock_level: p.min_stock_level || 5,
          category_id: p.category_id || '',
        });
        
        setBulkQty(qty);
        setContainerSellPrice(cSellPrice);
        setContainerMargin(cMargin);
        
        const fits: any = await window.electronAPI?.invoke('db:fitments:getByProduct', id);
        if (fits?.success && fits.data) {
          setFitments(fits.data.map((f: any) => ({
            vehicle_brand_id: f.vehicle_brand_id,
            vehicle_model_id: f.vehicle_model_id,
            vehicle_brand_name: f.vehicle_brand_name || f.brand_name,
            vehicle_model_name: f.vehicle_model_name || f.model_name
          })));
        }
      }
    } catch (e) { console.error(e); }
    finally { setInitLoading(false); }
  };

  const loadCategories = async () => {
    try {
      const res: any = await window.electronAPI?.invoke('db:categories:getAll');
      if (res?.success) setCategories(res.data || []);
    } catch (e) { console.error(e); }
  };

  const loadUnits = async () => {
    try {
      const res: any = await window.electronAPI?.invoke('db:units:getAll');
      if (res?.success) {
        const data = res.data || [];
        setUnits(data);
        const pcs = data.find((u: any) => u.code === 'PCS');
        if (pcs && form.unit_id === 0) setForm(prev => ({ ...prev, unit_id: pcs.id }));
      }
    } catch (e) { console.error(e); }
  };

  const updateMarginFromPrice = (price: number, type: 'retail' | 'container' = 'retail') => {
    const purchase = type === 'retail' ? unitPurchasePrice : form.purchase_price;
    if (purchase <= 0) {
      if (type === 'retail') setForm(prev => ({ ...prev, retail_price: price }));
      else setContainerSellPrice(price);
      return;
    }
    const margin = ((price / purchase) - 1) * 100;
    if (type === 'retail') {
      setForm(prev => ({ ...prev, retail_price: price, retail_margin: Math.round(margin * 100) / 100 }));
    } else {
      setContainerSellPrice(price);
      setContainerMargin(Math.round(margin * 100) / 100);
    }
  };

  const updatePriceFromMargin = (margin: number, type: 'retail' | 'container' = 'retail') => {
    const purchase = type === 'retail' ? unitPurchasePrice : form.purchase_price;
    const price = Math.round(purchase * (1 + margin / 100));
    if (type === 'retail') {
      setForm(prev => ({ ...prev, retail_price: price, retail_margin: margin }));
    } else {
      setContainerSellPrice(price);
      setContainerMargin(margin);
    }
  };


  const handleSaveDefaults = () => {
    localStorage.setItem('default_retail_margin', defaultMargin.toString());
    setShowSettings(false);
  };

  const handleAddProduct = async () => {
    if (loading) return;
    if (!form.name.trim() || form.unit_id === 0) return;
    setLoading(true);
    try {
      const calculatedPurchasePrice = isDivisible && bulkQty > 0 ? (form.purchase_price / bulkQty) : form.purchase_price;
      const productData = {
        name: form.name, 
        name_fr: form.name_fr || undefined,
        barcode: form.barcode || undefined, internal_code: form.barcode || undefined,
        category_id: form.category_id ? parseInt(form.category_id as string) : undefined,
        unit_id: form.unit_id,
        has_sub_unit: isDivisible ? true : false,
        purchase_price: calculatedPurchasePrice,
        wholesale_price: isDivisible && containerSellPrice > 0 ? containerSellPrice : form.retail_price,
        retail_price: form.retail_price, min_stock_level: form.min_stock_level,
        pieces_per_box: isDivisible ? bulkQty : 1,
        initial_stock: form.initial_stock || 0,
        _user_id: user?.id,
        fitments: fitments.map(f => ({ vehicle_brand_id: f.vehicle_brand_id, vehicle_model_id: f.vehicle_model_id }))
      };

      let res: any;
      if (productId) {
        res = await window.electronAPI?.invoke('db:products:update', productId, productData);
      } else {
        res = await window.electronAPI?.invoke('db:products:create', productData);
      }

      if (res?.success) {
        const id = productId || Number(res.id);
        showSuccess(productId ? 'تم تحديث المنتج بنجاح' : 'تم حفظ المنتج بنجاح');
        const calculatedPurchasePrice = isDivisible && bulkQty > 0 ? (form.purchase_price / bulkQty) : form.purchase_price;
        const calculatedWholesalePrice = isDivisible && containerSellPrice > 0 ? containerSellPrice : form.retail_price;
        if (onSuccess) {
          onSuccess({ ...form, id, purchase_price: form.purchase_price, wholesale_price: calculatedWholesalePrice });
        }
        if (onSaved) {
          onSaved();
        }
        onClose();
      } else {
        showError(res?.error || 'خطأ في حفظ المنتج');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      showError('حدث خطأ غير متوقع أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 font-cairo" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="bg-background_secondary/85 dark:bg-background_secondary/85 backdrop-blur-2xl border border-white/15 dark:border-white/10 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/20"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 transparent' }}>

        {/* ── Header ── */}
        <div className="shrink-0 bg-background_primary/80 dark:bg-white/[0.02] border-b border-border_default dark:border-white/5 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-text_primary tracking-tight">
              {productId ? t('inventory.edit_product') : t('inventory.add_product')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-background_secondary rounded-xl transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-border_default">
            <X size={20} className="text-text_muted group-hover:text-text_primary transition-colors" />
          </button>
        </div>

        {/* ── Scrollable Content with Glass ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ═══ VERTICAL FLOW LAYOUT (Horizontal pairs) ═══ */}
          <div className="space-y-6">

            {/* Row 1: اسم المنتج + الاسم اللاتيني + سعر الشراء */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-4">
                <label className="text-sm text-text_secondary block mb-2 font-bold flex items-center gap-1.5">
                  <Package size={16} className="text-blue-500" />
                  <span>{t('inventory.product_name')} (عربي)</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder={t('inventory.product_name')}
                  dir="auto"
                  className="w-full bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl px-4 py-3 text-base font-bold text-text_primary placeholder:text-text_muted focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-inner" />
              </div>
              <div className="md:col-span-4">
                <label className="text-sm text-text_secondary block mb-2 font-bold flex items-center gap-1.5">
                  <Globe size={16} className="text-indigo-500" />
                  <span>{t('inventory.product_name')} (فرنسي)</span>
                </label>
                <input type="text" value={form.name_fr} onChange={e => setForm({ ...form, name_fr: e.target.value })}
                  placeholder="Désignation en français"
                  dir="auto"
                  className="w-full bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl px-4 py-3 text-base font-bold text-text_primary placeholder:text-text_muted focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-inner" />
              </div>
              <div className="md:col-span-4">
                <label className="text-sm text-text_secondary block mb-2 font-bold flex items-center gap-1.5">
                  <Banknote size={16} className="text-amber-500" />
                  <span>{t('inventory.purchase_price')} {isDivisible ? '(للعلبة/للكيس)' : ''}</span>
                </label>
                <input type="number" min={0} value={form.purchase_price || ''} 
                  onChange={e => {
                    const newPurchase = parseFloat(e.target.value) || 0;
                    setForm(prev => ({ 
                      ...prev, 
                      purchase_price: newPurchase
                    }));
                    if (isDivisible && bulkQty > 0) {
                      setContainerSellPrice(Math.round(newPurchase * (1 + containerMargin / 100)));
                    }
                  }}
                  placeholder="0"
                  className="w-full bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl px-4 py-3 text-base font-numbers font-bold text-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all shadow-inner" />
              </div>
            </div>

            {isDivisible && labels ? (
              <>
                {/* Row 2: الباركود + الوحدة الأساسية */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  <div className="md:col-span-6">
                    <label className="text-sm text-text_secondary block mb-2 font-bold flex items-center gap-1.5">
                      <Globe size={16} className="text-emerald-500" />
                      <span>{t('inventory.barcode')}</span>
                    </label>
                    <input type="text" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value, internal_code: e.target.value })}
                      placeholder={t('inventory.barcode')}
                      className="w-full bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl px-4 py-3 text-base font-numbers text-text_primary placeholder:text-text_muted focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-inner" />
                  </div>
                  <div className="md:col-span-6">
                    <CustomSelect
                      label={t('inventory.unit_primary')}
                      icon={<Package size={16} className="text-indigo-500" />}
                      placeholder={t('inventory.unit_primary')}
                      required
                      value={form.unit_id}
                      options={units.filter(u => u.is_active !== 0).map(u => ({ id: u.id, name: u.name }))}
                      onChange={val => {
                        setForm(prev => ({ ...prev, unit_id: val }));
                        setBulkQty(0);
                      }}
                    />
                  </div>
                </div>

                {/* Row 3: التصنيف + الحد الأدنى للتنبيه */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  <div className="md:col-span-6">
                    <CustomSelect
                      label={t('inventory.category')}
                      icon={<Search size={16} className="text-blue-500" />}
                      placeholder={t('inventory.category')}
                      value={form.category_id}
                      options={[{ id: '', name: t('common.no_data') || 'بدون تصنيف' }, ...categories.map(c => ({ id: c.id, name: c.name }))]}
                      onChange={val => setForm(prev => ({ ...prev, category_id: val }))}
                    />
                  </div>
                  <div className="md:col-span-6">
                    <label className="text-sm text-text_secondary block mb-2 font-bold flex items-center gap-1.5">
                      <Settings2 size={16} className="text-text_muted" />
                      <span>{t('inventory.min_stock')}</span>
                    </label>
                    <input type="number" min={0} value={form.min_stock_level} onChange={e => setForm({ ...form, min_stock_level: parseInt(e.target.value) || 0 })}
                      className="w-full bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl px-4 py-3 text-base font-numbers text-text_primary focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-inner" />
                  </div>
                </div>

                {/* Row 4: الكمية الحالية + سعة الكيس/العلبة */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  <div className="md:col-span-6">
                    <label className="text-sm text-emerald-500 block mb-2 font-bold flex items-center gap-1.5">
                      <Package size={16} className="text-emerald-500" />
                      <span>{t('inventory.stock_current')}</span>
                    </label>
                    <input type="number" min={0} value={form.initial_stock || ''} onChange={e => setForm({ ...form, initial_stock: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl px-4 py-3 text-base font-numbers text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-inner" />
                  </div>
                  <div className="md:col-span-6">
                    <label className="text-sm text-violet-600 dark:text-violet-300 block mb-2 font-bold flex items-center gap-1.5">
                      <span>{labels.icon}</span>
                      <span>{t('inventory.capacity')} {labels.bulk} ({labels.unit})</span>
                    </label>
                    <input type="number" min={0} value={bulkQty || ''} 
                      onChange={e => {
                        const newQty = parseFloat(e.target.value) || 0;
                        setBulkQty(newQty);
                        setContainerSellPrice(Math.round(form.purchase_price * (1 + containerMargin / 100)));
                      }}
                      placeholder="10"
                      className="w-full bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl px-4 py-3 text-base font-numbers font-bold text-violet-600 dark:text-violet-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 outline-none transition-all shadow-inner" />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Row 2: الباركود الموحد */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  <div className="md:col-span-12">
                    <label className="text-sm text-text_secondary block mb-2 font-bold flex items-center gap-1.5">
                      <Globe size={16} className="text-emerald-500" />
                      <span>{t('inventory.barcode')}</span>
                    </label>
                    <input type="text" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value, internal_code: e.target.value })}
                      placeholder={t('inventory.barcode')}
                      className="w-full bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl px-4 py-3 text-base font-numbers text-text_primary placeholder:text-text_muted focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-inner" />
                  </div>
                </div>

                {/* Row 3: التصنيف والوحدة الأساسية */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  <div className="md:col-span-6">
                    <CustomSelect
                      label={t('inventory.category')}
                      icon={<Search size={16} className="text-blue-500" />}
                      placeholder={t('inventory.category')}
                      value={form.category_id}
                      options={[{ id: '', name: t('common.no_data') || 'بدون تصنيف' }, ...categories.map(c => ({ id: c.id, name: c.name }))]}
                      onChange={val => setForm(prev => ({ ...prev, category_id: val }))}
                    />
                  </div>
                  <div className="md:col-span-6">
                    <CustomSelect
                      label={t('inventory.unit_primary')}
                      icon={<Package size={16} className="text-indigo-500" />}
                      placeholder={t('inventory.unit_primary')}
                      required
                      value={form.unit_id}
                      options={units.filter(u => u.is_active !== 0).map(u => ({ id: u.id, name: u.name }))}
                      onChange={val => {
                        setForm(prev => ({ ...prev, unit_id: val }));
                        setBulkQty(0);
                      }}
                    />
                  </div>
                </div>

                {/* Row 4: الكمية + الحد الأدنى */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm text-emerald-500 block mb-2 font-bold flex items-center gap-1.5">
                      <Package size={16} className="text-emerald-500" />
                      <span>{t('inventory.stock_current')}</span>
                    </label>
                    <input type="number" min={0} value={form.initial_stock || ''} onChange={e => setForm({ ...form, initial_stock: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl px-4 py-3 text-base font-numbers text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-inner" />
                  </div>
                  <div>
                    <label className="text-sm text-text_secondary block mb-2 font-bold flex items-center gap-1.5">
                      <Settings2 size={16} className="text-text_muted" />
                      <span>{t('inventory.min_stock')}</span>
                    </label>
                    <input type="number" min={0} value={form.min_stock_level} onChange={e => setForm({ ...form, min_stock_level: parseInt(e.target.value) || 0 })}
                      className="w-full bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl px-4 py-3 text-base font-numbers text-text_primary focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-inner" />
                  </div>
                </div>
              </>
            )}

            {/* Row 5: سعر البيع النهائي والنسبة + سعر العلبة النهائي */}
            <div className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {isDivisible && labels ? (
                  <>
                    {/* Right column: سعر بيع الكيس (Green/Emerald) */}
                    <div className="md:col-span-6">
                      <label className="text-sm text-emerald-500 block mb-2 font-bold flex items-center gap-1.5">
                        <Package size={16} className="text-emerald-500" />
                        <span>{t('inventory.sell_price')} {labels.bulk}</span>
                      </label>
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-5 relative">
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/70 text-xs font-bold">{t('inventory.profit')}</span>
                          <input type="number" value={containerMargin} onChange={e => updatePriceFromMargin(parseFloat(e.target.value) || 0, 'container')}
                            className="w-full bg-emerald-500/5 border border-emerald-500/25 rounded-xl pr-10 pl-5 py-3 text-base font-black font-numbers text-emerald-600 dark:text-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-center shadow-inner" />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/70 text-xs">%</span>
                        </div>
                        <div className="col-span-7">
                          <input type="number" value={containerSellPrice || ''} onChange={e => updateMarginFromPrice(parseFloat(e.target.value) || 0, 'container')}
                            placeholder={t('inventory.sell_price')}
                            className="w-full bg-emerald-500/5 border border-emerald-500/25 rounded-xl px-4 py-3 text-base font-black font-numbers text-emerald-600 dark:text-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-inner" />
                        </div>
                      </div>
                    </div>

                    {/* Left column: سعر بيع الكيلوغرام/الوحدة (Violet) */}
                    <div className="md:col-span-6">
                      <label className="text-sm text-violet-500 block mb-2 font-bold flex items-center gap-1.5">
                        <Banknote size={16} className="text-violet-500" />
                        <span>{t('inventory.sell_price')} {selectedUnit ? selectedUnit.name : ''}</span>
                      </label>
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-5 relative">
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-500/70 text-xs font-bold">{t('inventory.profit')}</span>
                          <input type="number" value={form.retail_margin} onChange={e => updatePriceFromMargin(parseFloat(e.target.value) || 0)}
                            className="w-full bg-violet-500/5 border border-violet-500/25 rounded-xl pr-10 pl-5 py-3 text-base font-black font-numbers text-violet-600 dark:text-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-center shadow-inner" />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-500/70 text-xs">%</span>
                        </div>
                        <div className="col-span-7">
                          <input type="number" value={form.retail_price || ''} onChange={e => updateMarginFromPrice(parseFloat(e.target.value) || 0)}
                            placeholder={t('inventory.sell_price')}
                            className="w-full bg-violet-500/5 border border-violet-500/25 rounded-xl px-4 py-3 text-base font-black font-numbers text-violet-600 dark:text-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all shadow-inner" />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-12">
                    <label className="text-sm text-emerald-500 block mb-2 font-bold flex items-center gap-1.5">
                      <Banknote size={16} className="text-emerald-500" />
                      <span>{t('inventory.sell_price')} {selectedUnit ? selectedUnit.name : ''}</span>
                    </label>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-5 relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/70 text-xs font-bold">{t('inventory.profit')}</span>
                        <input type="number" value={form.retail_margin} onChange={e => updatePriceFromMargin(parseFloat(e.target.value) || 0)}
                          className="w-full bg-emerald-500/5 border border-emerald-500/25 rounded-xl pr-10 pl-5 py-3 text-base font-black font-numbers text-emerald-600 dark:text-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-center shadow-inner" />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/70 text-xs">%</span>
                      </div>
                      <div className="col-span-7">
                        <input type="number" value={form.retail_price || ''} onChange={e => updateMarginFromPrice(parseFloat(e.target.value) || 0)}
                          placeholder={t('inventory.sell_price')}
                          className="w-full bg-emerald-500/5 border border-emerald-500/25 rounded-xl px-4 py-3 text-base font-black font-numbers text-emerald-600 dark:text-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-inner" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Row 6: توافقات المركبات */}
            <div className="pt-2">
              <label className="text-base font-bold text-text_primary block mb-3 flex items-center gap-2">
                <Car size={20} className="text-primary_blue" />
                <span>{t('inventory.vehicle_fitments')}</span>
              </label>
              <div className="flex flex-col gap-3">
                <motion.button
                  onClick={(e) => {
                    e.preventDefault();
                    setIsFitmentModalOpen(true);
                  }}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-blue-500/10 backdrop-blur-xl border border-blue-500/30 hover:border-blue-500/60
                             rounded-xl py-3 px-4 flex items-center justify-between text-blue-600 dark:text-blue-300 font-bold transition-colors shadow-lg shadow-blue-500/10 group"
                >
                  <span className="flex items-center gap-2">
                    <Settings2 size={18} className="text-blue-500 group-hover:rotate-45 transition-transform" />
                    <span>{t('inventory.fitments_manage')} ({fitments.length} ماركة/موديل)</span>
                  </span>
                  <span className="text-xs bg-blue-500/20 px-2.5 py-1 rounded-lg">فتح النافذة 🡥</span>
                </motion.button>

                {/* Displaying a premium preview list of selected fitment names */}
                {fitments.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl max-h-36 overflow-y-auto custom-scrollbar">
                    {fitments.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20"
                      >
                        <Car size={12} />
                        {tag.vehicle_brand_name} {tag.vehicle_model_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── أزرار الحفظ ── */}
        <div className="shrink-0 bg-background_secondary border-t border-border_default px-6 py-5 flex gap-4 rounded-b-2xl">
          <button onClick={handleAddProduct} disabled={loading || initLoading || !form.name.trim() || form.unit_id === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold text-base disabled:opacity-50 disabled:hover:bg-blue-600 transition-all duration-200 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-blue-600/30">
            {loading && <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
            {productId ? t('inventory.update_data') : t('inventory.save_product')}
          </button>
          <button onClick={onClose} className="px-8 py-3.5 rounded-xl border border-border_default text-text_secondary hover:text-text_primary hover:bg-background_secondary text-base font-bold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-border_default">
            {t('common.cancel')}
          </button>
        </div>
      </motion.div>

      {/* ── Fitment Selection Modal ── */}
      <AnimatePresence>
        {isFitmentModalOpen && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-md flex items-center justify-center z-[1200] p-4 font-cairo" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-background_secondary/90 dark:bg-background_secondary/85 backdrop-blur-2xl border border-white/15 dark:border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
            >
              {/* Header + Search Row */}
              <div className="bg-transparent border-b border-white/10 px-6 py-4 flex flex-col gap-3 shrink-0">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5 text-blue-500">
                    <Car size={22} />
                    <h3 className="text-lg font-bold text-text_primary">{t('inventory.vehicle_fitments')}</h3>
                  </div>
                  <button
                    onClick={() => setIsFitmentModalOpen(false)}
                    className="p-1.5 hover:bg-background_primary rounded-lg transition-colors text-text_muted hover:text-text_primary"
                  >
                    <X size={18} />
                  </button>
                </div>
                {/* AI Search Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (!form.name.trim() && !form.internal_code.trim()) {
                      showError('يرجى كتابة اسم القطعة أو كودها أولاً');
                      return;
                    }
                    const query = encodeURIComponent(`What car models and years are compatible with auto part: ${form.internal_code} ${form.name}?`);
                    window.electronAPI.invoke('shell:openExternal', `https://www.google.com/search?q=${query}`);
                  }}
                  className="self-start text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all font-bold border border-blue-500/20"
                >
                  <Sparkles size={13} />
                  <span>{t('inventory.search_ai')}</span>
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                <label className="text-sm font-bold text-text_secondary block">{t('inventory.vehicle_fitments')}</label>
                <CreatableFitmentTags value={fitments} onChange={setFitments} />
              </div>

              {/* Footer */}
              <div className="bg-transparent border-t border-white/10 px-6 py-4 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setIsFitmentModalOpen(false)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 transition-colors"
                >
                  {t('inventory.fitments_confirm')} ({fitments.length})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
