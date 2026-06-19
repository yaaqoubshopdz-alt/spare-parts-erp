import { app, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';

const MANIFEST_URL = 'https://raw.githubusercontent.com/yaaqoubshopdz-alt/spare-parts-erp/main/dist/renderer/manifest.json';
const BASE_ASSETS_URL = 'https://raw.githubusercontent.com/yaaqoubshopdz-alt/spare-parts-erp/main/dist/renderer/';

export class OtaUpdaterService {
  private static updatesDir = path.join(app.getPath('userData'), 'updates');
  private static tempDir = path.join(app.getPath('userData'), 'updates_temp');
  private static isUpdating = false;

  /**
   * Helper to download file from URL to local path
   */
  private static downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ensure directory exists
      fs.mkdirSync(path.dirname(destPath), { recursive: true });

      const file = fs.createWriteStream(destPath);
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destPath);
          reject(new Error(`Failed to download ${url}: HTTP Status ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
        reject(err);
      });
    });
  }

  /**
   * Helper to download JSON data
   */
  private static fetchJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch JSON: HTTP Status ${response.statusCode}`));
          return;
        }

        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Helper to compute MD5 hash of file content
   */
  private static computeFileHash(filePath: string): string {
    if (!fs.existsSync(filePath)) return '';
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Copy folder recursively
   */
  private static copyFolderRecursive(src: string, dest: string) {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyFolderRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Clean directory recursively
   */
  private static cleanDirectory(dirPath: string) {
    if (!fs.existsSync(dirPath)) return;
    fs.rmSync(dirPath, { recursive: true, force: true });
  }

  /**
   * Checks if an update exists, downloads it atomically, and returns status
   */
  public static async checkForUpdates(windowToPrompt?: BrowserWindow): Promise<{ success: boolean; updated: boolean; error?: string }> {
    if (this.isUpdating) {
      console.log('[OTA Updater] Update check already in progress...');
      return { success: false, updated: false, error: 'Update in progress' };
    }

    this.isUpdating = true;
    console.log('[OTA Updater] Fetching remote manifest...');

    try {
      // 1. Fetch remote manifest.json
      const remoteManifest = await this.fetchJson(MANIFEST_URL);
      if (!remoteManifest || typeof remoteManifest !== 'object') {
        throw new Error('Invalid remote manifest format');
      }

      // 2. Read local manifest
      const localManifestPath = path.join(this.updatesDir, 'manifest.json');
      let localManifest: Record<string, string> = {};
      if (fs.existsSync(localManifestPath)) {
        try {
          localManifest = JSON.parse(fs.readFileSync(localManifestPath, 'utf8'));
        } catch (e) {
          console.warn('[OTA Updater] Local manifest corrupted, ignoring local cache');
        }
      }

      // 3. Determine which files are modified or missing
      const filesToDownload: string[] = [];
      for (const [filePath, remoteHash] of Object.entries(remoteManifest)) {
        const localFilePath = path.join(this.updatesDir, filePath);
        const localHash = localManifest[filePath] || this.computeFileHash(localFilePath);

        if (localHash !== remoteHash) {
          filesToDownload.push(filePath);
        }
      }

      // 4. If no files to download, we are up-to-date
      if (filesToDownload.length === 0) {
        console.log('[OTA Updater] Application is already up-to-date.');
        this.isUpdating = false;
        return { success: true, updated: false };
      }

      console.log(`[OTA Updater] Found ${filesToDownload.length} modified/missing files. Downloading...`);

      // 5. Clean and prepare temp directory
      this.cleanDirectory(this.tempDir);
      fs.mkdirSync(this.tempDir, { recursive: true });

      // 6. Download files into updates_temp/
      for (const filePath of filesToDownload) {
        const fileUrl = `${BASE_ASSETS_URL}${filePath}`;
        const tempFilePath = path.join(this.tempDir, filePath);
        
        console.log(`[OTA Updater] Downloading ${filePath}...`);
        await this.downloadFile(fileUrl, tempFilePath);

        // Verify hash of downloaded file matches remote hash
        const downloadedHash = this.computeFileHash(tempFilePath);
        if (downloadedHash !== remoteManifest[filePath]) {
          throw new Error(`Hash mismatch for downloaded file: ${filePath}`);
        }
      }

      // Download index.html itself if it wasn't modified but needs to be in tempDir
      // Actually, to make updates_temp a complete, runnable directory, we should copy
      // the existing unmodified files from updatesDir to tempDir, or copy from the app's default resources
      // so updates_temp has EVERYTHING listed in the remote manifest.
      for (const filePath of Object.keys(remoteManifest)) {
        const tempFilePath = path.join(this.tempDir, filePath);
        if (!fs.existsSync(tempFilePath)) {
          const localPath = path.join(this.updatesDir, filePath);
          const defaultPath = path.join(__dirname, '../renderer', filePath);

          if (fs.existsSync(localPath)) {
            fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
            fs.copyFileSync(localPath, tempFilePath);
          } else if (fs.existsSync(defaultPath)) {
            fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
            fs.copyFileSync(defaultPath, tempFilePath);
          } else {
            // If it doesn't exist locally anywhere, download it!
            const fileUrl = `${BASE_ASSETS_URL}${filePath}`;
            await this.downloadFile(fileUrl, tempFilePath);
          }
        }
      }

      // Write remote manifest to updates_temp/manifest.json
      fs.writeFileSync(
        path.join(this.tempDir, 'manifest.json'),
        JSON.stringify(remoteManifest, null, 2),
        'utf8'
      );

      // 7. Atomic Swap: Copy updates_temp contents into updates/
      console.log('[OTA Updater] Swapping temporary update directory to production...');
      this.copyFolderRecursive(this.tempDir, this.updatesDir);
      this.cleanDirectory(this.tempDir);

      console.log('[OTA Updater] Hot OTA Update successfully applied locally!');
      this.isUpdating = false;

      // 8. Prompt user to restart/reload if window is provided
      if (windowToPrompt) {
        dialog.showMessageBox(windowToPrompt, {
          type: 'info',
          title: 'تحديث جديد متوفر',
          message: 'تم تحميل تحديثات جديدة للبرنامج بنجاح! هل تريد إعادة تشغيل الواجهة الآن لتطبيق التحديثات؟',
          buttons: ['تحديث الآن', 'لاحقاً'],
          defaultId: 0,
          cancelId: 1
        }).then((res) => {
          if (res.response === 0) {
            windowToPrompt.reload();
          }
        });
      }

      return { success: true, updated: true };
    } catch (e: any) {
      console.error('[OTA Updater] Failed to perform OTA update:', e.message);
      this.cleanDirectory(this.tempDir);
      this.isUpdating = false;
      return { success: false, updated: false, error: e.message };
    }
  }

  /**
   * Checks if an update directory exists and has a valid manifest
   */
  public static getUpdatesIndexPath(): string | null {
    const updatesIndex = path.join(this.updatesDir, 'index.html');
    const localManifest = path.join(this.updatesDir, 'manifest.json');
    if (fs.existsSync(updatesIndex) && fs.existsSync(localManifest)) {
      return updatesIndex;
    }
    return null;
  }
}
