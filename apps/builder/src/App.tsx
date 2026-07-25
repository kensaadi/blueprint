/**
 * Builder V2 — top-level shell composer.
 *
 * Layout: `<AppShell>` from @dashforge/tw is the orchestrator. Maps to:
 *   - header → <BuilderHeader>
 *   - nav    → <PalettePanel>
 *   - footer → <SourceDrawer>
 *   - children → <CanvasPanel> + <InspectorPanel> side-by-side
 *
 * State: theme (dark | light) + sourceOpen (drawer collapse). Real
 * project state (open file, contract tree, selection) lands in
 * subsequent phases.
 *
 * DOGFOOD notes:
 *   - G-11 (already logged in InspectorPanel): AppShell has only one
 *     nav slot (left). Inspector lives inside `children` next to
 *     canvas. See report.
 *   - G-14: AppShell's `footer` slot has no "sticky" or "drawer"
 *     semantics — it's just a normal bottom area. For drawer-like
 *     behavior with toggle visibility we conditionally render. Works
 *     but lacks animations / drag-resize. See G-12 too.
 */
import { useState, useEffect } from 'react';
import { AppShell } from '@dashforge/tw';
import { setMode } from '@dashforge/tw-theme';
import { BuilderStateProvider } from './state/BuilderStateContext';
import { DndProvider } from './dnd/DndProvider';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useFileOps } from './hooks/useFileOps';
import { useValidation } from './state/useValidation';
import { useBuilderState, useBuilderDispatch, useBuilderFileDirty } from './state/BuilderStateContext';
import { CollapseProvider } from './state/CollapseContext';
import { ConfirmDialog } from './primitives/ConfirmDialog';
import { downloadContract } from './state/exportContract';
import { pickAndParseContract } from './state/importContract';
import { clearPersistedContract } from './state/persistence';
import type { ValidationState } from './shell/StatusChip';
import { BuilderHeader } from './shell/BuilderHeader';
import { StatusBar } from './shell/StatusBar';
import { PalettePanel } from './panels/PalettePanel';
import { CanvasPanel } from './panels/CanvasPanel';
import { InspectorPanel } from './panels/InspectorPanel';
import { SourceDrawer } from './panels/SourceDrawer';
import { CommandPalette, type PaletteMode } from './commands/CommandPalette';
import { FileBrowserModal } from './workspaces/FileBrowserModal';
import { SaveAsFlowProvider } from './workspaces/SaveAsFlow';
import { DialogFlowProvider, useAlert } from './primitives/DialogFlow';
import { BuilderErrorBoundary } from './shell/BuilderErrorBoundary';

type Theme = 'dark' | 'light';

