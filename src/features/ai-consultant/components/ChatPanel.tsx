/**
 * ChatPanel — لوحة الدردشة التفاعلية مع المستشار الذكي
 * - مُتحكّم بها (Controlled Component) بالكامل من قِبل الصفحة الرئيسية لتسهيل تعدد المحادثات
 * - تدعم Markdown بسيط في الردود
 * - auto-scroll إلى آخر رسالة
 * - تدعم إرفاق الصور من الجهاز وصور المنتج المربوط
 * - تدعم نسخ الرسائل والتراجع عن آخر رسالة
 */
import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, RefreshCw, AlertCircle, Trash2, ChevronRight, Image as ImageIcon, X, Copy, Check, Undo, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showNotification } from '../../../shared/utils/notifications';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: {
    base64: string;
    mimeType: string;
  };
  images?: {
    base64: string;
    mimeType: string;
  }[];
}

interface ChoiceOption {
  label: string;
  value: string;
}

interface ChoicesData {
  type: string;
  options: ChoiceOption[];
}

interface Props {
  aiMode: 'automatic' | 'manual';
  onModeChange: () => void;
  messages: Message[];
  sending: boolean;
  onSendMessage: (text: string, customImages?: { base64: string; mimeType: string }[], sendProductImage?: boolean) => void;
  onClearHistory?: () => void;
  onUndoLast?: () => void;
  selectedProduct?: any;
  productImage?: any;
  productImages?: any[];
  onBack?: () => void;
}

