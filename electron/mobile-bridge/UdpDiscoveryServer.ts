/**
 * UDP Discovery Server
 * خادم بث UDP لإعلام تطبيق الهاتف بعناوين الاتصال تلقائياً
 */
import dgram from 'dgram';

let udpSocket: dgram.Socket | null = null;
let broadcastInterval: NodeJS.Timeout | null = null;
const UDP_PORT = 8769;

export function startUdpDiscoveryServer(localIp: string): void {
  if (udpSocket) return;

  udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

  udpSocket.on('error', (err) => {
    console.error('[UdpDiscovery] Socket error:', err);
    stopUdpDiscoveryServer();
  });

  udpSocket.bind(() => {
    try {
      udpSocket?.setBroadcast(true);
      console.log(`[UdpDiscovery] Socket bound and broadcasting on port ${UDP_PORT}`);

      // Broadcast every 3 seconds
      broadcastInterval = setInterval(() => {
        try {
          if (!udpSocket) return;

          const payload = JSON.stringify({
            serverName: 'YKMS ERP',
            ip: localIp,
            wsPort: 8765,
            httpPort: 8766,
            timestamp: Date.now()
          });

          const message = Buffer.from(payload);
          udpSocket.send(message, 0, message.length, UDP_PORT, '255.255.255.255', (err) => {
            if (err) {
              console.error('[UdpDiscovery] Failed to send broadcast packet:', err);
            }
          });
        } catch (error) {
          console.error('[UdpDiscovery] Error broadcasting payload:', error);
        }
      }, 3000);
    } catch (bindError) {
      console.error('[UdpDiscovery] Failed to set broadcast or bind:', bindError);
    }
  });
}

export function stopUdpDiscoveryServer(): void {
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
  }
  if (udpSocket) {
    try {
      udpSocket.removeAllListeners('error');
      udpSocket.close();
    } catch (closeErr) {
      console.error('[UdpDiscovery] Error closing socket:', closeErr);
    }
    udpSocket = null;
  }
  console.log('[UdpDiscovery] Server stopped');
}
