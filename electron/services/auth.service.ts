/**
 * CM_02 - Auth Service (بدون JWT)
 * جلسة محلية فقط عبر electron-store
 */
import bcrypt from 'bcryptjs';
import Store from 'electron-store';
import { DatabaseService } from './database.service';

const store = new Store({ name: 'auth-store', encryptionKey: 'spare-parts-erp-secret-2024' });

export interface AuthResult {
  success: boolean;
  user?: any;
  error?: string;
}

export const AuthService = {
  /**
   * Authenticates a user with username and password.
   * No JWT - session stored locally in electron-store.
   */
  async authenticate(username: string, password: string): Promise<AuthResult> {
    try {
      // Check lockout
      const lockoutTime = store.get(`lockout_${username}`) as number;
      if (lockoutTime && Date.now() < lockoutTime) {
        const remaining = Math.ceil((lockoutTime - Date.now()) / 1000 / 60);
        return { success: false, error: `تم قفل الحساب. جرب بعد ${remaining} دقائق` };
      }

      const raw = DatabaseService.getRawDb();

      console.log(`[AuthService] Login attempt: ${username}`);
      const user: any = raw.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);

      if (!user) {
        return { success: false, error: 'المستخدم غير موجود أو الحساب معطل' };
      }

      // Verify password (bcrypt)
      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        const attempts = (store.get(`failed_attempts_${username}`) as number || 0) + 1;
        store.set(`failed_attempts_${username}`, attempts);

        if (attempts >= 5) {
          store.set(`lockout_${username}`, Date.now() + 5 * 60 * 1000);
        }

        return { success: false, error: 'كلمة المرور غير صحيحة' };
      }

      // Success - reset attempts
      store.delete(`failed_attempts_${username}`);
      store.delete(`lockout_${username}`);

      // Update last login
      raw.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

      // Store session (no JWT, just user data + expiry)
      const session = {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          full_name: user.full_name,
          avatar: user.avatar || '',
          color: user.color || 'blue',
          permissions: user.permissions || null,
        },
        loginAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
      };
      store.set('session', session);

      const { password_hash, ...userSafe } = user;
      return { success: true, user: userSafe };
    } catch (error: any) {
      console.error('[AuthService] Error:', error);
      return { success: false, error: 'خطأ داخلي في الخادم' };
    }
  },

  /**
   * Check if there's a valid session
   */
  async checkSession(): Promise<AuthResult> {
    const session: any = store.get('session');

    if (!session || !session.user) {
      return { success: false, error: 'لا توجد جلسة نشطة' };
    }

    if (Date.now() > session.expiresAt) {
      store.delete('session');
      return { success: false, error: 'انتهت صلاحية الجلسة' };
    }

    return { success: true, user: session.user };
  },

  /**
   * Clear current session
   */
  async logout(): Promise<void> {
    store.delete('session');
  },

  /**
   * Change user password
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<AuthResult> {
    try {
      const raw = DatabaseService.getRawDb();
      const user: any = raw.prepare('SELECT * FROM users WHERE id = ?').get(userId);

      if (!user) return { success: false, error: 'المستخدم غير موجود' };

      const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
      if (!isMatch) return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };

      const newHash = bcrypt.hashSync(newPassword, 12);
      raw.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Fast authentication via PIN (Daily Fast Access)
   */
  async loginByPin(userId: number, pin: string): Promise<AuthResult> {
    try {
      const raw = DatabaseService.getRawDb();
      const user: any = raw.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(userId);

      if (!user) {
        return { success: false, error: 'المستخدم غير موجود أو الحساب معطل' };
      }

      if (!user.pin_code) {
        return { success: false, error: 'لم يتم تعيين رمز PIN لهذا المستخدم بعد' };
      }

      if (user.pin_code !== pin) {
        return { success: false, error: 'رمز PIN غير صحيح' };
      }

      // Update last login
      raw.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

      // Store session (no JWT, just user data + expiry)
      const session = {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          full_name: user.full_name,
          avatar: user.avatar || '',
          color: user.color || 'blue',
          permissions: user.permissions || null,
        },
        loginAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours for daily session
      };
      store.set('session', session);

      const { password_hash, ...userSafe } = user;
      return { success: true, user: userSafe };
    } catch (error: any) {
      console.error('[AuthService] Pin Login Error:', error);
      return { success: false, error: 'خطأ داخلي في الخادم' };
    }
  },

  /**
   * Verify user PIN code (for approvals)
   */
  async verifyPin(pin: string): Promise<AuthResult> {
    try {
      const session: any = store.get('session');
      if (!session || !session.user) {
        return { success: false, error: 'لا توجد جلسة نشطة' };
      }

      const raw = DatabaseService.getRawDb();
      const user: any = raw.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(session.user.id);
      if (!user) return { success: false, error: 'المستخدم غير موجود' };
      if (!user.pin_code) return { success: false, error: 'لم يتم تعيين رمز PIN لهذا المستخدم' };

      if (user.pin_code !== pin) return { success: false, error: 'رمز PIN غير صحيح' };

      return { success: true, user: session.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Direct login by userId (no PIN or password, used for first-time launch user cards selection)
   */
  async loginDirect(userId: number): Promise<AuthResult> {
    try {
      const raw = DatabaseService.getRawDb();
      const user: any = raw.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(userId);

      if (!user) {
        return { success: false, error: 'المستخدم غير موجود أو الحساب معطل' };
      }

      // Update last login
      raw.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

      // Store session (no JWT, just user data + expiry)
      const session = {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          full_name: user.full_name,
          avatar: user.avatar || '',
          color: user.color || 'blue',
          permissions: user.permissions || null,
        },
        loginAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours for daily session
      };
      store.set('session', session);

      const { password_hash, ...userSafe } = user;
      return { success: true, user: userSafe };
    } catch (error: any) {
      console.error('[AuthService] Direct Login Error:', error);
      return { success: false, error: 'خطأ داخلي في الخادم' };
    }
  },

  /**
   * Verify user password (for personal profile changes/account info gating)
   */
  async verifyPassword(userId: number, password: string): Promise<AuthResult> {
    try {
      const raw = DatabaseService.getRawDb();
      const user: any = raw.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(userId);

      if (!user) {
        return { success: false, error: 'المستخدم غير موجود أو الحساب معطل' };
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return { success: false, error: 'كلمة المرور غير صحيحة' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('[AuthService] Verify Password Error:', error);
      return { success: false, error: 'خطأ داخلي في الخادم' };
    }
  },
};

