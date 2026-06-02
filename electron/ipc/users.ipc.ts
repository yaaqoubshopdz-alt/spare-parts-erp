/**
 * Users IPC — إدارة المستخدمين (owner/manager فقط)
 */
import { ipcMain } from 'electron';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../services/database.service';

export function registerUsersIPC() {
  const db = () => DatabaseService.getRawDb();

  ipcMain.handle('db:users:getActiveList', async () => {
    try {
      const users = db().prepare(`
        SELECT id, username, full_name, role, avatar, color
        FROM users 
        WHERE is_active = 1 
        ORDER BY id ASC
      `).all();
      return { success: true, data: users };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:users:getAll', async () => {
    try {
      const users = db().prepare(`
        SELECT id, username, full_name, role, is_active, avatar, color, pin_code, permissions, created_at, last_login
        FROM users ORDER BY id ASC
      `).all();
      return { success: true, data: users };
    } catch (e: any) { return { success: false, error: e.message }; }
  });


  ipcMain.handle('db:users:create', async (_e, data: {
    username: string; password: string; full_name: string;
    role: string; pin_code?: string; avatar?: string; color?: string;
    permissions?: string;
  }) => {
    try {
      const raw = db();
      const exists: any = raw.prepare('SELECT id FROM users WHERE username = ?').get(data.username);
      if (exists) return { success: false, error: 'اسم المستخدم موجود مسبقاً' };

      const hash = bcrypt.hashSync(data.password, 12);
      const result = raw.prepare(`
        INSERT INTO users (username, password_hash, full_name, role, pin_code, avatar, color, permissions, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
      `).run(data.username, hash, data.full_name, data.role, data.pin_code || null, data.avatar || null, data.color || 'blue', data.permissions || null);
      return { success: true, id: result.lastInsertRowid };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:users:update', async (_e, id: number, data: Record<string, any>) => {
    try {
      if (data.username !== undefined) {
        const exists: any = db().prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(data.username, id);
        if (exists) return { success: false, error: 'اسم المستخدم هذا مستخدم بالفعل من قبل شخص آخر' };
      }
      const fields = ['username', 'full_name', 'role', 'pin_code', 'avatar', 'color', 'is_active', 'permissions'].filter(f => data[f] !== undefined);
      if (!fields.length) return { success: false, error: 'لا توجد تعديلات' };
      const set = fields.map(f => `${f} = ?`).join(', ');
      const vals = fields.map(f => {
        const val = data[f];
        return typeof val === 'boolean' ? (val ? 1 : 0) : val;
      });
      db().prepare(`UPDATE users SET ${set} WHERE id = ?`).run(...vals, id);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('db:users:resetPassword', async (_e, userId: number, newPassword: string) => {
    try {
      const hash = bcrypt.hashSync(newPassword, 12);
      db().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── التحقق من رمز PIN للمدير (للعمليات الحساسة) ──────────────────
  ipcMain.handle('db:users:verifyPin', async (_e, pin: string) => {
    try {
      const user: any = db().prepare(
        "SELECT id, username, full_name, role FROM users WHERE pin_code = ? AND role IN ('owner', 'admin', 'manager') AND is_active = 1"
      ).get(pin);
      
      if (user) {
        return { success: true, id: user.id, name: user.full_name, role: user.role };
      }
      return { success: false, error: 'رمز المدير غير صحيح' };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  console.log('[IPC] Users handlers registered');
}
