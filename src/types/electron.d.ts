/**
 * Electron API type declarations for renderer process
 */
export interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: (...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
  isMock?: boolean;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
