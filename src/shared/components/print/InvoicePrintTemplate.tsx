import React from 'react';

interface Props {
  invoice: any;
  settings: any;
}

export const InvoicePrintTemplate = React.forwardRef<HTMLDivElement, Props>(({ invoice, settings }, ref) => {
  if (!invoice) return null;

  return (
    <div ref={ref} className="p-8 text-black bg-white w-[210mm] min-h-[297mm] font-sans" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900">{settings?.companyName || 'مؤسسة فاروق التجارية'}</h1>
          <p className="text-sm mt-1">{settings?.address || 'الجزائر، الجزائر العاصمة'}</p>
          <p className="text-sm">{settings?.phone || '0555 00 00 00'}</p>
        </div>
        <div className="text-left" dir="ltr">
          <div className="bg-gray-900 text-white px-4 py-1 font-bold text-xl mb-2">INVOICE</div>
          <p className="text-sm font-bold"># {invoice.invoice_number}</p>
          <p className="text-sm">{invoice.date}</p>
        </div>
      </div>

      {/* Bill To */}
      <div className="grid grid-cols-2 gap-8 mb-10">
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">فاتورة إلى:</h3>
          <p className="text-lg font-bold">{invoice.customer_name || 'زبون نقدي'}</p>
          {invoice.customer_phone && <p className="text-sm">{invoice.customer_phone}</p>}
        </div>
        <div className="text-left" dir="rtl">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">معلومات الدفع:</h3>
          <p className="text-sm">طريقة الدفع: <span className="font-bold">{invoice.payment_method === 'cash' ? 'نقداً' : 'تحويل بنكي'}</span></p>
          <p className="text-sm">الحالة: <span className="font-bold uppercase">{invoice.paid >= invoice.total ? 'مدفوع' : invoice.paid > 0 ? 'دفع جزئي' : 'غير مدفوع'}</span></p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-10">
        <thead>
          <tr className="bg-gray-100 text-gray-700 text-sm font-bold border-y border-gray-300">
            <th className="py-3 px-4 text-right">المنتج</th>
            <th className="py-3 px-4 text-center">الكمية</th>
            <th className="py-3 px-4 text-center">سعر الوحدة</th>
            <th className="py-3 px-4 text-left">المجموع</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {invoice.items?.map((item: any, i: number) => (
            <tr key={i} className="text-sm">
              <td className="py-4 px-4 font-bold">{item.product_name_snapshot}</td>
              <td className="py-4 px-4 text-center">{item.quantity} {item.unit}</td>
              <td className="py-4 px-4 text-center">{item.unit_price.toFixed(2)}</td>
              <td className="py-4 px-4 text-left font-bold">{item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span>المجموع الفرعي:</span>
            <span>{invoice.subtotal.toFixed(2)} د.ج</span>
          </div>
          {invoice.tax_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span>الضريبة ({invoice.tax_percent}%):</span>
              <span>{invoice.tax_amount.toFixed(2)} د.ج</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-black border-t-2 border-gray-900 pt-2">
            <span>الإجمالي:</span>
            <span>{invoice.total.toFixed(2)} د.ج</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>المدفوع:</span>
            <span>{invoice.paid.toFixed(2)} د.ج</span>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span>المتبقي:</span>
            <span>{invoice.remaining.toFixed(2)} د.ج</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-20 border-t border-gray-200 pt-6 text-center text-xs text-gray-500">
        <p>شكراً لتعاملكم معنا. البضاعة المباعة لا ترد ولا تستبدل بعد 24 ساعة.</p>
        <p className="mt-2 font-mono" dir="ltr">Powered by Farouk ERP • v1.0.0</p>
      </div>
    </div>
  );
});
