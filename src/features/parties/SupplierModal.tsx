/**
 * SupplierModal — نافذة إضافة وتعديل مورد
 */
import { useState, useEffect } from 'react';
import { X, Save, Truck } from 'lucide-react';
import { showSuccess, showError } from '../../shared/utils/notifications';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  supplier?: any | null; // Supplier object if editing
}

export default function SupplierModal({ isOpen, onClose, onSaved, supplier }: SupplierModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    phone: '',
    phone2: '',
    address: '',
    email: '',
    notes: '',
    is_active: true,
    initial_balance: 0,
  });

  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        setFormData({
          code: supplier.code || '',
          name: supplier.name || '',
          phone: supplier.phone || '',
          phone2: supplier.phone2 || '',
          address: supplier.address || '',
          email: supplier.email || '',
          notes: supplier.notes || '',
          is_active: Boolean(supplier.is_active),
          initial_balance: 0,
        });
      } else {
        const genCode = `SUP-${Date.now().toString().slice(-6)}`;
        setFormData({
          code: genCode,
          name: '', phone: '', phone2: '', address: '', email: '',
          notes: '', is_active: true,
          initial_balance: 0,
        });
      }
    }
  }, [isOpen, supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showError('يرجى إدخال اسم المورد');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (supplier) {
        res = await window.electronAPI.invoke('db:suppliers:update', supplier.id, formData);
      } else {
        res = await window.electronAPI.invoke('db:suppliers:create', formData);
      }

      if (res.success) {
        showSuccess(supplier ? 'تم تعديل المورد بنجاح' : 'تم إضافة المورد بنجاح');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background_primary border border-border_default rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border_default">
          <h2 className="text-xl font-bold text-text_primary flex items-center gap-2">
            <Truck size={22} className="text-primary_blue" />
            {supplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
          </h2>
          <button onClick={onClose} className="p-2 text-text_muted hover:text-danger_red transition-colors rounded-xl hover:bg-danger_red/10">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          <form id="supplier-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm text-text_secondary mb-2">الاسم الكامل / الشركة <span className="text-danger_red">*</span></label>
                <input
                  type="text" required autoFocus
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-background_secondary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text_secondary mb-2">رقم الهاتف</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-background_secondary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue font-numbers"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm text-text_secondary mb-2">رقم الهاتف 2</label>
                <input
                  type="text"
                  value={formData.phone2}
                  onChange={e => setFormData({...formData, phone2: e.target.value})}
                  className="w-full bg-background_secondary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue font-numbers"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-text_secondary mb-2">العنوان</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full bg-background_secondary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue"
              />
            </div>

            <div>
              <label className="block text-sm text-text_secondary mb-2">البريد الإلكتروني</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-background_secondary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue"
                dir="ltr"
              />
            </div>

            {!supplier && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text_secondary mb-2">الرصيد الافتتاحي (دين سابق للمورد إن وجد)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={formData.initial_balance}
                    onChange={e => setFormData({...formData, initial_balance: Number(e.target.value)})}
                    className="w-full bg-background_secondary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue font-numbers"
                    placeholder="0.00"
                  />
                </div>
                <div className="hidden md:block"></div>
              </div>
            )}

            <div>
              <label className="block text-sm text-text_secondary mb-2">ملاحظات</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full bg-background_secondary border border-border_default rounded-xl px-4 py-2.5 text-text_primary outline-none focus:border-primary_blue min-h-[80px]"
              />
            </div>

            {supplier && (
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  className="w-5 h-5 rounded border-border_default text-primary_blue focus:ring-primary_blue bg-background_secondary"
                />
                <label htmlFor="is_active" className="text-sm text-text_primary cursor-pointer">
                  حساب مفعل (يظهر في قوائم الشراء)
                </label>
              </div>
            )}
          </form>
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
            form="supplier-form"
            disabled={loading}
            className="flex items-center gap-2 bg-primary_blue hover:bg-primary_blue_hover text-white px-6 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50"
          >
            {loading ? <div className="w-5 h-5 border-2 border-border_default border-t-white rounded-full animate-spin" /> : <Save size={18} />}
            حفظ المورد
          </button>
        </div>
      </div>
    </div>
  );
}