export default function ChatPanel({
  aiMode,
  onModeChange,
  messages,
  sending,
  onSendMessage,
  onClearHistory,
  onUndoLast,
  selectedProduct,
  productImage,
  productImages = [],
  onBack,
}: Props) {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [customImages, setCustomImages] = useState<{ base64: string; mimeType: string }[]>([]);
  const [sendProductImage, setSendProductImage] = useState(true);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [copyingImage, setCopyingImage] = useState(false);

  const handleCopyProductImage = async () => {
    if (!productImage) return;
    setCopyingImage(true);
    try {
      const imgUrl = `http://localhost:8766/images/${productImage.filePath}`;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get 2d context');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(async (blob) => {
            if (!blob) {
              setCopyingImage(false);
              showNotification('error', 'فشل معالجة الصورة للنسخ');
              return;
            }
            try {
              await navigator.clipboard.write([
                new ClipboardItem({
                  'image/png': blob
                })
              ]);
              showNotification('success', 'تم نسخ الصورة للحافظة بنجاح!');
            } catch (err: any) {
              console.error('Clipboard write error:', err);
              showNotification('error', 'فشل نسخ الصورة للحافظة.');
            } finally {
              setCopyingImage(false);
            }
          }, 'image/png');
        } catch (err) {
          console.error('Canvas convert error:', err);
          showNotification('error', 'فشل معالجة الصورة للنسخ');
          setCopyingImage(false);
        }
      };
      img.onerror = () => {
        showNotification('error', 'فشل تحميل الصورة للنسخ');
        setCopyingImage(false);
      };
      img.src = imgUrl;
    } catch (err) {
      console.error('Error copying image:', err);
      showNotification('error', 'حدث خطأ أثناء نسخ الصورة');
      setCopyingImage(false);
    }
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // auto-scroll عند وصول رسالة جديدة
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setSendProductImage(true);
  }, [selectedProduct]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`حجم الصورة ${file.name} كبير جداً، الحد الأقصى هو 5 ميجابايت`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const match = base64.match(/^data:([^;]+);base64,(.*)$/);
        if (match) {
          setCustomImages((prev) => [
            ...prev,
            {
              mimeType: match[1],
              base64: match[2]
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSend = () => {
    const text = input.trim();
    if ((!text && customImages.length === 0) || sending) return;
    onSendMessage(text, customImages.length > 0 ? customImages : undefined, sendProductImage);
    setInput('');
    setCustomImages([]);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageIndex(idx);
    setTimeout(() => setCopiedMessageIndex(null), 2000);
  };

  const QUICK_QUESTIONS = [
    'ما هي أكثر المنتجات ربحاً لديّ هذا الشهر؟',
    'من هم العملاء الأكثر مديونية؟',
    'أي المنتجات في المخزون الزائد وأوقف شراءها؟',
    'ما هو الوضع المالي الصافي للمحل الآن؟',
  ];

  return (
    <div className="flex flex-col h-full bg-transparent" dir="rtl">
      {/* Welcome Banner / Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border_custom/[0.05] dark:border-b-white/[0.05] shrink-0 bg-background_secondary/10">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                navigate(-1);
              }
            }}
            className="p-2 rounded-xl border border-border_custom/[0.08] dark:border-white/5 text-text_secondary hover:text-text_primary hover:border-emerald-400 transition-all cursor-pointer bg-white/40 dark:bg-background_secondary/10 shrink-0 ml-2"
            title="رجوع"
          >
            <ChevronRight size={15} />
          </button>
          
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Bot size={18} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-black text-text_primary">المستشار الذكي</p>
            <p className="text-[10px] text-text_secondary font-bold flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${aiMode === 'automatic' ? 'bg-success_green animate-pulse' : 'bg-text_secondary'}`}></span>
              {aiMode === 'automatic' ? 'متصل بالبيانات الحية' : 'الوضع اليدوي'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onUndoLast && (
            <button
              onClick={onUndoLast}
              disabled={messages.length === 0 || sending}
              className="p-2 rounded-xl text-text_secondary hover:text-emerald-500 hover:bg-emerald-500/10 transition-all disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="التراجع عن آخر رسالة"
            >
              <Undo size={15} />
            </button>
          )}
          {onClearHistory && (
            <button
              onClick={onClearHistory}
              disabled={messages.length === 0}
              className="p-2 rounded-xl text-text_secondary hover:text-danger_red hover:bg-danger_red/10 transition-all disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="مسح المحادثة"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Manual Mode Banner */}
      {aiMode !== 'automatic' && (
        <div className="mx-4 mt-3 flex items-center gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0">
          <AlertCircle size={15} className="shrink-0" />
          <div className="flex-1">
            <span>الدردشة التفاعلية تتطلب تفعيل الوضع التلقائي ومفتاح API في الإعدادات.</span>
          </div>
          <button onClick={onModeChange} className="underline hover:no-underline text-emerald-500 shrink-0">
            الإعدادات
          </button>
        </div>
      )}

      {/* Product Context Banner */}
      {selectedProduct && (
        <div className="mx-4 mt-3 flex flex-col gap-2 shrink-0">
          {/* Product Info Row */}
          <div className="p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/15 dark:border-emerald-500/10 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
              {productImages && productImages.length > 1 ? (
                <div className="flex gap-1 shrink-0 max-w-[150px] overflow-x-auto py-0.5">
                  {productImages.map((img: any, imgIdx: number) => (
                    <div 
                      key={imgIdx} 
                      className={`w-9 h-9 rounded-lg bg-white/40 dark:bg-background_secondary/25 border flex items-center justify-center overflow-hidden shrink-0 ${
                        img.filePath === productImage?.filePath ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-border_default'
                      }`}
                    >
                      <img
                        src={`http://localhost:8766/images/${img.filePath}`}
                        className="w-full h-full object-cover"
                        alt={`${selectedProduct.name} - ${imgIdx}`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white/40 dark:bg-background_secondary/25 border border-border_default flex items-center justify-center overflow-hidden shrink-0">
                  {productImage ? (
                    <img
                      src={`http://localhost:8766/images/${productImage.filePath}`}
                      className="w-full h-full object-cover"
                      alt={selectedProduct.name}
                    />
                  ) : (
                    <Bot size={20} className="text-emerald-500" />
                  )}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-black text-text_primary truncate">{selectedProduct.name}</p>
                <p className="text-[10px] text-text_secondary/80 font-bold mt-0.5 truncate">
                  {selectedProduct.brand_name && `ماركة: ${selectedProduct.brand_name}`}
                  {selectedProduct.internal_code && ` · كود: ${selectedProduct.internal_code}`}
                  {selectedProduct.retail_price && ` · سعر: ${selectedProduct.retail_price} د.ج`}
                  {selectedProduct.total_stock !== undefined && ` · المخزون: ${selectedProduct.total_stock}`}
                  {productImages && productImages.length > 1 && ` · صور الألبوم: ${productImages.length}`}
                </p>
              </div>
            </div>
            
            {productImage && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyProductImage}
                  disabled={copyingImage}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/50 dark:bg-background_secondary/20 hover:bg-emerald-500/10 hover:text-emerald-500 rounded-xl border border-border_default hover:border-emerald-500/30 transition-all text-[10px] font-black text-text_secondary cursor-pointer"
                  title="نسخ صورة المنتج للحافظة"
                >
                  <Copy size={12} className={copyingImage ? "animate-pulse" : ""} />
                  <span>{copyingImage ? 'جاري النسخ...' : 'نسخ الصورة'}</span>
                </button>
                <label className="flex items-center gap-1.5 select-none cursor-pointer bg-white/50 dark:bg-background_secondary/20 px-2.5 py-1.5 rounded-xl border border-border_default hover:border-emerald-500/30 transition-all">
                  <input
                    type="checkbox"
                    checked={sendProductImage}
                    onChange={(e) => setSendProductImage(e.target.checked)}
                    className="w-3.5 h-3.5 accent-emerald-500 rounded border-border_default focus:ring-0 focus:outline-none"
                  />
                  <span className="text-[10px] font-black text-text_secondary">إرسال صورة المنتج</span>
                </label>
              </div>
            )}
          </div>

          {/* Quick Actions Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                const msg = `أريد تصميم موجه تحسين صورة خطوة بخطوة للمنتج "${selectedProduct.name}" بناءً على الصورة المرفقة.`;
                onSendMessage(msg, undefined, true);
              }}
              disabled={sending || !productImage}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 hover:from-emerald-500/25 hover:to-teal-500/20 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-[10px] font-black text-emerald-600 dark:text-emerald-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
              title={!productImage ? 'لا توجد صورة للمنتج' : 'توليد برومبت لتحسين الصورة خطوة بخطوة'}
            >
              <span className="text-[13px]">📸</span>
              احصل على برومبت تحسين الصورة
            </button>

            <button
              onClick={() => {
                const msg = `أعطني أفكاراً تسويقية ومنشور إعلاني احترافي لمنتج "${selectedProduct.name}"${selectedProduct.brand_name ? ` من ماركة ${selectedProduct.brand_name}` : ''}. أريد منشوراً جذاباً للسوشيال ميديا مع هاشتاقات مناسبة.`;
                onSendMessage(msg, undefined, !!productImage);
              }}
              disabled={sending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 hover:from-emerald-500/25 hover:to-teal-500/20 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-[10px] font-black text-emerald-600 dark:text-emerald-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              <span className="text-[13px]">📢</span>
              أفكار تسويقية
            </button>

            <button
              onClick={() => {
                const msg = `اعطني تحليلاً تجارياً شاملاً لمنتج "${selectedProduct.name}": كيف يمكن تحسين مبيعاته؟ ما هو تسعيره المثالي؟ وكيف أعرضه بشكل أكثر جاذبية للزبون؟`;
                onSendMessage(msg, undefined, false);
              }}
              disabled={sending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/15 to-orange-500/10 hover:from-amber-500/25 hover:to-orange-500/20 border border-amber-500/20 hover:border-amber-500/40 rounded-xl text-[10px] font-black text-amber-600 dark:text-amber-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              <span className="text-[13px]">📊</span>
              تحليل تجاري
            </button>
          </div>
        </div>
      )}



      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-border_custom/[0.15]">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="flex gap-3 items-start">
              <div className="w-8.5 h-8.5 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/10">
                <Bot size={15} className="text-emerald-500" />
              </div>
              <div className="bg-white/60 dark:bg-background_secondary/40 backdrop-blur-md rounded-2xl rounded-tr-sm px-4 py-3.5 text-base font-bold text-text_primary max-w-[85%] leading-relaxed border border-border_custom/[0.05] dark:border-white/5 shadow-sm select-text">
                مرحباً! أنا مستشارك التجاري الذكي. تم ربطي بقاعدة بيانات متجرك بالكامل، وجاهز للإجابة على استفساراتك حول المبيعات، الأرباح، الديون، أو حالة المخزون.
                <br /><br />
                اختر سؤالاً سريعاً للبدء أو اكتب استفسارك بالأسفل:
              </div>
            </div>
            {/* Quick Questions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mr-11">
              {customImages.length > 0 && (
                <button
                  onClick={() => {
                    const promptText = `أريد تصميم موجه تحسين صورة خطوة بخطوة للصور المرفقة.`;
                    onSendMessage(promptText, customImages, false);
                    setCustomImages([]);
                  }}
                  disabled={sending}
                  className="text-right text-xs font-bold px-4 py-3 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 hover:from-emerald-500/25 hover:to-teal-500/20 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer shadow-sm backdrop-blur-sm active:scale-95 col-span-1 md:col-span-2 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[14px]">📸</span>
                    توليد موجه (Prompt) لتحسين الصور المرفوعة خطوة بخطوة
                  </span>
                  <span className="text-[10px] text-emerald-500 font-black">({customImages.length} صور مرفوعة)</span>
                </button>
              )}
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="text-right text-xs font-bold px-4 py-2.5 bg-white/40 dark:bg-background_secondary/10 hover:bg-emerald-500/10 border border-border_custom/[0.08] dark:border-white/5 hover:border-emerald-500/25 rounded-xl text-text_secondary hover:text-emerald-600 transition-all cursor-pointer shadow-sm backdrop-blur-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((msg, idx) => {
          const isLastMessage = idx === messages.length - 1;
          const { cleanContent, choices } = msg.role === 'assistant' ? parseChoices(msg.content) : { cleanContent: msg.content, choices: null };

          return (
            <div
              key={idx}
              className={`flex gap-3 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 border ${
                msg.role === 'user'
                  ? 'bg-primary_blue/10 border-primary_blue/20 text-primary_blue'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
              }`}>
                {msg.role === 'user'
                  ? <User size={15} />
                  : <Bot size={15} />
                }
              </div>
              <div className="flex flex-col gap-2 max-w-[85%]">
                <div className={`px-4 pt-3.5 pb-6 rounded-2xl text-base leading-relaxed break-words shadow-sm border relative group select-text ${
                  msg.role === 'user'
                    ? 'bg-emerald-500 text-black border-transparent rounded-tl-sm font-bold shadow-md shadow-emerald-500/15'
                    : 'bg-white/60 dark:bg-background_secondary/40 backdrop-blur-md text-text_primary border-border_custom/[0.05] dark:border-white/5 rounded-tr-sm font-medium'
                }`}>
                  {msg.images && msg.images.length > 0 ? (
                    <div className={`mb-2 mt-1 grid gap-1.5 max-w-sm rounded-xl overflow-hidden border border-white/20 shadow-sm ${
                      msg.images.length === 1 
                        ? 'grid-cols-1' 
                        : msg.images.length === 2 
                        ? 'grid-cols-2' 
                        : 'grid-cols-3'
                    }`}>
                      {msg.images.map((img, imgIdx) => (
                        <img
                          key={imgIdx}
                          src={img.base64.startsWith('http') || img.base64.startsWith('data:') ? img.base64 : `data:${img.mimeType};base64,${img.base64}`}
                          alt={`Attached ${imgIdx}`}
                          className="w-full h-24 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            const win = window.open();
                            if (win) {
                              const srcUrl = img.base64.startsWith('http') || img.base64.startsWith('data:') ? img.base64 : `data:${img.mimeType};base64,${img.base64}`;
                              win.document.write(`<img src="${srcUrl}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                            }
                          }}
                        />
                      ))}
                    </div>
                  ) : msg.image?.base64 ? (
                    <div className="mb-2 mt-1 max-w-sm rounded-xl overflow-hidden border border-white/20 shadow-sm">
                      <img
                        src={msg.image.base64.startsWith('http') || msg.image.base64.startsWith('data:') ? msg.image.base64 : `data:${msg.image.mimeType};base64,${msg.image.base64}`}
                        alt="Attached"
                        className="w-full max-h-48 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          const win = window.open();
                          if (win) {
                            const srcUrl = msg.image!.base64.startsWith('http') || msg.image!.base64.startsWith('data:') ? msg.image!.base64 : `data:${msg.image!.mimeType};base64,${msg.image!.base64}`;
                            win.document.write(`<img src="${srcUrl}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                          }
                        }}
                      />
                    </div>
                  ) : null}
                  {msg.role === 'user' ? cleanContent : renderMarkdown(cleanContent, selectedProduct)}

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(cleanContent, idx)}
                    className={`absolute opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg border cursor-pointer ${
                      msg.role === 'user'
                      ? 'bottom-2 left-2 bg-emerald-600/20 hover:bg-emerald-600/40 border-black/10 text-black/80'
                      : 'bottom-2 right-2 bg-white/80 dark:bg-background_secondary/80 border-border_default text-text_secondary/80 hover:text-text_primary'
                    }`}
                    title="نسخ النص"
                  >
                    {copiedMessageIndex === idx ? <Check size={12} className="text-success_green" /> : <Copy size={12} />}
                  </button>
                </div>

                {/* Interactive Choices Buttons */}
                {choices && isLastMessage && !sending && (
                  <div className="flex gap-2 flex-wrap mt-1 pb-3 select-none animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {choices.options?.map((opt: ChoiceOption, optIdx: number) => (
                      <button
                        key={optIdx}
                        onClick={() => onSendMessage(opt.label, undefined, false)}
                        className="px-3.5 py-2 bg-success_green hover:bg-success_green_hover text-black rounded-xl text-xs font-black shadow-glow-emerald hover:scale-102 active:scale-98 transition-all duration-150 cursor-pointer flex items-center justify-center border-none"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {sending && (
          <div className="flex gap-3 items-start animate-pulse">
            <div className="w-8.5 h-8.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <Bot size={15} className="text-emerald-500" />
            </div>
            <div className="bg-white/60 dark:bg-background_secondary/40 backdrop-blur-md rounded-2xl rounded-tr-sm px-4 py-3.5 border border-border_custom/[0.05] dark:border-white/5 shadow-sm">
              <div className="flex gap-1.5 items-center h-4">
                <span className="w-2.5 h-2.5 bg-emerald-500/50 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2.5 h-2.5 bg-emerald-500/50 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2.5 h-2.5 bg-emerald-500/50 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 pb-4 pt-3 shrink-0 border-t border-border_custom/[0.04] dark:border-t-white/[0.04] bg-transparent">
        {/* Custom Image Upload Preview */}
        {customImages.length > 0 && (
          <div className="flex flex-col gap-2 mb-3 mr-2">
            <div className="flex flex-wrap gap-2 animate-in fade-in zoom-in-95">
              {customImages.map((img, idx) => (
                <div key={idx} className="relative inline-block">
                  <img
                    src={`data:${img.mimeType};base64,${img.base64}`}
                    className="w-16 h-16 object-cover rounded-xl border border-emerald-500/30 shadow-sm"
                    alt={`Preview ${idx}`}
                  />
                  <button
                    type="button"
                    onClick={() => setCustomImages((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-1.5 -left-1.5 p-1 bg-danger_red text-white rounded-full hover:bg-red-600 transition-all shadow-md cursor-pointer flex items-center justify-center"
                    style={{ width: '16px', height: '16px' }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const promptText = `أريد تصميم موجه تحسين صورة خطوة بخطوة للصور المرفوعة.`;
                  onSendMessage(promptText, customImages, false);
                  setCustomImages([]);
                }}
                disabled={sending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 hover:from-emerald-500/25 hover:to-teal-500/20 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-[10px] font-black text-emerald-600 dark:text-emerald-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 animate-in fade-in"
              >
                <span className="text-[13px]">📸</span>
                توليد موجه (Prompt) لتحسين هذه الصور المرفوعة خطوة بخطوة
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2.5 items-end bg-white/60 dark:bg-background_secondary/40 backdrop-blur-md border border-border_custom/[0.08] dark:border-white/5 rounded-2xl px-4 py-3 focus-within:border-emerald-500/50 dark:focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all shadow-sm">
          {/* File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={aiMode !== 'automatic' || sending}
          />
          
          {/* Attachment Button */}
          {aiMode === 'automatic' && (
             <button
               onClick={() => fileInputRef.current?.click()}
               disabled={sending}
               className="w-9 h-9 rounded-xl bg-white/50 dark:bg-background_secondary/25 border border-border_default text-text_secondary hover:text-emerald-500 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer hover:scale-105 active:scale-95"
               title="إرفاق صور من جهازك"
             >
               <ImageIcon size={16} />
             </button>
          )}

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={aiMode === 'automatic' ? "اسأل المستشار الذكي عن أي أمر تجاري... (Enter للإرسال)" : "الدردشة معطلة في الوضع اليدوي"}
            rows={1}
            className="flex-1 bg-transparent resize-none text-base font-bold text-text_primary placeholder-text_secondary/50 focus:outline-none leading-relaxed max-h-24 overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = `${Math.min(t.scrollHeight, 96)}px`;
            }}
            disabled={aiMode !== 'automatic' || sending}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && customImages.length === 0) || sending || aiMode !== 'automatic'}
            className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/25 hover:scale-105 active:scale-95 animate-transition"
          >
            {sending
              ? <RefreshCw size={15} className="animate-spin" />
              : <Send size={15} />
            }
          </button>
        </div>
        <p className="text-[10px] text-text_secondary/40 font-bold text-center mt-2">
          Enter للإرسال · Shift+Enter لسطر جديد
        </p>
      </div>
    </div>
  );
}

// ─── Markdown Rendering Helpers ───────────────────────────────────────────────

function CodeBlock({ code }: { code: string; selectedProduct?: any }) {
  const [copied, setCopied] = useState(false);
  const [actionState, setActionState] = useState<'pending' | 'loading' | 'success' | 'error' | 'cancelled'>('pending');
  const [actionResultMsg, setActionResultMsg] = useState('');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Try parsing code as JSON
  let actionData: any = null;
  try {
    const cleanCode = code.trim();
    if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
      const parsed = JSON.parse(cleanCode);
      if (parsed && parsed.action) {
        actionData = parsed;
      }
    }
  } catch (e) {
    // Not JSON
  }

  if (actionData) {
    const handleConfirmAction = async (opType?: string) => {
      setActionState('loading');
      try {
        if (actionData.action === 'zero_stock_operation') {
          const operation = opType || actionData.operation;
          const isDelete = operation === 'delete' || operation === 'حذف';
          
          const channel = isDelete ? 'db:products:bulkDeleteZeroStock' : 'db:products:bulkHideZeroStock';
          const res = await window.electronAPI.invoke(channel, {
            dateFrom: actionData.date_from,
            dateTo: actionData.date_to
          });
          
          if (res.success) {
            setActionState('success');
            setActionResultMsg(
              isDelete 
                ? `تم حذف ${res.count} منتجاً صفرياً بنجاح.` 
                : `تم إخفاء ${res.count} منتجاً صفرياً بنجاح.`
            );
            showNotification('success', 'تم تنفيذ العملية بنجاح');
          } else {
            setActionState('error');
            setActionResultMsg(res.error || 'فشلت العملية');
            showNotification('error', res.error || 'فشلت العملية');
          }
        } else if (actionData.action === 'delete_product') {
          const res = await window.electronAPI.invoke('db:products:delete', Number(actionData.product_id));
          if (res.success) {
            setActionState('success');
            setActionResultMsg(`تم حذف المنتج "${actionData.name}" بنجاح.`);
            showNotification('success', 'تم حذف المنتج بنجاح');
          } else {
            setActionState('error');
            setActionResultMsg(res.error || 'فشلت العملية');
            showNotification('error', res.error || 'فشلت العملية');
          }
        }
      } catch (err: any) {
        setActionState('error');
        setActionResultMsg(err.message || 'خطأ غير متوقع');
        showNotification('error', err.message || 'خطأ غير متوقع');
      }
    };

    if (actionState === 'cancelled') {
      return (
        <div className="my-2 p-3 bg-neutral-100 dark:bg-neutral-900/30 border border-dashed border-border_default rounded-xl text-center text-xs font-bold text-text_secondary">
          ❌ تم إلغاء العملية المحاسبية/التعديل.
        </div>
      );
    }

    if (actionState === 'success') {
      return (
        <div className="my-2 p-4 bg-success_green/10 border border-success_green/30 rounded-xl text-right text-xs font-bold text-success_green flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{actionResultMsg}</span>
        </div>
      );
    }

    if (actionState === 'error') {
      return (
        <div className="my-2 p-4 bg-danger_red/10 border border-danger_red/30 rounded-xl text-right text-xs font-bold text-danger_red flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>فشل التنفيذ: {actionResultMsg}</span>
          </div>
          <button
            onClick={() => setActionState('pending')}
            className="self-end px-3 py-1 bg-danger_red text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }

    // Render interactive Confirmation Card
    if (actionData.action === 'zero_stock_operation') {
      const showBothOptions = !actionData.operation || (actionData.operation !== 'hide' && actionData.operation !== 'delete' && actionData.operation !== 'إخفاء' && actionData.operation !== 'حذف');
      const specOp = actionData.operation === 'delete' || actionData.operation === 'حذف' ? 'حذف' : 'إخفاء';

      return (
        <div className="my-3 p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/15 border border-emerald-500/20 rounded-2xl shadow-sm text-right select-none animate-in zoom-in-98 duration-150">
          <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
            <AlertCircle size={18} className="shrink-0" />
            <h4 className="text-xs font-black">تأكيد عملية المنتجات الصفرية</h4>
          </div>
          
          <p className="text-xs text-text_primary leading-relaxed font-bold mb-3">
            تم العثور على <span className="text-emerald-500 text-sm font-black font-numbers">{actionData.count}</span> منتجاً بمخزون صفر
            {actionData.date_from || actionData.date_to ? ' في الفترة المحددة' : ''}.
            {showBothOptions ? ' هل تريد إخفاءها من شاشة البيع أم حذفها نهائياً؟' : ` هل أنت متأكد من رغبتك في ${specOp} هذه المنتجات كلياً؟`}
          </p>

          {actionState === 'loading' ? (
            <div className="flex items-center gap-2 text-xs text-text_secondary">
              <RefreshCw size={14} className="animate-spin text-emerald-500" />
              <span>جاري المعالجة وتحديث قاعدة البيانات...</span>
            </div>
          ) : (
            <div className="flex gap-2 justify-start flex-wrap mt-4">
              {showBothOptions ? (
                <>
                  <button
                    onClick={() => handleConfirmAction('hide')}
                    className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl text-[11px] font-black shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all cursor-pointer hover:scale-102 active:scale-98"
                  >
                    🙈 إخفاء المنتجات
                  </button>
                  <button
                    onClick={() => handleConfirmAction('delete')}
                    className="px-3.5 py-2 bg-danger_red hover:bg-red-600 text-white rounded-xl text-[11px] font-black shadow-sm transition-all cursor-pointer hover:scale-102 active:scale-98"
                  >
                    🗑️ حذف المنتجات نهائياً
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConfirmAction()}
                  className={`px-3.5 py-2 rounded-xl text-[11px] font-black shadow-sm transition-all cursor-pointer hover:scale-102 active:scale-98 ${
                    actionData.operation === 'delete' || actionData.operation === 'حذف' ? 'bg-danger_red hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/25'
                  }`}
                >
                  نعم، {specOp} المنتجات ({actionData.count})
                </button>
              )}
              <button
                onClick={() => setActionState('cancelled')}
                className="px-3.5 py-2 bg-white dark:bg-background_secondary text-text_secondary border border-border_default hover:bg-background_secondary rounded-xl text-[11px] font-bold shadow-sm transition-all cursor-pointer active:scale-98"
              >
                إلغاء العملية
              </button>
            </div>
          )}
        </div>
      );
    }

    if (actionData.action === 'delete_product') {
      return (
        <div className="my-3 p-4 bg-gradient-to-br from-danger_red/10 to-rose-500/5 border border-danger_red/20 rounded-2xl shadow-sm text-right select-none animate-in zoom-in-98 duration-150">
          <div className="flex items-center gap-2 mb-2 text-danger_red">
            <AlertCircle size={18} className="shrink-0" />
            <h4 className="text-xs font-black">تأكيد حذف منتج</h4>
          </div>
          
          <p className="text-xs text-text_primary leading-relaxed font-bold mb-3">
            هل أنت متأكد تماماً من رغبتك في حذف المنتج: <span className="text-danger_red font-black">"{actionData.name}"</span>؟
            لا يمكن التراجع عن هذا الإجراء.
          </p>

          {actionState === 'loading' ? (
            <div className="flex items-center gap-2 text-xs text-text_secondary">
              <RefreshCw size={14} className="animate-spin text-danger_red" />
              <span>جاري الحذف وتعديل البيانات...</span>
            </div>
          ) : (
            <div className="flex gap-2 justify-start mt-4">
              <button
                onClick={() => handleConfirmAction()}
                className="px-4 py-2 bg-danger_red hover:bg-red-600 text-white rounded-xl text-[11px] font-black shadow-sm transition-all cursor-pointer hover:scale-102 active:scale-98"
              >
                🗑️ تأكيد الحذف
              </button>
              <button
                onClick={() => setActionState('cancelled')}
                className="px-4 py-2 bg-white dark:bg-background_secondary text-text_secondary border border-border_default hover:bg-background_secondary rounded-xl text-[11px] font-bold shadow-sm transition-all cursor-pointer active:scale-98"
              >
                إلغاء
              </button>
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="relative my-2 group/code select-text">
      <pre className="bg-neutral-100 dark:bg-neutral-900/60 p-3.5 rounded-xl border border-border_default font-mono text-xs overflow-x-auto text-text_primary leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 left-2 opacity-0 group-hover/code:opacity-100 transition-opacity p-1.5 bg-white dark:bg-background_secondary border border-border_default rounded-lg text-text_secondary hover:text-text_primary cursor-pointer shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center"
        title="نسخ الكود"
      >
        {copied ? <Check size={12} className="text-success_green" /> : <Copy size={12} />}
      </button>
    </div>
  );
}

function renderMarkdown(content: string, selectedProduct?: any) {
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const cleanLine = line.trim();

    if (cleanLine.startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        const codeText = codeBlockLines.join('\n');
        renderedElements.push(
          <CodeBlock key={`code-${idx}`} code={codeText} selectedProduct={selectedProduct} />
        );
        inCodeBlock = false;
        codeBlockLines = [];
      } else {
        // Open code block
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Check for headers
    if (cleanLine.startsWith('###')) {
      const headerText = cleanLine.replace(/^###\s*/, '');
      renderedElements.push(
        <span key={idx} className="block text-sm md:text-base font-black text-emerald-600 dark:text-emerald-400 mt-3 mb-2 first:mt-0 select-text">
          {parseInlineMarkdown(headerText)}
        </span>
      );
      continue;
    }

    // Check for list items
    const isListItem = cleanLine.startsWith('- ') || cleanLine.startsWith('* ');
    if (isListItem) {
      const listText = cleanLine.substring(2);
      renderedElements.push(
        <span key={idx} className="block mr-3 pl-1.5 relative text-text_primary/90 font-bold my-1 select-text">
          <span className="absolute right-0 text-emerald-500">•</span>
          <span className="mr-3 block">{parseInlineMarkdown(listText)}</span>
        </span>
      );
      continue;
    }

    // Empty line
    if (cleanLine === '') {
      renderedElements.push(<span key={idx} className="block h-2" />);
      continue;
    }

    // Regular text
    renderedElements.push(
      <span key={idx} className="block text-text_primary/90 font-semibold my-1 leading-relaxed select-text">
        {parseInlineMarkdown(line)}
      </span>
    );
  }

  // Handle unclosed code block if any
  if (inCodeBlock && codeBlockLines.length > 0) {
    const codeText = codeBlockLines.join('\n');
    renderedElements.push(
      <CodeBlock key="code-unclosed" code={codeText} selectedProduct={selectedProduct} />
    );
  }

  return renderedElements;
}

function parseInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={idx} className="font-black text-text_primary">
          {boldText}
        </strong>
      );
    }
    return part;
  });
}

function parseChoices(content: string): { cleanContent: string; choices: ChoicesData | null } {
  const regex = /:::choices\s*({.*?})\s*:::/s;
  const match = content.match(regex);
  if (match) {
    try {
      const choices = JSON.parse(match[1]) as ChoicesData;
      const cleanContent = content.replace(regex, '').trim();
      return { cleanContent, choices };
    } catch (e) {
      console.error('Failed to parse choices JSON:', e);
    }
  }
  return { cleanContent: content, choices: null };
}
