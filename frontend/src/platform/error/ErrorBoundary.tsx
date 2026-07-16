import { Component, type ErrorInfo, type ReactNode } from 'react';

import { ErrorState } from '@/design-system';
import { env } from '@/config/env';

type ErrorBoundaryProps = {
  children: ReactNode;
  /** Custom fallback; receives the error + a reset fn. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Report to an error sink (Sentry etc.) — injected, not imported here. */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** Reset the boundary when any of these values change (e.g. route key). */
  resetKeys?: unknown[];
};

type ErrorBoundaryState = { error: Error | null };

/**
 * ERROR PLATFORM — the reusable React error boundary. Wrap routes/sections with
 * it; on a render crash it shows the themed ErrorState and offers a reset. Error
 * reporting is injected via `onError` so this stays vendor-agnostic.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.error && prev.resetKeys && this.props.resetKeys) {
      if (this.props.resetKeys.some((k, i) => k !== prev.resetKeys![i])) this.reset();
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return (
        <div className="grid min-h-[50vh] place-items-center p-6">
          <ErrorState
            title="Something went wrong"
            description={env.isDev ? error.message : 'An unexpected error occurred. Please try again.'}
            onRetry={this.reset}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
