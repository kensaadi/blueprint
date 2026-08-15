/**
 * CommandPalette — Cmd+K launcher for actions, add-atom, templates,
 * navigation, and toggles.
 *
 * Design:
 *   - Portalled overlay so it floats over every panel.
 *   - Escape / click-outside closes it.
 *   - Enter runs the highlighted command; Arrow-up / Arrow-down move
 *     the highlight; Tab is a synonym for Arrow-down.
 *   - Input starts empty and shows every section; typing filters by
 *     case-insensitive substring on the command label.
 *
 * Not a fuzzy matcher — a simple `includes` is fine for the palette
 * scale (< 100 commands). If we grow it we can swap in `fuse.js`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBuilderState, useBuilderDispatch } from '../state/BuilderStateContext';
import { useFileOps } from '../hooks/useFileOps';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useAlert, usePrompt } from '../primitives/DialogFlow';
import { downloadContract, copyContract } from '../state/exportContract';
import { pickAndParseContract } from '../state/importContract';
import { clearPersistedContract } from '../state/persistence';
import { ATOM_CATEGORIES } from '../data/atomCatalog';
import { iconForType } from '../data/typeIcons';
import { TEMPLATES } from '../templates/library';
import { fuzzyScore, highlightRuns, type FuzzyMatch } from './fuzzy';
import { listRecents, pushRecent } from './recents';

/**
 * `'Recent'` is a synthetic section injected at the top of the idle
 * (empty-query) list in Cmd+K mode — never emitted by the registry.
 */
type Command = {
  id: string;
  section: 'Actions' | 'Add atom' | 'Templates' | 'Toggle' | 'Navigate' | 'Recent';
  label: string;
  icon?: string;
  /**
   * Small gray subtext rendered between the label and the trailing
   * hint chip. Navigate rows use it for the ancestor breadcrumb so the
   * user knows where the target sits in the tree at a glance.
   */
  hint?: string;
  /** Optional keyboard hint shown on the right (already-registered global shortcuts). */
  keys?: string[];
  handler: () => void;
};

export type PaletteMode = 'all' | 'navigate';

