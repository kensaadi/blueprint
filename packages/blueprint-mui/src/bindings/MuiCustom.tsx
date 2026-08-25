import type { ReactNode } from 'react';

type Props = {
  component: string;
  dataSchema?: Record<string, string>;
  config?: Record<string, unknown>;
  children?: ReactNode;
};

/**
 * Fallback binding for a `custom` node. It is reached ONLY when the compiler
 * could not resolve `props.component` against `customNodes` and there is no
 * `slots[nodeId]` override — i.e. the consumer has not registered this
 * component. Renders the declarative `children` (skeleton) when present, else
 * a labelled placeholder so the gap is visible instead of silent.
 */
export function MuiCustom({ component, children }: Props): ReactNode {
  if (children) return <>{children}</>;
  return (
    <span
      role="note"
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 6,
        border: '1px dashed var(--df-color-warning, #d97706)',
        color: 'var(--df-color-warning, #d97706)',
        fontSize: 12,
        fontFamily: 'monospace',
      }}
    >
      custom: {component} (not registered)
    </span>
  );
}
