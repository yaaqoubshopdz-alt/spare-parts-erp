import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, CheckCircle, AlertTriangle, ArrowUp, ArrowDown, Target } from 'lucide-react';

interface CountItem {
  id: number;
  system_qty_at_start: number;
  expected_qty: number;
  counted_qty: number | null;
  final_difference: number | null;
  status: string;
  purchase_price?: number;
}

interface CountSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    session_number: string;
    total_products: number;
    checked_count: number;
    match_count: number;
    mismatch_count: number;
    status: string;
  } | null;
  items: CountItem[];
}

export default function CountSummaryModal({ isOpen, onClose, session, items }: CountSummaryModalProps) {
  const stats = useMemo(() => {
    const checked = items.filter(i => i.status !== 'unchecked');
    const mismatches = items.filter(i => i.status === 'mismatch');
    const totalLoss = mismatches.reduce((sum, i) => {
      const diff = i.final_difference ?? 0;
      return diff < 0 ? sum + Math.abs(diff) : sum;
    }, 0);
    const totalGain = mismatches.reduce((sum, i) => {
      const diff = i.final_difference ?? 0;
      return diff > 0 ? sum + diff : sum;
    }, 0);
    const netDiff = totalGain - totalLoss;

    const totalLossValue = mismatches.reduce((sum, i) => {
      const diff = i.final_difference ?? 0;
      const price = i.purchase_price ?? 0;
      return diff < 0 ? sum + (Math.abs(diff) * price) : sum;
    }, 0);
    const totalGainValue = mismatches.reduce((sum, i) => {
      const diff = i.final_difference ?? 0;
      const price = i.purchase_price ?? 0;
      return diff > 0 ? sum + (diff * price) : sum;
    }, 0);
    const netValueDiff = totalGainValue - totalLossValue;

    return { 
      checked: checked.length, 
      mismatches: mismatches.length, 
      totalLoss, 
      totalGain, 
      netDiff,
      totalLossValue,
      totalGainValue,
      netValueDiff
    };
  }, [items]);

  if (!isOpen || !session) return null;

  const checkedCount = (session.match_count || 0) + (session.mismatch_count || 0);
  const progressPct = session.total_products > 0
    ? Math.round((checkedCount / session.total_products) * 100)
    : 0;

  const statusLabel = (status: string) => {
    switch (status) {
      case 'counting': return 'جاري العد';
      case 'reviewing': return 'قيد المراجعة';
      case 'approved': return 'معتمد';
      default: return status;
    }
  };

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
            className="relative w-full max-w-lg glass-card overflow-hidden shadow-2xl border border-border_default"
          >
            {/* Header */}
            <div className="bg-background_card p-5 flex items-center justify-between border-b border-border_default">
              <div className="flex items-center gap-2">
                <Target size={20} className="text-primary_blue" />
                <h2 className="text-lg font-bold text-text_primary">ملخص الجرد</h2>
              </div>
              <button onClick={onClose} className="p-1.5 text-text_muted hover:text-text_primary rounded-lg hover:bg-background_primary transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Session info */}
              <div className="text-center">
                <div className="text-xl font-bold font-numbers text-text_primary">{session.session_number}</div>
                <div className="text-xs text-text_muted mt-1">{statusLabel(session.status)}</div>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background_primary rounded-xl p-4 text-center border border-border_default">
                  <Package size={18} className="mx-auto mb-1 text-primary_blue" />
                  <div className="text-xl font-bold font-numbers text-text_primary">{checkedCount}</div>
                  <div className="text-[11px] text-text_muted">مجرود / {session.total_products}</div>
                </div>
                <div className="bg-background_primary rounded-xl p-4 text-center border border-border_default">
                  <AlertTriangle size={18} className="mx-auto mb-1 text-status_warning" />
                  <div className="text-xl font-bold font-numbers text-status_warning">{stats.mismatches}</div>
                  <div className="text-[11px] text-text_muted">غير مطابق</div>
                </div>
                <div className="bg-background_primary rounded-xl p-4 text-center border border-border_default flex flex-col justify-between">
                  <div>
                    <ArrowDown size={18} className="mx-auto mb-1 text-danger_red" />
                    <div className="text-lg font-bold font-numbers text-danger_red">{stats.totalLossValue.toFixed(2)} د.ج</div>
                    <div className="text-[10px] text-text_muted font-numbers mt-0.5">({stats.totalLoss.toFixed(2)} قطعة)</div>
                  </div>
                  <div className="text-[11px] text-text_muted mt-1.5">إجمالي الخسائر</div>
                </div>
                <div className="bg-background_primary rounded-xl p-4 text-center border border-border_default flex flex-col justify-between">
                  <div>
                    <ArrowUp size={18} className="mx-auto mb-1 text-success_green" />
                    <div className="text-lg font-bold font-numbers text-success_green">{stats.totalGainValue.toFixed(2)} د.ج</div>
                    <div className="text-[10px] text-text_muted font-numbers mt-0.5">({stats.totalGain.toFixed(2)} قطعة)</div>
                  </div>
                  <div className="text-[11px] text-text_muted mt-1.5">إجمالي الزيادات</div>
                </div>
              </div>

              {/* Net difference */}
              <div className={`rounded-xl p-4 text-center border ${
                stats.netValueDiff === 0 ? 'bg-background_primary border-border_default' :
                stats.netValueDiff > 0 ? 'bg-success_green/10 border-success_green/20' :
                'bg-danger_red/10 border-danger_red/20'
              }`}>
                <div className="text-xs text-text_muted mb-1">صافي الفرق المالي</div>
                <div className={`text-2xl font-bold font-numbers ${
                  stats.netValueDiff === 0 ? 'text-text_primary' :
                  stats.netValueDiff > 0 ? 'text-success_green' : 'text-danger_red'
                }`}>
                  {stats.netValueDiff > 0 ? '+' : ''}{stats.netValueDiff.toFixed(2)} د.ج
                </div>
                <div className="text-[11px] text-text_muted font-numbers mt-1">
                  صافي فرق الكميات: {stats.netDiff > 0 ? '+' : ''}{stats.netDiff.toFixed(2)} قطعة
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
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border_default flex justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-background_primary border border-border_default rounded-xl text-text_secondary text-sm font-medium hover:bg-background_card transition-all"
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}