import React, { Component, ErrorInfo, ReactNode } from 'react';
import { IconAlertTriangle, IconRotate } from '@tabler/icons-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PricePulse Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-shelf flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-tile p-8 rounded-tile border border-hairline shadow-shelf space-y-4">
            <div className="w-12 h-12 rounded-full bg-rise/10 text-rise mx-auto flex items-center justify-center">
              <IconAlertTriangle size={28} />
            </div>
            <h2 className="font-serif text-2xl text-ink font-bold">Something went wrong</h2>
            <p className="text-xs text-muted leading-relaxed">
              An unexpected render error occurred. Please verify the backend API server is running on port 8000.
            </p>
            {this.state.error && (
              <pre className="p-3 bg-shelf rounded text-[11px] font-mono text-left text-rise overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-cocoa text-white text-xs font-serif font-bold hover:bg-cocoa-deep transition shadow-sm"
            >
              <IconRotate size={16} />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
