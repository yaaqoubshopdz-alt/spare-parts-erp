/**
 * FitmentsBadges — Reusable component for showing/editing vehicle fitments
 * Modes: 'view' (POS read-only), 'edit' (Purchase toggle), 'full-edit' (Product management)
 */
import { useState, useEffect } from 'react';
import { Car, Plus, X, Lightbulb, Check } from 'lucide-react';
import { showSuccess, showError } from '../../shared/utils/notifications';

interface Fitment {
  id?: number;
  vehicle_brand_id: number;
  vehicle_model_id: number;
  vehicle_brand_name: string;
  vehicle_model_name: string;
  year_from?: number;
  year_to?: number;
}

interface Suggestion extends Fitment {
  used_by_count: number;
}

interface FitmentsBadgesProps {
  productId: number;
  mode: 'view' | 'edit' | 'full-edit';
  compact?: boolean;
  onFitmentsChange?: () => void;
}

export default function FitmentsBadges({ productId, mode, compact = false, onFitmentsChange }: FitmentsBadgesProps) {
  const [fitments, setFitments] = useState<Fitment[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  // For adding new fitment in full-edit mode
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (productId) loadFitments();
  }, [productId]);

  useEffect(() => {
    if (mode === 'full-edit' || mode === 'edit') {
      loadBrands();
    }
  }, [mode]);

  useEffect(() => {
    if (selectedBrandId) loadModels(selectedBrandId);
    else setModels([]);
  }, [selectedBrandId]);

  const loadFitments = async () => {
    setLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:fitments:getByProduct', productId);
      if (res.success) setFitments(res.data || []);
    } catch (e) {}
    setLoading(false);
  };

  const loadBrands = async () => {
    try {
      const res = await window.electronAPI.invoke('db:vehicles:getBrands');
      if (res.success) setBrands(res.data || []);
    } catch (e) {}
  };

  const loadModels = async (brandId: number) => {
    try {
      const res = await window.electronAPI.invoke('db:vehicles:getModels', brandId);
      if (res.success) setModels(res.data || []);
    } catch (e) {}
  };

  const loadSuggestions = async () => {
    try {
      const res = await window.electronAPI.invoke('db:fitments:suggestForProduct', productId);
      if (res.success) {
        setSuggestions(res.data || []);
        setShowSuggestions(true);
      }
    } catch (e) {}
  };

  const toggleFitment = async (vehicleBrandId: number, vehicleModelId: number) => {
    try {
      const res = await window.electronAPI.invoke('db:fitments:toggleForProduct', {
        product_id: productId,
        vehicle_brand_id: vehicleBrandId,
        vehicle_model_id: vehicleModelId,
      });
      if (res.success) {
        showSuccess(res.action === 'added' ? 'تمت إضافة التوافق ✔️' : 'تم إزالة التوافق ❌');
        loadFitments();
        onFitmentsChange?.();
        // Refresh suggestions if shown
        if (showSuggestions) loadSuggestions();
      }
    } catch (e) {}
  };

  const addFitment = async () => {
    if (!selectedBrandId || !selectedModelId) return;
    await toggleFitment(selectedBrandId, selectedModelId);
    setSelectedModelId(null);
  };

  const removeFitment = async (fitment: Fitment) => {
    if (fitment.id) {
      try {
        const res = await window.electronAPI.invoke('db:fitments:delete', fitment.id);
        if (res.success) {
          showSuccess('تم حذف التوافق');
          loadFitments();
          onFitmentsChange?.();
        }
      } catch (e) {}
    }
  };

  const formatYears = (f: Fitment | Suggestion) => {
    if (f.year_from && f.year_to) return `${f.year_from}-${f.year_to}`;
    if (f.year_from) return `${f.year_from}+`;
    if (f.year_to) return `حتى ${f.year_to}`;
    return '';
  };

  // ── VIEW MODE (POS — read-only badges) ──
  if (mode === 'view') {
    if (fitments.length === 0) return null;
    return (
      <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'mt-2'}`}>
        {fitments.map((f, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-primary_blue/15 text-primary_blue border border-primary_blue/30">
            <Car size={10} />
            {f.vehicle_brand_name} {f.vehicle_model_name}
            {formatYears(f) && <span className="text-text_muted font-numbers ml-0.5">[{formatYears(f)}]</span>}
          </span>
        ))}
      </div>
    );
  }

  // ── EDIT MODE (Purchase — checkbox toggle) ──
  if (mode === 'edit') {
    return (
      <div className="w-full">
        {/* Current fitments */}
        {fitments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {fitments.map((f, i) => (
              <button key={i} onClick={() => removeFitment(f)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-success_green/15 text-success_green border border-success_green/30 hover:bg-danger_red/15 hover:text-danger_red hover:border-danger_red/30 transition-all group">
                <Check size={10} className="group-hover:hidden" />
                <X size={10} className="hidden group-hover:block" />
                {f.vehicle_brand_name} {f.vehicle_model_name}
                {formatYears(f) && <span className="font-numbers ml-0.5">[{formatYears(f)}]</span>}
              </button>
            ))}
          </div>
        )}

        {/* Quick add */}
        <div className="flex items-center gap-2 flex-wrap">
          <select value={selectedBrandId || ''} onChange={e => { setSelectedBrandId(parseInt(e.target.value) || null); setSelectedModelId(null); }}
            className="bg-background_card border border-border_default rounded-lg px-2 py-1 text-[11px] text-text_primary outline-none focus:border-primary_blue">
            <option value="">ماركة السيارة...</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {selectedBrandId && (
            <select value={selectedModelId || ''} onChange={e => setSelectedModelId(parseInt(e.target.value) || null)}
              className="bg-background_card border border-border_default rounded-lg px-2 py-1 text-[11px] text-text_primary outline-none focus:border-primary_blue">
              <option value="">الموديل...</option>
              {models.map(m => {
                const isLinked = fitments.some(f => f.vehicle_model_id === m.id);
                return <option key={m.id} value={m.id} disabled={isLinked}>{m.name} {isLinked ? '✔️' : ''}</option>;
              })}
            </select>
          )}
          {selectedModelId && (
            <button onClick={addFitment} className="bg-primary_blue/20 hover:bg-primary_blue/40 text-primary_blue rounded-lg px-2 py-1 text-[11px] font-bold transition-all">
              <Plus size={12} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── FULL-EDIT MODE (Product modal — complete management) ──
  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-text_primary flex items-center gap-2">
          <Car size={16} className="text-primary_blue" />
          التوافقات مع المركبات
          <span className="text-[10px] text-text_muted font-numbers">({fitments.length})</span>
        </h4>
        <div className="flex gap-1.5">
          <button onClick={loadSuggestions}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-warning_amber/10 text-warning_amber border border-warning_amber/30 rounded-lg hover:bg-warning_amber/20 transition-all">
            <Lightbulb size={12} />
            اقتراحات ذكية
          </button>
          <button onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-primary_blue/10 text-primary_blue border border-primary_blue/30 rounded-lg hover:bg-primary_blue/20 transition-all">
            <Plus size={12} />
            إضافة
          </button>
        </div>
      </div>

      {/* Current fitments as badges */}
      {fitments.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {fitments.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-success_green/10 text-success_green border border-success_green/30 group">
              <Car size={11} />
              {f.vehicle_brand_name} {f.vehicle_model_name}
              {formatYears(f) && <span className="font-numbers text-text_muted">[{formatYears(f)}]</span>}
              <button onClick={() => removeFitment(f)} className="opacity-0 group-hover:opacity-100 text-danger_red hover:text-danger_red transition-opacity mr-1">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-text_muted bg-background_card border border-border_default rounded-lg px-3 py-2 text-center">
          لا توجد توافقات مسجلة — أضف توافقات أو استخدم الاقتراحات الذكية
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="flex items-center gap-2 bg-background_card border border-primary_blue/30 rounded-xl p-2.5">
          <select value={selectedBrandId || ''} onChange={e => { setSelectedBrandId(parseInt(e.target.value) || null); setSelectedModelId(null); }}
            className="flex-1 bg-background_primary border border-border_default rounded-lg px-3 py-1.5 text-[12px] text-text_primary outline-none focus:border-primary_blue">
            <option value="">اختر ماركة السيارة</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {selectedBrandId && (
            <select value={selectedModelId || ''} onChange={e => setSelectedModelId(parseInt(e.target.value) || null)}
              className="flex-1 bg-background_primary border border-border_default rounded-lg px-3 py-1.5 text-[12px] text-text_primary outline-none focus:border-primary_blue">
              <option value="">اختر الموديل</option>
              {models.map(m => {
                const isLinked = fitments.some(f => f.vehicle_model_id === m.id);
                return <option key={m.id} value={m.id} disabled={isLinked}>
                  {m.name} {m.year_from ? `[${m.year_from}-${m.year_to || '...'}]` : ''} {isLinked ? '✔️' : ''}
                </option>;
              })}
            </select>
          )}
          <button onClick={addFitment} disabled={!selectedModelId}
            className="bg-primary_blue hover:bg-primary_blue_hover disabled:opacity-30 text-white px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all">
            إضافة
          </button>
        </div>
      )}

      {/* Smart suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="bg-warning_amber/5 border border-warning_amber/20 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-warning_amber flex items-center gap-1">
              <Lightbulb size={13} />
              اقتراحات بناءً على قطع مشابهة:
            </span>
            <button onClick={() => setShowSuggestions(false)} className="text-text_muted hover:text-text_primary">
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => toggleFitment(s.vehicle_brand_id, s.vehicle_model_id)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-warning_amber/10 text-warning_amber border border-warning_amber/30 hover:bg-success_green/15 hover:text-success_green hover:border-success_green/30 transition-all">
                <Plus size={10} />
                {s.vehicle_brand_name} {s.vehicle_model_name}
                {formatYears(s) && <span className="font-numbers">[{formatYears(s)}]</span>}
                <span className="text-text_muted text-[9px]">({s.used_by_count} قطعة)</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {showSuggestions && suggestions.length === 0 && (
        <div className="text-[11px] text-text_muted bg-background_card border border-border_default rounded-lg px-3 py-2 text-center">
          لا توجد اقتراحات — لم يتم العثور على قطع مشابهة لها توافقات
        </div>
      )}
    </div>
  );
}
