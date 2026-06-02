/**
 * ERPTableEmpty — Professional empty state for tables
 *
 * Uses the same visual language as EmptyState.tsx but
 * integrated within the table structure.
 * Prevents ugly white space — keeps the table container consistent.
 */

import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface ERPTableEmptyProps {
  icon?: ReactNode;
  title?: string;
  message?: string;
  action?: ReactNode;
  colSpan: number;
}

export default function ERPTableEmpty({
  icon,
  title = 'لا توجد بيانات',
  message,
  action,
  colSpan,
}: ERPTableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="bg-background_secondary">
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="rounded-full bg-background_card p-4">
            {icon || <Inbox size={40} className="text-text_muted" />}
          </div>
          <h3 className="text-base font-bold text-text_secondary">{title}</h3>
          {message && (
            <p className="max-w-sm text-sm text-text_muted">{message}</p>
          )}
          {action && <div className="mt-2">{action}</div>}
        </div>
      </td>
    </tr>
  );
}
