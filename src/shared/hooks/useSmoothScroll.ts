import { useEffect, useRef } from 'react';

interface SmoothScrollOptions {
  dragEnabled?: boolean;
  wheelEnabled?: boolean;
  wheelSpeed?: number;
  dragSpeed?: number;
  friction?: number;   // Momentum deceleration (0.9–0.98)
  lerpFactor?: number; // Wheel lerp smoothing (0.05–0.2)
  direction?: 'vertical' | 'horizontal' | 'both' | 'auto';
}

/**
 * useSmoothScroll — Drag-to-scroll with inertia + smooth wheel lerp.
 *
 * @param options        - Configuration options
 * @param externalRef    - Optional existing MutableRefObject to reuse (e.g. from useTableFiller)
 *
 * FIXES vs v1:
 *  - direction:'auto' bug: previously both axes became false when BOTH existed
 *    (table is often wider than container → scrollWidth > clientWidth even with overflow-y only)
 *  - Removed `mouseleave` as drag stopper — fast drags no longer break.
 *    window.mouseup is sufficient to end the drag regardless of cursor position.
 *  - Added `thead` to isInteractive → column sort/drag headers don't trigger scroll drag.
 *  - Added `externalRef` so ERPTable can reuse its existing containerRef node.
 */
export function useSmoothScroll<T extends HTMLElement>(
  options: SmoothScrollOptions = {},
  externalRef?: React.MutableRefObject<T | null>,
) {
  const {
    dragEnabled  = true,
    wheelEnabled = true,
    wheelSpeed   = 1,
    dragSpeed    = 1.2,
    friction     = 0.93,
    lerpFactor   = 0.08,
    direction    = 'auto',
  } = options;

  const internalRef = useRef<T | null>(null);
  // Use whichever ref was provided; fall back to internal.
  const elementRef  = externalRef !== undefined ? externalRef : internalRef;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // ── State ──────────────────────────────────────────────────────────────
    let isMouseDown = false;
    let startX = 0, startY = 0;
    let startScrollLeft = 0, startScrollTop = 0;

    // Drag inertia
    let velX = 0, velY = 0;
    let animationFrameId: number | null = null;
    let moveHistory: { x: number; y: number; time: number }[] = [];

    // Smooth wheel lerp
    let targetScrollTop  = element.scrollTop;
    let targetScrollLeft = element.scrollLeft;
    let isWheelScrolling = false;
    let wheelFrameId: number | null = null;

    // ── Helpers ────────────────────────────────────────────────────────────

    /** Returns which axes are scrollable for this container + direction option. */
    const getAxes = () => {
      const hasV = element.scrollHeight > element.clientHeight;
      const hasH = element.scrollWidth  > element.clientWidth;
      // FIX: 'auto' now allows EACH axis independently — no mutual exclusion.
      // Previously: `auto && hasV && !hasH` caused BOTH to be false when table is wider than container.
      const canY =
        direction === 'vertical'   ||
        direction === 'both'       ||
        (direction === 'auto' && hasV);
      const canX =
        direction === 'horizontal' ||
        direction === 'both'       ||
        (direction === 'auto' && hasH);
      return { canY, canX };
    };

    /** Returns true for elements that should NOT trigger drag scrolling. */
    const isInteractive = (target: HTMLElement): boolean => {
      const tag = target.tagName.toLowerCase();
      if (['input', 'textarea', 'select', 'button', 'a', 'label', 'option'].includes(tag)) return true;
      if (target.closest('[role="button"]') || target.closest('button')) return true;
      if (target.isContentEditable) return true;
      // Table column headers — do NOT intercept sort clicks or column drag-reorder.
      if (target.closest('thead')) return true;
      return false;
    };

    const cancelAll = () => {
      if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
      if (wheelFrameId)     { cancelAnimationFrame(wheelFrameId);     wheelFrameId = null; isWheelScrolling = false; }
    };

    // ── Drag-to-Scroll ─────────────────────────────────────────────────────

    const handleMouseDown = (e: MouseEvent) => {
      if (!dragEnabled || e.button !== 0) return;
      if (isInteractive(e.target as HTMLElement)) return;

      isMouseDown      = true;
      startX           = e.clientX;
      startY           = e.clientY;
      startScrollLeft  = element.scrollLeft;
      startScrollTop   = element.scrollTop;
      velX = velY      = 0;
      moveHistory      = [{ x: e.clientX, y: e.clientY, time: performance.now() }];

      // Sync wheel targets so there is no jump if wheel was mid-animation
      targetScrollLeft = element.scrollLeft;
      targetScrollTop  = element.scrollTop;

      cancelAll();

      element.style.cursor     = 'grabbing';
      element.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;

      const now = performance.now();
      moveHistory.push({ x: e.clientX, y: e.clientY, time: now });
      if (moveHistory.length > 5) moveHistory.shift();

      const { canY, canX } = getAxes();
      if (canX) element.scrollLeft = startScrollLeft - (e.clientX - startX) * dragSpeed;
      if (canY) element.scrollTop  = startScrollTop  - (e.clientY - startY) * dragSpeed;
    };

    /**
     * FIX: Only `window.mouseup` stops the drag — `mouseleave` has been removed.
     * Removing mouseleave means a fast drag that momentarily moves the cursor
     * outside the element no longer abruptly kills the momentum.
     */
    const handleMouseUp = () => {
      if (!isMouseDown) return;
      isMouseDown = false;

      element.style.cursor = dragEnabled ? 'grab' : '';
      element.style.removeProperty('user-select');

      const { canY, canX } = getAxes();
      const now = performance.now();

      // Compute release velocity from recent move history
      if (moveHistory.length > 1) {
        const last  = moveHistory[moveHistory.length - 1];
        const first = moveHistory[0];
        if (now - last.time < 80) {
          const dt = last.time - first.time;
          if (dt > 0) {
            velX = ((last.x - first.x) / dt) * 16.67;
            velY = ((last.y - first.y) / dt) * 16.67;
          }
        }
      }
      moveHistory = [];

      // Launch inertia if there is meaningful velocity
      if ((canX && Math.abs(velX) > 0.5) || (canY && Math.abs(velY) > 0.5)) {
        const tick = () => {
          if (Math.abs(velX) < 0.1 && Math.abs(velY) < 0.1) { animationFrameId = null; return; }
          if (canX) element.scrollLeft -= velX * (dragSpeed / 2.2);
          if (canY) element.scrollTop  -= velY * (dragSpeed / 2.2);
          velX *= friction;
          velY *= friction;
          // Keep wheel targets in sync
          targetScrollLeft = element.scrollLeft;
          targetScrollTop  = element.scrollTop;
          animationFrameId = requestAnimationFrame(tick);
        };
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    if (dragEnabled) element.style.cursor = 'grab';

    // ── Smooth Wheel Scroll ────────────────────────────────────────────────

    const handleWheel = (e: WheelEvent) => {
      if (!wheelEnabled) return;

      const { canY, canX } = getAxes();
      const deltaY = e.deltaY * wheelSpeed;
      const deltaX = e.deltaX * wheelSpeed;

      // Stop any active drag inertia
      if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; velX = velY = 0; }

      // Boundary checks — allow event to propagate when at scroll limits
      const atTop    = element.scrollTop  <= 0                                           && deltaY < 0;
      const atBottom = element.scrollTop  + element.clientHeight >= element.scrollHeight - 1 && deltaY > 0;
      const atLeft   = element.scrollLeft <= 0                                           && deltaX < 0;
      const atRight  = element.scrollLeft + element.clientWidth  >= element.scrollWidth  - 1 && deltaX > 0;

      const blockedY = !canY || atTop  || atBottom;
      const blockedX = !canX || atLeft || atRight;
      if (blockedY && blockedX) return; // Let the event bubble

      e.preventDefault();

      if (canY) targetScrollTop  = Math.max(0, Math.min(element.scrollHeight - element.clientHeight, targetScrollTop  + deltaY));
      if (canX) targetScrollLeft = Math.max(0, Math.min(element.scrollWidth  - element.clientWidth,  targetScrollLeft + deltaX));

      if (!isWheelScrolling) {
        isWheelScrolling = true;
        const lerp = () => {
          const dY = targetScrollTop  - element.scrollTop;
          const dX = targetScrollLeft - element.scrollLeft;
          if (Math.abs(dY) < 0.5 && Math.abs(dX) < 0.5) {
            if (canY) element.scrollTop  = targetScrollTop;
            if (canX) element.scrollLeft = targetScrollLeft;
            isWheelScrolling = false;
            wheelFrameId = null;
            return;
          }
          if (canY) element.scrollTop  += dY * lerpFactor;
          if (canX) element.scrollLeft += dX * lerpFactor;
          wheelFrameId = requestAnimationFrame(lerp);
        };
        wheelFrameId = requestAnimationFrame(lerp);
      }
    };

    // ── Attach ────────────────────────────────────────────────────────────
    element.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup',   handleMouseUp);
    // NOTE: mouseleave intentionally omitted — window.mouseup covers all exit cases.
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup',   handleMouseUp);
      element.removeEventListener('wheel',    handleWheel);
      cancelAll();
      element.style.removeProperty('cursor');
      element.style.removeProperty('user-select');
    };
  }, [dragEnabled, wheelEnabled, wheelSpeed, dragSpeed, friction, lerpFactor, direction]);

  return elementRef;
}
