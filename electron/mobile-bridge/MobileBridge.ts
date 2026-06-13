/**
 * MobileBridge Orchestrator
 * إدارة تشغيل وإيقاف خوادم الاتصال بالهاتف وجلب عنوان IP المحلي
 */
import os from 'os';
import { startWebSocketServer, stopWebSocketServer } from './WebSocketServer';
import { startHttpServer, stopHttpServer } from './HttpServer';
import { startUdpDiscoveryServer, stopUdpDiscoveryServer } from './UdpDiscoveryServer';

export interface MobileServerInfo {
  ip: string;
  wsPort: number;
  httpPort: number;
  isConnected: boolean;
}

let isBridgeRunning = false;

export const MobileBridge = {
  /**
   * Start both WebSocket and HTTP Servers
   */
  start(): void {
    if (isBridgeRunning) return;
    
    try {
      console.log('[MobileBridge] Starting bridge...');
      const ip = this.getLocalIp();
      startWebSocketServer(8765);
      startHttpServer(8766);
      startUdpDiscoveryServer(ip);
      isBridgeRunning = true;
      console.log('[MobileBridge] Bridge started successfully');
    } catch (error) {
      console.error('[MobileBridge] Failed to start bridge:', error);
    }
  },

  /**
   * Stop both servers
   */
  stop(): void {
    if (!isBridgeRunning) return;
    
    try {
      console.log('[MobileBridge] Stopping bridge...');
      stopWebSocketServer();
      stopHttpServer();
      stopUdpDiscoveryServer();
      isBridgeRunning = false;
      console.log('[MobileBridge] Bridge stopped');
    } catch (error) {
      console.error('[MobileBridge] Failed to stop bridge:', error);
    }
  },

  /**
   * Get server connection info for mobile client
   */
  getServerInfo(): MobileServerInfo {
    const ip = this.getLocalIp();
    return {
      ip,
      wsPort: 8765,
      httpPort: 8766,
      isConnected: isBridgeRunning,
    };
  },

  /**
   * Get local IPv4 address
   */
  getLocalIp(): string {
    const interfaces = os.networkInterfaces();
    
    // 1. First preference: 192.168.x.x (standard home/shop routers)
    for (const name of Object.keys(interfaces)) {
      const netInterface = interfaces[name];
      if (!netInterface) continue;
      for (const net of netInterface) {
        if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.')) {
          return net.address;
        }
      }
    }

    // 2. Second preference: 172.x.x.x (standard private ranges)
    for (const name of Object.keys(interfaces)) {
      const netInterface = interfaces[name];
      if (!netInterface) continue;
      for (const net of netInterface) {
        if (net.family === 'IPv4' && !net.internal && net.address.startsWith('172.')) {
          return net.address;
        }
      }
    }

    // 3. Third preference: 10.x.x.x (corporate/enterprise ranges)
    for (const name of Object.keys(interfaces)) {
      const netInterface = interfaces[name];
      if (!netInterface) continue;
      for (const net of netInterface) {
        if (net.family === 'IPv4' && !net.internal && net.address.startsWith('10.')) {
          return net.address;
        }
      }
    }
    
    // Fallback to any external IPv4 if no standard subnet matches first
    for (const name of Object.keys(interfaces)) {
      const netInterface = interfaces[name];
      if (!netInterface) continue;
      for (const net of netInterface) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    
    return '127.0.0.1';
  }
};
