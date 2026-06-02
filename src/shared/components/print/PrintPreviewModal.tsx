import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Printer, Download, Eye, EyeOff, Star, RotateCcw } from 'lucide-react';
import { PrintTemplateRenderer, PrintConfig, PaperSize, TemplateType, DEFAULT_CONFIGS, generateInvoiceHTML, COLUMN_LABELS } from './PrintTemplateRenderer';
import { toast } from 'sonner';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'sales' | 'purchases';
  invoiceData: {
    invoice_number: string;
    date: string;
    time?: string;
    customer_name: string;
    customer_phone?: string;
    customer_vehicle?: string;
    vehicle_info?: string;
    items: any[];
    subtotal: number;
    tax_amount: number;
    tax_percent: number;
    total: number;
    paid: number;
    remaining: number;
    notes?: string;
    payment_method?: string;
  };
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  documentType,
  invoiceData
}) => {
  const [settings, setSettings] = useState<any>(null);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [templateType, setTemplateType] = useState<TemplateType>('receipt');
  const [activeConfig, setActiveConfig] = useState<PrintConfig>(DEFAULT_CONFIGS.receipt.config);
  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_CONFIGS.receipt.columns);

  // Floating header context menu state
  const [headerMenu, setHeaderMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    colId: string;
  } | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Load shop settings from SQLite
  useEffect(() => {
    if (isOpen) {
      window.electronAPI.invoke('db:settings:getAll').then((res: any) => {
        if (res?.success) setSettings(res.data);
      });
      loadSavedLayout();
    }
  }, [isOpen]);

  // Load layout configurations from LocalStorage
  const loadSavedLayout = () => {
    try {
      const savedTemplate = localStorage.getItem(`print_preview_template_${documentType}`) as TemplateType;
      const savedSize = localStorage.getItem(`print_preview_size_${documentType}`) as PaperSize;
      
      const currentTpl = savedTemplate || (documentType === 'sales' ? 'receipt' : 'customer');
      const currentSize = savedSize || DEFAULT_CONFIGS[currentTpl].size;

      setTemplateType(currentTpl);
      setPaperSize(currentSize);

      const savedConfigStr = localStorage.getItem(`print_preview_config_${documentType}_${currentTpl}`);
      const savedColsStr = localStorage.getItem(`print_preview_columns_${documentType}_${currentTpl}`);

      if (savedConfigStr) {
        setActiveConfig(JSON.parse(savedConfigStr));
      } else {
        setActiveConfig(DEFAULT_CONFIGS[currentTpl].config);
      }

      if (savedColsStr) {
        setColumnOrder(JSON.parse(savedColsStr));
      } else {
        setColumnOrder(DEFAULT_CONFIGS[currentTpl].columns);
      }
    } catch (e) {
      console.error('Failed to load saved print layout settings:', e);
      setTemplateType('receipt');
      setPaperSize('80mm');
      setActiveConfig(DEFAULT_CONFIGS.receipt.config);
      setColumnOrder(DEFAULT_CONFIGS.receipt.columns);
    }
  };

  // Switch Active Template (Receipt, Customer, Tax, Custom)
  const handleTemplateChange = (tpl: TemplateType) => {
    setTemplateType(tpl);
    setPaperSize(DEFAULT_CONFIGS[tpl].size);

    const savedConfigStr = localStorage.getItem(`print_preview_config_${documentType}_${tpl}`);
    const savedColsStr = localStorage.getItem(`print_preview_columns_${documentType}_${tpl}`);

    if (savedConfigStr) {
      setActiveConfig(JSON.parse(savedConfigStr));
    } else {
      setActiveConfig(DEFAULT_CONFIGS[tpl].config);
    }

    if (savedColsStr) {
      setColumnOrder(JSON.parse(savedColsStr));
    } else {
      setColumnOrder(DEFAULT_CONFIGS[tpl].columns);
    }

    localStorage.setItem(`print_preview_template_${documentType}`, tpl);
    localStorage.setItem(`print_preview_size_${documentType}`, DEFAULT_CONFIGS[tpl].size);
  };

  // Apply customizations dynamically (converts automatically to 'custom' template)
  const updateConfig = (key: keyof PrintConfig, val: any) => {
    let nextTpl = templateType;
    let nextConfig = { ...activeConfig, [key]: val };
    
    if (templateType !== 'custom') {
      nextTpl = 'custom';
      setTemplateType('custom');
      localStorage.setItem(`print_preview_template_${documentType}`, 'custom');
    }
    
    setActiveConfig(nextConfig);
    localStorage.setItem(`print_preview_config_${documentType}_${nextTpl}`, JSON.stringify(nextConfig));
  };

  // Toggle column visibility
  const toggleColumnVisibility = (colId: string, visible: boolean) => {
    const configMap: Record<string, keyof PrintConfig> = {
      barcode: 'showColBarcode',
      name: 'showColName',
      quantity: 'showColQty',
      unit: 'showColUnit',
      discount: 'showColDiscount',
      price: 'showColPrice',
      total: 'showColTotal'
    };

    const configKey = configMap[colId];
    if (configKey) {
      updateConfig(configKey, visible);
    }
  };

  // Reset to template default layout
  const resetLayout = () => {
    const targetTpl = templateType === 'custom' ? 'receipt' : templateType;
    setActiveConfig(DEFAULT_CONFIGS[targetTpl].config);
    setColumnOrder(DEFAULT_CONFIGS[targetTpl].columns);
    setPaperSize(DEFAULT_CONFIGS[targetTpl].size);
    setTemplateType(targetTpl);
    
    localStorage.setItem(`print_preview_template_${documentType}`, targetTpl);
    localStorage.setItem(`print_preview_size_${documentType}`, DEFAULT_CONFIGS[targetTpl].size);
    localStorage.removeItem(`print_preview_config_${documentType}_custom`);
    localStorage.removeItem(`print_preview_columns_${documentType}_custom`);
    toast.success('تمت إعادة تعيين القوالب الافتراضية');
  };

  const getRenderedHTML = () => {
    return generateInvoiceHTML(
      invoiceData,
      settings,
      paperSize,
      templateType,
      activeConfig,
      columnOrder
    );
  };

  const handlePrintAction = async () => {
    try {
      const html = getRenderedHTML();
      const printer = paperSize === '80mm' ? settings?.receipt_printer : settings?.invoice_printer;
      
      const res: any = await window.electronAPI.invoke('print:html', {
        html,
        silent: false,
        printerName: printer || undefined,
        paperSize: paperSize
      });

      if (res?.success) {
        toast.success('تم إرسال الفاتورة إلى الطابعة بنجاح');
        onClose();
      } else if (res?.error && res?.error !== 'Canceled') {
        toast.error(`خطأ في الطباعة: ${res.error}`);
      }
    } catch (e) {
      toast.error('فشل إرسال أمر الطباعة');
    }
  };

  const handleSavePDFAction = async () => {
    try {
      const html = getRenderedHTML();
      const fileName = `${documentType === 'sales' ? 'Sale' : 'Purchase'}_${invoiceData.invoice_number || Date.now()}.pdf`;
      const res: any = await window.electronAPI.invoke('print:savePDF', { html, fileName });

      if (res?.success) {
        toast.success(`تم حفظ ملف PDF بنجاح في: ${res.path}`);
      } else if (res?.error && res?.error !== 'Canceled') {
        toast.error(`خطأ في حفظ PDF: ${res.error}`);
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء تصدير PDF');
    }
  };

  const handleHeaderClick = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setHeaderMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      colId
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 font-cairo text-right" dir="rtl" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card bg-background_secondary border border-border_default w-full max-w-7xl h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar - Contains Top Template Tabs, Sizes & Export Buttons */}
        <div className="h-[75px] border-b border-border_default bg-background_primary px-6 flex justify-between items-center shrink-0 z-30">
          
          {/* Top Left Template buttons - Mapped exactly to image */}
          <div className="flex items-center gap-2">
            {(['receipt', 'customer', 'tax', 'custom'] as TemplateType[]).map(type => {
              const label = type === 'receipt' ? 'وصل بيع' : type === 'customer' ? 'فاتورة عميل' : type === 'tax' ? 'فاتورة ضريبية' : 'مخصص ⭐';
              const active = templateType === type;
              return (
                <button
                  key={type}
                  onClick={() => handleTemplateChange(type)}
                  disabled={type === 'custom' && !localStorage.getItem(`print_preview_config_${documentType}_custom`)}
                  className={`h-11 px-5 rounded-2xl border text-center font-bold text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                    active
                      ? 'bg-primary_blue text-white border-primary_blue shadow font-black'
                      : 'bg-background_card border-border_default hover:border-text_muted/40 text-text_secondary hover:text-text_primary disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  {type === 'custom' && <Star size={13} className={active ? 'fill-white text-white' : 'text-text_secondary'} />}
                  {label}
                </button>
              );
            })}
          </div>

          {/* Top Right Paper Sizes & Actions - Mapped exactly to image */}
          <div className="flex items-center gap-3">
            {/* Paper Size selector */}
            <div className="flex items-center bg-background_card border border-border_default rounded-2xl h-11 px-1.5 gap-1.5 shadow-inner">
              {(['A4', 'A5', '80mm'] as PaperSize[]).map(size => (
                <button
                  key={size}
                  onClick={() => {
                    setPaperSize(size);
                    localStorage.setItem(`print_preview_size_${documentType}`, size);
                  }}
                  className={`h-8 px-4 font-bold text-xs rounded-xl transition-all ${paperSize === size ? 'bg-primary_blue text-white shadow' : 'text-text_secondary hover:bg-white/5 hover:text-text_primary'}`}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* Export PDF Button */}
            <button
              onClick={handleSavePDFAction}
              className="h-11 px-5 bg-emerald-500/10 border border-emerald-500/35 hover:bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <Download size={16} />
              <span>حفظ PDF</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2.5 bg-background_card hover:bg-background_card_hover hover:text-danger_red text-text_muted border border-border_default rounded-full transition-all active:scale-95 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

        </div>

        {/* Workspace Body */}
        <div className="flex-1 flex min-h-0 relative">
          
          {/* Main Visual Preview Area */}
          <div className="flex-1 min-w-0 bg-[#0c1424]/40 overflow-y-auto p-8 flex items-start justify-center custom-scrollbar" ref={previewContainerRef}>
            <div className="relative transform origin-top transition-transform duration-300">
              <PrintTemplateRenderer
                invoice={invoiceData}
                settings={settings}
                paperSize={paperSize}
                templateType={templateType}
                config={activeConfig}
                columnOrder={columnOrder}
                onHeaderClick={handleHeaderClick}
              />
            </div>
          </div>

          {/* Right Customization Sidebar - Streamlined to 5 single switches */}
          <div className="w-[300px] border-r border-border_default bg-background_primary flex flex-col justify-between shrink-0 h-full select-none">
            {/* Sidebar Scrollable Panel */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              
              <div className="text-[11px] font-black text-text_muted px-1 uppercase tracking-wider mb-2">إعدادات تخصيص المستند</div>

              {/* 1. Company Info Card - Single toggle */}
              <div className="bg-background_secondary/60 border border-border_default p-3.5 rounded-2xl space-y-2">
                <label className="text-[10px] font-black text-text_muted block mb-1 uppercase tracking-wider">معلومات المؤسسة</label>
                <ToggleChip
                  label="إظهار معلومات المحل بالكامل"
                  checked={activeConfig.showCompanyBlock}
                  onChange={val => updateConfig('showCompanyBlock', val)}
                />
              </div>

              {/* 2. Official Details Card - Single toggle */}
              <div className="bg-background_secondary/60 border border-border_default p-3.5 rounded-2xl space-y-2">
                <label className="text-[10px] font-black text-text_muted block mb-1 uppercase tracking-wider">الهوية التجارية والبيانات الرسمية</label>
                <ToggleChip
                  label="إظهار البيانات الرسمية (RC, NIF...)"
                  checked={activeConfig.showCompanyOfficialDetails}
                  onChange={val => updateConfig('showCompanyOfficialDetails', val)}
                />
              </div>

              {/* 3. Customer Details Card - Single toggle */}
              <div className="bg-background_secondary/60 border border-border_default p-3.5 rounded-2xl space-y-2">
                <label className="text-[10px] font-black text-text_muted block mb-1 uppercase tracking-wider">معلومات العميل</label>
                <div className="space-y-2">
                  <ToggleChip
                    label="إظهار بيانات العميل والهاتف"
                    checked={activeConfig.showCustomerBlock}
                    onChange={val => {
                      let nextConfig = { ...activeConfig };
                      nextConfig.showCustomerBlock = val;
                      nextConfig.showCustomerPhone = val;
                      
                      let nextTpl = templateType;
                      if (templateType !== 'custom') {
                        nextTpl = 'custom';
                        setTemplateType('custom');
                        localStorage.setItem(`print_preview_template_${documentType}`, 'custom');
                      }
                      setActiveConfig(nextConfig);
                      localStorage.setItem(`print_preview_config_${documentType}_${nextTpl}`, JSON.stringify(nextConfig));
                    }}
                  />
                </div>
              </div>

              {/* 4. Invoice Details Card - Single toggle */}
              <div className="bg-background_secondary/60 border border-border_default p-3.5 rounded-2xl space-y-2">
                <label className="text-[10px] font-black text-text_muted block mb-1 uppercase tracking-wider">تفاصيل ورقم السند</label>
                <ToggleChip
                  label="إظهار بطاقة معلومات السند"
                  checked={activeConfig.showInvoiceDetails}
                  onChange={val => updateConfig('showInvoiceDetails', val)}
                />
              </div>

              {/* 5. Invoice Extras Card - Note & Footer toggles + Textarea */}
              <div className="bg-background_secondary/60 border border-border_default p-3.5 rounded-2xl space-y-3">
                <label className="text-[10px] font-black text-text_muted block uppercase tracking-wider">إضافات وتذييل الورقة</label>
                
                <div className="space-y-2.5">
                  <ToggleChip
                    label="إظهار تذييل الصفحة"
                    checked={activeConfig.showFooter}
                    onChange={val => updateConfig('showFooter', val)}
                  />

                  <ToggleChip
                    label="استغلال أقصى للمساحة (تذييل مضغوط)"
                    checked={activeConfig.compactFooter || false}
                    onChange={val => updateConfig('compactFooter', val)}
                  />

                  <div className="border-t border-border_default/40 pt-2.5 space-y-2">
                    <ToggleChip
                      label="إظهار الملاحظة التوضيحية"
                      checked={activeConfig.showNotes}
                      onChange={val => updateConfig('showNotes', val)}
                    />
                    
                    {/* Live Sidebar Notes Writing Input - Exactly as requested */}
                    {activeConfig.showNotes && (
                      <textarea
                        value={activeConfig.notesText !== undefined ? activeConfig.notesText : invoiceData.notes || ''}
                        onChange={(e) => updateConfig('notesText', e.target.value)}
                        placeholder="اكتب الملاحظة هنا لتظهر على الفاتورة مباشرة..."
                        className="w-full h-24 bg-background_primary border border-border_default hover:border-text_muted/40 focus:border-primary_blue rounded-xl p-3 text-xs outline-none text-text_primary transition-all custom-scrollbar font-bold"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Page Division / Items Per Page Configuration */}
              {(paperSize === 'A4' || paperSize === 'A5') && (
                <div className="bg-background_secondary/60 border border-border_default p-3.5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-text_muted block uppercase tracking-wider">عدد المنتجات في الصفحة الواحدة</label>
                    <span className="text-xs font-black text-primary_blue font-mono">
                      {(activeConfig.itemsPerPage !== undefined && activeConfig.itemsPerPage > 0)
                        ? activeConfig.itemsPerPage
                        : (paperSize === 'A4'
                            ? parseInt(settings?.items_per_page_a4, 10) || 0
                            : parseInt(settings?.items_per_page_a5, 10) || 0) || 'تلقائي'}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={activeConfig.itemsPerPage !== undefined && activeConfig.itemsPerPage > 0 ? activeConfig.itemsPerPage : ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      updateConfig('itemsPerPage', isNaN(val) ? 0 : val);
                    }}
                    placeholder="0 (تلقائي)"
                    className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-2 text-xs text-text_primary outline-none focus:border-primary_blue font-bold text-center"
                  />
                  <p className="text-[9px] text-text_muted font-bold leading-normal m-0 text-right">
                    اضبط عدد المنتجات لتقسيم الصفحات بشكل ثابت، أو ضع 0 للتوزيع التلقائي حسب المساحة المتاحة.
                  </p>
                </div>
              )}

              {/* 6. Typography Card - Font Weight Range Slider strictly for Table text */}
              <div className="bg-background_secondary/60 border border-border_default p-3.5 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-text_muted block uppercase tracking-wider">سمك خط الجدول</label>
                  <span className="text-xs font-black text-primary_blue font-mono">{activeConfig.fontWeightPercent !== undefined ? activeConfig.fontWeightPercent : 80}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-text_muted select-none">50%</span>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={activeConfig.fontWeightPercent !== undefined ? activeConfig.fontWeightPercent : 80}
                    onChange={(e) => updateConfig('fontWeightPercent', parseInt(e.target.value))}
                    className="flex-1 h-1.5 bg-background_card border border-border_default rounded-lg appearance-none cursor-pointer accent-primary_blue outline-none"
                  />
                  <span className="text-[10px] font-black text-text_muted select-none">100%</span>
                </div>
              </div>

              {/* Reset layout button */}
              <button
                onClick={resetLayout}
                className="w-full bg-background_card hover:bg-background_card_hover text-text_primary border border-border_default/60 rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-bold text-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <RotateCcw size={14} />
                إعادة ضبط للتخطيط الافتراضي
              </button>

            </div>

            {/* Sidebar Bottom CTA Action Section */}
            <div className="p-4 border-t border-border_default bg-background_primary shrink-0 space-y-2 z-10">
              <button
                onClick={handlePrintAction}
                className="w-full bg-primary_blue hover:bg-primary_blue_hover text-white rounded-2xl py-3.5 px-6 flex items-center justify-center gap-2 font-black text-sm shadow-lg shadow-primary_blue/20 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Printer size={18} />
                طباعة الفاتورة (Print)
              </button>
            </div>

          </div>

        </div>

      </motion.div>

      {/* Floating column context menu (Right Click) */}
      {headerMenu && headerMenu.visible && (() => {
        const TOGGLEABLE_COLUMNS = ['barcode', 'name', 'quantity', 'unit', 'discount', 'price', 'total'];
        
        const getColVisibility = (colId: string) => {
          if (colId === 'barcode') return activeConfig.showColBarcode;
          if (colId === 'name') return activeConfig.showColName;
          if (colId === 'quantity') return activeConfig.showColQty;
          if (colId === 'unit') return activeConfig.showColUnit;
          if (colId === 'discount') return activeConfig.showColDiscount;
          if (colId === 'price') return activeConfig.showColPrice;
          if (colId === 'total') return activeConfig.showColTotal;
          return false;
        };

        return (
          <div
            className="fixed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl z-[9999] overflow-hidden min-w-[220px] p-2"
            style={{ top: headerMenu.y, left: headerMenu.x }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/60 mb-1">
              إظهار / إخفاء أعمدة الجدول
            </div>

            {TOGGLEABLE_COLUMNS.map(colId => {
              const visible = getColVisibility(colId);
              return (
                <button
                  key={colId}
                  className="w-full text-right px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded-lg flex items-center justify-between transition-colors group cursor-pointer"
                  onClick={() => {
                    toggleColumnVisibility(colId, !visible);
                  }}
                >
                  <span className="text-slate-700 dark:text-slate-200">{COLUMN_LABELS[colId]}</span>
                  {visible ? (
                    <Eye size={14} className="text-primary_blue" />
                  ) : (
                    <EyeOff size={14} className="text-slate-400 group-hover:text-danger_red" />
                  )}
                </button>
              );
            })}

            <button
              className="w-full text-right px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors group cursor-pointer border-t border-slate-100 dark:border-slate-800/60 mt-1 pt-2"
              onClick={() => {
                resetLayout();
                setHeaderMenu(null);
              }}
            >
              <RotateCcw size={13} className="text-slate-400 group-hover:text-amber-500" />
              <span className="text-slate-600 dark:text-slate-300">إعادة تعيين الافتراضي</span>
            </button>
          </div>
        );
      })()}
    </div>
  );
};

// Modern Toggle Chip component
interface ToggleChipProps {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}

const ToggleChip: React.FC<ToggleChipProps> = ({ label, checked, onChange }) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`px-3 py-2.5 rounded-2xl border text-[11px] font-black transition-all duration-200 select-none cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.97] w-full ${
        checked
          ? 'bg-primary_blue/10 border-primary_blue text-primary_blue shadow-sm shadow-primary_blue/5'
          : 'bg-background_card border-border_default/40 hover:border-text_muted/40 text-text_secondary hover:text-text_primary'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${checked ? 'bg-primary_blue scale-100' : 'bg-text_muted/40 scale-75'}`} />
      <span>{label}</span>
    </button>
  );
};
