/**
 * App.tsx - SparePartsERP
 * بدون فروع، بدون logistics، بدون sync
 */
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, lazy, Suspense, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import MainLayout from './shared/components/layout/MainLayout';
import ErrorBoundary from './shared/components/ui/ErrorBoundary';
import LoadingSpinner from './shared/components/ui/LoadingSpinner';
import { Toaster } from 'sonner';
import PinLockOverlay from './features/auth/PinLockOverlay';
import QuickUserSwitcherOverlay from './features/auth/QuickUserSwitcherOverlay';
import { usePinStore } from './store/pin.store';

// Lazy load pages
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const InventoryPage = lazy(() => import('./features/inventory/InventoryPage'));
const LowStockPage = lazy(() => import('./features/inventory/LowStockPage'));
const CustomersPage = lazy(() => import('./features/parties/CustomersPage'));
const SuppliersPage = lazy(() => import('./features/parties/SuppliersPage'));
const SalesPage = lazy(() => import('./features/sales/SalesPage'));
const POSPage = lazy(() => import('./features/sales/POSPage'));
const PurchasesPage = lazy(() => import('./features/purchases/PurchasesPage'));
const PurchaseFormPage = lazy(() => import('./features/purchases/PurchaseFormPage'));
const ExpensesPage = lazy(() => import('./features/expenses/ExpensesPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const AccountingPage = lazy(() => import('./features/accounting/AccountingPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <LoadingSpinner />
    </div>
  );
}

import { useShortcutStore } from './store/shortcutStore';

export default function App() {
  const navigate = useNavigate();
  const { shortcuts } = useShortcutStore();

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

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true');
      
      // If user is typing in a field, don't execute single key redirects (F1-F12 are safe)
      const isFunctionKey = /^f\d+$/i.test(e.key);
      const isCtrlOrAltKey = e.ctrlKey || e.altKey;
      if (isTyping && !isFunctionKey && !isCtrlOrAltKey) {
        return;
      }

      if (matches(e, shortcuts.goto_pos)) { e.preventDefault(); navigate('/pos'); }
      if (matches(e, shortcuts.goto_purchase)) { e.preventDefault(); navigate('/purchases/new'); }
      
      // Keep other navigation defaults for simplicity or make them safe
      if (e.key === 'F8') { e.preventDefault(); navigate('/inventory'); }
      if (e.key === 'F9') { e.preventDefault(); navigate('/dashboard'); }
      if (e.key === 'F10') { e.preventDefault(); navigate('/settings'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, shortcuts]);

  const { isLocked, setLocked, isPinEnabled, inactivityLockEnabled, inactivityTimeout } = usePinStore();
  const { isAuthenticated } = useAuth();

  // Track if user was already authenticated on initial component mount to distinguish reload vs fresh login
  const wasAuthenticatedOnMount = useRef(isAuthenticated);

  // Lock on startup/reload if PIN is enabled and authenticated on mount
  useEffect(() => {
    if (isPinEnabled && isAuthenticated && wasAuthenticatedOnMount.current) {
      setLocked(true);
    }
    // Disable startup lock check on any subsequent auth transitions (so fresh login doesn't lock)
    wasAuthenticatedOnMount.current = false;
  }, [isPinEnabled, isAuthenticated, setLocked]);

  // Inactivity Lock Tracker (OFF by default, only active when user explicitly enables both PIN & Inactivity lock)
  useEffect(() => {
    if (!isAuthenticated || !isPinEnabled || !inactivityLockEnabled || isLocked) {
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setLocked(true);
      }, inactivityTimeout * 60 * 1000);
    };

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'scroll', 'click'];
    
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, isPinEnabled, inactivityLockEnabled, inactivityTimeout, isLocked, setLocked]);

  return (
    <ErrorBoundary>
      <PinLockOverlay />
      <QuickUserSwitcherOverlay />
      <Toaster richColors position="top-center" />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="*" element={
                    <MainLayout>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route path="/" element={<DashboardPage />} />
                          <Route path="/dashboard" element={<DashboardPage />} />
                          <Route path="/pos" element={<POSPage />} />
                          <Route path="/inventory" element={<InventoryPage />} />
                          <Route path="/low-stock" element={<LowStockPage />} />
                          <Route path="/customers" element={<CustomersPage />} />
                          <Route path="/suppliers" element={<SuppliersPage />} />
                          <Route path="/sales" element={<SalesPage />} />
                          <Route path="/purchases" element={<PurchasesPage />} />
                          <Route path="/purchases/new" element={<PurchaseFormPage />} />
                          <Route path="/purchases/:id" element={<PurchaseFormPage />} />
                          <Route path="/expenses" element={<ExpensesPage />} />
                          <Route path="/accounting" element={<AccountingPage />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          {/* باقي الصفحات ستُضاف تدريجياً */}
                          <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                      </Suspense>
                    </MainLayout>
                  } />
                </Routes>
              </Suspense>
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
