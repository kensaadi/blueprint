/* eslint-disable react-refresh/only-export-components -- provider colocates with its consumer hook */
/**
 * SaveAsFlow — mounts the SaveAsDialog once at the app root and hands
 * out a promise-returning `requestSaveAs()` via context so any caller
 * (header, palette, shortcut) can prompt the user without owning
 * modal state.
 *
 * Usage:
 *   const requestSaveAs = useSaveAsRequest();
 *   const result = await requestSaveAs(suggestedName);
 *   if (result) { await write(result.workspaceId, result.name, contract); }
 *
 * Consumer flows never call `window.prompt` — the dialog handles both
 * name entry and workspace selection (collapsed to a single-line hint
 * when only one workspace is registered).
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { SaveAsDialog } from './SaveAsDialog';
import { listWorkspaces, DEFAULT_WORKSPACE_ID } from './registry';
import type { WorkspaceId } from './types';

export type SaveAsResult = { workspaceId: WorkspaceId; name: string };

const RequestCtx = createContext<
  ((defaultName: string, preferredWorkspace?: WorkspaceId) => Promise<SaveAsResult | null>) | null
>(null);

export function SaveAsFlowProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [suggestedName, setSuggestedName] = useState('untitled.json');
  const [defaultWs, setDefaultWs] = useState<WorkspaceId>(DEFAULT_WORKSPACE_ID);
  // Pending promise resolver — set when a caller opens the modal, cleared on close.
  const resolveRef = useRef<((r: SaveAsResult | null) => void) | null>(null);

  const requestSaveAs = useCallback(
    (name: string, preferred?: WorkspaceId): Promise<SaveAsResult | null> => {
      setSuggestedName(name);
      setDefaultWs(preferred ?? DEFAULT_WORKSPACE_ID);
      setOpen(true);
      return new Promise<SaveAsResult | null>((resolve) => {
        resolveRef.current = resolve;
      });
    },
    [],
  );

  const resolveAndClose = (result: SaveAsResult | null) => {
    const resolver = resolveRef.current;
    resolveRef.current = null;
    setOpen(false);
    resolver?.(result);
  };

  const writable = listWorkspaces().filter((w) => w.descriptor.writable);

  return (
    <RequestCtx.Provider value={requestSaveAs}>
      {children}
      <SaveAsDialog
        open={open}
        onClose={() => resolveAndClose(null)}
        onSubmit={(workspaceId, name) => resolveAndClose({ workspaceId, name })}
        suggestedName={suggestedName}
        workspaces={writable}
        defaultWorkspaceId={defaultWs}
      />
    </RequestCtx.Provider>
  );
}

export function useSaveAsRequest() {
  const ctx = useContext(RequestCtx);
  if (!ctx) throw new Error('useSaveAsRequest must be used inside SaveAsFlowProvider');
  return ctx;
}
