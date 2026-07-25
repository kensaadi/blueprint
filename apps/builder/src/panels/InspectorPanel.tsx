/**
 * Inspector panel — right-side node editor.
 *
 * Two modes:
 *   - No selection → hint list showing the 4 editable dimensions
 *     (props, visibility, access, i18n). Onboarding for the designer.
 *   - Selection → node summary (type + id) + read-only JSON view of
 *     `props`. Phase 3c will replace the read-only view with a
 *     schema-driven form editor (per-atom prop shapes come from
 *     Blueprint's zod schemas).
 *
 * DOGFOOD note G-24: no `<Tabs>` or `<PropertyList>` primitive in
 * @dashforge/tw yet — the schema-driven view will need one. For Phase
 * 3a we render props with a `<pre>` block; good enough to prove the
 * selection wiring end-to-end without pre-empting the 3c UI decisions.
 */
import { Typography, Divider } from '@dashforge/tw';
import { PanelShell } from '../primitives/PanelShell';
import { SectionLabel } from '../primitives/SectionLabel';
import { useBuilderState, useBuilderDispatch } from '../state/BuilderStateContext';
import { findNodeById, findParentOf } from '../state/reducer';
import { SchemaDrivenInspector } from '../inspector/SchemaDrivenInspector';
import { StateAxesEditor } from '../inspector/StateAxesEditor';
import { LayoutEditor } from '../inspector/LayoutEditor';
import { NodeIssuesPanel } from '../inspector/NodeIssuesPanel';
import { useValidation } from '../state/useValidation';
import { isAtomName } from '@dashforge/blueprint-core';
import { AtomAboutPanel } from '../inspector/AtomAboutPanel';

const HINTS = [
  { icon: 'settings', label: 'Props',       text: 'Schema-driven editor for the selected atom' },
  { icon: 'eye',      label: 'Visibility',  text: 'Boolean or rule predicate against $form fields' },
  { icon: 'lock',     label: 'Access',      text: 'RBAC requirement (read / update / hide)' },
  { icon: 'language', label: 'i18n keys',   text: 'Pick a $t key from the registry' },
];

export function InspectorPanel() {
  const { contract, selectedId } = useBuilderState();
  const node = findNodeById(contract.root, selectedId);
  const parent = findParentOf(contract.root, selectedId);
  const validation = useValidation();
  const nodeIssues = node ? validation.byId.get(node.id) ?? [] : [];

  return (
    <PanelShell
      className="w-[400px]"
      style={{ borderTop: 0, borderBottom: 0, borderRight: 0 }}
      padding="24px"
      role="complementary"
      ariaLabel="Node inspector"
    >
      <div className="flex flex-col gap-8">
        <SectionLabel>Inspector</SectionLabel>
        {node ? (
          <SelectedNodeView node={node} parent={parent} issues={nodeIssues} />
        ) : (
          <EmptyHints />
        )}
      </div>
    </PanelShell>
  );
}

