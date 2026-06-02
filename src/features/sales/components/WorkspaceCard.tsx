import React, { useEffect, useState } from 'react';
import { X, Calendar, Package, AlertTriangle, FileText } from 'lucide-react';
import { Workspace, getSnapshotFromDB } from '../../../store/workspaceStore';

interface WorkspaceCardProps {
  workspace: Workspace;
  isActive: boolean;
  isSelected: boolean; // For keyboard navigation highlighting
  onSelect: () => void;
  onRemove: (e: React.MouseEvent) => void;
}

// Arabic relative time helper
const formatRelativeTimeArabic = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return 'الآن';
  const min = Math.floor(sec / 60);
  if (min < 1) return 'منذ ثوانٍ';
  if (min === 1) return 'منذ دقيقة';
  if (min === 2) return 'منذ دقيقتين';
  if (min < 11) return `منذ ${min} دقائق`;
  if (min < 60) return `منذ ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr === 1) return 'منذ ساعة';
  if (hr === 2) return 'منذ ساعتين';
  if (hr < 11) return `منذ ${hr} ساعات`;
  return `منذ ${hr} ساعة`;
};

export const WorkspaceCard = React.memo(function WorkspaceCard({
  workspace,
  isActive,
  isSelected,
  onSelect,
  onRemove,
}: WorkspaceCardProps) {
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  // Lazy-load snapshot from IndexedDB to protect memory
  useEffect(() => {
    let active = true;
    if (workspace.snapshotId) {
      getSnapshotFromDB(workspace.snapshotId).then((data) => {
        if (active && data) {
          setSnapshotUrl(data);
        }
      });
    } else {
      setSnapshotUrl(null);
    }
    return () => {
      active = false;
    };
  }, [workspace.snapshotId]);

  const itemsCount = workspace.items.reduce((acc, item) => acc + item.quantity, 0);
  const productsCount = workspace.items.length;
  
  // Calculate total invoice amount
  const subtotal = workspace.items.reduce((acc, item) => acc + (item.total || 0), 0);
  const totalAmount = subtotal - (workspace.globalDiscountValue || 0);

  return (
    <div
      onClick={onSelect}
      className={`
        relative flex flex-col w-full rounded-2xl overflow-hidden
        bg-black/45 backdrop-blur-md border transition-all duration-300 cursor-pointer group
        ${isActive 
          ? 'border-primary_blue/70 shadow-[0_0_25px_rgba(59,130,246,0.45)] scale-[1.03] ring-1 ring-primary_blue/40' 
          : isSelected
            ? 'border-white/35 bg-black/60 shadow-[0_0_20px_rgba(255,255,255,0.15)] scale-[1.01]'
            : 'border-white/10 hover:border-white/25 hover:bg-black/50 hover:scale-[1.01]'
        }
      `}
    >
      {/* Glow Effect for Active Workspace */}
      {isActive && (
        <div className="absolute inset-0 bg-primary_blue/10 opacity-[0.08] animate-pulse pointer-events-none" />
      )}

      {/* Close Button (Top-Left in RTL) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(e);
        }}
        className="
          absolute top-4 left-4 z-20 p-2.5 rounded-xl
          bg-black/75 text-text_muted hover:text-white hover:bg-danger_red
          transition-all duration-300 opacity-0 group-hover:opacity-100
          shadow-lg border border-white/5
        "
        title="إغلاق مساحة العمل"
      >
        <X size={18} />
      </button>

      {/* Snapshot Preview / Fallback Graphics */}
      <div className="w-full aspect-video bg-black/30 relative overflow-hidden flex items-center justify-center border-b border-white/5">
        {snapshotUrl ? (
          <img
            src={snapshotUrl}
            alt="Workspace Snapshot"
            className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-90 transition-opacity duration-200"
          />
        ) : workspace.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 gap-2 w-full h-full bg-gradient-to-br from-indigo-950/20 via-slate-950/40 to-slate-900/30 text-white/20 group-hover:text-white/30 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
              <FileText size={22} className="text-primary_blue/30 group-hover:text-primary_blue/50 transition-colors" />
            </div>
            <span className="text-xs font-bold tracking-wide text-white/60">مساحة عمل فارغة</span>
            <span className="text-[9px] text-white/40">ابدأ بإضافة منتجات للفاتورة</span>
          </div>
        ) : (
          <div className="w-full h-full p-4 flex flex-col justify-between text-right text-xs bg-slate-950/40 select-none text-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
              <span className="text-[10px] font-bold text-white/60">رقم: {workspace.invoiceNumber}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                workspace.saleType === 'wholesale' 
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {workspace.saleType === 'wholesale' ? 'جملة' : 'تجزئة'}
              </span>
            </div>
            {/* Items list */}
            <div className="flex-1 flex flex-col gap-1.5 overflow-hidden mt-2">
              {workspace.items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-[10px] text-white/70">
                  <span className="truncate max-w-[150px] font-medium">{item.product_name_snapshot}</span>
                  <span className="font-numbers font-semibold text-white">
                    {item.quantity} × {item.unit_price.toLocaleString('en-US')}
                  </span>
                </div>
              ))}
              {workspace.items.length > 3 && (
                <div className="text-[9px] text-white/40 text-center mt-0.5">
                  + {workspace.items.length - 3} أصناف أخرى
                </div>
              )}
            </div>
            {/* Divider */}
            <div className="border-t border-dashed border-white/10 pt-1" />
          </div>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div className="h-10 px-3.5 flex items-center justify-between bg-black/60 text-[10px] text-white/90 border-t border-white/5">
        {/* Customer Name */}
        <div className="font-extrabold text-white truncate max-w-[150px]">
          {workspace.customerName || 'زبون عام'}
        </div>

        {/* Products Count */}
        <div className="flex items-center gap-1.5 text-white/80 font-medium">
          <Package size={11} className="shrink-0 text-primary_blue" />
          <span>{productsCount} أصناف ({itemsCount} قطع)</span>
        </div>

        {/* Last Activity Time */}
        <div className="flex items-center gap-1.5 font-numbers shrink-0 text-white/80 font-medium">
          <Calendar size={11} className="shrink-0 text-primary_blue" />
          <span>{formatRelativeTimeArabic(workspace.lastActivity)}</span>
        </div>
      </div>
    </div>
  );
});
