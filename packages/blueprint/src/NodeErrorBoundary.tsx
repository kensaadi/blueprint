/**
 * NodeErrorBoundary — per-node isolation for user-supplied render code.
 *
 * The contract-driven runtime dispatches to two categories of user code
 * during render:
 *   1. `customNodes[type]` React components
 *   2. `slots[id]` / camelCase-prop React elements
 *
 * Both are outside Blueprint's control. If either throws during render,
 * we must not take down the entire compiled tree — the guarantee is
 * "one bad node, one broken node."
 *
 * This boundary catches render/lifecycle errors, logs them via `bpWarn`
 * (silent in prod), and renders an inline dev-facing fallback card.
 * Production fallback is a minimal `role=alert` block so the surrounding
 * page keeps working.
 *
 * Note: React error boundaries only catch render/commit-phase errors.
 * Async errors inside event handlers or effects still surface via the
 * usual React error handling — we cover those via targeted try/catch at
 * the call sites (see `evaluate.ts`, `useTranslatable.ts`).
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { bpWarn } from '@dashforge/blueprint-runtime';

type Props = {
  scope: 'customNode' | 'slot';
  nodeType?: string;
  nodeId?: string;
  children: ReactNode;
};

type State = { error: Error | null };

export class NodeErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const { scope, nodeType, nodeId } = this.props;
    const anchor = nodeId ? `#${nodeId}` : (nodeType ? `<${nodeType}>` : '');
    bpWarn(
      `${scope}${anchor}`,
      `render threw — replacing the node with an inline fallback (see cause).`,
      { error, componentStack: info.componentStack },
    );
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    const { scope, nodeType, nodeId } = this.props;
    const label = nodeId ?? nodeType ?? scope;
    return (
      <div
        role="alert"
        data-blueprint-fallback={scope}
        style={{
          padding: '8px 12px',
          border: '1px dashed #ef4444',
          borderRadius: 6,
          background: '#fef2f2',
          color: '#991b1b',
          fontSize: 12,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <strong>Blueprint runtime error</strong> — <code>{scope}</code>{' '}
        <code>{label}</code> failed to render.
      </div>
    );
  }
}
