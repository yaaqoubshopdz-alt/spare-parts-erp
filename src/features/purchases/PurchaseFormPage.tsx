import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import {
  Search, Trash2, Printer, Save, CheckCircle, Plus, Copy,
  User, FolderOpen, Calendar, XCircle, FileText, X, Package, EyeOff, Eye, Hash, Car, Edit2, Sparkles, Barcode, Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { roundTo2 } from '../../utils/calculations';
import ProInvoiceLayout from '../../shared/components/layout/ProInvoiceLayout';
import { useShortcutStore } from '../../store/shortcutStore';
import { PrintPreviewModal } from '../../shared/components/print/PrintPreviewModal';
import { PrintTemplateRenderer, DEFAULT_CONFIGS, generateInvoiceHTML, TemplateType, PrintConfig, PaperSize } from '../../shared/components/print/PrintTemplateRenderer';
import AddProductModal from '../../features/inventory/AddProductModal';
import BarcodePrintModal from '../../features/inventory/components/BarcodePrintModal';
import ProductPhotoViewerModal from '../../features/inventory/ProductPhotoViewerModal';
import AdvancedProductFinder from '../shared/AdvancedProductFinder';
import FitmentsBadges from '../shared/FitmentsBadges';
import GlassDropdown, { GlassDropdownItem } from '../../shared/components/ui/GlassDropdown';
import { AdminPinModal } from '../../shared/components/ui/AdminPinModal';
import { playNotificationSound } from '../../shared/utils/sound';
import { showAutoParkToast } from '../../shared/components/ui/AutoParkToast';
import { showNotification } from '../../shared/utils/notifications';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import ColumnContextMenu from '../../shared/components/table/ColumnContextMenu';
import { useSmoothScroll } from '../../shared/hooks/useSmoothScroll';


interface PurchaseItem {
  id: string;
  product_id: number;
  product_name_snapshot: string;
  product_barcode_snapshot: string | null;
  product_name?: string;
  product_name_fr?: string;
  quantity: number;
  unit: string;
  unit_price: number; // Purchase Price
  total: number;
  wholesale_price: number;
  retail_price: number;
  retail_margin?: number;
  category_id?: number;
  unit_id?: number;
  sort_order: number;
  inventory_check?: boolean;
  isNewProduct?: boolean;
  needs_review?: boolean;
  brand_id?: number;
  has_sub_unit?: boolean;
  pieces_per_box?: number;
  compatibility_suggestions?: any[];
  product_is_active?: number;
}

interface ColumnDef {
  id: string;
  label: string;
  width: number;
  align: 'right' | 'center' | 'left';
  sortable?: boolean;
  flex?: boolean;
  sortKey?: string;
  hidden?: boolean;
}

const INITIAL_COLUMNS: ColumnDef[] = [
  { id: 'index', label: '#', width: 45, align: 'center' },
  { id: 'barcode', label: 'الكود', width: 140, align: 'center', sortable: true, sortKey: 'product_barcode_snapshot' },
  { id: 'name', label: 'التسمية', width: 280, align: 'right', sortable: true, sortKey: 'product_name_snapshot', flex: true },
  { id: 'category', label: 'التصنيف', width: 110, align: 'center', sortable: true, sortKey: 'category_id' },
  { id: 'unit', label: 'الوحدة', width: 90, align: 'center', sortable: true, sortKey: 'unit' },
  { id: 'purchase_price', label: 'سعر الشراء', width: 110, align: 'center', sortable: true, sortKey: 'unit_price' },
  { id: 'retail_margin', label: 'نسبة الربح (%)', width: 100, align: 'center', sortable: true, sortKey: 'retail_margin' },
  { id: 'wholesale_price', label: 'سعر بيع العلبة', width: 110, align: 'center', sortable: true, sortKey: 'wholesale_price' },
  { id: 'retail_price', label: 'سعر بيع القطعة', width: 110, align: 'center', sortable: true, sortKey: 'retail_price' },
  { id: 'quantity', label: 'الكمية', width: 100, align: 'center', sortable: true, sortKey: 'quantity' },
  { id: 'total', label: 'المبلغ الإجمالي', width: 130, align: 'center', sortable: true, sortKey: 'total' },
  { id: 'inventory_check', label: 'جرد', width: 80, align: 'center' },
  { id: 'actions', label: 'تعديل', width: 80, align: 'center' }
];

function normalizeArabic(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^a-z0-9\u0621-\u064A]/gi, '');
}

