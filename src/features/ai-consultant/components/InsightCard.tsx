/**
 * InsightCard — بطاقة توصية المستشار الذكي
 * تدعم ثلاثة أنواع: critical (حرج) | warning (تحذير) | opportunity (فرصة)
 */
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, AlertCircle, ArrowLeft } from 'lucide-react';

export interface Recommendation {
  id: string;
  type: 'critical' | 'warning' | 'opportunity';
  category: 'debts' | 'inventory' | 'cash_flow' | 'customers' | 'suppliers' | 'expenses' | 'pricing';
  title: string;
  conclusion: string;
  recommendation: string;
  urgency: 'immediate' | 'this_week' | 'this_month';
  action_route?: string;
}

const TYPE_CONFIG = {
  critical: {
    icon: AlertCircle,
    label: 'حرج',
    dot: 'bg-danger_red',
    badge: 'bg-danger_red/10 text-danger_red border-danger_red/30',
    border: 'border-r-4 border-r-danger_red border-l border-y border-danger_red/20 dark:border-danger_red/30',
    card: 'bg-gradient-to-br from-danger_red/5 to-rose-500/10 dark:from-danger_red/10 dark:to-rose-500/20',
    iconColor: 'text-danger_red',
  },
  warning: {
    icon: AlertTriangle,
    label: 'تحذير',
    dot: 'bg-amber-500',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    border: 'border-r-4 border-r-amber-500 border-l border-y border-amber-500/20 dark:border-amber-500/30',
    card: 'bg-gradient-to-br from-amber-500/5 to-orange-500/10 dark:from-amber-500/10 dark:to-orange-500/20',
    iconColor: 'text-amber-500',
  },
  opportunity: {
    icon: TrendingUp,
    label: 'فرصة',
    dot: 'bg-success_green',
    badge: 'bg-success_green/10 text-success_green border-success_green/30',
    border: 'border-r-4 border-r-success_green border-l border-y border-success_green/20 dark:border-success_green/30',
    card: 'bg-gradient-to-br from-success_green/5 to-teal-500/10 dark:from-success_green/10 dark:to-teal-500/20',
    iconColor: 'text-success_green',
  },
};

const URGENCY_LABELS = {
  immediate: 'عاجل الآن',
  this_week: 'هذا الأسبوع',
  this_month: 'هذا الشهر',
};

const CATEGORY_LABELS: Record<string, string> = {
  debts: 'الديون',
  inventory: 'المخزون',
  cash_flow: 'السيولة',
  customers: 'العملاء',
  suppliers: 'الموردون',
  expenses: 'المصاريف',
  pricing: 'التسعير',
};

interface Props {
  rec: Recommendation;
  compact?: boolean;  // للعرض في Dashboard Widget
}

export default function InsightCard({ rec, compact = false }: Props) {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[rec.type];
  const Icon = cfg.icon;

  if (compact) {
    return (
      <div className={`flex items-start gap-3 p-3 rounded-xl ${cfg.card} ${cfg.border} border border-border_default/30`}>
        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-text_primary truncate">{rec.title}</p>
          <p className="text-xs text-text_secondary font-bold mt-0.5 line-clamp-1">{rec.conclusion}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border border-border_default/20 ${cfg.card} ${cfg.border} overflow-hidden transition-all hover:shadow-lg w-full`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.badge} border shadow-sm`}>
            <Icon size={20} />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-black text-text_primary">{rec.title}</h3>
            <div className="flex items-center gap-2.5 mt-1">
              <span className={`text-[10px] md:text-xs font-black px-2.5 py-0.5 rounded-full border ${cfg.badge}`}>
                {cfg.label}
              </span>
              <span className="text-[10px] md:text-xs text-text_secondary font-extrabold">
                {CATEGORY_LABELS[rec.category] || rec.category}
              </span>
              <span className="text-[10px] md:text-xs text-text_secondary font-extrabold opacity-60">
                • {URGENCY_LABELS[rec.urgency]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6 space-y-4">
        {/* Conclusion */}
        <div className="bg-background_primary/60 rounded-2xl p-4 md:p-5 border border-border_default/5">
          <p className="text-[10px] md:text-xs font-black text-text_secondary uppercase tracking-wider mb-1.5">الاستنتاج</p>
          <p className="text-base md:text-lg font-bold text-text_primary leading-relaxed">{rec.conclusion}</p>
        </div>

        {/* Recommendation */}
        <div className="bg-background_primary/40 rounded-2xl p-4 md:p-5 border border-border_default/5">
          <p className="text-[10px] md:text-xs font-black text-text_secondary uppercase tracking-wider mb-1.5">التوصية</p>
          <p className="text-base md:text-lg text-text_primary leading-relaxed font-medium">{rec.recommendation}</p>
        </div>

        {/* Action Button */}
        {rec.action_route && (
          <button
            onClick={() => navigate(rec.action_route!)}
            className={`w-full flex items-center justify-between px-5 py-3 rounded-2xl text-sm md:text-base font-black border transition-all hover:opacity-90 active:scale-[0.99] cursor-pointer ${cfg.badge}`}
          >
            <span>اذهب إلى الصفحة المناسبة</span>
            <ArrowLeft size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
