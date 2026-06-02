/**
 * UI Types - SparePartsERP
 */

export type Language = 'ar' | 'fr';
export type Direction = 'rtl' | 'ltr';

export interface ToastMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export interface TableColumn<T = unknown> {
  key: string;
  label: string;
  width?: string;
  editable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}
