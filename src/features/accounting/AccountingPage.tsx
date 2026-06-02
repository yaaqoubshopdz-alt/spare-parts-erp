import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Scale, Clock, Wallet, TrendingUp 
} from 'lucide-react';
import { FinancialPinGate } from '../../shared/components/ui/FinancialPinGate';

// Import Components
import CashFlowStatement from './components/CashFlowStatement';
import AgingReport from './components/AgingReport';
import SimpleReports from './components/SimpleReports';
import NetCapital from './components/NetCapital';
import ProductProfit from './components/ProductProfit';

export type AccountingTabId = 'overview' | 'cash_flow' | 'aging' | 'capital' | 'product_profit';

const TABS: { id: AccountingTabId; label: string; icon: any; color: string }[] = [
  { id: 'overview', label: 'لوحة التحكم المالية', icon: LayoutDashboard, color: 'text-violet-500' },
  { id: 'cash_flow', label: 'حركة الصندوق والسيولة', icon: Wallet, color: 'text-rose-500' },
  { id: 'product_profit', label: 'ربحية المنتجات', icon: TrendingUp, color: 'text-emerald-500' },
  { id: 'aging', label: 'الكريدي وأعمار الديون', icon: Clock, color: 'text-amber-500' },
  { id: 'capital', label: 'رأس المال الفعلي', icon: Scale, color: 'text-teal-500' },
];

export default function AccountingPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<AccountingTabId>('overview');

  if (!isUnlocked) {
    return (
      <div className="p-4 md:p-6 h-full overflow-y-auto custom-scrollbar bg-background_primary relative flex items-center justify-center">
        <FinancialPinGate 
          onSuccess={() => setIsUnlocked(true)} 
          title="بوابة الأمان المالي مقفلة" 
          description="يرجى إدخال رمز الـ PIN الخاص بك للولوج للبيانات المحاسبية والتقارير والأرباح."
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-hidden bg-background_primary font-arabic selection:bg-violet-500/20" dir="rtl">
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col h-full"
      >
        {/* Workspace Tabs Navigation (Lifted to very top) */}
        <div className="flex gap-2 mb-6 overflow-x-auto custom-scrollbar shrink-0 pb-2 border-b border-border_default/40">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all whitespace-nowrap relative overflow-hidden group border
                  ${isActive 
                    ? 'text-white border-transparent shadow-md shadow-violet-500/15' 
                    : 'text-text_secondary bg-background_secondary hover:bg-background_card_hover border-border_default/60 hover:border-border_default'
                  }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTabIndicator" 
                    className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <tab.icon 
                  size={16} 
                  className={`relative z-10 transition-transform ${isActive ? 'scale-110' : `group-hover:scale-110 ${tab.color}`}`} 
                /> 
                <span className="relative z-10">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Workspace Content Area */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.99 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="h-full overflow-y-auto custom-scrollbar absolute inset-0"
            >
              {activeTab === 'overview' && <SimpleReports />}
              {activeTab === 'cash_flow' && <CashFlowStatement />}
              {activeTab === 'product_profit' && <ProductProfit />}
              {activeTab === 'aging' && <AgingReport />}
              {activeTab === 'capital' && <NetCapital />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
