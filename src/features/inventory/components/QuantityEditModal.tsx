import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';

interface QuantityEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemId: number, countedQty: number | null, notes: string) => void;
  item: {
    id: number;
    product_name_snapshot: string;
    system_qty_at_start: number;
    expected_qty: number;
    counted_qty: number | null;
    notes: string | null;
  } | null;
  saving: boolean;
}

export default function QuantityEditModal({ isOpen, onClose, onSave, item, saving }: QuantityEditModalProps) {
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && item) {
      setQty(item.counted_qty !== null ? String(item.counted_qty) : '');
      setNotes(item.notes || '');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 150);
    }
  }, [isOpen, item?.id]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    const numVal = qty === '' ? null : parseFloat(qty);
    if (numVal !== null && isNaN(numVal)) return;
    onSave(item.id, numVal, notes);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-background_dark/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-sm glass-card overflow-hidden shadow-2xl border border-border_default"
      >
        <div className="bg-background_card p-5 flex items-center justify-between border-b border-border_default">
          <h2 className="text-base font-bold text-text_primary">تعديل الكمية</h2>
          <button onClick={onClose} className="p-1.5 text-text_muted hover:text-text_primary rounded-lg hover:bg-background_primary transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-sm text-text_secondary text-center font-medium">{item.product_name_snapshot}</div>

          <div className="grid grid-cols-2 gap-3 text-xs text-text_muted">
            <div className="bg-background_primary rounded-lg p-3 text-center border border-border_default">
              <div className="font-numbers font-bold text-text_primary text-lg">{item.system_qty_at_start}</div>
              <div>الكمية عند البدء</div>
            </div>
            <div className="bg-background_primary rounded-lg p-3 text-center border border-border_default">
              <div className="font-numbers font-bold text-text_primary text-lg">{item.expected_qty}</div>
              <div>المخزون الآني</div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-text_muted mb-1">الكمية الفعلية</label>
            <input
              ref={inputRef}
              type="number"
              step="0.001"
              value={qty}
              onChange={e => setQty(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-background_primary border-2 border-border_default rounded-lg px-4 py-2.5 text-lg font-numbers font-bold text-text_primary outline-none focus:border-success_green transition-all"
              placeholder="0"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-text_muted mb-1">ملاحظة (اختياري)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-background_primary border-2 border-border_default rounded-lg px-4 py-2 text-sm text-text_primary outline-none focus:border-success_green transition-all resize-none"
              placeholder="..."
            />
          </div>
        </div>

        <div className="p-4 border-t border-border_default flex items-center justify-center gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-background_primary border border-border_default rounded-xl text-text_secondary text-sm font-medium hover:bg-background_card transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-success_green hover:bg-success_green/90 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? 'جاري الحفظ...' : <><Save size={16} /> حفظ</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
