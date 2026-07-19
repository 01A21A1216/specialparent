'use client';

// Small, consistent wrapper for the three states every SWR-backed page has:
// loading, error, and empty. Without an error branch, a failed fetch shows
// "Loading…" forever; without an empty branch, a legitimate zero-result
// state looks like the page is broken.

export function ApiState({
  loading,
  error,
  isEmpty,
  emptyTitle = 'Nothing here yet.',
  emptyBody,
  emptyCta,
  onRetry,
  children,
}: {
  loading: boolean;
  error?: Error | { message?: string } | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  emptyCta?: React.ReactNode;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="card animate-pulse space-y-3">
        <div className="h-4 bg-sage-100 rounded w-1/3" />
        <div className="h-3 bg-sage-100 rounded" />
        <div className="h-3 bg-sage-100 rounded w-5/6" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="card border-coral-200 bg-coral-50 text-coral-800">
        <div className="font-medium">Couldn't load this right now.</div>
        <p className="text-sm mt-1 text-coral-700">
          {error.message || 'Something went wrong on our side.'}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn-ghost text-sm mt-3"
          >
            Try again
          </button>
        )}
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="card text-center py-12 space-y-3">
        <div className="text-4xl">🍃</div>
        <h3 className="font-display text-xl text-sage-900">{emptyTitle}</h3>
        {emptyBody && <p className="text-sage-600 text-sm max-w-md mx-auto">{emptyBody}</p>}
        {emptyCta && <div className="pt-2">{emptyCta}</div>}
      </div>
    );
  }
  return <>{children}</>;
}
