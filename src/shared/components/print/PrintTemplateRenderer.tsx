import React from 'react';
import { FileText, Calendar, Clock, CreditCard, User, Phone, MapPin } from 'lucide-react';

const isGeneralCustomer = (name?: string) => {
  if (!name) return true;
  const trimmed = name.trim().toLowerCase();
  return (
    trimmed === '' ||
    trimmed === 'عام' ||
    trimmed === 'زبون عام' ||
    trimmed === 'زبون' ||
    trimmed === 'client' ||
    trimmed === 'general' ||
    trimmed === 'walk-in' ||
    trimmed === 'walk-in customer' ||
    trimmed === 'client passager' ||
    trimmed === 'passager' ||
    trimmed.includes('passager') ||
    trimmed.includes('زبون عام')
  );
};

const isEnabled = (key: string, settings: any) => {
  if (!settings) return true;
  return settings[key] !== 'false' && settings[key] !== false;
};

const paginateItems = (
  items: any[],
  paperSize: PaperSize,
  config?: PrintConfig,
  settings?: any,
  invoice?: any
) => {
  if (paperSize === '80mm') {
    return [items || []];
  }
  
  if (!items || items.length === 0) {
    return [[]];
  }

  // Check if user set static items per page in settings
  const configLimit = config?.itemsPerPage !== undefined ? config.itemsPerPage : 0;
  const itemsPerPageA4 = parseInt(settings?.items_per_page_a4, 10) || 0;
  const itemsPerPageA5 = parseInt(settings?.items_per_page_a5, 10) || 0;
  const dbLimit = paperSize === 'A4' ? itemsPerPageA4 : (paperSize === 'A5' ? itemsPerPageA5 : 0);
  const staticLimit = configLimit > 0 ? configLimit : dbLimit;

  if (staticLimit > 0) {
    const pages: any[][] = [];
    let currentIndex = 0;
    while (currentIndex < items.length) {
      pages.push(items.slice(currentIndex, currentIndex + staticLimit));
      currentIndex += staticLimit;
    }
    return pages;
  }

  // Fallback if config details are missing
  if (!config || !settings || !invoice) {
    const pages: any[][] = [];
    const limitPage1Single = paperSize === 'A4' ? 6 : 4;
    if (items.length <= limitPage1Single) {
      return [items];
    }
    const capacityPage1 = paperSize === 'A4' ? 6 : 4;
    const capacityMiddle = paperSize === 'A4' ? 14 : 10;
    const capacityLast = paperSize === 'A4' ? 10 : 8;
    let currentIndex = 0;
    let pageNum = 1;
    while (currentIndex < items.length) {
      let capacity = 0;
      const remaining = items.length - currentIndex;
      if (pageNum === 1) {
        capacity = capacityPage1;
      } else {
        if (remaining <= capacityLast) {
          capacity = remaining;
        } else if (remaining <= capacityMiddle) {
          capacity = capacityLast;
        } else {
          capacity = capacityMiddle;
        }
      }
      const pageItems = items.slice(currentIndex, currentIndex + capacity);
      pages.push(pageItems);
      currentIndex += capacity;
      pageNum++;
    }
    return pages;
  }

  // =========================================================================
  // DYNAMIC PHYSICAL HEIGHT-BASED PAGINATION ENGINE (UNITS IN MM)
  // =========================================================================

  // Net printable height (A4 total height is 297mm, A5 is 210mm)
  const netHeight = paperSize === 'A5' ? 194 : 277; // A5 margins: 8mm x 2 = 16mm, A4 margins: 10mm x 2 = 20mm

  // Convert px size to mm (96 DPI standard: 1px = 0.2646mm)
  const pxToMm = (px: number) => px * 0.2646;

  const getHeaderHeight = () => {
    if (!config.showCompanyBlock && !config.showInvoiceDetails) return 0;
    
    const logoScale = paperSize === 'A5' ? 0.72 : 1.0;
    const baseLogoSize = parseInt(settings?.logo_size || '80', 10);
    const logoSizePx = baseLogoSize * logoScale;
    const logoSizeMm = pxToMm(logoSizePx);
    const hasLogo = !!settings?.store_logo && config.showCompanyBlock;
    
    let companyHeight = 0;
    if (config.showCompanyBlock) {
      let textHeight = 5; // vertical margin padding
      if (settings?.company_name) textHeight += 8;
      if (settings?.company_activity && settings?.company_activity !== 'false') textHeight += 5;
      if (settings?.company_phone) textHeight += 5;
      if (settings?.company_address) textHeight += 5;
      
      const logoPosition = settings?.logo_position || 'right';
      if (logoPosition === 'center' && hasLogo) {
        companyHeight = logoSizeMm + textHeight + 5;
      } else if (hasLogo) {
        companyHeight = Math.max(logoSizeMm, textHeight);
      } else {
        companyHeight = textHeight;
      }
    }
    
    let metaHeight = 0;
    if (config.showInvoiceDetails) {
      metaHeight = 26; // Card padding + 4 meta rows
    }
    
    const headerContentHeight = Math.max(companyHeight, metaHeight);
    return headerContentHeight + 8; // include space below header line
  };

  const getCustomerHeight = () => {
    const isGeneral = isGeneralCustomer(invoice.customer_name);
    if (!config.showCustomerBlock || isGeneral) return 0;
    return 11; // horizontal card height in mm
  };

  const getLegalHeight = () => {
    const hasRc = settings?.company_rc && isEnabled('company_rc_enabled', settings);
    const hasNif = settings?.company_nif && isEnabled('company_nif_enabled', settings);
    const hasNis = settings?.company_nis && isEnabled('company_nis_enabled', settings);
    const hasArt = settings?.company_art && isEnabled('company_art_enabled', settings);
    const hasCb = settings?.company_cb && isEnabled('company_cb_enabled', settings);
    
    if (config.showCompanyOfficialDetails && (hasRc || hasNif || hasNis || hasArt || hasCb)) {
      return 13; // compact legal grid height in mm
    }
    return 0;
  };

  const getTotalsAndNotesHeight = () => {
    const isCompact = config?.compactFooter || (invoice.items && invoice.items.length > 17);
    if (isCompact) {
      let h = 8; // base height for horizontal totals bar in mm
      const customNote = config.notesText !== undefined && config.notesText !== '' ? config.notesText : invoice.notes;
      const hasNotes = config.showNotes && customNote && String(customNote).trim() !== '';
      if (hasNotes) {
        h += 8; // compact note row height in mm
      }
      return h;
    }

    let totalsHeight = 0;
    const isQuotation = !!config.showQuotationMode;
    if (!isQuotation) {
      const hasDiscount = invoice.global_discount_amount > 0;
      const hasTax = invoice.tax_amount > 0;
      let rows = 4; // Subtotal, Paid, Remaining, Grand Total
      if (hasDiscount) rows += 1;
      if (hasTax) rows += 1;
      totalsHeight = 3 + rows * 6.5; // padding + row height
    } else {
      totalsHeight = 10; // Grand total single row height
    }
    
    let notesHeight = 0;
    const customNote = config.notesText !== undefined && config.notesText !== '' ? config.notesText : invoice.notes;
    const hasNotes = config.showNotes && customNote && String(customNote).trim() !== '';
    if (hasNotes) {
      const text = String(customNote);
      const newlines = (text.match(/\n/g) || []).length;
      const chars = text.length;
      const lines = Math.max(1, newlines + Math.ceil(chars / 45)); // 45 chars per line
      notesHeight = 10 + lines * 5;
      notesHeight = Math.max(25, notesHeight); // CSS min-height is 8em (~25mm)
    }
    
    return Math.max(totalsHeight, notesHeight) + 5; // include margin-top
  };

  const getFooterHeight = () => {
    if (config.showFooter) return 15;
    return 0;
  };

  const getItemHeight = (item: any) => {
    const mainName = item.product_name_fr || item.product_name_snapshot || '';
    const arabicName = item.product_name || '';
    const hasAr = arabicName && arabicName.trim() !== '' && arabicName !== mainName;
    
    // Estimate name cell line wrapping
    const chars = mainName.length;
    const nameLines = Math.max(1, Math.ceil(chars / 30)); // 30 characters fit in name column
    
    let itemH = 6 + nameLines * 4.5; // cell padding + text lines
    if (hasAr) {
      itemH += 4.0; // Arabic translation subtitle spacing
    }
    return itemH;
  };

  const headerH = getHeaderHeight();
  const customerH = getCustomerHeight();
  const legalH = getLegalHeight();
  const tableHeaderH = 8;
  const totalsAndNotesH = getTotalsAndNotesHeight();
  const footerH = getFooterHeight();

  // Helper validation: Simulates if remaining items fit in subsequent pages
  const canFitInNPages = (itemsList: any[], isFirstPage: boolean): boolean => {
    let idx = 0;
    let page = 1;
    while (idx < itemsList.length) {
      const isFirst = isFirstPage && page === 1;
      let lastPageHeight = (isFirst ? headerH + customerH + legalH : 0) + tableHeaderH + totalsAndNotesH + footerH;
      for (let i = idx; i < itemsList.length; i++) {
        lastPageHeight += getItemHeight(itemsList[i]);
      }
      if (lastPageHeight <= netHeight) {
        return true;
      }
      
      let pageHeight = (isFirst ? headerH + customerH + legalH : 0) + tableHeaderH;
      let itemsAdded = 0;
      while (idx < itemsList.length) {
        const itemH = getItemHeight(itemsList[idx]);
        if (itemsAdded > 0 && pageHeight + itemH > netHeight) {
          break;
        }
        pageHeight += itemH;
        idx++;
        itemsAdded++;
      }
      if (itemsAdded === 0) {
        return false;
      }
      page++;
    }
    return true;
  };

  // Step 1: Check if ALL items and totals fit on page 1
  let totalSinglePageHeight = headerH + customerH + legalH + tableHeaderH + totalsAndNotesH + footerH;
  for (const item of items) {
    totalSinglePageHeight += getItemHeight(item);
  }
  
  if (totalSinglePageHeight <= netHeight) {
    return [items];
  }

  // Step 2: Multi-page dynamic pagination loop
  const pages: any[][] = [];
  let currentIndex = 0;
  let pageNum = 1;

  while (currentIndex < items.length) {
    const isFirst = pageNum === 1;
    const currentOverhead = (isFirst ? headerH + customerH + legalH : 0) + tableHeaderH;
    
    // Check if remaining items fit on current page if it is the last page
    let lastPageHeight = currentOverhead + totalsAndNotesH + footerH;
    for (let i = currentIndex; i < items.length; i++) {
      lastPageHeight += getItemHeight(items[i]);
    }
    if (lastPageHeight <= netHeight) {
      pages.push(items.slice(currentIndex));
      break;
    }
    
    // Find max items that physically fit on the current page (without totals/footer)
    let maxK = 0;
    let pageHeight = currentOverhead;
    while (currentIndex + maxK < items.length) {
      const itemH = getItemHeight(items[currentIndex + maxK]);
      if (maxK > 0 && pageHeight + itemH > netHeight) {
        break;
      }
      pageHeight += itemH;
      maxK++;
    }
    
    // We must leave at least 1 item for subsequent pages if remaining > 1
    if (items.length - currentIndex > 1 && maxK >= items.length - currentIndex) {
      maxK = items.length - currentIndex - 1;
    }
    if (maxK === 0) {
      maxK = 1;
    }
    
    // Find optimal k from maxK down to 1
    let chosenK = 1;
    for (let k = maxK; k >= 1; k--) {
      if (canFitInNPages(items.slice(currentIndex + k), false)) {
        chosenK = k;
        break;
      }
    }
    
    pages.push(items.slice(currentIndex, currentIndex + chosenK));
    currentIndex += chosenK;
    pageNum++;
  }

  return pages;
};

export interface PrintConfig {
  showCompanyBlock: boolean; // Toggles all company info (Logo, Name, Activity, Phone, Address)
  showCompanyOfficialDetails: boolean; // Toggles all official legal data (RC, NIF, etc.)
  showCustomerBlock: boolean; // Toggles customer info card (Name & Phone)
  showInvoiceDetails: boolean; // Toggles the entire invoice metadata card
  showNotes: boolean; // Toggles notes visibility
  notesText?: string; // Stores direct note text from customizer input
  showFooter: boolean; // Toggles footer
  fontWeight?: 'normal' | 'medium' | 'bold'; // Adjust thickness of text (font-weight)
  fontWeightPercent?: number; // Custom font weight percentage (50% to 100%) for table text
  showCustomerPhone?: boolean; // Toggles customer phone number in printout
  showQuotationMode?: boolean; // Toggles quotation mode formatting
  itemsPerPage?: number; // Custom count of products printed per page
  compactFooter?: boolean; // Toggles compact horizontal totals and notes layout

