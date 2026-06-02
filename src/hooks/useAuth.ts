/**
 * useAuth hook — convenience wrapper around auth store.
 * بدون token
 */
import { useAuthStore } from '../store/auth.store';

const PERMISSIONS_MATRIX: Record<string, string[]> = {
  owner: [
    'view_dashboard', 'view_sales', 'view_sale', 'create_sales', 'create_sale', 'edit_sale', 'cancel_sale',
    'view_purchases', 'view_purchase', 'create_purchases', 'create_purchase', 'cancel_purchase',
    'view_inventory', 'adjust_stock',
    'view_customers', 'manage_customers',
    'view_suppliers', 'manage_suppliers',
    'view_returns', 'create_return', 'confirm_return',
    'view_cashbox', 'close_cashbox',
    'view_finance', 'view_profits', 'view_prices',
    'view_reports', 'view_settings', 'manage_users',
    'view_vehicles', 'manage_vehicles',
    'view_batches', 'manage_batches',
    'cancel_documents',
  ],
  manager: [
    'view_dashboard', 'view_sales', 'view_sale', 'create_sales', 'create_sale', 'edit_sale', 'cancel_sale',
    'view_purchases', 'view_purchase', 'create_purchases', 'create_purchase', 'cancel_purchase',
    'view_inventory', 'adjust_stock',
    'view_customers', 'manage_customers',
    'view_suppliers', 'manage_suppliers',
    'view_returns', 'create_return', 'confirm_return',
    'view_cashbox', 'close_cashbox',
    'view_finance', 'view_prices',
    'view_reports',
    'view_vehicles', 'manage_vehicles',
    'view_batches', 'manage_batches',
    'cancel_documents',
  ],
  accountant: [
    'view_dashboard', 'view_sales', 'view_sale',
    'view_purchases', 'view_purchase',
    'view_customers', 'manage_customers',
    'view_suppliers', 'manage_suppliers',
    'view_finance', 'view_prices',
    'view_reports',
    'view_cashbox',
  ],
  cashier: [
    'view_dashboard', 'view_sales', 'view_sale', 'create_sales', 'create_sale',
    'view_customers',
    'view_cashbox', 'close_cashbox',
    'view_returns', 'create_return',
  ],
  storekeeper: [
    'view_dashboard',
    'view_purchases', 'view_purchase', 'create_purchases', 'create_purchase',
    'view_inventory', 'adjust_stock',
    'view_batches', 'manage_batches',
    'view_vehicles',
  ],
  employee: [
    'view_dashboard',
    'view_inventory',
    'view_customers',
    'view_suppliers',
  ],
};

export function useAuth() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuthStore();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.permissions) {
      try {
        const customPerms = JSON.parse(user.permissions);
        if (Array.isArray(customPerms)) {
          return customPerms.includes(permission);
        }
      } catch (err) {
        console.error('Failed to parse custom permissions:', err);
      }
    }
    return PERMISSIONS_MATRIX[user.role]?.includes(permission) ?? false;
  };

  const hasRole = (...roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasPermission,
    hasRole,
  };
}