export function BuilderApp() {
  const [theme, setTheme] = useState<Theme>('light');
  const [sourceOpen, setSourceOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<PaletteMode>('all');
  const [browserOpen, setBrowserOpen] = useState(false);

  // Apply theme + app scope on <html> so the CSS variables in
  // tokens.css activate. `data-app="builder"` keeps the variables
  // scoped — they never leak into the learn application.
  //
  // G-23: @dashforge/tw primitives (TopBar, Button, Chip…) read their
  // mode from `data-dash-tw-theme` on <html>, owned by
  // `DashforgeTailwindProvider`. Writing the attribute directly does
  // NOT update it — the provider's internal store wins on re-render.
  // The correct API is the imperative `setMode()` from
  // `@dashforge/tw-theme`. Without it, dashforge primitives stay
  // frozen on the boot theme. Proposal: surface the mismatch in dev
  // (warn if dataset.dashTwTheme is written from outside the store).
  useEffect(() => {
    document.documentElement.dataset.app = 'builder';
    document.documentElement.dataset.theme = theme;
    setMode(theme);
  }, [theme]);

  return (
    <BuilderStateProvider>
    <CollapseProvider>
    <DialogFlowProvider>
    <SaveAsFlowProvider>
    <DndProvider>
    <BuilderShortcuts
      onOpenPalette={(mode = 'all') => {
        setPaletteMode(mode);
        setPaletteOpen(true);
      }}
      onOpenBrowser={() => setBrowserOpen(true)}
    />
    <BrowserModalMount
      open={browserOpen}
      onClose={() => setBrowserOpen(false)}
    />
    <CommandPalette
      open={paletteOpen}
      mode={paletteMode}
      onClose={() => setPaletteOpen(false)}
      theme={theme}
      onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      sourceOpen={sourceOpen}
      onToggleSource={() => setSourceOpen((v) => !v)}
      onOpenBrowser={() => setBrowserOpen(true)}
    />
    <div className="flex h-screen flex-col overflow-hidden">
    <AppShell
      header={
        <LiveHeader
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          sourceOpen={sourceOpen}
          onToggleSource={() => setSourceOpen((v) => !v)}
          onOpen={() => setBrowserOpen(true)}
        />
      }
      nav={<PalettePanel />}
      footer={
        // G-14 (collateral): AppShell.footer renders ReactNode, but
        // passing a Fragment with conditional children causes React key
        // collisions in some library internals. Wrap in a div explicitly.
        <div className="flex flex-col">
          {sourceOpen && <SourceDrawer />}
          <LiveStatusBar theme={theme} />
        </div>
      }
      slotProps={{
        // G-15: AppShell's `main` slot doesn't apply flex layout by
        // default — its children stack vertically with auto height. To
        // make Canvas + Inspector lay out side-by-side AND fill the
        // available height, we must explicitly tell `main` to be a flex
        // container. Proposal: AppShell `mainLayout` prop (`row | col |
        // grid`) so consumers don't need to override slotProps for this
        // very common editor-style layout.
        main: { className: 'flex flex-row min-h-0' },
      }}
    >
      <BuilderErrorBoundary>
        <CanvasPanel />
        <InspectorPanel />
      </BuilderErrorBoundary>
    </AppShell>
    </div>
    </DndProvider>
    </SaveAsFlowProvider>
    </DialogFlowProvider>
    </CollapseProvider>
    </BuilderStateProvider>
  );
}

/**
 * Zero-DOM component that installs the global keyboard listener from
 * inside the BuilderStateProvider tree — the shortcuts hook needs
 * dispatch, which is only available under the provider.
 */
/**
 * Thin wrapper that pulls the current fileRef out of state so the
 * status bar reflects Save / Save-As / Open without prop drilling.
 */
function LiveStatusBar({ theme }: { theme: 'dark' | 'light' }) {
  const { fileRef } = useBuilderState();
  return (
    <StatusBar
      workspace="My laptop"
      filePath={fileRef?.name ?? 'Untitled'}
      theme={theme}
    />
  );
}

function BuilderShortcuts({
  onOpenPalette,
  onOpenBrowser,
}: {
  onOpenPalette: (mode?: PaletteMode) => void;
  onOpenBrowser: () => void;
}) {
  const { save, saveAs } = useFileOps();
  useKeyboardShortcuts(onOpenPalette, save, saveAs, onOpenBrowser);
  return null;
}

/**
 * Small wrapper that lives inside the BuilderStateProvider tree so
 * `useFileOps` can pull dispatch/state. Keeps `FileBrowserModal` a
 * pure presentational component that takes handlers as props.
 */
function BrowserModalMount({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { open: openFile, rename, remove } = useFileOps();
  return (
    <FileBrowserModal
      open={open}
      onClose={onClose}
      onOpen={openFile}
      onRename={rename}
      onDelete={remove}
    />
  );
}

/**
 * Header wrapper that runs live validation and forwards the real
 * `ValidationState` to `<BuilderHeader>`. Kept as a thin inner
 * component so `useValidation` can read from `BuilderStateProvider`
 * (BuilderApp itself is above the provider).
 */
function LiveHeader({
  theme,
  onToggleTheme,
  sourceOpen,
  onToggleSource,
  onOpen: onOpenRaw,
}: {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  sourceOpen: boolean;
  onToggleSource: () => void;
  onOpen: () => void;
}) {
  const summary = useValidation();
  const { contract, fileRef } = useBuilderState();
  const dispatch = useBuilderDispatch();
  const fileDirty = useBuilderFileDirty();
  const alert = useAlert();
  // Pending destructive intent — populated when the user picks New /
  // Open with unsaved changes. The confirm dialog fires the action on
  // "Discard" and clears the intent otherwise.
  const [pendingAction, setPendingAction] = useState<null | 'new' | 'open'>(null);
  const { save: onSave } = useFileOps();
  const validation: ValidationState =
    summary.kind === 'empty'
      ? { kind: 'empty' }
      : summary.kind === 'valid'
        ? { kind: 'valid' }
        : { kind: 'issues', count: summary.count };
  // Export is gated on `valid`: an empty contract has nothing to
  // export, and an invalid one would ship broken JSON. Save (copy to
  // clipboard) is gated the same way for consistency. Import is
  // always available — importing a file replaces the current tree.
  const canExport = summary.kind === 'valid';
  const onImport = async () => {
    const result = await pickAndParseContract();
    if (!result) return; // user cancelled
    if (!result.ok) {
      await alert({ title: 'Import failed', body: result.error });
      return;
    }
    dispatch({ type: 'replaceContract', contract: result.contract });
  };
  const doNew = () => {
    // Detach from any workspace file and reset the session buffer.
    dispatch({ type: 'openFile', contract: { version: '1.0', root: null }, fileRef: null });
    clearPersistedContract();
  };
  const onNew = () => {
    if (fileDirty) {
      setPendingAction('new');
      return;
    }
    doNew();
  };
  const doOpen = () => {
    setPendingAction(null);
    onOpenRaw();
  };
  const onOpen = () => {
    if (fileDirty) {
      setPendingAction('open');
      return;
    }
    doOpen();
  };
  const proceedWithAction = () => {
    const which = pendingAction;
    setPendingAction(null);
    if (which === 'new') doNew();
    else if (which === 'open') onOpenRaw();
  };
  const saveAndProceed = async () => {
    await onSave();
    proceedWithAction();
  };
  return (
    <>
      <BuilderHeader
        filePath={fileRef?.name ?? 'Untitled'}
        validation={validation}
        theme={theme}
        onToggleTheme={onToggleTheme}
        sourceOpen={sourceOpen}
        onToggleSource={onToggleSource}
        canExport={canExport}
        onSave={() => void onSave()}
        onExport={() => downloadContract(contract)}
        onImport={onImport}
        onNew={onNew}
        onOpen={onOpen}
      />
      <ConfirmDialog
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        title="Unsaved changes"
        body={
          <>
            You have edits that aren&apos;t saved to a workspace file yet.
            {pendingAction === 'new'
              ? ' Starting a new contract will discard them.'
              : ' Opening another file will discard them.'}
          </>
        }
        cancel={{
          label: 'Cancel',
          tone: 'ghost',
          onClick: () => setPendingAction(null),
        }}
        extra={
          canExport
            ? { label: 'Save first', tone: 'primary', onClick: () => void saveAndProceed() }
            : undefined
        }
        confirm={{
          label: 'Discard',
          tone: 'danger',
          onClick: proceedWithAction,
          autoFocus: true,
        }}
      />
    </>
  );
}
