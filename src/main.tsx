import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './shared/components/providers/ThemeProvider';
import { I18nProvider } from './shared/components/providers/I18nProvider';
import { AuthProvider } from './shared/components/providers/AuthProvider';
import { Toaster } from 'react-hot-toast';
import './index.css';

// ── Mock Electron API for Browser Environment ──
if (typeof window !== 'undefined' && !window.electronAPI) {
  console.warn('[Web Mock] Running in browser: Mocking window.electronAPI for seamless development/testing.');
  
  const mockDb = {
    categories: [
      { id: 1, name: 'فرامل' },
      { id: 2, name: 'فلاتر' },
      { id: 3, name: 'زيوت ومحركات' },
      { id: 4, name: 'كهرباء وإنارة' },
    ],
    units: [
      { id: 1, name: 'قطعة', is_active: 1 },
      { id: 2, name: 'علبة', is_active: 1 },
      { id: 3, name: 'كيس', is_active: 1 },
    ],
    brands: [
      { id: 1, name: 'تويوتا (Toyota)' },
      { id: 2, name: 'هيونداي (Hyundai)' },
      { id: 3, name: 'بوش (Bosch)' },
    ],
    vehicles: [
      { id: 1, name: 'Toyota' },
      { id: 2, name: 'Hyundai' },
    ],
    models: {
      1: [
        { id: 1, name: 'Corolla 2020', brand_id: 1 },
        { id: 2, name: 'Camry 2021', brand_id: 1 },
      ],
      2: [
        { id: 3, name: 'Elantra 2019', brand_id: 2 },
        { id: 4, name: 'Tucson 2022', brand_id: 2 },
      ]
    } as Record<number, any[]>
  };

  window.electronAPI = {
    invoke: async (channel: string, ...args: any[]) => {
      console.log(`[Web Mock] IPC Invoke: "${channel}"`, args);

      if (channel === 'auth:checkSession' || channel === 'auth:login') {
        return {
          success: true,
          user: {
            id: 1,
            username: 'admin',
            full_name: 'المدير العام',
            role: 'owner',
            is_active: true
          }
        };
      }

      if (channel === 'db:categories:getAll') {
        return { success: true, data: mockDb.categories };
      }

      if (channel === 'db:units:getAll') {
        return { success: true, data: mockDb.units };
      }

      if (channel === 'db:brands:getAll') {
        return { success: true, data: mockDb.brands };
      }

      if (channel === 'db:vehicles:getBrands') {
        return { success: true, data: mockDb.vehicles };
      }

      if (channel === 'db:vehicles:getModels') {
        const brandId = args[0] || 1;
        return { success: true, data: mockDb.models[brandId] || [] };
      }

      if (channel === 'db:vehicles:parseAndCreate') {
        const parts = (args[0] || '').trim().split(' ');
        const brandName = parts[0] || 'Brand';
        const modelName = parts.slice(1).join(' ') || 'Model';
        return {
          success: true,
          data: {
            vehicle_brand_id: 1,
            vehicle_model_id: 1,
            vehicle_brand_name: brandName,
            vehicle_model_name: modelName
          }
        };
      }

      if (channel === 'db:products:getAll') {
        return {
          success: true,
          data: [
            {
              id: 1,
              name: 'فحمات فرامل أمامية',
              internal_code: '04465-02220',
              barcode: '628100123456',
              purchase_price: 3500,
              retail_price: 4500,
              retail_margin: 28.57,
              min_stock_level: 5,
              unit_id: 1,
              category_id: 1,
              stock: 12,
              fitments: [{ id: 1, brand_name: 'Toyota', model_name: 'Corolla 2020' }]
            }
          ]
        };
      }

      if (channel === 'accounting:getProfitAndLoss') {
        return {
          success: true,
          data: {
            revenue: [{ id: 1, name: 'إيرادات المبيعات المكتملة', code: '4100', balance: 450000 }],
            totalRevenue: 450000,
            cogs: [{ id: 2, name: 'تكلفة البضاعة المباعة (WAC)', code: '5100', balance: 320000 }],
            totalCogs: 320000,
            grossProfit: 130000,
            expenses: [
              { id: 3, name: 'مصروف الإيجار الشهري', code: '6100', balance: 40000 },
              { id: 4, name: 'مصاريف تشغيل وتوزيع', code: '6200', balance: 15000 }
            ],
            totalExpenses: 55000,
            netProfit: 75000
          }
        };
      }

      if (channel === 'accounting:getSimpleReports') {
        const period = args[0] || 'month';
        const today = new Date();
        const salesTrend: any[] = [];
        
        let totalSales = 0;
        let netProfit = 0;
        let expenses = 0;
        
        if (period === 'week') {
          totalSales = 95000;
          netProfit = 18500;
          expenses = 12000;
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            salesTrend.push({ date: dateStr, total_sales: 10000 + Math.random() * 8000 });
          }
        } else if (period === 'year') {
          totalSales = 4800000;
          netProfit = 950000;
          expenses = 650000;
          for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(today.getMonth() - i);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            salesTrend.push({ date: dateStr, total_sales: 300000 + Math.random() * 150000 });
          }
        } else {
          totalSales = 450000;
          netProfit = 75000;
          expenses = 55000;
          for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            salesTrend.push({ date: dateStr, total_sales: 8000 + Math.random() * 12000 });
          }
        }

        return {
          success: true,
          data: {
            cashBalance: 185000,
            inventoryValue: 320000,
            receivables: 85000,
            payables: 120000,
            netProfit,
            expenses,
            totalSales,
            todayProfit: 8500,
            bestSellers: [
              { name: 'فحمات فرامل أمامية Toyota', quantity_sold: 45 },
              { name: 'زيت محرك 10W40 Total', quantity_sold: 38 },
              { name: 'فلتر زيت Bosch', quantity_sold: 29 }
            ],
            salesTrend
          }
        };
      }

      if (channel === 'accounting:getBalanceSheet') {
        return {
          success: true,
          data: {
            as_of_date: args[0] || '2026-05-15',
            assets: {
              accounts: [
                { id: 1, name: 'حساب الصندوق الرئيسي', code: '1100', balance: 150000 },
                { id: 2, name: 'مخزون قطع الغيار الأساسي', code: '1400', balance: 350000 }
              ],
              total: 500000
            },
            liabilities: {
              accounts: [{ id: 3, name: 'حساب الموردين الذمم الدائنة', code: '2100', balance: 120000 }],
              total: 120000
            },
            equity: {
              accounts: [{ id: 4, name: 'رأس مال الشركاء المدفوع', code: '3100', balance: 305000 }],
              total: 380000,
              net_income: 75000
            },
            is_balanced: true
          }
        };
      }

      if (channel === 'accounting:getFinancialOverview') {
        return {
          success: true,
          data: {
            currentCash: 150000,
            inventoryValue: 350000,
            receivables: 80000,
            payables: 120000,
            periodSales: 450000,
            periodProfit: 75000,
            periodExpenses: 55000
          }
        };
      }

      // ── Low Stock Mocks ──
      if (channel === 'db:products:getLowStock') {
        return {
          success: true,
          data: [
            { id: 1, name: 'زيت محرك 10W40', barcode: '123456', internal_code: 'OIL01', min_stock_level: 10, current_stock: 2, shortage: 8, is_low_stock_muted: 0, category_name: 'زيوت', category_id: 1 },
            { id: 2, name: 'فلتر زيت', barcode: '234567', internal_code: 'FIL01', min_stock_level: 15, current_stock: 3, shortage: 12, is_low_stock_muted: 0, category_name: 'فلاتر', category_id: 2 },
            { id: 3, name: 'وسائد فرامل أمامية', barcode: '345678', internal_code: 'BRK01', min_stock_level: 8, current_stock: 1, shortage: 7, is_low_stock_muted: 1, category_name: 'فرامل', category_id: 3 },
          ]
        };
      }

      if (channel === 'db:products:toggleMuteLowStock') {
        return { success: true, data: { is_low_stock_muted: 1 } };
      }

      if (channel === 'db:dashboard:getRecentLowStock') {
        return {
          success: true,
          data: [
            { id: 1, name: 'زيت محرك 10W40', barcode: '123456', min_stock_level: 10, current_stock: 2, shortage: 8, category_name: 'زيوت', updated_at: new Date().toISOString(), relativeTime: 'منذ ساعة' },
          ]
        };
      }

      // Default mock success response
      return { success: true, data: [] };
    },
    on: (channel: string, callback: (...args: any[]) => void) => {
      console.log(`[Web Mock] IPC On: "${channel}"`);
    },
    removeAllListeners: (channel: string) => {
      console.log(`[Web Mock] IPC removeAllListeners: "${channel}"`);
    },
    isMock: true
  } as any;
}


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <ThemeProvider>
            <App />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#1E293B',
                  color: '#F1F5F9',
                  border: '1px solid rgba(255,255,255,0.1)',
                },
              }}
            />
          </ThemeProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);
