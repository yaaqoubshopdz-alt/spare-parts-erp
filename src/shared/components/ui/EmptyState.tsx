/**
 * EmptyState — displayed when a list or area has no data.
 */
import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export default function EmptyState({
  title = 'لا توجد بيانات',
  message,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="rounded-full bg-background_card p-4">
        {icon || <Inbox size={40} className="text-text_muted" />}
      </div>
      <h3 className="text-lg font-medium text-text_secondary">{title}</h3>
      {message && <p className="max-w-sm text-sm text-text_muted">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
