import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

export type SaleType = 'retail' | 'wholesale';
export type DiscountType = 'percent' | 'amount';

export interface InvoiceItem {
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
  product_is_active?: number;
}

export interface Workspace {
  id: string;
  snapshotId: string | null;
  lastActivity: number;
  isDirty: boolean;

  // POS invoice state
  currentInvoiceId: number | null;
  invoiceNumber: string;
  saleType: SaleType;
  customerId: number | null;
  customerName: string;
  customerPhone: string;
  customerBalance: number;
  paymentMethod: 'cash' | 'credit' | 'mixed';
  notes: string;
  items: InvoiceItem[];
  globalDiscountType: DiscountType;
  globalDiscountValue: number;
  taxPercent: number;
  paidAmount: number;
  isCancelled: boolean;
  customDate: string | null;
}

interface WorkspaceState {
  workspaces: Record<string, Workspace>;
  activeId: string | null;
  isSwitcherOpen: boolean;

  createWorkspace: () => string | null;
  removeWorkspace: (id: string) => void;
  switchWorkspace: (id: string) => void;
  updateActiveWorkspace: (workspaceId: string, data: Partial<Omit<Workspace, 'id' | 'snapshotId' | 'lastActivity'>>) => void;
  setSnapshotId: (workspaceId: string, snapshotId: string) => void;
  setSwitcherOpen: (open: boolean) => void;
  toggleSwitcher: () => void;
  clearAllWorkspaces: () => void;
  onBeforeOpenSwitcher: (() => Promise<void>) | null;
  setOnBeforeOpen: (callback: (() => Promise<void>) | null) => void;
}

const DEFAULT_WORKSPACE_STATE = (id: string): Workspace => ({
  id,
  snapshotId: null,
  lastActivity: Date.now(),
  isDirty: false,

  currentInvoiceId: null,
  // توليد رقم فاتورة متجدد دائماً عند الإنشاء
  invoiceNumber: `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(Math.random() * 900000) + 100000}`,
  saleType: 'retail',
  customerId: null,
  customerName: 'زبون عام',
  customerPhone: '',
  customerBalance: 0,
  paymentMethod: 'cash',
  notes: '',
  items: [],
  globalDiscountType: 'percent',
  globalDiscountValue: 0,
  taxPercent: 0,
  paidAmount: 0,
  isCancelled: false,
  customDate: null,
});

export const useWorkspaceStore = create<WorkspaceState>()((set, get) => {
  const defaultId = `workspace-${Date.now()}`;
  
  const getInitialState = () => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('bolbul-invoice-workspaces');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.workspaces && Object.keys(parsed.workspaces).length > 0) {
            return {
              workspaces: parsed.workspaces,
              activeId: parsed.activeId || Object.keys(parsed.workspaces)[0],
              isSwitcherOpen: false,
            };
          }
        } catch (e) {
          console.error('Failed to parse bolbul-invoice-workspaces:', e);
        }
      }
    }
    return {
      workspaces: { [defaultId]: DEFAULT_WORKSPACE_STATE(defaultId) },
      activeId: defaultId,
      isSwitcherOpen: false,
    };
  };

  const initialState = getInitialState();

  const persistState = (workspaces: Record<string, Workspace>, activeId: string | null) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bolbul-invoice-workspaces', JSON.stringify({ workspaces, activeId }));
    }
  };

  return {
    ...initialState,

    createWorkspace: () => {
      const state = get();
      if (Object.keys(state.workspaces).length >= 4) return null;

      const newId = `workspace-${Date.now()}-${Math.random()}`;
      const newWorkspace = DEFAULT_WORKSPACE_STATE(newId);
      
      const updatedWorkspaces = {
        ...state.workspaces,
        [newId]: newWorkspace,
      };

      set({ workspaces: updatedWorkspaces, activeId: newId });
      persistState(updatedWorkspaces, newId);
      return newId;
    },

    removeWorkspace: (id: string) => {
      const state = get();
      if (Object.keys(state.workspaces).length <= 1) {
        const updatedWorkspaces = { [id]: DEFAULT_WORKSPACE_STATE(id) };
        set({ workspaces: updatedWorkspaces });
        persistState(updatedWorkspaces, id);
        return;
      }

      const { [id]: _, ...updatedWorkspaces } = state.workspaces;
      let nextActiveId = state.activeId === id ? Object.keys(updatedWorkspaces)[0] : state.activeId;

      set({ workspaces: updatedWorkspaces, activeId: nextActiveId });
      persistState(updatedWorkspaces, nextActiveId);
    },

    switchWorkspace: (id: string) => {
      set({ activeId: id });
    },

    updateActiveWorkspace: (workspaceId: string, data: Partial<Omit<Workspace, 'id' | 'snapshotId' | 'lastActivity'>>) => {
      set(state => {
        const workspace = state.workspaces[workspaceId];
        if (!workspace) return state;
        const updatedWorkspaces = {
          ...state.workspaces,
          [workspaceId]: { ...workspace, ...data, lastActivity: Date.now(), isDirty: true }
        };
        persistState(updatedWorkspaces, state.activeId);
        return { workspaces: updatedWorkspaces };
      });
    },

    setSnapshotId: (workspaceId: string, snapshotId: string) => {
      set(state => {
        const updatedWorkspaces = { 
          ...state.workspaces, 
          [workspaceId]: { ...state.workspaces[workspaceId], snapshotId } 
        };
        persistState(updatedWorkspaces, state.activeId);
        return { workspaces: updatedWorkspaces };
      });
    },

    setSwitcherOpen: async (open: boolean) => {
      if (open) {
        const callback = get().onBeforeOpenSwitcher;
        if (callback) {
          try {
            await callback();
          } catch (e) {
            console.error('onBeforeOpenSwitcher failed', e);
          }
        }
      }
      set({ isSwitcherOpen: open });
    },
    toggleSwitcher: async () => {
      const open = !get().isSwitcherOpen;
      if (open) {
        const callback = get().onBeforeOpenSwitcher;
        if (callback) {
          try {
            await callback();
          } catch (e) {
            console.error('onBeforeOpenSwitcher failed', e);
          }
        }
      }
      set({ isSwitcherOpen: open });
    },
    clearAllWorkspaces: () => {
      const defaultId = `workspace-${Date.now()}`;
      const defaultWorkspaces = { [defaultId]: DEFAULT_WORKSPACE_STATE(defaultId) };
      set({ workspaces: defaultWorkspaces, activeId: defaultId, isSwitcherOpen: false });
      persistState(defaultWorkspaces, defaultId);
    },
    onBeforeOpenSwitcher: null as (() => Promise<void>) | null,
    setOnBeforeOpen: (callback: (() => Promise<void>) | null) => set({ onBeforeOpenSwitcher: callback }),
  };
});

// Snapshot helper functions (using localStorage for simplicity/portability)
const SNAPSHOT_PREFIX = 'snapshot-';

export const getSnapshotFromDB = async (snapshotId: string): Promise<string | null> => {
  if (typeof localStorage === 'undefined') return null;
  const data = localStorage.getItem(`${SNAPSHOT_PREFIX}${snapshotId}`);
  return data || null;
};

export const saveSnapshotToDB = async (snapshotId: string, dataUrl: string): Promise<void> => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`${SNAPSHOT_PREFIX}${snapshotId}`, dataUrl);
  }
};

export const deleteSnapshotFromDB = async (snapshotId: string): Promise<void> => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(`${SNAPSHOT_PREFIX}${snapshotId}`);
  }
};
