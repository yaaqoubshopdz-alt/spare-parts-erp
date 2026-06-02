/**
 * useTableFiller — Visual Table Fill Hook (Dynamic)
 *
 * يحسب عدد filler rows ديناميكياً بناءً على ارتفاع الكونتينر الفعلي
 * باستخدام ResizeObserver. مع fallback إلى minRows.
 *
 * يُثبّت ResizeObserver داخل الـ ref callback (وليس useEffect)
 * لضمان أنه دائماً مربوط بالـ node الصحيح حتى عند re-render.
 *
 * ارتفاع الصف h-11 = 44px
 * ارتفاع الهيدر ≈ 52px
 */

import { useState, useCallback, useRef } from 'react';

export const ROW_HEIGHT = 44; // h-11
const HEADER_HEIGHT = 52;

interface UseTableFillerResult {
  containerRef: React.RefCallback<HTMLDivElement>;
  fillerCount: number;
}

export function useTableFiller(
  dataLength: number,
  minRows: number = 18,
): UseTableFillerResult {
  const [containerHeight, setContainerHeight] = useState(0);
  const roRef = useRef<ResizeObserver | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const containerRef: React.RefCallback<HTMLDivElement> = useCallback((node) => {
    // تنظيف الـ observer القديم
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    clearTimeout(timeoutRef.current);

    if (!node) return;

    // قياس أولي فوري
    setContainerHeight(node.clientHeight);

    // ResizeObserver مع debounce (50ms)
    roRef.current = new ResizeObserver(() => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setContainerHeight(node.clientHeight);
      }, 50);
    });
    roRef.current.observe(node);
  }, []);

  // حساب ديناميكي: كم صف نحتاج لملء المساحة؟
  const availableHeight = Math.max(0, containerHeight - HEADER_HEIGHT);
  const visibleRows = Math.ceil(availableHeight / ROW_HEIGHT);
  const dynamicMin = Math.max(visibleRows, minRows);
  const fillerCount = Math.max(0, dynamicMin - dataLength);

  return { containerRef, fillerCount };
}
