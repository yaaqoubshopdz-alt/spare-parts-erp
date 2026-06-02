import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ShortcutMapping {
  new_invoice: string;        // default: F1
  search_product: string;     // default: F2
  search_party: string;       // default: F3
  print_invoice: string;      // default: F4
  save_invoice: string;       // default: F5
  cancel_invoice: string;     // default: F9
  advanced_search: string;    // default: F8
  add_product_modal: string;  // default: Ctrl+F2
  open_invoice: string;       // default: F7
  goto_pos: string;           // default: F6
  goto_purchase: string;      // default: F7
}

interface ShortcutState {
  shortcuts: ShortcutMapping;
  setShortcut: (action: keyof ShortcutMapping, key: string) => void;
  resetToDefaults: () => void;
}

export const DEFAULT_SHORTCUTS: ShortcutMapping = {
  new_invoice: 'F1',
  search_product: 'F2',
  search_party: 'F3',
  print_invoice: 'F4',
  save_invoice: 'F5',
  cancel_invoice: 'F9',
  advanced_search: 'F8',
  add_product_modal: 'Ctrl+F2',
  open_invoice: 'F7',
  goto_pos: 'F6',
  goto_purchase: 'F7',
};

export const useShortcutStore = create<ShortcutState>()(
  persist(
    (set) => ({
      shortcuts: DEFAULT_SHORTCUTS,
      setShortcut: (action, key) =>
        set((state) => ({
          shortcuts: { ...state.shortcuts, [action]: key },
        })),
      resetToDefaults: () => set({ shortcuts: DEFAULT_SHORTCUTS }),
    }),
    {
      name: 'spare-parts-erp-shortcuts', // localStorage key
      merge: (persistedState: any, currentState) => {
        return {
          ...currentState,
          ...persistedState,
          shortcuts: {
            ...DEFAULT_SHORTCUTS,
            ...(persistedState?.shortcuts || {}),
          },
        };
      },
    }
  )
);
