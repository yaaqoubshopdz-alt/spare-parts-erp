/**
 * LoginPage - صفحة تسجيل الدخول
 * نسخة مبسطة بدون أي sync تدعم اختيار المستخدم السينمائي والـ PIN
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/auth.store';
import { Eye, EyeOff, LogIn, Wrench, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import CinematicUserPicker from './CinematicUserPicker';
import { logoData } from './logoData';

export default function LoginPage() {
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();

  // Auto redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('يرجى ملء جميع الحقول');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await login(username, password);
      if (result.success) {
        // توسيع النافذة من حجم الدخول إلى الحجم الكامل
        try {
          await window.electronAPI.invoke('window:expand');
        } catch {}
        navigate('/dashboard');
      } else {
        setError(result.error || 'خطأ في تسجيل الدخول');
      }
    } catch (err: any) {
      setError('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  if (!showPasswordLogin) {
    return (
      <div className="h-screen w-screen overflow-y-auto bg-background_primary flex items-center justify-center">
        <CinematicUserPicker onTogglePasswordLogin={() => setShowPasswordLogin(true)} />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-y-auto bg-background_primary flex items-center justify-center p-5 font-cairo">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6 select-none flex flex-col items-center">
          {logoData ? (
            <motion.div
              whileHover={{ scale: 1.08, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              animate={{ 
                y: [0, -4, 0],
              }}
              transition={{
                y: {
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                type: 'spring',
                stiffness: 300,
                damping: 15
              }}
              className="relative w-24 h-24 rounded-full bg-white dark:bg-slate-900/60 p-0.5 border-2 border-primary_blue/40 shadow-xl shadow-primary_blue/20 flex items-center justify-center mb-3 backdrop-blur-md overflow-hidden cursor-pointer group"
            >
              {/* Subtle background glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary_blue/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <img 
                src={logoData} 
                alt="App Logo" 
                className="w-full h-full object-contain rounded-full transition-transform duration-300 group-hover:scale-[1.4] scale-[1.35]" 
              />
            </motion.div>
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary_blue to-blue-700 mb-3 shadow-lg shadow-primary_blue/30">
              <Wrench className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-text_primary">
            YK MS ERP
          </h1>
          <p className="text-text_secondary mt-1 text-sm">نظام إدارة و نقطة بيع قطع الغيار</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-background_secondary rounded-2xl border border-border_default p-6 space-y-4 shadow-xl">
          <div>
            <label className="block text-sm text-text_secondary mb-1.5 text-right">اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-2.5 text-text_primary focus:border-primary_blue focus:ring-1 focus:ring-primary_blue outline-none transition-all text-right"
              placeholder="admin"
              autoFocus
              dir="ltr"
            />
          </div>
          
          <div>
            <label className="block text-sm text-text_secondary mb-1.5 text-right">كلمة المرور</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background_primary border border-border_default rounded-xl px-4 py-2.5 text-text_primary focus:border-primary_blue focus:ring-1 focus:ring-primary_blue outline-none transition-all text-right"
                placeholder="••••••••"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text_muted hover:text-text_secondary transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-danger_red/10 border border-danger_red/20 text-danger_red text-sm rounded-xl px-4 py-2.5 text-right">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary_blue hover:bg-primary_blue_hover text-white font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-primary_blue/20 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-border_default border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={16} />
                تسجيل الدخول
              </>
            )}
          </button>
        </form>

        {/* Back to User Picker Button */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => setShowPasswordLogin(false)}
            className="inline-flex items-center gap-2 text-xs font-black text-text_secondary hover:text-primary_blue transition-all cursor-pointer bg-white/[0.02] hover:bg-white/[0.06] px-4 py-2 rounded-xl border border-white/5 shadow-sm"
          >
            <Users size={13} />
            العودة لاختيار المستخدم السريع
          </button>
        </div>

        <p className="text-center text-text_muted text-xs mt-4">
          YK MS ERP v1.0.0
        </p>
      </div>
    </div>
  );
}

