/**
 * Builder-wide error boundary — catches a crash in Canvas or
 * Inspector and shows a recoverable fallback instead of a blank
 * white page.
 *
 * The fallback offers two escape hatches:
 *   - "Try again" resets the boundary so the next render can succeed
 *     (useful when a transient render bug clears after undo).
 *   - "Reset to empty contract" wipes the session snapshot and
 *     reloads. Non-recoverable last resort.
 *
 * We don't send crash reports (no telemetry in the sandbox), but we
 * log the error + component stack so the browser DevTools console
 * still has actionable data.
 */
import { Component, type ReactNode, type ErrorInfo } from 'react';

type State = { hasError: boolean; error?: Error };

export class BuilderErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
     
    console.error('[Builder] Uncaught render error', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        className="flex h-full w-full items-center justify-center p-8"
        style={{ background: 'var(--bd-canvas)' }}
      >
        <div
          className="flex max-w-md flex-col gap-4 rounded-lg border p-6 text-center"
          style={{
            borderColor: 'var(--bd-border)',
            background: 'var(--bd-surface, var(--bd-item))',
          }}
        >
          <i
            className="ti ti-alert-triangle text-[36px]"
            style={{ color: 'var(--bd-warning, #c47f00)' }}
            aria-hidden
          />
          <h2
            className="text-[16px] font-semibold"
            style={{ color: 'var(--bd-text)' }}
          >
            Something went wrong rendering the Builder
          </h2>
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: 'var(--bd-text-soft)' }}
          >
            The current session was preserved — your work is safe. Try
            re-rendering; if that fails, reset to an empty contract.
          </p>
          <pre
            className="max-h-32 overflow-auto rounded-md p-2 text-left font-mono text-[11px]"
            style={{
              background: 'var(--bd-item)',
              color: 'var(--bd-text-faint)',
            }}
          >
            {this.state.error?.message ?? 'Unknown error'}
          </pre>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors"
              style={{
                borderColor: 'var(--bd-border)',
                color: 'var(--bd-text)',
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem('builder-v2:session:v1');
                } catch {
                  // ignore
                }
                window.location.reload();
              }}
              className="rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors"
              style={{
                background: 'var(--bd-accent)',
                color: 'white',
              }}
            >
              Reset to empty contract
            </button>
          </div>
        </div>
      </div>
    );
  }
}
