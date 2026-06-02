/**
 * Formatters — number, currency, date formatting.
 */
import { format } from 'date-fns';
import { APP_CONFIG } from '../../constants/config';

/** Format a number with fixed decimal places */
export function formatNumber(value: number, decimals = APP_CONFIG.DECIMAL_PLACES): string {
  return value.toFixed(decimals);
}

/** Format currency with symbol */
export function formatCurrency(value: number, lang: 'ar' | 'fr' = 'ar'): string {
  const symbol = lang === 'ar' ? APP_CONFIG.DEFAULT_CURRENCY : APP_CONFIG.DEFAULT_CURRENCY_FR;
  return `${formatNumber(value)} ${symbol}`;
}

/** Format date to YYYY-MM-DD */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy-MM-dd');
}

/** Format date + time */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm:ss');
}

/** Format date for display (localized) */
export function formatDisplayDate(date: Date | string, lang: 'ar' | 'fr' = 'ar'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yyyy');
}
