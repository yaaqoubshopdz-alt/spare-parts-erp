import React, { useState, useEffect, useRef } from 'react';
import { Car, X, Plus, Search, Check, Sparkles, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { showSuccess, showError } from '../../shared/utils/notifications';

export interface FitmentTag {
  vehicle_brand_id: number;
  vehicle_model_id: number;
  vehicle_brand_name: string;
  vehicle_model_name: string;
}

interface CreatableFitmentTagsProps {
  value: FitmentTag[];
  onChange: (tags: FitmentTag[]) => void;
  productName?: string;
}

export default function CreatableFitmentTags({ value, onChange, productName }: CreatableFitmentTagsProps) {
  const [query, setQuery] = useState('');
  
  // Vehicles dataset from database
  const [brands, setBrands] = useState<any[]>([]);
  const [allModels, setAllModels] = useState<any[]>([]);
  const [activeBrandId, setActiveBrandId] = useState<number | null>(null);
  
  // UI Loading State
  const [loading, setLoading] = useState(false);

  // Inline Form State for Creating Custom Vehicle
  const [isCreating, setIsCreating] = useState(false);
  const [isNewBrand, setIsNewBrand] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    brand_id: '',
    new_brand_name: '',
    model_name: '',
    year_from: '',
    year_to: ''
  });

  const [aiJsonInput, setAiJsonInput] = useState('');
  const [showAiImport, setShowAiImport] = useState(false);

  const handleOpenAiPrompt = () => {
    const term = productName || 'هذا المنتج';
    const promptText = `أعطني توافقات سيارات قطعة الغيار "${term}" ككود JSON مصفوفة كائنات فقط بهذا التنسيق: [{"brand": "Renault", "model": "Symbol"}, {"brand": "Peugeot", "model": "208"}]. لا تكتب أي نص آخر خارج كود JSON.`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(promptText)}`;
    window.electronAPI?.invoke('shell:openExternal', url);
  };

  const handleApplyAIJSON = async () => {
    if (!aiJsonInput.trim()) {
      showError('الرجاء إلصاق كود JSON أولاً');
      return;
    }

    setLoading(true);
    try {
      let cleanInput = aiJsonInput.trim();
      if (cleanInput.startsWith('```')) {
        cleanInput = cleanInput.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
      }

      const parsed = JSON.parse(cleanInput);
      if (!Array.isArray(parsed)) {
        showError('يجب أن يكون كود JSON عبارة عن مصفوفة (Array) تحتوي على قطع متوافقة.');
        setLoading(false);
        return;
      }

      const bRes = await window.electronAPI.invoke('db:vehicles:getBrands');
      const mRes = await window.electronAPI.invoke('db:vehicles:getModels');
      
      let currentBrands = bRes.success ? bRes.data : [];
      let currentModels = mRes.success ? mRes.data : [];

      const newFitments: FitmentTag[] = [...value];

      for (const item of parsed) {
        const brandName = (item.brand || item.make || '').trim();
        const modelName = (item.model || '').trim();

        if (!brandName || !modelName) continue;

        let brandObj = currentBrands.find((b: any) => b.name.toLowerCase() === brandName.toLowerCase());
        let brandId = brandObj ? brandObj.id : null;
        let finalBrandName = brandObj ? brandObj.name : brandName;

        if (!brandId) {
          const createBrandRes = await window.electronAPI.invoke('db:vehicles:createBrand', brandName);
          if (createBrandRes.success) {
            brandId = createBrandRes.id;
            currentBrands.push({ id: brandId, name: brandName });
          } else {
            console.error('Failed to create brand', brandName);
            continue;
          }
        }

        let modelObj = currentModels.find((m: any) => 
          m.vehicle_brand_id === brandId && 
          m.name.toLowerCase() === modelName.toLowerCase()
        );
        let modelId = modelObj ? modelObj.id : null;
        let finalModelName = modelObj ? modelObj.name : modelName;

        if (!modelId) {
          const createModelRes = await window.electronAPI.invoke('db:vehicles:createModel', {
            brand_id: brandId,
            name: modelName
          });
          if (createModelRes.success) {
            modelId = createModelRes.id;
            currentModels.push({ id: modelId, vehicle_brand_id: brandId, name: modelName, brand_name: finalBrandName });
          } else {
            console.error('Failed to create model', modelName);
            continue;
          }
        }

        const exists = newFitments.some(v => v.vehicle_model_id === modelId);
        if (!exists) {
          newFitments.push({
            vehicle_brand_id: brandId,
            vehicle_model_id: modelId,
            vehicle_brand_name: finalBrandName,
            vehicle_model_name: finalModelName
          });
        }
      }

      setBrands(currentBrands);
      setAllModels(currentModels);
      
      onChange(newFitments);
      showSuccess(`تم استيراد وتطبيق ${newFitments.length - value.length} توافقات جديدة بنجاح!`);
      setAiJsonInput('');
      setShowAiImport(false);
    } catch (e: any) {
      showError('فشل في تحليل كود JSON. تأكد من صحة التنسيق.');
      console.error(e);
    }
    setLoading(false);
  };

  // Load all brands and models on mount
  useEffect(() => {
    loadBrandsAndModels();
  }, []);

  const loadBrandsAndModels = async () => {
    setLoading(true);
    try {
      const bRes = await window.electronAPI.invoke('db:vehicles:getBrands');
      if (bRes.success && bRes.data) {
        setBrands(bRes.data);
      }
      const mRes = await window.electronAPI.invoke('db:vehicles:getModels');
      if (mRes.success && mRes.data) {
        setAllModels(mRes.data);
      }
    } catch (e) {
      console.error('Failed to load vehicle list:', e);
    }
    setLoading(false);
  };

  const handleToggleFitment = (model: any) => {
    const isSelected = value.some(v => v.vehicle_model_id === model.id);
    if (isSelected) {
      onChange(value.filter(v => v.vehicle_model_id !== model.id));
    } else {
      onChange([...value, {
        vehicle_brand_id: model.vehicle_brand_id,
        vehicle_model_id: model.id,
        vehicle_brand_name: model.brand_name || brands.find(b => b.id === model.vehicle_brand_id)?.name || '',
        vehicle_model_name: model.name
      }]);
    }
  };

  const startCreating = () => {
    setNewVehicle({
      brand_id: activeBrandId ? activeBrandId.toString() : '',
      new_brand_name: '',
      model_name: query || '',
      year_from: '',
      year_to: ''
    });
    setIsNewBrand(false);
    setIsCreating(true);
  };

  const saveNewVehicle = async () => {
    if (isNewBrand && !newVehicle.new_brand_name.trim()) {
      showError('الرجاء كتابة اسم الماركة الجديدة');
      return;
    }
    if (!isNewBrand && !newVehicle.brand_id) {
      showError('الرجاء اختيار الماركة');
      return;
    }
    if (!newVehicle.model_name.trim()) {
      showError('الرجاء كتابة اسم الموديل');
      return;
    }

    setLoading(true);
    try {
      let finalBrandId = isNewBrand ? null : parseInt(newVehicle.brand_id);
      let finalBrandName = isNewBrand ? newVehicle.new_brand_name.trim() : brands.find(b => b.id === finalBrandId)?.name;

      if (isNewBrand) {
        const bRes = await window.electronAPI.invoke('db:vehicles:createBrand', newVehicle.new_brand_name.trim());
        if (!bRes.success) throw new Error(bRes.error);
        finalBrandId = bRes.id;
        finalBrandName = newVehicle.new_brand_name.trim();
        // Reload brands list
        const updatedBrands = await window.electronAPI.invoke('db:vehicles:getBrands');
        if (updatedBrands.success) setBrands(updatedBrands.data);
      }

      const mRes = await window.electronAPI.invoke('db:vehicles:createModel', {
        brand_id: finalBrandId,
        name: newVehicle.model_name.trim(),
        year_from: newVehicle.year_from ? parseInt(newVehicle.year_from) : undefined,
        year_to: newVehicle.year_to ? parseInt(newVehicle.year_to) : undefined
      });

      if (!mRes.success) throw new Error(mRes.error);

      showSuccess('تمت إضافة المركبة بنجاح');
      
      // Update models list
      const updatedModels = await window.electronAPI.invoke('db:vehicles:getModels');
      if (updatedModels.success) setAllModels(updatedModels.data);

      onChange([...value, {
        vehicle_brand_id: finalBrandId as number,
        vehicle_model_id: mRes.id,
        vehicle_brand_name: finalBrandName,
        vehicle_model_name: newVehicle.model_name.trim()
      }]);
      
      setIsCreating(false);
      setQuery('');
    } catch (err: any) {
      showError(err.message || 'حدث خطأ أثناء الحفظ');
    }
    setLoading(false);
  };

  // Filtering based on search query
  const lowercaseQuery = query.trim().toLowerCase();
  
  // If search query is entered, we filter models
  const searchedModels = lowercaseQuery
    ? allModels.filter(m => 
        m.name.toLowerCase().includes(lowercaseQuery) || 
        m.brand_name?.toLowerCase().includes(lowercaseQuery)
      )
    : [];

  const activeBrandModels = activeBrandId
    ? allModels.filter(m => m.vehicle_brand_id === activeBrandId)
    : [];

  return (
    <div className="w-full space-y-4 font-cairo">
      
      {/* ── AI JSON Import Panel ── */}
      <div className="flex items-center justify-between gap-3 bg-white/[0.02] border border-white/5 p-3 rounded-xl">
        <span className="text-[12px] font-bold text-text_secondary">توافق السيارات مع هذا المنتج:</span>
        <button
          type="button"
          onClick={() => setShowAiImport(!showAiImport)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
            showAiImport
              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30'
              : 'bg-white/10 dark:bg-white/[0.06] text-text_primary border-white/20 dark:border-white/10 hover:border-blue-500/40'
          }`}
        >
          <Sparkles size={13} className="text-blue-500" />
          <span>استيراد ذكي للتوافقات (AI JSON)</span>
        </button>
      </div>

      <AnimatePresence>
        {showAiImport && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-blue-500/5 dark:bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3 shadow-lg"
          >
            <div className="flex justify-between items-center gap-3">
              <span className="text-xs font-bold text-blue-500 flex items-center gap-1.5">
                <Sparkles size={14} /> استيراد التوافقات بنقرة واحدة باستخدام كود JSON
              </span>
              <button
                type="button"
                onClick={handleOpenAiPrompt}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Globe size={13} />
                <span>توليد كود التوافقات من جوجل AI</span>
              </button>
            </div>
            
            <textarea
              value={aiJsonInput}
              onChange={e => setAiJsonInput(e.target.value)}
              placeholder={`قم بلصق كود الـ JSON هنا من جوجل AI... مثال:
[
  {"brand": "Peugeot", "model": "208"},
  {"brand": "Renault", "model": "Symbol"}
]`}
              dir="ltr"
              rows={4}
              className="w-full bg-background_secondary dark:bg-black/20 border border-border_default dark:border-white/10 rounded-lg p-3 text-xs font-numbers outline-none focus:border-blue-500 text-left font-mono"
            />
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApplyAIJSON}
                disabled={loading}
                className="flex-grow bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? 'جاري الاستيراد وتحديث قاعدة البيانات...' : <><Check size={14}/> تطبيق التوافقات المستوردة</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search Input (Premium Design) ── */}
      <div className="relative">
        <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none">
          <Search size={18} className="text-text_muted" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsCreating(false);
          }}
          placeholder="ابحث عن ماركة سيارة أو موديل (مثال: Clio, Logan, Peugeot)..."
          className="w-full bg-white/[0.04] dark:bg-black/[0.15] border border-white/10 dark:border-white/5 rounded-xl pr-11 pl-4 py-3 text-sm font-bold text-text_primary placeholder:text-text_muted focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-inner"
        />
        {query && (
          <button 
            onClick={() => setQuery('')}
            className="absolute inset-y-0 left-3 flex items-center text-text_muted hover:text-text_primary"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Custom Creation Form (Inline and beautiful) ── */}
      {isCreating ? (
        <div className="p-5 bg-white/[0.03] dark:bg-white/[0.01] backdrop-blur-xl border border-white/15 dark:border-white/5 rounded-xl space-y-4 shadow-xl">
          <h4 className="text-sm font-bold text-blue-500 flex items-center gap-2">
            <Plus size={16}/> إضافة مركبة مخصصة جديدة
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text_muted mb-1.5 font-bold">الماركة (Brand)</label>
              <select
                value={isNewBrand ? 'NEW' : newVehicle.brand_id}
                onChange={e => {
                  if (e.target.value === 'NEW') setIsNewBrand(true);
                  else {
                    setIsNewBrand(false);
                    setNewVehicle({...newVehicle, brand_id: e.target.value});
                  }
                }}
                className="w-full bg-background_secondary border border-border_default rounded-lg px-3 py-2 text-sm text-text_primary outline-none focus:border-blue-500"
              >
                <option value="" className="bg-background_primary text-text_primary">اختر ماركة موجودة</option>
                {brands.map(b => <option key={b.id} value={b.id} className="bg-background_primary text-text_primary">{b.name}</option>)}
                <option value="NEW" className="text-blue-500 font-bold bg-background_primary">+ إضافة ماركة جديدة غير مسجلة</option>
              </select>
            </div>

            {isNewBrand && (
              <div>
                <label className="block text-xs text-text_muted mb-1.5 font-bold">اسم الماركة الجديدة</label>
                <input
                  type="text"
                  placeholder="مثال: Chery, Fiat, Geely..."
                  value={newVehicle.new_brand_name}
                  onChange={e => setNewVehicle({...newVehicle, new_brand_name: e.target.value})}
                  className="w-full bg-background_secondary border border-blue-500/50 rounded-lg px-3 py-2 text-sm text-text_primary outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-text_muted mb-1.5 font-bold">الموديل (Model)</label>
              <input
                type="text"
                placeholder="مثال: QQ, CS35, 500..."
                value={newVehicle.model_name}
                onChange={e => setNewVehicle({...newVehicle, model_name: e.target.value})}
                className="w-full bg-background_secondary border border-border_default rounded-lg px-3 py-2 text-sm text-text_primary outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3 col-span-1 md:col-span-2">
              <div className="flex-1">
                <label className="block text-xs text-text_muted mb-1.5 font-bold">سنة البداية (اختياري)</label>
                <input
                  type="number"
                  placeholder="مثال: 2012"
                  value={newVehicle.year_from}
                  onChange={e => setNewVehicle({...newVehicle, year_from: e.target.value})}
                  className="w-full bg-background_secondary border border-border_default rounded-lg px-3 py-2 text-sm text-text_primary font-numbers outline-none focus:border-blue-500 text-center"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-text_muted mb-1.5 font-bold">سنة النهاية (اختياري)</label>
                <input
                  type="number"
                  placeholder="مثال: 2020"
                  value={newVehicle.year_to}
                  onChange={e => setNewVehicle({...newVehicle, year_to: e.target.value})}
                  className="w-full bg-background_secondary border border-border_default rounded-lg px-3 py-2 text-sm text-text_primary font-numbers outline-none focus:border-blue-500 text-center"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              onClick={saveNewVehicle}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : <><Check size={16}/> حفظ وإدراج</>}
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 bg-background_secondary border border-border_default hover:bg-background_secondary/80 text-text_primary rounded-lg py-2.5 text-sm transition-all font-bold"
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Search Mode vs Zero-Typing Selection ── */}
      {!isCreating && (
        <div className="bg-white/[0.02] dark:bg-white/[0.01] border border-white/10 dark:border-white/5 rounded-xl overflow-hidden shadow-lg p-4 space-y-4">
          
          {query.trim() ? (
            /* Search Results mode */
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-text_muted pb-1 border-b border-white/5">
                <span>نتائج البحث عن "{query}":</span>
                <span>({searchedModels.length} مركبة)</span>
              </div>
              {searchedModels.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                  {searchedModels.map((model, idx) => {
                    const isSelected = value.some(v => v.vehicle_model_id === model.id);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleToggleFitment(model)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-right transition-all select-none text-xs font-bold ${
                          isSelected 
                            ? 'border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-300 shadow-sm'
                            : 'border-white/10 bg-white/[0.03] dark:bg-black/[0.15] hover:bg-white/[0.08] text-text_primary'
                        }`}
                      >
                        <Car size={14} className={isSelected ? 'text-green-500' : 'text-text_muted'} />
                        <span className="truncate flex-1">{model.brand_name} {model.name}</span>
                        {isSelected && <Check size={14} className="text-green-500 shrink-0 animate-scaleUp" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-text_muted">
                  لا توجد مركبة مطابقة لبحثك.
                </div>
              )}
            </div>
          ) : (
            /* Zero-Typing Selection Mode */
            <div className="space-y-4">
              {/* Brands Selector */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-blue-500/80">الماركات المتوفرة (اختر ماركة):</span>
                {loading && brands.length === 0 ? (
                  <div className="py-2 text-center text-xs text-text_muted">جاري تحميل قاعدة البيانات...</div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                    {brands.map((b) => {
                      const isActive = activeBrandId === b.id;
                      // Check how many models of this brand are currently selected
                      const selectedCount = value.filter(v => v.vehicle_brand_id === b.id).length;
                      
                      return (
                        <button
                          key={b.id}
                          onClick={() => setActiveBrandId(isActive ? null : b.id)}
                          className={`p-2.5 rounded-xl border text-center transition-all select-none relative ${
                            isActive
                              ? 'border-blue-500/60 bg-blue-500/20 text-blue-600 dark:text-blue-300 font-bold scale-[1.02]'
                              : 'border-white/10 bg-white/[0.03] dark:bg-black/[0.15] hover:bg-white/[0.08] text-text_primary text-xs font-medium'
                          }`}
                        >
                          <span className="block truncate text-xs font-bold">{b.name}</span>
                          {selectedCount > 0 && (
                            <span className="absolute -top-1.5 -left-1.5 bg-green-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow-md">
                              {selectedCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Models Selector */}
              {activeBrandId && (
                <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-2 animate-fadeIn">
                  <div className="flex justify-between items-center text-xs font-bold text-text_muted pb-1 border-b border-white/5">
                    <span className="text-blue-500">موديلات {brands.find(b => b.id === activeBrandId)?.name}:</span>
                    <span>({activeBrandModels.length} موديل متوفر)</span>
                  </div>
                  {activeBrandModels.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                      {activeBrandModels.map((model, idx) => {
                        const isSelected = value.some(v => v.vehicle_model_id === model.id);
                        return (
                          <button
                            key={idx}
                            onClick={() => handleToggleFitment(model)}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border text-right transition-all select-none text-xs font-bold ${
                              isSelected 
                                ? 'border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-300 shadow-sm'
                                : 'border-white/5 bg-white/[0.02] dark:bg-black/[0.1] hover:bg-white/[0.06] text-text_primary'
                            }`}
                          >
                            <Car size={13} className={isSelected ? 'text-green-500' : 'text-text_muted'} />
                            <span className="truncate flex-1">{model.name}</span>
                            {isSelected && <Check size={14} className="text-green-500 shrink-0 animate-scaleUp" />}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-2 text-center text-xs text-text_muted">لا توجد موديلات مضافة لهذه الماركة حالياً.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick Custom Car Creator Trigger */}
          <div className="pt-2 border-t border-white/5 flex justify-between items-center">
            <span className="text-xs text-text_muted">لم تجد ماركة أو موديل السيارة؟</span>
            <button
              onClick={startCreating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/20 rounded-lg text-xs font-bold transition-all animate-pulse"
            >
              <Plus size={14} />
              <span>إضافة سيارة مخصصة</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Selected Fitments (Frosted Badge Area) ── */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-text_secondary block">السيارات المتوافقة المختارة ({value.length}):</label>
        {value.length > 0 ? (
          <div className="flex flex-wrap gap-2 p-3 bg-white/[0.02] backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl shadow-inner max-h-36 overflow-y-auto custom-scrollbar">
            {value.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20 shadow-sm"
              >
                <Car size={12} className="shrink-0" />
                <span>{tag.vehicle_brand_name} {tag.vehicle_model_name}</span>
                <button
                  onClick={() => onChange(value.filter(v => v.vehicle_model_id !== tag.vehicle_model_id))}
                  className="hover:text-red-500 hover:bg-red-500/10 rounded-md p-0.5 transition-colors ml-1.5 shrink-0"
                  title="إزالة"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-white/[0.01] border border-dashed border-white/10 rounded-xl text-center text-xs text-text_muted">
            لم يتم تحديد أي سيارة متوافقة بعد. اختر من الماركات والموديلات أعلاه لتسريع عملك.
          </div>
        )}
      </div>
    </div>
  );
}
