import fs from 'fs';
import path from 'path';
import { DatabaseService } from './database.service';

export const BackupService = {
  getRawDb() {
    return DatabaseService.getRawDb();
  },

  getSetting(key: string): string {
    try {
      const db = this.getRawDb();
      const row: any = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
      return row ? row.value : '';
    } catch {
      return '';
    }
  },

  setSetting(key: string, value: string): void {
    try {
      const db = this.getRawDb();
      const check: any = db.prepare('SELECT count(*) as c FROM app_settings WHERE key = ?').get(key);
      if (check.c > 0) {
        db.prepare("UPDATE app_settings SET value = ?, updated_at = datetime('now') WHERE key = ?").run(value, key);
      } else {
        db.prepare("INSERT INTO app_settings (key, value, type, updated_at) VALUES (?, ?, 'string', datetime('now'))").run(key, value);
      }
    } catch (e) {
      console.error(`[BackupService] Failed to save setting ${key}:`, e);
    }
  },

  async runAutoBackup(): Promise<boolean> {
    try {
      const enabled = this.getSetting('auto_backup_enabled');
      const directory = this.getSetting('auto_backup_directory');
      const interval = this.getSetting('auto_backup_interval') || 'daily';

      if (enabled !== 'true' || !directory) {
        return false;
      }

      // Check if folder exists
      if (!fs.existsSync(directory)) {
        console.warn(`[BackupService] Auto backup directory does not exist: ${directory}`);
        return false;
      }

      const lastBackupStr = this.getSetting('last_auto_backup_time');
      const now = new Date();

      let shouldBackup = false;

      if (!lastBackupStr) {
        shouldBackup = true;
      } else {
        const lastBackup = new Date(lastBackupStr);
        if (isNaN(lastBackup.getTime())) {
          shouldBackup = true;
        } else if (interval === '5h') {
          // Check if 5 hours have passed
          const hoursElapsed = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);
          if (hoursElapsed >= 5) {
            shouldBackup = true;
          }
        } else {
          // Default: daily (calendar day has changed)
          const lastDay = lastBackup.toDateString();
          const currentDay = now.toDateString();
          if (lastDay !== currentDay) {
            shouldBackup = true;
          }
        }
      }

      if (!shouldBackup) {
        return false;
      }

      console.log('[BackupService] Starting auto backup...');
      const dbPath = DatabaseService.getDbPath();
      if (!fs.existsSync(dbPath)) {
        console.error('[BackupService] Database file not found at', dbPath);
        return false;
      }

      // Format date: YYYY-MM-DD_HH-mm-ss
      const timestamp = now.toISOString()
        .replace(/T/, '_')
        .replace(/:/g, '-')
        .split('.')[0];
      
      const backupFileName = `spare_parts_auto_backup_${timestamp}.db`;
      const targetPath = path.join(directory, backupFileName);

      fs.copyFileSync(dbPath, targetPath);
      console.log(`[BackupService] Auto backup completed successfully: ${targetPath}`);

      // Update last backup time
      this.setSetting('last_auto_backup_time', now.toISOString());
      return true;
    } catch (e: any) {
      console.error('[BackupService] Error during auto backup:', e.message);
      return false;
    }
  },

  startScheduler(): void {
    console.log('[BackupService] Auto backup scheduler started');
    // Run initial check on app startup (after 5 seconds to let DB initialize fully)
    setTimeout(() => {
      this.runAutoBackup();
    }, 5000);

    // Check periodically (every 5 minutes)
    setInterval(() => {
      this.runAutoBackup();
    }, 5 * 60 * 1000);
  }
};