  // Columns visibility toggled via right click on table headers
  showColBarcode: boolean;
  showColName: boolean;
  showColQty: boolean;
  showColUnit: boolean;
  showColDiscount: boolean;
  showColPrice: boolean;
  showColTotal: boolean;
}

export type PaperSize = 'A4' | 'A5' | '80mm';
export type TemplateType = 'receipt' | 'customer' | 'tax' | 'custom';

// Default configurations (use bold/heavy as base for premium readability)
export const DEFAULT_CONFIGS: Record<TemplateType, { config: PrintConfig; columns: string[]; size: PaperSize }> = {
  receipt: {
    size: '80mm',
    columns: ['index', 'name', 'quantity', 'price', 'total'],
    config: {
      showCompanyBlock: true,
      showCompanyOfficialDetails: false,
      showCustomerBlock: false,
      showInvoiceDetails: true,
      showNotes: true,
      notesText: '',
      showFooter: true,
      fontWeight: 'bold',
      fontWeightPercent: 80,
      showColBarcode: false,
      showColName: true,
      showColQty: true,
      showColUnit: false,
      showColDiscount: false,
      showColPrice: true,
      showColTotal: true,
      itemsPerPage: 0,
      compactFooter: false,
    }
  },
  customer: {
    size: 'A4',
    columns: ['index', 'barcode', 'name', 'quantity', 'price', 'total'],
    config: {
      showCompanyBlock: true,
      showCompanyOfficialDetails: false,
      showCustomerBlock: true,
      showInvoiceDetails: true,
      showNotes: true,
      notesText: '',
      showFooter: true,
      fontWeight: 'bold',
      fontWeightPercent: 80,
      showColBarcode: true,
      showColName: true,
      showColQty: true,
      showColUnit: false,
      showColDiscount: false,
      showColPrice: true,
      showColTotal: true,
      itemsPerPage: 0,
      compactFooter: false,
    }
  },
  tax: {
    size: 'A4',
    columns: ['index', 'barcode', 'name', 'quantity', 'unit', 'price', 'discount', 'total'],
    config: {
      showCompanyBlock: true,
      showCompanyOfficialDetails: true,
      showCustomerBlock: true,
      showInvoiceDetails: true,
      showNotes: true,
      notesText: '',
      showFooter: true,
      fontWeight: 'bold',
      fontWeightPercent: 80,
      showColBarcode: true,
      showColName: true,
      showColQty: true,
      showColUnit: true,
      showColDiscount: true,
      showColPrice: true,
      showColTotal: true,
      itemsPerPage: 0,
      compactFooter: false,
    }
  },
  custom: {
    size: 'A4',
    columns: ['index', 'barcode', 'name', 'quantity', 'price', 'total'],
    config: {
      showCompanyBlock: true,
      showCompanyOfficialDetails: true,
      showCustomerBlock: true,
      showInvoiceDetails: true,
      showNotes: true,
      notesText: '',
      showFooter: true,
      fontWeight: 'bold',
      fontWeightPercent: 80,
      showColBarcode: true,
      showColName: true,
      showColQty: true,
      showColUnit: false,
      showColDiscount: false,
      showColPrice: true,
      showColTotal: true,
      itemsPerPage: 0,
      compactFooter: false,
    }
  }
};

export const COLUMN_LABELS: Record<string, string> = {
  index: '#',
  barcode: 'الكود',
  name: 'المنتج/الوصف',
  quantity: 'الكمية',
  unit: 'الوحدة',
  discount: 'الخصم',
  price: 'السعر',
  total: 'الإجمالي',
};

// Embedded static inline SVG icons for paper printing (ensures offline reliability)
const svgFileText = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`;
const svgCalendar = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`;
const svgClock = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`;
const svgCreditCard = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`;
const svgUser = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
const svgPhone = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
const svgMapPin = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

const normalizeArabic = (str: string): string => {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^a-z0-9\u0621-\u064A]/gi, '');
};

/**
 * Generates the clean styled HTML string for an invoice or quotation.
 */
