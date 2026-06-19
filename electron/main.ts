/**
 * Electron Main Process — SparePartsERP
 * بدون أي Supabase أو Sync
 */
import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { autoUpdater } from 'electron-updater';

// ── File Logging in Production ──
const userDataPath = app.getPath('userData');
const logDirectory = path.join(userDataPath, 'Logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}
const logFilePath = path.join(logDirectory, 'main.log');

try {
  fs.appendFileSync(logFilePath, `\n\n--- App Started: ${new Date().toISOString()} ---\n`);
} catch (e) {
  // Safe fallback
}

function logToFile(level: string, ...args: any[]) {
  const message = args.map(arg => {
    if (arg instanceof Error) {
      return `${arg.message}\n${arg.stack}`;
    }
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
  const logLine = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  try {
    fs.appendFileSync(logFilePath, logLine);
  } catch (err) {
    // Ignore logging errors
  }
}

// Redirect console methods to write to main.log as well
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args) => {
  originalLog(...args);
  logToFile('INFO', ...args);
};

console.error = (...args) => {
  originalError(...args);
  logToFile('ERROR', ...args);
};

console.warn = (...args) => {
  originalWarn(...args);
  logToFile('WARN', ...args);
};

// ── Single Instance Lock ──
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Main] Another instance is already running. Quitting.');
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  // Focus the main window if another instance is launched
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ── Catch all unhandled errors and display them in a dialog box (must be registered before importing native modules) ──
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  try {
    dialog.showErrorBox(
      'خطأ في النظام (Uncaught Exception)',
      `حدث خطأ غير متوقع أثناء تشغيل البرنامج:\n\n${error.message}\n\nتفاصيل الخطأ:\n${error.stack}`
    );
  } catch (e) {
    // Fallback if dialog is not ready
  }
});

process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled Rejection:', reason);
  try {
    dialog.showErrorBox(
      'خطأ في النظام (Unhandled Rejection)',
      `حدث خطأ في العمليات الخلفية للبرنامج:\n\n${reason}`
    );
  } catch (e) {
    // Fallback if dialog is not ready
  }
});

import { DatabaseService } from './services/database.service';
import { AuthService } from './services/auth.service';
import { AccountingEngine } from './services/accounting.service';
import { BackupService } from './services/backup.service';
import { OtaUpdaterService } from './services/ota-updater.service';

// IPC Modules
import { registerProductsIPC } from './ipc/products.ipc';
import { registerDashboardIPC } from './ipc/dashboard.ipc';
import { registerCatalogIPC } from './ipc/catalog.ipc';
import { registerPartiesIPC } from './ipc/parties.ipc';
import { registerUsersIPC } from './ipc/users.ipc';
import { registerSalesIPC } from './ipc/sales.ipc';
import { registerPurchasesIPC } from './ipc/purchases.ipc';
import { registerBatchesIPC } from './ipc/batches.ipc';
import { registerVehiclesIPC } from './ipc/vehicles.ipc';
import { registerExpensesIPC } from './ipc/expenses.ipc';
import { registerReportsIPC } from './ipc/reports.ipc';
import { registerSettingsIPC } from './ipc/settings.ipc';
import { registerPrintIPC } from './ipc/print.ipc';
import { registerInventoryIPC } from './ipc/inventory.ipc';
import { registerAccountingIPC } from './ipc/accounting.ipc';
import { registerInventoryCountIPC } from './ipc/inventory-count.ipc';
import { registerMobileIPC } from './ipc/mobile.ipc';
import { MobileBridge } from './mobile-bridge/MobileBridge';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 620,
    resizable: false,
    frame: false,
    transparent: false,
    backgroundColor: '#14171d',
    hasShadow: true,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../resources/icon.ico'),
  });

  // Dev or Production
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const updatesIndexPath = OtaUpdaterService.getUpdatesIndexPath();
    if (updatesIndexPath) {
      console.log('[Main] Loading app from OTA updates folder:', updatesIndexPath);
      mainWindow.loadFile(updatesIndexPath);
    } else {
      console.log('[Main] Loading app from default packaged folder');
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
    // Temporarily open DevTools in production to diagnose renderer crashes
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Check for hot updates after window is created (delay to not block boot)
  setTimeout(() => {
    if (mainWindow) {
      OtaUpdaterService.checkForUpdates(mainWindow).catch((err) => {
        console.error('[Main] Background OTA update failed:', err);
      });
    }
  }, 5000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Window Controls ─────────────────────────────────────────
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:expand', () => {
  if (!mainWindow) return;
  mainWindow.setResizable(true);
  mainWindow.setMinimumSize(1200, 700);
  mainWindow.setSize(1400, 900, false);
  mainWindow.center();
  mainWindow.maximize();
});
ipcMain.handle('window:shrink', () => {
  if (!mainWindow) return;
  mainWindow.unmaximize();
  mainWindow.setMinimumSize(480, 620);
  mainWindow.setSize(480, 620, true);
  mainWindow.setResizable(false);
  mainWindow.center();
});
ipcMain.handle('window:capturePage', async () => {
  if (!mainWindow) return null;
  const image = await mainWindow.webContents.capturePage();
  return image.toDataURL(); // Returns high-quality Base64 data URL
});

