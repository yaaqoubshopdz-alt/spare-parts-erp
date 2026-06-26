/**
 * SmartConsultantPage — صفحة المستشار الذكي التفاعلية والمعاد تصميمها بالكامل
 * - الخيار الأول: دردشة المستشار الذكي (محادثات متعددة بنمط ChatGPT مع حفظ التاريخ محلياً)
 * - الخيار الثاني: التحليل الكلي للمحل (حلقة الصحة التفاعلية الكبيرة + شرائح التوصيات التفاعلية ببطاقة واحدة في المنتصف وأسهم تنقل)
 * - يدعم الوضع التلقائي واليدوي
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Brain, RefreshCw, AlertCircle, CheckCircle2,
  MessageSquare, ClipboardList, Settings, TrendingUp,
  Clock, Zap, Plus, Trash2, ChevronLeft, ChevronRight
} from 'lucide-react';
import InsightCard, { type Recommendation } from './components/InsightCard';
import ChatPanel from './components/ChatPanel';
import ManualModePanel from './components/ManualModePanel';
import { showSuccess, showError } from '../../shared/utils/notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIMessage {
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

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: AIMessage[];
}

interface ConsultantAnalysis {
  last_analyzed: string;
  shop_health_score: number;
  summary: string;
  recommendations: Recommendation[];
}

type ActiveView = 'chat' | 'analysis' | 'manual';

// ─── Health Score Ring ─────────────────────────────────────────────────────────

function LargeHealthRing({ score }: { score: number }) {
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-36 h-36 shrink-0">
      <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
        <circle cx="72" cy="72" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-border_default/30 dark:text-border_default/10" />
        <circle
          cx="72" cy="72" r={radius}
          fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
        <span className="text-3xl font-black text-text_primary leading-none">{score}%</span>
        <span className="text-[10px] text-text_secondary font-extrabold mt-1.5">صحة المحل</span>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SmartConsultantPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const productIdParam = searchParams.get('productId');

  const [analysis, setAnalysis] = useState<ConsultantAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiMode, setAiMode] = useState<'automatic' | 'manual'>('manual');
  
  // Navigation tabs
  const [activeView, setActiveView] = useState<ActiveView>('chat');

  // Chat sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [sending, setSending] = useState(false);

  // Product specific context state
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productImage, setProductImage] = useState<any>(null);
  const [productImages, setProductImages] = useState<any[]>([]);

  // Recommendations Carousel state
  const [filterType, setFilterType] = useState<'all' | 'critical' | 'warning' | 'opportunity'>('all');
  const [currentRecIndex, setCurrentRecIndex] = useState(0);
  const [direction, setDirection] = useState<number>(0); // 1 = left (next), -1 = right (prev)

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load product context if productId parameter is present or if we switch to a product session
  useEffect(() => {
    if (loading) return;

    let activeProductId: number | null = null;
    
    if (productIdParam) {
      activeProductId = Number(productIdParam);
    } else if (activeSessionId && activeSessionId.startsWith('session_product_')) {
      const parts = activeSessionId.split('_');
      const idStr = parts[parts.length - 1];
      if (idStr) {
        activeProductId = Number(idStr);
      }
    }

    if (activeProductId && !isNaN(activeProductId)) {
      const fetchProductContext = async () => {
        try {
          const prodRes = await window.electronAPI.invoke('db:products:getById', activeProductId);
          if (prodRes.success && prodRes.data) {
            const product = prodRes.data;
            setSelectedProduct(product);
            
            const imgRes = await window.electronAPI.invoke('db:products:getImages', activeProductId);
            if (imgRes.success && imgRes.data) {
              const imgs = imgRes.data;
              setProductImages(imgs);
              const primary = imgs.find((i: any) => i.isPrimary) || imgs[0] || null;
              setProductImage(primary);
            } else {
              setProductImages([]);
              setProductImage(null);
            }

            // Ensure session exists and is active if productIdParam matches
            if (productIdParam && Number(productIdParam) === activeProductId) {
              const targetSessionId = `session_product_${activeProductId}`;
              const sessionExists = sessions.some(s => s.id === targetSessionId);
              
              if (!sessionExists) {
                const newSession: ChatSession = {
                  id: targetSessionId,
                  title: `استشارة: ${product.name}`,
                  createdAt: Date.now(),
                  messages: []
                };
                const updated = [newSession, ...sessions];
                setSessions(updated);
                setActiveSessionId(targetSessionId);
                localStorage.setItem('spareparts_consultant_sessions', JSON.stringify(updated));
              } else {
                if (activeSessionId !== targetSessionId) {
                  setActiveSessionId(targetSessionId);
                }
              }
            }
          } else {
            setSelectedProduct(null);
            setProductImage(null);
            setProductImages([]);
          }
        } catch (err) {
          console.error('Error fetching product context:', err);
          setSelectedProduct(null);
          setProductImage(null);
          setProductImages([]);
        }
      };

      fetchProductContext();
    } else {
      setSelectedProduct(null);
      setProductImage(null);
      setProductImages([]);
    }
  }, [productIdParam, activeSessionId, sessions.length, loading]);

  // Sync active session history to SQLite backend when session changes
  useEffect(() => {
    if (activeSessionId) {
      const activeSession = sessions.find(s => s.id === activeSessionId);
      if (activeSession) {
        window.electronAPI.invoke('ai:saveHistory', activeSession.messages);
      }
    }
  }, [activeSessionId]);

  // Reset carousel index when filter category changes
  useEffect(() => {
    setCurrentRecIndex(0);
  }, [filterType]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // 1. Get AI configurations
      const cfgRes = await window.electronAPI.invoke('ai:getConfig');
      let currentMode: 'automatic' | 'manual' = 'manual';
      if (cfgRes.success) {
        currentMode = cfgRes.data.mode || 'manual';
        setAiMode(currentMode);
      }

      // 2. Get last saved analysis
      const analysisRes = await window.electronAPI.invoke('ai:getLastAnalysis');
      if (analysisRes.success && analysisRes.data) {
        setAnalysis(analysisRes.data);
      }

      // 3. Initialize chat sessions from localStorage
      const saved = localStorage.getItem('spareparts_consultant_sessions');
      let loadedSessions: ChatSession[] = [];
      if (saved) {
        try {
          loadedSessions = JSON.parse(saved);
        } catch {
          loadedSessions = [];
        }
      }

      // If no local sessions, try importing legacy SQLite history
      if (loadedSessions.length === 0) {
        const legacyRes = await window.electronAPI.invoke('ai:getHistory');
        if (legacyRes.success && legacyRes.data && legacyRes.data.length > 0) {
          const legacyMessages = (legacyRes.data as AIMessage[]).filter(m => m.role !== 'system');
          if (legacyMessages.length > 0) {
            loadedSessions = [{
              id: 'session_legacy',
              title: 'المحادثة السابقة',
              createdAt: Date.now(),
              messages: legacyMessages
            }];
          }
        }
      }

      // If still empty, create default session
      if (loadedSessions.length === 0) {
        loadedSessions = [{
          id: 'session_default',
          title: 'محادثة جديدة',
          createdAt: Date.now(),
          messages: []
        }];
      }

      setSessions(loadedSessions);
      setActiveSessionId(loadedSessions[0].id);

      // Determine initial view tab
      if (currentMode === 'manual') {
        setActiveView('manual');
      } else {
        setActiveView('chat');
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    try {
      const res = await window.electronAPI.invoke('ai:analyze');
      if (res.success && res.data) {
        setAnalysis(res.data);
        setActiveView('analysis');
        showSuccess('تم إجراء التحليل بنجاح! 🎉');
      } else {
        showError(res.error || 'فشل التحليل');
      }
    } catch (e: any) {
      showError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // ─── Chat Actions ───────────────────────────────────────────────────────────

  const handleCreateNewSession = () => {
    if (searchParams.has('productId')) {
      setSearchParams({});
    }
    const emptySession = sessions.find(s => s.messages.length === 0);
    if (emptySession) {
      setActiveSessionId(emptySession.id);
      setActiveView('chat');
      return;
    }
    const newSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: 'محادثة جديدة',
      createdAt: Date.now(),
      messages: []
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(newSession.id);
    localStorage.setItem('spareparts_consultant_sessions', JSON.stringify(updated));
    showSuccess('بدأت محادثة جديدة 💬');
  };


  const handleDeleteSession = (id: string) => {
    if (id === `session_product_${productIdParam}`) {
      setSearchParams({});
    }
    const updated = sessions.filter(s => s.id !== id);
    let nextActiveId = activeSessionId;

    if (id === activeSessionId) {
      if (updated.length > 0) {
        nextActiveId = updated[0].id;
      } else {
        const freshSession: ChatSession = {
          id: `session_${Date.now()}`,
          title: 'محادثة جديدة',
          createdAt: Date.now(),
          messages: []
        };
        updated.push(freshSession);
        nextActiveId = freshSession.id;
      }
    }

    setSessions(updated);
    setActiveSessionId(nextActiveId);
    localStorage.setItem('spareparts_consultant_sessions', JSON.stringify(updated));
    showSuccess('تم حذف المحادثة');
  };

  const handleSendMessage = async (text: string, customImages?: { base64: string; mimeType: string }[], sendProductImage?: boolean) => {
    let attachedImages = customImages || [];
    if (sendProductImage && productImages && productImages.length > 0) {
      const prodImgsMapped = productImages.map(img => ({
        base64: `http://localhost:8766/images/${img.filePath}`,
        mimeType: 'image/png'
      }));
      attachedImages = [...attachedImages, ...prodImgsMapped];
    }

    if ((!text.trim() && attachedImages.length === 0) || sending) return;
    setSending(true);

    const userMsg: AIMessage = { 
      role: 'user', 
      content: text, 
      images: attachedImages.length > 0 ? attachedImages : undefined 
    };

    // Update frontend state immediately (Optimistic UI)
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === activeSessionId) {
          const title = s.title === 'محادثة جديدة' ? (text.length > 20 ? text.substring(0, 20) + '...' : text) : s.title;
          return {
            ...s,
            title,
            messages: [...s.messages, userMsg]
          };
        }
        return s;
      });
      localStorage.setItem('spareparts_consultant_sessions', JSON.stringify(updated));
      return updated;
    });

    try {
      // Send chat message to backend
      const res = await window.electronAPI.invoke('ai:chat', {
        content: text,
        images: attachedImages.length > 0 ? attachedImages : undefined
      });
      if (res.success && res.content) {
        const assistantMsg: AIMessage = { role: 'assistant', content: res.content };
        setSessions(prev => {
          const updated = prev.map(s => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                messages: [...s.messages, assistantMsg]
              };
            }
            return s;
          });
          localStorage.setItem('spareparts_consultant_sessions', JSON.stringify(updated));
          return updated;
        });
      } else {
        const errMsg: AIMessage = { role: 'assistant', content: `❌ ${res.error || 'حدث خطأ غير متوقع'}` };
        setSessions(prev => {
          const updated = prev.map(s => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                messages: [...s.messages, errMsg]
              };
            }
            return s;
          });
          localStorage.setItem('spareparts_consultant_sessions', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (e: any) {
      const errMsg: AIMessage = { role: 'assistant', content: `❌ خطأ: ${e.message}` };
      setSessions(prev => {
        const updated = prev.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...s.messages, errMsg]
            };
          }
          return s;
        });
        localStorage.setItem('spareparts_consultant_sessions', JSON.stringify(updated));
        return updated;
      });
    } finally {
      setSending(false);
    }
  };

  const handleUndoLast = async () => {
    if (!activeSessionId) return;
    const session = sessions.find(s => s.id === activeSessionId);
    if (!session || session.messages.length === 0) return;

    let updatedMsgs: AIMessage[] = [];
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === activeSessionId) {
          const msgs = [...s.messages];
          if (msgs.length > 0) {
            const last = msgs[msgs.length - 1];
            if (last.role === 'assistant') {
              msgs.pop();
              if (msgs.length > 0 && msgs[msgs.length - 1].role === 'user') {
                msgs.pop();
              }
            } else {
              msgs.pop();
            }
          }
          updatedMsgs = msgs;
          return {
            ...s,
            messages: msgs
          };
        }
        return s;
      });
      localStorage.setItem('spareparts_consultant_sessions', JSON.stringify(updated));
      return updated;
    });

    // Also update SQLite history
    await window.electronAPI.invoke('ai:saveHistory', updatedMsgs);
    showSuccess('تم التراجع عن آخر رسالة');
  };

  const handleClearHistory = async () => {
    if (!activeSessionId) return;
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: []
          };
        }
        return s;
      });
      localStorage.setItem('spareparts_consultant_sessions', JSON.stringify(updated));
      return updated;
    });
    await window.electronAPI.invoke('ai:saveHistory', []);
    showSuccess('تم مسح تاريخ المحادثة');
  };
  // ─── Carousel Actions ──────────────────────────────────────────────────────

  const filteredRecs = analysis?.recommendations.filter(
    (r) => filterType === 'all' || r.type === filterType
  ) ?? [];

  const handleNextRec = () => {
    if (filteredRecs.length <= 1) return;
    setDirection(1);
    setCurrentRecIndex((prev) => (prev + 1) % filteredRecs.length);
  };

  const handlePrevRec = () => {
    if (filteredRecs.length <= 1) return;
    setDirection(-1);
    setCurrentRecIndex((prev) => (prev - 1 + filteredRecs.length) % filteredRecs.length);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const critCount = analysis?.recommendations.filter((r) => r.type === 'critical').length ?? 0;
  const warnCount = analysis?.recommendations.filter((r) => r.type === 'warning').length ?? 0;
  const oppCount  = analysis?.recommendations.filter((r) => r.type === 'opportunity').length ?? 0;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('ar-DZ', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  const formatSessionTime = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return `اليوم، ${date.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}`;
      } else if (diffDays === 1) {
        return `أمس، ${date.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        return date.toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short' });
      }
    } catch {
      return '';
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 80 : -80,
      opacity: 0,
    }),
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f8fafc] dark:bg-transparent">
        <RefreshCw size={24} className="animate-spin text-text_secondary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-cairo overflow-hidden bg-[#f5f8fa] dark:bg-transparent" dir="rtl">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="shrink-0 h-16 px-4 md:px-6 flex items-center justify-between border-b border-border_default/10 bg-white dark:bg-background_secondary/10 w-full flex-row flex-nowrap gap-4 overflow-x-auto">
        {/* Right side: Title & Subtitle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Brain size={20} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-black text-text_primary leading-tight">مستشار الأعمال الذكي</h1>
            {analysis ? (
              <p className="text-[10px] md:text-xs text-text_secondary font-bold flex items-center gap-1 mt-0.5">
                <Clock size={10} />
                آخر تحليل: {formatDate(analysis.last_analyzed)}
              </p>
            ) : (
              <p className="text-[10px] md:text-xs text-text_secondary font-bold">لم يتم إجراء تحليل بعد</p>
            )}
          </div>
        </div>

        {/* Center: Bottom-aligned Navigation Tabs */}
        <div className="self-stretch flex items-end gap-6 shrink-0">
          <button
            onClick={() => setActiveView('chat')}
            className={`flex items-center gap-2 px-1 pb-3 text-xs md:text-sm font-black transition-all cursor-pointer border-b-2 outline-none ${
              activeView === 'chat'
                ? 'border-emerald-500 text-emerald-500 dark:text-emerald-400'
                : 'border-transparent text-text_secondary hover:text-text_primary'
            }`}
          >
            <MessageSquare size={14} />
            <span>دردشة المستشار</span>
          </button>
          
          <button
            onClick={() => setActiveView('analysis')}
            className={`flex items-center gap-2 px-1 pb-3 text-xs md:text-sm font-black transition-all cursor-pointer border-b-2 outline-none ${
              activeView === 'analysis'
                ? 'border-emerald-500 text-emerald-500 dark:text-emerald-400'
                : 'border-transparent text-text_secondary hover:text-text_primary'
            }`}
          >
            <Brain size={14} />
            <span>التحليل الكلي للمحل</span>
          </button>

          {aiMode === 'manual' && (
            <button
              onClick={() => setActiveView('manual')}
              className={`flex items-center gap-2 px-1 pb-3 text-xs md:text-sm font-black transition-all cursor-pointer border-b-2 outline-none ${
                activeView === 'manual'
                  ? 'border-emerald-500 text-emerald-500 dark:text-emerald-400'
                  : 'border-transparent text-text_secondary hover:text-text_primary'
              }`}
            >
              <ClipboardList size={14} />
              <span>تصدير البيانات</span>
            </button>
          )}
        </div>

        {/* Left side: Actions & Settings */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Analyze Button */}
          {aiMode === 'automatic' && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-1.5 px-4.5 py-2 bg-emerald-500 hover:bg-emerald-650 text-black rounded-xl text-xs md:text-sm font-bold transition-all disabled:opacity-60 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/25 cursor-pointer hover:scale-102"
            >
              {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
              {analyzing ? 'جاري التحليل...' : 'تحديث التحليل الكلي'}
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={() => navigate('/settings')}
            className="p-2.5 rounded-xl border border-border_default text-text_secondary hover:text-text_primary hover:border-emerald-400 transition-all cursor-pointer bg-white dark:bg-background_secondary"
            title="إعدادات الذكاء الاصطناعي"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* ─── Main Content ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6 pb-4 w-full">
        <AnimatePresence mode="wait">
          {/* VIEW: CHAT CONSULTANT */}
          {activeView === 'chat' && (
            <motion.div
               key="chat-view"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2 }}
               className="flex-1 flex overflow-hidden bg-white dark:bg-background_secondary/5 border border-border_default/15 rounded-2xl shadow-sm w-full font-vazirmatn"
            >
              {/* Previous Chat History Sidebar */}
              <div className="w-68 border-l border-border_default/40 shrink-0 flex flex-col bg-background_secondary/10 dark:bg-background_secondary/2">
                {/* New Chat Button */}
                <div className="p-3 border-b border-border_default/30 shrink-0">
                  <button
                    onClick={handleCreateNewSession}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl text-xs font-black shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all cursor-pointer hover:scale-102 active:scale-98"
                  >
                    <Plus size={14} />
                    <span>محادثة جديدة</span>
                  </button>
                </div>

                {/* Session List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
                  {sessions.map((s) => {
                    const isActive = s.id === activeSessionId;
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setActiveSessionId(s.id);
                          if (searchParams.has('productId')) {
                            setSearchParams({});
                          }
                        }}
                        className={`group relative flex items-start gap-2.5 p-3 rounded-xl cursor-pointer transition-all border ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'hover:bg-background_secondary/60 text-text_secondary hover:text-text_primary border-transparent'
                        }`}
                      >
                        <MessageSquare size={14} className="shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0 pr-0.5">
                          <p className="text-xs font-bold truncate pl-6">{s.title}</p>
                          <p className="text-[9px] text-text_secondary/50 font-bold mt-1">
                            {formatSessionTime(s.createdAt)}
                          </p>
                        </div>
                        {/* Delete button visible on hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(s.id);
                          }}
                          className="absolute left-2.5 top-3.5 p-1 rounded-lg text-text_secondary/40 hover:text-danger_red hover:bg-danger_red/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="حذف المحادثة"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chat Panel Box */}
              <div className="flex-1 min-w-0">
                <ChatPanel
                  aiMode={aiMode}
                  onModeChange={() => navigate('/settings')}
                  messages={activeSession?.messages || []}
                  sending={sending}
                  onSendMessage={handleSendMessage}
                  onClearHistory={handleClearHistory}
                  onUndoLast={handleUndoLast}
                  selectedProduct={selectedProduct}
                  productImage={productImage}
                  productImages={productImages}
                />
              </div>
            </motion.div>
          )}

          {/* VIEW: TOTAL ANALYSIS */}
          {activeView === 'analysis' && (
            <motion.div
              key="analysis-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col gap-8 overflow-y-auto w-full custom-scrollbar pb-8"
            >
              {!analysis ? (
                /* No analysis yet */
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-background_secondary/5 border border-border_default/15 rounded-2xl shadow-sm space-y-4 w-full">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <Brain size={28} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-text_primary">لا توجد بيانات تحليل متوفرة</h3>
                    <p className="text-sm text-text_secondary font-bold mt-1.5 max-w-sm leading-relaxed">
                      الرجاء الضغط على زر "تحديث التحليل الكلي" في الأعلى ليقوم الذكاء الاصطناعي بقراءة وتدقيق أرقام ومخزون المحل وتوليد تقرير متكامل.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Health ring and Summary block */}
                  <div className="bg-white dark:bg-background_secondary/5 border border-border_default/15 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center gap-8 w-full">
                    {/* Ring */}
                    <div className="shrink-0">
                      <LargeHealthRing score={analysis.shop_health_score} />
                    </div>
                    {/* Summary text */}
                    <div className="flex-1 text-center md:text-right">
                      <h3 className="text-base md:text-lg font-black text-text_primary mb-3 flex items-center justify-center md:justify-start gap-2">
                        <Brain size={18} className="text-emerald-500" />
                        <span>ملخص حالة المتجر والتشغيل</span>
                      </h3>
                      <p className="text-base md:text-lg text-text_secondary font-bold leading-relaxed bg-emerald-500/5 dark:bg-emerald-500/2 p-5 border border-emerald-500/15 rounded-2xl">
                        {analysis.summary}
                      </p>
                    </div>
                  </div>

                  {/* Carousel recommendations title and Filter chips */}
                  <div className="bg-white dark:bg-background_secondary/5 border border-border_default/15 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6 w-full">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-base md:text-lg font-black text-text_primary">توصيات المستشار الذكي</h2>
                        <p className="text-xs text-text_secondary font-bold mt-0.5">
                          تصفح التوصيات التفاعلية بالتمرير يميناً ويساراً
                        </p>
                      </div>

                      {/* Filter category chips */}
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { key: 'all', label: `الكل (${analysis.recommendations.length})`, color: 'bg-background_secondary border-border_default/50 text-text_secondary' },
                          { key: 'critical', label: `🔴 حرج (${critCount})`, color: 'bg-danger_red/10 border-danger_red/20 text-danger_red' },
                          { key: 'warning', label: `🟡 تحذير (${warnCount})`, color: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' },
                          { key: 'opportunity', label: `🟢 فرصة (${oppCount})`, color: 'bg-success_green/10 border-success_green/20 text-success_green' },
                        ].map(({ key, label, color }) => (
                          <button
                            key={key}
                            onClick={() => setFilterType(key as typeof filterType)}
                            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-black border transition-all cursor-pointer ${
                              filterType === key
                                ? 'bg-emerald-500 text-black border-emerald-500 shadow-sm shadow-emerald-500/10'
                                : color
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* The Carousel Container */}
                    {filteredRecs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-text_secondary border border-dashed border-border_default/50 rounded-xl bg-background_secondary/10 w-full">
                        <CheckCircle2 size={24} className="text-success_green mb-2" />
                        <p className="text-xs font-bold">لا توجد توصيات نشطة في هذه الفئة حالياً</p>
                      </div>
                    ) : (
                      <div className="space-y-6 w-full">
                        {/* Slide deck */}
                        <div className="flex items-center gap-4 md:gap-6 w-full">
                          {/* Prev Button (RTL: ChevronRight represents going backward in list) */}
                          <button
                            onClick={handlePrevRec}
                            disabled={filteredRecs.length <= 1}
                            className="p-4 rounded-full bg-background_secondary dark:bg-background_secondary/20 border border-border_default/60 hover:border-emerald-400 text-text_secondary hover:text-emerald-500 transition-all shadow-sm shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="السابق"
                          >
                            <ChevronRight size={24} />
                          </button>

                          {/* Center Card with Framer motion */}
                          <div className="flex-1 min-w-0 relative overflow-hidden py-2">
                            <AnimatePresence mode="wait" custom={direction}>
                              <motion.div
                                key={`${filteredRecs[currentRecIndex].id}_${filterType}`}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                              >
                                <InsightCard rec={filteredRecs[currentRecIndex]} />
                              </motion.div>
                            </AnimatePresence>
                          </div>

                          {/* Next Button (RTL: ChevronLeft represents going forward in list) */}
                          <button
                            onClick={handleNextRec}
                            disabled={filteredRecs.length <= 1}
                            className="p-4 rounded-full bg-background_secondary dark:bg-background_secondary/20 border border-border_default/60 hover:border-emerald-400 text-text_secondary hover:text-emerald-500 transition-all shadow-sm shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="التالي"
                          >
                            <ChevronLeft size={24} />
                          </button>
                        </div>

                        {/* Dot navigation Indicators */}
                        {filteredRecs.length > 1 && (
                          <div className="flex flex-col items-center justify-center gap-2.5 pt-2">
                            <div className="flex gap-1.5">
                              {filteredRecs.map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setDirection(idx > currentRecIndex ? 1 : -1);
                                    setCurrentRecIndex(idx);
                                  }}
                                  className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                                    idx === currentRecIndex
                                      ? 'bg-emerald-500 w-5 shadow-sm shadow-emerald-500/30'
                                      : 'bg-border_default hover:bg-emerald-500/40'
                                  }`}
                                  title={`شريحة رقم ${idx + 1}`}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] md:text-xs text-text_secondary font-bold">
                              التوصية {currentRecIndex + 1} من {filteredRecs.length}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* VIEW: MANUAL MODE PANEL */}
          {activeView === 'manual' && (
            <motion.div
              key="manual-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto px-4 md:px-6 py-4 max-w-4xl mx-auto w-full custom-scrollbar"
            >
              <ManualModePanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
