/**
 * Icon registry context.
 *
 * `<DashBlueprint icons={...}>` wraps the compiled tree in this provider so
 * every atom binding can call `useIcon(id)` and resolve the entry without
 * threading the registry as a prop.
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { IconEntry, IconRegistry } from '@dashforge/blueprint-core';
import { bpWarn } from './warn';

const EMPTY: IconRegistry = [];

const IconRegistryContext = createContext<IconRegistry>(EMPTY);

export function IconProvider({
  registry,
  children,
}: {
  registry: IconRegistry;
  children: ReactNode;
}) {
  return (
    <IconRegistryContext.Provider value={registry}>
      {children}
    </IconRegistryContext.Provider>
  );
}

export function useIconRegistry(): IconRegistry {
  return useContext(IconRegistryContext);
}

export function useIcon(id: string | null | undefined): IconEntry | null {
  const registry = useIconRegistry();
  if (!id) return null;
  return registry.find((i) => i.id === id) ?? null;
}

/**
 * Tiny placeholder square used by atom bindings when the id is not found.
 * Keeps layout stable so visual diffing still works.
 */
export function IconFallback({
  id,
  size = 16,
}: {
  id?: string;
  size?: number;
}) {
  return (
    <span
      role="img"
      aria-label={id ? `missing icon: ${id}` : 'missing icon'}
      title={id ? `missing icon: ${id}` : 'missing icon'}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: 2,
        border: '1px dashed currentColor',
        opacity: 0.4,
      }}
    />
  );
}

/**
 * Safe wrapper around `entry.render(props)`. User-supplied render
 * functions are user code — a throw here would bubble through the
 * binding and crash the atom. We isolate it and return an IconFallback
 * on failure, matching the "one bad icon, one broken slot" guarantee.
 *
 * Prefer this in bindings over calling `entry.render(...)` directly.
 */
export function renderIcon(
  entry: IconEntry | null | undefined,
  id: string | undefined,
  props: Record<string, unknown>,
): ReactNode {
  if (!entry) return <IconFallback id={id} size={typeof props.size === 'number' ? props.size : undefined} />;
  try {
    return entry.render(props);
  } catch (e) {
    bpWarn(
      `icon "${entry.id}"`,
      'render() threw — falling back to the missing-icon placeholder.',
      e,
    );
    return <IconFallback id={entry.id} size={typeof props.size === 'number' ? props.size : undefined} />;
  }
}