function EmptyHints() {
  return (
    <>
      <Typography
        variant="body2"
        className="leading-relaxed"
        style={{ color: 'var(--bd-text-soft)' }}
      >
        Select a node on the canvas to edit its properties and state axes.
      </Typography>
      <Divider />
      <div className="flex flex-col gap-4">
        {HINTS.map((h) => (
          <div key={h.icon} className="flex items-start gap-2.5">
            <div
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
              style={{ background: 'var(--bd-item)' }}
            >
              <i
                className={`ti ti-${h.icon} text-[14px]`}
                style={{ color: 'var(--bd-text-soft)' }}
                aria-hidden
              />
            </div>
            <div className="min-w-0 flex-1">
              <Typography
                variant="body2"
                className="block font-medium"
                style={{ color: 'var(--bd-text)' }}
              >
                {h.label}
              </Typography>
              <Typography
                variant="caption"
                className="block text-[12px] leading-snug"
                style={{ color: 'var(--bd-text-faint)' }}
              >
                {h.text}
              </Typography>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function SelectedNodeView({
  node,
  parent,
  issues,
}: {
  node: import('../state/types').BlueprintNode;
  parent: import('../state/types').BlueprintNode | null;
  issues: import('../../blueprint-core/errors').ValidationError[];
}) {
  const isCustom = !isAtomName(node.type);
  const isGridChild = parent?.type === 'grid';
  return (
    <>
      <div className="flex flex-col gap-4">
        <Typography
          variant="caption"
          className="text-[12px] font-medium uppercase tracking-[0.1em]"
          style={{ color: 'var(--bd-text-faint)' }}
        >
          Selected atom
        </Typography>
        <div className="flex items-center gap-2">
          <Typography
            variant="body1"
            className="text-[17px] font-semibold"
            style={{ color: 'var(--bd-text)' }}
          >
            {node.type}
          </Typography>
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[10px]"
            style={{ background: 'var(--bd-item)', color: 'var(--bd-text-faint)' }}
          >
            {node.id}
          </span>
          {isCustom && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em]"
              style={{ background: 'var(--bd-accent-bg)', color: 'var(--bd-accent)' }}
            >
              User-defined
            </span>
          )}
        </div>
      </div>

      {!isCustom && (
        <>
          <Divider />
          <AtomAboutPanel atomName={node.type} />
        </>
      )}

      {issues.length > 0 && (
        <>
          <Divider />
          <NodeIssuesPanel issues={issues} />
        </>
      )}

      {isCustom && (
        <>
          <Divider />
          <CustomTypeEditor node={node} />
        </>
      )}

      {node.type === 'form' && (
        <>
          <Divider />
          <FormBindingPanel node={node} />
        </>
      )}

      {isGridChild && (
        <>
          <Divider />
          <LayoutEditor node={node} />
        </>
      )}

      <Divider />

      <div className="flex flex-col gap-4">
        <Typography
          variant="caption"
          className="text-[12px] font-medium uppercase tracking-[0.1em]"
          style={{ color: 'var(--bd-text-faint)' }}
        >
          Props
        </Typography>
        {isCustom ? (
          <span className="text-[12px]" style={{ color: 'var(--bd-text-faint)' }}>
            Custom nodes have no editable prop schema — the host's React
            component owns the props contract.
          </span>
        ) : (
          <SchemaDrivenInspector node={node} />
        )}
      </div>

      <Divider />

      <div className="flex flex-col gap-4">
        <Typography
          variant="caption"
          className="text-[12px] font-medium uppercase tracking-[0.1em]"
          style={{ color: 'var(--bd-text-faint)' }}
        >
          State axes
        </Typography>
        <StateAxesEditor node={node} />
      </div>
    </>
  );
}

/**
 * Read-only summary for `form`-typed nodes explaining how the host
 * app resolves the node's id against the `<DashBlueprint forms>` prop.
 * The form id is edited via the existing NODE.ID field in state axes;
 * this panel just makes the binding relationship obvious.
 */
function FormBindingPanel({
  node,
}: {
  node: import('../state/types').BlueprintNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Typography
        variant="caption"
        className="text-[12px] font-medium uppercase tracking-[0.1em]"
        style={{ color: 'var(--bd-text-faint)' }}
      >
        Form binding
      </Typography>
      <div
        className="rounded-md border p-3 text-[12px]"
        style={{
          borderColor: 'var(--bd-border)',
          background: 'var(--bd-item)',
          color: 'var(--bd-text-soft)',
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--bd-text-faint)' }}>Form id</span>
          <code
            className="rounded px-1.5 py-0.5 font-mono text-[12px]"
            style={{ background: 'var(--bd-surface, var(--bd-item))', color: 'var(--bd-accent)' }}
          >
            {node.id}
          </code>
        </div>
        <p className="mt-2 leading-relaxed">
          The host resolves the FormConfig (zod schema, initial values,
          submit handler) via{' '}
          <code>&lt;DashBlueprint forms=&#123;&#123; {node.id}: config &#125;&#125; /&gt;</code>.
          Rename via NODE.ID above.
        </p>
      </div>
    </div>
  );
}

/**
 * Editor for the `type` string of a user-defined (non-catalog) node.
 * Committed on blur so intermediate keystrokes don't spam history —
 * consistent with how NodeIdField handles the node id rename.
 */
function CustomTypeEditor({
  node,
}: {
  node: import('../state/types').BlueprintNode;
}) {
  const dispatch = useBuilderDispatch();
  return (
    <div className="flex flex-col gap-3">
      <Typography
        variant="caption"
        className="text-[12px] font-medium uppercase tracking-[0.1em]"
        style={{ color: 'var(--bd-text-faint)' }}
      >
        Custom type
      </Typography>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px]" style={{ color: 'var(--bd-text-soft)' }}>
          Component key
        </span>
        <input
          type="text"
          defaultValue={node.type}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== node.type) {
              dispatch({ type: 'setNodeType', id: node.id, newType: v });
            }
          }}
          className="w-full rounded-md border px-2.5 py-2 text-[13px] outline-none"
          style={{
            background: 'var(--bd-item)',
            borderColor: 'var(--bd-border)',
            color: 'var(--bd-text)',
          }}
        />
        <span className="text-[11px]" style={{ color: 'var(--bd-text-faint)' }}>
          The host binds this key to a React component via
          {' '}<code>&lt;DashBlueprint customNodes=&#123;&#123; {node.type}: MyComponent &#125;&#125; /&gt;</code>.
        </span>
      </label>
    </div>
  );
}
