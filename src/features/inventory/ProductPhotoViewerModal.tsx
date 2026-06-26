import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, CheckCircle2, AlertCircle, Trash2, Check, Copy } from 'lucide-react';
import { showError, showSuccess } from '../../shared/utils/notifications';

interface ProductPhotoViewerModalProps {
  isOpen: boolean;
  product: { id: number; name: string; barcode?: string } | null;
  onClose: () => void;
}

interface ProductImage {
  id: number;
  filePath: string;
  isPrimary: number;
  createdAt: string;
}

export default function ProductPhotoViewerModal({ isOpen, product, onClose }: ProductPhotoViewerModalProps) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; imgId: number; showConfirm?: boolean } | null>(null);
  const [copyingId, setCopyingId] = useState<number | null>(null);

  const handleCopyImage = async (filePath: string, imgId: number) => {
    setCopyingId(imgId);
    try {
      const imgUrl = `http://localhost:8766/images/${filePath}`;
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
              setCopyingId(null);
              showError('فشل معالجة الصورة للنسخ');
              return;
            }
            try {
              await navigator.clipboard.write([
                new ClipboardItem({
                  'image/png': blob
                })
              ]);
              showSuccess('تم نسخ الصورة للحافظة بنجاح!');
            } catch (err: any) {
              console.error('Clipboard write error:', err);
              showError('فشل نسخ الصورة للحافظة.');
            } finally {
              setTimeout(() => setCopyingId(null), 2000);
            }
          }, 'image/png');
        } catch (err) {
          console.error('Canvas convert error:', err);
          showError('فشل معالجة الصورة للنسخ');
          setCopyingId(null);
        }
      };
      img.onerror = () => {
        showError('فشل تحميل الصورة للنسخ');
        setCopyingId(null);
      };
      img.src = imgUrl;
    } catch (err) {
      console.error('Error copying image:', err);
      showError('حدث خطأ أثناء نسخ الصورة');
      setCopyingId(null);
    }
  };

  useEffect(() => {
    if (isOpen && product) {
      loadProductImages();
    } else {
      setImages([]);
      setConfirmDeleteId(null);
      setContextMenu(null);
    }
  }, [isOpen, product]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const loadProductImages = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.invoke('db:products:getImages', product.id);
      if (res.success) {
        setImages(res.data || []);
      } else {
        showError(res.error || 'فشل تحميل صور المنتج');
      }
    } catch (err) {
      showError('خطأ أثناء تحميل صور المنتج');
    } finally {
      setLoading(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, imgId: number) => {
    e.preventDefault();
    const menuWidth = 220;
    const menuHeight = 110;
    let x = e.clientX;
    let y = e.clientY;
    
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    setContextMenu({
      x,
      y,
      imgId,
      showConfirm: false
    });
  };

  const handleDeleteImage = async (imgId: number) => {
    try {
      const res = await window.electronAPI.invoke('db:products:deleteImage', imgId);
      if (res.success) {
        setImages(prev => prev.filter(img => img.id !== imgId));
        setConfirmDeleteId(null);
      } else {
        showError(res.error || 'فشل حذف الصورة');
      }
    } catch (err) {
      showError('خطأ أثناء حذف الصورة');
    }
  };

  if (!isOpen || !product) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-background_secondary border border-border_default w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl z-10 font-cairo text-right"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border_default/30 bg-background_primary/20">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-text_primary flex items-center gap-2">
                <ImageIcon size={20} className="text-primary_blue" />
                ألبوم صور المنتج
              </h3>
              <p className="text-xs text-text_muted font-bold">
                {product.name} {product.barcode && `(${product.barcode})`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text_muted hover:text-text_primary hover:bg-background_card_hover rounded-xl transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[500px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-text_muted">
                <div className="w-8 h-8 border-2 border-primary_blue border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-bold">جاري تحميل ألبوم الصور...</span>
              </div>
            ) : images.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center gap-4 bg-background_primary/10 border border-border_default/30 rounded-2xl p-8">
                <AlertCircle size={40} className="text-text_muted/60" />
                <div className="space-y-1">
                  <h4 className="text-base font-black text-text_primary">لا توجد صور متوفرة بعد</h4>
                  <p className="text-xs text-text_muted max-w-sm font-bold leading-relaxed">
                    لم يتم رفع أي صور لهذا المنتج. يمكنك استخدام تطبيق الهاتف <strong>YKMS ERP</strong> لتصوير قطع الغيار وسيتم ربطها وعرضها هنا تلقائياً.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {images.map((img) => (
                  <div
                    key={img.id}
                    onContextMenu={(e) => handleContextMenu(e, img.id)}
                    className="group relative rounded-2xl overflow-hidden border border-border_default/40 bg-background_primary/20 aspect-square shadow-sm flex flex-col justify-between"
                  >
                    {/* Delete Button (visible on group hover) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(img.id);
                      }}
                      className="absolute top-3 left-3 z-20 p-2 bg-danger_red/95 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-danger_red hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                      title="حذف الصورة"
                    >
                      <Trash2 size={14} />
                    </button>

                    {/* Copy Button (visible on group hover) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyImage(img.filePath, img.id);
                      }}
                      className="absolute top-3 left-13 z-20 p-2 bg-white/95 dark:bg-background_secondary/95 text-text_primary rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-violet-500 hover:text-white dark:hover:bg-violet-600 dark:hover:text-white hover:scale-105 active:scale-95 shadow-md cursor-pointer flex items-center justify-center"
                      title="نسخ الصورة للحافظة"
                    >
                      {copyingId === img.id ? (
                        <Check size={14} className="text-success_green" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>

                    {/* Confirmation Overlay */}
                    {confirmDeleteId === img.id && (
                      <div className="absolute inset-0 bg-background_secondary/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in-95 duration-200">
                        <AlertCircle className="text-danger_red mb-2" size={32} />
                        <h4 className="text-sm font-black text-text_primary">هل أنت متأكد؟</h4>
                        <p className="text-[11px] text-text_muted font-bold mt-1 mb-4 leading-relaxed">سيتم حذف الصورة نهائياً من القرص.</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteImage(img.id)}
                            className="px-3.5 py-1.5 bg-danger_red text-white text-xs font-black rounded-lg hover:bg-danger_red/90 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Check size={12} />
                            نعم، احذف
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3.5 py-1.5 bg-background_primary border border-border_default text-text_secondary text-xs font-black rounded-lg hover:bg-background_card_hover transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <X size={12} />
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Image */}
                    <div className="flex-1 w-full relative bg-black/20 flex items-center justify-center p-2">
                      <img
                        src={`http://localhost:8766/images/${img.filePath}`}
                        alt={product.name}
                        className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          // Fallback source if server is down or file is missing
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                        }}
                      />
                    </div>

                    {/* Footer / Meta */}
                    <div className="bg-background_card border-t border-border_default/30 px-3.5 py-2.5 flex items-center justify-between text-xs font-bold">
                      <span className="text-[10px] text-text_muted font-numbers" dir="ltr">
                        {new Date(img.createdAt).toLocaleDateString('ar-DZ')}
                      </span>
                      {img.isPrimary === 1 ? (
                        <span className="flex items-center gap-1 text-[11px] text-success_green bg-success_green/10 border border-success_green/20 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={12} />
                          أساسية
                        </span>
                      ) : (
                        <span className="text-[11px] text-text_muted">صورة إضافية</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Custom Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          className="fixed bg-background_secondary/95 backdrop-blur-md border border-border_default rounded-2xl shadow-2xl z-[100] p-3 min-w-[200px] flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100 text-right"
          dir="rtl"
        >
          {!contextMenu.showConfirm ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const targetImg = images.find(i => i.id === contextMenu.imgId);
                  if (targetImg) {
                    handleCopyImage(targetImg.filePath, targetImg.id);
                  }
                  setContextMenu(null);
                }}
                className="w-full text-right px-3 py-2 text-xs text-text_primary hover:bg-text_primary/10 rounded-lg font-black flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Copy size={13} />
                نسخ الصورة
              </button>

              <div className="border-t border-border_default/30 my-0.5" />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setContextMenu(prev => prev ? { ...prev, showConfirm: true } : null);
                }}
                className="w-full text-right px-3 py-2 text-xs text-danger_red hover:bg-danger_red/10 rounded-lg font-black flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                حذف الصورة
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-text_primary">هل أنت متأكد من حذف الصورة؟</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteImage(contextMenu.imgId);
                    setContextMenu(null);
                  }}
                  className="flex-1 py-1.5 bg-danger_red hover:bg-danger_red/90 text-white text-xs font-black rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Check size={12} />
                  نعم، احذف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setContextMenu(null);
                  }}
                  className="flex-1 py-1.5 bg-background_primary border border-border_default text-text_secondary hover:bg-background_card_hover text-xs font-black rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <X size={12} />
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
