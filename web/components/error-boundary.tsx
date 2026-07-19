'use client';

import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

// Catches render/lifecycle errors from anywhere in the tree it wraps. Without
// this, a single un-thrown throw anywhere in the app blanks the screen with
// Next.js's default overlay. With it, the user sees a calm, actionable
// recovery UI and we still get the error logged (server logs pick it up via
// the componentDidCatch path in production builds).

interface Props {
  children: ReactNode;
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log the *message* on its own line first so DevTools doesn't collapse
    // it under the intercept-console-error wrapper stack.
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary] ${error.name}: ${error.message}`);
    // eslint-disable-next-line no-console
    console.error(error);
    if (info?.componentStack) {
      // eslint-disable-next-line no-console
      console.error('Component stack:', info.componentStack);
    }
    // Ship to Sentry when a DSN is wired. No-op otherwise.
    Sentry.captureException(error, {
      contexts: {
        react: { componentStack: info?.componentStack ?? '' },
      },
      tags: { source: 'ErrorBoundary' },
    });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, reset: this.reset });
      }
      return <DefaultFallback error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const isDev = process.env.NODE_ENV !== 'production';
  return (
    <div className="min-h-[60vh] grid place-items-center px-6">
      <div className="max-w-md text-center space-y-4">
        <div className="text-5xl">🌿</div>
        <h1 className="font-display text-3xl text-sage-900">
          Something went sideways.
        </h1>
        <p className="text-sage-600">
          We've logged the issue. Try again — most of the time this resolves
          itself. If it keeps happening, refresh the page.
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') window.location.reload();
            }}
            className="btn-ghost"
          >
            Reload
          </button>
        </div>
        {isDev && (
          <details className="text-left text-xs text-sage-500 mt-4 rounded-xl border border-sage-100 p-3">
            <summary className="cursor-pointer text-sage-700">Dev-only: error details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">{error.message}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
