/**
 * App Store — Global application state.
 * بدون نظام فروع - محل واحد فقط
 */
import { create } from 'zustand';

import { persist } from 'zustand/middleware';

type Language = 'ar' | 'fr';
type Direction = 'rtl' | 'ltr';

type Theme = 'light' | 'dark';

interface AppState {
  language: Language;
  direction: Direction;
  sidebarCollapsed: boolean;
  theme: Theme;
  enableSidebarHover: boolean;

  setLanguage: (lang: Language) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setEnableSidebarHover: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: 'ar',
      direction: 'rtl',
      sidebarCollapsed: true,
      theme: 'dark', // default
      enableSidebarHover: true,

      setLanguage: (lang: Language) => {
        const dir: Direction = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.dir = dir;
        document.documentElement.lang = lang;
        set({ language: lang, direction: dir });
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === 'dark' ? 'light' : 'dark';
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { theme: newTheme };
        });
      },

      setTheme: (theme: Theme) => {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        set({ theme });
      },

      setEnableSidebarHover: (enabled: boolean) => {
        set({ enableSidebarHover: enabled });
      },
    }),
    {
      name: 'spare-parts-erp-settings', // localStorage key
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        language: state.language,
        direction: state.direction,
        enableSidebarHover: state.enableSidebarHover,
      }),
    }
  )
);
