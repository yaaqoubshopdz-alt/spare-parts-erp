/**
 * CM_03 - Preload Script
 * IPC channels بدون أي Supabase/Sync
 */
import { contextBridge, ipcRenderer } from 'electron';

const ALLOWED_INVOKE_CHANNELS = [
  // Auth
  'auth:login', 'auth:logout', 'auth:checkSession', 'auth:changePassword', 'auth:loginByPin', 'auth:verifyPin', 'auth:loginDirect', 'auth:verifyPassword',
  // Products
  'db:products:getAll', 'db:products:search', 'db:products:create', 'db:products:update', 'db:products:delete', 'db:products:getById', 'db:products:getByBarcodeOrCode', 'db:products:recordUsage', 'db:products:suggest', 'db:products:getImages', 'db:products:deleteImage',
  // Product Barcodes
  'db:barcodes:getByProduct', 'db:barcodes:create', 'db:barcodes:delete',
  // Categories
  'db:categories:getAll', 'db:categories:create', 'db:categories:update', 'db:categories:delete',
  // Brands
  'db:brands:getAll', 'db:brands:create', 'db:brands:update', 'db:brands:delete',
  // Units
  'db:units:getAll', 'db:units:create', 'db:units:update', 'db:units:delete',
  // Customers
  'db:customers:getAll', 'db:customers:search', 'db:customers:create', 'db:customers:update', 'db:customers:getStatement', 'db:customers:addPayment',
  // Suppliers
  'db:suppliers:getAll', 'db:suppliers:search', 'db:suppliers:create', 'db:suppliers:update', 'db:suppliers:getStatement', 'db:suppliers:addPayment',
  // Sales
  'db:sales:getAll', 'db:sales:getById', 'db:sales:save', 'db:sales:cancel', 'db:sales:getDrafts', 'db:sales:deleteDraft', 'db:sales:deleteAllDrafts',
  // Purchases
  'db:purchases:getAll', 'db:purchases:getById', 'db:purchases:save', 'db:purchases:cancel', 'db:purchases:getDrafts', 'db:purchases:deleteDraft', 'db:purchases:deleteAllDrafts',
  // Inventory
  'db:inventory:getStock', 'db:inventory:getMovements', 'db:inventory:adjustStock', 'db:inventory:markDefective', 'db:inventory:getProductSuppliers',
  // Batches
  'db:batches:getByProduct', 'db:batches:getExpiring',
  // Vehicles & Fitments
  'db:vehicles:getBrands', 'db:vehicles:createBrand', 'db:vehicles:updateBrand', 'db:vehicles:deleteBrand',
  'db:vehicles:getModels', 'db:vehicles:createModel', 'db:vehicles:updateModel', 'db:vehicles:deleteModel', 'db:vehicles:parseAndCreate',
  'db:fitments:getByProduct', 'db:fitments:create', 'db:fitments:delete',
  'db:fitments:toggleForProduct', 'db:fitments:suggestForProduct',
  // Advanced Search
  'db:products:advancedSearch',
  'db:products:getLowStock', 'db:products:toggleMuteLowStock',
  // Payments
  'db:payments:create', 'db:payments:getList', 'db:payments:update', 'db:payments:delete',
  // Expenses
  'db:expenses:create', 'db:expenses:getList', 'db:expenses:delete',
  // Finance
  'db:finance:getSummary',
  // Reports
  'db:reports:getDailySales', 'db:reports:getProfitLoss', 'db:reports:getTrialBalance',
  'db:reports:getCustomerStatement', 'db:reports:getSupplierStatement',
  'db:reports:getExpiringBatches', 'db:reports:getStockValuation',
  // Dashboard
  'db:dashboard:summary', 'db:dashboard:lowStock', 'db:dashboard:todayInvoices', 'db:dashboard:expiringBatches', 'db:dashboard:getRecentLowStock', 'db:dashboard:staleDrafts', 'db:dashboard:recentDrafts',
  // Locations
  'db:locations:getAll',
  // Settings
  'db:settings:getAll', 'db:settings:update', 'db:settings:uploadLogo', 'db:settings:reset', 'dialog:selectDirectory',
  // Audit
  'db:audit:getRecent',
  // Accounting Engine
  'accounting:getClosingDate', 'accounting:lockPeriod', 'accounting:unlockPeriod', 'accounting:yearClose',
  'accounting:getBalanceSheet', 'accounting:getIncomeStatement', 'accounting:getCashFlow',
  'accounting:getAgingReport', 'accounting:getChartOfAccounts', 'accounting:checkPermission',
  'accounting:getFinancialOverview', 'accounting:getProfitAndLoss', 'accounting:getJournalEntry', 'accounting:getSimpleReports',
  'accounting:getProductProfitability',
  'audit:log', 'audit:getLog',
  'db:reports:getGeneralLedger',
  // Backup
  'backup:create', 'backup:restore', 'backup:list',
  // Users
  'db:users:getAll', 'db:users:create', 'db:users:update', 'db:users:resetPassword', 'db:users:verifyPin', 'db:users:getActiveList',
  // Inventory Count
  'icount:createSession', 'icount:getSessions', 'icount:getSessionById', 'icount:getSessionItems', 'icount:getActiveSession',
  'icount:updateItemCount', 'icount:updateItemNotes', 'icount:finishSession', 'icount:approveSession',
  'icount:cancelSession', 'icount:toggleHideFromSales', 'icount:deleteSession',
  // Print
  'print:html', 'print:getPrinters', 'print:savePDF',
  // Shell (External browser)
  'shell:openExternal',
  // Window
  'window:minimize', 'window:maximize', 'window:close', 'window:capturePage', 'window:expand', 'window:shrink',
  // Mobile integration
  'mobile:get-server-info', 'mobile:get-status', 'mobile:get-pending-photos', 'mobile:request-photo', 'mobile:get-invoice-queue', 'mobile:mark-invoice-processed',
];

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: any[]) => {
    if (ALLOWED_INVOKE_CHANNELS.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    console.warn(`[Preload] Blocked channel: ${channel}`);
    return Promise.reject(new Error(`Channel not allowed: ${channel}`));
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
