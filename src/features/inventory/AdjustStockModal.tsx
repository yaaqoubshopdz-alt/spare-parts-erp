import { useState, useEffect } from 'react';
import { X, Save, ArrowUpDown, Truck, ArrowRight, Check, AlertTriangle, Info } from 'lucide-react';
import { showSuccess, showError, showWarning } from '../../shared/utils/notifications';
import { useAuth } from '../../hooks/useAuth';

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  product: { id: number; name: string; current_stock: number } | null;
}

export default function AdjustStockModal({ isOpen, onClose, onSaved, product }: AdjustStockModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'select_invoice'>('input');
  const [adjustmentType] = useState<'manual' | 'return'>('return');
  const [adjustmentQty, setAdjustmentQty] = useState<number | ''>('');
  const [notes, setNotes] = useState('إرجاع للمورد - مرتجع شراء');
  
  // Need to get the primary location ID for this branch
  const [locationId, setLocationId] = useState<number | null>(null);

  // Supplier-specific state for premium return-to-supplier workflow
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      setStep('input');
      setAdjustmentQty('');
      setNotes('إرجاع للمورد - مرتجع شراء');
      setSelectedInvoice(null);
      setSuppliersList([]);
      fetchLocation();
    }
  }, [isOpen, product]);

  const fetchLocation = async () => {
    try {
      const res = await window.electronAPI.invoke('db:locations:getAll');
      if (res.success && res.data.length > 0) {
        setLocationId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch locations', err);
    }
  };

  const fetchLastSuppliers = async () => {
    if (!product) return [];
    setLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:inventory:getProductSuppliers', product.id);
      if (res.success) {
        setSuppliersList(res.data || []);
        return res.data || [];
      } else {
        showError(res.error || 'فشل في تحميل فواتير الموردين');
        return [];
      }
    } catch (err) {
      console.error('Failed to fetch last suppliers', err);
      showError('حدث خطأ أثناء تحميل الفواتير');
      return [];
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const handleContinue = async () => {
    const qty = Number(adjustmentQty);
    if (!qty || isNaN(qty) || qty <= 0) {
      showError('الرجاء إدخال كمية صحيحة أكبر من الصفر');
      return;
    }
    if (qty > product.current_stock) {
      showError(`الكمية المراد إرجاعها (${qty}) أكبر من المخزون الحالي (${product.current_stock})`);
      return;
    }

    const list = await fetchLastSuppliers();
    if (list.length === 0) {
      showError('عذراً، لا توجد فواتير شراء مؤكدة ومتبقية لهذا المنتج لإتمام الإرجاع');
      return;
    }

    // Reset selected invoice when continuing
    setSelectedInvoice(null);
    setStep('select_invoice');
  };

  const handleSave = async () => {
    if (adjustmentQty === '' || isNaN(adjustmentQty)) {
      showError('الرجاء إدخال كمية صحيحة');
      return;
    }
    if (!locationId) {
      showError('لم يتم تحديد المخزن');
      return;
    }

    const qty = Number(adjustmentQty);
    const isReturn = adjustmentType === 'return';

    if (isReturn && !selectedInvoice) {
      showError('الرجاء اختيار فاتورة الشراء المرجعة');
      return;
    }

    setLoading(true);
    try {
      const finalQty = isReturn ? -qty : qty; // For returns, quantity is negative
      
      const payload: any = {
        product_id: product.id,
        location_id: locationId,
        quantity: finalQty,
        type: 'adjustment',
        notes: notes,
        _user_id: user?.id,
      };

      if (isReturn && selectedInvoice) {
        payload.supplier_id = selectedInvoice.supplier_id;
        payload.purchase_price = selectedInvoice.purchase_price;
        payload.purchase_invoice_item_id = selectedInvoice.purchase_invoice_item_id;
      }

      const res = await window.electronAPI.invoke('db:inventory:adjustStock', payload);

      if (res.success) {
        showSuccess(isReturn ? 'تمت التسوية وخصم قيمة المرتجعات من حساب المورد بنجاح' : 'تمت تسوية المخزون بنجاح');
        onSaved();
        onClose();
      } else {
        showError(res.error || 'حدث خطأ أثناء التسوية');
      }
    } catch (err: any) {
      showError(err.message || 'فشل في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const qtyValue = Number(adjustmentQty) || 0;
  const newStock = product.current_stock + (adjustmentType === 'return' ? -qtyValue : qtyValue);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-cairo" dir="rtl">
      <div className={`bg-background_secondary w-full rounded-2xl shadow-2xl border border-border_default overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300 ${step === 'select_invoice' ? 'max-w-3xl' : 'max-w-md'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border_default bg-background_primary/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary_blue/10 flex items-center justify-center text-primary_blue">
              <ArrowUpDown size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text_primary">تسوية المخزون</h2>
              <p className="text-xs text-text_muted">إدارة وتعديل المخزون للمنتج</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-background_card_hover text-text_muted transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {step === 'input' ? (
            <>
              <div className="bg-background_primary p-4 rounded-xl border border-border_default">
                <p className="text-sm text-text_secondary mb-1">المنتج:</p>
                <p className="font-bold text-text_primary">{product.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text_secondary mb-2">المخزون الحالي</label>
                  <div className="w-full bg-background_card border border-border_default rounded-xl px-4 py-3 text-text_primary font-numbers font-bold text-center opacity-70">
                    {product.current_stock}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text_secondary mb-2">المخزون المتوقع</label>
                  <div className={`w-full border rounded-xl px-4 py-3 font-numbers font-bold text-center ${newStock < 0 ? 'bg-danger_red/10 border-danger_red/30 text-danger_red' : 'bg-success_green/10 border-success_green/30 text-success_green'}`}>
                    {newStock}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-text_secondary mb-2">الكمية المراد إرجاعها للمورد (مرتجع شراء)</label>
                <input
                  type="number"
                  min="1"
                  max={product.current_stock}
                  value={adjustmentQty}
                  onChange={e => setAdjustmentQty(e.target.value === '' ? '' : Math.abs(Number(e.target.value)))}
                  className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-3 text-text_primary focus:border-primary_blue focus:ring-1 focus:ring-primary_blue outline-none transition-all font-numbers text-center text-xl font-bold"
                  placeholder="أدخل الكمية..."
                  dir="ltr"
                />
                {newStock < 0 && (
                  <p className="text-xs text-danger_red font-bold mt-1 text-center">الكمية المراد إرجاعها أكبر من المخزون المتوفر!</p>
                )}
              </div>

              <div className="pt-2">
                <label className="block text-sm text-text_secondary mb-2">ملاحظات / سبب الإرجاع للمورد</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-3 text-text_primary focus:border-primary_blue focus:ring-1 focus:ring-primary_blue outline-none transition-all"
                  placeholder="مثال: تلف مصنعي، بضاعة زائدة، إلخ..."
                />
              </div>
            </>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 p-3 bg-primary_blue/5 border border-primary_blue/20 rounded-xl">
                <button
                  onClick={() => setStep('input')}
                  className="p-1.5 rounded-lg hover:bg-primary_blue/10 text-primary_blue transition-colors flex items-center justify-center"
                  title="رجوع للخطوة السابقة"
                >
                  <ArrowRight size={18} />
                </button>
                <div className="text-sm font-bold text-text_primary">
                  تحديد الفاتورة المرجعة لـ: {product.name} (الكمية: {adjustmentQty})
                </div>
              </div>
              
              <div className="text-xs text-text_muted">
                اختر فاتورة الشراء التي تريد إرجاع الكمية منها:
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="w-8 h-8 border-4 border-primary_blue/20 border-t-primary_blue rounded-full animate-spin" />
                </div>
              ) : suppliersList.length === 0 ? (
                <div className="text-center py-10 bg-background_primary border border-border_default rounded-xl p-6">
                  <AlertTriangle className="text-warning_amber mx-auto mb-3" size={32} />
                  <p className="text-text_primary font-bold">لا توجد فواتير شراء متبقية</p>
                  <p className="text-xs text-text_muted mt-1">لا توجد أي دفعات شراء تحتوي على كمية متبقية كافية لهذا المنتج.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[45vh] overflow-y-auto pr-1">
                  {suppliersList.map((sup, idx) => {
                    const isSelected = selectedInvoice?.purchase_invoice_item_id === sup.purchase_invoice_item_id;
                    const isQuantitySufficient = sup.quantity_remaining >= Number(adjustmentQty);
                    
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (isQuantitySufficient) {
                            setSelectedInvoice(sup);
                          } else {
                            showWarning(`الكمية المتبقية في هذه الفاتورة (${sup.quantity_remaining}) أقل من الكمية المراد إرجاعها (${adjustmentQty})`);
                          }
                        }}
                        className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer gap-2 relative ${
                          isSelected
                            ? 'border-primary_blue bg-primary_blue/5 shadow-md ring-1 ring-primary_blue'
                            : !isQuantitySufficient
                            ? 'border-border_default bg-background_primary opacity-50 cursor-not-allowed'
                            : 'border-border_default bg-background_primary hover:border-text_muted'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 left-3 bg-primary_blue text-white rounded-full p-0.5">
                            <Check size={12} />
                          </div>
                        )}

                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-text_primary text-sm block">{sup.supplier_name}</span>
                            <span className="text-xs text-text_muted block mt-0.5">فاتورة: {sup.invoice_number}</span>
                          </div>
                          <div className="text-left">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isQuantitySufficient ? 'bg-success_green/10 text-success_green' : 'bg-danger_red/10 text-danger_red'}`}>
                              {isQuantitySufficient ? 'متاح للإرجاع' : `غير كافٍ (المتبقي: ${sup.quantity_remaining})`}
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-border_default/40 pt-2 grid grid-cols-2 gap-2 text-xs text-text_secondary font-numbers">
                          <div>
                            <span className="text-text_muted block">تاريخ الشراء:</span>
                            <span>{sup.date}</span>
                          </div>
                          <div>
                            <span className="text-text_muted block">سعر الشراء:</span>
                            <span className="font-bold text-text_primary">{sup.purchase_price.toFixed(2)} د.ج</span>
                          </div>
                          <div>
                            <span className="text-text_muted block">الكمية المشتراة:</span>
                            <span>{sup.quantity_purchased} قطعة</span>
                          </div>
                          <div>
                            <span className="text-text_muted block">الكمية المتبقية:</span>
                            <span className="font-bold text-primary_blue">{sup.quantity_remaining} قطعة</span>
                          </div>
                        </div>

                        <div className="border-t border-border_default/40 pt-2 flex items-center justify-between text-xs">
                          <span className="text-text_muted">إجمالي الفاتورة:</span>
                          <span className="font-bold font-numbers text-text_primary">{sup.invoice_total.toFixed(2)} د.ج</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedInvoice && (
                <div className="p-4 bg-success_green/5 border border-success_green/20 rounded-xl animate-in fade-in flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success_green/10 flex items-center justify-center text-success_green flex-shrink-0">
                    <Truck size={20} />
                  </div>
                  <div className="flex-1 text-sm text-text_primary">
                    <div>سيتم إرجاع <strong className="font-numbers">{adjustmentQty}</strong> قطعة إلى المورد <strong className="text-success_green">{selectedInvoice.supplier_name}</strong></div>
                    <div className="text-xs text-text_secondary mt-1">
                      قيمة الخصم من حساب المورد: <strong className="text-success_green font-numbers">{(Number(adjustmentQty) * selectedInvoice.purchase_price).toFixed(2)} د.ج</strong> (سعر شراء القطعة: {selectedInvoice.purchase_price.toFixed(2)} د.ج)
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border_default bg-background_primary/50">
          {step === 'input' ? (
            <>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-border_default hover:bg-background_card_hover text-text_primary font-bold transition-all"
                disabled={loading}
              >
                إلغاء
              </button>
              <button
                onClick={handleContinue}
                disabled={loading || adjustmentQty === '' || adjustmentQty === 0 || newStock < 0}
                className="px-6 py-2.5 rounded-xl bg-primary_blue hover:bg-primary_blue_hover text-white font-bold transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <span>متابعة لتحديد الفاتورة</span>
                <ArrowRight size={18} className="rotate-180" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('input')}
                className="px-5 py-2.5 rounded-xl border border-border_default hover:bg-background_card_hover text-text_primary font-bold transition-all animate-in fade-in"
                disabled={loading}
              >
                السابق
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !selectedInvoice}
                className="px-6 py-2.5 rounded-xl bg-success_green hover:bg-success_green/90 text-white font-bold transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={18} />
                    تأكيد الإرجاع للمورد
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

