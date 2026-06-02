/**
 * ErrorBoundary — catches rendering errors and shows a fallback UI.
 */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // TODO: Log to audit_log via IPC
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-background_primary p-8">
          <div className="glass-card max-w-md p-8 text-center">
            <h2 className="mb-4 text-xl font-bold text-danger_red">حدث خطأ غير متوقع</h2>
            <p className="mb-4 text-sm text-text_secondary">
              {this.state.error?.message || 'خطأ غير معروف'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary_blue hover:bg-primary_blue_hover text-white hover:bg-primary_blue_hover transition-default"
            >
              إعادة تحميل التطبيق
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
