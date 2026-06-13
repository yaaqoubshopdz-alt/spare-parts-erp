/**
 * VehiclesPage — إدارة ماركات السيارات والموديلات والتوافق
 */
import { useState, useEffect } from 'react';
import { Car, Plus, Save, Trash2, Search, Edit2, X } from 'lucide-react';
import { showSuccess, showError } from '../../shared/utils/notifications';

export default function VehiclesPage({ hideHeader = false }: { hideHeader?: boolean }) {
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
  
  // Create Brand State
  const [newBrandName, setNewBrandName] = useState('');
  // Create Model State
  const [newModelName, setNewModelName] = useState('');
  const [newModelYearStart, setNewModelYearStart] = useState('');
  const [newModelYearEnd, setNewModelYearEnd] = useState('');

  // Edit States
  const [editingBrandId, setEditingBrandId] = useState<number | null>(null);
  const [editingBrandName, setEditingBrandName] = useState('');

  const [editingModelId, setEditingModelId] = useState<number | null>(null);
  const [editingModelName, setEditingModelName] = useState('');
  const [editingModelYearStart, setEditingModelYearStart] = useState('');
  const [editingModelYearEnd, setEditingModelYearEnd] = useState('');

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) loadModels(selectedBrand);
    else setModels([]);
  }, [selectedBrand]);

  const loadBrands = async () => {
    try {
      const res = await window.electronAPI.invoke('db:vehicles:getBrands');
      if (res.success) setBrands(res.data);
    } catch (e) {}
  };

  const loadModels = async (brandId: number) => {
    try {
      const res = await window.electronAPI.invoke('db:vehicles:getModels', brandId);
      if (res.success) setModels(res.data);
    } catch (e) {}
  };

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    try {
      const res = await window.electronAPI.invoke('db:vehicles:createBrand', newBrandName.trim());
      if (res.success) {
        showSuccess('تمت إضافة الماركة بنجاح');
        setNewBrandName('');
        loadBrands();
      }
    } catch (e) {}
  };

  const handleCreateModel = async () => {
    if (!selectedBrand || !newModelName.trim()) return;
    try {
      const res = await window.electronAPI.invoke('db:vehicles:createModel', {
        brand_id: selectedBrand,
        name: newModelName.trim(),
        year_from: newModelYearStart ? parseInt(newModelYearStart) : undefined,
        year_to: newModelYearEnd ? parseInt(newModelYearEnd) : undefined
      });
      if (res.success) {
        showSuccess('تمت إضافة الموديل بنجاح');
        setNewModelName('');
        setNewModelYearStart('');
        setNewModelYearEnd('');
        loadModels(selectedBrand);
      }
    } catch (e) {}
  };

  const handleDeleteBrand = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الماركة؟')) return;
    try {
      const res = await window.electronAPI.invoke('db:vehicles:deleteBrand', id);
      if (res.success) {
        showSuccess('تم حذف الماركة');
        if (selectedBrand === id) setSelectedBrand(null);
        loadBrands();
      } else {
        showError(res.error || 'خطأ في الحذف');
      }
    } catch (e) {}
  };

  const handleUpdateBrand = async (id: number) => {
    if (!editingBrandName.trim()) return;
    try {
      const res = await window.electronAPI.invoke('db:vehicles:updateBrand', { id, name: editingBrandName.trim() });
      if (res.success) {
        showSuccess('تم تحديث الماركة');
        setEditingBrandId(null);
        loadBrands();
      }
    } catch (e) {}
  };

  const handleDeleteModel = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموديل؟')) return;
    try {
      const res = await window.electronAPI.invoke('db:vehicles:deleteModel', id);
      if (res.success) {
        showSuccess('تم حذف الموديل');
        if (selectedBrand) loadModels(selectedBrand);
      } else {
        showError(res.error || 'خطأ في الحذف');
      }
    } catch (e) {}
  };

  const handleUpdateModel = async (id: number) => {
    if (!editingModelName.trim()) return;
    try {
      const res = await window.electronAPI.invoke('db:vehicles:updateModel', {
        id,
        name: editingModelName.trim(),
        year_from: editingModelYearStart ? parseInt(editingModelYearStart) : undefined,
        year_to: editingModelYearEnd ? parseInt(editingModelYearEnd) : undefined
      });
      if (res.success) {
        showSuccess('تم تحديث الموديل');
        setEditingModelId(null);
        if (selectedBrand) loadModels(selectedBrand);
      }
    } catch (e) {}
  };

  return (
    <div className="p-6 h-full lg:h-auto flex flex-col relative max-w-6xl mx-auto w-full">
      {!hideHeader && (
        <div className="flex items-center mb-8">
          <h1 className="text-2xl font-bold text-text_primary flex items-center gap-2">
            <Car size={26} className="text-primary_blue" />
            دليل توافق المركبات (Fitments)
          </h1>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[500px] lg:min-h-0">
        
        {/* الماركات Brands */}
        <div className="bg-background_secondary border border-border_default rounded-2xl p-5 flex flex-col">
          <h2 className="text-lg font-bold text-text_primary mb-4 border-b border-border_default pb-3">ماركات السيارات</h2>
          
          <div className="flex gap-2 mb-4">
            <input 
              type="text" placeholder="اسم الماركة الجديدة (مثال: Toyota)" value={newBrandName} onChange={e => setNewBrandName(e.target.value)}
              className="flex-1 bg-background_primary border border-border_default rounded-xl px-4 py-2 outline-none focus:border-primary_blue"
            />
            <button onClick={handleCreateBrand} className="bg-primary_blue hover:bg-primary_blue_hover text-white px-4 py-2 rounded-xl transition-colors"><Plus size={20} /></button>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar border border-border_default rounded-xl bg-background_primary">
            {brands.map(brand => (
              <div 
                key={brand.id}
                onClick={() => {
                  if (editingBrandId !== brand.id) setSelectedBrand(brand.id);
                }}
                className={`p-3 border-b border-border_default/50 transition-all flex justify-between items-center ${selectedBrand === brand.id ? 'bg-primary_blue/10 border-l-4 border-l-primary_blue' : 'hover:bg-background_card cursor-pointer'}`}
              >
                {editingBrandId === brand.id ? (
                  <div className="flex gap-2 w-full" onClick={e => e.stopPropagation()}>
                    <input 
                      type="text" value={editingBrandName} onChange={e => setEditingBrandName(e.target.value)}
                      className="flex-1 bg-background_card border border-border_default rounded px-2 py-1 outline-none focus:border-primary_blue"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdateBrand(brand.id); }}
                    />
                    <button onClick={() => handleUpdateBrand(brand.id)} className="text-emerald-400 hover:text-emerald-300 p-1"><Save size={18} /></button>
                    <button onClick={() => setEditingBrandId(null)} className="text-text_muted hover:text-danger_red p-1"><X size={18} /></button>
                  </div>
                ) : (
                  <>
                    <span className="font-bold text-text_primary">{brand.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: selectedBrand === brand.id ? 1 : undefined }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingBrandId(brand.id); setEditingBrandName(brand.name); }} 
                        className="p-1.5 text-text_muted hover:text-primary_blue rounded-md hover:bg-primary_blue/10"
                      ><Edit2 size={16} /></button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand.id); }} 
                        className="p-1.5 text-text_muted hover:text-danger_red rounded-md hover:bg-danger_red/10"
                      ><Trash2 size={16} /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {brands.length === 0 && <div className="p-8 text-center text-text_muted">لا توجد ماركات مسجلة</div>}
          </div>
        </div>

        {/* الموديلات Models */}
        <div className="bg-background_secondary border border-border_default rounded-2xl p-5 flex flex-col opacity-100 transition-opacity">
          <h2 className="text-lg font-bold text-text_primary mb-4 border-b border-border_default pb-3">الموديلات</h2>
          
          {!selectedBrand ? (
            <div className="flex-1 flex items-center justify-center text-text_muted text-center flex-col">
              <Car size={48} className="mb-4 opacity-20" />
              يرجى اختيار ماركة سيارة من القائمة لعرض موديلاتها
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <input 
                  type="text" placeholder="اسم الموديل (مثال: Corolla)" value={newModelName} onChange={e => setNewModelName(e.target.value)}
                  className="col-span-2 bg-background_primary border border-border_default rounded-xl px-4 py-2 outline-none focus:border-primary_blue"
                />
                <input 
                  type="number" placeholder="من سنة (مثال: 2015)" value={newModelYearStart} onChange={e => setNewModelYearStart(e.target.value)}
                  className="bg-background_primary border border-border_default rounded-xl px-4 py-2 outline-none focus:border-primary_blue font-numbers"
                />
                <input 
                  type="number" placeholder="إلى سنة (مثال: 2020)" value={newModelYearEnd} onChange={e => setNewModelYearEnd(e.target.value)}
                  className="bg-background_primary border border-border_default rounded-xl px-4 py-2 outline-none focus:border-primary_blue font-numbers"
                />
                <button onClick={handleCreateModel} className="col-span-2 bg-primary_blue hover:bg-primary_blue_hover text-white py-2 rounded-xl transition-colors font-bold mt-1">
                  إضافة موديل جديد
                </button>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar border border-border_default rounded-xl bg-background_primary">
                {models.map(model => (
                  <div key={model.id} className="p-3 border-b border-border_default/50 flex justify-between items-center hover:bg-background_card group">
                    {editingModelId === model.id ? (
                      <div className="flex gap-2 w-full flex-wrap">
                        <input 
                          type="text" value={editingModelName} onChange={e => setEditingModelName(e.target.value)}
                          className="flex-1 min-w-[120px] bg-background_card border border-border_default rounded px-2 py-1 outline-none focus:border-primary_blue text-sm"
                          placeholder="الاسم"
                        />
                        <input 
                          type="number" value={editingModelYearStart} onChange={e => setEditingModelYearStart(e.target.value)}
                          className="w-20 bg-background_card border border-border_default rounded px-2 py-1 outline-none focus:border-primary_blue text-sm font-numbers"
                          placeholder="من"
                        />
                        <input 
                          type="number" value={editingModelYearEnd} onChange={e => setEditingModelYearEnd(e.target.value)}
                          className="w-20 bg-background_card border border-border_default rounded px-2 py-1 outline-none focus:border-primary_blue text-sm font-numbers"
                          placeholder="إلى"
                        />
                        <div className="flex items-center">
                          <button onClick={() => handleUpdateModel(model.id)} className="text-emerald-400 hover:text-emerald-300 p-1"><Save size={18} /></button>
                          <button onClick={() => setEditingModelId(null)} className="text-text_muted hover:text-danger_red p-1"><X size={18} /></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div className="font-bold text-text_primary">{model.name}</div>
                          <div className="text-xs text-text_muted font-numbers mt-1">
                            {(model.year_from || model.year_to) ? `[ ${model.year_from || '...'} - ${model.year_to || '...'} ]` : 'كل الموديلات'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { 
                              setEditingModelId(model.id); 
                              setEditingModelName(model.name); 
                              setEditingModelYearStart(model.year_from ? model.year_from.toString() : ""); 
                              setEditingModelYearEnd(model.year_to ? model.year_to.toString() : ""); 
                            }} 
                            className="p-1.5 text-text_muted hover:text-primary_blue rounded-md hover:bg-primary_blue/10"
                          ><Edit2 size={16} /></button>
                          <button 
                            onClick={() => handleDeleteModel(model.id)} 
                            className="p-1.5 text-text_muted hover:text-danger_red rounded-md hover:bg-danger_red/10"
                          ><Trash2 size={16} /></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {models.length === 0 && <div className="p-8 text-center text-text_muted">لا توجد موديلات مضافة لهذه الماركة</div>}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
