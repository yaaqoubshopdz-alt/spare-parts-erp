/**
 * ERPTable — Types (بسيطة، مباشرة، بدون over-engineering)
 *
 * لا classic pagination — كل البيانات في جدول واحد مع scroll طبيعي.
 */
import type { ReactNode } from 'react';

export interface ERPColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'right' | 'left' | 'center';
  width?: number;
  flex?: number;
  render?: (row: T) => ReactNode;
  cellClass?: string;
  hidden?: boolean;
  resizable?: boolean;
  draggable?: boolean;
  minWidth?: number;
  headerRender?: () => ReactNode;
}

export interface ERPTableProps<T = any> {
  data: T[];
  columns: ERPColumn<T>[];
  loading?: boolean;
  rowKey?: string;
  sortKey?: string | null;
  sortDir?: 'asc' | 'desc' | null;
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  onRowContextMenu?: (e: React.MouseEvent, row: T) => void;
  toolbar?: ReactNode;
  className?: string;
  /** Visual fill: minimum visible rows */
  minRows?: number;
  onResizeColumn?: (key: string, width: number) => void;
  onReorderColumns?: (fromIdx: number, toIdx: number) => void;
  onToggleHideColumn?: (key: string) => void;
  onResetColumns?: () => void;
  onShowAllColumns?: () => void;
  hasHiddenColumns?: boolean;
  emptyText?: string;
}
