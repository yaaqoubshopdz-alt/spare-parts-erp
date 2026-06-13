import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface QtyPriceModalProps {
  isOpen: boolean;
  productName: string;
  stockAvailable: number;
  unitName: string;
  initialQty: number;
  initialPrice: number;
  onClose: () => void;
  onConfirm: (qty: number, price: number) => void;
}

export default function QtyPriceModal({
  isOpen,
  productName,
  stockAvailable,
  unitName,
  initialQty,
  initialPrice,
  onClose,
  onConfirm,
}: QtyPriceModalProps) {
  const { t } = useTranslation();
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const [qty, setQty] = useState<string>(initialQty.toString());
  const [price, setPrice] = useState<string>(initialPrice.toString());

  // Focus Qty on mount/open
  useEffect(() => {
    if (isOpen) {
      setQty(initialQty.toString());
      setPrice(initialPrice.toString());
      // Small timeout to ensure the modal animation is rendering before focus
      const timer = setTimeout(() => {
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialQty, initialPrice]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const parsedQty = parseFloat(qty);
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      qtyInputRef.current?.focus();
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      priceInputRef.current?.focus();
      return;
    }
    onConfirm(parsedQty, parsedPrice);
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="bg-background_secondary/85 backdrop-blur-2xl border border-white/15 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/30 w-full max-w-md flex flex-col overflow-hidden text-right"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-border_default shrink-0">
            <h3 className="text-lg font-bold text-text_primary flex items-center gap-2">
              <Package className="text-primary_blue" size={20} />
              <span>تحديد الكمية والسعر</span>
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-text_muted hover:text-danger_red hover:bg-white/10 dark:hover:bg-white/5 rounded-full transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col gap-4">
            <div>
              <label className="text-xs text-text_muted font-medium mb-1 block">اسم المنتج</label>
              <div className="text-base font-black text-text_primary bg-background_card/50 border border-border_default rounded-xl px-4 py-3 select-none">
                {productName}
              </div>
            </div>

            <div className="flex items-center justify-between bg-primary_blue/5 border border-primary_blue/20 rounded-xl px-4 py-3 text-sm">
              <span className="text-text_muted font-bold">المخزون المتوفر:</span>
              <span className={`font-black font-numbers ${stockAvailable <= 0 ? 'text-danger_red' : 'text-success_green'}`}>
                {stockAvailable.toFixed(3)} {unitName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Quantity */}
              <div>
                <label className="text-xs text-text_muted font-medium mb-1 block">الكمية المطلوب بيعها</label>
                <input
                  ref={qtyInputRef}
                  type="number"
                  min="0.001"
                  step="any"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  onKeyDown={handleQtyKeyDown}
                  placeholder="0.00"
                  dir="ltr"
                  className="w-full bg-background_card border-2 border-border_default rounded-xl px-4 py-3 text-lg font-black font-numbers text-text_primary focus:border-primary_blue focus:bg-primary_blue/5 transition-all outline-none text-center"
                />
              </div>

              {/* Price */}
              <div>
                <label className="text-xs text-text_muted font-medium mb-1 block">سعر الوحدة (د.ج)</label>
                <input
                  ref={priceInputRef}
                  type="number"
                  min="0"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  onKeyDown={handlePriceKeyDown}
                  placeholder="0.00"
                  dir="ltr"
                  className="w-full bg-background_card border-2 border-border_default rounded-xl px-4 py-3 text-lg font-black font-numbers text-text_primary focus:border-primary_blue focus:bg-primary_blue/5 transition-all outline-none text-center"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-background_secondary/30 border-t border-border_default flex justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border_default text-sm font-bold text-text_primary hover:bg-background_card transition-all"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-xl bg-primary_blue hover:bg-primary_blue_hover text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary_blue/20 transition-all active:scale-95"
            >
              <CheckCircle size={16} />
              <span>تأكيد الإضافة</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
