/**
 * Auth Store — Zustand store for authentication state.
 * بدون JWT - جلسة محلية فقط
 */
import { create } from 'zustand';

interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'owner' | 'manager' | 'accountant' | 'cashier' | 'storekeeper' | 'employee';
  is_active: boolean;
  pin_code?: string;
  avatar?: string;
  color?: string;
  permissions?: string | null;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showSwitchOverlay: boolean;

  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginByPin: (userId: number, pin: string) => Promise<{ success: boolean; error?: string }>;
  loginDirect: (userId: number) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUser: (user: User) => void;
  checkSession: () => void;
  setShowSwitchOverlay: (show: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  showSwitchOverlay: false,

  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const result = await window.electronAPI.invoke('auth:login', username, password) as {
        success: boolean;
        user?: User;
        error?: string;
      };

      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
        });
        localStorage.setItem('spare-parts-erp-user', JSON.stringify(result.user));
        return { success: true };
      } else {
        set({ isLoading: false });
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('[AuthStore] Login error:', error);
      set({ isLoading: false });
      return { success: false, error: 'تعذر الاتصال بالخادم' };
    }
  },

  loginByPin: async (userId: number, pin: string) => {
    set({ isLoading: true });
    try {
      const result = await window.electronAPI.invoke('auth:loginByPin', userId, pin) as {
        success: boolean;
        user?: User;
        error?: string;
      };

      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          showSwitchOverlay: false,
        });
        localStorage.setItem('spare-parts-erp-user', JSON.stringify(result.user));
        return { success: true };
      } else {
        set({ isLoading: false });
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('[AuthStore] Pin Login error:', error);
      set({ isLoading: false });
      return { success: false, error: 'تعذر الاتصال بالخادم' };
    }
  },

  loginDirect: async (userId: number) => {
    set({ isLoading: true });
    try {
      const result = await window.electronAPI.invoke('auth:loginDirect', userId) as {
        success: boolean;
        user?: User;
        error?: string;
      };

      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          showSwitchOverlay: false,
        });
        localStorage.setItem('spare-parts-erp-user', JSON.stringify(result.user));
        return { success: true };
      } else {
        set({ isLoading: false });
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('[AuthStore] Direct Login error:', error);
      set({ isLoading: false });
      return { success: false, error: 'تعذر الاتصال بالخادم' };
    }
  },


  logout: async () => {
    // إعادة النافذة لحجم شاشة الدخول الصغيرة
    try { await window.electronAPI.invoke('window:shrink'); } catch {}
    await window.electronAPI.invoke('auth:logout');
    set({ user: null, isAuthenticated: false, showSwitchOverlay: false });
    localStorage.removeItem('spare-parts-erp-user');
  },

  setUser: (user: User) => {
    set({ user, isAuthenticated: true });
    localStorage.setItem('spare-parts-erp-user', JSON.stringify(user));
  },

  setShowSwitchOverlay: (show: boolean) => {
    set({ showSwitchOverlay: show });
  },

  checkSession: async () => {
    set({ isLoading: true });
    try {
      const result = await window.electronAPI.invoke('auth:checkSession') as {
        success: boolean;
        user?: User;
      };

      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
        });
        localStorage.setItem('spare-parts-erp-user', JSON.stringify(result.user));
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false, showSwitchOverlay: false });
        localStorage.removeItem('spare-parts-erp-user');
      }
    } catch (error) {
      console.error('[AuthStore] Session check failed:', error);
      set({ isLoading: false });
    }
  },
}));
