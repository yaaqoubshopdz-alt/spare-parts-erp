import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ERPColumn } from './types';

export interface ColumnState {
  key: string;
  width?: number;
  hidden?: boolean;
}

export function useColumnManager<T extends ERPColumn>(
  storageKey: string,
  defaultColumns: T[]
) {
  const [columnsState, setColumnsState] = useState<ColumnState[]>(() => {
    if (typeof window === 'undefined') {
      return defaultColumns.map(c => ({ key: c.key, width: c.width, hidden: c.hidden }));
    }
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      return defaultColumns.map(c => ({ key: c.key, width: c.width, hidden: c.hidden }));
    }
    try {
      const parsedRaw = JSON.parse(saved);
      let parsed: ColumnState[] = [];
      if (Array.isArray(parsedRaw)) {
        parsed = parsedRaw;
      } else if (parsedRaw && typeof parsedRaw === 'object') {
        parsed = Object.entries(parsedRaw).map(([key, val]) => ({
          key,
          width: typeof val === 'number' ? val : undefined
        }));
      } else {
        return defaultColumns.map(c => ({ key: c.key, width: c.width, hidden: c.hidden }));
      }
      const defaultKeys = new Set(defaultColumns.map(c => c.key));
      const parsedKeys = new Set(parsed.map(p => p.key));

      // 1. Keep parsed items that still exist in defaultColumns
      const filteredParsed = parsed.filter(p => defaultKeys.has(p.key));

      // 2. Find default columns that are missing in parsed (e.g. new columns added in updates)
      const missingDefaults = defaultColumns.filter(c => !parsedKeys.has(c.key));

      return [
        ...filteredParsed,
        ...missingDefaults.map(c => ({ key: c.key, width: c.width, hidden: c.hidden }))
      ];
    } catch {
      return defaultColumns.map(c => ({ key: c.key, width: c.width, hidden: c.hidden }));
    }
  });

  // Save to localStorage when columnsState changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(columnsState));
  }, [storageKey, columnsState]);

  // Merge defaultColumns definitions with current state (width, hidden)
  const allColumns = useMemo(() => {
    const defaultMap = new Map(defaultColumns.map(c => [c.key, c]));

    return columnsState
      .map(state => {
        const def = defaultMap.get(state.key);
        if (!def) return null;
        return {
          ...def,
          width: state.width !== undefined ? state.width : def.width,
          hidden: state.hidden !== undefined ? state.hidden : def.hidden,
        } as T;
      })
      .filter(Boolean) as T[];
  }, [columnsState, defaultColumns]);

  // Filter out hidden columns for the <table> element
  const visibleColumns = useMemo(() => {
    return allColumns.filter(c => !c.hidden);
  }, [allColumns]);

  const setWidth = useCallback((key: string, width: number) => {
    setColumnsState(prev =>
      prev.map(c => (c.key === key ? { ...c, width } : c))
    );
  }, []);

  const toggleHide = useCallback((key: string) => {
    setColumnsState(prev => {
      const visibleCount = prev.filter(c => !c.hidden).length;
      const targetCol = prev.find(c => c.key === key);
      if (visibleCount <= 1 && targetCol && !targetCol.hidden) {
        return prev; // Prevent hiding the last visible column
      }
      return prev.map(c => (c.key === key ? { ...c, hidden: !c.hidden } : c));
    });
  }, []);

  const reorder = useCallback((fromVisibleIndex: number, toVisibleIndex: number) => {
    setColumnsState(prev => {
      let fromRealIndex = -1;
      let visibleCount = 0;
      for (let i = 0; i < prev.length; i++) {
        if (!prev[i].hidden) {
          if (visibleCount === fromVisibleIndex) {
            fromRealIndex = i;
            break;
          }
          visibleCount++;
        }
      }

      let toRealIndex = -1;
      visibleCount = 0;
      for (let i = 0; i < prev.length; i++) {
        if (!prev[i].hidden) {
          if (visibleCount === toVisibleIndex) {
            toRealIndex = i;
            break;
          }
          visibleCount++;
        }
      }

      if (fromRealIndex === -1 || toRealIndex === -1) return prev;

      const result = [...prev];
      const [removed] = result.splice(fromRealIndex, 1);
      result.splice(toRealIndex, 0, removed);
      return result;
    });
  }, []);

  const reset = useCallback(() => {
    setColumnsState(defaultColumns.map(c => ({ key: c.key, width: c.width, hidden: c.hidden })));
  }, [defaultColumns]);

  const showAll = useCallback(() => {
    setColumnsState(prev => prev.map(c => ({ ...c, hidden: false })));
  }, []);

  return {
    columns: visibleColumns,
    allColumns,
    setWidth,
    toggleHide,
    reorder,
    reset,
    showAll,
  };
}
