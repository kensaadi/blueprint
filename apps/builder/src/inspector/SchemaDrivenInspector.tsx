/**
 * SchemaDrivenInspector — renders one `<PropEditor>` per schema field
 * for the currently selected node, and dispatches `updateProps` on
 * each change.
 *
 * The atom's schema is resolved once per selection via `fieldsForAtom`.
 * Atoms without a top-level `z.object(...)` (only `form` today) render
 * a fallback message; unknown atom types (custom nodes, forward-compat)
 * fall through to a JSON view.
 */
import { Typography } from '@dashforge/tw';
import { useBuilderDispatch } from '../state/BuilderStateContext';
import type { BlueprintNode } from '../state/types';
import { fieldsForAtom, isKnownAtom } from './schemaAdapter';
import { PropEditor } from './PropEditor';

export function SchemaDrivenInspector({ node }: { node: BlueprintNode }) {
  const dispatch = useBuilderDispatch();

  if (!isKnownAtom(node.type)) {
    return <UnknownAtomFallback node={node} />;
  }

  const fields = fieldsForAtom(node.type, node.props);
  if (!fields || fields.length === 0) {
    return (
      <Typography
        variant="caption"
        style={{ color: 'var(--bd-text-faint)' }}
      >
        No editable props for this atom.
      </Typography>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {fields.map((field) => (
        <PropEditor
          key={field.key}
          field={field}
          atomType={node.type}
          nodeUid={node._uid}
          value={node.props[field.key]}
          onChange={(next) => {
            // `undefined` means "unset" — we still store it explicitly
            // so undo/redo can distinguish "user cleared" from "was
            // never touched". The reducer's shallow merge preserves it.
            dispatch({
              type: 'updateProps',
              id: node._uid,
              patch: { [field.key]: next },
            });
          }}
        />
      ))}
    </div>
  );
}

function UnknownAtomFallback({ node }: { node: BlueprintNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Typography
        variant="caption"
        style={{ color: 'var(--bd-text-faint)' }}
      >
        Unknown atom type — no schema loaded. Props (read-only):
      </Typography>
      <pre
        className="rounded-md px-3 py-2 font-mono text-[12px] leading-[1.5]"
        style={{
          background: 'var(--bd-item)',
          color: 'var(--bd-text)',
          overflowX: 'auto',
        }}
      >
        {JSON.stringify(node.props, null, 2)}
      </pre>
    </div>
  );
}
