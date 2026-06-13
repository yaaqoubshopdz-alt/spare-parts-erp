/**
 * CustomerStatement — كشف حساب الزبون (Modal)
 * Table styling matches CustomersPage main table (gradient header, vertical dividers)
 */
import { useState, useEffect, useRef } from 'react';
import { X, FileText, Printer, Edit, Trash2, ExternalLink, Save } from 'lucide-react';
import { showSuccess, showError } from '../../shared/utils/notifications';
import { useNavigate } from 'react-router-dom';
import { useSmoothScroll } from '../../shared/hooks/useSmoothScroll';

interface CustomerStatementProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: number | null;
}

export default function CustomerStatement({ isOpen, onClose, customerId }: CustomerStatementProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Drag-to-scroll on the transaction table
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  useSmoothScroll<HTMLDivElement>({ direction: 'vertical' }, tableScrollRef);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Edit Payment State
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (isOpen && customerId) {
      loadStatement();
    } else {
      setCustomer(null);
      setTransactions([]);
      setEditingPaymentId(null);
    }
  }, [isOpen, customerId, dateFrom, dateTo]);

  const loadStatement = async () => {
    setLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:customers:getStatement', customerId, dateFrom || undefined, dateTo || undefined);
      if (res.success) {
        setCustomer(res.data.customer);
        setTransactions(res.data.transactions);
      } else {
        showError(res.error || 'خطأ في جلب كشف الحساب');
      }
    } catch {
      showError('خطأ في الاتصال بقاعدة البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPayment = (t: any) => {
    setEditingPaymentId(t.reference_id);
    setEditAmount(String(t.debit > 0 ? t.debit : t.credit));
  };

  const handleCancelEdit = () => {
    setEditingPaymentId(null);
    setEditAmount('');
  };

  const handleSavePayment = async (paymentId: number) => {
    if (!editAmount || isNaN(Number(editAmount)) || Number(editAmount) <= 0) {
      showError('الرجاء إدخال مبلغ صحيح');
      return;
    }
    setEditSaving(true);
    try {
      const res = await window.electronAPI.invoke('db:payments:update', {
        id: paymentId,
        amount: Number(editAmount),
      });
      if (res.success) {
        showSuccess('تم تحديث الدفعة بنجاح');
        setEditingPaymentId(null);
        setEditAmount('');
        loadStatement();
      } else {
        showError(res.error || 'خطأ في تحديث الدفعة');
      }
    } catch {
      showError('خطأ في تحديث الدفعة');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟')) return;
    try {
      const res = await window.electronAPI.invoke('db:payments:delete', paymentId);
      if (res.success) {
        showSuccess('تم حذف الدفعة بنجاح');
        loadStatement();
      } else {
        showError(res.error || 'خطأ في حذف الدفعة');
      }
    } catch {
      showError('خطأ في حذف الدفعة');
    }
  };

  const navigateToInvoice = (t: any) => {
    if (t.reference_type === 'sales_invoice' && t.reference_id) {
      navigate(`/pos?invoiceId=${t.reference_id}`);
    }
  };

  const isPaymentRow = (t: any) => t.reference_type === 'payment';

  const calculateRunningBalance = () => {
    let runningBalance = 0;
    return transactions.map(t => {
      runningBalance += (t.debit || 0) - (t.credit || 0);
      return { ...t, runningBalance };
    });
  };

  const formattedTransactions = calculateRunningBalance();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background_primary border border-border_default rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border_default bg-background_secondary">
          <div>
            <h2 className="text-xl font-bold text-text_primary flex items-center gap-2">
              <FileText size={22} className="text-primary_blue" />
              كشف حساب زبون
            </h2>
            {customer && (
              <p className="text-sm text-text_secondary mt-1">
                {customer.name} | {customer.code} | هاتف: {customer.phone || '-'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-background_card hover:bg-background_card_hover text-text_primary rounded-xl transition-all border border-border_default">
              <Printer size={16} /> طباعة
            </button>
            <button onClick={onClose} className="p-2 text-text_muted hover:text-danger_red transition-colors rounded-xl hover:bg-danger_red/10 ml-2">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filters + Balance */}
        <div className="p-4 border-b border-border_default flex items-center gap-4 bg-background_primary">
          <div className="flex items-center gap-2">
            <label className="text-sm text-text_secondary">من:</label>
            <input 
              type="date" 
              value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="bg-background_secondary border border-border_default rounded-lg px-3 py-1.5 text-sm text-text_primary outline-none focus:border-primary_blue"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-text_secondary">إلى:</label>
            <input 
              type="date" 
              value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="bg-background_secondary border border-border_default rounded-lg px-3 py-1.5 text-sm text-text_primary outline-none focus:border-primary_blue"
            />
          </div>
          <div className="mr-auto">
            <span className="text-sm text-text_secondary ml-2">الرصيد المتبقي عليه (الديون):</span>
            <span className={`font-bold font-numbers text-xl ${customer?.balance > 0 ? 'text-danger_red' : 'text-success_green'}`}>
              {customer?.balance?.toFixed(2) || '0.00'} د.ج
            </span>
          </div>
        </div>

        {/* Table — styled like main CustomersPage table */}
        <div ref={tableScrollRef} className="flex-1 overflow-auto custom-scrollbar bg-background_primary">
          <table className="w-full text-sm text-right border-collapse">
            <thead className="sticky top-0 z-30 bg-gradient-to-b from-table_header_from to-table_header_to border-b border-black/30 dark:border-border_default shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <tr className="h-[52px]">
                <th className="px-4 py-3 font-bold text-[13px] text-text_primary tracking-wide border-l border-black/30 dark:border-border_default">التاريخ</th>
                <th className="px-4 py-3 font-bold text-[13px] text-text_primary tracking-wide border-l border-black/30 dark:border-border_default">رقم الفاتورة</th>
                <th className="px-4 py-3 font-bold text-[13px] text-text_primary tracking-wide border-l border-black/30 dark:border-border_default text-center">مدين (عليه)</th>
                <th className="px-4 py-3 font-bold text-[13px] text-text_primary tracking-wide border-l border-black/30 dark:border-border_default text-center">دائن (له)</th>
                <th className="px-4 py-3 font-bold text-[13px] text-text_primary tracking-wide border-l border-black/30 dark:border-border_default text-center">الرصيد التراكمي</th>
                <th className="px-4 py-3 font-bold text-[13px] text-text_primary tracking-wide text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border_default">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text_muted">جاري التحميل...</td></tr>
              ) : formattedTransactions.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text_muted">لا توجد حركات مالية في هذه الفترة</td></tr>
              ) : (
                formattedTransactions.map((t, idx) => (
                  <tr key={idx} className="hover:bg-background_card transition-colors group h-11">
                    <td className="px-4 py-2 font-numbers text-text_secondary border-l border-border_default">{new Date(t.date).toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-2 font-numbers text-primary_blue font-bold border-l border-border_default">
                      {isPaymentRow(t) ? (
                        editingPaymentId === t.reference_id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editAmount}
                              onChange={e => setEditAmount(e.target.value)}
                              className="w-24 bg-background_secondary border border-border_default rounded px-2 py-1 text-sm text-text_primary font-numbers outline-none focus:border-primary_blue"
                              autoFocus
                            />
                            <button onClick={() => handleSavePayment(t.reference_id)} disabled={editSaving} className="p-1 text-success_green hover:bg-success_green/10 rounded" title="حفظ"><Save size={14} /></button>
                            <button onClick={handleCancelEdit} className="p-1 text-danger_red hover:bg-danger_red/10 rounded" title="إلغاء"><X size={14} /></button>
                          </div>
                        ) : (
                          <span className="text-success_green font-medium text-sm">دفعة نقدية</span>
                        )
                      ) : (
                        <button
                          onClick={() => navigateToInvoice(t)}
                          className="hover:text-primary_blue_hover hover:underline inline-flex items-center gap-1 transition-colors"
                          title="عرض الفاتورة"
                        >
                          {t.entry_number}
                          <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2 font-numbers text-center text-danger_red font-medium border-l border-border_default">
                      {t.debit > 0 ? t.debit.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-2 font-numbers text-center text-success_green font-medium border-l border-border_default">
                      {t.credit > 0 ? t.credit.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-2 font-numbers text-center font-bold text-text_primary border-l border-border_default">
                      {t.runningBalance.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {isPaymentRow(t) && editingPaymentId !== t.reference_id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEditPayment(t)} className="p-1.5 text-text_muted hover:text-warning_amber rounded-lg hover:bg-warning_amber/10" title="تعديل الدفعة"><Edit size={14} /></button>
                          <button onClick={() => handleDeletePayment(t.reference_id)} className="p-1.5 text-text_muted hover:text-danger_red rounded-lg hover:bg-danger_red/10" title="حذف الدفعة"><Trash2 size={14} /></button>
                        </div>
                      ) : !isPaymentRow(t) ? (
                        <button onClick={() => navigateToInvoice(t)} className="p-1.5 text-text_muted hover:text-primary_blue rounded-lg hover:bg-primary_blue/10" title="عرض الفاتورة"><ExternalLink size={14} /></button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}