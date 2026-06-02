import { useState, useEffect } from 'react';
import { X, FileText, Calendar, Tag, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TransactionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entryId: number | null;
}

export default function TransactionDrawer({ isOpen, onClose, entryId }: TransactionDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && entryId) {
      loadEntryDetails();
    } else {
      setData(null);
    }
  }, [isOpen, entryId]);

  const loadEntryDetails = async () => {
    setLoading(true);
    const res = await window.electronAPI.invoke('accounting:getJournalEntry', entryId);
    if (res.success) setData(res.data);
    setLoading(false);
  };

  const fmt = (n: number) => (n || 0).toFixed(2);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-full md:w-[500px] bg-background_primary border-r border-border_default shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border_default shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/10 rounded-xl">
                  <FileText size={20} className="text-violet-500" />
                </div>
                <div>
                  <h2 className="font-black text-text_primary text-lg">تفاصيل القيد</h2>
                  <p className="text-sm text-text_muted font-numbers">#{data?.entry_number || '...'}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-background_secondary rounded-xl transition-colors">
                <X size={20} className="text-text_secondary" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-text_muted">
                  <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4" />
                  <p className="font-bold text-sm">جاري جلب التفاصيل...</p>
                </div>
              ) : !data ? (
                <div className="text-center text-text_muted font-bold mt-10">تعذر جلب البيانات</div>
              ) : (
                <div className="space-y-6">
                  {/* Info Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background_secondary border border-border_default p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-text_muted mb-1 text-sm">
                        <Calendar size={14} /> التاريخ
                      </div>
                      <div className="font-bold text-text_primary font-numbers">{data.date}</div>
                    </div>
                    <div className="bg-background_secondary border border-border_default p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-text_muted mb-1 text-sm">
                        <Tag size={14} /> المصدر
                      </div>
                      <div className="font-bold text-text_primary flex items-center justify-between">
                        {data.reference_type}
                        {data.reference_id && (
                          <span className="text-xs text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-md font-numbers">
                            #{data.reference_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-background_secondary border border-border_default p-4 rounded-xl">
                    <div className="text-text_muted mb-1 text-sm">البيان (وصف القيد)</div>
                    <div className="font-bold text-text_primary">{data.description}</div>
                  </div>

                  {/* Lines */}
                  <div>
                    <h3 className="font-black text-text_primary mb-3">الحركات المالية</h3>
                    <div className="bg-background_secondary border border-border_default rounded-xl overflow-hidden">
                      <table className="w-full text-sm text-right">
                        <thead>
                          <tr className="bg-background_primary border-b border-border_default text-text_secondary">
                            <th className="p-3 font-bold">الحساب</th>
                            <th className="p-3 font-bold text-center">مدين</th>
                            <th className="p-3 font-bold text-center">دائن</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border_default">
                          {data.lines.map((line: any, i: number) => (
                            <tr key={i}>
                              <td className="p-3">
                                <div className="font-bold text-text_primary">{line.account_name}</div>
                                <div className="text-xs text-text_muted font-numbers">{line.account_code}</div>
                              </td>
                              <td className="p-3 text-center font-numbers text-emerald-500 font-bold">
                                {line.debit > 0 ? fmt(line.debit) : '-'}
                              </td>
                              <td className="p-3 text-center font-numbers text-danger_red font-bold">
                                {line.credit > 0 ? fmt(line.credit) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-background_primary border-t border-border_default font-black">
                          <tr>
                            <td className="p-3 text-text_secondary">الإجمالي</td>
                            <td className="p-3 text-center font-numbers text-emerald-500">
                              {fmt(data.lines.reduce((s: number, l: any) => s + l.debit, 0))}
                            </td>
                            <td className="p-3 text-center font-numbers text-danger_red">
                              {fmt(data.lines.reduce((s: number, l: any) => s + l.credit, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                  
                  {/* Action Button (e.g., View original invoice if needed) */}
                  {data.reference_type !== 'MANUAL' && (
                    <button className="w-full py-3 bg-violet-500/10 text-violet-500 font-bold rounded-xl border border-violet-500/20 hover:bg-violet-500/20 transition-colors flex items-center justify-center gap-2">
                      <ExternalLink size={18} /> عرض المستند الأصلي
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