// ── Shell (Open external browser) ───────────────────────────
ipcMain.handle('shell:openExternal', async (_e, url: string) => {
  // Security: only allow https URLs
  if (typeof url === 'string' && url.startsWith('https://')) {
    await shell.openExternal(url);
    return { success: true };
  }
  return { success: false, error: 'URL must start with https://' };
});

// ── Auth IPC ────────────────────────────────────────────────
ipcMain.handle('auth:login', async (_e, username: string, password: string) => {
  return AuthService.authenticate(username, password);
});
ipcMain.handle('auth:logout', async () => {
  return AuthService.logout();
});
ipcMain.handle('auth:checkSession', async () => {
  return AuthService.checkSession();
});
ipcMain.handle('auth:loginByPin', async (_e, userId: number, pin: string) => {
  return AuthService.loginByPin(userId, pin);
});
ipcMain.handle('auth:changePassword', async (_e, userId: number, oldPw: string, newPw: string) => {
  return AuthService.changePassword(userId, oldPw, newPw);
});
ipcMain.handle('auth:verifyPin', async (_e, userId: number, pin: string) => {
  // Re-use loginByPin but only return success/fail — no session change
  return AuthService.loginByPin(userId, pin);
});
ipcMain.handle('auth:loginDirect', async (_e, userId: number) => {
  return AuthService.loginDirect(userId);
});
ipcMain.handle('auth:verifyPassword', async (_e, userId: number, password: string) => {
  return AuthService.verifyPassword(userId, password);
});


// ── Register All IPC Modules ────────────────────────────────
function registerAllIPC() {
  registerProductsIPC();
  registerDashboardIPC();
  registerCatalogIPC();
  registerPartiesIPC();
  registerUsersIPC();
  registerSalesIPC();
  registerPurchasesIPC();
  registerBatchesIPC();
  registerVehiclesIPC();
  registerExpensesIPC();
  registerReportsIPC();
  registerInventoryIPC();
  registerSettingsIPC();
  registerPrintIPC();
  registerAccountingIPC();
  registerInventoryCountIPC();
  registerMobileIPC();

  // OTA Update
  ipcMain.handle('ota:check', async () => {
    if (mainWindow) {
      return OtaUpdaterService.checkForUpdates(mainWindow);
    }
    return { success: false, updated: false, error: 'No active window' };
  });

  console.log('[Main] All IPC modules registered');
}

function generateLogoBase64() {
  try {
    const srcPath = 'C:\\Users\\blbl\\Downloads\\ChatGPT Image 31 مايو 2026، 02_53_24 ص.png';
    const destPath = path.join(__dirname, '../src/features/auth/logoData.ts');
    const destPath2 = path.join(__dirname, '../../src/features/auth/logoData.ts');

    if (fs.existsSync(srcPath)) {
      const base64Data = fs.readFileSync(srcPath, { encoding: 'base64' });
      const fileContent = `export const logoData = "data:image/png;base64,${base64Data}";\n`;
      
      try {
        fs.writeFileSync(destPath, fileContent, 'utf8');
        console.log('[Main] Generated logoData.ts at', destPath);
      } catch {}
      try {
        fs.writeFileSync(destPath2, fileContent, 'utf8');
        console.log('[Main] Generated logoData.ts at', destPath2);
      } catch {}
    } else {
      console.log('[Main] Source logo image not found at:', srcPath);
    }
  } catch (e: any) {
    console.error('[Main] generateLogoBase64 failed:', e.message);
  }
}

// App Lifecycle
app.whenReady().then(() => {
  // Initialize database first
  DatabaseService.initialize();
  console.log('[Main] Database initialized');

  // Copy/generate logo data if available
  generateLogoBase64();

  // Clear session on startup to force user picker/PIN authentication
  AuthService.logout();

  try {
    // Run retroactive accounting reconciliation
    AccountingEngine.reconcile(DatabaseService.getRawDb());
  } catch (err: any) {
    console.error('[Main] Accounting reconciliation failed:', err.message);
  }

  // Register IPC handlers
  registerAllIPC();

  // Start automatic backup scheduler
  BackupService.startScheduler();

  // Start Mobile Bridge for helper mobile app connection
  MobileBridge.start();

  createWindow();

  // Setup auto-updater for production
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  MobileBridge.stop();
  DatabaseService.close();
  if (process.platform !== 'darwin') app.quit();
});

/**
 * Setup Auto Updater events and check for updates
 */
function setupAutoUpdater() {
  // Skip auto-updater check in development environment
  if (process.env.VITE_DEV_SERVER_URL) {
    console.log('[Updater] Skipping auto-updater in development mode');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...');
  });

  autoUpdater.on('update-available', (info: any) => {
    console.log('[Updater] Update available:', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] No update available.');
  });

  autoUpdater.on('error', (err: any) => {
    console.error('[Updater] Error occurred:', err);
  });

  autoUpdater.on('download-progress', (progressObj: any) => {
    console.log(`[Updater] Downloaded ${progressObj.percent.toFixed(2)}%`);
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('[Updater] Update downloaded. Prompting user to restart.');
    dialog.showMessageBox({
      type: 'info',
      title: 'تحديث جديد جاهز',
      message: 'تم تحميل التحديث بنجاح. هل تريد إغلاق البرنامج وتثبيت التحديث الآن؟',
      buttons: ['نعم، حدّث الآن', 'لاحقاً'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  // Perform initial update check
  autoUpdater.checkForUpdatesAndNotify().catch((err: any) => {
    console.error('[Updater] Failed to check for updates:', err);
  });
}
