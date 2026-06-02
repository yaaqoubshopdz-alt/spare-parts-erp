/**
 * Print IPC — معالجة أوامر الطباعة المباشرة من النظام
 */
import { ipcMain, BrowserWindow } from 'electron';

export function registerPrintIPC() {
  
  // دالة للطباعة الصامتة لتيكيت الكاشير أو فواتير A4
  ipcMain.handle('print:html', async (event, data: { html: string, silent?: boolean, printerName?: string, paperSize?: string }) => {
    return new Promise((resolve) => {
      // إنشاء نافذة وهمية خفية للطباعة
      let printWindow: BrowserWindow | null = new BrowserWindow({ 
        show: false,
        webPreferences: { nodeIntegration: true }
      });
      
      const isThermal = data.paperSize === '80mm';
      const docDir = 'ltr'; // Set root to LTR to completely bypass the Windows print spooler mirroring bugs with generic drivers
      
      // Parse custom barcode label dimensions if present (e.g., "38mmx25mm", "30mmx15mm", "50mmx30mm")
      let isCustomLabel = false;
      let labelWidth = 0;
      let labelHeight = 0;
      if (data.paperSize && data.paperSize.includes('mm') && data.paperSize.includes('x')) {
        const match = data.paperSize.match(/(\d+)mmx(\d+)mm/i);
        if (match) {
          isCustomLabel = true;
          labelWidth = parseInt(match[1], 10);
          labelHeight = parseInt(match[2], 10);
        }
      }

      // Explicitly define page sizing in CSS for Chromium print engine
      const pageStyle = isThermal
        ? `@page { size: 80mm 297mm; margin: 0; } body { margin: 0; padding: 0; }`
        : isCustomLabel
          ? `@page { size: ${labelWidth}mm ${labelHeight}mm; margin: 0; } body { margin: 0; padding: 0; }`
          : data.paperSize === 'A5'
            ? `@page { size: A5; margin: 0; } body { margin: 0; padding: 0; }`
            : `@page { size: A4; margin: 0; } body { margin: 0; padding: 0; }`;

      // تحميل المحتوى المراد طباعته
      const htmlContent = `
        <!DOCTYPE html>
        <html dir="${docDir}">
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 0; color: #000; }
              @media print {
                ${pageStyle}
              }
            </style>
          </head>
          <body>${data.html}</body>
        </html>
      `;
      
      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      
      printWindow.webContents.on('did-finish-load', () => {
        // Wait 250ms to ensure local system fonts are fully loaded, text layout is parsed, and styles are rasterized.
        // This solves the issue of text printing as blank or faint dots due to Chromium printing before rendering completes.
        setTimeout(() => {
          let printOptions: any = {
            silent: data.silent !== undefined ? data.silent : true,
            printBackground: true,
            deviceName: data.printerName
          };

          // Pass explicit paper dimensions to prevent Chromium from rendering an A4 size and scaling it down
          if (isThermal) {
            // Omit printOptions.pageSize entirely for thermal receipts.
            // This completely bypasses the Chromium bug where passing custom micron dimensions on Windows
            // scales the entire invoice down to a single pixel (printed as a single dot).
            printOptions.margins = { marginType: 'none' };
            printOptions.marginsType = 1; // 1 means no margins
          } else if (isCustomLabel) {
            printOptions.pageSize = { width: labelWidth * 1000, height: labelHeight * 1000 }; // custom label dimension in microns
            printOptions.margins = { marginType: 'none' };
            printOptions.marginsType = 1;
          } else if (data.paperSize === 'A5') {
            printOptions.pageSize = 'A5';
            printOptions.margins = { marginType: 'none' };
            printOptions.marginsType = 1;
          } else {
            printOptions.pageSize = 'A4';
            printOptions.margins = { marginType: 'none' };
            printOptions.marginsType = 1;
          }

          printWindow?.webContents.print(printOptions, (success, failureReason) => {
            if (!success) {
              console.error('Print failed:', failureReason);
              resolve({ success: false, error: failureReason });
            } else {
              resolve({ success: true });
            }
            // تنظيف الذاكرة
            if (printWindow) {
              printWindow.close();
              printWindow = null;
            }
          });
        }, 250);
      });
    });
  });

  // دالة لحفظ الفاتورة كـ PDF
  ipcMain.handle('print:savePDF', async (event, data: { html: string, fileName?: string }) => {
    try {
      const { dialog, app } = require('electron');
      const fs = require('fs');
      const path = require('path');
      
      const win = BrowserWindow.fromWebContents(event.sender) || undefined;
      const { filePath, canceled } = await dialog.showSaveDialog(win!, {
        title: 'حفظ كـ PDF',
        defaultPath: path.join(app.getPath('downloads'), data.fileName || `invoice_${Date.now()}.pdf`),
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      });

      if (canceled || !filePath) return { success: false, error: 'Canceled' };

      // إنشاء نافذة وهمية خفية للطباعة
      let printWindow: BrowserWindow | null = new BrowserWindow({ 
        show: false,
        webPreferences: { nodeIntegration: true }
      });
      
      const htmlContent = `
        <!DOCTYPE html>
        <html dir="ltr">
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 20px; color: #000; }
              @media print {
                @page { margin: 0; }
                body { margin: 0cm; }
              }
            </style>
          </head>
          <body>${data.html}</body>
        </html>
      `;
      
      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      
      return new Promise((resolve) => {
        printWindow!.webContents.on('did-finish-load', async () => {
          try {
            const pdfData = await printWindow!.webContents.printToPDF({
              printBackground: true,
              displayHeaderFooter: true,
              headerTemplate: '<div style="font-size: 1px; color: transparent; height: 0;"></div>',
              footerTemplate: `
                <div style="font-size: 9px; width: 100%; text-align: center; font-family: Arial, sans-serif; color: #64748b; direction: rtl; padding-bottom: 5px;">
                  الصفحة <span class="pageNumber"></span> من <span class="totalPages"></span>
                </div>
              `,
              margins: { marginType: 'default' }
            });
            fs.writeFileSync(filePath, pdfData);
            resolve({ success: true, path: filePath });
          } catch (pdfErr: any) {
            console.error('PDF export failed:', pdfErr);
            resolve({ success: false, error: pdfErr.message });
          } finally {
            if (printWindow) {
              printWindow.close();
              printWindow = null;
            }
          }
        });
      });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // استخراج قائمة الطابعات المثبتة في الجهاز
  ipcMain.handle('print:getPrinters', async () => {
    try {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (!mainWindow) return { success: false, error: 'No active window' };
      
      const printers = await mainWindow.webContents.getPrintersAsync();
      return { success: true, data: printers };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  console.log('[IPC] Print handlers registered');
}
