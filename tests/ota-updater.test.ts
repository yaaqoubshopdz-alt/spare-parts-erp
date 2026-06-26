import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Setup mock directories
const mockUserDataDir = path.join(__dirname, '../scratch/mock_userData');
const mockAppDir = path.join(__dirname, '../scratch/mock_app');

// Mock electron
vi.mock('electron', () => {
  const path = require('path');
  const mockUserDataDir = path.join(__dirname, '../scratch/mock_userData');
  const mockAppDir = path.join(__dirname, '../scratch/mock_app');
  return {
    app: {
      getPath: (name: string) => {
        if (name === 'userData') {
          return mockUserDataDir;
        }
        return '';
      },
      getAppPath: () => {
        return mockAppDir;
      }
    },
    dialog: {},
    BrowserWindow: {}
  };
});

import { OtaUpdaterService } from '../electron/services/ota-updater.service';

describe('OtaUpdaterService - Packaging and Version Integrity', () => {
  const updatesDir = path.join(mockUserDataDir, 'updates');
  const packagedManifestPath = path.join(mockAppDir, 'dist/renderer/manifest.json');

  beforeEach(() => {
    // Ensure clean directories
    if (fs.existsSync(mockUserDataDir)) {
      fs.rmSync(mockUserDataDir, { recursive: true, force: true });
    }
    fs.mkdirSync(mockUserDataDir, { recursive: true });

    if (fs.existsSync(mockAppDir)) {
      fs.rmSync(mockAppDir, { recursive: true, force: true });
    }
    fs.mkdirSync(mockAppDir, { recursive: true });
  });

  afterEach(() => {
    // Clean mock directories
    if (fs.existsSync(mockUserDataDir)) {
      fs.rmSync(mockUserDataDir, { recursive: true, force: true });
    }
    if (fs.existsSync(mockAppDir)) {
      fs.rmSync(mockAppDir, { recursive: true, force: true });
    }
  });

  it('should not clear updates directory if packaged manifest matches saved hash', () => {
    // 1. Create a dummy packaged manifest inside mock app
    const manifestContent = JSON.stringify({ 'assets/index.js': 'hash123' });
    fs.mkdirSync(path.dirname(packagedManifestPath), { recursive: true });
    fs.writeFileSync(packagedManifestPath, manifestContent);
    const packagedHash = crypto.createHash('md5').update(manifestContent).digest('hex');

    // 2. Create the updates directory with dummy update files and the correct saved hash
    fs.mkdirSync(updatesDir, { recursive: true });
    fs.writeFileSync(path.join(updatesDir, 'packaged_manifest_hash.txt'), packagedHash);
    fs.writeFileSync(path.join(updatesDir, 'index.html'), '<html>old</html>');
    fs.writeFileSync(path.join(updatesDir, 'manifest.json'), JSON.stringify({}));

    // 3. Get updates index path (this triggers checkPackagedVersion)
    const indexPath = OtaUpdaterService.getUpdatesIndexPath();

    // 4. Verify updates directory remains intact and indexPath is returned
    expect(indexPath).toBe(path.join(updatesDir, 'index.html'));
    expect(fs.existsSync(path.join(updatesDir, 'index.html'))).toBe(true);
    expect(fs.readFileSync(path.join(updatesDir, 'packaged_manifest_hash.txt'), 'utf8')).toBe(packagedHash);
  });

  it('should clear updates directory if packaged manifest does not match saved hash', () => {
    // 1. Create a dummy packaged manifest inside mock app
    const manifestContent = JSON.stringify({ 'assets/index.js': 'hash123' });
    fs.mkdirSync(path.dirname(packagedManifestPath), { recursive: true });
    fs.writeFileSync(packagedManifestPath, manifestContent);
    const packagedHash = crypto.createHash('md5').update(manifestContent).digest('hex');

    // 2. Create the updates directory with dummy update files and a different (outdated) saved hash
    fs.mkdirSync(updatesDir, { recursive: true });
    fs.writeFileSync(path.join(updatesDir, 'packaged_manifest_hash.txt'), 'stalehash');
    fs.writeFileSync(path.join(updatesDir, 'index.html'), '<html>old</html>');
    fs.writeFileSync(path.join(updatesDir, 'manifest.json'), JSON.stringify({}));

    // 3. Get updates index path
    const indexPath = OtaUpdaterService.getUpdatesIndexPath();

    // 4. Verify updates directory was cleared and getUpdatesIndexPath returns null
    expect(indexPath).toBeNull();
    expect(fs.existsSync(path.join(updatesDir, 'index.html'))).toBe(false);
    expect(fs.existsSync(path.join(updatesDir, 'manifest.json'))).toBe(false);
    
    // 5. Verify the new packaged manifest hash is now saved
    expect(fs.existsSync(path.join(updatesDir, 'packaged_manifest_hash.txt'))).toBe(true);
    expect(fs.readFileSync(path.join(updatesDir, 'packaged_manifest_hash.txt'), 'utf8')).toBe(packagedHash);
  });

  it('should clear updates directory and initialize hash if no hash exists', () => {
    // 1. Create a dummy packaged manifest inside mock app
    const manifestContent = JSON.stringify({ 'assets/index.js': 'hash123' });
    fs.mkdirSync(path.dirname(packagedManifestPath), { recursive: true });
    fs.writeFileSync(packagedManifestPath, manifestContent);
    const packagedHash = crypto.createHash('md5').update(manifestContent).digest('hex');

    // 2. Create the updates directory with dummy update files but NO hash file
    fs.mkdirSync(updatesDir, { recursive: true });
    fs.writeFileSync(path.join(updatesDir, 'index.html'), '<html>old</html>');
    fs.writeFileSync(path.join(updatesDir, 'manifest.json'), JSON.stringify({}));

    // 3. Get updates index path
    const indexPath = OtaUpdaterService.getUpdatesIndexPath();

    // 4. Verify updates directory was cleared and getUpdatesIndexPath returns null
    expect(indexPath).toBeNull();
    expect(fs.existsSync(path.join(updatesDir, 'index.html'))).toBe(false);
    
    // 5. Verify the new packaged manifest hash is now saved
    expect(fs.existsSync(path.join(updatesDir, 'packaged_manifest_hash.txt'))).toBe(true);
    expect(fs.readFileSync(path.join(updatesDir, 'packaged_manifest_hash.txt'), 'utf8')).toBe(packagedHash);
  });
});
