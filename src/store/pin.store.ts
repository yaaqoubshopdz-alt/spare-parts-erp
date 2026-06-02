import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PinState {
  isLocked: boolean;
  isPinEnabled: boolean;
  inactivityLockEnabled: boolean;
  inactivityTimeout: number; // in minutes, default 5
  failedAttemptsCount: number;
  hasSecurityAlert: boolean;

  setLocked: (locked: boolean) => void;
  setPinEnabled: (enabled: boolean) => void;
  setInactivityLockEnabled: (enabled: boolean) => void;
  setInactivityTimeout: (minutes: number) => void;
  incrementFailedAttempts: () => void;
  resetFailedAttempts: () => void;
  setSecurityAlert: (active: boolean) => void;
}

export const usePinStore = create<PinState>()(
  persist(
    (set) => ({
      isLocked: false,
      isPinEnabled: false, // OFF by default
      inactivityLockEnabled: false, // OFF by default
      inactivityTimeout: 5,
      failedAttemptsCount: 0,
      hasSecurityAlert: false,

      setLocked: (locked) => set({ isLocked: locked }),
      setPinEnabled: (enabled) => set({ isPinEnabled: enabled }),
      setInactivityLockEnabled: (enabled) => set({ inactivityLockEnabled: enabled }),
      setInactivityTimeout: (minutes) => set({ inactivityTimeout: minutes }),
      incrementFailedAttempts: () => set((state) => {
        const nextCount = state.failedAttemptsCount + 1;
        const triggerAlert = nextCount >= 3;
        return {
          failedAttemptsCount: nextCount,
          hasSecurityAlert: triggerAlert ? true : state.hasSecurityAlert
        };
      }),
      resetFailedAttempts: () => set({ failedAttemptsCount: 0 }),
      setSecurityAlert: (active) => set({ hasSecurityAlert: active }),
    }),
    {
      name: 'spare-parts-erp-pin-lock', // Key in localStorage
      partialize: (state) => ({
        isPinEnabled: state.isPinEnabled,
        inactivityLockEnabled: state.inactivityLockEnabled,
        inactivityTimeout: state.inactivityTimeout,
        failedAttemptsCount: state.failedAttemptsCount,
        hasSecurityAlert: state.hasSecurityAlert,
      }),
    }
  )
);
