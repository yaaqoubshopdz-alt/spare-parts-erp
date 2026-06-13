/**
 * Mobile WebSocket Server
 * خادم WebSocket للاتصال الفوري مع الهاتف (مسح الباركود)
 */
import { WebSocketServer, WebSocket } from 'ws';
import { BrowserWindow } from 'electron';
import http from 'http';
import { DatabaseService } from '../services/database.service';

let wss: WebSocketServer | null = null;
let wsHttpServer: http.Server | null = null;
const connectedClients = new Set<WebSocket>();

export function startWebSocketServer(port: number): void {
  if (wss) return;

  wsHttpServer = http.createServer((req, res) => {
    res.writeHead(404);
    res.end();
  });

  wsHttpServer.on('error', (err: any) => {
    console.error('[WebSocketServer] Underlay HTTP server error:', err);
    stopWebSocketServer();
  });

  wss = new WebSocketServer({ server: wsHttpServer });
  connectedClients.clear();

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WebSocketServer] Mobile client connected');
    connectedClients.add(ws);

    // Send initial configuration or check connection
    ws.send(JSON.stringify({ type: 'CONNECTION_ACK', data: { version: '1.0.0' } }));

    ws.on('message', (message: string) => {
      try {
        const payload = JSON.parse(message);
        console.log('[WebSocketServer] Received:', payload);
        handleIncomingMessage(payload, ws);
      } catch (err) {
        console.error('[WebSocketServer] Error parsing message:', err);
      }
    });

    ws.on('close', () => {
      console.log('[WebSocketServer] Mobile client disconnected');
      connectedClients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[WebSocketServer] Client error:', err);
      connectedClients.delete(ws);
    });
  });

  wss.on('error', (error) => {
    console.error('[WebSocketServer] Server error:', error);
  });

  try {
    wsHttpServer.listen(port, () => {
      console.log(`[WebSocketServer] Listening on port ${port}`);
    });
  } catch (err: any) {
    console.error('[WebSocketServer] Server listen exception:', err);
    stopWebSocketServer();
  }
}

export function stopWebSocketServer(): void {
  if (wsHttpServer) {
    try {
      wsHttpServer.removeAllListeners('error');
    } catch {}
  }

  // Close all client connections first
  for (const client of connectedClients) {
    try {
      client.close();
    } catch {}
  }
  connectedClients.clear();

  if (wss) {
    try {
      wss.close();
    } catch {}
    wss = null;
  }

  if (wsHttpServer) {
    try {
      wsHttpServer.close();
    } catch {}
    wsHttpServer = null;
  }
  console.log('[WebSocketServer] Stopped');
}

/**
 * Send a WebSocket message to all connected mobile clients
 */
export function broadcastToMobiles(type: string, data: any): void {
  const payload = JSON.stringify({ type, data });
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

/**
 * Handle messages received from the mobile app
 */
function handleIncomingMessage(payload: { type: string; data: any }, ws: WebSocket): void {
  const { type, data } = payload;

  switch (type) {
    case 'BARCODE_SCAN':
      if (data && data.barcode) {
        console.log(`[WebSocketServer] Barcode scanned: ${data.barcode}`);
        
        let found = false;
        let name = 'منتج غير معروف';
        let price: number | null = null;
        let quantity: number | null = null;

        try {
          const rawDb = DatabaseService.getRawDb();
          const product = rawDb.prepare(`
            SELECT p.id, p.name, p.retail_price as price, COALESCE(sb.quantity, 0) as quantity
            FROM products p
            LEFT JOIN (
              SELECT product_id, SUM(quantity) as quantity
              FROM stock_balances
              GROUP BY product_id
            ) sb ON p.id = sb.product_id
            WHERE p.is_active = 1
              AND (
                p.barcode = ? 
                OR p.internal_code = ? 
                OR p.id IN (SELECT product_id FROM product_barcodes WHERE barcode = ?)
              )
            LIMIT 1
          `).get(data.barcode, data.barcode, data.barcode) as any;

          if (product) {
            found = true;
            name = product.name;
            price = product.price;
            quantity = product.quantity;
          }
        } catch (dbErr) {
          console.error('[WebSocketServer] Error querying barcode in DB:', dbErr);
        }

        // Dispatch to Electron Renderer (POS, details, etc.)
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0 && windows[0]) {
          windows[0].webContents.send('mobile:barcode-scanned', { barcode: data.barcode, found, name, price, quantity });
          ws.send(JSON.stringify({ 
            type: 'BARCODE_ACK', 
            data: { 
              success: true, 
              barcode: data.barcode,
              found,
              name,
              price,
              quantity
            } 
          }));
        } else {
          ws.send(JSON.stringify({ type: 'BARCODE_ACK', data: { success: false, error: 'Desktop window not active' } }));
        }
      }
      break;

    case 'IMPORT_INVOICE_JSON':
      if (data && data.json) {
        console.log('[WebSocketServer] Received AI Invoice JSON import request');
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0 && windows[0]) {
          windows[0].webContents.send('mobile:import-invoice-json', { json: data.json });
          ws.send(JSON.stringify({ type: 'IMPORT_INVOICE_ACK', data: { success: true } }));
        } else {
          ws.send(JSON.stringify({ type: 'IMPORT_INVOICE_ACK', data: { success: false, error: 'Desktop window not active' } }));
        }
      }
      break;

    case 'PING':
      ws.send(JSON.stringify({ type: 'PONG', data: {} }));
      break;

    default:
      console.warn(`[WebSocketServer] Unknown message type: ${type}`);
  }
}
