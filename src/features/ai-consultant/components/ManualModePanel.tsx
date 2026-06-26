/**
 * ManualModePanel — لوحة الوضع اليدوي (تصدير واستخدام خارجي)
 * للمستخدمين الذين لا يملكون API Key ويريدون الدردشة مع الذكاء الاصطناعي على الويب مباشرة
 */
import { useState, useEffect } from 'react';
import { Copy, Download, ExternalLink, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { showSuccess, showError } from '../../../shared/utils/notifications';

export default function ManualModePanel() {
  const [exportText, setExportText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // نقوم بتوليد التصدير تلقائياً عند تحميل الصفحة لتسهيل الأمر على المستخدم
    handleExport();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await window.electronAPI.invoke('ai:exportContext');
      if (res.success && res.data) {
        setExportText(res.data);
      } else {
        showError(res.error || 'فشل تصدير البيانات');
      }
    } catch (e: any) {
      showError(e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      showSuccess('تم نسخ برومبت بيانات المحل للحافظة! 📋');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      showError('فشل النسخ. يرجى تحديد النص ونسخه يدوياً.');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shop-ai-prompt-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('تم تحميل ملف البرومبت بنجاح! 💾');
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Info Banner */}
      <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex gap-4 backdrop-blur-md">
        <AlertCircle size={24} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-black text-amber-700 dark:text-amber-400">الوضع اليدوي (المجاني بالكامل) 🌐</p>
          <p className="text-xs text-text_secondary font-bold mt-1 leading-relaxed">
            في هذا الوضع، لا تحتاج إلى مفتاح API. نقوم بتجميع كل بيانات متجرك وحالة المخزون والمبيعات في "برومبت مطور موحد". 
            كل ما عليك فعله هو نسخ البرومبت، وفتحه في أي موقع ذكاء اصطناعي تفضله للدردشة واستلام التحليل والنصائح التجارية مباشرة هناك!
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white/40 dark:bg-background_secondary/5 border border-border_custom/[0.05] dark:border-white/5 rounded-2xl p-6 space-y-6 backdrop-blur-xl shadow-lg">
        
        {/* Step 1: Copy Prompt */}
        <div className="space-y-3">
          <h4 className="text-sm font-black text-text_primary flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center text-xs">1</span>
            نسخ برومبت بيانات المحل والتعليمات
          </h4>
          <p className="text-xs text-text_secondary font-bold leading-relaxed">
            تم توليد البرومبت الخاص بمتجرك تلقائياً ويحتوي على أرقام المبيعات، البضائع الراكدة، ديون العملاء والموردين، والسيولة النقدية الحالية.
          </p>

          {exporting ? (
            <div className="flex items-center gap-2 py-4 justify-center text-text_secondary">
              <RefreshCw size={16} className="animate-spin" />
              <span className="text-xs font-bold">جاري حصد وتوليد بيانات المحل...</span>
            </div>
          ) : exportText ? (
            <div className="space-y-3">
              <div className="bg-background_primary/30 dark:bg-background_primary/10 border border-border_custom/[0.05] dark:border-white/5 rounded-xl p-4 max-h-48 overflow-y-auto custom-scrollbar">
                <pre className="text-xs text-text_secondary font-mono whitespace-pre-wrap leading-relaxed">{exportText}</pre>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCopy}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    copied
                      ? 'bg-success_green/10 border-success_green text-success_green'
                      : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-black shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/25'
                  }`}
                >
                  {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copied ? 'تم نسخ البرومبت بنجاح! ✓' : 'نسخ البرومبت بالكامل 📋'}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-white/60 dark:bg-background_secondary/10 border border-border_custom/[0.05] dark:border-white/5 rounded-xl text-xs font-bold text-text_secondary hover:border-emerald-400 hover:text-emerald-500 transition-all cursor-pointer shadow-sm"
                >
                  <Download size={14} />
                  تحميل كملف نصي 💾
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-danger_red font-bold">فشل توليد البيانات. يرجى إعادة المحاولة.</p>
          )}
        </div>

        <hr className="border-border_custom/[0.05] dark:border-white/5" />

        {/* Step 2: Open External AI Chat */}
        <div className="space-y-3">
          <h4 className="text-sm font-black text-text_primary flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary_blue text-white flex items-center justify-center text-xs">2</span>
            افتح موقع الذكاء الاصطناعي وابدأ المحادثة
          </h4>
          <p className="text-xs text-text_secondary font-bold leading-relaxed">
            اضغط على أي زر لفتح موقع الذكاء الاصطناعي المفضل لديك في المتصفح، ثم قم بلصق البرومبت (Ctrl+V) وابدأ بالدردشة والاستفسار عن أي بند من بنود متجرك بحرية مطلقة!
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {[
              { name: 'Gemini (Google)', url: 'https://gemini.google.com', color: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20' },
              { name: 'ChatGPT (OpenAI)', url: 'https://chatgpt.com', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' },
              { name: 'Claude (Anthropic)', url: 'https://claude.ai', color: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20' },
              { name: 'DeepSeek', url: 'https://chat.deepseek.com', color: 'bg-blue-600/10 border-blue-600/30 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20' },
            ].map((ai) => (
              <button
                key={ai.name}
                onClick={() => window.electronAPI.invoke('shell:openExternal', ai.url)}
                className={`flex items-center justify-center gap-2 py-3 px-4 border rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${ai.color}`}
              >
                <ExternalLink size={12} />
                <span>{ai.name}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