export function CommandPalette({
  open,
  mode = 'all',
  onClose,
  theme,
  onToggleTheme,
  onOpenBrowser,
  sourceOpen,
  onToggleSource,
}: {
  open: boolean;
  /**
   * `'all'` (default) shows every command grouped by section.
   * `'navigate'` restricts the pool to "Select …" node picks and swaps
   * the placeholder to a jump-to-node hint (Cmd+P behaviour).
   */
  mode?: PaletteMode;
  onClose: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  /** Opens the File browser modal (Cmd+O). */
  onOpenBrowser?: () => void;
  sourceOpen: boolean;
  onToggleSource: () => void;
}) {
  const { contract, selectedId } = useBuilderState();
  const dispatch = useBuilderDispatch();
  const fileOps = useFileOps();
  const promptDialog = usePrompt();
  const alertDialog = useAlert();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  // MRU snapshot — captured once per open so the list doesn't shuffle
  // under the cursor as the user runs commands. Only populated in
  // Cmd+K mode; Cmd+P uses a scoped list where recents add no value.
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const paletteRootRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(paletteRootRef, open);

  // Reset the input every time the palette opens (or the mode swaps
  // — Cmd+K → Cmd+P should feel like starting over). Intentional
  // setState-in-effect: this IS the sync point between an external
  // control (parent's `open` toggle) and this modal's internal state.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('');
      setCursor(0);
      setRecentIds(mode === 'all' ? listRecents(5) : []);
      // Focus the input on next tick — the portal DOM lands
      // synchronously but focus needs to wait for the transition.
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open, mode]);

  /**
   * Every command execution goes through here — the fuzzy row's
   * onClick, the Enter key handler, and any programmatic run. Pushes
   * the command onto the MRU list before firing so the "Recent"
   * section reflects what the user just did next time they open the
   * palette. Nav rows are skipped inside `pushRecent`.
   */
  const run = useCallback((cmd: Command) => {
    pushRecent(cmd.id);
    cmd.handler();
  }, []);

  const parentIdForAdd = useMemo<string | null>(() => {
    // Resolution order:
    //   1. Selection is a container → drop into it.
    //   2. Selection is a leaf → walk up ancestors to the nearest
    //      container (F-04 fix: without this, running "Add field" five
    //      times in a row lands 4 of the 5 as siblings of the intended
    //      parent because the reducer re-selects each new leaf).
    //   3. No selection → root if it's a container.
    //   4. Nothing → null (drop becomes the new root).
    const CONTAINER_TYPES = new Set([
      'form', 'stack', 'section', 'card', 'container', 'grid', 'box',
      'tabs', 'accordion',
    ]);
    if (!contract.root) return null;
    if (selectedId) {
      // Depth-first walk that remembers the ancestor chain so we can
      // fall back to the nearest container even when the target itself
      // is a leaf.
      const chain: import('../state/types').BlueprintNode[] = [];
      const walk = (
        n: import('../state/types').BlueprintNode,
      ): boolean => {
        chain.push(n);
        if (n._uid === selectedId) return true;
        for (const c of n.children) if (walk(c)) return true;
        chain.pop();
        return false;
      };
      if (walk(contract.root)) {
        for (let i = chain.length - 1; i >= 0; i--) {
          if (CONTAINER_TYPES.has(chain[i].type)) return chain[i]._uid;
        }
      }
    }
    if (CONTAINER_TYPES.has(contract.root.type)) return contract.root._uid;
    return null;
  }, [contract.root, selectedId]);

  // ────────────────────────────────────────────────────────────────
  // Command registry — recomputed on every render so it reflects the
  // current selection / undo state / palette catalog.
  // ────────────────────────────────────────────────────────────────
  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [];
    const close = () => onClose();

    // Actions ───────────────────────────────────────────────────
    cmds.push({
      id: 'action:new',
      section: 'Actions',
      label: 'New contract',
      icon: 'file-plus',
      handler: () => {
        dispatch({ type: 'replaceContract', contract: { version: '1.0', root: null } });
        clearPersistedContract();
        close();
      },
    });
    cmds.push({
      id: 'action:import',
      section: 'Actions',
      label: 'Import from JSON file…',
      icon: 'upload',
      handler: async () => {
        close();
        const result = await pickAndParseContract();
        if (!result) return;
        if (!result.ok) {
          await alertDialog({ title: 'Import failed', body: result.error });
          return;
        }
        dispatch({ type: 'replaceContract', contract: result.contract });
      },
    });
    cmds.push({
      id: 'action:export',
      section: 'Actions',
      label: 'Export as JSON (download)',
      icon: 'download',
      handler: () => { downloadContract(contract); close(); },
    });
    cmds.push({
      id: 'action:save',
      section: 'Actions',
      label: 'Save to workspace',
      icon: 'device-floppy',
      keys: ['⌘', 'S'],
      handler: () => { close(); void fileOps.save(); },
    });
    cmds.push({
      id: 'action:saveAs',
      section: 'Actions',
      label: 'Save as… (pick a new file name)',
      icon: 'file-plus',
      keys: ['⌘', '⇧', 'S'],
      handler: () => { close(); void fileOps.saveAs(); },
    });
    if (onOpenBrowser) {
      cmds.push({
        id: 'action:openFile',
        section: 'Actions',
        label: 'Open file… (browse workspaces)',
        icon: 'folder-open',
        keys: ['⌘', 'O'],
        handler: () => { close(); onOpenBrowser(); },
      });
    }
    cmds.push({
      id: 'action:copy',
      section: 'Actions',
      label: 'Copy JSON to clipboard',
      icon: 'copy',
      handler: () => { void copyContract(contract); close(); },
    });
    // Custom node — Blueprint's Decision #16 escape hatch. Prompts for
    // a type name, inserts a node whose `type` doesn't map to any
    // catalog atom. The runtime host wires it up via
    // `<DashBlueprint customNodes={{ [type]: MyComponent }}>`.
    cmds.push({
      id: 'action:addCustom',
      section: 'Actions',
      label: 'Add custom node…',
      icon: 'puzzle',
      handler: async () => {
        close();
        const type = await promptDialog({
          title: 'Add custom node',
          body: 'The key the host app maps to a React component via customNodes.',
          label: 'Component type',
          defaultValue: 'myCustomWidget',
          confirmLabel: 'Add',
        });
        if (!type) return;
        dispatch({ type: 'addNode', parentId: parentIdForAdd, nodeType: type });
      },
    });
    cmds.push({
      id: 'action:undo',
      section: 'Actions',
      label: 'Undo',
      icon: 'arrow-back-up',
      keys: ['⌘', 'Z'],
      handler: () => { dispatch({ type: 'undo' }); close(); },
    });
    cmds.push({
      id: 'action:redo',
      section: 'Actions',
      label: 'Redo',
      icon: 'arrow-forward-up',
      keys: ['⌘', '⇧', 'Z'],
      handler: () => { dispatch({ type: 'redo' }); close(); },
    });
    if (selectedId) {
      cmds.push({
        id: 'action:delete',
        section: 'Actions',
        label: 'Delete selected element',
        icon: 'trash',
        keys: ['⌫'],
        handler: () => { dispatch({ type: 'removeNode', id: selectedId }); close(); },
      });
      cmds.push({
        id: 'action:deselect',
        section: 'Actions',
        label: 'Clear selection',
        icon: 'circle-x',
        handler: () => { dispatch({ type: 'select', id: null }); close(); },
      });
    }

    // Add atom — every catalog entry, contextual parent hint. The
    // suffix names the actual resolved parent so the user isn't
    // surprised when F-04's walk-up heuristic redirects an "into leaf"
    // add to the leaf's container ancestor.
    let addLabelSuffix: string;
    if (parentIdForAdd === null) {
      addLabelSuffix = ' (as root)';
    } else if (parentIdForAdd === selectedId) {
      addLabelSuffix = ' (into selection)';
    } else if (contract.root && parentIdForAdd === contract.root._uid) {
      addLabelSuffix = ' (into root)';
    } else {
      addLabelSuffix = ` (into ${parentIdForAdd})`;
    }
    for (const cat of ATOM_CATEGORIES) {
      for (const atom of cat.atoms) {
        cmds.push({
          id: 'add:' + atom.type,
          section: 'Add atom',
          label: `Add ${atom.type}${addLabelSuffix}`,
          icon: atom.icon,
          handler: () => {
            dispatch({
              type: 'addNode',
              parentId: parentIdForAdd,
              nodeType: atom.type,
            });
            close();
          },
        });
      }
    }

    // Templates ────────────────────────────────────────────────
    for (const t of TEMPLATES) {
      cmds.push({
        id: 'tpl:' + t.id,
        section: 'Templates',
        label: `New from template — ${t.name}`,
        icon: t.icon,
        handler: () => {
          dispatch({ type: 'replaceContract', contract: t.contract });
          close();
        },
      });
    }

    // Toggle ───────────────────────────────────────────────────
    cmds.push({
      id: 'toggle:theme',
      section: 'Toggle',
      label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
      icon: theme === 'dark' ? 'sun' : 'moon',
      handler: () => { onToggleTheme(); close(); },
    });
    cmds.push({
      id: 'toggle:source',
      section: 'Toggle',
      label: sourceOpen ? 'Hide source drawer' : 'Show source drawer',
      icon: 'code',
      handler: () => { onToggleSource(); close(); },
    });

    // Navigate — select any node in the tree. We thread the ancestor
    // ids as we recurse so each row can advertise its own path (`root
    // › stack-1 › …`) — that's the breadcrumb hint the palette shows
    // to the right of the label. The root itself gets no breadcrumb.
    // Container nodes also advertise their direct child count so the
    // user can gauge the subtree size before jumping in.
    if (contract.root) {
      const walk = (
        node: import('../state/types').BlueprintNode,
        ancestors: string[],
      ) => {
        const n = node.children.length;
        const count = n > 0 ? ` · ${n} item${n === 1 ? '' : 's'}` : '';
        cmds.push({
          id: 'nav:' + node._uid,
          section: 'Navigate',
          label: `Select ${node.type}${count} · ${node.nodeId}`,
          hint: ancestors.length > 0 ? ancestors.join(' › ') : undefined,
          icon: iconForType(node.type),
          handler: () => { dispatch({ type: 'select', id: node._uid }); close(); },
        });
        const nextAncestors = [...ancestors, node._uid];
        for (const c of node.children) walk(c, nextAncestors);
      };
      walk(contract.root, []);
    }

    return cmds;
  }, [
    contract, dispatch, onClose, parentIdForAdd, selectedId,
    theme, onToggleTheme, sourceOpen, onToggleSource, fileOps, onOpenBrowser,
    promptDialog, alertDialog,
  ]);

  // In `navigate` mode the pool is restricted to the Navigate section
  // so Cmd+P feels like VSCode's "Go to file" — a quick jump, not a
  // general command runner.
  const pool = useMemo(
    () => (mode === 'navigate'
      ? commands.filter((c) => c.section === 'Navigate')
      : commands),
    [commands, mode],
  );

  // With an empty query we keep the natural order (grouped by section)
  // and prepend a synthetic "Recent" section built from the MRU. With
  // any input we switch to a global ranking by fuzzy score so the
  // most relevant command lands at the top regardless of section.
  const filtered = useMemo<Array<{ cmd: Command; match: FuzzyMatch | null }>>(
    () => {
      const q = query.trim();
      if (!q) {
        // Idle mode. Resolve MRU IDs against the current pool — an ID
        // that no longer exists (deleted node, missing template) simply
        // disappears. Then hide those IDs from their natural section
        // so each command appears exactly once.
        const byId = new Map(pool.map((cmd) => [cmd.id, cmd]));
        const recent = recentIds
          .map((id) => byId.get(id))
          .filter((cmd): cmd is Command => cmd !== undefined)
          .map((cmd) => ({
            cmd: { ...cmd, section: 'Recent' as const },
            match: null as FuzzyMatch | null,
          }));
        const recentSet = new Set(recent.map((e) => e.cmd.id));
        const rest = pool
          .filter((cmd) => !recentSet.has(cmd.id))
          .map((cmd) => ({ cmd, match: null as FuzzyMatch | null }));
        return [...recent, ...rest];
      }
      const scored: Array<{ cmd: Command; match: FuzzyMatch }> = [];
      for (const cmd of pool) {
        const m = fuzzyScore(q, cmd.label);
        if (m !== null) scored.push({ cmd, match: m });
      }
      scored.sort((a, b) => b.match.score - a.match.score);
      return scored;
    },
    [pool, query, recentIds],
  );

  // Keep the cursor inside the filtered range as the filter shrinks.
  // Legitimate clamp — the alternative (compute-at-read) would leave
  // the stored cursor stale and re-diverge on the next keystroke.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cursor >= filtered.length) setCursor(Math.max(0, filtered.length - 1));
  }, [filtered.length, cursor]);

  // Group by section for visual separation — only meaningful when
  // there's no query (natural grouping). While searching, we render a
  // single ranked list with the section shown as a small side tag.
  const grouped = useMemo(() => {
    const out = new Map<string, Array<{ cmd: Command; match: FuzzyMatch | null }>>();
    for (const entry of filtered) {
      const bucket = out.get(entry.cmd.section);
      if (bucket) bucket.push(entry);
      else out.set(entry.cmd.section, [entry]);
    }
    return out;
  }, [filtered]);

  const isSearching = query.trim().length > 0;

  // Keyboard nav — only while the palette is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        setCursor((c) => Math.min(filtered.length - 1, c + 1));
        return;
      }
      if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const entry = filtered[cursor];
        if (entry) run(entry.cmd);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, cursor, onClose, run]);

  // Scroll the highlighted row into view on cursor change.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-cmd-index="${cursor}"]`,
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  // Hover-preview: when the cursor lands on a Navigate row, flash the
  // corresponding node in the Canvas without touching the real
  // selection. Any other row (or a closed palette) clears the preview.
  useEffect(() => {
    if (!open) {
      dispatch({ type: 'hover', id: null });
      return;
    }
    const entry = filtered[cursor];
    // `nav:<node-id>` is the ID scheme built in the Navigate section.
    const navId =
      entry && entry.cmd.id.startsWith('nav:')
        ? entry.cmd.id.slice(4)
        : null;
    dispatch({ type: 'hover', id: navId });
  }, [open, filtered, cursor, dispatch]);

  // Guarantee cleanup on unmount — belt-and-braces so a hard React
  // teardown doesn't leave a ghost outline on the canvas.
  useEffect(() => () => { dispatch({ type: 'hover', id: null }); }, [dispatch]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-start justify-center pt-24"
      style={{ background: 'rgba(0,0,0,0.35)', zIndex: 1100 }}
      onMouseDown={(e) => {
        // Only close when the click starts on the backdrop itself.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={paletteRootRef}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'navigate' ? 'Go to node' : 'Command palette'}
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-lg border shadow-2xl"
        style={{
          background: 'var(--bd-header)',
          borderColor: 'var(--bd-border-strong)',
          color: 'var(--bd-text)',
          maxHeight: 'calc(100vh - 160px)',
        }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-2 border-b px-4 py-3"
          style={{ borderColor: 'var(--bd-border)' }}
        >
          <i
            className={`ti ti-${mode === 'navigate' ? 'search' : 'command'} text-[16px]`}
            style={{ color: 'var(--bd-text-faint)' }}
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            placeholder={
              mode === 'navigate'
                ? 'Jump to node…'
                : 'Type a command or search…'
            }
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            className="w-full bg-transparent text-[14px] outline-none"
            style={{ color: 'var(--bd-text)' }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[11px]"
              style={{ color: 'var(--bd-text-faint)' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto p-2"
        >
          {filtered.length === 0 ? (
            <div
              className="p-4 text-center text-[13px]"
              style={{ color: 'var(--bd-text-soft)' }}
            >
              No matching commands.
            </div>
          ) : isSearching ? (
            // Search mode: single ranked list, section shown inline
            // (skipped in `navigate` — every row is Navigate by
            // definition, so the tag would just be noise).
            filtered.map((entry, idx) => (
              <CommandRow
                key={entry.cmd.id}
                entry={entry}
                index={idx}
                active={idx === cursor}
                onHover={setCursor}
                onRun={run}
                showSection={mode !== 'navigate'}
              />
            ))
          ) : (
            // Idle mode: keep the natural section-based grouping. In
            // `navigate` there's only one section — hide the header so
            // the list starts clean.
            Array.from(grouped.entries()).map(([section, entries]) => (
              <div key={section} className="mb-3 last:mb-0">
                {mode !== 'navigate' && (
                  <div
                    className="mb-1 px-2 text-[10px] font-medium uppercase tracking-[0.08em]"
                    style={{ color: 'var(--bd-text-faint)' }}
                  >
                    {section}
                  </div>
                )}
                {entries.map((entry) => {
                  const idx = filtered.indexOf(entry);
                  return (
                    <CommandRow
                      key={entry.cmd.id}
                      entry={entry}
                      index={idx}
                      active={idx === cursor}
                      onHover={setCursor}
                      onRun={run}
                    />
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center justify-between border-t px-4 py-2 text-[11px]"
          style={{ borderColor: 'var(--bd-border)', color: 'var(--bd-text-faint)' }}
        >
          <span>↑↓ navigate · ↵ run · esc close</span>
          <span>{filtered.length} command{filtered.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * A single command row. Extracted so the two rendering modes (grouped
 * vs flat) share the same visual + a11y wiring. Bolds the characters
 * that matched the fuzzy query.
 */
function CommandRow({
  entry,
  index,
  active,
  onHover,
  onRun,
  showSection,
}: {
  entry: { cmd: Command; match: FuzzyMatch | null };
  index: number;
  active: boolean;
  onHover: (i: number) => void;
  onRun: (cmd: Command) => void;
  showSection?: boolean;
}) {
  const { cmd, match } = entry;
  const runs = match ? highlightRuns(cmd.label, match.positions) : null;
  return (
    <button
      type="button"
      data-cmd-index={index}
      onMouseEnter={() => onHover(index)}
      onClick={() => onRun(cmd)}
      className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13px] transition-colors"
      style={{
        background: active ? 'var(--bd-accent-bg)' : 'transparent',
        color: active ? 'var(--bd-accent)' : 'var(--bd-text)',
      }}
    >
      <i
        className={`ti ti-${cmd.icon ?? 'square'} shrink-0 text-[15px]`}
        style={{
          color: active ? 'var(--bd-accent)' : 'var(--bd-text-soft)',
        }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">
        {runs
          ? runs.map((run, i) => (
              <span
                key={i}
                style={{
                  fontWeight: run.matched ? 600 : 400,
                  color: run.matched && active ? 'var(--bd-accent)' : undefined,
                }}
              >
                {run.text}
              </span>
            ))
          : cmd.label}
      </span>
      {cmd.hint && (
        <span
          className="min-w-0 max-w-[45%] shrink truncate text-[11px]"
          style={{ color: active ? 'var(--bd-accent)' : 'var(--bd-text-faint)' }}
          title={cmd.hint}
        >
          {cmd.hint}
        </span>
      )}
      {showSection && (
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em]"
          style={{
            background: 'var(--bd-item)',
            color: 'var(--bd-text-faint)',
          }}
        >
          {cmd.section}
        </span>
      )}
      {cmd.keys && (
        <span className="flex items-center gap-0.5">
          {cmd.keys.map((k, i) => (
            <kbd
              key={i}
              className="rounded px-1 py-0.5 font-mono text-[10px]"
              style={{
                background: 'var(--bd-item)',
                color: 'var(--bd-text-soft)',
              }}
            >
              {k}
            </kbd>
          ))}
        </span>
      )}
    </button>
  );
}
