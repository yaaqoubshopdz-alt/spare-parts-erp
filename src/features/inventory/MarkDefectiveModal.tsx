import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { showSuccess, showError } from '../../shared/utils/notifications';

interface MarkDefectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: { id: number; name: string; current_stock: number } | null;
}

export default function MarkDefectiveModal({ isOpen, onClose, onSuccess, product }: MarkDefectiveModalProps) {
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);

    if (!qty || qty <= 0) {
      showError('الرجاء إدخال كمية صحيحة');
      return;
    }

    if (qty > product.current_stock) {
      showError('الكمية التالفة أكبر من الكمية المتوفرة في المخزون!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await window.electronAPI.invoke('db:inventory:markDefective', {
        product_id: product.id,
        location_id: 1, // Assuming main branch for now, or you could pass it
        quantity: qty,
        notes: notes
      });

      if (res.success) {
        showSuccess('تم تسجيل المنتجات التالفة وخصمها من الأرباح بنجاح');
        setQuantity('');
        setNotes('');
        onSuccess();
        onClose();
      } else {
        showError(res.error || 'حدث خطأ أثناء تسجيل التالف');
      }
    } catch (error) {
      showError('حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-background_primary border border-border_default rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border_default bg-danger_red/10">
          <h2 className="text-xl font-bold text-danger_red flex items-center gap-2">
            <AlertTriangle size={24} />
            تسجيل منتج تالف
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 text-danger_red hover:bg-danger_red/20 transition-colors rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <p className="text-text_secondary text-sm mb-1">المنتج</p>
            <p className="text-lg font-bold text-text_primary">{product.name}</p>
            <p className="text-sm text-text_muted mt-1">
              الكمية المتوفرة: <span className="font-numbers font-bold text-primary_blue">{product.current_stock}</span>
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text_secondary mb-2">الكمية التالفة *</label>
              <input
                type="number"
                required
                min="1"
                max={product.current_stock}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-background_secondary border border-border_default rounded-xl px-4 py-3 text-text_primary outline-none focus:border-danger_red transition-colors font-numbers"
                placeholder="أدخل الكمية..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text_secondary mb-2">ملاحظات / سبب التلف</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-background_secondary border border-border_default rounded-xl px-4 py-3 text-text_primary outline-none focus:border-danger_red transition-colors"
                placeholder="مثال: كسر أثناء النقل، عيب مصنعي..."
                rows={3}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-background_secondary hover:bg-background_card text-text_primary rounded-xl transition-all border border-border_default font-medium"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-danger_red hover:bg-danger_red/90 text-white rounded-xl transition-all font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'جاري التسجيل...' : 'تأكيد التسجيل'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
