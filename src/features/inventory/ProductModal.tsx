/**
 * ProductModal — إضافة/تعديل منتج (يدعم Barcode, Prices, Stock limits)
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, ScanBarcode, Car, Sparkles, ChevronDown, Check, Search, Globe, Package, Tag } from 'lucide-react';
import { showSuccess, showError } from '../../shared/utils/notifications';
import CreatableFitmentTags, { FitmentTag } from '../shared/CreatableFitmentTags';

interface Category { id: number; name: string; }
interface Brand { id: number; name: string; }
interface Unit { id: number; name: string; }

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  productId?: number | null; // إذا كان موجوداً يعني تعديل
}

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

      <motion.button
        type="button"
        onClick={() => { setIsOpen(prev => !prev); setSearch(''); }}
        whileTap={{ scale: 0.98 }}
        className={`w-full border rounded-xl px-4 py-3 text-right text-base font-bold outline-none transition-all flex items-center justify-between shadow-inner
          ${isOpen
            ? 'bg-background_primary/80 dark:bg-white/[0.08] border-blue-500/60 ring-2 ring-blue-500/15'
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
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

            {options.length > 5 && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-white/[0.07] dark:border-white/[0.05] bg-white/[0.03]">
                <Search size={13} className="text-text_muted shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="بحث..."
                  dir="auto"
                  className="w-full bg-transparent border-none outline-none text-sm text-text_primary placeholder:text-text_muted/60 font-bold text-start"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-text_muted/60 hover:text-text_muted text-xs">✕</button>
                )}
              </div>
            )}

            <div className="overflow-y-auto flex-1 py-1.5 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-4 text-xs text-text_muted text-center">لا توجد نتائج</div>
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

            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background_secondary/30 to-transparent pointer-events-none rounded-b-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


export default function ProductModal({ isOpen, onClose, onSaved, productId }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  
  // Lists
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Form Data
  const [formData, setFormData] = useState({
    barcode: '',
    internal_code: '',
    name: '',
    name_fr: '',
    category_id: '' as string | number,
    brand_id: '' as string | number,
    unit_id: '' as string | number,
    purchase_price: 0,
    wholesale_price: 0,
    retail_price: 0,
    min_stock_level: 5,
    is_batch_tracked: false,
    track_expiry: false,
    description: '',
    has_sub_unit: false,
    pieces_per_box: 1,
  });

  const [fitments, setFitments] = useState<FitmentTag[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      if (productId) loadProduct(productId);
      else resetForm();
    }
  }, [isOpen, productId]);

  const loadDependencies = async () => {
    try {
      const [cats, brs, unts] = await Promise.all([
        window.electronAPI.invoke('db:categories:getAll'),
        window.electronAPI.invoke('db:brands:getAll'),
        window.electronAPI.invoke('db:units:getAll'),
      ]);
      if (cats.success) setCategories(cats.data);
      if (brs.success) setBrands(brs.data);
      if (unts.success) {
        setUnits(unts.data);
        if (!productId && unts.data.length > 0) {
          setFormData(prev => ({ ...prev, unit_id: unts.data[0].id }));
        }
      }
    } catch (err) {
      console.error('Dependencies error', err);
    }
  };

  const loadProduct = async (id: number) => {
    setInitLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:products:getById', id);
      if (res.success && res.data) {
        const p = res.data;
        const codeVal = p.barcode || p.internal_code || '';
        setFormData({
          barcode: codeVal,
          internal_code: codeVal,
          name: p.name || '',
          name_fr: p.name_fr || '',
          category_id: p.category_id || '',
          brand_id: p.brand_id || '',
          unit_id: p.unit_id || '',
          purchase_price: p.purchase_price || 0,
          wholesale_price: p.wholesale_price || 0,
          retail_price: p.retail_price || 0,
          min_stock_level: p.min_stock_level || 0,
          is_batch_tracked: Boolean(p.is_batch_tracked),
          track_expiry: Boolean(p.track_expiry),
          description: p.description || '',
          has_sub_unit: Boolean(p.has_sub_unit),
          pieces_per_box: p.pieces_per_box || 1,
        });
        
        // Load Fitments into local state
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
    } catch (err) {
      showError('خطأ في جلب بيانات المنتج');
    } finally {
      setInitLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      barcode: '', internal_code: '', name: '', name_fr: '',
      category_id: '', brand_id: '', unit_id: units.length ? units[0].id : '',
      purchase_price: 0, wholesale_price: 0, retail_price: 0,
      min_stock_level: 5, is_batch_tracked: false, track_expiry: false, description: '',
      has_sub_unit: false, pieces_per_box: 1,
    });
    setFitments([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.unit_id || formData.purchase_price < 0 || formData.retail_price < 0) {
      showError('يرجى ملء الحقول الإجبارية بشكل صحيح');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        internal_code: formData.barcode || null,
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
        fitments: fitments.map(f => ({ vehicle_brand_id: f.vehicle_brand_id, vehicle_model_id: f.vehicle_model_id }))
      };

      let res;
      if (productId) {
        res = await window.electronAPI.invoke('db:products:update', productId, payload);
      } else {
        res = await window.electronAPI.invoke('db:products:create', payload);
      }

      if (res.success) {
        showSuccess(productId ? 'تم التعديل بنجاح' : 'تمت الإضافة بنجاح');
        onSaved();
        onClose();
      } else {
        showError(res.error || 'حدث خطأ أثناء الحفظ');
      }
    } catch (err) {
      showError('خطأ في الاتصال بقاعدة البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background_card backdrop-blur-sm p-4">
      <div className="bg-background_primary border border-border_default rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border_default">
          <h2 className="text-xl font-bold text-text_primary">
            {productId ? 'تعديل منتج' : 'إضافة منتج جديد'}
          </h2>
          <button onClick={onClose} className="p-2 text-text_muted hover:text-danger_red transition-colors rounded-xl hover:bg-danger_red/10">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          {initLoading ? (
            <div className="flex justify-center py-10 text-text_muted">جاري التحميل...</div>
          ) : (
            <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
              
              {/* الصف الأول: الأكواد */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm text-text_secondary mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ScanBarcode size={16} />
                      الباركود / رمز المنتج (Barcode)
                    </span>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        if (!formData.name.trim() && !formData.barcode.trim()) {
                          showError('يرجى كتابة اسم القطعة أو كودها أولاً');
                          return;
                        }
                        const promptText = `ماهي السيارات المتوافقة مع قطعة الغيار: ${formData.barcode || ''} ${formData.name} وما هي أرقام OEM والبدائل المتطابقة معها في السوق الجزائري؟`;
                        const query = encodeURIComponent(promptText);
                        window.electronAPI.invoke('shell:openExternal', `https://www.google.com/search?q=${query}`);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-md transition-all"
                    >
                      <Sparkles size={12} />
                      بحث مدعوم بالـ AI
                    </button>
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={e => setFormData({...formData, barcode: e.target.value, internal_code: e.target.value})}
                    className="w-full bg-background_secondary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue font-numbers"
                    placeholder="امسح الباركود هنا"
                    dir="ltr"
                    autoFocus
                  />
                </div>
              </div>

              {/* الصف الثاني: الأسماء */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text_secondary mb-2">الاسم (عربي) <span className="text-danger_red">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    dir="auto"
                    className="w-full bg-background_secondary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text_secondary mb-2">الاسم (فرنسي / لاتيني)</label>
                  <input
                    type="text"
                    value={formData.name_fr}
                    onChange={e => setFormData({...formData, name_fr: e.target.value})}
                    className="w-full bg-background_secondary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue"
                    dir="auto"
                  />
                </div>
              </div>

              {/* الصف الثالث: التصنيفات والوحدات بالتنسيق الجمالي الجديد */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div>
                  <CustomSelect
                    label="التصنيف"
                    icon={<Search size={16} className="text-blue-500" />}
                    placeholder="بدون تصنيف..."
                    value={formData.category_id}
                    options={[{ id: '', name: 'بدون تصنيف' }, ...categories.map(c => ({ id: c.id, name: c.name }))]}
                    onChange={val => setFormData(prev => ({ ...prev, category_id: val }))}
                  />
                </div>
                <div>
                  <CustomSelect
                    label="الماركة (العلامة التجارية)"
                    icon={<Tag size={16} className="text-violet-500" />}
                    placeholder="بدون ماركة..."
                    value={formData.brand_id}
                    options={[{ id: '', name: 'بدون ماركة' }, ...brands.map(b => ({ id: b.id, name: b.name }))]}
                    onChange={val => setFormData(prev => ({ ...prev, brand_id: val }))}
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <CustomSelect
                      label="الوحدة الأساسية (الصغرى)"
                      icon={<Package size={16} className="text-indigo-500" />}
                      placeholder="اختر الوحدة..."
                      required
                      value={formData.unit_id}
                      options={units.map(u => ({ id: u.id, name: u.name }))}
                      onChange={val => setFormData(prev => ({ ...prev, unit_id: val }))}
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      type="checkbox"
                      id="has_sub_unit"
                      checked={formData.has_sub_unit}
                      onChange={e => setFormData({...formData, has_sub_unit: e.target.checked})}
                      className="w-4 h-4 rounded border-border_default text-primary_blue focus:ring-primary_blue bg-background_secondary"
                    />
                    <label htmlFor="has_sub_unit" className="text-xs text-text_primary cursor-pointer font-bold">
                      المنتج يأتي في عُلب/صناديق (تجزئة)
                    </label>
                  </div>

                  {formData.has_sub_unit && (
                    <div className="animate-in fade-in slide-in-from-top-2 flex items-center gap-2 mt-1 bg-primary_blue/5 p-3 rounded-xl border border-primary_blue/20">
                      <label className="text-xs text-text_secondary flex-shrink-0">العلبة تحتوي على:</label>
                      <input
                        type="number" min="1" step="0.01"
                        value={formData.pieces_per_box}
                        onChange={e => setFormData({...formData, pieces_per_box: Number(e.target.value)})}
                        className="w-16 bg-background_primary border border-border_default rounded-lg px-2 py-1 text-text_primary outline-none focus:border-primary_blue font-numbers text-center text-sm"
                      />
                      <span className="text-xs font-bold text-primary_blue">
                        {units.find(u => u.id.toString() === formData.unit_id.toString())?.name || 'وحدة'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* الصف الرابع: الأسعار */}
              <div className="p-4 bg-background_secondary border border-border_default rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-text_primary">التسعير (د.ج)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-text_secondary mb-1">سعر الشراء</label>
                    <input
                      type="number" min="0" step="0.01" required
                      value={formData.purchase_price}
                      onChange={e => setFormData({...formData, purchase_price: Number(e.target.value)})}
                      className="w-full bg-background_primary border border-border_default rounded-lg px-3 py-2 text-text_primary outline-none focus:border-warning_amber font-numbers text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text_secondary mb-1">سعر التجزئة (البيع) <span className="text-danger_red">*</span></label>
                    <input
                      type="number" min="0" step="0.01" required
                      value={formData.retail_price}
                      onChange={e => setFormData({...formData, retail_price: Number(e.target.value)})}
                      className="w-full bg-background_primary border border-border_default rounded-lg px-3 py-2 text-text_primary outline-none focus:border-success_green font-numbers text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text_secondary mb-1">سعر الجملة</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={formData.wholesale_price}
                      onChange={e => setFormData({...formData, wholesale_price: Number(e.target.value)})}
                      className="w-full bg-background_primary border border-border_default rounded-lg px-3 py-2 text-text_primary outline-none focus:border-primary_blue font-numbers text-center"
                    />
                  </div>
                </div>
              </div>

              {/* الصف الخامس: الإعدادات المتقدمة */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-text_secondary mb-2">الحد الأدنى للتنبيه</label>
                  <input
                    type="number" min="0"
                    value={formData.min_stock_level}
                    onChange={e => setFormData({...formData, min_stock_level: Number(e.target.value)})}
                    className="w-full bg-background_secondary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue font-numbers"
                  />
                </div>
                
                <div className="flex items-center gap-3 pt-6 md:pt-8">
                  <input
                    type="checkbox"
                    id="is_batch"
                    checked={formData.is_batch_tracked}
                    onChange={e => setFormData({...formData, is_batch_tracked: e.target.checked})}
                    className="w-5 h-5 rounded border-border_default text-primary_blue focus:ring-primary_blue bg-background_secondary"
                  />
                  <label htmlFor="is_batch" className="text-sm text-text_primary cursor-pointer">
                    تتبع بالدُفعات (Batches)
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-6 md:pt-8">
                  <input
                    type="checkbox"
                    id="track_expiry"
                    checked={formData.track_expiry}
                    onChange={e => setFormData({...formData, track_expiry: e.target.checked})}
                    className="w-5 h-5 rounded border-border_default text-primary_blue focus:ring-primary_blue bg-background_secondary"
                    disabled={!formData.is_batch_tracked}
                  />
                  <label htmlFor="track_expiry" className={`text-sm cursor-pointer ${formData.is_batch_tracked ? 'text-text_primary' : 'text-text_muted'}`}>
                    يحتوي على تاريخ صلاحية
                  </label>
                </div>
              </div>

              {/* الصف السادس: توافقات المركبات — Glass */}
              <div className="p-4 bg-primary_blue/10 backdrop-blur-xl border border-primary_blue/30 hover:border-primary_blue/50 rounded-xl space-y-4 shadow-lg shadow-primary_blue/10 transition-colors">
                 <h3 className="text-sm font-bold text-primary_blue flex items-center gap-2">
                    <Car size={18} className="text-primary_blue"/> توافقات المركبات
                 </h3>
                 <CreatableFitmentTags value={fitments} onChange={setFitments} productName={formData.name} />
              </div>

            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border_default bg-background_secondary rounded-b-2xl flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-text_secondary hover:text-text_primary bg-background_card hover:bg-background_card_hover rounded-xl transition-all"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={loading || initLoading}
            className="flex items-center gap-2 bg-primary_blue hover:bg-primary_blue_hover text-white px-6 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50"
          >
            {loading ? <div className="w-5 h-5 border-2 border-border_default border-t-white rounded-full animate-spin" /> : <Save size={18} />}
            حفظ المنتج
          </button>
        </div>
      </div>
    </div>
  );
}
