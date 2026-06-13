/**
 * Mobile Integration IPC Handlers
 * قنوات الاتصال الداخلي لإدارة خادم الهاتف المحمول وطلبات التعديل
 */
import { ipcMain } from 'electron';
import { DatabaseService } from '../services/database.service';
import { MobileBridge } from '../mobile-bridge/MobileBridge';
import { broadcastToMobiles } from '../mobile-bridge/WebSocketServer';

export function registerMobileIPC() {
  const db = () => DatabaseService.getRawDb();

  // Get server connection info (IP, Ports, status)
  ipcMain.handle('mobile:get-server-info', async () => {
    try {
      const info = MobileBridge.getServerInfo();
      return { success: true, data: info };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Get status of the Mobile Bridge
  ipcMain.handle('mobile:get-status', async () => {
    return { success: true, isRunning: MobileBridge.getServerInfo().isConnected };
  });

  // Get list of pending photo requests
  ipcMain.handle('mobile:get-pending-photos', async () => {
    try {
      const pending = db().prepare(`
        SELECT pr.id, pr.product_id as productId, p.name as productName, p.barcode as productBarcode, pr.created_at as createdAt
        FROM photo_requests pr
        JOIN products p ON pr.product_id = p.id
        WHERE pr.status = 'pending'
        ORDER BY pr.created_at DESC
      `).all();
      return { success: true, data: pending };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Create a new photo request and broadcast to mobile clients
  ipcMain.handle('mobile:request-photo', async (_e, productId: number, productName: string) => {
    try {
      const rawDb = db();
      
      // Check if there is already a pending request for this product
      const existing = rawDb.prepare(`
        SELECT id FROM photo_requests WHERE product_id = ? AND status = 'pending'
      `).get(productId);

      if (!existing) {
        rawDb.prepare(`
          INSERT INTO photo_requests (product_id, status) VALUES (?, 'pending')
        `).run(productId);
      }

      // Broadcast to mobile app via WebSocket
      broadcastToMobiles('PHOTO_REQUEST', {
        product_id: productId,
        product_name: productName
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Get list of invoice captures (unprocessed invoices)
  ipcMain.handle('mobile:get-invoice-queue', async () => {
    try {
      const queue = db().prepare(`
        SELECT id, file_path as filePath, prompt_used as promptUsed, status, created_at as createdAt
        FROM invoice_captures
        WHERE status = 'new'
        ORDER BY created_at DESC
      `).all();
      return { success: true, data: queue };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Mark an invoice capture as processed
  ipcMain.handle('mobile:mark-invoice-processed', async (_e, id: number) => {
    try {
      db().prepare(`
        UPDATE invoice_captures SET status = 'processed' WHERE id = ?
      `).run(id);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  console.log('[IPC] Mobile integration IPC handlers registered');
}
