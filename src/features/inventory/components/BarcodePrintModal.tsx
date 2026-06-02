import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Sparkles, AlertCircle, RefreshCw, Type, Hash, ChevronDown, Check } from 'lucide-react';
import Barcode from 'react-barcode';
import { showSuccess, showError } from '../../../shared/utils/notifications';

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    name: string;
    barcode: string;
    price: number;
    qty?: number;
  } | null;
}

interface LabelSize {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  labelAr: string;
}

const PRESET_SIZES: LabelSize[] = [
  { id: 'standard', name: 'قياسي (38 × 25 مم)', widthMm: 38, heightMm: 25, labelAr: 'ملصق قياسي' },
  { id: 'small', name: 'صغير جداً (30 × 15 مم)', widthMm: 30, heightMm: 15, labelAr: 'ملصق صغير' },
  { id: 'large', name: 'كبير (50 × 30 مم)', widthMm: 50, heightMm: 30, labelAr: 'ملصق كبير' },
];

export default function BarcodePrintModal({ isOpen, onClose, product }: BarcodePrintModalProps) {
  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<LabelSize>(PRESET_SIZES[0]);
  const [editableName, setEditableName] = useState<string>('');
  const [printQty, setPrintQty] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingPrinters, setFetchingPrinters] = useState<boolean>(false);

  const barcodeSvgRef = useRef<HTMLDivElement>(null);

  // Load printers and initialize form on mount/product change
  useEffect(() => {
    if (isOpen && product) {
      setEditableName(product.name);
      setPrintQty(product.qty && product.qty > 0 ? Math.ceil(product.qty) : 1);
      loadPrinters();
    }
  }, [isOpen, product]);

  // Handle Enter to Print and Escape to Close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        // Prevent enter on textareas or active buttons from double-triggering
        const activeTagName = document.activeElement?.tagName;
        if (activeTagName !== 'TEXTAREA' && activeTagName !== 'BUTTON') {
          e.preventDefault();
          handlePrint();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editableName, selectedSize, printQty, selectedPrinter]);

  const loadPrinters = async () => {
    setFetchingPrinters(true);
    try {
      const res = await window.electronAPI?.invoke('print:getPrinters');
      if (res?.success && Array.isArray(res.data)) {
        setPrinters(res.data);
        // Pre-select default printer if available
        const defaultPrinter = res.data.find((p: any) => p.isDefault);
        if (defaultPrinter) {
          setSelectedPrinter(defaultPrinter.name);
        } else if (res.data.length > 0) {
          setSelectedPrinter(res.data[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch printers:', err);
    } finally {
      setFetchingPrinters(false);
    }
  };

  const handlePrint = async () => {
    if (!product || loading) return;
    setLoading(true);
    try {
      // 1. Serialize the preview SVG barcode to string
      let svgHtml = '';
      if (barcodeSvgRef.current) {
        const svgElement = barcodeSvgRef.current.querySelector('svg');
        if (svgElement) {
          // Clone and scale for high DPI printing using viewBox to enable native SVG vector scaling
          const clonedSvg = svgElement.cloneNode(true) as SVGElement;
          const origWidth = svgElement.getAttribute('width') || '150';
          const origHeight = svgElement.getAttribute('height') || '50';
          
          clonedSvg.setAttribute('viewBox', `0 0 ${origWidth} ${origHeight}`);
          clonedSvg.setAttribute('width', '100%');
          clonedSvg.setAttribute('height', '100%');
          
          // Force high-contrast vector alignment styles to ensure ultra-sharp barcode lines on thermal printer
          clonedSvg.style.shapeRendering = 'crispEdges';
          clonedSvg.style.imageRendering = 'pixelated';
          clonedSvg.style.backgroundColor = '#ffffff';
          clonedSvg.style.background = '#ffffff';

          // Create an explicit solid white background rect inside the SVG namespace to prevent printer alpha-blending black box bugs
          const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          bgRect.setAttribute('x', '0');
          bgRect.setAttribute('y', '0');
          bgRect.setAttribute('width', origWidth);
          bgRect.setAttribute('height', origHeight);
          bgRect.setAttribute('fill', '#ffffff');
          bgRect.style.fill = '#ffffff';
          clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

          const rectsAndPaths = clonedSvg.querySelectorAll('rect, path');
          rectsAndPaths.forEach((el: any) => {
            el.setAttribute('shape-rendering', 'crispEdges');
            el.style.shapeRendering = 'crispEdges';
            // Make all paths and lines pure black, leaving only our injected white background rect untouched
            if (el !== bgRect) {
              el.setAttribute('fill', '#000000');
              el.style.fill = '#000000';
            }
          });

          svgHtml = new XMLSerializer().serializeToString(clonedSvg);
        }
      }

      if (!svgHtml) {
        throw new Error('فشل توليد رمز الباركود المعاين');
      }

      // Fetch company name from settings
      const companyName = localStorage.getItem('company_name') || 'شركة قطع الغيار';

      // 2. Generate CSS and HTML representing N barcode labels with page breaks
      const widthMm = selectedSize.widthMm;
      const heightMm = selectedSize.heightMm;
      
      const priceText = `${product.price.toFixed(2)} د.ج`;

      // Proportional vertical sizing - expanded to absolute maximum printable bounds for maximum clarity
      const nameFontSize = selectedSize.id === 'small' ? '8px' : selectedSize.id === 'large' ? '12px' : '10px';
      const metaFontSize = selectedSize.id === 'small' ? '8px' : selectedSize.id === 'large' ? '11px' : '9.5px';
      const barcodeHeight = selectedSize.id === 'small' ? '8mm' : selectedSize.id === 'large' ? '20mm' : '15mm';

      // Build the individual label HTML using bulletproof, non-flex layout immune to Chromium print bugs
      const singleLabelHtml = `
        <div class="label-container" style="
          width: ${widthMm}mm;
          height: ${heightMm}mm;
          box-sizing: border-box;
          padding: 0.5mm 1mm;
          display: block !important;
          text-align: center;
          overflow: hidden;
          page-break-after: always;
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
          font-weight: bold;
          direction: rtl;
          background-color: #ffffff !important;
          color: #000000 !important;
        ">
          <!-- Product Name -->
          <div style="
            font-size: ${nameFontSize} !important;
            line-height: 1.1;
            height: 2.2em;
            overflow: hidden;
            display: block;
            width: 100%;
            margin-bottom: 0.5mm;
            color: #000000 !important;
            text-align: center;
          ">
            ${editableName}
          </div>

          <!-- Barcode SVG Container (expanded to 96% width and maximum safe height) -->
          <div style="
            width: 96%; 
            height: ${barcodeHeight}; 
            margin: 0 auto 0.5mm auto; 
            display: block; 
            overflow: hidden;
            background-color: #ffffff !important;
          ">
            ${svgHtml}
          </div>

          <!-- Price & Barcode number Table (Bulletproof layout immune to Chromium print bugs) -->
          <table style="
            width: 100%; 
            border-collapse: collapse !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            border: none !important;
            background-color: #ffffff !important;
          ">
            <tr style="border: none !important;">
              <td style="
                text-align: right; 
                font-family: monospace; 
                font-size: ${metaFontSize} !important; 
                color: #000000 !important; 
                border: none !important; 
                padding: 0 !important;
                width: 60%;
                font-weight: bold !important;
              ">
                ${product.barcode}
              </td>
              <td style="
                text-align: left; 
                font-size: ${metaFontSize} !important; 
                color: #000000 !important; 
                border: none !important; 
                padding: 0 !important;
                width: 40%;
                font-weight: 900 !important;
              ">
                ${priceText}
              </td>
            </tr>
          </table>
        </div>
      `;

      // Repeat based on quantity
      let fullHtml = '';
      for (let i = 0; i < printQty; i++) {
        fullHtml += singleLabelHtml;
      }

      // 3. Invoke native print handler with dynamic page size styling
      const res = await window.electronAPI?.invoke('print:html', {
        html: fullHtml,
        silent: true,
        printerName: selectedPrinter || undefined,
        paperSize: `${widthMm}mmx${heightMm}mm`, // Custom format processed in printing if needed
      });

      if (res?.success) {
        showSuccess('تم إرسال الملصقات إلى الطابعة بنجاح');
        onClose();
      } else {
        showError(res?.error || 'فشل إرسال الملصق للطباعة');
      }
    } catch (err: any) {
      console.error('Printing error:', err);
      showError(err.message || 'حدث خطأ غير متوقع أثناء الطباعة');
    } finally {
      setLoading(false);
    }
  };

  const autoShorten = () => {
    // Quick auto-shorten utility for names: removes repetitive descriptors
    let name = editableName;
    const wordsToRemove = [
      'اصلي', 'أصلي', 'origine', 'original', 'غطاء', 'حاجز', 'مجموعة', 'طقم', 'كامل', 'كاملة', 
      'ممتاز', 'جودة', 'عالية', 'مستورد', 'توصيل', 'مجاني', 'ضمان', 'سنة', 'شهور', 'شهر'
    ];
    
    // Convert to lowercase array of words and filter
    const words = name.split(/\s+/);
    const filtered = words.filter(w => !wordsToRemove.includes(w.toLowerCase()));
    
    // Take first 4 words to keep it highly concise for tiny labels
    const shortened = filtered.slice(0, 4).join(' ');
    setEditableName(shortened);
    showSuccess('تم تقصير الاسم تلقائياً');
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1100] p-4 font-cairo" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="bg-background_secondary/90 dark:bg-background_secondary/85 backdrop-blur-2xl border border-white/15 dark:border-white/10 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 bg-background_primary/80 dark:bg-white/[0.02] border-b border-border_default dark:border-white/5 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Printer size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text_primary tracking-tight">طباعة ملصق الباركود الحراري</h2>
              <p className="text-xs text-text_muted">توليد ملصقات لقطع الغيار وطباعتها على الطابعات الحرارية</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-background_secondary rounded-xl transition-all duration-200 group outline-none">
            <X size={20} className="text-text_muted group-hover:text-text_primary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          
          {/* Form Side (Right on Arabic) */}
          <div className="md:col-span-7 space-y-5">
            {/* Input 1: Product Name / Label Title */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-text_secondary font-bold flex items-center gap-1.5">
                  <Type size={16} className="text-emerald-500" />
                  <span>تسمية المنتج على الملصق</span>
                </label>
                <button
                  type="button"
                  onClick={autoShorten}
                  className="text-xs text-emerald-500 hover:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1 transition-all"
                >
                  <Sparkles size={12} />
                  <span>تقصير تلقائي</span>
                </button>
              </div>
              <textarea
                value={editableName}
                onChange={e => setEditableName(e.target.value)}
                rows={2}
                dir="auto"
                className="w-full bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-text_primary placeholder:text-text_muted focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none shadow-inner"
              />
            </div>

            {/* Input 2: Barcode size presets */}
            <div>
              <label className="text-sm text-text_secondary block mb-2 font-bold flex items-center gap-1.5">
                <Settings2Icon size={16} className="text-blue-500" />
                <span>حجم ورق الملصق المستهدف</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {PRESET_SIZES.map(size => {
                  const isSelected = selectedSize.id === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`px-3 py-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1
                        ${isSelected
                          ? 'bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-300 shadow-md shadow-blue-500/5'
                          : 'bg-background_card border-border_default dark:border-white/5 text-text_muted hover:border-blue-400/40 hover:text-text_primary'
                        }`}
                    >
                      <span className="text-xs font-bold">{size.labelAr}</span>
                      <span className="text-[10px] font-numbers font-semibold opacity-75">{size.widthMm} × {size.heightMm} مم</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input 3: Quantity + Printer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text_secondary block mb-2 font-bold flex items-center gap-1.5">
                  <Hash size={16} className="text-violet-500" />
                  <span>عدد الملصقات (الكمية)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={printQty}
                  onChange={e => setPrintQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl px-4 py-3 text-base font-numbers font-bold text-text_primary focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all shadow-inner"
                />
              </div>
              
              <div>
                <label className="text-sm text-text_secondary block mb-2 font-bold flex items-center gap-1.5">
                  <Printer size={16} className="text-amber-500" />
                  <span>طابعة الملصقات الحرارية</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedPrinter}
                    onChange={e => setSelectedPrinter(e.target.value)}
                    className="w-full bg-background_secondary dark:bg-white/[0.06] border border-border_default dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-text_primary focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all appearance-none cursor-pointer shadow-inner"
                  >
                    {fetchingPrinters ? (
                      <option>جاري البحث...</option>
                    ) : printers.length === 0 ? (
                      <option value="">لا توجد طابعات مثبتة</option>
                    ) : (
                      printers.map(p => (
                        <option key={p.name} value={p.name}>
                          {p.name} {p.isDefault ? '(الافتراضية)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text_muted pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Help Alerts */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-2.5 items-start">
              <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-text_secondary leading-relaxed">
                اضغط على مفتاح <span className="font-bold text-blue-500 bg-blue-500/20 px-1 rounded">Enter</span> للطباعة السريعة فور تأكيد التسمية والكمية. يوصى بتركيب ورق ملصقات متوافق مع الأحجام المحددة.
              </p>
            </div>
          </div>

          {/* Preview Side (Left on Arabic) */}
          <div className="md:col-span-5 flex flex-col justify-center items-center bg-background_primary/40 dark:bg-white/[0.01] border border-border_default dark:border-white/5 rounded-2xl p-6 relative">
            <span className="absolute top-3 right-3 text-[10px] bg-emerald-500/15 border border-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-lg font-bold">معاينة حيّة للملصق</span>
            
            {/* The Scalable Label Card */}
            <motion.div
              layout
              className="bg-white text-black shadow-2xl border border-black/10 rounded-lg p-4 flex flex-col items-center justify-between text-center select-none overflow-hidden"
              style={{
                width: selectedSize.id === 'small' ? '180px' : selectedSize.id === 'large' ? '250px' : '210px',
                height: selectedSize.id === 'small' ? '120px' : selectedSize.id === 'large' ? '170px' : '145px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {/* Product Designation */}
              <div 
                dir="auto"
                className="font-black text-black leading-tight text-center truncate-2-lines w-full"
                style={{
                  fontSize: selectedSize.id === 'small' ? '10px' : selectedSize.id === 'large' ? '14px' : '12px',
                  maxHeight: '2.4em',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {editableName || 'اسم المنتج'}
              </div>

              {/* Graphical Barcode Image */}
              <div ref={barcodeSvgRef} className="w-full flex items-center justify-center overflow-hidden my-1">
                <Barcode
                  value={product.barcode || '000000'}
                  width={selectedSize.id === 'small' ? 1.0 : selectedSize.id === 'large' ? 1.6 : 1.3}
                  height={selectedSize.id === 'small' ? 24 : selectedSize.id === 'large' ? 42 : 32}
                  margin={0}
                  displayValue={false}
                />
              </div>

              {/* Price & Code row */}
              <div className="flex justify-between items-center w-full mt-1">
                <span className="text-[9px] font-bold font-numbers text-zinc-600">{product.barcode || '000000'}</span>
                <span 
                  className="font-black font-numbers bg-black text-white px-2 py-0.5 rounded"
                  style={{
                    fontSize: selectedSize.id === 'small' ? '9px' : selectedSize.id === 'large' ? '13px' : '11px'
                  }}
                >
                  {product.price.toFixed(2)} د.ج
                </span>
              </div>
            </motion.div>
            
            {/* Real Label Size indicator */}
            <span className="mt-4 text-xs font-semibold text-text_muted">حجم الملصق الفعلي: {selectedSize.widthMm} × {selectedSize.heightMm} مم</span>
          </div>

        </div>

        {/* Footer */}
        <div className="shrink-0 bg-background_secondary border-t border-border_default px-6 py-4 flex gap-4">
          <button
            onClick={handlePrint}
            disabled={loading || !editableName.trim() || !selectedPrinter}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 disabled:hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Printer size={16} />
            )}
            <span>طباعة الملصقات الحرارية (Enter)</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl border border-border_default text-text_secondary hover:text-text_primary hover:bg-background_secondary text-sm font-bold transition-all"
          >
            إلغاء
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Simple Helper to replace missing settings icon
function Settings2Icon({ size, className }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M20 12h2"/><path d="M2 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 19.07-1.41-1.41"/><path d="m6.34 6.34-1.41-1.41"/></svg>
  );
}