function getLevenshteinDistance(a: string, b: string): number {
  const tmp: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

function isFuzzyMatch(a: string, b: string): boolean {
  const normA = normalizeArabic(a);
  const normB = normalizeArabic(b);
  if (normA === normB) return true;
  
  const dist = getLevenshteinDistance(normA, normB);
  const minLen = Math.min(normA.length, normB.length);
  
  if (minLen <= 2) {
    return dist === 0;
  } else if (minLen <= 5) {
    return dist <= 1;
  } else {
    return dist <= 2;
  }
}

export default function PurchaseFormPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const dropdownScrollRef = useSmoothScroll<HTMLDivElement>();
  const supplierDropdownScrollRef = useSmoothScroll<HTMLDivElement>();

  const [columns, setColumns] = useState<ColumnDef[]>(() => {
    const savedStr = localStorage.getItem('purchase_invoice_columns_layout_v8');
    if (!savedStr) return INITIAL_COLUMNS;
    try {
      const saved = JSON.parse(savedStr) as ColumnDef[];
      return INITIAL_COLUMNS.map(initialCol => {
        const savedCol = saved.find(s => s.id === initialCol.id);
        if (savedCol) {
          return { ...savedCol, sortable: initialCol.sortable, sortKey: initialCol.sortKey };
        }
        return initialCol;
      });
    } catch {
      return INITIAL_COLUMNS;
    }
  });

  const panelColumns = useMemo(() => {
    return columns.map(c => ({
      key: c.id,
      label: c.label,
      hidden: !!c.hidden,
      width: c.width,
      align: c.align
    }));
  }, [columns]);

  const toggleHideColumn = useCallback((colId: string) => {
    setColumns(prev => {
      const visible = prev.filter(c => !c.hidden);
      if (visible.length <= 1 && !prev.find(c => c.id === colId)?.hidden) return prev;
      return prev.map(c => c.id === colId ? { ...c, hidden: !c.hidden } : c);
    });
  }, []);

  const reorderColumns = useCallback((from: number, to: number) => {
    setColumns(prev => {
      const copy = [...prev];
      const [removed] = copy.splice(from, 1);
      copy.splice(to, 0, removed);
      return copy;
    });
  }, []);

  const resetColumns = useCallback(() => {
    setColumns(INITIAL_COLUMNS);
  }, []);

  const isSavedRef = useRef(false);
  const isSavingRef = useRef(false);
  const printRef = useRef<HTMLDivElement>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);
  const supplierSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('purchase_invoice_columns_layout_v8', JSON.stringify(columns)); // إصدار v8
  }, [columns]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#product-search-container')) {
        setShowProductDD(false);
      }
      if (!target.closest('#supplier-search-container')) {
        setShowSupplierDD(false);
      }
    };
    window.addEventListener('click', closeMenu);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('click', closeMenu);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [currentInvoiceId, setCurrentInvoiceId] = useState<number | null>(() => {
    if (id) return null;
    try {
      const saved = localStorage.getItem('purchase_form_draft_invoice_id');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [invoiceStatus, setInvoiceStatus] = useState<'draft' | 'confirmed' | 'cancelled' | null>(() => {
    if (id) return null;
    try {
      const saved = localStorage.getItem('purchase_form_draft_invoice_status');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => {
    if (id) return '';
    try {
      const saved = localStorage.getItem('purchase_form_draft_invoice_number');
      return saved || '';
    } catch { return ''; }
  });
  
  useEffect(() => {
    if (!currentInvoiceId && !invoiceNumber) {
      setInvoiceNumber(`ACH-${Date.now().toString().slice(-8)}`);
    }
  }, [currentInvoiceId, invoiceNumber]);

  const [supplierId, setSupplierId] = useState<number | null>(() => {
    if (id) return null;
    try {
      const saved = localStorage.getItem('purchase_form_draft_supplier_id');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [supplierName, setSupplierName] = useState<string>(() => {
    if (id) return 'مورد عام';
    try {
      const saved = localStorage.getItem('purchase_form_draft_supplier_name');
      return saved || 'مورد عام';
    } catch { return 'مورد عام'; }
  });

  const [supplierBalance, setSupplierBalance] = useState<number>(() => {
    if (id) return 0;
    try {
      const saved = localStorage.getItem('purchase_form_draft_supplier_balance');
      return saved ? JSON.parse(saved) : 0;
    } catch { return 0; }
  });

  const [expectedInvoiceTotal, setExpectedInvoiceTotal] = useState<number | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'mixed'>(() => {
    if (id) return 'cash';
    try {
      const saved = localStorage.getItem('purchase_form_draft_payment_method');
      return (saved as any) || 'cash';
    } catch { return 'cash'; }
  });

  const [notes, setNotes] = useState<string>(() => {
    if (id) return '';
    try {
      const saved = localStorage.getItem('purchase_form_draft_notes');
      return saved || '';
    } catch { return ''; }
  });

  // Items
  const [items, setItems] = useState<PurchaseItem[]>(() => {
    if (id) return [];
    try {
      const saved = localStorage.getItem('purchase_form_draft_items');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [paidAmount, setPaidAmount] = useState<number>(() => {
    if (id) return 0;
    try {
      const saved = localStorage.getItem('purchase_form_draft_paid_amount');
      return saved ? JSON.parse(saved) : 0;
    } catch { return 0; }
  });

  const [customDate, setCustomDate] = useState<string | null>(() => {
    if (id) return null;
    try {
      const saved = localStorage.getItem('purchase_form_draft_custom_date');
      return saved || null;
    } catch { return null; }
  });

  // ── Sync draft states to localStorage (only if not editing an existing invoice via URL param) ──
  useEffect(() => {
    if (!id) {
      localStorage.setItem('purchase_form_draft_items', JSON.stringify(items));
    }
  }, [items, id]);

  useEffect(() => {
    if (!id) {
      if (currentInvoiceId !== null) {
        localStorage.setItem('purchase_form_draft_invoice_id', JSON.stringify(currentInvoiceId));
      } else {
        localStorage.removeItem('purchase_form_draft_invoice_id');
      }
    }
  }, [currentInvoiceId, id]);

  useEffect(() => {
    if (!id) {
      localStorage.setItem('purchase_form_draft_invoice_number', invoiceNumber);
    }
  }, [invoiceNumber, id]);

  useEffect(() => {
    if (!id) {
      if (supplierId !== null) {
        localStorage.setItem('purchase_form_draft_supplier_id', JSON.stringify(supplierId));
      } else {
        localStorage.removeItem('purchase_form_draft_supplier_id');
      }
    }
  }, [supplierId, id]);

  useEffect(() => {
    if (!id) {
      localStorage.setItem('purchase_form_draft_supplier_name', supplierName);
    }
  }, [supplierName, id]);

  useEffect(() => {
    if (!id) {
      localStorage.setItem('purchase_form_draft_supplier_balance', JSON.stringify(supplierBalance));
    }
  }, [supplierBalance, id]);

  useEffect(() => {
    if (!id) {
      localStorage.setItem('purchase_form_draft_payment_method', paymentMethod);
    }
  }, [paymentMethod, id]);

  useEffect(() => {
    if (!id) {
      localStorage.setItem('purchase_form_draft_notes', notes);
    }
  }, [notes, id]);

  useEffect(() => {
    if (!id) {
      localStorage.setItem('purchase_form_draft_paid_amount', JSON.stringify(paidAmount));
    }
  }, [paidAmount, id]);

  useEffect(() => {
    if (!id) {
      if (customDate !== null) {
        localStorage.setItem('purchase_form_draft_custom_date', customDate);
      } else {
        localStorage.removeItem('purchase_form_draft_custom_date');
      }
    }
  }, [customDate, id]);

  useEffect(() => {
    if (!id) {
      if (invoiceStatus !== null) {
        localStorage.setItem('purchase_form_draft_invoice_status', JSON.stringify(invoiceStatus));
      } else {
        localStorage.removeItem('purchase_form_draft_invoice_status');
      }
    }
  }, [invoiceStatus, id]);
  const [searchParams] = useSearchParams();

  // Auto-add product from ?productId= or ?barcode= query param (from Low Stock replenish or mobile barcode scan)
  const productIdParam = searchParams.get('productId');
  const barcodeParam = searchParams.get('barcode');
  const productAutoAddedRef = useRef<string | null>(null);
  useEffect(() => {
    const activeParam = productIdParam || barcodeParam;
    if (!activeParam || currentInvoiceId || productAutoAddedRef.current === activeParam) return;
    productAutoAddedRef.current = activeParam;

    const autoAddProduct = async () => {
      try {
        let res;
        if (productIdParam) {
          res = await window.electronAPI.invoke('db:products:getById', Number(productIdParam));
        } else if (barcodeParam) {
          res = await window.electronAPI.invoke('db:products:getByBarcodeOrCode', barcodeParam);
        }
        if (res && res.success && res.data) {
          addProduct(res.data);
          showNotification('success', `تمت إضافة "${res.data.name}" للسلة`);
        }
      } catch { /* silent */ }
    };
    autoAddProduct();
  }, [productIdParam, barcodeParam, currentInvoiceId]);

  // Auto-import invoice from mobile
  const mobileImportParam = searchParams.get('mobileImport');
  const hasTriggeredMobileImport = useRef(false);
  useEffect(() => {
    if (mobileImportParam === 'true' && !hasTriggeredMobileImport.current) {
      hasTriggeredMobileImport.current = true;
      const savedJson = localStorage.getItem('purchase_import_json_from_mobile');
      if (savedJson) {
        setImportJsonText(savedJson);
        localStorage.removeItem('purchase_import_json_from_mobile');
        setShowSmartImportModal(true);
        setTimeout(() => {
          handleAnalyzeJson(savedJson);
        }, 300);
      }
    }
  }, [mobileImportParam]);

  useEffect(() => {
    if (items.length === 0) {
      isSavedRef.current = false;
    }
  }, [items]);

  // Sorting
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);

  const toggleSort = useCallback((key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else {
      setSortDir(d => {
        if (d === 'asc') return 'desc';
        if (d === 'desc') return null;
        return 'asc';
      });
    }
  }, [sortKey]);

  const sortedItems = [...items].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;
    let valA = (a as any)[sortKey] ?? '';
    let valB = (b as any)[sortKey] ?? '';
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortDir === 'asc' ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
  });

  // Search states
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [productResults, setProductResults] = useState<any[]>([]);
  const [showProductDD, setShowProductDD] = useState(false);
  const [ddSortKey, setDdSortKey] = useState<string>('');
  const [ddSortDir, setDdSortDir] = useState<'asc' | 'desc'>('asc');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierResults, setSupplierResults] = useState<any[]>([]);
  const [showSupplierDD, setShowSupplierDD] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [saveSessionId, setSaveSessionId] = useState(`PURCHASE-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<any>(null);
  const shortcuts = useShortcutStore(state => state.shortcuts);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, colId: string } | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const draggedColIndex = useRef<number | null>(null); 

  // Mapping states for unmatched imported items
  const [mappingRowId, setMappingRowId] = useState<string | null>(null);
  const [rowSearchQuery, setRowSearchQuery] = useState("");
  const [rowSearchResults, setRowSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (!mappingRowId || rowSearchQuery.length < 1) {
      setRowSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res: any = await window.electronAPI?.invoke('db:products:search', rowSearchQuery);
      if (res?.success) {
        setRowSearchResults(res.data);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [rowSearchQuery, mappingRowId]);

  const [rowContextMenu, setRowContextMenu] = useState<{ x: number; y: number; item: PurchaseItem } | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoModalProduct, setPhotoModalProduct] = useState<{ id: number; name: string; barcode?: string } | null>(null);

  useEffect(() => {
    const close = () => setRowContextMenu(null);
    if (rowContextMenu) window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [rowContextMenu]);

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openModalSearch, setOpenModalSearch] = useState('');
  const [openModalDate, setOpenModalDate] = useState(new Date().toISOString().split('T')[0]);
  const [openModalInvoices, setOpenModalInvoices] = useState<any[]>([]);
  const [openModalLoading, setOpenModalLoading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // ── Smart AI Import States ──
  const [showSmartImportModal, setShowSmartImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);
  const [invoiceQueue, setInvoiceQueue] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const loadInvoiceQueue = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.invoke('mobile:get-invoice-queue');
      if (res?.success) {
        const queue = res.data || [];
        setInvoiceQueue(queue);
        // Automatically select the first invoice in the queue if none is selected,
        // or if the previously selected invoice is no longer in the queue.
        setSelectedInvoice((prev: any) => {
          if (prev && queue.some((i: any) => i.id === prev.id)) {
            return queue.find((i: any) => i.id === prev.id);
          }
          return queue.length > 0 ? queue[0] : null;
        });
      }
    } catch (err) {
      console.error('Failed to load invoice queue:', err);
    }
  }, []);

  // Handle openImport search param
  useEffect(() => {
    if (searchParams.get('openImport') === 'true') {
      setShowSmartImportModal(true);
      loadInvoiceQueue();
    }
  }, [searchParams, loadInvoiceQueue]);

  // ── Jard Mode States ──
  const [isJardMode, setIsJardMode] = useState(false);
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const [focusedProductIndex, setFocusedProductIndex] = useState<number>(-1);

  useEffect(() => {
    setFocusedProductIndex(-1);
  }, [productSearch, showProductDD]);

  useEffect(() => {
    if (focusedProductIndex >= 0) {
      const el = document.getElementById(`dd-product-row-${focusedProductIndex}`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedProductIndex]);

  useEffect(() => {
    window.electronAPI?.invoke('db:categories:getAll').then((res: any) => {
      if (res?.success) setCategories(res.data);
    });
    window.electronAPI?.invoke('db:units:getAll').then((res: any) => {
      if (res?.success) setUnits(res.data);
    });
    window.electronAPI?.invoke('db:suppliers:getAll').then((res: any) => {
      if (res?.success) setSuppliers(res.data);
    });
    loadInvoiceQueue();

    if (window.electronAPI) {
      window.electronAPI.on('mobile:invoice-uploaded', loadInvoiceQueue);
      return () => {
        window.electronAPI?.removeAllListeners('mobile:invoice-uploaded');
      };
    }
  }, [loadInvoiceQueue]);

  // Handle initializing focusedRowIndex when Jard Mode is toggled on
  useEffect(() => {
    if (isJardMode) {
      if (items.length > 0 && focusedRowIndex === -1) {
        setFocusedRowIndex(0);
      }
    } else {
      setFocusedRowIndex(-1);
    }
  }, [isJardMode, items.length]);

  // Scroll active row into view
  useEffect(() => {
    if (focusedRowIndex >= 0) {
      const el = document.getElementById(`purchase-row-${focusedRowIndex}`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedRowIndex]);

  // Keyboard navigation for Jard Mode
  useEffect(() => {
    if (!isJardMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isEditable = activeEl && (
        (activeEl.tagName === 'INPUT' && !(activeEl as HTMLInputElement).readOnly && !(activeEl as HTMLInputElement).disabled) ||
        (activeEl.tagName === 'TEXTAREA' && !(activeEl as HTMLTextAreaElement).readOnly && !(activeEl as HTMLTextAreaElement).disabled) ||
        activeEl.getAttribute('contenteditable') === 'true'
      );
      if (isEditable) return;
      
      // If a text input inside the edit product modal or any other modal is open, don't hijack keys
      if (editingProductId !== null || showSmartImportModal || showOpenModal || showAddModal || showPrintPreview || showPinModal) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedRowIndex(prev => Math.min(prev + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedRowIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === ' ') {
        e.preventDefault();
        if (focusedRowIndex >= 0 && focusedRowIndex < items.length) {
          const item = sortedItems[focusedRowIndex];
          if (item) {
            updateItem(item.id, 'inventory_check', !item.inventory_check);
            setFocusedRowIndex(prev => Math.min(prev + 1, items.length - 1));
          }
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedRowIndex >= 0 && focusedRowIndex < items.length) {
          const item = sortedItems[focusedRowIndex];
          if (item) {
            setEditingProductId(item.product_id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isJardMode, focusedRowIndex, items, sortedItems, editingProductId, showSmartImportModal, showOpenModal, showAddModal, showPrintPreview, showPinModal]);

  const total = roundTo2(items.reduce((s, i) => s + i.total, 0));
  const remaining = roundTo2(total - paidAmount);

  useEffect(() => {
    if (paymentMethod === 'cash') setPaidAmount(total);
    else if (paymentMethod === 'credit') setPaidAmount(0);
  }, [total, paymentMethod]);

  const loadInvoices = async () => {
    setOpenModalLoading(true);
    try {
      const res: any = await window.electronAPI.invoke('db:purchases:getAll', {
        date_from: openModalDate,
        date_to: openModalDate,
        search: openModalSearch,
        limit: 50
      });
      if (res.success) setOpenModalInvoices(res.data);
    } catch (e) { showNotification('error', 'خطأ في تحميل الفواتير'); }
    setOpenModalLoading(false);
  };

  useEffect(() => {
    if (showOpenModal) {
      loadInvoices();
    }
  }, [showOpenModal, openModalDate, openModalSearch]);

  const handleOpenInvoice = async (id: number) => {
    try {
      const res: any = await window.electronAPI?.invoke('db:purchases:getById', id);
      if (res?.success && res.data) {
        const inv = res.data;
        setCurrentInvoiceId(inv.id);
        isSavedRef.current = true;
        setInvoiceNumber(inv.supplier_invoice_number || inv.invoice_number);
        setSupplierId(inv.supplier_id);
        setSupplierName(inv.supplier_name || 'مورد عام');
        setSupplierBalance(inv.supplier_balance || 0);
        setPaidAmount(inv.paid || 0);
        setNotes(inv.notes || '');
        setItems(inv.items || []);
        setIsCancelled(inv.status === 'cancelled');
        setInvoiceStatus(inv.status);
        setCustomDate(inv.date || null);
        setShowOpenModal(false);
      }
    } catch (e) {
      console.error('Error opening invoice:', e);
    }
  };

  // Auto-load invoice from URL param (/purchases/:id) or clear state if new
  useEffect(() => {
    if (id) {
      const numericId = parseInt(id, 10);
      if (!isNaN(numericId)) {
        handleOpenInvoice(numericId);
      }
    } else {
      setItems([]); 
      setSupplierId(null); 
      setSupplierName('مورد عام');
      setSupplierBalance(0);
      setInvoiceNumber(`ACH-${Date.now().toString().slice(-8)}`);
      setCurrentInvoiceId(null);
      setInvoiceStatus(null);
      setPaidAmount(0); 
      setNotes(''); 
      setPaymentMethod('cash');
      setIsCancelled(false);
      setCustomDate(null);
    }
  }, [id]);

  // ── Smart AI Import Helpers ──
  const categoryNames = categories.map(c => c.name).join(', ');
  const promptText = `Please analyze the attached invoice image carefully. Your task is to extract all the details and output them strictly in JSON format. Do not include any conversational explanation, prefaces, or markdown code block formatting (such as \`\`\`json ... \`\`\`). The output must be pure raw JSON conforming to the schema below.

Here is the JSON schema to output:
{
  "supplier_name": "Name of the supplier/seller as written on the invoice (e.g., 'SARL PIECES AUTO')",
  "supplier_phone": "Phone number(s) of the supplier if printed on the invoice, otherwise null",
  "supplier_address": "Address/Location of the supplier if printed on the invoice, otherwise null",
  "invoice_number": "Invoice number or reference number as printed (e.g., 'BR 05108/2026')",
  "paid_amount": 85000.00, // The amount paid / Montant Versement as printed on the invoice, otherwise null
  "due_amount": 0.00, // The remaining balance / Reste à Payer as printed on the invoice, otherwise null
  "discount": 50.00, // Total discount or remise as printed on the invoice, otherwise null
  "items": [
    {
      "index": 1,
      "original_name": "Product name exactly as written in French or English on the invoice (e.g., 'FILTRE HUILE PEUGEOT 206')",
      "translated_name_ar": "Translate the core spare part name into a clear, customer-friendly Arabic name for receipts (e.g., 'فلتر زيت بيجو 206'), otherwise null if it cannot be translated accurately",
      "sku": "Part number, OEM code, barcode, or reference code if visible, otherwise null (strict rule: do not invent values, do not put product name or category here, leave null if not found)",
      "qty": 10,
      "purchase_price": 350.00,
      "category_suggestion": "The category classification suggested for this item in Arabic. You MUST choose exactly from this list of categories: ${categoryNames || 'فلاتر, زيوت ومواد التشحيم, فرامل, كهرباء السيارة, محرك, تعليق وتوجيه, إطارات وعجلات, إكسسوارات'}",
      "unit_suggestion": "The unit of measurement suggested (choose from: Piece, Litre, Box)",
      "packaging": {
        "is_box": false, // Set to true if the item name, description, or row indicates it is bought in bulk/box/carton (e.g., 'Carton 12', 'Box 24', 'Pack 6')
        "box_size": 1, // If is_box is true, extract the number of pieces inside the box (e.g., 12 for 'Carton 12'). Otherwise, 1
        "box_name": "Name of the packaging unit (e.g., 'Carton', 'Box', 'Pack') or null"
      },
      "brand_suggestion": "Brand name suggestion of the spare part (e.g., Purflux, Brembo, Valeo, Bosch, Sachs, Monroe) if visible or inferred",
      "compatibility_suggestions": [
        {
          "brand": "Brand name (e.g., Renault, Peugeot)",
          "model": "Model name (e.g., Symbol, 208)"
        }
      ], // List of compatible car models. If a general brand like DFM, DFSK, Chana, Gonow, or Hafei is written on the invoice, use your knowledge of the Algerian mini-truck market to list the specific models it is compatible with, such as: 'DFSK K01', 'DFSK V21', 'DFM K01', 'DFM Star', 'Chana Star', 'Hafei Ruiyi', 'Chery Yoki' instead of just the brand name.
      "needs_review": false // Set to true if the item description is blurry/illegible, prices are ambiguous, or you are highly uncertain about its details
    }
  ]
}

Strict Rules:
1. Output ONLY a valid JSON object. Do not wrap it in markdown code blocks.
2. If buying price or quantity is missing, use 0 for price and 1 for quantity.
3. If no barcode, OEM reference, or SKU is found on the row, set "sku" to null.
4. Extract the product names exactly as written in French, preserving all letters, numbers, and specifications.
5. Pay close attention to packaging keywords (Carton, Box, Pack, Lot) to extract packaging information accurately. If unsure, set "needs_review" to true.`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptText);
    showNotification('success', 'تم نسخ برومبت التحليل الذكي للحافظة!');
  };

  const handleCopyImage = async () => {
    if (!selectedInvoice) return;
    try {
      const imgUrl = `http://localhost:8766/invoices/${selectedInvoice.filePath}`;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get 2d context');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(async (blob) => {
            if (!blob) throw new Error('Blob creation failed');
            try {
              await navigator.clipboard.write([
                new ClipboardItem({
                  'image/png': blob
                })
              ]);
              showNotification('success', 'تم نسخ الصورة للحافظة بنجاح! يمكنك لصقها الآن في Gemini أو ChatGPT.');
            } catch (err: any) {
              console.error('Clipboard write error:', err);
              showNotification('error', 'فشل نسخ الصورة للحافظة. يمكنك حفظها يدوياً.');
            }
          }, 'image/png');
        } catch (err) {
          console.error('Canvas convert error:', err);
          showNotification('error', 'فشل معالجة الصورة للنسخ');
        }
      };
      img.onerror = () => {
        showNotification('error', 'فشل تحميل الصورة للنسخ');
      };
      img.src = imgUrl;
    } catch (err) {
      console.error('Error fetching image:', err);
      showNotification('error', 'حدث خطأ أثناء نسخ الصورة');
    }
  };

  const handleAnalyzeJson = async (overrideJson?: string) => {
    const textToAnalyze = overrideJson || importJsonText;
    if (!textToAnalyze.trim()) {
      showNotification('error', 'الرجاء لصق كود الـ JSON أولاً');
      return;
    }
    setIsReconciling(true);
    try {
      let cleanedJson = textToAnalyze.trim();
      if (cleanedJson.includes('```')) {
        const matches = cleanedJson.match(/```(?:json)?([\s\S]+?)```/);
        if (matches && matches[1]) {
          cleanedJson = matches[1].trim();
        }
      }
      
      // Extract from the first '{' to the last '}' to strip any external text
      const firstBrace = cleanedJson.indexOf('{');
      const lastBrace = cleanedJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
      }
      
      const parsed = JSON.parse(cleanedJson);
      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error('الـ JSON لا يحتوي على قائمة المنتجات items');
      }

      let vehicles: any[] = [];
      try {
        const vRes = await window.electronAPI.invoke('db:vehicles:getModels');
        if (vRes.success && vRes.data) {
          vehicles = vRes.data;
        }
      } catch (e) {
        console.error('Failed to load vehicle models:', e);
      }

      let dbBrands: any[] = [];
      try {
        const bRes = await window.electronAPI.invoke('db:brands:getAll');
        if (bRes.success && bRes.data) {
          dbBrands = bRes.data;
        }
      } catch (e) {
        console.error('Failed to load brands:', e);
      }

      let matchedSupplierId: number | null = null;
      let matchedSupplierName = parsed.supplier_name || 'مورد عام';
      let matchedSupplierBalance = 0;
      if (parsed.supplier_name) {
        try {
          const supRes = await window.electronAPI.invoke('db:suppliers:getAll');
          if (supRes.success && supRes.data) {
            const list = supRes.data;
            let bestMatch = null;
            
            // First try exact normalized match
            const targetNorm = normalizeArabic(parsed.supplier_name);
            bestMatch = list.find((s: any) => normalizeArabic(s.name) === targetNorm);
            
            // If not found, try fuzzy matching
            if (!bestMatch) {
              for (const s of list) {
                if (isFuzzyMatch(parsed.supplier_name, s.name)) {
                  bestMatch = s;
                  break;
                }
              }
            }

            if (bestMatch) {
              matchedSupplierId = bestMatch.id;
              matchedSupplierName = bestMatch.name;
              matchedSupplierBalance = bestMatch.balance || 0;
              showNotification('info', `تمت مطابقة المورد "${parsed.supplier_name}" تلقائياً مع "${bestMatch.name}" لتفادي تكرار الاسم`);
            } else {
              // Auto-create supplier if it doesn't exist
              const genCode = `SUP-${Date.now().toString().slice(-6)}`;
              const createRes = await window.electronAPI.invoke('db:suppliers:create', {
                code: genCode,
                name: parsed.supplier_name,
                phone: parsed.supplier_phone || null,
                address: parsed.supplier_address || null,
                notes: 'تم إنشاؤه تلقائياً عن طريق استيراد الفاتورة بالذكاء الاصطناعي'
              });
              if (createRes.success) {
                matchedSupplierId = createRes.id;
                matchedSupplierName = parsed.supplier_name;
                matchedSupplierBalance = 0;
                showNotification('success', `تم تسجيل مورد جديد: "${parsed.supplier_name}"`);
              }
            }
          }
        } catch (e) {
          console.error('Failed to resolve supplier:', e);
        }
      }

      // Update supplier directly on main page
      setSupplierId(matchedSupplierId);
      setSupplierName(matchedSupplierName);
      setSupplierBalance(matchedSupplierBalance);

      // Update invoice number directly on main page
      if (parsed.invoice_number) {
        setInvoiceNumber(parsed.invoice_number);
      } else if (parsed.invoice && parsed.invoice.number) {
        setInvoiceNumber(parsed.invoice.number);
      }

      // Set expected invoice total with safe fallback
      let expTotal: number | null = null;
      if (parsed.invoice && parsed.invoice.total !== undefined) {
        expTotal = Number(parsed.invoice.total);
      } else if (parsed.total !== undefined) {
        expTotal = Number(parsed.total);
      } else if (parsed.total_amount !== undefined) {
        expTotal = Number(parsed.total_amount);
      }
      setExpectedInvoiceTotal(expTotal);

      // Compute total of imported items
      const totalImported = parsed.items.reduce((acc: number, i: any) => acc + ((i.qty || i.quantity || 1) * (i.purchase_price || i.unit_price || 0)), 0);

      // Update paid amount and payment method
      const paidVal = parsed.paid_amount !== undefined ? parsed.paid_amount : (parsed.invoice && parsed.invoice.paid_amount !== undefined ? parsed.invoice.paid_amount : null);
      if (paidVal !== undefined && paidVal !== null) {
        const paid = Number(paidVal) || 0;
        setPaidAmount(paid);
        if (paid === 0) {
          setPaymentMethod('credit');
        } else if (paid < totalImported) {
          setPaymentMethod('mixed');
        } else {
          setPaymentMethod('cash');
        }
      }

      // Add discount info to notes if exists
      if (parsed.discount && Number(parsed.discount) > 0) {
        let customNotes = notes || '';
        customNotes = `${customNotes ? customNotes + ' | ' : ''}تخفيض الفاتورة: ${parsed.discount} دج`;
        setNotes(customNotes);
      }

      const finalItems: PurchaseItem[] = [];
      const api = window.electronAPI;
      if (!api) return;

      for (const item of parsed.items) {
        let productId: number | null = null;
        let productName: string = item.translated_name_ar || item.original_name || item.name;
        let productNameFr: string = item.original_name || item.name;
        let productBarcode: string | null = item.sku;
        let categoryId = 1;
        let unitId = 1;
        let brandId = 1;
        let isNewProduct = true;
        let needsReview = item.needs_review !== undefined ? item.needs_review : false;

        const skuStr = item.sku ? item.sku.toString().trim() : '';
        if (skuStr) {
          const barcodeRes = await api.invoke('db:products:getByBarcodeOrCode', skuStr);
          if (barcodeRes.success && barcodeRes.data) {
            productId = barcodeRes.data.id;
            productName = barcodeRes.data.name;
            productBarcode = barcodeRes.data.barcode || barcodeRes.data.internal_code;
            categoryId = barcodeRes.data.category_id || 1;
            unitId = barcodeRes.data.unit_id || 1;
            brandId = barcodeRes.data.brand_id || 1;
            isNewProduct = false;
          }
        }

        const nameSearchStr = item.original_name || item.name || '';
        if (isNewProduct && nameSearchStr) {
          const nameRes = await api.invoke('db:products:search', nameSearchStr);
          if (nameRes.success && nameRes.data && nameRes.data.length > 0) {
            const bestMatch = nameRes.data[0];
            productId = bestMatch.id;
            productName = bestMatch.name;
            productBarcode = bestMatch.barcode || bestMatch.internal_code;
            categoryId = bestMatch.category_id || 1;
            unitId = bestMatch.unit_id || 1;
            brandId = bestMatch.brand_id || 1;
            isNewProduct = false;
          }
        }

        // If it is a new product, we mark it for review
        if (isNewProduct) {
          needsReview = true;
        }

        // Map Category suggestion
        if (isNewProduct && item.category_suggestion) {
          const suggestion = item.category_suggestion.trim().toLowerCase();
          
          // English to Arabic helper mapping just in case
          const englishToArabicMap: Record<string, string> = {
            'filters': 'فلاتر',
            'filter': 'فلاتر',
            'oils': 'زيوت ومواد التشحيم',
            'oil': 'زيوت ومواد التشحيم',
            'brakes': 'فرامل',
            'brake': 'فرامل',
            'electrical': 'كهرباء السيارة',
            'engine': 'محرك',
            'suspension': 'تعليق وتوجيه',
            'steering': 'تعليق وتوجيه',
            'tires': 'إطارات وعجلات',
            'wheels': 'إطارات وعجلات',
            'accessories': 'إكسسوارات'
          };
          
          const mappedSuggestion = englishToArabicMap[suggestion] || suggestion;

          const cat = categories.find(c => 
            c.name.trim() === item.category_suggestion.trim() ||
            c.name.toLowerCase().includes(mappedSuggestion) || 
            mappedSuggestion.includes(c.name.toLowerCase())
          );
          if (cat) categoryId = cat.id;
        }

        // Map Unit suggestion
        if (isNewProduct) {
          const unitSuggestion = item.packaging?.is_box ? 'Box' : (item.unit_suggestion || '');
          const u = units.find(unit => 
            unit.name.toLowerCase().includes(unitSuggestion.toLowerCase()) || 
            unit.code.toLowerCase().includes(unitSuggestion.toLowerCase())
          );
          if (u) {
            unitId = u.id;
          } else {
            // Default unit
            const pUnit = units.find(unit => unit.name.includes('قطعة'));
            if (pUnit) unitId = pUnit.id;
          }
        }

        // Map Brand suggestion
        if (isNewProduct && item.brand_suggestion) {
          const b = dbBrands.find(brand => 
            brand.name.toLowerCase().includes(item.brand_suggestion.toLowerCase()) || 
            item.brand_suggestion.toLowerCase().includes(brand.name.toLowerCase())
          );
          if (b) brandId = b.id;
        }

        const purchasePrice = item.purchase_price || 0;
        const retailMargin = 30;
        const retailPrice = Math.round(purchasePrice * (1 + retailMargin / 100));
        const wholesalePrice = Math.round(purchasePrice * 1.2);

        const qtyVal = item.qty || item.quantity || 1;

        finalItems.push({
          id: `pi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          product_id: productId || 0, // 0 indicates a pending new product
          product_name_snapshot: productName,
          product_barcode_snapshot: productBarcode,
          product_name: productName,
          product_name_fr: productNameFr,
          quantity: qtyVal,
          unit: item.packaging?.is_box ? 'علبة' : (units.find(u => u.id === unitId)?.name || 'قطعة'),
          unit_price: purchasePrice,
          total: roundTo2(purchasePrice * qtyVal),
          wholesale_price: wholesalePrice,
          retail_price: retailPrice,
          retail_margin: retailMargin,
          category_id: categoryId,
          unit_id: unitId,
          brand_id: brandId,
          sort_order: items.length + finalItems.length + 1,
          inventory_check: false,
          isNewProduct: isNewProduct,
          needs_review: needsReview,
          has_sub_unit: item.packaging?.is_box || false,
          pieces_per_box: item.packaging?.box_size || 1,
          compatibility_suggestions: item.compatibility_suggestions || []
        });
      }

      setItems(prev => [...prev, ...finalItems]);
      showNotification('success', `تم استيراد ${parsed.items.length} منتج بنجاح إلى الفاتورة مباشرة!`);
      
      if (selectedInvoice) {
        await api.invoke('mobile:mark-invoice-processed', selectedInvoice.id);
        setSelectedInvoice(null);
        loadInvoiceQueue();
      }

      setShowSmartImportModal(false);
      setImportJsonText('');
    } catch (e: any) {
      showNotification('error', `فشل تحليل واستيراد البيانات: تأكد من صحة تنسيق JSON. (${e.message})`);
    }
    setIsReconciling(false);
  };

  // (rest of code is unchanged)

  useEffect(() => {
    if (productSearch.length < 1) { setProductResults([]); setShowProductDD(false); return; }
    const t = setTimeout(async () => {
      const res: any = await window.electronAPI?.invoke('db:products:search', productSearch, selectedCategoryId);
      if (res?.success) { setProductResults(res.data); setShowProductDD(true); }
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch, selectedCategoryId]);

  useEffect(() => {
    if (supplierSearch.length < 1) { setSupplierResults([]); setShowSupplierDD(false); return; }
    const t = setTimeout(async () => {
      const res: any = await window.electronAPI?.invoke('db:suppliers:getAll', { search: supplierSearch });
      if (res?.success) { setSupplierResults(res.data); setShowSupplierDD(true); }
    }, 300);
    return () => clearTimeout(t);
  }, [supplierSearch]);

  const addProduct = (p: any) => {
    // Record usage
    if (window.electronAPI && productSearch.trim()) {
      window.electronAPI.invoke('db:products:recordUsage', { query: productSearch, productId: p.id })
        .catch(err => console.error('Error recording usage:', err));
    }

    const existing = items.find(i => i.product_id === p.id);
    if (existing) {
      setItems(prev => prev.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1, total: roundTo2(i.unit_price * (i.quantity + 1)) } : i));
    } else {
      setItems(prev => [...prev, {
        id: `pi-${Date.now()}`, 
        product_id: p.id, 
        product_name_snapshot: p.name_fr || p.name,
        product_barcode_snapshot: p.barcode || p.internal_code,
        product_name: p.name,
        product_name_fr: p.name_fr,
        quantity: p.initial_stock || 1, 
        unit: p.unit_name || p.unit || 'قطعة', 
        unit_price: p.purchase_price || 0, 
        total: roundTo2((p.purchase_price || 0) * (p.initial_stock || 1)),
        wholesale_price: p.wholesale_price || 0,
        retail_price: p.retail_price || 0,
        retail_margin: p.purchase_price > 0 && p.retail_price > 0 ? Math.round(((p.retail_price / p.purchase_price) - 1) * 100) : 30,
        category_id: p.category_id,
        unit_id: p.unit_id,
        sort_order: prev.length + 1
      }]);
    }
    setProductSearch(''); 
    setShowProductDD(false);
    productSearchRef.current?.focus();
  };

  useEffect(() => {
    if (!window.electronAPI) return;

    const handleMobileBarcode = async (data: { barcode: string; found: boolean; name: string; price: number | null; quantity: number | null }) => {
      if (!data.found) return; // Handled globally by App.tsx to avoid duplicate errors
      try {
        const res = await window.electronAPI.invoke('db:products:getByBarcodeOrCode', data.barcode);
        if (res.success && res.data) {
          addProduct(res.data);
          showNotification('success', `تمت إضافة المنتج من الهاتف: ${res.data.name} 📱`);
        }
      } catch (err) {
        console.error('Error handling mobile barcode scan:', err);
      }
    };

    window.electronAPI.on('mobile:barcode-scanned', handleMobileBarcode);
    return () => {
      window.electronAPI?.removeAllListeners('mobile:barcode-scanned');
    };
  }, [addProduct]);

  const updateItem = (id: string, field: string, value: number | string | boolean) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const u = { ...item, [field]: value };
      
      if (field === 'unit_id') {
        const uId = Number(value);
        const unitName = units.find(unit => unit.id === uId)?.name || '';
        u.unit = unitName;
      }
      
      if (field === 'unit_price' || field === 'quantity') {
        u.total = roundTo2(Number(u.unit_price) * Number(u.quantity));
      }
      
      if (field === 'unit_price' && u.retail_margin) {
         u.retail_price = Math.round(Number(u.unit_price) * (1 + Number(u.retail_margin) / 100));
      } else if (field === 'retail_margin') {
         u.retail_price = Math.round(Number(u.unit_price) * (1 + Number(value) / 100));
      } else if (field === 'retail_price' && u.unit_price > 0) {
         u.retail_margin = Math.round(((Number(value) / Number(u.unit_price)) - 1) * 100);
      }
      
      return u;
    }));
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  // Helper to resolve fitments based on text suggestions
  const resolveFitments = async (suggestions: any[]): Promise<any[]> => {
    if (!suggestions || suggestions.length === 0) return [];
    const api = window.electronAPI;
    if (!api) return [];
    
    let vehiclesList: any[] = [];
    try {
      const vRes = await api.invoke('db:vehicles:getModels');
      if (vRes.success && vRes.data) vehiclesList = vRes.data;
    } catch {}

    const resolved = [];
    for (const sug of suggestions) {
      if (!sug) continue;
      
      let brandName = '';
      let modelName = '';
      let searchString = '';

      if (typeof sug === 'object') {
        brandName = (sug.brand || sug.make || '').trim();
        modelName = (sug.model || '').trim();
        searchString = `${brandName} ${modelName}`.trim();
      } else if (typeof sug === 'string') {
        searchString = sug.trim();
        const parts = searchString.split(/\s+/);
        if (parts.length >= 2) {
          brandName = parts[0];
          modelName = parts.slice(1).join(' ');
        } else {
          modelName = searchString;
        }
      }

      if (!searchString) continue;

      const lowerBrand = brandName.toLowerCase();
      const lowerModel = modelName.toLowerCase();
      const lowerSearch = searchString.toLowerCase();

      // 1. Try to find in existing models
      const matchedModel = vehiclesList.find(v => {
        const brand = (v.brand_name || '').toLowerCase();
        const model = (v.name || '').toLowerCase();
        
        if (lowerBrand && lowerModel) {
          return brand === lowerBrand && model === lowerModel;
        }
        return lowerSearch.includes(model) && (lowerSearch.includes(brand) || brand.includes(lowerSearch.split(' ')[0]));
      });

      if (matchedModel) {
        resolved.push({
          vehicle_brand_id: matchedModel.vehicle_brand_id,
          vehicle_model_id: matchedModel.id
        });
      } else {
        // 2. Parse and create using parseAndCreate
        try {
          const fitRes = await api.invoke('db:vehicles:parseAndCreate', searchString);
          if (fitRes.success && fitRes.data) {
            resolved.push({
              vehicle_brand_id: fitRes.data.vehicle_brand_id,
              vehicle_model_id: fitRes.data.vehicle_model_id
            });
          }
        } catch {}
      }
    }
    return resolved;
  };

  // Helper to create all pending products before saving the invoice
  const createPendingProducts = async (currentItems: PurchaseItem[]): Promise<PurchaseItem[]> => {
    const api = window.electronAPI;
    if (!api) return currentItems;

    const resolvedItems = [...currentItems];
    for (let i = 0; i < resolvedItems.length; i++) {
      const item = resolvedItems[i];
      if (item.isNewProduct || item.product_id <= 0) {
        // Resolve fitments
        const fitments = await resolveFitments(item.compatibility_suggestions || []);

        const newProductData = {
          name: item.product_name || item.product_name_snapshot,
          name_fr: item.product_name_fr || item.product_name_snapshot,
          barcode: item.product_barcode_snapshot || undefined,
          internal_code: item.product_barcode_snapshot ? undefined : `INT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`,
          category_id: item.category_id || 1,
          brand_id: item.brand_id || 1,
          unit_id: item.unit_id || 1,
          purchase_price: item.unit_price,
          retail_price: item.retail_price,
          wholesale_price: item.wholesale_price,
          initial_stock: 0,
          has_sub_unit: item.has_sub_unit || false,
          pieces_per_box: item.pieces_per_box || 1,
          fitments
        };

        const createRes = await api.invoke('db:products:create', newProductData);
        if (createRes.success && createRes.id) {
          const newId = createRes.id;
          resolvedItems[i] = {
            ...item,
            product_id: newId,
            product_barcode_snapshot: item.product_barcode_snapshot || createRes.internal_code || `INT-${newId}`,
            isNewProduct: false,
            needs_review: false
          };
        } else {
          throw new Error(createRes.error || `فشل إنشاء المنتج "${item.product_name_snapshot}"`);
        }
      }
    }
    return resolvedItems;
  };

  // ── Auto-save as draft (auto-park) ──
  const autoSaveDraft = async (): Promise<number | false> => {
    if (items.length === 0) return false;
    try {
      const api = window.electronAPI;
      if (!api) return false;

      // Resolve pending products first
      const resolvedItems = await createPendingProducts(items);
      setItems(resolvedItems);

      const invoice = {
        id: currentInvoiceId || undefined,
        supplier_invoice_number: invoiceNumber,
        supplier_id: supplierId || undefined,
        subtotal: total, tax_amount: 0, discount_amount: 0,
        total, paid: paidAmount,
        status: 'draft',
        notes,
        items: resolvedItems.map(i => ({
          product_id: i.product_id,
          product_name_snapshot: i.product_name_snapshot,
          product_barcode_snapshot: i.product_barcode_snapshot,
          quantity: i.quantity, unit: i.unit,
          unit_price: i.unit_price, total: i.total,
          wholesale_price: i.wholesale_price,
          retail_price: i.retail_price,
          category_id: i.category_id, unit_id: i.unit_id,
        })),
        _user_id: user?.id || 1,
        session_id: saveSessionId,
        custom_date: customDate || undefined
      };
      const res: any = await api.invoke('db:purchases:save', invoice);
      if (res?.success) {
        if (!currentInvoiceId && res.id) setCurrentInvoiceId(res.id);
        setInvoiceStatus('draft');
        return res.id || true;
      }
      return false;
    } catch { return false; }
  };

  const resetInvoice = async (skipAutoPark: any = false) => {
    const shouldSkip = skipAutoPark === true;
    // Auto-park: save current unsaved invoice as draft before clearing
    if (!shouldSkip && items.length > 0 && !isSavedRef.current && invoiceStatus !== 'confirmed' && invoiceStatus !== 'cancelled') {
      const draftId = await autoSaveDraft();
      if (draftId) {
        playNotificationSound('success');
        showAutoParkToast('purchases', draftId);
      }
    }
    if (id) {
      navigate('/purchases/new');
      return;
    }
    setItems([]); 
    setSupplierId(null); 
    setSupplierName('مورد عام');
    setSupplierBalance(0);
    setInvoiceNumber(`ACH-${Date.now().toString().slice(-8)}`);
    setCurrentInvoiceId(null);
    setInvoiceStatus(null);
    setPaidAmount(0); 
    setNotes(''); 
    setPaymentMethod('cash');
    setIsCancelled(false);
    setCustomDate(null);
  };

  const saveInvoice = async () => {
    if (items.length === 0) return;
    
    const wasSaving = isSavingRef.current;
    isSavingRef.current = true;
    if (wasSaving || saving) {
      isSavingRef.current = false;
      return;
    }
    setSaving(true);
    
    try {
      const api = window.electronAPI;
      if (!api) { isSavingRef.current = false; return; }
      
      if (!supplierId && paidAmount < total) {
        showNotification('error', 'لا يمكن تسجيل شراء آجل من مورد عابر. يرجى تسديد كامل المبلغ أو اختيار مورد مسجل.');
        setSaving(false);
        isSavingRef.current = false;
        return;
      }

      // Resolve pending products first
      let resolvedItems = items;
      try {
        resolvedItems = await createPendingProducts(items);
        setItems(resolvedItems);
      } catch (err: any) {
        showNotification('error', err.message || 'فشل إنشاء المنتجات الجديدة');
        setSaving(false);
        isSavingRef.current = false;
        return;
      }
      
      const invoice = {
        id: currentInvoiceId || undefined,
        supplier_invoice_number: invoiceNumber,
        supplier_id: supplierId || undefined, 
        subtotal: total, 
        tax_amount: 0,
        discount_amount: 0,
        total,
        paid: paidAmount,
        status: 'confirmed', 
        notes, 
        items: resolvedItems.map(i => ({
          product_id: i.product_id,
          product_name_snapshot: i.product_name_snapshot,
          product_barcode_snapshot: i.product_barcode_snapshot,
          quantity: i.quantity,
          unit: i.unit,
          unit_price: i.unit_price,
          total: i.total,
          wholesale_price: i.wholesale_price,
          retail_price: i.retail_price,
          category_id: i.category_id,
          unit_id: i.unit_id,
        })),
        _user_id: user?.id || 1,
        session_id: saveSessionId,
        custom_date: customDate || undefined
      };
      
      const res: any = await api.invoke('db:purchases:save', invoice);
      
      if (res?.success) {
        if (!currentInvoiceId && res.id) {
          setCurrentInvoiceId(res.id);
        }
        setInvoiceStatus('confirmed');
        
        if (res.duplicate) {
          showNotification('info', 'تم تحديث فاتورة الشراء');
        } else if (res.isNew) {
          showNotification('success', 'تم إنشاء فاتورة الشراء بنجاح');
        } else {
          showNotification('success', 'تم تحديث فاتورة الشراء بنجاح');
        }
        
        if (res.isNew) {
          resetInvoice(true);
          setSaveSessionId(`PURCHASE-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
        }
      } else {
        showNotification('error', res?.error || 'حدث خطأ أثناء الحفظ');
      }
    } catch (e) { console.error('Save error:', e); showNotification('error', 'حدث خطأ أثناء حفظ فاتورة الشراء'); }
    finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  };

  const handleSaveDraftManual = async () => {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const draftId = await autoSaveDraft();
      if (draftId) {
        showNotification('success', 'تم حفظ الفاتورة كمسودة بنجاح!');
        if (!currentInvoiceId && typeof draftId === 'number') {
          setCurrentInvoiceId(draftId);
        }
      } else {
        showNotification('error', 'فشل حفظ المسودة');
      }
    } catch (e: any) {
      showNotification('error', e.message || 'حدث خطأ أثناء حفظ المسودة');
    } finally {
      setSaving(false);
    }
  };

  const cancelInvoice = async () => {
    if (!currentInvoiceId || isCancelled) return;
    setShowPinModal(true);
  };

  const confirmCancel = async (admin: any) => {
    setSaving(true);
    try {
      const res: any = await window.electronAPI?.invoke('db:purchases:cancel', currentInvoiceId);
      if (res?.success) {
        showNotification('success', 'تم إلغاء الفاتورة بنجاح');
        setInvoiceStatus('cancelled');
        await window.electronAPI?.invoke('db:audit:log', {
          action: 'purchase_cancel',
          details: `إلغاء فاتورة شراء: ${currentInvoiceId}`,
          user_id: user?.id,
        }).catch(() => {});
        resetInvoice(true);
      } else {
        showNotification('error', res?.error || 'حدث خطأ أثناء الإلغاء');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleManualPrint = () => {
    if (items.length === 0) {
      showNotification('error', 'لا يمكن طباعة فاتورة فارغة');
      return;
    }
    setShowPrintPreview(true);
  };

  const handleDragStart = (idx: number) => {
    draggedColIndex.current = idx;
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedColIndex.current === null || draggedColIndex.current === idx) return;

    const newCols = [...columns];
    const draggedItem = newCols[draggedColIndex.current];
    newCols.splice(draggedColIndex.current, 1);
    newCols.splice(idx, 0, draggedItem);
    draggedColIndex.current = idx;
    setColumns(newCols);
  };

  const handleResize = (id: string, newWidth: number) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, width: Math.max(50, newWidth), flex: false } : c));
  };

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (focusedProductIndex >= 0 && focusedProductIndex < productResults.length) {
        e.preventDefault();
        const sortedPR = [...productResults].sort((a, b) => {
          if (!ddSortKey) return 0;
          let aV: any, bV: any;
          if (ddSortKey === 'code') { aV = a.barcode || a.internal_code || ''; bV = b.barcode || b.internal_code || ''; }
          else if (ddSortKey === 'name') { aV = a.name || ''; bV = b.name || ''; }
          else if (ddSortKey === 'stock') { aV = a.total_stock || 0; bV = b.total_stock || 0; }
          else if (ddSortKey === 'price') { aV = a.purchase_price || 0; bV = b.purchase_price || 0; }
          if (aV < bV) return ddSortDir === 'asc' ? -1 : 1;
          if (aV > bV) return ddSortDir === 'asc' ? 1 : -1;
          return 0;
        });
        const selectedProduct = sortedPR[focusedProductIndex];
        if (selectedProduct) {
          addProduct(selectedProduct);
          return;
        }
      }

      const query = productSearch.trim();
      if (query.length > 0) {
        e.preventDefault();
        try {
          const res = await window.electronAPI.invoke('db:products:getByBarcodeOrCode', query);
          if (res.success && res.data) {
            addProduct(res.data);
            setProductSearch('');
            setShowProductDD(false);
          } else {
            showNotification('error', 'لم يتم العثور على أي منتج يطابق هذا الكود أو الباركود');
          }
        } catch (err) {
          console.error(err);
        }
      }
    } else if (e.key === 'ArrowDown') {
      if (showProductDD && productResults.length > 0) {
        e.preventDefault();
        setFocusedProductIndex(prev => Math.min(prev + 1, productResults.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      if (showProductDD && productResults.length > 0) {
        e.preventDefault();
        setFocusedProductIndex(prev => Math.max(prev - 1, -1));
      }
    }
  };

  useEffect(() => {
    const matches = (e: KeyboardEvent, shortcutStr: string) => {
      if (!shortcutStr) return false;
      const keys = shortcutStr.toLowerCase().split('+');
      const isCtrlRequired = keys.includes('ctrl');
      const isShiftRequired = keys.includes('shift');
      const isAltRequired = keys.includes('alt');
      const mainKey = keys.find(k => !['ctrl', 'shift', 'alt'].includes(k));
      
      const isCtrlPressed = e.ctrlKey || e.metaKey;
      const isShiftPressed = e.shiftKey;
      const isAltPressed = e.altKey;
      
      return (
        isCtrlPressed === isCtrlRequired &&
        isShiftPressed === isShiftRequired &&
        isAltPressed === isAltRequired &&
        e.key.toLowerCase() === mainKey
      );
    };

    const handler = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true');
      const isFunctionKey = /^f\d+$/i.test(e.key);
      const isCtrlOrAltKey = e.ctrlKey || e.altKey;
      
      if (isTyping && !isFunctionKey && !isCtrlOrAltKey) {
        return;
      }

      if (e.key === 'F4') {
        e.preventDefault();
        setIsJardMode(prev => !prev);
      }
      if (matches(e, shortcuts.new_invoice)) { e.preventDefault(); resetInvoice(); }
      if (matches(e, shortcuts.search_product)) { e.preventDefault(); productSearchRef.current?.focus(); }
      if (matches(e, shortcuts.search_party)) { e.preventDefault(); supplierSearchRef.current?.focus(); }
      if (matches(e, shortcuts.print_invoice)) { e.preventDefault(); handleManualPrint(); }
      if (matches(e, shortcuts.save_invoice)) { e.preventDefault(); saveInvoice(); }
      if (matches(e, shortcuts.cancel_invoice)) { e.preventDefault(); if (currentInvoiceId && !isCancelled) cancelInvoice(); else resetInvoice(); }
      if (matches(e, shortcuts.advanced_search)) { e.preventDefault(); setShowAdvancedSearch(true); }
      if (matches(e, shortcuts.add_product_modal)) { e.preventDefault(); setShowAddModal(true); }
      if (matches(e, shortcuts.open_invoice)) { e.preventDefault(); setShowOpenModal(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items, total, paidAmount, remaining, supplierId, supplierName, invoiceNumber, currentInvoiceId, shortcuts, isCancelled]);

  const selectedItemForEdit = editingItemId ? items.find(it => it.id === editingItemId) : null;
  const initialDataForEdit = selectedItemForEdit && selectedItemForEdit.isNewProduct ? {
    name: selectedItemForEdit.product_name_snapshot || selectedItemForEdit.product_name || '',
    name_fr: selectedItemForEdit.product_name_fr || '',
    barcode: selectedItemForEdit.product_barcode_snapshot || '',
    purchase_price: selectedItemForEdit.unit_price,
    retail_price: selectedItemForEdit.retail_price,
    retail_margin: selectedItemForEdit.retail_margin,
    category_id: selectedItemForEdit.category_id,
    unit_id: selectedItemForEdit.unit_id,
    brand_id: selectedItemForEdit.brand_id,
    fitments: (selectedItemForEdit.compatibility_suggestions || []).map((sug: any) => {
      if (typeof sug === 'object' && sug !== null) {
        return {
          vehicle_brand_id: sug.vehicle_brand_id || 0,
          vehicle_model_id: sug.vehicle_model_id || 0,
          vehicle_brand_name: sug.brand || sug.vehicle_brand_name || '',
          vehicle_model_name: sug.model || sug.vehicle_model_name || ''
        };
      }
      return null;
    }).filter(Boolean)
  } : null;

  return (
    <div className="flex-1 w-full h-full flex flex-col">
      <ProInvoiceLayout
        title={`وصل شراء${isCancelled ? ' - ملغاة' : ''}`}
        invoiceNumber={invoiceNumber}
        isSaving={saving}
        notes={notes}
        onNotesChange={setNotes}
        onInvoiceNumberChange={setInvoiceNumber}
        date={customDate || new Date().toISOString().split('T')[0]}
        onDateChange={setCustomDate}
        searchWidth="w-[380px]"
        customerSlotWidth="w-[320px]"
        searchMode="icon"
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={setSelectedCategoryId}
        searchActions={
          <div className="flex gap-2">
            <button 
               onClick={() => setShowAdvancedSearch(true)}
               className="bg-primary_blue/20 hover:bg-primary_blue/40 text-primary_blue border border-primary_blue/50 rounded-xl px-4 h-[52px] flex items-center justify-center gap-2 font-bold transition-all"
               title="البحث المتقدم"
            >
              <Car size={18} />
              بحث متقدم
            </button>
            <motion.button
               onClick={() => setIsJardMode(!isJardMode)}
               whileHover={{ scale: 1.04 }}
               whileTap={{ scale: 0.94 }}
               className={`rounded-xl px-4 h-[52px] flex items-center justify-center gap-2 font-bold transition-all shadow-lg ${
                 isJardMode
                   ? 'bg-emerald-500/20 text-emerald-300 border-2 border-emerald-400 shadow-emerald-500/20'
                   : 'bg-zinc-400/15 backdrop-blur-xl text-zinc-300 border border-zinc-400/40 hover:border-zinc-400/70 shadow-zinc-400/10'
               }`}
            >
              <CheckCircle size={18} className={isJardMode ? 'animate-pulse text-emerald-400' : 'text-zinc-400'} />
              {isJardMode ? 'وضع الجرد نشط' : 'بدء الجرد (F4)'}
            </motion.button>
            <motion.button
               onClick={() => setShowSmartImportModal(true)}
               whileHover={{ scale: 1.04 }}
               whileTap={{ scale: 0.94 }}
               className="bg-blue-400/15 backdrop-blur-xl text-blue-300 border border-blue-400/40 hover:border-blue-400/70 rounded-xl px-4 h-[52px] flex items-center justify-center gap-2 font-bold transition-colors shadow-lg shadow-blue-400/10"
            >
              <FileText size={18} />
              استيراد ذكي
            </motion.button>
            <motion.button
               onClick={() => setShowAddModal(true)}
               whileHover={{ scale: 1.04 }}
               whileTap={{ scale: 0.94 }}
               className="bg-emerald-400/15 backdrop-blur-xl text-emerald-300 border border-emerald-400/40 hover:border-emerald-400/70 rounded-xl px-4 h-[52px] flex items-center justify-center gap-2 font-bold transition-colors shadow-lg shadow-emerald-400/10"
            >
              <Plus size={18} />
              إضافة منتج
            </motion.button>
          </div>
        }
        searchQuery={productSearch}
        searchRef={productSearchRef}
        onSearchChange={(v) => {
          setProductSearch(v);
          if (v.length > 0 && !showProductDD) setShowProductDD(true);
        }}
        onSearchFocus={() => {
          if (productSearch.length > 0 || productResults.length > 0) {
            setShowProductDD(true);
          }
        }}
        onSearchKeyDown={handleSearchKeyDown}
        onNew={resetInvoice}
        onSave={() => saveInvoice()}
        onCancel={currentInvoiceId && !isCancelled ? cancelInvoice : undefined}
        onOpen={() => setShowOpenModal(true)}
        onPrint={handleManualPrint}
        onDelete={() => setItems([])}
        totalAmount={total}
        paidAmount={paidAmount}
        onPaidAmountChange={setPaidAmount}
        remainingAmount={remaining}
        dueAmount={total}
        customerBalance={supplierBalance}
        balanceLabel="ديون المورد:"
        saveLabel={invoiceStatus === 'draft' ? 'تأكيد وحفظ' : (currentInvoiceId ? 'تعديل' : 'حفظ')}
        headerCells={
          <>
            {columns.map((col, fullIdx) => {
              if (col.hidden) return null;
              return (
                <div 
                  key={col.id}
                  draggable={col.id !== 'actions'}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.pageX, y: e.pageY, colId: col.id });
                  }}
                  onDragStart={() => handleDragStart(fullIdx)}
                  onDragOver={(e) => handleDragOver(e, fullIdx)}
                  style={{ width: col.flex ? 'auto' : col.width, flex: col.flex ? 1 : 'none' }}
                  className={`h-full flex items-center relative border-l border-border_default select-none group px-3
                    ${col.align === 'center' ? 'justify-center text-center' : 'justify-start text-right'}
                    ${col.sortable ? 'cursor-pointer hover:bg-background_card' : 'cursor-grab active:cursor-grabbing'}
                    ${draggedColIndex.current === fullIdx ? 'opacity-20 bg-emerald-400/20' : 'opacity-100'}
                    transition-all duration-200
                  `}
                  onClick={() => col.sortable && col.sortKey && toggleSort(col.sortKey)}
                >
                  <span className="text-[13px] font-bold text-text_primary uppercase tracking-wide">
                    {col.label}
                  </span>

                  {col.sortable && sortKey === col.sortKey && sortDir === 'asc' ? (
                    <span className="mr-1 text-emerald-400 text-[14px]">↑</span>
                  ) : col.sortable && sortKey === col.sortKey && sortDir === 'desc' ? (
                    <span className="mr-1 text-red-400 text-[14px]">↓</span>
                  ) : null}

                  {col.id !== 'actions' && (
                    <div 
                      className="absolute left-0 top-0 w-2 h-full cursor-col-resize hover:bg-emerald-400/50 active:bg-emerald-400 transition-all z-30 group-hover:opacity-100 opacity-0"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const startX = e.pageX;
                        const startWidth = col.width;
                        document.body.style.cursor = 'col-resize';
                        const onMouseMove = (moveEvent: MouseEvent) => {
                          const delta = startX - moveEvent.pageX; 
                          handleResize(col.id, startWidth + delta);
                        };
                        const onMouseUp = () => {
                          document.body.style.cursor = 'default';
                          document.removeEventListener('mousemove', onMouseMove);
                          document.removeEventListener('mouseup', onMouseUp);
                        };
                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </>
        }
        productDropdown={
          (() => {
            const sortedPR = [...productResults].sort((a, b) => {
              if (!ddSortKey) return 0;
              let aV: any, bV: any;
              if (ddSortKey === 'code') { aV = a.barcode || a.internal_code || ''; bV = b.barcode || b.internal_code || ''; }
              else if (ddSortKey === 'name') { aV = a.name || ''; bV = b.name || ''; }
              else if (ddSortKey === 'stock') { aV = a.total_stock || 0; bV = b.total_stock || 0; }
              else if (ddSortKey === 'price') { aV = a.purchase_price || 0; bV = b.purchase_price || 0; }
              if (aV < bV) return ddSortDir === 'asc' ? -1 : 1;
              if (aV > bV) return ddSortDir === 'asc' ? 1 : -1;
              return 0;
            });
            const toggleDD = (k: string) => { if (ddSortKey === k) setDdSortDir(ddSortDir === 'asc' ? 'desc' : 'asc'); else { setDdSortKey(k); setDdSortDir('asc'); } };
            const arrow = (k: string) => ddSortKey !== k ? null : <span className="text-[10px] ml-1">{ddSortDir === 'asc' ? '▲' : '▼'}</span>;

            return (
              <GlassDropdown show={showProductDD && productResults.length > 0} width="w-[650px]" accentColor="emerald">
                <div className="flex items-center border-b border-white/[0.08] px-2 py-2 text-[10px] font-black text-text_primary uppercase tracking-wider select-none">
                  <div className="w-[100px] px-2 text-center cursor-pointer hover:bg-white/10 rounded transition-colors border-l border-white/[0.08]" onClick={() => toggleDD('code')}>الكود {arrow('code')}</div>
                  <div className="flex-1 px-4 text-right cursor-pointer hover:bg-white/10 rounded transition-colors border-l border-white/[0.08]" onClick={() => toggleDD('name')}>اسم المنتج {arrow('name')}</div>
                  <div className="w-[90px] px-2 text-center cursor-pointer hover:bg-white/10 rounded transition-colors border-l border-white/[0.08]" onClick={() => toggleDD('stock')}>المخزون {arrow('stock')}</div>
                  <div className="w-[120px] px-3 text-center border-l border-white/[0.08] cursor-pointer hover:bg-white/10 rounded transition-colors" onClick={() => toggleDD('price')}>السعر (د.ج) {arrow('price')}</div>
                </div>

                <div ref={dropdownScrollRef} className="max-h-[580px] overflow-y-auto p-1 custom-scrollbar">
                  {sortedPR.map((p: any, idx: number) => (
                    <GlassDropdownItem key={p.id} delay={0.06 + idx * 0.035}>
                      <button onClick={() => addProduct(p)} 
                        id={`dd-product-row-${idx}`}
                        dir="rtl"
                        className={`w-full text-start px-2 py-2.5 text-sm rounded-lg flex items-center gap-0 group transition-colors border-b border-white/[0.08] last:border-0 ${
                          focusedProductIndex === idx
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'hover:bg-emerald-500/10 text-text_primary'
                        }`}
                      >
                        <div className="w-[100px] px-2 border-l border-white/[0.08] flex justify-center">
                          <span className="text-[11px] text-text_primary font-numbers">{p.barcode || p.internal_code || '-'}</span>
                        </div>
                        <div className="flex-1 px-4 border-l border-white/[0.08]" dir="auto">
                          <span className="text-[14px] text-text_primary font-black transition-colors">{p.name}</span>
                          {p.name_fr && (
                            <span className="text-xs text-text_muted block font-sans" dir="ltr">{p.name_fr}</span>
                          )}
                        </div>
                        <div className="w-[90px] px-2 border-l border-white/[0.08] flex justify-center">
                          <span className={`text-[13px] font-bold font-numbers ${p.total_stock <= 0 ? 'text-danger_red' : 'text-success_green'}`}>
                            {parseFloat(Number(p.total_stock).toFixed(3)) || 0}
                          </span>
                        </div>
                        <div className="w-[120px] px-2 text-center">
                           <span className="text-[14px] font-black font-numbers text-text_primary">
                              {p.purchase_price > 0 ? p.purchase_price.toFixed(2) : ''}
                           </span>
                        </div>
                      </button>
                    </GlassDropdownItem>
                  ))}
                </div>
              </GlassDropdown>
            );
          })()
        }
        customerSlot={
          <div id="supplier-search-container" className="flex w-full gap-4 relative">
            <div className="flex-1 relative">
              <User size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary_blue" />
              <input
                ref={supplierSearchRef}
                type="text"
                value={supplierSearch}
                onChange={e => {
                  setSupplierSearch(e.target.value);
                  if (e.target.value.length > 0) setShowSupplierDD(true);
                }}
                onFocus={() => {
                  if (supplierSearch.length > 0 || supplierResults.length > 0) {
                    setShowSupplierDD(true);
                  }
                }}
                onClick={() => {
                  if (supplierSearch.length > 0 || supplierResults.length > 0) {
                    setShowSupplierDD(true);
                  }
                }}
                dir="auto"
                placeholder={supplierName ? `${supplierName} (${shortcuts.search_party})` : `اختر المورد... (${shortcuts.search_party})`}
                disabled={currentInvoiceId !== null}
                className="w-full bg-background_card border-2 border-border_default rounded-xl pr-10 pl-10 py-3 text-xl font-black text-text_primary placeholder:text-text_primary focus:border-primary_blue focus:bg-primary_blue/5 text-start transition-all outline-none"
              />
              {supplierId && currentInvoiceId === null && (
                <button onClick={() => { setSupplierId(null); setSupplierName('مورد عام'); setSupplierBalance(0); }} className="absolute left-2 top-1/2 -translate-y-1/2 text-text_muted hover:text-danger_red p-1">
                  <X size={12} />
                </button>
              )}
            </div>

            <GlassDropdown show={showSupplierDD && supplierResults.length > 0} accentColor="blue" className="w-[60%]">
              {/* Table Header */}
              <div className="flex items-center border-b border-white/[0.08] px-4 py-2 text-[10px] font-black text-text_primary uppercase tracking-wider select-none">
                <div className="flex-1 text-right border-l border-white/[0.08]">الاسم</div>
                <div className="w-[180px] text-right border-l border-white/[0.08]">العنوان</div>
                <div className="w-[130px] text-center">الهاتف</div>
              </div>

              <div ref={supplierDropdownScrollRef} className="max-h-[350px] overflow-y-auto p-1 custom-scrollbar">
                {supplierResults.map((s: any, idx: number) => (
                  <GlassDropdownItem key={s.id} delay={0.06 + idx * 0.035}>
                    <button onClick={() => { setSupplierId(s.id); setSupplierName(s.name); setSupplierBalance(s.balance || 0); setSupplierSearch(''); setShowSupplierDD(false); }}
                      className="w-full text-right px-2 py-2.5 text-sm hover:bg-blue-500/10 rounded-lg flex items-center gap-0 group transition-all border-b border-white/[0.08] last:border-0">
                      {/* Name Column */}
                      <div className="flex-1 px-4 border-l border-white/[0.08] truncate">
                        <span className="text-[14px] text-text_primary font-black transition-colors">{s.name}</span>
                      </div>

                      {/* Location Column */}
                      <div className="w-[180px] px-2 border-l border-white/[0.08] truncate">
                        <span className="text-[12px] text-text_primary">{s.address || '---'}</span>
                      </div>

                      {/* Phone Column */}
                      <div className="w-[130px] px-2 text-center">
                        <span className="text-[13px] font-bold font-numbers text-text_primary">{s.phone || '---'}</span>
                      </div>
                    </button>
                  </GlassDropdownItem>
                ))}
              </div>
            </GlassDropdown>
          </div>
        }
        summaryActions={
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1 w-32">
              <label className="text-[10px] text-text_muted uppercase">طريقة الدفع</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}
                className="bg-background_card border border-border_default rounded px-2 py-1.5 text-sm text-text_primary focus:border-emerald-400 outline-none">
                <option value="cash">نقدي</option><option value="credit">على الحساب</option><option value="mixed">مختلط</option>
              </select>
            </div>
          </div>
        }
      >
        <div className="w-full flex flex-col">
          {expectedInvoiceTotal !== null && Math.abs(expectedInvoiceTotal - total) > 0.01 && (
            <div className="mx-4 my-2 p-3 bg-danger_red/10 border border-danger_red/30 rounded-xl text-danger_red flex justify-between items-center text-sm font-bold animate-pulse" dir="rtl">
              <span>⚠️ تنبيه: مجموع البنود الحالي ({total.toFixed(2)} دج) لا يطابق إجمالي الفاتورة المكتشف ({expectedInvoiceTotal.toFixed(2)} دج)! يرجى التحقق من الأسعار والكميات.</span>
              <button onClick={() => setExpectedInvoiceTotal(null)} className="hover:bg-danger_red/20 px-2 py-1 rounded-lg transition-all text-xs cursor-pointer">
                تجاهل
              </button>
            </div>
          )}
          {sortedItems.map((item, index) => (
            <div 
              key={item.id} 
              id={`purchase-row-${index}`}
              onClick={() => {
                if (isJardMode) setFocusedRowIndex(index);
              }}
              className={`pro-row flex items-center border-b border-border_default hover:bg-emerald-400/5 transition-colors group ${item.isNewProduct || item.product_id <= 0 ? 'border-r-4 border-r-amber-500 bg-amber-500/[0.04]' : (index % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg')} ${focusedRowIndex === index ? 'ring-2 ring-inset ring-primary_blue bg-primary_blue/5 shadow-[0_0_15px_rgba(59,130,246,0.15)] z-20' : ''}`}
              onContextMenu={(e) => {
                e.preventDefault();
                setRowContextMenu({ x: e.pageX, y: e.pageY, item });
              }}
            >
              {columns.filter(c => !c.hidden).map(col => {
                const cellStyle = { width: col.flex ? 'auto' : col.width, flex: col.flex ? 1 : 'none' };
                const commonClasses = `h-11 flex items-center border-l border-border_default px-3 ${col.align === 'center' ? 'justify-center text-center' : 'justify-start text-start'}`;
                
                if (col.id === 'index') return <div key={col.id} style={cellStyle} className={`${commonClasses} text-[11px] font-numbers text-text_primary`}>{index + 1}</div>;
                if (col.id === 'barcode') return (
                  <div key={col.id} style={cellStyle} className={commonClasses}>
                    <input type="text" value={item.product_barcode_snapshot || ''} onChange={e => updateItem(item.id, 'product_barcode_snapshot', e.target.value)}
                      placeholder="-"
                      readOnly={isJardMode}
                      dir="auto"
                      className="w-full bg-transparent border border-transparent focus:border-border_default rounded px-1 py-0.5 text-[12px] text-center font-numbers text-text_primary focus:bg-background_card outline-none transition-all" />
                  </div>
                );
                if (col.id === 'name') return (
                  <div key={col.id} style={cellStyle} className={`${commonClasses} flex-col items-start justify-center relative`}>
                    <div className="flex items-center gap-1.5 w-full">
                      <input type="text" value={item.product_name_snapshot} onChange={e => updateItem(item.id, 'product_name_snapshot', e.target.value)}
                        readOnly={isJardMode}
                        dir="auto"
                        className="w-full bg-transparent border border-transparent focus:border-border_default rounded px-1 py-0.5 text-[13px] font-bold text-text_primary text-start focus:bg-background_card outline-none transition-all" />
                      {item.isNewProduct && (
                        <span className="shrink-0 text-[10px] bg-amber-500/20 text-amber-500 font-black px-1.5 py-0.5 rounded border border-amber-500/30">جديد</span>
                      )}
                      {item.needs_review && !item.isNewProduct && (
                        <span className="shrink-0 text-[10px] bg-blue-500/20 text-blue-500 font-black px-1.5 py-0.5 rounded border border-blue-500/30">مراجعة</span>
                      )}
                      {item.product_is_active === 0 && (
                        <span className="shrink-0 text-[10px] bg-danger_red/20 text-danger_red font-black px-1.5 py-0.5 rounded border border-danger_red/30">موقوف</span>
                      )}
                    </div>
                    {item.isNewProduct && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMappingRowId(item.id);
                          setRowSearchQuery("");
                        }}
                        className="text-[10px] text-primary_blue hover:underline cursor-pointer font-bold px-1"
                      >
                        ربط بمنتج مسجل 🔗
                      </button>
                    )}
                    {mappingRowId === item.id && (
                      <div className="absolute right-0 top-full mt-1 z-[99] bg-background_secondary/95 backdrop-blur-md border border-border_default rounded-xl shadow-2xl p-3 w-[350px] flex flex-col gap-2 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b border-border_default pb-1">
                          <button onClick={() => { setMappingRowId(null); setRowSearchQuery(""); }} className="p-1 hover:text-danger_red text-text_muted cursor-pointer">
                            <X size={14} />
                          </button>
                          <span className="text-xs font-bold text-text_primary">ربط بمنتج مسجل:</span>
                        </div>
                        <input
                          type="text"
                          value={rowSearchQuery}
                          onChange={e => setRowSearchQuery(e.target.value)}
                          placeholder="ابحث بالاسم أو الباركود..."
                          autoFocus
                          className="w-full bg-background_card border border-border_default rounded-lg px-2 py-1.5 text-xs text-text_primary outline-none focus:border-primary_blue text-right"
                        />
                        <div className="max-h-[180px] overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                          {rowSearchResults.map((prod: any) => (
                            <button
                              key={prod.id}
                              onClick={() => {
                                updateItem(item.id, 'product_id', prod.id);
                                updateItem(item.id, 'product_name_snapshot', prod.name);
                                updateItem(item.id, 'product_barcode_snapshot', prod.barcode || prod.internal_code || null);
                                updateItem(item.id, 'category_id', prod.category_id || 1);
                                updateItem(item.id, 'unit_id', prod.unit_id || 1);
                                updateItem(item.id, 'isNewProduct', false);
                                updateItem(item.id, 'needs_review', false);
                                setMappingRowId(null);
                                setRowSearchQuery("");
                              }}
                              className="w-full text-right px-2 py-1.5 hover:bg-primary_blue/10 rounded-md text-xs text-text_primary flex justify-between items-center transition-all cursor-pointer"
                            >
                              <span className="text-[10px] text-text_muted font-mono">{prod.barcode || prod.internal_code || '-'}</span>
                              <span className="font-bold">{prod.name}</span>
                            </button>
                          ))}
                          {rowSearchQuery.length > 0 && rowSearchResults.length === 0 && (
                            <div className="text-center text-xs text-text_muted py-2">لا توجد نتائج مطابقة</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
                if (col.id === 'category') return (
                  <div key={col.id} style={cellStyle} className={commonClasses}>
                    <select value={item.category_id || ''} onChange={e => updateItem(item.id, 'category_id', parseInt(e.target.value) || 0)}
                      disabled={currentInvoiceId !== null || isJardMode}
                      className="w-full bg-transparent border border-transparent hover:bg-background_card focus:border-border_default rounded px-0 py-0.5 text-[11px] text-center text-text_primary outline-none transition-all cursor-pointer">
                      <option value="" className="bg-background_card text-text_primary">-</option>
                      {categories.map(c => <option key={c.id} value={c.id} className="bg-background_card text-text_primary">{c.name}</option>)}
                    </select>
                  </div>
                );
                if (col.id === 'unit') return (
                  <div key={col.id} style={cellStyle} className={commonClasses}>
                    <select value={item.unit_id || ''} onChange={e => updateItem(item.id, 'unit_id', parseInt(e.target.value) || 0)}
                      disabled={currentInvoiceId !== null || isJardMode}
                      className="w-full bg-transparent border border-transparent hover:bg-background_card focus:border-border_default rounded px-0 py-0.5 text-[11px] text-center text-text_primary outline-none transition-all cursor-pointer">
                      <option value="" className="bg-background_card text-text_primary">-</option>
                      {units.map(u => <option key={u.id} value={u.id} className="bg-background_card text-text_primary">{u.name}</option>)}
                    </select>
                  </div>
                );
                
                if (col.id === 'purchase_price') return (
                  <div key={col.id} style={cellStyle} className={commonClasses}>
                    <input type="number" min={0} value={item.unit_price || ''} onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      readOnly={isJardMode}
                      className="w-full bg-transparent border-b border-primary_blue/40 px-2 py-0.5 text-[15px] text-center font-bold font-numbers text-text_primary focus:border-primary_blue focus:border-b-2 focus:bg-primary_blue/5 focus:outline-none transition-all" />
                  </div>
                );
                if (col.id === 'quantity') return (
                  <div key={col.id} style={cellStyle} className={commonClasses}>
                    <input type="number" min={0.01} step={1} value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      readOnly={isJardMode}
                      className="w-full bg-transparent border-b border-primary_blue/40 px-2 py-0.5 text-[15px] font-bold font-numbers text-center text-emerald-500 focus:border-primary_blue focus:border-b-2 focus:bg-primary_blue/5 focus:outline-none transition-all" />
                  </div>
                );
                
                if (col.id === 'retail_margin') return (
                  <div key={col.id} style={cellStyle} className={commonClasses}>
                    <input type="number" min={0} step="any" value={item.retail_margin || ''} onChange={e => updateItem(item.id, 'retail_margin', parseFloat(e.target.value) || 0)}
                      disabled={currentInvoiceId !== null}
                      readOnly={isJardMode}
                      className={`w-full bg-transparent border-b border-primary_blue/40 px-2 py-0.5 text-[15px] text-center font-bold font-numbers text-yellow-500 transition-all ${currentInvoiceId === null && !isJardMode ? 'focus:border-primary_blue focus:border-b-2 focus:bg-primary_blue/5 focus:outline-none' : 'border-transparent opacity-80'}`} />
                  </div>
                );
                
                if (col.id === 'total') return <div key={col.id} style={cellStyle} className={`${commonClasses} text-[14px] font-black font-numbers text-text_primary`}>{item.total.toFixed(2)}</div>;

                if (col.id === 'wholesale_price') return (
                  <div key={col.id} style={cellStyle} className={commonClasses}>
                    <input type="number" min={0} step="any" value={item.wholesale_price || ''} onChange={e => updateItem(item.id, 'wholesale_price', parseFloat(e.target.value) || 0)}
                      disabled={currentInvoiceId !== null}
                      readOnly={isJardMode}
                      className={`w-full bg-transparent border-b border-primary_blue/40 px-2 py-0.5 text-[15px] text-center font-bold font-numbers text-emerald-500 transition-all ${currentInvoiceId === null && !isJardMode ? 'focus:border-primary_blue focus:border-b-2 focus:bg-primary_blue/5 focus:outline-none' : 'border-transparent opacity-80'}`} />
                  </div>
                );
                if (col.id === 'retail_price') return (
                  <div key={col.id} style={cellStyle} className={commonClasses}>
                    <input type="number" min={0} step="any" value={item.retail_price || ''} onChange={e => updateItem(item.id, 'retail_price', parseFloat(e.target.value) || 0)}
                      disabled={currentInvoiceId !== null}
                      readOnly={isJardMode}
                      className={`w-full bg-transparent border-b border-primary_blue/40 px-2 py-0.5 text-[15px] text-center font-bold font-numbers text-sky-500 transition-all ${currentInvoiceId === null && !isJardMode ? 'focus:border-primary_blue focus:border-b-2 focus:bg-primary_blue/5 focus:outline-none' : 'border-transparent opacity-80'}`} />
                  </div>
                );

                if (col.id === 'inventory_check') return (
                  <div key={col.id} style={cellStyle} className={commonClasses}>
                    <button
                      id={`inv-check-${index}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateItem(item.id, 'inventory_check', !item.inventory_check);
                        setTimeout(() => {
                          document.getElementById(`inv-check-${index + 1}`)?.focus();
                        }, 50);
                      }}
                      disabled={currentInvoiceId !== null}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          document.getElementById(`inv-check-${index + 1}`)?.focus();
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          document.getElementById(`inv-check-${index - 1}`)?.focus();
                        } else if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          updateItem(item.id, 'inventory_check', !item.inventory_check);
                          setTimeout(() => {
                            document.getElementById(`inv-check-${index + 1}`)?.focus();
                          }, 50);
                        }
                      }}
                      className={`p-1.5 rounded-lg border transition-all outline-none ${
                        item.inventory_check
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(52,211,153,0.2)]'
                          : 'bg-background_card text-text_muted border-border_default hover:text-emerald-400 hover:border-emerald-500/30'
                      }`}
                      title={item.inventory_check ? 'مجردة (Checked)' : 'غير مجردة (Unchecked)'}
                    >
                      <CheckCircle size={16} />
                    </button>
                  </div>
                );
                
                if (col.id === 'actions') return (
                  <div key={col.id} style={cellStyle} className={`${commonClasses} gap-1`}>
                      <button 
                        title="طباعة الباركود"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBarcodeProduct({
                            name: item.product_name_snapshot,
                            barcode: item.product_barcode_snapshot || '',
                            price: item.retail_price || 0,
                            qty: item.quantity
                          });
                          setShowBarcodeModal(true);
                        }}
                        className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all"
                      >
                        <Barcode size={16} />
                      </button>
                      <button 
                        onClick={() => { 
                          setEditingItemId(item.id);
                          if (item.isNewProduct) {
                            setEditingProductId(null);
                          } else {
                            setEditingProductId(item.product_id);
                          }
                        }} 
                        className="p-1.5 text-primary_blue hover:bg-primary_blue/10 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => removeItem(item.id)} className="p-1.5 text-text_primary hover:text-danger_red hover:bg-danger_red/10 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                  </div>
                );
                return <div key={col.id} style={cellStyle} className={commonClasses}></div>;
              })}
            </div>
          ))}

          {/* Dynamic visual grid padding — fills available space precisely to the footer separator line */}
          {Array.from({ length: Math.max(0, 18 - sortedItems.length) }).map((_, idx) => (
            <div key={`dummy-${idx}`} className={`flex items-center px-0 py-0 h-11 border-b border-border_default pointer-events-none ${(sortedItems.length + idx) % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg'}`}>
              {columns.filter(c => !c.hidden).map(col => (
                <div key={col.id} style={{ width: col.flex ? 'auto' : col.width, flex: col.flex ? 1 : 'none' }} className="h-full border-l border-border_default" />
              ))}
            </div>
          ))}
          {items.length > 0 && Array.from({ length: 3 }).map((_, idx) => (
            <div key={`extra-dummy-${idx}`} className={`flex items-center px-0 py-0 h-11 border-b border-border_default pointer-events-none ${(sortedItems.length + idx) % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg'}`}>
              {columns.filter(c => !c.hidden).map(col => (
                <div key={col.id} style={{ width: col.flex ? 'auto' : col.width, flex: col.flex ? 1 : 'none' }} className="h-full border-l border-border_default" />
              ))}
            </div>
          ))}
        </div>
      </ProInvoiceLayout>

      {/* ── Smart Import Modal ── */}
      {showSmartImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={() => {
          if (!isReconciling) {
            setShowSmartImportModal(false);
          }
        }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-background_secondary/85 backdrop-blur-2xl border border-white/15 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/40 p-6 w-full max-w-5xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-border_default mb-4 shrink-0">
              <h2 className="text-xl font-bold text-text_primary flex items-center gap-2">
                <FileText className="text-primary_blue" size={24} />
                استيراد الفاتورة بالذكاء الاصطناعي
              </h2>
              <button onClick={() => {
                setShowSmartImportModal(false);
              }} className="p-2 text-text_muted hover:text-danger_red bg-background_card rounded-full transition-all cursor-pointer">
                <XCircle size={20}/>
              </button>
            </div>

            {/* Dropdown Selector */}
            {invoiceQueue.length > 0 && (
              <div className="mb-4 shrink-0 flex items-center gap-3">
                <label className="text-sm font-bold text-text_primary shrink-0">الفواتير المرفوعة حديثاً من الهاتف:</label>
                <select
                  value={selectedInvoice?.id || ''}
                  onChange={(e) => {
                    const inv = invoiceQueue.find(i => i.id === Number(e.target.value));
                    setSelectedInvoice(inv || null);
                  }}
                  className="bg-background_card border border-border_default rounded-xl h-11 px-3 text-sm text-text_primary font-bold focus:border-primary_blue focus:outline-none cursor-pointer flex-1"
                >
                  <option value="">-- اختر فاتورة ممسوحة ضوئياً --</option>
                  {invoiceQueue.map((inv: any) => (
                    <option key={inv.id} value={inv.id}>
                      فاتورة تاريخ {new Date(inv.createdAt).toLocaleString('ar-DZ')} ({inv.filePath})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Split layout */}
            <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden min-h-[450px]">
              
              {/* Left Column: Invoice Image Preview */}
              <div className="flex-1 border border-border_default rounded-2xl bg-black/20 p-2 flex flex-col justify-center items-center h-full overflow-hidden relative group">
                {selectedInvoice ? (
                  <>
                    <img
                      src={`http://localhost:8766/invoices/${selectedInvoice.filePath}`}
                      alt="Invoice Preview"
                      className="max-w-full max-h-[420px] object-contain rounded-lg transition-all"
                    />
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between gap-2 pointer-events-none">
                      <button
                        onClick={handleCopyImage}
                        className="pointer-events-auto bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl border border-blue-500/30 shadow-lg cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <Copy size={13} />
                        نسخ الصورة 📋
                      </button>
                      <button
                        onClick={() => {
                          window.electronAPI?.invoke('shell:openExternal', `http://localhost:8766/invoices/${selectedInvoice.filePath}`);
                        }}
                        className="pointer-events-auto bg-background_secondary/90 hover:bg-background_secondary text-xs text-text_primary font-bold px-3 py-2 rounded-xl border border-border_default/30 shadow-lg cursor-pointer transition-all active:scale-95"
                      >
                        فتح في نافذة كاملة 🡥
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-text_muted p-8 flex flex-col items-center gap-3">
                    <FileText size={48} className="opacity-30 text-primary_blue animate-pulse" />
                    <p className="text-sm font-bold">لا توجد فاتورة محددة</p>
                    <p className="text-xs text-text_muted font-bold max-w-xs leading-relaxed">
                      الرجاء اختيار فاتورة من القائمة المنسدلة أعلاه أو تصوير الفاتورة من تطبيق الهاتف لتظهر هنا مباشرة.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Prompt & Textarea */}
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar h-full pr-1">
                <div className="p-5 bg-background_card border border-border_default rounded-xl space-y-4 shadow-inner">
                  <h3 className="text-sm font-bold text-text_primary flex items-center gap-2 border-b border-border_default pb-2">
                    <Sparkles className="text-primary_blue" size={18}/> طريقة الاستخدام:
                  </h3>
                  
                  <div className="space-y-3 text-xs text-text_secondary leading-relaxed font-sans">
                    <div>
                      <span className="font-bold text-primary_blue block mb-1">الخطوة 1: نسخ البرومبت المطور</span>
                      <p>قم بنسخ برومبت التحليل المطور بالضغط على الزر أدناه لتوجيه الذكاء الاصطناعي لكيفية استخراج البيانات بدقة.</p>
                      <button
                        onClick={handleCopyPrompt}
                        className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 px-4 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
                      >
                        <Plus size={14} />
                        نسخ برومبت التحليل الذكي
                      </button>
                    </div>

                    <div className="pt-2">
                      <span className="font-bold text-primary_blue block mb-2">الخطوة 2: فتح موقع الذكاء الاصطناعي</span>
                      <p className="mb-2">اختر أحد الأنظمة المتاحة لديك، وارفع صورة الفاتورة المحددة على اليسار ثم الصق البرومبت:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => window.electronAPI?.invoke('shell:openExternal', 'https://gemini.google.com/')}
                          className="bg-[#1a73e8]/10 hover:bg-[#1a73e8]/20 border border-[#1a73e8]/30 text-[#1a73e8] dark:text-[#8ab4f8] rounded-lg py-2 text-xs font-bold transition-all cursor-pointer text-center"
                        >
                          فتح Gemini 🌐
                        </button>
                        <button
                          onClick={() => window.electronAPI?.invoke('shell:openExternal', 'https://chatgpt.com/')}
                          className="bg-[#10a37f]/10 hover:bg-[#10a37f]/20 border border-[#10a37f]/30 text-[#10a37f] dark:text-[#54cba8] rounded-lg py-2 text-xs font-bold transition-all cursor-pointer text-center"
                        >
                          فتح ChatGPT 🤖
                        </button>
                        <button
                          onClick={() => window.electronAPI?.invoke('shell:openExternal', 'https://claude.ai/')}
                          className="bg-[#d97706]/10 hover:bg-[#d97706]/20 border border-[#d97706]/30 text-[#d97706] dark:text-[#fbbf24] rounded-lg py-2 text-xs font-bold transition-all cursor-pointer text-center"
                        >
                          فتح Claude 🧠
                        </button>
                        <button
                          onClick={() => window.electronAPI?.invoke('shell:openExternal', 'https://chat.deepseek.com/')}
                          className="bg-[#2563eb]/10 hover:bg-[#2563eb]/20 border border-[#2563eb]/30 text-[#2563eb] dark:text-[#60a5fa] rounded-lg py-2 text-xs font-bold transition-all cursor-pointer text-center"
                        >
                          فتح DeepSeek 🔍
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className="font-bold text-primary_blue block mb-1">الخطوة 3: لصق الناتج والتحليل</span>
                      <p>انسخ الكود الناتج من الذكاء الاصطناعي (JSON) وضعه في المربع أدناه لمراجعته وتسويته.</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-[200px]">
                  <label className="text-sm font-bold text-text_primary mb-2 block">الصق كود الـ JSON هنا:</label>
                  <textarea
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    placeholder="الصق كود الـ JSON المستخرج من الذكاء الاصطناعي..."
                    className="flex-1 w-full min-h-[180px] p-4 bg-background_card border border-border_default rounded-xl text-sm font-mono text-text_primary placeholder:text-text_muted focus:border-primary_blue focus:outline-none custom-scrollbar"
                  />
                </div>
              </div>

            </div>

            {/* Footer buttons */}
            <div className="pt-4 border-t border-border_default flex justify-end gap-2 shrink-0 mt-4">
              <button
                onClick={() => setShowSmartImportModal(false)}
                disabled={isReconciling}
                className="px-6 py-3 bg-background_secondary border border-border_default text-text_primary rounded-xl text-sm font-bold transition-all hover:bg-background_card_hover disabled:opacity-50 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleAnalyzeJson()}
                disabled={isReconciling}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isReconciling ? 'جاري الاستيراد والمطابقة...' : 'تأكيد واستيراد الفاتورة 🡥'}
              </button>
            </div>

          </motion.div>
        </div>
      )}

      {showOpenModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" onClick={() => setShowOpenModal(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-background_secondary/85 backdrop-blur-2xl border border-white/15 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/40 p-6 w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-4 border-b border-border_default mb-4 shrink-0">
              <h2 className="text-xl font-bold text-text_primary flex items-center gap-2">
                <FolderOpen className="text-primary_blue" size={24} />
                فتح فاتورة شراء سابقة
              </h2>
              <button onClick={() => setShowOpenModal(false)} className="p-2 text-text_muted hover:text-danger_red bg-background_card rounded-full transition-all">
                <XCircle size={20}/>
              </button>
            </div>

            <div className="flex gap-4 mb-6 shrink-0">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-3 h-5 w-5 text-text_muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="ابحث برقم الفاتورة أو اسم المورد..."
                  value={openModalSearch}
                  onChange={(e) => setOpenModalSearch(e.target.value)}
                  dir="auto"
                  className="w-full bg-background_card border border-border_default rounded-xl pr-10 pl-4 py-3 text-sm text-text_primary focus:border-primary_blue focus:outline-none text-start"
                />
              </div>
              <div className="w-48 relative">
                <Calendar className="absolute right-3 top-3 h-5 w-5 text-text_muted pointer-events-none" />
                <input
                  type="date"
                  value={openModalDate}
                  onChange={(e) => setOpenModalDate(e.target.value)}
                  className="w-full bg-background_card border border-border_default rounded-xl pr-10 pl-4 py-3 text-sm text-text_primary focus:border-primary_blue focus:outline-none font-numbers"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[400px]">
              {openModalLoading ? (
                <div className="h-full flex items-center justify-center text-text_muted">جاري التحميل...</div>
              ) : openModalInvoices.length > 0 ? (
                <div className="grid gap-3">
                  {openModalInvoices.map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => handleOpenInvoice(inv.id)}
                      className="flex items-center justify-between p-4 bg-background_card border border-border_default rounded-xl hover:bg-background_card_hover hover:border-primary_blue/50 transition-all text-right group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-400/10 flex items-center justify-center text-emerald-400">
                          <FileText size={20} />
                        </div>
                        <div>
                          <div className={`font-bold transition-colors text-lg flex items-center gap-2 ${inv.status === 'cancelled' ? 'text-text_muted line-through' : 'text-text_primary group-hover:text-emerald-400'}`}>
                            {inv.invoice_number}
                            {inv.supplier_invoice_number && (
                               <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-text_muted border border-border_default">
                                 فاتورة المورد: {inv.supplier_invoice_number}
                               </span>
                            )}
                          </div>
                          <div className="text-sm text-text_muted mt-1">
                            {inv.supplier_name || 'مورد عام'}
                          </div>
                        </div>
                      </div>
                      
                       <div className="text-left">
                        <div className={`font-black font-numbers text-xl ${inv.remaining > 0 ? 'text-danger_red drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]'}`}>
                          {inv.total.toFixed(2)} د.ج
                        </div>
                        <div className="text-xs text-text_muted mt-2 flex flex-col items-end gap-1.5">
                          <span>{inv.time || (inv.created_at ? inv.created_at.slice(11, 16) : '')}</span>
                          {inv.status === 'draft' ? (
                            <span className="text-warning_amber font-bold bg-warning_amber/10 px-2 py-0.5 rounded-md text-[10px] border border-warning_amber/20 flex items-center gap-1">
                              <FileText size={10} /> مسودة
                            </span>
                          ) : inv.status === 'cancelled' ? (
                            <span className="text-orange-400 font-bold bg-orange-400/10 px-2 py-0.5 rounded-md text-[10px] border border-orange-400/20">ملغاة</span>
                          ) : inv.remaining > 0 ? (
                            <span className="text-danger_red/90 font-bold bg-danger_red/10 px-2 py-0.5 rounded-md text-[10px] border border-danger_red/20">غير مدفوع (باقي: {inv.remaining.toFixed(2)})</span>
                          ) : (
                            <span className="text-emerald-400/90 font-bold bg-emerald-400/10 px-2 py-0.5 rounded-md text-[10px] border border-emerald-400/20">مدفوعة بالكامل</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-text_muted">
                  <FolderOpen size={48} className="opacity-20 mb-4" />
                  <p>لا توجد فواتير مشتريات مطابقة لبحثك</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Print template container removed in favor of PrintPreviewModal */}

      <AddProductModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        hideInitialStock={true}
        onSuccess={(p: any) => { 
          addProduct(p); 
        }} 
      />

      <BarcodePrintModal 
        isOpen={showBarcodeModal} 
        onClose={() => {
          setShowBarcodeModal(false);
          setBarcodeProduct(null);
        }} 
        product={barcodeProduct} 
      />

      {contextMenu && (
        <ColumnContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onHideColumn={() => toggleHideColumn(contextMenu.colId)}
          onResetColumns={resetColumns}
          onShowAllColumns={() => setColumns(prev => prev.map(c => ({ ...c, hidden: false })))}
          canHide={columns.filter(c => !c.hidden && c.id !== 'actions').length > 1 && contextMenu.colId !== 'actions'}
          hasHiddenColumns={columns.some(c => c.hidden)}
        />
      )}
      <AdminPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={(admin) => confirmCancel(admin)}
        actionDescription="إلغاء فاتورة شراء يتطلب صلاحية المدير"
      />

      <AdvancedProductFinder
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onSelectProduct={addProduct}
        mode="purchase"
      />

      <AnimatePresence>
      </AnimatePresence>
      
      {editingItemId !== null && (
        <AddProductModal
          isOpen={editingItemId !== null}
          onClose={() => {
            setEditingProductId(null);
            setEditingItemId(null);
          }}
          productId={editingProductId}
          initialData={initialDataForEdit}
          hideInitialStock={true}
          onSuccess={(updatedProduct: any) => {
            if (updatedProduct) {
              setItems(prev => prev.map(item => {
                if (item.id === editingItemId || (item.product_id > 0 && item.product_id === updatedProduct.id)) {
                  const purchasePrice = updatedProduct.purchase_price || 0;
                  const retailPrice = updatedProduct.retail_price || 0;
                  const retailMargin = purchasePrice > 0 && retailPrice > 0 ? Math.round(((retailPrice / purchasePrice) - 1) * 100) : item.retail_margin;
                  return {
                    ...item,
                    product_id: updatedProduct.id,
                    product_name_snapshot: updatedProduct.name || item.product_name_snapshot,
                    product_barcode_snapshot: updatedProduct.barcode || item.product_barcode_snapshot,
                    unit_price: purchasePrice,
                    total: roundTo2(purchasePrice * item.quantity),
                    wholesale_price: updatedProduct.wholesale_price || 0,
                    retail_price: retailPrice,
                    retail_margin: retailMargin,
                    category_id: updatedProduct.category_id || item.category_id,
                    unit_id: updatedProduct.unit_id || item.unit_id,
                    isNewProduct: false,
                    needs_review: false,
                    inventory_check: isJardMode ? true : item.inventory_check
                  };
                }
                return item;
              }));

              if (isJardMode) {
                setFocusedRowIndex(prev => Math.min(prev + 1, items.length - 1));
              }
            }
            setEditingProductId(null);
            setEditingItemId(null);
          }}
        />
      )}

      {showPrintPreview && (
        <PrintPreviewModal
          isOpen={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          documentType="purchases"
          invoiceData={{
            invoice_number: invoiceNumber,
            date: customDate || new Date().toLocaleDateString('ar-DZ'),
            time: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
            customer_name: supplierName || 'مورد عام',
            customer_phone: '',
            items: items.map(item => ({
              product_name_snapshot: item.product_name_snapshot,
              product_barcode_snapshot: item.product_barcode_snapshot,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              total: item.total
            })),
            subtotal: total,
            tax_amount: 0,
            tax_percent: 0,
            total: total,
            paid: paidAmount,
            remaining: remaining,
            notes: notes
          }}
        />
      )}
      {rowContextMenu && (
        <div
          className="fixed bg-background_secondary/85 dark:bg-background_secondary/85 backdrop-blur-2xl border border-white/15 dark:border-white/10 shadow-2xl rounded-xl p-1 z-[999] min-w-[160px] animate-in fade-in zoom-in-95 duration-100 text-right"
          style={{ top: rowContextMenu.y, left: rowContextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-text_muted border-b border-border_default">خيارات الصف</div>
          
          <button
            onClick={() => {
              setPhotoModalProduct({
                id: rowContextMenu.item.product_id,
                name: rowContextMenu.item.product_name_snapshot || 'منتج',
                barcode: rowContextMenu.item.product_barcode_snapshot || undefined
              });
              setShowPhotoModal(true);
              setRowContextMenu(null);
            }}
            className="w-full text-right px-3 py-2 text-sm text-text_primary hover:bg-text_primary/10 rounded-lg transition-colors flex items-center justify-between"
          >
            <span>عرض صور المنتج</span>
            <ImageIcon size={14} className="text-text_muted" />
          </button>

          <div className="border-t border-border_default my-1" />
          
          <button
            onClick={() => {
              removeItem(rowContextMenu.item.id);
              setRowContextMenu(null);
            }}
            className="w-full text-right px-3 py-2 text-sm text-danger_red hover:bg-danger_red/10 rounded-lg transition-colors flex items-center justify-between mb-1"
          >
            <span>حذف المنتج</span>
            <Trash2 size={14} className="text-danger_red" />
          </button>

          <div className="border-t border-border_default mt-1 pt-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-primary_blue uppercase flex items-center gap-1">
              <Car size={12} /> التوافق والملاءمة
            </div>
            <div className="px-2 pb-1 max-w-[200px]">
              <FitmentsBadges productId={rowContextMenu.item.product_id} mode="view" compact />
            </div>
          </div>
        </div>
      )}

      <ProductPhotoViewerModal
        isOpen={showPhotoModal}
        product={photoModalProduct}
        onClose={() => {
          setShowPhotoModal(false);
          setPhotoModalProduct(null);
        }}
      />
    </div>
  );
}
