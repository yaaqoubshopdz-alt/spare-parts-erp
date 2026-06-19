/**
 * RecordPaymentModal — نافذة تسديد دفعة منفصلة (مستقلة عن كشف الحساب)
 */
import { useState } from 'react';
import { X, Coins } from 'lucide-react';
import { showSuccess, showError } from '../../../shared/utils/notifications';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyId: number;
  partyType: 'customer' | 'supplier';
  partyName: string;
  onSuccess?: () => void;
}

export default function RecordPaymentModal({
  isOpen, onClose, partyId, partyType, partyName, onSuccess,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [isRecovery, setIsRecovery] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const channel = partyType === 'customer' ? 'db:customers:addPayment' : 'db:suppliers:addPayment';
  const paramKey = partyType === 'customer' ? 'customer_id' : 'supplier_id';
  const isSupplier = partyType === 'supplier';
  const btnColor = isSupplier ? 'bg-warning_amber hover:bg-warning_amber/90' : 'bg-success_green hover:bg-success_green/90';

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      showError('الرجاء إدخال مبلغ صحيح');
      return;
    }
    setSaving(true);
    try {
      const res = await window.electronAPI.invoke(channel, {
        [paramKey]: partyId,
        amount: Number(amount),
        payment_method: method,
        notes: notes || (isRecovery ? `استرداد دين مشطوب من ${partyName}` : `دفعة من ${partyName}`),
        ...(partyType === 'customer' ? { isRecovery } : {}),
      });
      if (res.success) {
        showSuccess('تم تسجيل الدفعة بنجاح');
        setAmount('');
        setNotes('');
        setIsRecovery(false);
        onSuccess?.();
        onClose();
      } else {
        showError(res.error || 'خطأ في تسجيل الدفعة');
      }
    } catch {
      showError('خطأ في الاتصال بقاعدة البيانات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-background_primary border border-border_default rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border_default bg-background_secondary">
          <h2 className="text-lg font-bold text-text_primary flex items-center gap-2">
            <Coins size={20} className={isSupplier ? 'text-warning_amber' : 'text-success_green'} />
            تسديد دفعة
          </h2>
          <button onClick={onClose} className="p-1.5 text-text_muted hover:text-danger_red transition-colors rounded-lg hover:bg-danger_red/10">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Party Name */}
          <div className="bg-background_card rounded-xl px-4 py-3 border border-border_default">
            <span className="text-xs text-text_muted block mb-0.5">{isSupplier ? 'المورد' : 'الزبون'}</span>
            <span className="text-base font-bold text-text_primary">{partyName}</span>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm text-text_secondary mb-1.5">المبلغ (د.ج)</label>
            <input
              type="number"
              step="0.001"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-background_secondary border border-border_default rounded-xl px-4 py-3 text-text_primary font-numbers font-bold text-lg outline-none focus:border-primary_blue focus:ring-2 focus:ring-primary_blue/20 transition-all"
              placeholder="0.00"
              autoFocus
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm text-text_secondary mb-1.5">طريقة الدفع</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full bg-background_secondary border border-border_default rounded-xl px-4 py-3 text-text_primary outline-none focus:border-primary_blue focus:ring-2 focus:ring-primary_blue/20 transition-all"
            >
              <option value="cash">نقداً (Cash)</option>
              <option value="transfer">تحويل بنكي</option>
              <option value="check">شيك</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-text_secondary mb-1.5">ملاحظات (اختياري)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-background_secondary border border-border_default rounded-xl px-4 py-3 text-text_primary outline-none focus:border-primary_blue focus:ring-2 focus:ring-primary_blue/20 transition-all"
              placeholder="سبب الدفع..."
            />
          </div>

          {/* Recovery Checkbox (only for customer) */}
          {partyType === 'customer' && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isRecovery"
                checked={isRecovery}
                onChange={e => setIsRecovery(e.target.checked)}
                className="w-4 h-4 text-success_green bg-background_secondary border-border_default rounded focus:ring-success_green/20"
              />
              <label htmlFor="isRecovery" className="text-xs text-text_secondary font-bold cursor-pointer select-none">
                تحصيل كإيراد ديون مشطوبة سابقة (خسائر مستردة)
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-border_default bg-background_secondary">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-background_card hover:bg-background_card_hover text-text_primary rounded-xl transition-all border border-border_default font-medium"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={`px-6 py-2.5 text-white rounded-xl transition-all font-medium flex items-center gap-2 shadow-lg ${btnColor} ${saving ? 'opacity-70 cursor-wait' : ''}`}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Coins size={16} />
                تأكيد الدفع
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}