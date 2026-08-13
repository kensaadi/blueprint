/**
 * Icon System — B2-rich registry (locked design, issue #54).
 *
 * The contract references icons by id only:
 *   { type: 'button', props: { label: 'Save', icon: 'save' } }
 *
 * The registry maps each id to a React render function. Source is agnostic
 * — inline SVG, lucide-react, @mui/icons-material, whatever. The atom just
 * asks for the id; the registry handles the rest.
 *
 * Three-layer defense for missing ids:
 *   1. Catalog validation — `icon` field is `string` at the contract level
 *   2. Runtime validation — `collectMissingIconRefs` emits a diagnostic
 *      (warning lenient / error strict) for every id not in the registry
 *   3. Render fallback — `<IconFallback />` paints a small placeholder
 *      square so the UI never explodes on a typo
 */
import { z } from './zod-jitless';
import type { ReactElement } from 'react';
import type { BlueprintNode } from './types';
import type { ValidationError } from './errors';
import { isAtomName } from './atoms';

export type IconRenderProps = {
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
};

export type IconEntry = {
  id: string;
  render: (props: IconRenderProps) => ReactElement;
  /** Free-form tags — useful for devtools grouping ("lucide", "mui", "custom"). */
  sources?: ReadonlyArray<string>;
  meta?: {
    label?: string;
    tags?: ReadonlyArray<string>;
  };
};

export type IconRegistry = ReadonlyArray<IconEntry>;

/** Atom prop names that carry an icon id reference. */
export const ICON_REF_PROPS = ['icon'] as const;

/**
 * Walk the tree, collect every (atom, icon-id) pair where the id is not in
 * the registry, and emit a diagnostic per miss.
 *
 * Pure function — safe to call from a `useMemo`.
 */
export function collectMissingIconRefs(
  root: BlueprintNode,
  registry: IconRegistry,
  mode: 'strict' | 'lenient',
): ValidationError[] {
  const ids = new Set(registry.map((i) => i.id));
  const out: ValidationError[] = [];
  walk(root, '/root');
  return out;

  function walk(node: BlueprintNode, prefix: string): void {
    if (isAtomName(node.type) && node.props) {
      for (const key of ICON_REF_PROPS) {
        const value = (node.props as Record<string, unknown>)[key];
        if (typeof value === 'string' && value && !ids.has(value)) {
          out.push({
            path: `${prefix}/props/${key}`,
            message: `Icon id "${value}" is not registered. Add it to \`icons={[...]}\` or remove the reference.`,
            severity: mode === 'strict' ? 'error' : 'warning',
            code: 'UNKNOWN_ICON_REF',
          });
        }
      }
    }
    node.children?.forEach((child, i) => walk(child, `${prefix}/children/${i}`));
  }
}

/** Schema shared by atom catalogs that accept an icon id. */
export const iconIdSchema = z.string().min(1, 'icon id cannot be empty');
