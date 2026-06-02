/**
 * Application configuration constants - SparePartsERP
 * بدون sync أو supply
 */
export const APP_CONFIG = {
  APP_NAME_AR: 'نظام إدارة قطع الغيار',
  APP_NAME_FR: 'SparePartsERP',
  APP_VERSION: '1.0.0',
  DEFAULT_LANGUAGE: 'ar' as const,
  SUPPORTED_LANGUAGES: ['ar', 'fr'] as const,
  DEFAULT_CURRENCY: 'د.ج',
  DEFAULT_CURRENCY_FR: 'DA',
  DECIMAL_PLACES: 2,
  DEFAULT_TAX_PERCENT: 0,
  PAGINATION_LIMIT: 50,
  SEARCH_DEBOUNCE_MS: 300,
  AUTO_LOGOUT_MINUTES: 30,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 5,
  BCRYPT_COST_FACTOR: 12,
  BACKUP_RETENTION_DAYS: 30,
  DEFAULT_BACKUP_TIME: '23:00',
  EXPIRY_WARNING_DAYS: 30,
} as const;

export const IPC_CHANNELS = {
  // Auth
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_CHECK_SESSION: 'auth:checkSession',
  AUTH_CHANGE_PASSWORD: 'auth:changePassword',
  // Users
  USERS_GET_ALL: 'db:users:getAll',
  USERS_CREATE: 'db:users:create',
  USERS_UPDATE: 'db:users:update',
  USERS_RESET_PASSWORD: 'db:users:resetPassword',
  // Products
  PRODUCTS_SEARCH: 'db:products:search',
  PRODUCTS_GET_ALL: 'db:products:getAll',
  PRODUCTS_GET_BY_ID: 'db:products:getById',
  PRODUCTS_CREATE: 'db:products:create',
  PRODUCTS_UPDATE: 'db:products:update',
  PRODUCTS_DELETE: 'db:products:delete',
  // Categories
  CATEGORIES_GET_ALL: 'db:categories:getAll',
  CATEGORIES_CREATE: 'db:categories:create',
  CATEGORIES_UPDATE: 'db:categories:update',
  CATEGORIES_DELETE: 'db:categories:delete',
  // Brands
  BRANDS_GET_ALL: 'db:brands:getAll',
  BRANDS_CREATE: 'db:brands:create',
  // Units
  UNITS_GET_ALL: 'db:units:getAll',
  // Sales
  SALES_GET_NEXT_NUMBER: 'db:sales:getNextNumber',
  SALES_CREATE: 'db:sales:create',
  SALES_CONFIRM: 'db:sales:confirm',
  SALES_CANCEL: 'db:sales:cancel',
  SALES_GET_LIST: 'db:sales:getList',
  SALES_GET_BY_ID: 'db:sales:getById',
  // Purchases
  PURCHASES_GET_NEXT_NUMBER: 'db:purchases:getNextNumber',
  PURCHASES_CREATE: 'db:purchases:create',
  PURCHASES_CONFIRM: 'db:purchases:confirm',
  PURCHASES_CANCEL: 'db:purchases:cancel',
  PURCHASES_GET_LIST: 'db:purchases:getList',
  PURCHASES_GET_BY_ID: 'db:purchases:getById',
  // Returns
  SALES_RETURNS_CREATE: 'db:returns:sales:create',
  SALES_RETURNS_CONFIRM: 'db:returns:sales:confirm',
  PURCHASE_RETURNS_CREATE: 'db:returns:purchases:create',
  PURCHASE_RETURNS_CONFIRM: 'db:returns:purchases:confirm',
  // Inventory
  INVENTORY_GET_STOCK: 'db:inventory:getStock',
  INVENTORY_GET_MOVEMENTS: 'db:inventory:getMovements',
  INVENTORY_ADJUST: 'db:inventory:adjustStock',
  // Batches
  BATCHES_GET_ALL: 'db:batches:getAll',
  BATCHES_GET_BY_PRODUCT: 'db:batches:getByProduct',
  BATCHES_GET_EXPIRING: 'db:batches:getExpiring',
  // Vehicles
  VEHICLES_GET_BRANDS: 'db:vehicles:getBrands',
  VEHICLES_GET_MODELS: 'db:vehicles:getModels',
  FITMENTS_GET_BY_PRODUCT: 'db:fitments:getByProduct',
  // Customers
  CUSTOMERS_GET_ALL: 'db:customers:getAll',
  CUSTOMERS_SEARCH: 'db:customers:search',
  CUSTOMERS_CREATE: 'db:customers:create',
  CUSTOMERS_UPDATE: 'db:customers:update',
  // Suppliers
  SUPPLIERS_GET_ALL: 'db:suppliers:getAll',
  SUPPLIERS_CREATE: 'db:suppliers:create',
  SUPPLIERS_UPDATE: 'db:suppliers:update',
  // Finance
  FINANCE_GET_SUMMARY: 'db:finance:getSummary',
  PAYMENTS_CREATE: 'db:payments:create',
  PAYMENTS_GET_LIST: 'db:payments:getList',
  // Cash Box
  CASHBOX_GET_SUMMARY: 'db:cashbox:getSummary',
  CASHBOX_CLOSE: 'db:cashbox:close',
  CASHBOX_ADD_TRANSACTION: 'db:cashbox:addTransaction',
  // Expenses
  EXPENSES_CREATE: 'db:expenses:create',
  EXPENSES_GET_LIST: 'db:expenses:getList',
  // Reports
  REPORTS_DAILY_SALES: 'db:reports:getDailySales',
  REPORTS_PROFIT_LOSS: 'db:reports:getProfitLoss',
  // Backup
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_LIST: 'backup:list',
  // Settings
  SETTINGS_GET_ALL: 'db:settings:getAll',
  SETTINGS_UPDATE: 'db:settings:update',
  // Print
  PRINT_INVOICE: 'print:invoice',
  // Window
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
} as const;
