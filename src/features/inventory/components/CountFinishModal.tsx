import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Clock, Package, Loader2 } from 'lucide-react';

interface CountFinishModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    session_number: string;
    total_products: number;
    checked_count: number;
    match_count: number;
    mismatch_count: number;
  } | null;
  onConfirm: () => void;
  loading: boolean;
}

export default function CountFinishModal({ isOpen, onClose, session, onConfirm, loading }: CountFinishModalProps) {
  if (!isOpen || !session) return null;

  const checked = (session.match_count || 0) + (session.mismatch_count || 0);
  const unchecked = session.total_products - checked;
  const progressPct = session.total_products > 0
    ? Math.round((checked / session.total_products) * 100)
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background_dark/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md glass-card overflow-hidden shadow-2xl border border-border_default"
          >
            {/* Header */}
            <div className="bg-background_card p-5 flex items-center justify-between border-b border-border_default">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-success_green" />
                <h2 className="text-lg font-bold text-text_primary">مراجعة الجرد</h2>
              </div>
              <button onClick={onClose} className="p-1.5 text-text_muted hover:text-text_primary rounded-lg hover:bg-background_primary transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <p className="text-sm text-text_secondary text-center">
                تم الانتهاء من جرد <span className="font-bold text-text_primary">{session.session_number}</span>
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background_primary rounded-xl p-4 text-center border border-border_default">
                  <Package size={20} className="mx-auto mb-1 text-primary_blue" />
                  <div className="text-2xl font-bold font-numbers text-text_primary">{checked}</div>
                  <div className="text-xs text-text_muted">من أصل {session.total_products} منتج</div>
                </div>
                <div className="bg-background_primary rounded-xl p-4 text-center border border-border_default">
                  <AlertTriangle size={20} className="mx-auto mb-1 text-status_warning" />
                  <div className="text-2xl font-bold font-numbers text-status_warning">{unchecked}</div>
                  <div className="text-xs text-text_muted">غير مجرود</div>
                </div>
                <div className="bg-background_primary rounded-xl p-4 text-center border border-border_default">
                  <CheckCircle size={20} className="mx-auto mb-1 text-success_green" />
                  <div className="text-2xl font-bold font-numbers text-success_green">{session.match_count}</div>
                  <div className="text-xs text-text_muted">مطابق</div>
                </div>
                <div className="bg-background_primary rounded-xl p-4 text-center border border-border_default">
                  <AlertTriangle size={20} className="mx-auto mb-1 text-danger_red" />
                  <div className="text-2xl font-bold font-numbers text-danger_red">{session.mismatch_count}</div>
                  <div className="text-xs text-text_muted">غير مطابق</div>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between text-xs text-text_muted mb-2">
                  <span>نسبة الإنجاز</span>
                  <span className="font-numbers font-bold text-text_primary">{progressPct}%</span>
                </div>
                <div className="h-2 bg-background_primary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success_green rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Warnings — non-blocking */}
              {unchecked > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-status_warning/10 border border-status_warning/20 text-sm text-text_secondary">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-status_warning" />
                  <span>يوجد <strong className="text-status_warning">{unchecked}</strong> منتج غير مجرود. يمكنك العودة لاحقاً لإكمالها.</span>
                </div>
              )}
              {session.mismatch_count > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-text_secondary">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
                  <span>يوجد <strong className="text-amber-500">{session.mismatch_count}</strong> منتج غير مطابق. ستتم تسوية الفروقات بعد الاعتماد.</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-border_default flex items-center justify-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-background_primary border border-border_default rounded-xl text-text_secondary text-sm font-medium hover:bg-background_card transition-all"
              >
                مراجعة لاحقاً
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="px-6 py-2.5 bg-success_green hover:bg-success_green/90 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                تأكيد إنهاء الجرد
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}