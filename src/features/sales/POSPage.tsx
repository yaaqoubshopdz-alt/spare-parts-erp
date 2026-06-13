import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import {
  Search, Trash2, Printer, Save, CheckCircle, Plus,
  User, Package, X, ArrowUpDown, ShieldAlert, Lock,
  FolderOpen, Calendar, XCircle, FileText, EyeOff, Eye, Car, Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { roundTo2, calcItemDiscount, calcItemTotal, calcSubtotal, calcGlobalDiscount, calcTax, calcTotal, calcRemaining } from '../../utils/calculations';
import { PrintPreviewModal } from '../../shared/components/print/PrintPreviewModal';
import { PrintTemplateRenderer, DEFAULT_CONFIGS, generateInvoiceHTML, TemplateType, PrintConfig, PaperSize } from '../../shared/components/print/PrintTemplateRenderer';
import ERPTable from '../../shared/components/table/ERPTable';
import { useTableFiller } from '../../shared/components/table/useTableFiller';
import ERPTableRow from '../../shared/components/table/ERPTableRow';
import type { ERPColumn } from '../../shared/components/table/types';
import AdvancedProductFinder from '../shared/AdvancedProductFinder';
import FitmentsBadges from '../shared/FitmentsBadges';
import { toast } from 'sonner';
import { showNotification, showSuccess, showInfo, showError } from '../../shared/utils/notifications';
import { showAutoParkToast } from '../../shared/components/ui/AutoParkToast';
import { AdminPinModal } from '../../shared/components/ui/AdminPinModal';
import { useSearchParams } from 'react-router-dom';
import GlassDropdown, { GlassDropdownItem } from '../../shared/components/ui/GlassDropdown';
import { useShallow } from 'zustand/react/shallow';
import { useWorkspaceStore, Workspace } from '../../store/workspaceStore';
import { useInvoiceIntegration } from './hooks/useInvoiceIntegration';
import { captureInvoiceSnapshot } from './utils/snapshotEngine';
import ProInvoiceLayout from '../../shared/components/layout/ProInvoiceLayout';
import { useShortcutStore } from '../../store/shortcutStore';
import { useSmoothScroll } from '../../shared/hooks/useSmoothScroll';
import ProductPhotoViewerModal from '../inventory/ProductPhotoViewerModal';

type SaleType = 'retail' | 'wholesale';
type DiscountType = 'percent' | 'amount';

interface InvoiceItem {
  id: string;
  product_id: number;
  product_name_snapshot: string;
  product_barcode_snapshot: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  purchase_price_snapshot: number;
  item_discount_type: DiscountType;
  item_discount_value: number;
  item_discount_amount: number;
  total: number;
  stock_available: number;
  sort_order: number;
  retail_price_snapshot?: number;
  wholesale_price_snapshot?: number;
  has_sub_unit?: boolean;
  pieces_per_box?: number;
  unit_name?: string;
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
  { id: 'index', label: '#', width: 60, align: 'center' },
  { id: 'barcode', label: 'الكود', width: 130, align: 'center', sortable: true, sortKey: 'product_barcode_snapshot' },
  { id: 'name', label: 'التسمية', width: 380, align: 'right', sortable: true, sortKey: 'product_name_snapshot', flex: true },
  { id: 'price', label: 'سعر البيع', width: 120, align: 'center' },
  { id: 'discount', label: 'تخفيض', width: 110, align: 'center' },
  { id: 'stock', label: 'المخزون', width: 90, align: 'center' },
  { id: 'quantity', label: 'الكمية', width: 110, align: 'center' },
  { id: 'total', label: 'المبلغ الإجمالي', width: 160, align: 'center' },
  { id: 'unit', label: 'الوحدة', width: 100, align: 'center' },
  { id: 'actions', label: '', width: 60, align: 'center' },
];

const ALL_SALE_TYPES: { value: SaleType; label: string; priceField: string }[] = [
  { value: 'retail', label: 'تجزئة (قطعة)', priceField: 'retail_price' },
  { value: 'wholesale', label: 'جملة (علبة)', priceField: 'wholesale_price' },
];

export default function SalesInvoicePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const productSearchRef = useRef<HTMLInputElement>(null);
  const dropdownScrollRef = useSmoothScroll<HTMLDivElement>();
  const customerDropdownScrollRef = useSmoothScroll<HTMLDivElement>();
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const isSavingRef = useRef(false);
  const isSavedRef = useRef(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const getColumnLabel = (id: string, fallback: string) => {
    switch (id) {
      case 'index': return t('invoice.column_index') || fallback;
      case 'barcode': return t('invoice.column_code') || fallback;
      case 'name': return t('invoice.column_name') || fallback;
      case 'price': return t('invoice.column_price') || fallback;
      case 'discount': return t('invoice.column_discount') || fallback;
      case 'stock': return t('invoice.column_stock') || fallback;
      case 'quantity': return t('invoice.column_quantity') || fallback;
      case 'total': return t('invoice.column_total') || fallback;
      case 'unit': return t('common.unit') || fallback;
      default: return fallback;
    }
  };

  // Branch pricing control fallback for local system
  const isHQ = true;
  const isRetailBranch = false;

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Open Modal State
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openModalSearch, setOpenModalSearch] = useState('');
  const [openModalDate, setOpenModalDate] = useState(new Date().toISOString().split('T')[0]);
  const [openModalInvoices, setOpenModalInvoices] = useState<any[]>([]);
  const [openModalLoading, setOpenModalLoading] = useState(false);
  const [openModalOnlyDrafts, setOpenModalOnlyDrafts] = useState(false);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinAction, setPinAction] = useState<'cancel' | 'high_discount' | null>(null);
  const [notification, setNotification] = useState<{ type: 'save' | 'new'; title: string; message: string } | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<'draft' | 'confirmed' | 'cancelled' | null>(null);

  // Zustand Store Integration
  const store = useWorkspaceStore(
    useShallow(s => {
      const ws = s.activeId ? s.workspaces[s.activeId] : null;
      return {
        activeId: s.activeId,
        updateActiveWorkspace: s.updateActiveWorkspace,
        workspace: ws,
      };
    })
  );

  const { activeId, updateActiveWorkspace, workspace } = store;

  // Fallback defaults if workspace not ready
  const currentInvoiceId = workspace?.currentInvoiceId ?? null;
  const invoiceNumber = workspace?.invoiceNumber ?? '';
  const saleType = workspace?.saleType ?? 'retail';
  const customerId = workspace?.customerId ?? null;
  const customerName = workspace?.customerName ?? 'زبون عام';
  const customerPhone = workspace?.customerPhone ?? '';
  const customerBalance = workspace?.customerBalance ?? 0;
  const paymentMethod = workspace?.paymentMethod ?? 'cash';
  const notes = workspace?.notes ?? '';
  const items = workspace?.items ?? [];
  const globalDiscountType = workspace?.globalDiscountType ?? 'percent';
  const globalDiscountValue = workspace?.globalDiscountValue ?? 0;
  const taxPercent = workspace?.taxPercent ?? 0;
  const paidAmount = workspace?.paidAmount ?? 0;
  const isCancelled = workspace?.isCancelled ?? false;
  const customDate = workspace?.customDate ?? null;

  // Safe update helper
  const updateWorkspaceFields = useCallback((data: Partial<Omit<Workspace, 'id' | 'snapshotId' | 'lastActivity'>>) => {
    if (activeId) {
      updateActiveWorkspace(activeId, data);
      const contentKeys = ['items', 'customerId', 'paidAmount', 'globalDiscountValue', 'notes', 'saleType', 'customDate'];
      if (Object.keys(data).some(k => contentKeys.includes(k))) {
        isSavedRef.current = false;
      }
    }
  }, [activeId, updateActiveWorkspace]);

  const setCustomDate = useCallback((val: string | null) => {
    updateWorkspaceFields({ customDate: val });
  }, [updateWorkspaceFields]);

  // Setter wrappers to mock local useState setters and update Zustand directly
  const setItems: React.Dispatch<React.SetStateAction<InvoiceItem[]>> = useCallback((val) => {
    const currentItems = workspace?.items ?? [];
    const nextItems = typeof val === 'function' ? (val as Function)(currentItems) : val;
    updateWorkspaceFields({ items: nextItems });
  }, [updateWorkspaceFields, workspace?.items]);

  const setPaidAmount: React.Dispatch<React.SetStateAction<number>> = useCallback((val) => {
    const currentPaid = workspace?.paidAmount ?? 0;
    const nextPaid = typeof val === 'function' ? (val as Function)(currentPaid) : val;
    updateWorkspaceFields({ paidAmount: nextPaid });
  }, [updateWorkspaceFields, workspace?.paidAmount]);

  const setCustomerId = useCallback((val: number | null) => {
    updateWorkspaceFields({ customerId: val });
  }, [updateWorkspaceFields]);

  const setCustomerName = useCallback((val: string) => {
    updateWorkspaceFields({ customerName: val });
  }, [updateWorkspaceFields]);

  const setCustomerPhone = useCallback((val: string) => {
    updateWorkspaceFields({ customerPhone: val });
  }, [updateWorkspaceFields]);

  const setCustomerBalance = useCallback((val: number) => {
    updateWorkspaceFields({ customerBalance: val });
  }, [updateWorkspaceFields]);

  const setInvoiceNumber = useCallback((val: string) => {
    updateWorkspaceFields({ invoiceNumber: val });
  }, [updateWorkspaceFields]);

  const setCurrentInvoiceId = useCallback((val: number | null) => {
    updateWorkspaceFields({ currentInvoiceId: val });
  }, [updateWorkspaceFields]);

  const setSaleType = useCallback((val: SaleType) => {
    updateWorkspaceFields({ saleType: val });
  }, [updateWorkspaceFields]);

  const setGlobalDiscountValue = useCallback((val: number) => {
    updateWorkspaceFields({ globalDiscountValue: val });
  }, [updateWorkspaceFields]);

  const setGlobalDiscountType = useCallback((val: DiscountType) => {
    updateWorkspaceFields({ globalDiscountType: val });
  }, [updateWorkspaceFields]);

  const setTaxPercent = useCallback((val: number) => {
    updateWorkspaceFields({ taxPercent: val });
  }, [updateWorkspaceFields]);

  const setNotes = useCallback((val: string) => {
    updateWorkspaceFields({ notes: val });
  }, [updateWorkspaceFields]);

  const setIsCancelled = useCallback((val: boolean) => {
    updateWorkspaceFields({ isCancelled: val });
  }, [updateWorkspaceFields]);

  const loadInvoices = async () => {
    setOpenModalLoading(true);
    try {
      const res: any = await window.electronAPI.invoke('db:sales:getAll', {
        date_from: openModalOnlyDrafts ? undefined : openModalDate,
        date_to: openModalOnlyDrafts ? undefined : openModalDate,
        status: openModalOnlyDrafts ? 'draft' : undefined,
        search: openModalSearch,
        limit: 50
      });
      if (res.success) setOpenModalInvoices(rows => res.data);
    } catch (e) { toast.error('خطأ في تحميل الفواتير'); }
    setOpenModalLoading(false);
  };

  useEffect(() => {
    if (showOpenModal) {
      loadInvoices();
    }
  }, [showOpenModal, openModalDate, openModalSearch, openModalOnlyDrafts]);

  const handleOpenInvoice = useCallback(async (id: number) => {
    try {
      const res: any = await window.electronAPI?.invoke('db:sales:getById', id);
      if (res?.success && res.data) {
        const inv = res.data;
        const mappedItems = (inv.items || []).map((item: any) => ({
          id: `item-${item.id || Date.now()}-${Math.random()}`,
          product_id: item.product_id,
          product_name_snapshot: item.product_name_snapshot || item.product_name || '',
          product_barcode_snapshot: item.product_barcode_snapshot || item.product_barcode || null,
          quantity: item.quantity,
          unit: item.unit || 'حبة',
          unit_price: item.unit_price,
          purchase_price_snapshot: item.cost_price_snapshot || 0,
          item_discount_type: item.item_discount_type || 'percent',
          item_discount_value: item.item_discount_value || 0,
          item_discount_amount: item.item_discount_amount || 0,
          total: item.total,
          stock_available: item.quantity,
          sort_order: item.sort_order || 0,
          retail_price_snapshot: item.retail_price || item.unit_price,
          wholesale_price_snapshot: item.wholesale_price || item.unit_price,
          has_sub_unit: item.has_sub_unit ? true : false,
          pieces_per_box: item.pieces_per_box || 1,
          unit_name: item.unit_name || 'حبة',
          product_is_active: item.product_is_active !== undefined ? item.product_is_active : 1,
        }));

        updateWorkspaceFields({
          currentInvoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          customerId: inv.customer_id,
          customerName: inv.customer_name || 'زبون عام',
          customerPhone: '',
          customerBalance: inv.customer_balance || 0,
          globalDiscountValue: inv.global_discount_value || 0,
          taxPercent: inv.tax_percent || 0,
          paidAmount: inv.paid || 0,
          notes: inv.notes || '',
          items: mappedItems,
          isCancelled: inv.status === 'cancelled',
          customDate: inv.date || null
        });
        
        isSavedRef.current = true;
        setInvoiceStatus(inv.status);
        setShowOpenModal(false);
      }
    } catch (e) {
      console.error('Error opening invoice:', e);
    }
  }, [updateWorkspaceFields]);

  const toggleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedItems = [...items].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let valA = (a as any)[key] ?? '';
    let valB = (b as any)[key] ?? '';

    if (typeof valA === 'string' && typeof valB === 'string') {
      return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return direction === 'asc' ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
  });

  // Search states
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [productResults, setProductResults] = useState<any[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [dropdownSortKey, setDropdownSortKey] = useState<string>('');
  const [dropdownSortDir, setDropdownSortDir] = useState<'asc' | 'desc'>('asc');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [focusedProductIndex, setFocusedProductIndex] = useState<number>(-1);

  useEffect(() => {
    setFocusedProductIndex(-1);
  }, [productSearch, showProductDropdown]);

  useEffect(() => {
    if (focusedProductIndex >= 0) {
      const el = document.getElementById(`dd-product-row-${focusedProductIndex}`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedProductIndex]);

  const [saving, setSaving] = useState(false);
  const [saveSessionId, setSaveSessionId] = useState(`SALE-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const shortcuts = useShortcutStore(state => state.shortcuts);

  // Columns State (Reorderable & Resizable)
  const [columns, setColumns] = useState<ColumnDef[]>(() => {
    const saved = localStorage.getItem('invoice_columns_layout_v2');
    return saved ? JSON.parse(saved) : INITIAL_COLUMNS;
  });

  const draggedColIndex = useRef<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, colId: string } | null>(null);
  const [rowContextMenu, setRowContextMenu] = useState<{ x: number, y: number, itemId: string, productId: number } | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoModalProduct, setPhotoModalProduct] = useState<{ id: number; name: string; barcode?: string } | null>(null);

  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  useEffect(() => {
    localStorage.setItem('invoice_columns_layout_v2', JSON.stringify(columns));
  }, [columns]);



  // Close context menu and search dropdowns on outside click
  useEffect(() => {
    const closeMenu = () => {
      setContextMenu(null);
      setRowContextMenu(null);
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#product-search-container')) {
        setShowProductDropdown(false);
      }
      if (!target.closest('#customer-search-container')) {
        setShowCustomerDropdown(false);
      }
    };
    window.addEventListener('click', closeMenu);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('click', closeMenu);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    setColumns(prev => prev.map(col => col.id === id ? { ...col, width: Math.max(50, newWidth), flex: false } : col));
  };

  // Calculate totals
  const subtotal = calcSubtotal(items.map(i => i.total));
  const globalDiscountAmount = calcGlobalDiscount(subtotal, globalDiscountType, globalDiscountValue);
  const totalBeforeTax = roundTo2(subtotal - globalDiscountAmount);
  const taxAmount = calcTax(totalBeforeTax, taxPercent);
  const total = calcTotal(totalBeforeTax, taxAmount);
  const remaining = calcRemaining(total, paidAmount);

  // Calculate live customer debt
  let displayedDebt = 0;
  const previousDebt = customerBalance;

  if (currentInvoiceId) {
    // If editing an existing confirmed invoice, the balance already includes its previous remaining.
    // For simplicity, we just show the recorded balance.
    displayedDebt = previousDebt;
  } else {
    // For a new invoice, the total debt will be their previous debt + what they haven't paid now.
    displayedDebt = previousDebt + remaining;
  }

  // Link Logic: Auto-sync paid amount for General Customer, Manual for others
  const [isLinked, setIsLinked] = useState(true);

  useEffect(() => {
    if (currentInvoiceId) return; // Prevent overwriting loaded data

    if (!customerId) {
      setIsLinked(true);
      setPaidAmount(total);
    } else {
      // When a specific customer is selected, reset to 0 and unlink
      setIsLinked(false);
      setPaidAmount(0);
    }
  }, [customerId, currentInvoiceId]);

  // Keep synced if linked
  useEffect(() => {
    if (isLinked && !currentInvoiceId) {
      setPaidAmount(total);
    }
  }, [total, isLinked, currentInvoiceId]);

  // Get next invoice number on mount
  useEffect(() => {
    const api = window.electronAPI;
    if (api) {
      const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      setInvoiceNumber(`INV-${todayStr}-XXXX`);
    }
  }, []);

  // Auto-capture visual state on page unmount and register onBeforeOpen callback
  useEffect(() => {
    const setOnBeforeOpen = useWorkspaceStore.getState().setOnBeforeOpen;
    setOnBeforeOpen(async () => {
      if (activeId) {
        await captureInvoiceSnapshot('pos-invoice-container', activeId);
      }
    });

    return () => {
      const isSwitcherActive = useWorkspaceStore.getState().isSwitcherOpen || !!document.getElementById('workspace-switcher-overlay');
      if (activeId && !isSwitcherActive) {
        captureInvoiceSnapshot('pos-invoice-container', activeId);
      }
      setOnBeforeOpen(null);
    };
  }, [activeId]);

  // Auto-load invoice from URL query param (?invoiceId=123)
  useEffect(() => {
    const invoiceIdParam = searchParams.get('invoiceId');
    if (invoiceIdParam) {
      const id = parseInt(invoiceIdParam, 10);
      if (!isNaN(id) && id !== currentInvoiceId) {
        handleOpenInvoice(id);
      }
    }
  }, [searchParams, currentInvoiceId, handleOpenInvoice]);

  // Product search with debounce
  useEffect(() => {
    if (productSearch.length < 1) { setProductResults([]); setShowProductDropdown(false); return; }
    const timer = setTimeout(async () => {
      const api = window.electronAPI;
      if (!api) return;
      const res: any = await api.invoke('db:products:search', productSearch, selectedCategoryId);
      if (res?.success) { setProductResults(res.data); setShowProductDropdown(true); }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch, selectedCategoryId]);

  // Customer search with debounce
  useEffect(() => {
    if (customerSearch.length < 1) { setCustomerResults([]); setShowCustomerDropdown(false); return; }
    const timer = setTimeout(async () => {
      const api = window.electronAPI;
      if (!api) return;
      const res: any = await api.invoke('db:customers:search', customerSearch);
      if (res?.success) { setCustomerResults(res.data); setShowCustomerDropdown(true); }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Add product to invoice with branch pricing rules
  const addProduct = useCallback((product: any) => {
    // Record usage
    if (window.electronAPI && productSearch.trim()) {
      window.electronAPI.invoke('db:products:recordUsage', { query: productSearch, productId: product.id })
        .catch(err => console.error('Error recording usage:', err));
    }

    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      setItems(prev => prev.map(i =>
        i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, total: calcItemTotal(i.unit_price, i.quantity + 1, i.item_discount_amount) }
          : i
      ));
    } else {
      const defaultPrice = product.retail_price || 0;
      const newItem: InvoiceItem = {
        id: `item-${Date.now()}`,
        product_id: product.id,
        product_name_snapshot: product.name,
        product_barcode_snapshot: product.barcode,
        quantity: 1,
        unit: product.unit_name || 'حبة',
        unit_price: defaultPrice,
        purchase_price_snapshot: product.purchase_price || 0,
        item_discount_type: 'percent',
        item_discount_value: 0,
        item_discount_amount: 0,
        total: defaultPrice,
        stock_available: product.total_stock ?? product.quantity ?? 0,
        sort_order: items.length,
        retail_price_snapshot: product.retail_price || 0,
        wholesale_price_snapshot: product.wholesale_price || 0,
        has_sub_unit: product.has_sub_unit ? true : false,
        pieces_per_box: product.pieces_per_box || 1,
        unit_name: product.unit_name || 'حبة',
      };
      setItems(prev => [...prev, newItem]);
    }
    setProductSearch('');
    setShowProductDropdown(false);
    productSearchRef.current?.focus();
  }, [items, productSearch]);

  const updateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      updated.item_discount_amount = calcItemDiscount(updated.unit_price, updated.quantity, updated.item_discount_type, updated.item_discount_value);
      updated.total = calcItemTotal(updated.unit_price, updated.quantity, updated.item_discount_amount);
      return updated;
    }));
  };

  const updateItemUnit = (id: string, newUnit: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const price = newUnit === 'علبة' ? item.wholesale_price_snapshot || item.unit_price : item.retail_price_snapshot || item.unit_price;
      const updated = { ...item, unit: newUnit, unit_price: price };
      updated.item_discount_amount = calcItemDiscount(updated.unit_price, updated.quantity, updated.item_discount_type, updated.item_discount_value);
      updated.total = calcItemTotal(updated.unit_price, updated.quantity, updated.item_discount_amount);
      return updated;
    }));
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const handleSaleTypeChange = async (newType: SaleType) => {
    setSaleType(newType);

    // Re-price all existing items to match new sale type
    if (items.length > 0) {
      const priceField = ALL_SALE_TYPES.find(s => s.value === newType)?.priceField || 'retail_price';
      const api = window.electronAPI;
      if (!api) return;

      // Fetch current prices for all products in the invoice
      const updatedItems = await Promise.all(items.map(async (item) => {
        try {
          const res: any = await api.invoke('db:products:search', item.product_name_snapshot);
          const product = res?.data?.find((p: any) => p.id === item.product_id);
          if (product) {
            let newPrice = product[priceField] || product.retail_price || item.unit_price;
            const discountAmount = calcItemDiscount(newPrice, item.quantity, item.item_discount_type, item.item_discount_value);
            return { ...item, unit_price: newPrice, item_discount_amount: discountAmount, total: calcItemTotal(newPrice, item.quantity, discountAmount) };
          }
        } catch { }
        return item;
      }));
      setItems(updatedItems);
    }
  };

  const selectCustomer = (c: any) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone || '');
    setCustomerBalance(c.balance || 0);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const handleManualPrint = () => {
    if (items.length === 0) {
      toast.error('لا يمكن طباعة فاتورة فارغة');
      return;
    }
    setShowPrintPreview(true);
  };

  const handleAutoPrint = async () => {
    try {
      const api = window.electronAPI;
      if (!api) return;
      const settingsRes = await api.invoke('db:settings:getAll');
      if (settingsRes?.success && settingsRes.data) {
        const autoPrint = settingsRes.data.auto_print === true || settingsRes.data.auto_print === 'true';
        if (autoPrint) {
          const savedTemplate = (localStorage.getItem('print_preview_template_sales') || 'receipt') as TemplateType;
          const savedSize = localStorage.getItem('print_preview_size_sales') || DEFAULT_CONFIGS[savedTemplate].size;
          
          let savedConfig = DEFAULT_CONFIGS[savedTemplate].config;
          try {
            const savedConfigStr = localStorage.getItem(`print_preview_config_sales_${savedTemplate}`);
            if (savedConfigStr) savedConfig = JSON.parse(savedConfigStr);
          } catch {}

          let savedCols = DEFAULT_CONFIGS[savedTemplate].columns;
          try {
            const savedColsStr = localStorage.getItem(`print_preview_columns_sales_${savedTemplate}`);
            if (savedColsStr) savedCols = JSON.parse(savedColsStr);
          } catch {}

          const invoiceObj = {
            invoice_number: invoiceNumber,
            date: customDate || new Date().toLocaleDateString('ar-DZ'),
            time: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
            customer_name: customerName,
            customer_phone: customerPhone,
            items: items,
            subtotal, tax_amount: taxAmount, tax_percent: taxPercent,
            total, paid: paidAmount, remaining,
            notes
          };

          const html = generateInvoiceHTML(
            invoiceObj,
            settingsRes.data,
            savedSize as any,
            savedTemplate as any,
            savedConfig,
            savedCols
          );

          const printer = savedSize === '80mm' ? settingsRes.data.receipt_printer : settingsRes.data.invoice_printer;
          await api.invoke('print:html', {
            html,
            silent: true,
            printerName: printer || undefined,
            paperSize: savedSize
          });
        }
      }
    } catch (e) {
      console.error('Auto print failed:', e);
    }
  };

  const resetInvoice = async (skipAutoSave: any = false) => {
    const shouldSkip = skipAutoSave === true;
    if (!shouldSkip && items.length > 0 && !isSavedRef.current && invoiceStatus !== 'confirmed' && invoiceStatus !== 'cancelled') {
      // حفظ تلقائي كمسودة
      try {
        const api = window.electronAPI;
        if (api) {
          const invoiceData = {
            id: currentInvoiceId || undefined,
            customer_id: customerId || undefined,
            sale_type: saleType,
            subtotal,
            tax_amount: taxAmount,
            global_discount_amount: globalDiscountAmount,
            total,
            paid: paidAmount,
            status: 'draft', // مسودة
            notes: notes,
            items: items.map(item => ({
              product_id: item.product_id,
              product_name_snapshot: item.product_name_snapshot,
              product_barcode_snapshot: item.product_barcode_snapshot,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              cost_price_snapshot: item.purchase_price_snapshot || 0,
              item_discount_type: item.item_discount_type,
              item_discount_value: item.item_discount_value,
              item_discount_amount: item.item_discount_amount,
              total: item.total,
              sort_order: item.sort_order
            })),
            _user_id: user?.id || 1,
            session_id: saveSessionId,
            custom_date: customDate || undefined
          };
          const res: any = await api.invoke('db:sales:save', invoiceData);
          if (res?.success) {
            // عرض إشعار علوي منسدل متحرك (Top-sliding notification)
            showAutoParkToast('sales', res.id);
          }
        }
      } catch (e) {
        console.error('Failed to auto-save draft:', e);
      }
    }
    isSavedRef.current = false;
    setCurrentInvoiceId(null);
    setInvoiceStatus(null);
    setItems([]);
    setCustomerId(null);
    setCustomerName('زبون عام');
    setCustomerPhone('');
    setCustomerBalance(0);
    setGlobalDiscountValue(0);
    setTaxPercent(0);
    setPaidAmount(0);
    setNotes('');
    setCustomDate(null);
    setIsCancelled(false);
    setIsLinked(true);
    setSaveSessionId(`SALE-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
    setSearchParams({}, { replace: true });
    productSearchRef.current?.focus();
  };

  const saveInvoice = async () => {
    // ── Guard: لا عناصر ──
    if (items.length === 0) return;

    // ── Guard: Atomic Check-and-Set (Debounce) ──
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

      // Check for high discount security gate
      const discountPercent = subtotal > 0 ? (globalDiscountAmount / subtotal) * 100 : 0;
      if (discountPercent > 15 && pinAction !== 'high_discount') {
        setPinAction('high_discount');
        setShowPinModal(true);
        setSaving(false);
        isSavingRef.current = false;
        return;
      }

      const invoiceData = {
        id: currentInvoiceId || undefined, // ← إذا موجود = UPDATE، إذا لا = CREATE
        customer_id: customerId || undefined,
        sale_type: saleType,
        subtotal,
        tax_amount: taxAmount,
        global_discount_amount: globalDiscountAmount,
        total,
        paid: paidAmount,
        status: 'confirmed',
        notes: notes,
        items: items.map(item => ({
          product_id: item.product_id,
          product_name_snapshot: item.product_name_snapshot,
          product_barcode_snapshot: item.product_barcode_snapshot,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          cost_price_snapshot: item.purchase_price_snapshot || 0,
          item_discount_type: item.item_discount_type,
          item_discount_value: item.item_discount_value,
          item_discount_amount: item.item_discount_amount,
          total: item.total,
          sort_order: item.sort_order
        })),
        _user_id: user?.id || 1,
        session_id: saveSessionId,
        custom_date: customDate || undefined
      };

      const res: any = await api.invoke('db:sales:save', invoiceData);

      if (res?.success) {
        isSavedRef.current = true;
        setInvoiceStatus('confirmed');
        // حفظ الـ ID لأول مرة
        if (!currentInvoiceId && res.id) {
          setCurrentInvoiceId(res.id);
        }
        if (res.invoiceNumber) {
          setInvoiceNumber(res.invoiceNumber);
        }

        if (res.duplicate) {
          showNotification('success', `تم تحديث الفاتورة رقم ${res.invoiceNumber || invoiceNumber} وتحديث بيانات المخزن وصندوق الحسابات بنجاح.`);
        } else if (res.isNew) {
          showNotification('success', `تم تأكيد وترحيل الفاتورة رقم ${res.invoiceNumber || invoiceNumber} بنجاح إلى سجل المبيعات والتقارير المالية.`);
        } else {
          showNotification('success', `تم حفظ وتعديل الفاتورة رقم ${res.invoiceNumber || invoiceNumber} بنجاح.`);
        }

        // Refresh customer balance
        if (customerId) {
          const cRes: any = await api.invoke('db:customers:search', customerName);
          const currentCustomer = cRes?.data?.find((c: any) => c.id === customerId);
          if (currentCustomer) setCustomerBalance(currentCustomer.balance || 0);
        }

        // Print after save ONLY if auto_print is enabled in settings
        setTimeout(() => { handleAutoPrint(); }, 150);
      } else {
        toast.error(res?.error || 'حدث خطأ أثناء الحفظ');
      }
    } catch (e) {
      console.error('Save error:', e);
      toast.error('حدث خطأ أثناء حفظ الفاتورة');
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  };

  const cancelInvoice = async () => {
    if (!currentInvoiceId || isCancelled) return;
    setPinAction('cancel');
    setShowPinModal(true);
  };

  const confirmCancel = async (admin: any) => {
    setSaving(true);
    try {
      const res: any = await window.electronAPI?.invoke('db:sales:cancel', currentInvoiceId);
      if (res?.success) {
        toast.success('تم إلغاء الفاتورة بنجاح');

        // Log the action (Audit logs not strictly required yet, but safe to keep call if it exists or ignore error)
        await window.electronAPI?.invoke('db:audit:log', {
          action: 'invoice_cancel',
          details: `إلغاء فاتورة مبيعات: ${currentInvoiceId}`,
          user_id: user?.id,
        }).catch(() => { });

        resetInvoice(true);
      } else {
        toast.error(res?.error || 'حدث خطأ أثناء الإلغاء');
      }
    } finally {
      setSaving(false);
      setPinAction(null);
    }
  };

  const handlePinSuccess = async (admin: any) => {
    if (pinAction === 'cancel') {
      confirmCancel(admin);
    } else if (pinAction === 'high_discount') {
      // Log high discount authorization
      await window.electronAPI?.invoke('db:audit:log', {
        action: 'high_discount',
        details: `تخفيض عالي (>15%) على الفاتورة | القيمة: ${globalDiscountAmount} د.ج`,
        user_id: user?.id,
      }).catch(() => { });
      saveInvoice();
      setPinAction(null);
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

      if (matches(e, shortcuts.new_invoice)) { e.preventDefault(); resetInvoice(); }
      if (matches(e, shortcuts.search_product)) { e.preventDefault(); productSearchRef.current?.focus(); }
      if (matches(e, shortcuts.search_party)) { e.preventDefault(); customerSearchRef.current?.focus(); }
      if (matches(e, shortcuts.print_invoice)) { e.preventDefault(); handleManualPrint(); }
      if (matches(e, shortcuts.save_invoice)) { e.preventDefault(); saveInvoice(); }
      if (matches(e, shortcuts.cancel_invoice)) { e.preventDefault(); if (currentInvoiceId && !isCancelled) cancelInvoice(); else resetInvoice(); }
      if (matches(e, shortcuts.advanced_search)) { e.preventDefault(); setShowAdvancedSearch(true); }
      if (matches(e, shortcuts.open_invoice)) { e.preventDefault(); setShowOpenModal(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items, total, paidAmount, remaining, customerId, customerName, invoiceNumber, currentInvoiceId, shortcuts, cancelInvoice]);

  useEffect(() => {
    if (!window.electronAPI) return;

    const handleMobileBarcode = async (data: { barcode: string; found: boolean; name: string; price: number | null; quantity: number | null }) => {
      if (!data.found) return; // Handled globally by App.tsx to avoid duplicate errors
      try {
        const res = await window.electronAPI.invoke('db:products:getByBarcodeOrCode', data.barcode);
        if (res.success && res.data) {
          addProduct(res.data);
          toast.success(`تمت إضافة المنتج من الهاتف: ${res.data.name} 📱`);
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

  const sortedProductResults = [...productResults].sort((a, b) => {
    if (!dropdownSortKey) return 0;

    let aVal, bVal;
    if (dropdownSortKey === 'code') {
      aVal = a.barcode || a.internal_code || '';
      bVal = b.barcode || b.internal_code || '';
    } else if (dropdownSortKey === 'name') {
      aVal = a.name || '';
      bVal = b.name || '';
    } else if (dropdownSortKey === 'stock') {
      aVal = a.total_stock || 0;
      bVal = b.total_stock || 0;
    } else if (dropdownSortKey === 'price') {
      const priceField = ALL_SALE_TYPES.find((s: any) => s.value === saleType)?.priceField || 'retail_price';
      aVal = a[priceField] || 0;
      bVal = b[priceField] || 0;
    }

    if (aVal < bVal) return dropdownSortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return dropdownSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleDropdownSort = (key: string) => {
    if (dropdownSortKey === key) {
      setDropdownSortDir(dropdownSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setDropdownSortKey(key);
      setDropdownSortDir('asc');
    }
  };

  const renderSortArrow = (key: string) => {
    if (dropdownSortKey !== key) return null;
    return <span className="text-[10px] ml-1">{dropdownSortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (focusedProductIndex >= 0 && focusedProductIndex < productResults.length) {
        e.preventDefault();
        const priceField = ALL_SALE_TYPES.find((s: any) => s.value === saleType)?.priceField || 'retail_price';
        const sortedPR = [...productResults].sort((a, b) => {
          if (!dropdownSortKey) return 0;
          let aVal, bVal;
          if (dropdownSortKey === 'code') { aVal = a.barcode || a.internal_code || ''; bVal = b.barcode || b.internal_code || ''; }
          else if (dropdownSortKey === 'name') { aVal = a.name || ''; bVal = b.name || ''; }
          else if (dropdownSortKey === 'stock') { aVal = a.total_stock || 0; bVal = b.total_stock || 0; }
          else if (dropdownSortKey === 'price') { aVal = a[priceField] || 0; bVal = b[priceField] || 0; }
          if (aVal < bVal) return dropdownSortDir === 'asc' ? -1 : 1;
          if (aVal > bVal) return dropdownSortDir === 'asc' ? 1 : -1;
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
            setShowProductDropdown(false);
          } else {
            toast.error('لم يتم العثور على أي منتج يطابق هذا الكود أو الباركود');
          }
        } catch (err) {
          console.error(err);
        }
      }
    } else if (e.key === 'ArrowDown') {
      if (showProductDropdown && productResults.length > 0) {
        e.preventDefault();
        setFocusedProductIndex(prev => Math.min(prev + 1, productResults.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      if (showProductDropdown && productResults.length > 0) {
        e.preventDefault();
        setFocusedProductIndex(prev => Math.max(prev - 1, -1));
      }
    }
  };

  return (
    <div key={activeId} id="pos-invoice-container" className="flex-1 w-full h-full flex flex-col overflow-hidden">
      {/* Print template container removed in favor of PrintPreviewModal */}

      <ProInvoiceLayout
        title={`${t('sidebar.sales')}${isCancelled ? ' - ' + t('invoice.status_cancelled') : ''}`}
        invoiceNumber={invoiceNumber}
        isSaving={saving}
        notes={notes}
        onNotesChange={(val) => updateWorkspaceFields({ notes: val })}
        date={customDate || new Date().toISOString().split('T')[0]} 
        onDateChange={(val) => setCustomDate(val)}
        searchQuery={productSearch}
        searchRef={productSearchRef}
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={setSelectedCategoryId}
        onSearchChange={(v) => {
          setProductSearch(v);
          if (v.length > 0 && !showProductDropdown) setShowProductDropdown(true);
        }}
        onSearchFocus={() => {
          if (productSearch.length > 0 || productResults.length > 0) {
            setShowProductDropdown(true);
          }
        }}
        onSearchKeyDown={handleSearchKeyDown}
        searchActions={
          <button
            onClick={() => setShowAdvancedSearch(true)}
            className="bg-primary_blue/20 hover:bg-primary_blue/40 text-primary_blue border border-primary_blue/50 rounded-xl px-4 h-[52px] flex items-center justify-center gap-2 font-bold transition-all shrink-0 ml-2"
            title={t('common.advanced_search')}
          >
            <Car size={18} />
            {t('common.advanced_search')}
          </button>
        }
        onNew={resetInvoice}
        saveLabel={currentInvoiceId ? t('invoice.edit_invoice') : t('common.save')}
        saveColor={undefined}
        onOpen={() => setShowOpenModal(true)}
        onSave={() => saveInvoice()}
        onCancel={currentInvoiceId && !isCancelled ? cancelInvoice : undefined}
        onPrint={handleManualPrint}
        onDelete={() => { setItems([]); }}
        totalAmount={total}
        paidAmount={paidAmount}
        onPaidAmountChange={(val) => {
          setPaidAmount(val);
          setIsLinked(val === total);
        }}
        remainingAmount={remaining}
        dueAmount={total}
        customerBalance={displayedDebt}
        productDropdown={
          showProductDropdown && productResults.length > 0 && (
            <GlassDropdown show={showProductDropdown && productResults.length > 0} width="w-[750px]" accentColor="blue">
            {/* Table Header (Show once at the top) */}
              <div className="flex items-center border-b border-white/[0.08] px-2 py-2 text-[10px] font-black text-text_primary uppercase tracking-wider select-none">
                <div className="w-[100px] px-2 text-center cursor-pointer hover:bg-white/10 rounded transition-colors border-l border-white/[0.08]" onClick={() => toggleDropdownSort('code')}>{t('invoice.column_code')} {renderSortArrow('code')}</div>
                <div className="flex-1 px-4 text-right cursor-pointer hover:bg-white/10 rounded transition-colors border-l border-white/[0.08]" onClick={() => toggleDropdownSort('name')}>{t('invoice.column_name')} {renderSortArrow('name')}</div>
                <div className="w-[90px] px-2 text-center cursor-pointer hover:bg-white/10 rounded transition-colors border-l border-white/[0.08]" onClick={() => toggleDropdownSort('stock')}>{t('invoice.column_stock')} {renderSortArrow('stock')}</div>
                <div className="w-[120px] px-3 text-center border-l border-white/[0.08]">{t('invoice.sale_type_retail')}</div>
                <div className="w-[120px] px-3 text-center">{t('invoice.sale_type_wholesale')}</div>
              </div>

              {/* Table Body (Results) */}
              <div ref={dropdownScrollRef} className="max-h-[580px] overflow-y-auto p-1 custom-scrollbar">
                {sortedProductResults.map((p: any, idx: number) => (
                  <GlassDropdownItem key={p.id} delay={0.06 + idx * 0.035}>
                    <button onClick={() => addProduct(p)}
                      id={`dd-product-row-${idx}`}
                      dir="rtl"
                      className={`w-full text-start px-2 py-2.5 text-sm rounded-lg flex items-center gap-0 group transition-all border-b border-white/[0.08] last:border-0 ${
                        focusedProductIndex === idx
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : 'hover:bg-blue-500/10 text-text_primary'
                      }`}
                    >

                      {/* Column 1: Code */}
                      <div className="w-[100px] px-2 border-l border-white/[0.08] flex justify-center">
                        <span className="text-[11px] text-text_primary font-numbers">{p.barcode || p.internal_code || '-'}</span>
                      </div>

                      {/* Column 2: Name */}
                      <div className="flex-1 px-4 border-l border-white/[0.08]" dir="auto">
                        <span className="text-[14px] text-text_primary font-black transition-colors">{p.name}</span>
                        {p.name_fr && (
                          <span className="text-xs text-text_muted block font-sans" dir="ltr">{p.name_fr}</span>
                        )}
                      </div>

                      {/* Column 3: Stock */}
                      <div className="w-[90px] px-2 border-l border-white/[0.08] flex justify-center">
                        <span className={`text-[13px] font-bold font-numbers ${p.total_stock <= 0 ? 'text-danger_red' : 'text-success_green'}`}>
                          {parseFloat(Number(p.total_stock).toFixed(3)) || 0}
                        </span>
                      </div>

                      {/* Column 4: Price Retail */}
                      <div className="w-[120px] px-3 flex justify-center border-l border-white/[0.08]">
                        <span className="text-[14px] font-bold font-numbers text-text_primary">
                          {p.retail_price ? p.retail_price.toFixed(2) : '-'}
                        </span>
                      </div>

                      {/* Column 5: Price Wholesale */}
                      <div className="w-[120px] px-3 flex justify-center">
                        <span className="text-[14px] font-black font-numbers text-text_primary">
                          {p.wholesale_price ? p.wholesale_price.toFixed(2) : '-'}
                        </span>
                      </div>

                    </button>
                  </GlassDropdownItem>
                ))}
              </div>
            </GlassDropdown>
          )
        }
        customerSlot={
          <div id="customer-search-container" className="flex w-full gap-4 relative">
            <div className="flex-1 relative">
              <User size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-success_green" />
              <input
                ref={customerSearchRef}
                type="text"
                value={customerSearch}
                onChange={e => {
                  setCustomerSearch(e.target.value);
                  if (e.target.value.length > 0) setShowCustomerDropdown(true);
                }}
                onFocus={() => {
                  if (customerSearch.length > 0 || customerResults.length > 0) {
                    setShowCustomerDropdown(true);
                  }
                }}
                onClick={() => {
                  if (customerSearch.length > 0 || customerResults.length > 0) {
                    setShowCustomerDropdown(true);
                  }
                }}
                dir="auto"
                placeholder={customerName === 'زبون عام' ? `${t('invoice.customer')} (${shortcuts.search_party})` : (customerName || t('invoice.customer_selection_placeholder'))}
                className="w-full bg-background_card border-2 border-border_default rounded-xl pr-10 pl-10 py-3 text-xl font-black text-text_primary placeholder:text-text_primary focus:border-success_green focus:bg-success_green/5 text-start transition-all outline-none"
              />
              {customerId && (
                <button
                  onClick={() => {
                    setCustomerId(null);
                    setCustomerName('زبون عام');
                    setCustomerPhone('');
                    setCustomerBalance(0);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-text_muted hover:text-danger_red p-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Customer Search Dropdown */}
            {showCustomerDropdown && (customerResults.length > 0 || customerSearch.length > 0) && (
              <GlassDropdown show={showCustomerDropdown && (customerResults.length > 0 || customerSearch.length > 0)} accentColor="green" className="w-[60%]">
                {/* Table Header */}
                <div className="flex items-center border-b border-white/[0.08] px-2 py-2 text-[10px] font-black text-text_primary uppercase tracking-wider">
                  <div className="flex-1 px-4 text-right border-l border-white/[0.08]">{t('invoice.column_name')}</div>
                  <div className="w-[180px] px-2 text-right border-l border-white/[0.08]">{t('invoice.location')}</div>
                  <div className="w-[130px] px-2 text-center">{t('invoice.phone_number')}</div>
                </div>

                <div ref={customerDropdownScrollRef} className="max-h-[350px] overflow-y-auto p-1 custom-scrollbar">
                  {customerResults.map((c: any, idx: number) => (
                    <GlassDropdownItem key={c.id} delay={0.06 + idx * 0.035}>
                      <button
                        onClick={() => {
                          setCustomerId(c.id);
                          setCustomerName(c.name);
                          setCustomerPhone(c.phone || '');
                          setCustomerBalance(c.balance || 0);
                          setCustomerSearch('');
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full text-right px-2 py-2.5 text-sm hover:bg-green-500/10 rounded-lg flex items-center gap-0 group transition-all border-b border-white/[0.08] last:border-0"
                      >
                        {/* Name Column */}
                        <div className="flex-1 px-4 border-l border-white/[0.08] truncate">
                          <span className="text-[14px] text-text_primary font-black transition-colors">{c.name}</span>
                        </div>

                        {/* Location Column */}
                        <div className="w-[180px] px-2 border-l border-white/[0.08] truncate">
                          <span className="text-[12px] text-text_primary">{c.address || '---'}</span>
                        </div>

                        {/* Phone Column */}
                        <div className="w-[130px] px-2 text-center">
                          <span className="text-[13px] font-bold font-numbers text-text_primary">{c.phone || '---'}</span>
                        </div>
                      </button>
                    </GlassDropdownItem>
                  ))}

                  {customerResults.length === 0 && customerSearch.length > 0 && (
                    <div className="p-12 text-center">
                      <User size={48} className="mx-auto mb-4 text-text_primary" />
                      <p className="text-text_primary text-base">{t('invoice.customer_not_found')}</p>
                    </div>
                  )}
                </div>
              </GlassDropdown>
            )}
          </div>
        }
        headerCells={
          <>
            {columns.filter(c => !c.hidden).map((col, idx) => (
              <div
                key={col.id}
                draggable={col.id !== 'actions'}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.pageX, y: e.pageY, colId: col.id });
                }}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                style={{ width: col.flex ? 'auto' : col.width, flex: col.flex ? 1 : 'none' }}
                className={`h-full flex items-center relative border-l border-border_default select-none group px-3
                  ${col.align === 'center' ? 'justify-center text-center' : 'justify-start text-right'}
                  ${col.sortable ? 'cursor-pointer hover:bg-background_card' : 'cursor-grab active:cursor-grabbing'}
                  ${draggedColIndex.current === idx ? 'opacity-20 bg-primary_blue/20' : 'opacity-100'}
                  transition-all duration-200
                `}
                onClick={() => col.sortable && col.sortKey && toggleSort(col.sortKey)}
              >
                <span className="text-[13px] font-bold text-text_primary uppercase tracking-wide">
                  {getColumnLabel(col.id, col.label)}
                </span>

                {/* Resizer Handle */}
                {col.id !== 'actions' && (
                  <div
                    className="absolute left-0 top-0 w-2 h-full cursor-col-resize hover:bg-primary_blue/50 active:bg-primary_blue transition-all z-30 group-hover:opacity-100 opacity-0"
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
            ))}
          </>
        }
        summaryActions={
          /* Global Discount Input - Now next to the summary icons */
          <div className="flex items-center gap-2 bg-background_secondary/40 p-1.5 rounded-lg border border-border_default shadow-inner">
            <div className="flex flex-col">
              <label className="text-[10px] text-text_primary uppercase font-bold px-1">{t('invoice.global_discount')}</label>
              <div className="flex items-center">
                <input type="number" min={0} value={globalDiscountValue} onChange={e => setGlobalDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-20 bg-transparent px-1 text-base font-bold font-numbers text-text_primary focus:outline-none" />
                <select value={globalDiscountType} onChange={e => setGlobalDiscountType(e.target.value as DiscountType)}
                  className="bg-transparent text-sm font-bold focus:outline-none appearance-none text-primary_blue px-1 cursor-pointer">
                  <option value="percent">%</option>
                  <option value="amount">{t('invoice.currency_da') || 'د.ج'}</option>
                </select>
              </div>
            </div>
          </div>
        }
        customFooterActions={null}
      >


        {sortedItems.map((item, idx) => (
          <div
            key={item.id}
            className={`pro-row flex items-center px-0 py-0 border-b border-border_default hover:bg-primary_blue/5 transition-colors group ${idx % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg'}`}
            onContextMenu={(e) => {
              e.preventDefault();
              setRowContextMenu({ x: e.pageX, y: e.pageY, itemId: item.id, productId: item.product_id });
            }}
          >
            {columns.filter(c => !c.hidden).map(col => {
              const cellStyle = { width: col.flex ? 'auto' : col.width, flex: col.flex ? 1 : 'none' };
              const commonClasses = `h-11 flex items-center border-l border-border_default px-3 ${col.align === 'center' ? 'justify-center text-center' : 'justify-start text-start'}`;

              switch (col.id) {
                case 'index':
                  return <div key={col.id} style={cellStyle} className={`${commonClasses} text-[11px] font-numbers text-text_primary`}>{idx + 1}</div>;
                case 'barcode':
                  return <div key={col.id} style={cellStyle} className={`${commonClasses} text-[12px] font-medium font-numbers text-text_primary`}>{item.product_barcode_snapshot || '-'}</div>;
                case 'name':
                  return (
                    <div key={col.id} style={cellStyle} dir="auto" className={`${commonClasses} text-[14px] font-bold text-text_primary overflow-hidden text-ellipsis whitespace-nowrap group-hover:text-primary_blue transition-colors flex items-center gap-1.5`}>
                      <span>{item.product_name_snapshot}</span>
                      {item.product_is_active === 0 && (
                        <span className="shrink-0 text-[10px] bg-danger_red/20 text-danger_red font-black px-1.5 py-0.5 rounded border border-danger_red/30">موقوف</span>
                      )}
                    </div>
                  );
                case 'unit':
                  return (
                    <div key={col.id} style={cellStyle} className={`${commonClasses} px-1`}>
                      {item.has_sub_unit ? (
                        <select
                          value={item.unit}
                          onChange={e => updateItemUnit(item.id, e.target.value)}
                          className="bg-background_card border border-border_default rounded px-1.5 py-0.5 text-[12px] font-bold text-center focus:outline-none appearance-none text-text_primary cursor-pointer hover:bg-background_card_hover transition-colors"
                        >
                          <option value={item.unit_name || 'حبة'}>{item.unit_name || 'حبة'}</option>
                          <option value="علبة">علبة</option>
                        </select>
                      ) : (
                        <span className="text-[12px] font-bold text-text_secondary">
                          {item.unit_name || item.unit || 'حبة'}
                        </span>
                      )}
                    </div>
                  );
                case 'price':
                  return (
                    <div key={col.id} style={cellStyle} className={commonClasses}>
                      <input type="number" min={0} value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        readOnly={!isHQ}
                        className={`w-full bg-transparent border-b border-primary_blue/40 px-2 py-0.5 text-[15px] text-center font-bold font-numbers text-text_primary transition-all ${isHQ ? 'focus:border-primary_blue focus:border-b-2 focus:bg-primary_blue/5 focus:outline-none' : 'opacity-80 cursor-not-allowed select-none border-transparent shadow-none'}`} />
                    </div>
                  );
                case 'discount':
                  return (
                    <div key={col.id} style={cellStyle} className={`${commonClasses} px-1 gap-1`}>
                      <input type="number" min={0} step={1} value={item.item_discount_value} onChange={e => updateItem(item.id, 'item_discount_value', parseFloat(e.target.value) || 0)}
                        readOnly={!isHQ}
                        className={`w-12 bg-transparent border-b border-primary_blue/40 px-1 py-0.5 text-[15px] text-center font-bold font-numbers text-amber-500 transition-all ${isHQ ? 'focus:border-primary_blue focus:border-b-2 focus:bg-primary_blue/5 focus:outline-none' : 'opacity-80 cursor-not-allowed border-transparent shadow-none'}`} />
                      <select value={item.item_discount_type} onChange={e => updateItem(item.id, 'item_discount_type', e.target.value as 'percent' | 'amount')}
                        disabled={!isHQ}
                        className={`bg-transparent border-none text-[11px] font-bold text-center focus:outline-none appearance-none text-text_primary transition-colors ${isHQ ? 'hover:text-text_primary cursor-pointer' : 'opacity-80 cursor-not-allowed'}`}>
                        <option value="percent">%</option>
                        <option value="amount">{t('invoice.currency_da') || 'د.ج'}</option>
                      </select>
                    </div>
                  );
                case 'stock':
                  return (
                    <div key={col.id} style={cellStyle} className={commonClasses}>
                      <span className={`text-[11px] font-bold font-numbers ${item.stock_available <= item.quantity ? 'text-danger_red/70' : 'text-text_primary'}`}>
                        {parseFloat(Number(item.stock_available).toFixed(3))}
                      </span>
                    </div>
                  );
                case 'quantity':
                  return (
                    <div key={col.id} style={cellStyle} className={commonClasses}>
                      <input type="number" min={0.01} step={1} value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent border-b border-primary_blue/40 px-2 py-0.5 text-[15px] text-center font-bold font-numbers text-text_primary focus:border-primary_blue focus:border-b-2 focus:bg-primary_blue/5 focus:outline-none transition-all" />
                    </div>
                  );
                case 'total':
                  return (
                    <div key={col.id} style={cellStyle} className={`${commonClasses}`}>
                      <span className="text-[14px] font-bold font-numbers text-emerald-400/90">
                        {item.total.toFixed(2)}
                      </span>
                    </div>
                  );
                case 'actions':
                  return (
                    <div key={col.id} style={cellStyle} className="h-8 flex items-center justify-center">
                      <button onClick={() => removeItem(item.id)} className="p-1.5 text-text_primary hover:text-danger_red hover:bg-danger_red/10 rounded-full transition-all active:scale-90"><Trash2 size={14} /></button>
                    </div>
                  );
                default: return null;
              }
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
        {items.length === 0 && (
          <div className="p-8 text-center text-text_muted text-sm">
            {`${t('invoice.empty_invoice_message')} (${shortcuts.search_product})`}
          </div>
        )}
      </ProInvoiceLayout>

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div
          className="fixed bg-background_card border border-border_default shadow-2xl rounded-xl z-[9999] overflow-hidden min-w-[220px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pricing Selector (Only if clicked on price) */}
          {contextMenu.colId === 'price' && (
            <div className="bg-primary_blue/5 border-b border-border_default pb-1">
              <div className="px-4 py-2 text-[11px] text-primary_blue uppercase font-black bg-primary_blue/10 mb-1">{t('invoice.pricing_current')}</div>
              {ALL_SALE_TYPES.map(type => (
                <button
                  key={type.value}
                  className={`w-full text-right px-4 py-2.5 hover:bg-primary_blue/20 text-sm font-bold flex items-center gap-2 ${saleType === type.value ? 'text-primary_blue' : 'text-text_primary'}`}
                  onClick={() => {
                    handleSaleTypeChange(type.value);
                    setContextMenu(null);
                  }}
                >
                  <div className={`w-2 h-2 rounded-full ${saleType === type.value ? 'bg-primary_blue shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-white/20'}`} />
                  {type.value === 'retail' ? t('invoice.sale_type_retail') : t('invoice.sale_type_wholesale')}
                </button>
              ))}
            </div>
          )}

          {/* Hide Column */}
          {contextMenu.colId !== 'actions' && (
            <button
              className="w-full text-right px-4 py-3 hover:bg-background_card text-sm text-text_primary font-bold border-b border-border_default flex items-center gap-2 group transition-colors"
              onClick={() => {
                setColumns(prev => prev.map(c => c.id === contextMenu.colId ? { ...c, hidden: true } : c));
                setContextMenu(null);
              }}
            >
              <EyeOff size={16} className="text-text_primary group-hover:text-danger_red transition-colors" />
              {t('invoice.hide_column')}
            </button>
          )}

          {/* Show Hidden Columns (only if there are any) */}
          {columns.some(c => c.hidden) && (
            <div className="py-1">
              <div className="px-4 py-2 text-[10px] text-text_primary uppercase font-black">{t('invoice.hidden_columns_title')}</div>
              {columns.filter(c => c.hidden).map(c => (
                <button
                  key={c.id}
                  className="w-full text-right px-4 py-2 hover:bg-background_card text-sm text-emerald-400 font-bold flex items-center gap-2 group"
                  onClick={() => {
                    setColumns(prev => prev.map(col => col.id === c.id ? { ...col, hidden: false } : col));
                  }}
                >
                  <Eye size={16} className="text-emerald-400/50 group-hover:text-emerald-400 transition-colors" />
                  {t('invoice.show_hidden_column', { name: getColumnLabel(c.id, c.label) })}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* OPEN INVOICE MODAL */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setShowOpenModal(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-background_secondary/85 backdrop-blur-2xl border border-white/15 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/40 p-6 w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-4 border-b border-border_default mb-4 shrink-0">
              <h2 className="text-xl font-bold text-text_primary flex items-center gap-2">
                <FolderOpen className="text-primary_blue" size={24} />
                {t('invoice.open_previous_invoice')}
              </h2>
              <button onClick={() => setShowOpenModal(false)} className="p-2 text-text_muted hover:text-danger_red bg-background_card rounded-full transition-all">
                <XCircle size={20} />
              </button>
            </div>

            <div className="flex gap-4 mb-6 shrink-0 items-center">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-text_muted" />
                </div>
                <input
                  type="text"
                  placeholder={t('invoice.search_invoice_placeholder')}
                  value={openModalSearch}
                  onChange={(e) => setOpenModalSearch(e.target.value)}
                  dir="auto"
                  className="w-full bg-background_card border border-border_default rounded-xl pr-10 pl-4 py-3 text-sm text-text_primary focus:border-primary_blue focus:outline-none text-start"
                />
              </div>
              <div className="w-48 relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-text_muted" />
                </div>
                <input
                  type="date"
                  value={openModalDate}
                  disabled={openModalOnlyDrafts}
                  onChange={(e) => setOpenModalDate(e.target.value)}
                  className="w-full bg-background_card border border-border_default rounded-xl pr-10 pl-4 py-3 text-sm text-text_primary focus:border-primary_blue focus:outline-none font-numbers disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
              <button
                type="button"
                onClick={() => setOpenModalOnlyDrafts(!openModalOnlyDrafts)}
                className={`flex items-center gap-2 px-5 py-3 h-[46px] rounded-xl border-2 font-bold text-sm transition-all select-none ${
                  openModalOnlyDrafts
                    ? 'bg-warning_amber/20 text-warning_amber border-warning_amber/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                    : 'bg-background_card text-text_secondary border-border_default hover:text-text_primary hover:bg-background_card_hover'
                }`}
              >
                <FileText size={16} />
                <span>عرض المسودات فقط</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[400px]">
              {openModalLoading ? (
                <div className="h-full flex items-center justify-center text-text_muted">{t('common.loading')}</div>
              ) : openModalInvoices.length > 0 ? (
                <div className="grid gap-3">
                  {openModalInvoices.map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => handleOpenInvoice(inv.id)}
                      className="flex items-center justify-between p-4 bg-background_card border border-border_default rounded-xl hover:bg-background_card_hover hover:border-primary_blue/50 transition-all text-right group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary_blue/10 flex items-center justify-center text-primary_blue">
                          <FileText size={20} />
                        </div>
                        <div>
                          <div className={`font-bold transition-colors text-lg ${inv.status === 'cancelled' ? 'text-text_muted line-through' : 'text-text_primary group-hover:text-primary_blue'}`}>
                            {inv.invoice_number}
                          </div>
                          <div className="text-sm text-text_muted mt-1">
                            {inv.customer_name === 'زبون عام' ? t('invoice.customer') : (inv.customer_name || t('invoice.customer'))}
                          </div>
                        </div>
                      </div>

                      <div className="text-left">
                        <div className={`font-black font-numbers text-xl ${inv.remaining > 0 ? 'text-danger_red drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]'}`}>
                          {inv.total.toFixed(2)} {t('invoice.currency_da') || 'د.ج'}
                        </div>
                        <div className="text-xs text-text_muted mt-2 flex flex-col items-end gap-1.5">
                          <span>{inv.time}</span>
                          {inv.status === 'cancelled' ? (
                            <span className="text-orange-400 font-bold bg-orange-400/10 px-2 py-0.5 rounded-md text-[10px] border border-orange-400/20">{t('invoice.status_cancelled')}</span>
                          ) : inv.remaining > 0 ? (
                            <span className="text-danger_red/90 font-bold bg-danger_red/10 px-2 py-0.5 rounded-md text-[10px] border border-danger_red/20">{t('invoice.remaining')} (باقي: {inv.remaining.toFixed(2)})</span>
                          ) : (
                            <span className="text-emerald-400/90 font-bold bg-emerald-400/10 px-2 py-0.5 rounded-md text-[10px] border border-emerald-400/20">{t('invoice.status_confirmed')}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-text_muted">
                  <FolderOpen size={48} className="opacity-20 mb-4" />
                  <p>{t('common.no_data')}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
      <AdminPinModal
        isOpen={showPinModal}
        onClose={() => { setShowPinModal(false); setPinAction(null); }}
        onSuccess={handlePinSuccess}
        actionDescription={
          pinAction === 'cancel'
            ? "إلغاء فاتورة مبيعات مؤكدة يتطلب صلاحية المدير"
            : "منح تخفيض يتجاوز 15% يتطلب موافقة المدير"
        }
      />
      {rowContextMenu && (
        <div
          className="fixed bg-background_secondary/85 dark:bg-background_secondary/85 backdrop-blur-2xl border border-white/15 dark:border-white/10 shadow-2xl rounded-xl p-1 z-[999] min-w-[160px] animate-in fade-in zoom-in-95 duration-100 text-right"
          style={{ top: rowContextMenu.y, left: rowContextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-text_muted border-b border-border_default">{t('invoice.row_options')}</div>
          <button
            onClick={() => {
              const activeItem = items.find(i => i.id === rowContextMenu.itemId);
              setPhotoModalProduct({
                id: rowContextMenu.productId,
                name: activeItem?.product_name_snapshot || 'منتج',
                barcode: activeItem?.product_barcode_snapshot || undefined
              });
              setShowPhotoModal(true);
              setRowContextMenu(null);
            }}
            className="w-full text-right px-3 py-2 text-sm text-text_primary hover:bg-text_primary/10 rounded-lg transition-colors flex items-center justify-between animate-pulse-subtle"
          >
            <span>عرض صور المنتج</span>
            <ImageIcon size={14} className="text-text_muted" />
          </button>
          <div className="border-t border-border_default my-1" />
          <button
            onClick={() => {
              updateItemUnit(rowContextMenu.itemId, 'كيس');
              setRowContextMenu(null);
            }}
            className="w-full text-right px-3 py-2 text-sm text-text_primary hover:bg-text_primary/10 rounded-lg transition-colors flex items-center justify-between"
          >
            <span>{t('invoice.convert_to_bag')}</span>
            <span className="text-xs text-text_muted font-numbers font-medium">كيس</span>
          </button>
          <button
            onClick={() => {
              updateItemUnit(rowContextMenu.itemId, 'علبة');
              setRowContextMenu(null);
            }}
            className="w-full text-right px-3 py-2 text-sm text-text_primary hover:bg-text_primary/10 rounded-lg transition-colors flex items-center justify-between"
          >
            <span>{t('invoice.convert_to_box')}</span>
            <span className="text-xs text-text_muted font-numbers font-medium">علبة</span>
          </button>
          <div className="border-t border-border_default my-1" />
          <button
            onClick={() => {
              removeItem(rowContextMenu.itemId);
              setRowContextMenu(null);
            }}
            className="w-full text-right px-3 py-2 text-sm text-danger_red hover:bg-danger_red/10 rounded-lg transition-colors flex items-center justify-between mb-1"
          >
            <span>{t('invoice.delete_product')}</span>
            <Trash2 size={14} className="text-danger_red" />
          </button>

          <div className="border-t border-border_default mt-1 pt-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-primary_blue uppercase flex items-center gap-1">
              <Car size={12} /> {t('invoice.compatibilities')}
            </div>
            <div className="px-2 pb-1 max-w-[200px]">
              <FitmentsBadges productId={rowContextMenu.productId} mode="view" compact />
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

      {/* Advanced Product Finder Modal */}
      <AdvancedProductFinder
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onSelectProduct={addProduct}
        mode="sale"
      />

      {showPrintPreview && (
        <PrintPreviewModal
          isOpen={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          documentType="sales"
          invoiceData={{
            invoice_number: invoiceNumber,
            date: customDate || new Date().toLocaleDateString('ar-DZ'),
            time: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
            customer_name: customerName,
            customer_phone: customerPhone,
            items: items,
            subtotal,
            tax_amount: taxAmount,
            tax_percent: taxPercent,
            total,
            paid: paidAmount,
            remaining,
            notes
          }}
        />
      )}

    </div>
  );
}
