/**
 * AuthProvider — Handles session restoration on startup.
 */
import React, { useEffect } from 'react';
import { useAuthStore } from '../../../store/auth.store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { checkSession, logout, isAuthenticated } = useAuthStore((state) => ({
    checkSession: state.checkSession,
    logout: state.logout,
    isAuthenticated: state.isAuthenticated
  }));

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Auto-logout after 30m inactivity
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log('[Auth] Inactivity timeout reached. Logging out...');
        logout();
      }, 30 * 60 * 1000); // 30 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((name) => document.addEventListener(name, resetTimer));

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((name) => document.removeEventListener(name, resetTimer));
    };
  }, [isAuthenticated, logout]);

  return <>{children}</>;
}
