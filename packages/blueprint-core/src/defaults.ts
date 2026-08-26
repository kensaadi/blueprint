import type { BlueprintNode } from './types';

/**
 * Collect the static initial values authored on form inputs in a subtree —
 * `props.defaultValue`, keyed by `props.name`. These seed the form; a runtime
 * `FormConfig.defaultValues` (the app / backend override) wins over them.
 *
 * Only NATIVE inputs carry `defaultValue` in props; custom fields manage their
 * own initial state via the component, so they are not collected here.
 */
export function collectFieldDefaults(root: BlueprintNode): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const walk = (n: BlueprintNode) => {
    const p = n.props as { name?: unknown; defaultValue?: unknown } | undefined;
    if (p && typeof p.name === 'string' && p.defaultValue !== undefined) {
      out[p.name] = p.defaultValue;
    }
    n.children?.forEach(walk);
  };
  walk(root);
  return out;
}
