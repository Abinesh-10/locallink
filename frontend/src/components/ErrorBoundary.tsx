import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches any unhandled React render error below this boundary and shows a
 * recovery screen instead of a white/blank page. Without this, a single
 * component throwing during render silently crashes the entire app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 p-8 text-center">
        <AlertTriangle className="mb-4 h-12 w-12 text-sos-500" aria-hidden="true" />
        <h1 className="mb-2 font-display text-xl font-semibold text-ink-900">Something went wrong</h1>
        <p className="mb-1 text-sm text-ink-500">
          An unexpected error occurred. Your data is safe.
        </p>
        {this.state.error?.message && (
          <p className="mb-6 max-w-sm rounded bg-ink-100 px-3 py-2 font-mono text-xs text-ink-600">
            {this.state.error.message}
          </p>
        )}
        <button
          type="button"
          onClick={this.handleReset}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          <RefreshCw className="h-4 w-4" />
          Go back to home
        </button>
      </div>
    );
  }
}