export function generateInvoiceHTML(
  invoice: any,
  settings: any,
  paperSize: PaperSize,
  templateType: TemplateType,
  config: PrintConfig,
  columnOrder: string[]
): string {
  if (!invoice) return '';

  const activeCols = columnOrder.filter(colId => {
    if (colId === 'index') return true;
    if (colId === 'barcode') return config.showColBarcode;
    if (colId === 'name') return config.showColName;
    if (colId === 'quantity') return config.showColQty;
    if (colId === 'unit') return config.showColUnit;
    if (colId === 'price') return config.showColPrice;
    if (colId === 'discount') return config.showColDiscount;
    if (colId === 'total') return config.showColTotal;
    return false;
  });

  const colStyles = (colId: string) => {
    if (colId === 'index') return 'width: 5%; text-align: center;';
    if (colId === 'barcode') return 'width: 14%; text-align: center;';
    if (colId === 'name') return 'width: 44%; text-align: right;';
    if (colId === 'quantity') return 'width: 9%; text-align: center;';
    if (colId === 'unit') return 'width: 7%; text-align: center;';
    if (colId === 'price') return 'width: 11%; text-align: center;';
    if (colId === 'discount') return 'width: 8%; text-align: center;';
    if (colId === 'total') return 'width: 13%; text-align: left; font-weight: var(--font-weight-bold);';
    return '';
  };

  const percent = config.fontWeightPercent !== undefined ? config.fontWeightPercent : 80;
  const mappedWeight = 400 + Math.round((percent - 50) * 10);
  const tableBaseWeight = String(Math.max(400, Math.min(900, mappedWeight)));
  const tableBoldWeight = String(Math.max(600, Math.min(900, mappedWeight + 200)));

  const cssStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
    * { box-sizing: border-box; }
    @page {
      margin: 0 !important;
    }
    html, body {
      width: ${paperSize === '80mm' ? '80mm' : paperSize === 'A5' ? '148mm' : '210mm'} !important;
      max-width: ${paperSize === '80mm' ? '80mm' : paperSize === 'A5' ? '148mm' : '210mm'} !important;
      margin: 0 !important;
      padding: 0 !important;
      background-color: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      overflow: visible !important;
    }

    @media print {
      .items-table tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .totals-and-notes {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .metadata-card, .info-section, .legal-grid {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
    
    .invoice-container {
      margin: 0 auto;
      background: #ffffff !important;
      font-family: 'Cairo', 'Tahoma', 'Segoe UI', Arial, sans-serif;
      direction: rtl;
      color: #1e293b !important;
      line-height: 1.4;
      --font-weight-base: 500;
      --font-weight-bold: 800;
    }

    .invoice-container {
      background-color: #ffffff !important;
      color: #1e293b !important;
      font-family: 'Cairo', 'Tahoma', 'Segoe UI', Arial, sans-serif !important;
      font-weight: var(--font-weight-base);
    }

    /* High readability local font for all numbers, tables, and official card values */
    .items-table,
    .totals-table,
    .metadata-card,
    .meta-val,
    .legal-box,
    .info-section {
      font-family: 'Cairo', 'Tahoma', 'Segoe UI', sans-serif !important;
    }

    /* Custom range slider font weight thickness applies SPECIFICALLY to table body cells (td) as requested */
    .items-table td,
    .totals-table td {
      font-weight: ${tableBaseWeight} !important;
    }

    .items-table td .product-title-main {
      font-weight: var(--font-weight-bold) !important;
    }

    .totals-table tr.remaining-bar td {
      font-weight: ${tableBoldWeight} !important;
    }

    .invoice-container td,
    .invoice-container th,
    .invoice-container p,
    .invoice-container div,
    .invoice-container span,
    .invoice-container table {
      border-color: #cbd5e1;
    }

    .invoice-container strong,
    .invoice-container th,
    .invoice-container th *,
    .invoice-container b,
    .invoice-container .font-bold {
      font-weight: var(--font-weight-bold) !important;
    }
    
    .size-A4 {
      width: 210mm;
      padding: 0;
      font-size: 13px;
    }

    .size-A5 {
      width: 148mm;
      padding: 0;
      font-size: 9.2px;
    }

    .size-80mm {
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 !important;
      padding: 0;
      font-size: 12px;
      font-weight: bold !important;
    }

    /* High-contrast Monochrome Printing Optimization for 80mm Thermal Paper */
    .size-80mm,
    .size-80mm * {
      color: #000000 !important;
      -webkit-font-smoothing: none !important;
      -moz-osx-font-smoothing: none !important;
      font-smoothing: none !important;
      text-rendering: optimizeSpeed !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }

    .size-80mm table,
    .size-80mm th,
    .size-80mm td,
    .size-80mm div,
    .size-80mm span,
    .size-80mm hr {
      border-color: #000000 !important;
    }

    .print-page {
      position: relative;
      width: 100%;
      height: ${paperSize === '80mm' ? 'auto' : paperSize === 'A5' ? '210mm' : '297mm'};
      ${paperSize !== '80mm' ? `max-height: ${paperSize === 'A5' ? '210mm' : '297mm'} !important; overflow: hidden !important;` : ''}
      box-sizing: border-box;
      padding: ${paperSize === '80mm' ? '5mm 4.5mm' : paperSize === 'A5' ? '8mm 6mm' : '10mm 8mm'};
      background-color: #ffffff !important;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      ${paperSize !== '80mm' ? 'border-top: 5px solid #3b82f6 !important;' : ''}
    }
    .print-page:last-child {
      page-break-after: avoid;
    }
    .page-content-top {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      width: 100%;
    }
    .page-content-bottom {
      width: 100%;
      margin-top: auto;
    }
    
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1.2em;
    }

    .header-logo {
      height: 5.5em;
      width: 5.5em;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #cbd5e1 !important;
    }

    .logo-container {
      display: inline-block;
    }

    .shop-title {
      font-size: 2.2em;
      font-weight: 900 !important;
      color: #0f172a !important;
      margin: 0;
      line-height: 1.1;
    }

    .shop-subtitle {
      font-size: 1em;
      color: #3b82f6 !important;
      margin-top: 0.2em;
      margin-bottom: 0.4em;
      font-weight: var(--font-weight-bold) !important;
    }

    .size-80mm .shop-title {
      font-size: 1.4em;
      text-align: center;
    }

    .size-80mm .logo-container {
      text-align: center;
    }

    .metadata-card {
      border: 1px solid #cbd5e1 !important;
      border-top: 3px solid #3b82f6 !important;
      background-color: #ffffff !important;
      border-radius: 0.8em;
      padding: 0 !important;
      width: 100%;
      max-width: 18em;
      display: inline-block;
      overflow: hidden;
    }

    .size-80mm .metadata-card,
    .size-A5 .metadata-card {
      max-width: 100% !important;
      width: 100% !important;
      display: block !important;
    }

    .metadata-card * {
      background-color: #ffffff !important;
    }

    .meta-row {
      border-bottom: 1px solid #e2e8f0;
    }
    .meta-row:last-child {
      border-bottom: none;
    }

    .meta-val {
      font-family: 'Cairo', Arial, sans-serif;
    }

    .info-section {
      background-color: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 0.8em;
      padding: 0.7em 1.2em;
      margin-bottom: 1.2em;
      width: 100%;
    }

    .info-section * {
      background-color: #ffffff !important;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border: 1px solid #cbd5e1 !important;
      border-radius: 0.8em;
      overflow: hidden;
      margin-bottom: 1.2em;
    }

    .items-table th {
      background-color: #f8fafc !important;
      color: #0f172a !important;
      border-bottom: 4px double #3b82f6 !important;
      border-left: 1px solid #cbd5e1 !important;
      padding: 0.75em 0.65em !important;
      font-size: 0.95em;
    }
    
    .items-table th:last-child {
      border-left: none !important;
    }
    
    .items-table th * {
      background-color: #f1f5f9 !important;
      color: #0f172a !important;
    }

    .items-table td {
      border-bottom: 1px solid #e2e8f0 !important;
      border-left: 1px solid #cbd5e1 !important;
      padding: 0.55em 0.6em;
      vertical-align: middle;
    }
    
    .items-table td:last-child {
      border-left: none !important;
    }
    
    .items-table tr:last-child td {
      border-bottom: none !important;
    }

    .items-table tr {
      background-color: #ffffff !important;
    }

    .items-table tr:nth-child(even) td {
      background-color: #f8fafc !important;
    }

    .size-80mm .items-table {
      border-radius: 0.4em;
    }

    .size-80mm .items-table th {
      padding: 0.35em 0.1em;
      font-size: 0.8em;
      background-color: transparent !important;
      color: #1e293b !important;
      border-bottom: 1px dashed #000 !important;
      border-left: none !important;
    }
    
    .size-80mm .items-table th * {
      background-color: transparent !important;
      color: #1e293b !important;
    }

    .size-80mm .items-table td {
      padding: 0.5em 0.1em;
      font-size: 0.85em;
      border-bottom: 1px dashed #eee !important;
      border-left: none !important;
    }

    /* Side-by-side notes and totals layout */
    .totals-and-notes {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5em;
      margin-top: 0.8em;
      width: 100%;
    }

    .totals-and-notes .notes-block {
      flex: 1;
      min-width: 0;
    }

    .totals-and-notes .totals-block {
      width: 22em;
      flex-shrink: 0;
      margin-right: auto !important;
    }

    .size-80mm .totals-and-notes {
      display: block;
    }

    .size-80mm .totals-and-notes .totals-block {
      width: 100%;
      margin-right: 0 !important;
    }

    .totals-table {
      width: 100%;
      border-collapse: separate !important;
      border-spacing: 0 !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 0.8em !important;
      overflow: hidden !important;
    }

    /* Crisp grid borders for the totals table */
    .totals-table td {
      padding: 0.6em 0.8em;
      font-size: 0.95em;
      background-color: #ffffff !important;
      border-bottom: 1px solid #cbd5e1 !important;
      border-left: 1px solid #cbd5e1 !important;
    }

    .totals-table td:last-child {
      border-left: none !important;
    }

    .totals-table tr:last-child td {
      border-bottom: none !important;
    }

    /* Clean high-contrast row for final total remaining (SPECIFICITY RESISTANT) */
    .invoice-container tr.remaining-bar,
    .invoice-container tr.remaining-bar td {
      background-color: #f1f5f9 !important;
      color: #0f172a !important;
      border-top: 2px solid #0f172a !important;
      border-bottom: 4px double #0f172a !important;
      border-left: none !important;
    }

    .size-80mm .totals-table tr.grand-total td {
      font-size: 1.1em;
    }

    /* Dashed horizontal divider for footer as requested */
    .invoice-footer {
      margin-top: 2em;
      border-top: 2px dashed #94a3b8 !important;
      padding-top: 1em;
      text-align: center;
      color: #64748b !important;
      font-size: 0.85em;
    }

    .size-80mm .invoice-footer {
      border-top: 2px dashed #94a3b8 !important;
      margin-top: 1.2em;
      padding-top: 0.6em;
      font-size: 0.8em;
    }

    /* Monochrome and Bold Overrides for Thermal Print */
    .size-80mm,
    .size-80mm * {
      color: #000000 !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      font-weight: bold !important; /* Force thick text to prevent thermal fade/erosion */
      -webkit-font-smoothing: none !important;
      -moz-osx-font-smoothing: none !important;
      font-smoothing: none !important;
      text-rendering: optimizeSpeed !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }

    .size-80mm table,
    .size-80mm th,
    .size-80mm td,
    .size-80mm div,
    .size-80mm span,
    .size-80mm hr {
      border-color: #000000 !important;
    }



    .size-80mm table.items-table th {
      border-bottom: 2px solid #000000 !important;
      border-top: 1px solid #000000 !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #000000 !important;
      padding: 0.35em 0.1em !important;
      font-size: 0.85em !important;
    }

    /* Vertical Stacking of Customer & Phone Info for Roll paper */
    .size-80mm .info-section {
      padding: 0.4em !important;
      margin-bottom: 0.8em !important;
      border: 1px solid #000000 !important;
    }
    .size-80mm .info-table,
    .size-80mm .info-section table,
    .size-80mm .info-section tbody,
    .size-80mm .info-section tr {
      display: block !important;
      width: 100% !important;
    }
    .size-80mm .info-table td,
    .size-80mm .info-section td {
      display: block !important;
      width: 100% !important;
      text-align: right !important;
      padding: 0.3em 0 !important;
      border: none !important;
      direction: rtl !important;
    }
    .size-80mm .info-table td strong,
    .size-80mm .info-section td strong {
      font-size: 0.95em !important;
      font-weight: bold !important;
      display: inline-block !important;
      flex-shrink: 0 !important;
      min-width: 4.5em !important;
      color: #000000 !important;
    }
    .size-80mm .info-table td span,
    .size-80mm .info-section td span {
      font-size: 1em !important;
      font-weight: bold !important;
      margin-right: 0.4em !important;
      color: #000000 !important;
      display: inline-block !important;
    }
    /* React layout specific handles for inner flex components inside td */
    .size-80mm .info-section td span.flex {
      display: flex !important;
      justify-content: flex-start !important;
      width: 100% !important;
      direction: rtl !important;
    }
  `;

  const isQuotation = !!config.showQuotationMode;
  const isTax = templateType === 'tax';
  let mainTitle = 'وصل بيع';
  if (isQuotation) mainTitle = 'عرض سعر';
  else if (isTax) mainTitle = 'فاتورة ضريبية';
  else if (templateType === 'customer') mainTitle = 'فاتورة عميل';

  const da = (val: number) => {
    return `${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ج`;
  };

  const numOnly = (val: number) => {
    return (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const baseSize = parseInt(settings?.logo_size || '80', 10);
  const logoScale = paperSize === 'A5' ? 0.72 : paperSize === '80mm' ? 0.65 : 1.0;
  const logoSizePx = `${Math.round(baseSize * logoScale)}px`;
  
  const logoShape = settings?.logo_shape || 'circle';
  const logoShapeRadius = logoShape === 'circle' ? '50%' : '12px';
  
  const logoOpacity = parseFloat(settings?.logo_opacity || '100');
  const logoOpacityVal = String(logoOpacity / 100);
  
  const logoGrayscale = settings?.logo_grayscale === 'true';
  const logoGrayscaleFilter = logoGrayscale ? 'grayscale(100%)' : 'none';
  
  const logoPosition = settings?.logo_position || 'right';

  const logoX = parseInt(settings?.logo_x || '0', 10);
  const logoY = parseInt(settings?.logo_y || '0', 10);
  const scaledX = Math.round(logoX * logoScale);
  const scaledY = Math.round(logoY * logoScale);

  const isDragged = logoX !== 0 || logoY !== 0;

  let logoStyleStr = `width: ${logoSizePx}; height: ${logoSizePx}; opacity: ${logoOpacityVal}; filter: ${logoGrayscaleFilter}; border-radius: ${logoShapeRadius}; overflow: hidden; display: inline-block; transition: transform 0.1s ease;`;

  if (isDragged) {
    const transformStr = logoPosition === 'center'
      ? `transform: translate(-50%, 0) translate(${scaledX}px, ${scaledY}px);`
      : `transform: translate(${scaledX}px, ${scaledY}px);`;
      
    const alignmentCoords = logoPosition === 'right' ? 'right: 1.5em; top: 1em;' :
                            logoPosition === 'left' ? 'left: 1.5em; top: 1em;' :
                            'left: 50%; top: 1em;';
                            
    logoStyleStr += ` position: absolute !important; z-index: 50; ${alignmentCoords} ${transformStr}`;
  } else {
    logoStyleStr += ` transform: translate(${scaledX}px, ${scaledY}px);`;
  }

  const logoHTML = settings?.store_logo
    ? `<div class="logo-container" style="${logoStyleStr}">
        <img class="header-logo" src="${settings.store_logo}" alt="Logo" style="width: 100%; height: 100%; object-fit: cover; border: 2px solid #cbd5e1 !important; border-radius: ${logoShapeRadius};" />
       </div>`
    : '';

  const logoHTMLInline = (logoHTML && !isDragged) ? logoHTML : '';
  const logoHTMLAbsolute = (logoHTML && isDragged) ? logoHTML : '';

  const secondaryLogo = settings?.secondary_logo || '';
  const baseSecondaryLogoSize = parseInt(settings?.secondary_logo_size || '80', 10);
  const secondaryLogoSizePx = `${Math.round(baseSecondaryLogoSize * logoScale)}px`;
  const secondaryLogoShape = settings?.secondary_logo_shape || 'circle';
  const secondaryLogoShapeRadius = secondaryLogoShape === 'circle' ? '50%' : '12px';
  const secondaryLogoOpacity = parseFloat(settings?.secondary_logo_opacity || '100');
  const secondaryLogoOpacityVal = String(secondaryLogoOpacity / 100);
  const secondaryLogoGrayscale = settings?.secondary_logo_grayscale === 'true';
  const secondaryLogoGrayscaleFilter = secondaryLogoGrayscale ? 'grayscale(100%)' : 'none';
  
  const secondaryLogoX = parseInt(settings?.secondary_logo_x || '0', 10);
  const secondaryLogoY = parseInt(settings?.secondary_logo_y || '0', 10);
  const scaledSecX = Math.round(secondaryLogoX * logoScale);
  const scaledSecY = Math.round(secondaryLogoY * logoScale);

  const secondaryLogoStyleStr = `position: absolute; z-index: 50; width: ${secondaryLogoSizePx}; height: ${secondaryLogoSizePx}; opacity: ${secondaryLogoOpacityVal}; filter: ${secondaryLogoGrayscaleFilter}; border-radius: ${secondaryLogoShapeRadius}; overflow: hidden; transform: translate(${scaledSecX}px, ${scaledSecY}px); transition: transform 0.1s ease; left: 1.5em; top: 1em; pointer-events: none;`;

  // Compact Horizontal Official Details Card (RC, NIF, NIS...)
  const hasRc = settings?.company_rc && isEnabled('company_rc_enabled', settings);
  const hasNif = settings?.company_nif && isEnabled('company_nif_enabled', settings);
  const hasNis = settings?.company_nis && isEnabled('company_nis_enabled', settings);
  const hasArt = settings?.company_art && isEnabled('company_art_enabled', settings);
  const hasCb = settings?.company_cb && isEnabled('company_cb_enabled', settings);

  let legalHTML = '';
  if (config.showCompanyOfficialDetails && (hasRc || hasNif || hasNis || hasArt || hasCb)) {
    const legalItems = [];
    if (hasRc) legalItems.push({ label: 'سجل تجاري (RC)', val: settings.company_rc });
    if (hasNif) legalItems.push({ label: 'رقم جبائي (NIF)', val: settings.company_nif });
    if (hasNis) legalItems.push({ label: 'رقم إحصائي (NIS)', val: settings.company_nis });
    if (hasArt) legalItems.push({ label: 'رقم المادة (Art)', val: settings.company_art });
    if (hasCb) legalItems.push({ label: 'الحساب البنكي (CB)', val: settings.company_cb });

    legalHTML += `
      <div style="margin-bottom: 1.2em; border: 1px solid #cbd5e1 !important; border-radius: 0.8em; overflow: hidden; background-color: #ffffff !important;" dir="rtl">
        <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 11px;">
          <thead>
            <tr style="border-bottom: 1px solid #cbd5e1 !important;">
              ${legalItems.map((item, idx) => `
                <th style="padding: 0.5em 0.7em; font-weight: bold; ${idx < legalItems.length - 1 ? 'border-left: 1px solid #cbd5e1 !important;' : ''} color: #0f172a !important; background-color: #f1f5f9 !important; text-align: center;">
                  ${item.label}
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              ${legalItems.map((item, idx) => `
                <td class="meta-val" style="padding: 0.6em 0.7em; font-weight: bold; ${idx < legalItems.length - 1 ? 'border-left: 1px solid #cbd5e1 !important;' : ''} color: #1e293b !important; font-family: monospace; text-align: center;">
                  ${item.val}
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // Shop Details & Circular Logo Correct Placement (RTL Logo FAR RIGHT, Text to its LEFT)
  let companyDetailsHTML = '';
  if (config.showCompanyBlock) {
    if (logoPosition === 'center') {
      companyDetailsHTML += `
        <div style="width: 100%; text-align: center; margin-bottom: 0.6em; direction: rtl;">
          ${logoHTMLInline ? `<div style="margin-bottom: 0.8em; display: flex; justify-content: center; width: 100%;">${logoHTMLInline}</div>` : ''}
          <div style="width: 100%;">
            ${settings?.company_name ? `<div class="shop-title" style="text-align: center !important; margin: 0 auto !important;">${settings.company_name}</div>` : ''}
            <div class="shop-subtitle" style="text-align: center !important; margin-top: 0.2em !important; margin-bottom: 0.4em !important; font-weight: var(--font-weight-bold) !important;">${settings?.company_activity && settings?.company_activity !== 'false' ? settings.company_activity : 'قطع غيار السيارات والزيوت والإطارات'}</div>
            ${settings?.company_phone ? `
              <div class="meta-item" style="font-size: 0.95em; margin-bottom: 0.25em; text-align: center !important; display: flex; align-items: center; justify-content: center; gap: 0.4em; direction: rtl;">
                <strong style="display: flex; align-items: center; gap: 0.2em; flex-shrink: 0;">${svgPhone} الهاتف:</strong>
                <span class="meta-val" style="font-family: 'JetBrains Mono', monospace !important; direction: ltr; unicode-bidi: embed; font-weight: var(--font-weight-bold);">${settings.company_phone}</span>
              </div>
            ` : ''}
            ${settings?.company_address ? `<div class="meta-item" style="font-size: 0.95em; color: #475569; text-align: center !important; display: flex; align-items: center; justify-content: center; gap: 0.3em;">${svgMapPin} العنوان: ${settings.company_address}</div>` : ''}
          </div>
        </div>
      `;
    } else {
      const floatVal = logoPosition === 'left' ? 'left' : 'right';
      const marginVal = logoPosition === 'left' ? '0 15px 10px 0' : '0 0 10px 15px';
      const shapeOutsideVal = logoShape === 'circle' ? 'circle(50%)' : 'none';
      
      companyDetailsHTML += `
        <div style="width: 100%; text-align: right; min-height: ${logoSizePx}; direction: rtl;">
          ${logoHTMLInline ? `
            <div class="logo-container" style="float: ${floatVal}; shape-outside: ${shapeOutsideVal}; shape-margin: 12px; margin: ${marginVal}; width: ${logoSizePx}; height: ${logoSizePx}; opacity: ${logoOpacityVal}; filter: ${logoGrayscaleFilter}; border-radius: ${logoShapeRadius}; overflow: hidden;">
              <img class="header-logo" src="${settings.store_logo}" alt="Logo" style="width: 100%; height: 100%; object-fit: cover; border: 2px solid #cbd5e1 !important; border-radius: ${logoShapeRadius};" />
            </div>
          ` : ''}
          <div class="company-text-content" style="${logoPosition !== 'right' ? 'border-right: 4px solid #3b82f6; padding-right: 12px;' : ''}">
            ${settings?.company_name ? `<h1 class="shop-title" style="margin: 0; line-height: 1.2;">${settings.company_name}</h1>` : ''}
            <div class="shop-subtitle" style="margin-top: 0.2em; margin-bottom: 0.4em; font-weight: var(--font-weight-bold);">${settings?.company_activity && settings?.company_activity !== 'false' ? settings.company_activity : 'قطع غيار السيارات والزيوت والإطارات'}</div>
            ${settings?.company_phone ? `
              <div style="display: flex; align-items: center; justify-content: flex-start; gap: 0.4em; direction: rtl; margin-bottom: 0.25em;">
                <strong style="display: flex; align-items: center; gap: 0.2em; flex-shrink: 0; color: #1e293b;">${svgPhone} الهاتف:</strong>
                <span class="meta-val" style="font-family: 'JetBrains Mono', monospace !important; direction: ltr; unicode-bidi: embed; font-weight: var(--font-weight-bold);">${settings.company_phone}</span>
              </div>
            ` : ''}
            ${settings?.company_address ? `
              <p style="margin: 0; font-size: 0.95em; color: #475569; text-align: right;">
                <span style="display: inline-block; vertical-align: middle;">${settings.company_address}</span>
                <span style="display: inline-block; vertical-align: middle; margin-right: 4px; color: #94a3b8;">${svgMapPin}</span>
                <span style="display: inline-block; vertical-align: middle; margin-right: 4px;">العنوان:</span>
              </p>
            ` : ''}
          </div>
        </div>
      `;
    }
  }

  // Horizontal client data card - name and phone in same row (RTL elegant)
  let customerInfoHTML = '';
  const isGeneral = isGeneralCustomer(invoice.customer_name);
  if (config.showCustomerBlock && !isGeneral) {
    customerInfoHTML += `
      <div class="info-section" style="border: 1px solid #cbd5e1 !important;">
        <table class="info-table">
          <tr>
            <td style="border: none !important; text-align: right; padding: 0.2em 0.5em; vertical-align: middle; width: 55%;">
              <strong style="font-size: 0.9em; vertical-align: middle; display: inline-block; flex-shrink: 0;">${svgUser} العميل:</strong>
              <span style="font-weight: var(--font-weight-bold); font-size: 1.1em; margin-right: 0.4em; vertical-align: middle;">${invoice.customer_name}</span>
            </td>
            <td style="border: none !important; padding: 0.2em 0.5em; vertical-align: middle; width: 45%;">
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.4em; direction: rtl;">
                <strong style="display: flex; align-items: center; gap: 0.2em; flex-shrink: 0; font-size: 0.9em;">${svgPhone} الهاتف:</strong>
                <span class="meta-val" style="font-family: 'JetBrains Mono', monospace !important; direction: ltr; unicode-bidi: embed; font-weight: var(--font-weight-bold); font-size: 1.1em;">${invoice.customer_phone || '—'}</span>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  let tableHeaderHTML = '<tr>';
  activeCols.forEach(colId => {
    tableHeaderHTML += `<th style="${colStyles(colId)}">${COLUMN_LABELS[colId]}</th>`;
  });
  tableHeaderHTML += '</tr>';

  /* tableBodyHTML removed in favor of pagination loop */

  let totalsRowsHTML = '';
  if (!isQuotation) {
    const hasDiscount = invoice.global_discount_amount > 0;
    const hasTax = invoice.tax_amount > 0;

    // Subtotal removed per user request
    if (hasDiscount) {
      totalsRowsHTML += `
        <tr>
          <td style="color: #ef4444; font-weight: var(--font-weight-bold);">الخصم:</td>
          <td style="text-align: left; color: #ef4444; font-weight: var(--font-weight-bold);">${da(invoice.global_discount_amount)}</td>
        </tr>
      `;
    }
    if (hasTax) {
      totalsRowsHTML += `
        <tr>
          <td style="color: #475569; font-weight: var(--font-weight-bold);">الضريبة (${invoice.tax_percent}%):</td>
          <td style="text-align: left; font-weight: var(--font-weight-bold);">${da(invoice.tax_amount)}</td>
        </tr>
      `;
    }
    
    totalsRowsHTML += `
      <tr>
        <td style="color: #10b981; font-size: 0.9em; font-weight: var(--font-weight-bold);">المدفوع:</td>
        <td style="text-align: left; font-size: 0.9em; color: #10b981; font-weight: var(--font-weight-bold);">${da(invoice.paid)}</td>
      </tr>
      <tr>
        <td style="color: #64748b; font-size: 0.9em; font-weight: var(--font-weight-bold);">المبلغ المتبقي:</td>
        <td style="text-align: left; font-size: 0.9em; font-weight: var(--font-weight-bold);">${da(invoice.remaining)}</td>
      </tr>
      <tr class="remaining-bar">
        <td style="border-top-right-radius: 0.6em; border-bottom-right-radius: 0.6em; padding: 0.6em 0.8em; font-weight: var(--font-weight-bold);">المجموع الإجمالي:</td>
        <td style="text-align: left; border-top-left-radius: 0.6em; border-bottom-left-radius: 0.6em; padding: 0.6em 0.8em; font-weight: var(--font-weight-bold);">${da(invoice.total)}</td>
      </tr>
    `;
  } else {
    totalsRowsHTML += `
      <tr class="remaining-bar">
        <td style="border-top-right-radius: 0.6em; border-bottom-right-radius: 0.6em; padding: 0.6em 0.8em; font-weight: var(--font-weight-bold);">الإجمالي التقديري:</td>
        <td style="text-align: left; border-top-left-radius: 0.6em; border-bottom-left-radius: 0.6em; padding: 0.6em 0.8em; font-weight: var(--font-weight-bold);">${da(invoice.total)}</td>
      </tr>
    `;
  }

  // Custom live note text check
  const customNote = config.notesText !== undefined && config.notesText !== '' ? config.notesText : invoice.notes;
  const hasNotes = config.showNotes && customNote && String(customNote).trim() !== '';

  let notesBlockHTML = '';
  if (hasNotes) {
    notesBlockHTML += `
      <div style="border: 1px solid #cbd5e1 !important; border-radius: 0.8em; padding: 0.8em 1.1em; background-color: #ffffff !important; height: 100%; min-height: 8em; display: flex; flex-direction: column;">
        <div style="font-weight: var(--font-weight-bold); font-size: 1.05em; color: #0f172a !important; border-bottom: 1px solid #e2e8f0 !important; padding-bottom: 0.3em; margin-bottom: 0.4em; display: flex; align-items: center; gap: 0.3em;">
          ${svgFileText}
          <span>ملاحظة:</span>
        </div>
        <div style="font-size: 0.95em; color: #334155 !important; line-height: 1.5; white-space: pre-wrap;">${customNote}</div>
      </div>
    `;
  }

  // Side by side totals and notes flex wrapper or compact horizontal bar
  let totalsAndNotesHTML = '';
  const isCompact = config.compactFooter || (invoice.items && invoice.items.length > 17);
  if (isCompact) {
    const hasDiscount = invoice.global_discount_amount > 0;
    const hasTax = invoice.tax_amount > 0;
    totalsAndNotesHTML = `
      <div style="width: 100%; display: flex; flex-direction: column; gap: 5px; margin-top: 0.5em; font-family: 'Tahoma', sans-serif !important;">
        ${hasNotes ? `
          <div style="border: 1px solid #cbd5e1 !important; border-radius: 0.5em; padding: 0.4em 0.8em; background-color: #ffffff !important; font-size: 10.5px; text-align: right; color: #334155 !important;">
            <strong>ملاحظة:</strong> ${customNote}
          </div>
        ` : ''}
        
        <div style="border: 1px solid #cbd5e1 !important; border-radius: 0.5em; padding: 0.45em 0.8em; background-color: #f8fafc !important; font-size: 10.5px; width: 100%; direction: rtl; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px;">
          ${hasDiscount ? `<div style="white-space: nowrap;"><strong style="color: #ef4444;">الخصم:</strong> <span class="meta-val" style="color: #ef4444;">${da(invoice.global_discount_amount)}</span></div>` : ''}
          ${hasTax ? `<div style="white-space: nowrap;"><strong>الضريبة (${invoice.tax_percent}%):</strong> <span class="meta-val">${da(invoice.tax_amount)}</span></div>` : ''}
          <div style="white-space: nowrap;"><strong style="color: #10b981;">المدفوع:</strong> <span class="meta-val" style="color: #10b981;">${da(invoice.paid)}</span></div>
          <div style="white-space: nowrap;"><strong>المتبقي:</strong> <span class="meta-val">${da(invoice.remaining)}</span></div>
          <div style="background-color: #f1f5f9 !important; color: #0f172a !important; border: 1px solid #cbd5e1 !important; padding: 0.25em 0.7em; border-radius: 0.35em; white-space: nowrap;">
            <strong>${isQuotation ? 'الإجمالي التقديري' : 'المجموع الإجمالي'}:</strong> <span class="meta-val" style="font-weight: bold; color: #0f172a !important;">${da(invoice.total)}</span>
          </div>
        </div>
      </div>
    `;
  } else {
    totalsAndNotesHTML = `
      <div class="totals-and-notes">
        <div class="notes-block">
          ${notesBlockHTML}
        </div>
        <div class="totals-block">
          <table class="totals-table">
            ${totalsRowsHTML}
          </table>
        </div>
      </div>
    `;
  }

  let footerHTML = '';
  if (config.showFooter) {
    const footerText = isQuotation
      ? 'عرض السعر هذا صالح لمدة 15 يوماً من تاريخ الإصدار. نشكركم على اهتمامكم بخدماتنا.'
      : (settings?.receipt_footer || 'شكراً لزيارتكم، البضاعة المباعة لا ترد ولا تستبدل بعد 24 ساعة.');
    
    footerHTML += `
      <div class="invoice-footer">
        <p>${footerText}</p>
        <p style="margin-top: 4px; font-size: 8px; font-family: monospace; opacity: 0.6;">Powered by YK MS ERP • v1.0.0</p>
      </div>
    `;
  }

  // Multi-row metadata table inside metadata card (No top mainTitle header)
  const metadataCardHTML = `
    <div class="metadata-card" style="margin: 0 auto; max-width: 100%; width: 100%; box-sizing: border-box; padding: 0 !important; overflow: hidden; border-top: 3px solid #3b82f6 !important;">
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <tr class="meta-row" style="border-bottom: 1px solid #e2e8f0 !important;">
          <td style="padding: 0.55em 0.7em; text-align: left; vertical-align: middle; white-space: nowrap;">
            <span class="meta-val" style="font-size: 1.05em; font-weight: var(--font-weight-bold); color: #1e3a8a; font-family: monospace; white-space: nowrap;">${invoice.invoice_number}</span>
          </td>
          <td style="padding: 0.55em 0.7em; text-align: right; vertical-align: middle; white-space: nowrap; color: #64748b; font-size: 0.9em; font-weight: var(--font-weight-bold);">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; white-space: nowrap; direction: rtl;">
              <span>رقم الفاتورة</span>
              ${svgFileText}
            </div>
          </td>
        </tr>
        <tr class="meta-row" style="border-bottom: 1px solid #e2e8f0 !important;">
          <td style="padding: 0.55em 0.7em; text-align: left; vertical-align: middle; white-space: nowrap;">
            <span class="meta-val" style="font-size: 0.95em; font-weight: var(--font-weight-bold); white-space: nowrap;">${invoice.date}</span>
          </td>
          <td style="padding: 0.55em 0.7em; text-align: right; vertical-align: middle; white-space: nowrap; color: #64748b; font-size: 0.9em; font-weight: var(--font-weight-bold);">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; white-space: nowrap; direction: rtl;">
              <span>التاريخ</span>
              ${svgCalendar}
            </div>
          </td>
        </tr>
        ${invoice.time ? `
        <tr class="meta-row" style="border-bottom: 1px solid #e2e8f0 !important;">
          <td style="padding: 0.55em 0.7em; text-align: left; vertical-align: middle; white-space: nowrap;">
            <span class="meta-val" style="font-size: 0.95em; font-weight: var(--font-weight-bold); white-space: nowrap;">${invoice.time}</span>
          </td>
          <td style="padding: 0.55em 0.7em; text-align: right; vertical-align: middle; white-space: nowrap; color: #64748b; font-size: 0.9em; font-weight: var(--font-weight-bold);">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; white-space: nowrap; direction: rtl;">
              <span>الوقت</span>
              ${svgClock}
            </div>
          </td>
        </tr>
        ` : ''}
        <tr class="meta-row" style="border-bottom: none !important;">
          <td style="padding: 0.55em 0.7em; text-align: left; vertical-align: middle; white-space: nowrap;">
            <span class="meta-val" style="font-size: 0.95em; font-weight: var(--font-weight-bold); white-space: nowrap;">نقدي</span>
          </td>
          <td style="padding: 0.55em 0.7em; text-align: right; vertical-align: middle; white-space: nowrap; color: #64748b; font-size: 0.9em; font-weight: var(--font-weight-bold);">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; white-space: nowrap; direction: rtl;">
              <span>طريقة الدفع</span>
              ${svgCreditCard}
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;

  let headerHTML = '';

  if (paperSize === '80mm') {
    // Elegant fully-stacked centered layout for narrow 80mm thermal receipt
    headerHTML = `
      <div style="text-align: center; margin-bottom: 1.2em; padding-bottom: 0.8em; border-bottom: 1px dashed #cbd5e1 !important; width: 100%; position: relative;">
        ${logoHTMLAbsolute}
        ${config.showCompanyBlock && logoHTMLInline ? `<div style="margin-bottom: 0.6em; text-align: center;">${logoHTMLInline}</div>` : ''}
        ${config.showCompanyBlock ? `
          <div style="text-align: center; margin-bottom: 0.8em;">
            ${settings?.company_name ? `<div class="shop-title" style="font-size: 1.4em !important;">${settings.company_name}</div>` : ''}
            <div class="shop-subtitle" style="font-size: 0.85em !important; margin-bottom: 0.3em; color: #3b82f6 !important;">${settings?.company_activity && settings?.company_activity !== 'false' ? settings.company_activity : 'قطع غيار السيارات والزيوت والإطارات'}</div>
            ${settings?.company_phone ? `
              <div style="font-size: 0.85em; margin-bottom: 0.15em; display: flex; align-items: center; justify-content: center; gap: 0.3em; direction: rtl;">
                <strong>الهاتف:</strong>
                <span class="meta-val" style="font-family: 'JetBrains Mono', monospace !important; direction: ltr; unicode-bidi: embed;">${settings.company_phone}</span>
              </div>
            ` : ''}
            ${settings?.company_address ? `<div style="font-size: 0.8em; color: #64748b;">العنوان: ${settings.company_address}</div>` : ''}
          </div>
        ` : ''}
        ${config.showInvoiceDetails ? `
          <div style="width: 100%; border-top: 1px dashed #cbd5e1; padding-top: 0.8em; margin-top: 0.8em;">
            ${metadataCardHTML}
          </div>
        ` : ''}
      </div>
    `;
  } else {
    // RTL-Correct: FIRST child is Company Block (renders right), SECOND child is Metadata card (renders left)
    headerHTML = config.showInvoiceDetails ? `
      <div style="position: relative; width: 100%; border-bottom: 2px dashed #cbd5e1 !important; padding-bottom: 1em; margin-bottom: 1.2em;">
        ${logoHTMLAbsolute}
        <table class="header-table" style="width: 100%; border-collapse: collapse; margin-bottom: 0;">
          <tr>
            <td style="vertical-align: bottom; width: ${paperSize === 'A5' ? '55%' : '60%'}; border: none !important; padding: 0;">
              ${companyDetailsHTML}
            </td>
            <td style="vertical-align: bottom; width: ${paperSize === 'A5' ? '45%' : '40%'}; border: none !important; padding: 0; padding-right: 1.0em;">
              ${metadataCardHTML}
            </td>
          </tr>
        </table>
      </div>
    ` : `
      <div style="position: relative; width: 100%; border-bottom: 2px dashed #cbd5e1 !important; padding-bottom: 1em; margin-bottom: 1.2em;">
        ${logoHTMLAbsolute}
        <table class="header-table" style="width: 100%; border-collapse: collapse; margin-bottom: 0;">
          <tr>
            <td style="vertical-align: top; width: 100%; border: none !important; padding: 0;">
              ${companyDetailsHTML}
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  const paginatedPages = paginateItems(invoice.items || [], paperSize, config, settings, invoice);

  let pagesHTML = '';
  paginatedPages.forEach((pageItems, pageIdx) => {
    const isFirstPage = pageIdx === 0;
    const isLastPage = pageIdx === paginatedPages.length - 1;

    let startIndex = 0;
    for (let i = 0; i < pageIdx; i++) {
      startIndex += paginatedPages[i].length;
    }

    let tableBodyHTML = '';
    pageItems.forEach((item: any, idx: number) => {
      tableBodyHTML += '<tr>';
      activeCols.forEach(colId => {
        let val = '';
        if (colId === 'index') val = String(startIndex + idx + 1);
        else if (colId === 'barcode') val = item.product_barcode_snapshot || '-';
        else if (colId === 'name') {
          const mainName = item.product_name_fr || item.product_name_snapshot || '';
          const arabicName = item.product_name || '';
          const showAr = arabicName && normalizeArabic(arabicName) !== normalizeArabic(mainName);
          val = `
            <div>
              <div class="product-title-main" style="font-size: 1.05em; color: #0f172a; line-height: 1.2;">
                ${mainName}
              </div>
              ${showAr ? `
                <div class="product-title-arabic" style="font-weight: normal; font-size: 0.85em; color: #64748b; margin-top: 2px;">
                  ${arabicName}
                </div>
              ` : ''}
            </div>
          `;
        }
        else if (colId === 'quantity') val = `${item.quantity}`;
        else if (colId === 'unit') val = item.unit || 'قطع';
        else if (colId === 'price') val = numOnly(item.unit_price || 0);
        else if (colId === 'discount') val = item.item_discount_amount > 0 ? numOnly(item.item_discount_amount) : '-';
        else if (colId === 'total') val = numOnly(item.total || 0);

        tableBodyHTML += `<td style="${colStyles(colId)}">${val}</td>`;
      });
      tableBodyHTML += '</tr>';
    });

    const pageIndicator = paginatedPages.length > 1 ? `
      <div style="position: absolute; bottom: 8px; left: 15px; font-size: 9px; color: #64748b; font-weight: bold; font-family: 'Tahoma', Arial, sans-serif;" dir="rtl">
        صفحة ${pageIdx + 1} من ${paginatedPages.length}
      </div>
    ` : '';

    pagesHTML += `
      <div class="print-page" style="position: relative;">
        ${secondaryLogo ? `
          <div class="secondary-logo-container" style="${secondaryLogoStyleStr}">
            <img class="header-logo" src="${secondaryLogo}" alt="Secondary Logo" style="width: 100%; height: 100%; object-fit: cover; border: 2px solid #cbd5e1 !important; border-radius: ${secondaryLogoShapeRadius};" />
          </div>
        ` : ''}
        <div class="page-content-top">
          ${isFirstPage ? headerHTML : ''}
          ${isFirstPage ? customerInfoHTML : ''}
          ${isFirstPage ? legalHTML : ''}
          
          <table class="items-table">
            <thead>
              ${tableHeaderHTML}
            </thead>
            <tbody>
              ${tableBodyHTML}
            </tbody>
          </table>
        </div>
        
        <div class="page-content-bottom">
          ${isLastPage ? totalsAndNotesHTML : ''}
          ${isLastPage ? footerHTML : ''}
        </div>
        
        ${pageIndicator}
      </div>
    `;
  });

  return `
    <div class="invoice-container size-${paperSize}">
      <style>${cssStyles}</style>
      ${pagesHTML}
    </div>
  `.trim();
}

interface PrintTemplateRendererProps {
  invoice: any;
  settings: any;
  paperSize: PaperSize;
  templateType: TemplateType;
  config: PrintConfig;
  columnOrder: string[];
  onHeaderClick?: (e: React.MouseEvent, colId: string) => void;
  onLogoDrag?: (x: number, y: number) => void;
  isLogoDraggable?: boolean;
}

export const PrintTemplateRenderer: React.FC<PrintTemplateRendererProps> = ({
  invoice,
  settings,
  paperSize,
  templateType,
  config,
  columnOrder,
  onHeaderClick,
  onLogoDrag,
  isLogoDraggable = false
}) => {
  const activeCols = columnOrder.filter(colId => {
    if (colId === 'index') return true;
    if (colId === 'barcode') return config.showColBarcode;
    if (colId === 'name') return config.showColName;
    if (colId === 'quantity') return config.showColQty;
    if (colId === 'unit') return config.showColUnit;
    if (colId === 'price') return config.showColPrice;
    if (colId === 'discount') return config.showColDiscount;
    if (colId === 'total') return config.showColTotal;
    return false;
  });

  const getColClass = (colId: string) => {
    if (colId === 'index') return 'w-[5%] text-center';
    if (colId === 'barcode') return 'w-[14%] text-center';
    if (colId === 'name') return 'w-[44%] text-right';
    if (colId === 'quantity') return 'w-[9%] text-center';
    if (colId === 'unit') return 'w-[7%] text-center';
    if (colId === 'price') return 'w-[11%] text-center';
    if (colId === 'discount') return 'w-[8%] text-center';
    if (colId === 'total') return 'w-[13%] text-left font-bold';
    return '';
  };

  const isQuotation = !!config.showQuotationMode;
  const isTax = templateType === 'tax';
  let mainTitle = 'وصل بيع';
  if (isQuotation) mainTitle = 'عرض سعر';
  else if (isTax) mainTitle = 'فاتورة ضريبية';
  else if (templateType === 'customer') mainTitle = 'فاتورة عميل';

  const hasRc = settings?.company_rc && isEnabled('company_rc_enabled', settings);
  const hasNif = settings?.company_nif && isEnabled('company_nif_enabled', settings);
  const hasNis = settings?.company_nis && isEnabled('company_nis_enabled', settings);
  const hasArt = settings?.company_art && isEnabled('company_art_enabled', settings);
  const hasCb = settings?.company_cb && isEnabled('company_cb_enabled', settings);

  const customNote = config.notesText !== undefined && config.notesText !== '' ? config.notesText : invoice.notes;
  const hasNotes = config.showNotes && customNote && String(customNote).trim() !== '';

  const baseLogoSize = parseInt(settings?.logo_size || '80', 10);
  const logoScale = paperSize === 'A5' ? 0.72 : paperSize === '80mm' ? 0.65 : 1.0;
  const logoSizePx = `${Math.round(baseLogoSize * logoScale)}px`;
  
  const logoShape = settings?.logo_shape || 'circle';
  const logoShapeRadius = logoShape === 'circle' ? '50%' : '12px';
  
  const logoOpacity = parseFloat(settings?.logo_opacity || '100');
  const logoOpacityVal = logoOpacity / 100;
  
  const logoGrayscale = settings?.logo_grayscale === 'true';
  const logoGrayscaleFilter = logoGrayscale ? 'grayscale(100%)' : 'none';
  
  const logoPosition = settings?.logo_position || 'right';

  // Primary static logo wrapping style using float & shape-outside
  const primaryLogoStyle: React.CSSProperties = {
    float: logoPosition === 'left' ? 'left' : logoPosition === 'right' ? 'right' : 'none',
    shapeOutside: logoShape === 'circle' ? 'circle(50%)' : 'none',
    shapeMargin: '12px',
    margin: logoPosition === 'left' ? '0 15px 10px 0' : logoPosition === 'right' ? '0 0 10px 15px' : '0 auto 10px auto',
    width: logoSizePx,
    height: logoSizePx,
    opacity: logoOpacityVal,
    filter: logoGrayscaleFilter,
    borderRadius: logoShapeRadius,
    overflow: 'hidden',
    display: logoPosition === 'center' ? 'block' : 'inline-block',
  };

  // Secondary Logo (draggable, absolute position overlay)
  const secondaryLogo = settings?.secondary_logo || '';
  const baseSecondaryLogoSize = parseInt(settings?.secondary_logo_size || '80', 10);
  const secondaryLogoSizePx = `${Math.round(baseSecondaryLogoSize * logoScale)}px`;
  const secondaryLogoShape = settings?.secondary_logo_shape || 'circle';
  const secondaryLogoShapeRadius = secondaryLogoShape === 'circle' ? '50%' : '12px';
  const secondaryLogoOpacity = parseFloat(settings?.secondary_logo_opacity || '100');
  const secondaryLogoOpacityVal = secondaryLogoOpacity / 100;
  const secondaryLogoGrayscale = settings?.secondary_logo_grayscale === 'true';
  const secondaryLogoGrayscaleFilter = secondaryLogoGrayscale ? 'grayscale(100%)' : 'none';
  
  const secondaryLogoX = parseInt(settings?.secondary_logo_x || '0', 10);
  const secondaryLogoY = parseInt(settings?.secondary_logo_y || '0', 10);
  const scaledSecX = Math.round(secondaryLogoX * logoScale);
  const scaledSecY = Math.round(secondaryLogoY * logoScale);

  const secondaryLogoStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 50,
    width: secondaryLogoSizePx,
    height: secondaryLogoSizePx,
    opacity: secondaryLogoOpacityVal,
    filter: secondaryLogoGrayscaleFilter,
    borderRadius: secondaryLogoShapeRadius,
    overflow: 'hidden',
    userSelect: 'none',
    cursor: isLogoDraggable ? 'move' : 'default',
    transform: `translate(${scaledSecX}px, ${scaledSecY}px)`,
    transition: 'transform 0.1s ease',
    left: '1.5em',
    top: '1em',
    border: isLogoDraggable ? '2px dashed #3b82f6' : 'none',
  };

  const handleLogoMouseDown = (e: React.MouseEvent) => {
    if (!isLogoDraggable || !onLogoDrag) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLogoX = parseInt(settings?.secondary_logo_x || '0', 10);
    const startLogoY = parseInt(settings?.secondary_logo_y || '0', 10);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const scaledDeltaX = Math.round(deltaX / logoScale);
      const scaledDeltaY = Math.round(deltaY / logoScale);
      onLogoDrag(startLogoX + scaledDeltaX, startLogoY + scaledDeltaY);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const da = (val: number) => {
    return `${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ج`;
  };

  const numOnly = (val: number) => {
    return (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const percent = config.fontWeightPercent !== undefined ? config.fontWeightPercent : 80;
  const mappedWeight = 400 + Math.round((percent - 50) * 10);
  const tableBaseWeight = String(Math.max(400, Math.min(900, mappedWeight)));
  const tableBoldWeight = String(Math.max(600, Math.min(900, mappedWeight + 200)));

  const paginatedPages = paginateItems(invoice.items || [], paperSize, config, settings, invoice);

  return (
    <div className="flex flex-col gap-6 w-full items-center print-preview-container select-none">
      <style>{`
        @media print {
          @page {
            margin: 0 !important;
          }
          .print-preview-sheet .items-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-preview-sheet .totals-and-notes {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-preview-sheet .metadata-card,
          .print-preview-sheet .info-section,
          .print-preview-sheet .legal-grid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }

        .print-preview-sheet {
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
          background-color: #ffffff !important;
          color: #1e293b !important;
          border-color: #cbd5e1 !important;
          font-family: 'Cairo', 'Tahoma', 'Segoe UI', sans-serif !important;
          --font-weight-base: 500;
          --font-weight-bold: 800;
          line-height: 1.4 !important;
        }
        
        .print-preview-sheet.size-A4,
        .print-preview-sheet.size-A5 {
          border-top: 5px solid #3b82f6 !important;
        }

        .print-page-content-top {
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          width: 100%;
          flex: 1;
        }
        
        .print-page-content-bottom {
          width: 100%;
          margin-top: auto;
        }

        .print-preview-sheet td,
        .print-preview-sheet th,
        .print-preview-sheet p,
        .print-preview-sheet div,
        .print-preview-sheet span,
        .print-preview-sheet strong,
        .print-preview-sheet h1,
        .print-preview-sheet table {
          border-color: #cbd5e1;
        }

        .print-preview-sheet strong,
        .print-preview-sheet th,
        .print-preview-sheet th *,
        .print-preview-sheet b,
        .print-preview-sheet .font-bold,
        .print-preview-sheet .font-extrabold {
          font-weight: var(--font-weight-bold) !important;
        }
        
        .print-preview-sheet .shop-title {
          font-size: 2.2em !important;
          font-weight: 900 !important;
          color: #0f172a !important;
          margin: 0 !important;
          line-height: 1.1 !important;
        }

        .print-preview-sheet .shop-subtitle {
          font-size: 1em !important;
          color: #3b82f6 !important;
          margin-top: 0.2em !important;
          margin-bottom: 0.4em !important;
        }

        .print-preview-sheet .metadata-card,
        .print-preview-sheet .metadata-card *,
        .print-preview-sheet .info-section,
        .print-preview-sheet .info-section *,
        .print-preview-sheet .legal-grid,
        .print-preview-sheet .legal-grid * {
          background-color: #ffffff !important;
          color: #1e293b !important;
        }

        .print-preview-sheet .metadata-card {
          border: 1px solid #cbd5e1 !important;
          border-top: 3px solid #3b82f6 !important;
          border-radius: 0.8em !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 18em !important;
          display: inline-block !important;
          overflow: hidden !important;
        }

        .size-80mm .metadata-card,
        .size-A5 .metadata-card {
          max-width: 100% !important;
          width: 100% !important;
          display: block !important;
        }

        .print-preview-sheet .meta-row {
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .print-preview-sheet .meta-row:last-child {
          border-bottom: none !important;
        }

        .print-preview-sheet .info-section {
          border: 1px solid #cbd5e1 !important;
          border-radius: 0.8em !important;
          padding: 0.7em 1.2em !important;
          margin-bottom: 1.2em !important;
        }

        .print-preview-sheet .items-table,
        .print-preview-sheet .totals-table,
        .print-preview-sheet .metadata-card,
        .print-preview-sheet .meta-val,
        .print-preview-sheet .legal-box,
        .print-preview-sheet .info-section {
          font-family: 'Cairo', 'Tahoma', 'Segoe UI', sans-serif !important;
        }

        /* Custom range slider font weight thickness applies SPECIFICALLY to table body cells (td) as requested */
        .print-preview-sheet .items-table td,
        .print-preview-sheet .totals-table td {
          font-weight: ${tableBaseWeight} !important;
        }

        .print-preview-sheet .items-table td .product-title-main {
          font-weight: var(--font-weight-bold) !important;
        }

        .print-preview-sheet .totals-table tr.grand-total-row td {
          font-weight: ${tableBoldWeight} !important;
        }

        .print-preview-sheet table.items-table {
          width: 100% !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 0.8em !important;
          overflow: hidden !important;
        }
        
        .print-preview-sheet table.items-table th {
          background-color: #f8fafc !important;
          color: #0f172a !important;
          border-bottom: 4px double #3b82f6 !important;
          border-left: 1px solid #cbd5e1 !important;
          padding: 0.75em 0.65em !important;
          font-size: 0.9em !important;
        }
        
        .print-preview-sheet table.items-table th:last-child {
          border-left: none !important;
        }
        
        /* Force light theme colors on preview items table even in dark mode */
        .print-preview-sheet table.items-table tr:nth-child(odd) td {
          background-color: #ffffff !important;
          color: #1e293b !important;
          border-bottom: 1px solid #e2e8f0 !important;
          border-left: 1px solid #cbd5e1 !important;
          padding: 0.55em 0.6em !important;
        }
        .print-preview-sheet table.items-table tr:nth-child(even) td {
          background-color: #f8fafc !important;
          color: #1e293b !important;
          border-bottom: 1px solid #e2e8f0 !important;
          border-left: 1px solid #cbd5e1 !important;
          padding: 0.55em 0.6em !important;
        }
        
        .print-preview-sheet table.items-table td:last-child {
          border-left: none !important;
        }
        
        .print-preview-sheet table.items-table tr:last-child td {
          border-bottom: none !important;
        }

        .print-preview-sheet .totals-and-notes {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
          gap: 1.5em !important;
          margin-top: 0.8em !important;
          width: 100% !important;
        }

        .print-preview-sheet .notes-block {
          flex: 1 !important;
          min-width: 0 !important;
        }

        .print-preview-sheet .totals-block {
          width: 22em !important;
          flex-shrink: 0 !important;
          margin-right: auto !important;
        }

        .size-80mm .totals-and-notes .totals-block {
          width: 100% !important;
          margin-right: 0 !important;
        }

        .print-preview-sheet .totals-table {
          width: 100% !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 0.8em !important;
          overflow: hidden !important;
        }

        /* Force light theme colors on preview totals table even in dark mode */
        .print-preview-sheet .totals-table td {
          border-bottom: 1px solid #cbd5e1 !important;
          border-left: 1px solid #cbd5e1 !important;
          padding: 0.6em 0.8em !important;
          background-color: #ffffff !important;
          color: #1e293b !important;
        }

        .print-preview-sheet .totals-table td:last-child {
          border-left: none !important;
        }

        .print-preview-sheet .totals-table tr:last-child td {
          border-bottom: none !important;
        }

        /* Clean high-contrast row for final total remaining (SPECIFICITY RESISTANT) */
        .print-preview-sheet tr.remaining-bar,
        .print-preview-sheet tr.remaining-bar td {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
          border-top: 2px solid #0f172a !important;
          border-bottom: 4px double #0f172a !important;
          border-left: none !important;
        }

        .print-preview-sheet .text-red-500 {
          color: #ef4444 !important;
        }
        .print-preview-sheet .text-green-600 {
          color: #10b981 !important;
        }
        
        .size-80mm th, .size-80mm td { padding: 0.5em 0.1em !important; font-size: 0.85em !important; }
        .size-80mm th, .size-80mm th * { background-color: transparent !important; color: #1e293b !important; }
        .size-80mm th { border-bottom: 1px dashed #000 !important; }
        .size-80mm .shop-title { font-size: 1.4em !important; text-align: center; }
        .size-80mm .logo-container { text-align: center; }
        .size-80mm .totals-table { width: 100% !important; }
        .size-80mm {
          width: 80mm !important;
          max-width: 80mm !important;
          margin: 0 !important;
          font-size: 12px !important;
          font-weight: bold !important;
        }

        /* High-contrast Monochrome Printing Optimization for 80mm Thermal Paper */
        .size-80mm,
        .size-80mm * {
          color: #000000 !important;
          -webkit-font-smoothing: none !important;
          -moz-osx-font-smoothing: none !important;
          font-smoothing: none !important;
          text-rendering: optimizeSpeed !important;
          text-shadow: none !important;
          box-shadow: none !important;
        }

        .size-80mm table,
        .size-80mm th,
        .size-80mm td,
        .size-80mm div,
        .size-80mm span,
        .size-80mm hr {
          border-color: #000000 !important;
        }
        .size-80mm .totals-and-notes { display: block !important; }
        
        /* Elegant dashed divider above footer */
        .print-preview-sheet .invoice-footer {
          margin-top: 2em !important;
          border-top: 2px dashed #94a3b8 !important;
          padding-top: 1em !important;
        }

        /* Complete Dark Mode Prevention for Print Preview */
        .dark .print-preview-sheet,
        .dark .print-preview-sheet * {
          background-color: transparent;
          color: #1e293b !important;
          border-color: #cbd5e1 !important;
        }

        .dark .print-preview-sheet {
          background-color: #ffffff !important;
          /* Force Light Theme variables inside the print preview sheet to prevent white-on-white text */
          --bg-primary: 219 233 244 !important;
          --bg-secondary: 255 255 255 !important;
          --bg-card: 255 255 255 !important;
          --text-primary: 15 23 42 !important;
          --text-secondary: 51 65 85 !important;
          --text-muted: 100 116 139 !important;
          --border-default: 0 0 0 !important;
          --border-alpha: 0.18 !important;
          --border-light: 0 0 0 !important;
        }

        .dark .print-preview-sheet .metadata-card,
        .dark .print-preview-sheet .metadata-card *,
        .dark .print-preview-sheet .info-section,
        .dark .print-preview-sheet .info-section *,
        .dark .print-preview-sheet .legal-grid,
        .dark .print-preview-sheet .legal-grid *,
        .dark .print-preview-sheet .notes-block,
        .dark .print-preview-sheet .notes-block * {
          background-color: #ffffff !important;
          color: #1e293b !important;
        }

        .print-preview-sheet .legal-grid th {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
        }

        .dark .print-preview-sheet .legal-grid th {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
        }

        .dark .print-preview-sheet table.items-table,
        .dark .print-preview-sheet table.items-table * {
          border-color: #cbd5e1 !important;
        }

        .dark .print-preview-sheet table.items-table th,
        .dark .print-preview-sheet table.items-table th * {
          background-color: #f8fafc !important;
          color: #0f172a !important;
          border-bottom: 3px solid #3b82f6 !important;
        }

        .dark .print-preview-sheet table.items-table tr td,
        .dark .print-preview-sheet table.items-table td {
          color: #1e293b !important;
        }

        .dark .print-preview-sheet table.items-table tr:nth-child(odd),
        .dark .print-preview-sheet table.items-table tr:nth-child(odd) td {
          background-color: #ffffff !important;
        }

        .dark .print-preview-sheet table.items-table tr:nth-child(even),
        .dark .print-preview-sheet table.items-table tr:nth-child(even) td {
          background-color: #f8fafc !important;
        }

        .dark .print-preview-sheet table.totals-table,
        .dark .print-preview-sheet table.totals-table * {
          border-color: #cbd5e1 !important;
        }

        .dark .print-preview-sheet table.totals-table tr td,
        .dark .print-preview-sheet table.totals-table td {
          background-color: #ffffff !important;
          color: #1e293b !important;
        }

        .dark .print-preview-sheet table.totals-table tr.remaining-bar,
        .dark .print-preview-sheet table.totals-table tr.remaining-bar td {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
          border-top: 2px solid #0f172a !important;
          border-bottom: 4px double #0f172a !important;
        }
        
        .dark .print-preview-sheet .text-red-500 {
          color: #ef4444 !important;
        }
        .dark .print-preview-sheet .text-green-600 {
          color: #10b981 !important;
        }
        
        .dark .print-preview-sheet .text-gray-400,
        .dark .print-preview-sheet .text-gray-500,
        .dark .print-preview-sheet .text-gray-600 {
          color: #475569 !important;
        }
        .dark .print-preview-sheet .text-blue-500,
        .dark .print-preview-sheet .text-blue-900 {
          color: #1e3a8a !important;
        }

        /* Monochrome and Bold Overrides for Thermal Print (Placed at the end to win the cascade in preview) */
        .size-80mm,
        .size-80mm * {
          color: #000000 !important;
          background: #ffffff !important;
          background-color: #ffffff !important;
          font-weight: bold !important; /* Force thick text to prevent thermal fade/erosion */
          -webkit-font-smoothing: none !important;
          -moz-osx-font-smoothing: none !important;
          font-smoothing: none !important;
          text-rendering: optimizeSpeed !important;
          text-shadow: none !important;
          box-shadow: none !important;
        }

        .size-80mm table,
        .size-80mm th,
        .size-80mm td,
        .size-80mm div,
        .size-80mm span,
        .size-80mm hr {
          border-color: #000000 !important;
        }



        .size-80mm table.items-table th {
          border-bottom: 2px solid #000000 !important;
          border-top: 1px solid #000000 !important;
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          padding: 0.35em 0.1em !important;
          font-size: 0.85em !important;
        }

        /* Vertical Stacking of Customer & Phone Info for Roll paper */
        .size-80mm .info-section {
          padding: 0.4em !important;
          margin-bottom: 0.8em !important;
          border: 1px solid #000000 !important;
        }
        .size-80mm .info-table,
        .size-80mm .info-section table,
        .size-80mm .info-section tbody,
        .size-80mm .info-section tr {
          display: block !important;
          width: 100% !important;
        }
        .size-80mm .info-table td,
        .size-80mm .info-section td {
          display: block !important;
          width: 100% !important;
          text-align: right !important;
          padding: 0.3em 0 !important;
          border: none !important;
          direction: rtl !important;
        }
        .size-80mm .info-table td strong,
        .size-80mm .info-section td strong {
          font-size: 0.95em !important;
          font-weight: bold !important;
          display: inline-block !important;
          flex-shrink: 0 !important;
          min-width: 4.5em !important;
          color: #000000 !important;
        }
        .size-80mm .info-table td span,
        .size-80mm .info-section td span {
          font-size: 1em !important;
          font-weight: bold !important;
          margin-right: 0.4em !important;
          color: #000000 !important;
          display: inline-block !important;
        }
        /* React layout specific handles for inner flex components inside td */
        .size-80mm .info-section td span.flex {
          display: flex !important;
          justify-content: flex-start !important;
          width: 100% !important;
          direction: rtl !important;
        }
      `}</style>

      {paginatedPages.map((pageItems, pageIdx) => {
        const isFirstPage = pageIdx === 0;
        const isLastPage = pageIdx === paginatedPages.length - 1;
        
        let startIndex = 0;
        for (let i = 0; i < pageIdx; i++) {
          startIndex += paginatedPages[i].length;
        }

        return (
          <div
            key={pageIdx}
            className={`bg-white text-[#1e293b] shadow-xl border border-gray-200 overflow-hidden rounded-md transition-all duration-300 print-preview-sheet size-${paperSize} relative flex flex-col justify-between`}
            dir="rtl"
            style={{
              width: paperSize === '80mm' ? '80mm' : paperSize === 'A5' ? '148mm' : '210mm',
              height: paperSize === '80mm' ? 'auto' : paperSize === 'A5' ? '210mm' : '297mm',
              fontSize: paperSize === '80mm' ? '10px' : paperSize === 'A5' ? '9.2px' : '13px',
              padding: paperSize === '80mm' ? '5mm 3mm' : paperSize === 'A5' ? '8mm 6mm' : '10mm 8mm',
              boxSizing: 'border-box'
            }}
          >
            {secondaryLogo && (
              <div 
                className="secondary-logo-container flex shrink-0 justify-center animate-fade-in print-only-absolute" 
                style={{ ...secondaryLogoStyle, pointerEvents: isLogoDraggable ? 'auto' : 'none' }} 
                onMouseDown={handleLogoMouseDown}
              >
                <img 
                  className="object-cover header-logo" 
                  src={secondaryLogo} 
                  alt="Secondary Logo" 
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: secondaryLogoShapeRadius
                  }} 
                />
              </div>
            )}
            <div className="print-page-content-top">
              {/* Header section */}
              {isFirstPage && (
                paperSize === '80mm' ? (
                  <div className="flex flex-col items-center text-center gap-3 mb-4 pb-3 border-b border-dashed border-gray-300 relative">
                    {config.showCompanyBlock && settings?.store_logo && (
                      <div className="logo-container flex justify-center shrink-0" style={{
                        width: logoSizePx,
                        height: logoSizePx,
                        opacity: logoOpacityVal,
                        filter: logoGrayscaleFilter,
                        borderRadius: logoShapeRadius,
                        overflow: 'hidden'
                      }}>
                        <img className="object-cover header-logo" src={settings.store_logo} alt="Logo" style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: logoShapeRadius
                        }} />
                      </div>
                    )}
                    {config.showCompanyBlock && (
                      <div className="text-center">
                        {settings?.company_name && (
                          <h1 className="shop-title text-xl font-black">{settings.company_name}</h1>
                        )}
                        <p className="shop-subtitle text-xs text-blue-500 font-bold m-0">{settings?.company_activity && settings?.company_activity !== 'false' ? settings.company_activity : 'قطع غيار السيارات والزيوت والإطارات'}</p>
                        {settings?.company_phone && (
                          <div className="text-xs text-gray-600 m-0 flex items-center justify-center gap-1.5 font-bold" style={{ direction: 'rtl' }}>
                            <span className="flex items-center gap-1 shrink-0">
                              <Phone size={12} className="text-gray-400" />
                              <span>الهاتف:</span>
                            </span>
                            <span className="font-mono" style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{settings.company_phone}</span>
                          </div>
                        )}
                        {settings?.company_address && (
                          <p className="text-xs text-gray-500 m-0 flex items-center justify-center gap-1">
                            <span>العنوان: {settings.company_address}</span>
                            <MapPin size={12} className="text-gray-400" />
                          </p>
                        )}
                      </div>
                    )}
                    {config.showInvoiceDetails && (
                      <div className="metadata-card w-full max-w-xs mt-2">
                        <table className="w-full border-collapse">
                          <tbody>
                            <tr className="meta-row">
                              <td className="meta-val py-1.5 text-left font-black text-blue-900 text-sm">{invoice.invoice_number}</td>
                              <td className="py-1.5 text-right text-gray-500 text-xs flex items-center justify-end gap-1.5 whitespace-nowrap font-bold">
                                رقم الفاتورة <FileText size={13} className="text-gray-400 shrink-0" />
                              </td>
                            </tr>
                            <tr className="meta-row">
                              <td className="meta-val py-1.5 text-left text-sm">{invoice.date}</td>
                              <td className="py-1.5 text-right text-gray-500 text-xs flex items-center justify-end gap-1.5 whitespace-nowrap font-bold">
                                التاريخ <Calendar size={13} className="text-gray-400 shrink-0" />
                              </td>
                            </tr>
                            {invoice.time && (
                              <tr className="meta-row">
                                <td className="meta-val py-1.5 text-left text-sm">{invoice.time}</td>
                                <td className="py-1.5 text-right text-gray-500 text-xs flex items-center justify-end gap-1.5 whitespace-nowrap font-bold">
                                  الوقت <Clock size={13} className="text-gray-400 shrink-0" />
                                </td>
                              </tr>
                            )}
                            <tr className="meta-row">
                              <td className="meta-val py-1.5 text-left text-sm">نقدي</td>
                              <td className="py-1.5 text-right text-gray-500 text-xs flex items-center justify-end gap-1.5 whitespace-nowrap font-bold">
                                طريقة الدفع <CreditCard size={13} className="text-gray-400 shrink-0" />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative mb-5 w-full">
                    
                    <div className="flex justify-between items-end gap-4 pb-4 border-b-2 border-dashed border-gray-300 w-full">
                      {config.showCompanyBlock && (
                        <div className={`${config.showInvoiceDetails ? (paperSize === 'A5' ? 'w-[55%]' : 'w-[60%]') : 'w-full'} block text-right`} style={{ minHeight: logoSizePx }}>
                          {settings?.store_logo && (
                            <div className="logo-container" style={primaryLogoStyle}>
                              <img className="object-cover header-logo" src={settings.store_logo} alt="Logo" style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: logoShapeRadius
                              }} />
                            </div>
                          )}
                          
                          <div 
                            className="company-text-content" 
                            style={{ 
                              textAlign: logoPosition === 'center' ? 'center' : 'right',
                              borderRight: (logoPosition === 'center' || logoPosition === 'right') ? 'none' : '4px solid #3b82f6',
                              paddingRight: (logoPosition === 'center' || logoPosition === 'right') ? 0 : '12px'
                            }}
                          >
                            {settings?.company_name && (
                              <h1 className="shop-title" style={{ textAlign: logoPosition === 'center' ? 'center' : 'right' }}>{settings.company_name}</h1>
                            )}
                            <p className="shop-subtitle" style={{ textAlign: logoPosition === 'center' ? 'center' : 'right' }}>{settings?.company_activity && settings?.company_activity !== 'false' ? settings.company_activity : 'قطع غيار السيارات والزيوت والإطارات'}</p>
                            {settings?.company_phone && (
                              <div 
                                className="text-xs text-gray-600 m-0 font-bold flex items-center gap-1.5" 
                                style={{ 
                                  justifyContent: logoPosition === 'center' ? 'center' : 'flex-start', 
                                  direction: 'rtl',
                                  marginBottom: '0.25em' 
                                }}
                              >
                                <span className="flex items-center gap-1 shrink-0">
                                  <Phone size={12} className="text-gray-400" />
                                  <span>الهاتف:</span>
                                </span>
                                <span className="font-mono" style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{settings.company_phone}</span>
                              </div>
                            )}
                            {settings?.company_address && (
                              <p className="text-xs text-gray-500 m-0" style={{ textAlign: logoPosition === 'center' ? 'center' : 'right' }}>
                                <span className="inline-block align-middle">{settings.company_address}</span>
                                <span className="inline-block align-middle mr-1 text-gray-400">
                                  <MapPin size={12} />
                                </span>
                                <span className="inline-block align-middle mr-1">العنوان:</span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {config.showInvoiceDetails && (
                        <div className={`text-left ${paperSize === 'A5' ? 'w-[45%]' : 'w-[40%]'} flex justify-end`}>
                          <div className="metadata-card" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: 0, overflow: 'hidden', borderTop: '3px solid #3b82f6' }}>
                            <table className="w-full border-collapse">
                              <tbody>
                                <tr className="meta-row">
                                  <td className="meta-val py-1.5 px-2.5 text-left font-black text-blue-900 text-sm whitespace-nowrap">{invoice.invoice_number}</td>
                                  <td className="py-1.5 px-2.5 text-right text-gray-500 text-[10px] md:text-xs flex items-center justify-end gap-1.5 whitespace-nowrap font-bold font-sans">
                                    <span>رقم الفاتورة</span>
                                    <FileText size={12} className="text-gray-400 shrink-0" />
                                  </td>
                                </tr>
                                <tr className="meta-row">
                                  <td className="meta-val py-1.5 px-2.5 text-left text-sm whitespace-nowrap">{invoice.date}</td>
                                  <td className="py-1.5 px-2.5 text-right text-gray-500 text-[10px] md:text-xs flex items-center justify-end gap-1.5 whitespace-nowrap font-bold font-sans">
                                    <span>التاريخ</span>
                                    <Calendar size={12} className="text-gray-400 shrink-0" />
                                  </td>
                                </tr>
                                {invoice.time && (
                                  <tr className="meta-row">
                                    <td className="meta-val py-1.5 px-2.5 text-left text-sm whitespace-nowrap">{invoice.time}</td>
                                    <td className="py-1.5 px-2.5 text-right text-gray-500 text-[10px] md:text-xs flex items-center justify-end gap-1.5 whitespace-nowrap font-bold font-sans">
                                      <span>الوقت</span>
                                      <Clock size={12} className="text-gray-400 shrink-0" />
                                    </td>
                                  </tr>
                                )}
                                <tr className="meta-row">
                                  <td className="meta-val py-1.5 px-2.5 text-left text-sm whitespace-nowrap">نقدي</td>
                                  <td className="py-1.5 px-2.5 text-right text-gray-500 text-[10px] md:text-xs flex items-center justify-end gap-1.5 whitespace-nowrap font-bold font-sans">
                                    <span>طريقة الدفع</span>
                                    <CreditCard size={12} className="text-gray-400 shrink-0" />
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* Customer Info Section - horizontal and compact layout */}
              {isFirstPage && config.showCustomerBlock && !isGeneralCustomer(invoice.customer_name) && (
                <div className="info-section" style={{ border: '1px solid #cbd5e1' }}>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="p-0 border-none text-right vertical-middle w-[55%]">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
                            <User size={13} className="text-gray-400" />
                            <strong style={{ fontSize: '0.9em' }}>العميل:</strong>
                            <span>{invoice.customer_name}</span>
                          </span>
                        </td>
                        <td className="p-0 border-none vertical-middle w-[45%]">
                          <div className="flex items-center justify-end gap-1.5 text-sm font-bold text-gray-800" style={{ direction: 'rtl' }}>
                            <span className="flex items-center gap-1 shrink-0">
                              <Phone size={13} className="text-gray-400" />
                              <strong style={{ fontSize: '0.9em' }}>الهاتف:</strong>
                            </span>
                            <span className="font-mono" style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{invoice.customer_phone || '—'}</span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Company Official Details Card */}
              {isFirstPage && config.showCompanyOfficialDetails && (hasRc || hasNif || hasNis || hasArt || hasCb) && (() => {
                const legalItems = [];
                if (hasRc) legalItems.push({ label: 'سجل تجاري (RC)', val: settings.company_rc });
                if (hasNif) legalItems.push({ label: 'رقم جبائي (NIF)', val: settings.company_nif });
                if (hasNis) legalItems.push({ label: 'رقم إحصائي (NIS)', val: settings.company_nis });
                if (hasArt) legalItems.push({ label: 'رقم المادة (Art)', val: settings.company_art });
                if (hasCb) legalItems.push({ label: 'الحساب البنكي (CB)', val: settings.company_cb });

                return (
                  <div className="mb-4 overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm legal-grid" dir="rtl">
                    <table className="w-full border-collapse text-center text-xs">
                      <thead>
                        <tr className="border-b border-gray-300 text-gray-800 font-bold">
                          {legalItems.map((item, idx) => (
                            <th 
                              key={idx} 
                              className="py-2 px-3 border-l border-gray-300 last:border-l-0 text-center font-bold text-[10px] md:text-xs"
                              style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}
                            >
                              {item.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="text-gray-800 font-semibold font-mono">
                          {legalItems.map((item, idx) => (
                            <td key={idx} className="py-2.5 px-3 border-l border-gray-300 last:border-l-0 text-center text-xs md:text-sm font-bold bg-white text-slate-900">
                              {item.val}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* Products table */}
              <table className="w-full border-collapse mb-4 text-xs items-table">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50 text-gray-700 font-bold">
                    {activeCols.map(colId => (
                      <th
                        key={colId}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          onHeaderClick && onHeaderClick(e, colId);
                        }}
                        className={`py-2 px-1 text-xs border-b-2 border-gray-200 select-none ${getColClass(colId)} cursor-context-menu`}
                        title="انقر بزر الفأرة الأيمن لتخصيص الأعمدة"
                      >
                        {COLUMN_LABELS[colId]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageItems.map((item: any, idx: number) => {
                    const globalIdx = startIndex + idx;
                    return (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        {activeCols.map(colId => {
                          let cellVal: React.ReactNode = '';
                          if (colId === 'index') cellVal = globalIdx + 1;
                          else if (colId === 'barcode') cellVal = item.product_barcode_snapshot || '-';
                          else if (colId === 'name') {
                            const mainName = item.product_name_fr || item.product_name_snapshot || '';
                            const arabicName = item.product_name || '';
                            const showAr = arabicName && normalizeArabic(arabicName) !== normalizeArabic(mainName);
                            cellVal = (
                              <div>
                                <div className="product-title-main text-slate-900 text-[1.05em] leading-tight">
                                  {mainName}
                                </div>
                                {showAr && (
                                  <div className="product-title-arabic text-[0.85em] font-normal text-gray-500 mt-0.5">
                                    {arabicName}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          else if (colId === 'quantity') cellVal = item.quantity;
                          else if (colId === 'unit') cellVal = item.unit || 'قطع';
                          else if (colId === 'price') cellVal = numOnly(item.unit_price || 0);
                          else if (colId === 'discount') cellVal = item.item_discount_amount > 0 ? numOnly(item.item_discount_amount) : '-';
                          else if (colId === 'total') cellVal = numOnly(item.total || 0);

                          return (
                            <td key={colId} className={`py-2 px-1 ${getColClass(colId)}`}>
                              {cellVal}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="print-page-content-bottom">
              {/* Totals section */}
              {isLastPage && (
                (config.compactFooter || (invoice.items && invoice.items.length > 17)) ? (
                  <div className="w-full flex flex-col gap-1.5 mt-2 font-sans">
                    {hasNotes && (
                      <div className="border border-gray-300 rounded-[0.5em] p-[0.45em_0.8em] bg-white text-[10.5px] text-right text-gray-700 shadow-sm leading-normal">
                        <strong>ملاحظة:</strong> {customNote}
                      </div>
                    )}
                    
                    <div className="border border-gray-300 rounded-[0.5em] p-[0.45em_0.8em] bg-slate-50 text-[10.5px] w-full flex flex-wrap justify-between items-center gap-2" style={{ direction: 'rtl' }}>
                      {invoice.global_discount_amount > 0 && (
                        <div className="whitespace-nowrap"><strong className="text-red-500">الخصم:</strong> <span className="meta-val text-red-500">{da(invoice.global_discount_amount)}</span></div>
                      )}
                      {invoice.tax_amount > 0 && (
                        <div className="whitespace-nowrap"><strong>الضريبة ({invoice.tax_percent}%):</strong> <span className="meta-val">{da(invoice.tax_amount)}</span></div>
                      )}
                      <div className="whitespace-nowrap"><strong className="text-green-600">المدفوع:</strong> <span className="meta-val text-green-600">{da(invoice.paid)}</span></div>
                      <div className="whitespace-nowrap"><strong>المتبقي:</strong> <span className="meta-val">{da(invoice.remaining)}</span></div>
                      <div className="bg-slate-100 text-slate-900 border border-gray-300 px-2.5 py-1 rounded-[0.35em] whitespace-nowrap">
                        <strong>{isQuotation ? 'الإجمالي التقديري' : 'المجموع الإجمالي'}:</strong> <span className="meta-val font-bold text-slate-900">{da(invoice.total)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="totals-and-notes">
                    <div className="notes-block">
                      {hasNotes && (
                        <div className="border border-gray-200 rounded-lg p-3 bg-white text-xs text-gray-700 h-full min-h-[8em] flex flex-col shadow-sm">
                          <strong style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '1.05em', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.3em', marginBottom: '0.4em' }}>
                            <FileText size={13} className="text-gray-400" />
                            <span>ملاحظة:</span>
                          </strong>
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', color: '#334155' }}>{customNote}</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="totals-block">
                      <table className="totals-table">
                        <tbody>
                          {!isQuotation ? (
                            <>
                              {/* Subtotal removed per user request */}
                              {invoice.global_discount_amount > 0 && (
                                <tr className="text-red-500 font-bold">
                                  <td>الخصم:</td>
                                  <td className="text-left">{da(invoice.global_discount_amount)}</td>
                                </tr>
                              )}
                              {invoice.tax_amount > 0 && (
                                <tr className="font-bold">
                                  <td>الضريبة ({invoice.tax_percent}%):</td>
                                  <td className="text-left">{da(invoice.tax_amount)}</td>
                                </tr>
                              )}
                              <tr className="text-green-600 font-bold text-xs">
                                <td>المدفوع:</td>
                                <td className="text-left">{da(invoice.paid)}</td>
                              </tr>
                              <tr className="text-gray-600 font-bold text-xs">
                                <td>المبلغ المتبقي:</td>
                                <td className="text-left">{da(invoice.remaining)}</td>
                              </tr>
                              <tr className="remaining-bar font-bold">
                                <td className="text-base" style={{ borderTopRightRadius: '0.6em', borderBottomRightRadius: '0.6em' }}>المجموع الإجمالي:</td>
                                <td className="text-left text-base" style={{ borderTopLeftRadius: '0.6em', borderBottomLeftRadius: '0.6em' }}>{da(invoice.total)}</td>
                              </tr>
                            </>
                          ) : (
                            <tr className="grand-total remaining-bar font-bold">
                              <td className="text-base" style={{ borderTopRightRadius: '0.6em', borderBottomRightRadius: '0.6em' }}>الإجمالي التقديري:</td>
                              <td className="text-left text-base" style={{ borderTopLeftRadius: '0.6em', borderBottomLeftRadius: '0.6em' }}>{da(invoice.total)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}

              {/* Footer text */}
              {isLastPage && config.showFooter && (
                <div className="mt-6 pt-3 text-center text-xs text-gray-400 invoice-footer">
                  <p className="m-0 font-bold">{isQuotation ? 'عرض السعر هذا صالح لمدة 15 يوماً من تاريخ الإصدار. نشكركم على اهتمامكم.' : (settings?.receipt_footer || 'شكراً لزيارتكم، البضاعة المباعة لا ترد ولا تستبدل بعد 24 ساعة.')}</p>
                  <p className="mt-1 mb-0 text-[9px] font-mono opacity-50">Powered by YK MS ERP</p>
                </div>
              )}
            </div>

            {paginatedPages.length > 1 && (
              <div className="absolute bottom-3 left-5 text-[10px] text-gray-400 font-bold font-mono select-none" dir="rtl">
                صفحة {pageIdx + 1} من {paginatedPages.length}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
