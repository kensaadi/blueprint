/**
 * File operations shared by the header, keyboard shortcuts, and the
 * command palette. Save writes to the currently attached workspace
 * file; Save-As always prompts for a name. Both settle the reducer
 * on the new `fileRef` so the header + status bar update in lock-
 * step.
 */
import { useCallback } from 'react';
import { useBuilderState, useBuilderDispatch, useBuilderMarkSaved } from '../state/BuilderStateContext';
import {
  getWorkspace,
} from '../workspaces/registry';
import { useSaveAsRequest } from '../workspaces/SaveAsFlow';
import { useAlert } from '../primitives/DialogFlow';
import { isApiError } from '../api/_shared/error.types';

export function useFileOps() {
  const { contract, fileRef } = useBuilderState();
  const dispatch = useBuilderDispatch();
  const markSaved = useBuilderMarkSaved();
  const requestSaveAs = useSaveAsRequest();
  const alert = useAlert();

  /**
   * Surface a save failure. Collab-lock (423) and version conflict (409)
   * get a plain-language explanation; anything else a generic notice. The
   * caller treats a failed save as a no-op (the buffer stays dirty).
   */
  const reportSaveError = useCallback(
    async (e: unknown): Promise<void> => {
      if (isApiError(e) && e.serverCode === 'locked') {
        await alert({
          title: 'Someone else is editing',
          body: `${e.message.replace(/: locked$/, '')}. Your changes weren't saved — they'll keep as soon as the other editor is done.`,
        });
        return;
      }
      if (isApiError(e) && e.serverCode === 'version_conflict') {
        await alert({
          title: 'This file changed',
          body: 'Another save landed since you opened it. Reload the latest version, then reapply your edit.',
        });
        return;
      }
      if (isApiError(e) && e.serverCode === 'license_expired') {
        await alert({
          title: 'License expired',
          body: 'Your license has expired — renew to keep editing. Your work is safe and still fully readable; nothing was lost.',
        });
        return;
      }
      await alert({
        title: "Couldn't save",
        body: isApiError(e) ? e.message : 'An unexpected error occurred while saving.',
      });
    },
    [alert],
  );

  /**
   * Open a file from any workspace, replacing the current buffer.
   * Emits a single `openFile` action so history sees an atomic swap
   * instead of two dispatches (which would leave undo pointing at
   * the OLD file's state).
   */
  const open = useCallback(
    async (workspaceId: string, fileId: string) => {
      const ws = getWorkspace(workspaceId);
      if (!ws) return;
      const file = await ws.read(fileId);
      if (!file) return;
      dispatch({
        type: 'openFile',
        contract: file.contract,
        fileRef: {
          workspaceId: file.workspaceId,
          fileId: file.id,
          name: file.name,
        },
      });
      markSaved(file.contract);
    },
    [dispatch, markSaved],
  );

  const saveAs = useCallback(async () => {
    // Modal picker (SaveAsFlow provider owns the state). Returns null
    // on cancel — silent no-op, no toast.
    const suggested =
      fileRef?.name ??
      (contract.root?.id ? `${contract.root.id}.json` : 'untitled.json');
    const result = await requestSaveAs(suggested, fileRef?.workspaceId);
    if (!result) return;
    const ws = getWorkspace(result.workspaceId);
    if (!ws) return;
    try {
      const saved = await ws.write(undefined, result.name.trim(), contract);
      dispatch({
        type: 'setFileRef',
        fileRef: {
          workspaceId: saved.workspaceId,
          fileId: saved.id,
          name: saved.name,
        },
      });
      markSaved(contract);
    } catch (e) {
      await reportSaveError(e);
    }
  }, [contract, fileRef, dispatch, markSaved, requestSaveAs, reportSaveError]);

  const save = useCallback(async () => {
    if (!fileRef) return saveAs();
    const ws = getWorkspace(fileRef.workspaceId);
    if (!ws) return saveAs();
    try {
      const saved = await ws.write(fileRef.fileId, fileRef.name, contract);
      dispatch({
        type: 'setFileRef',
        fileRef: {
          workspaceId: saved.workspaceId,
          fileId: saved.id,
          name: saved.name,
        },
      });
      markSaved(contract);
    } catch (e) {
      await reportSaveError(e);
    }
  }, [contract, fileRef, dispatch, markSaved, saveAs, reportSaveError]);

  const rename = useCallback(
    async (workspaceId: string, fileId: string, newName: string) => {
      const ws = getWorkspace(workspaceId);
      if (!ws) return;
      const renamed = await ws.rename(fileId, newName);
      // If the renamed file is the one we're currently editing, keep
      // the header + status bar in sync.
      if (fileRef?.fileId === fileId && fileRef.workspaceId === workspaceId) {
        dispatch({
          type: 'setFileRef',
          fileRef: {
            workspaceId: renamed.workspaceId,
            fileId: renamed.id,
            name: renamed.name,
          },
        });
      }
    },
    [dispatch, fileRef],
  );

  const remove = useCallback(
    async (workspaceId: string, fileId: string) => {
      const ws = getWorkspace(workspaceId);
      if (!ws) return;
      await ws.remove(fileId);
      // If the deleted file is currently attached, detach so the
      // header stops claiming a phantom file.
      if (fileRef?.fileId === fileId && fileRef.workspaceId === workspaceId) {
        dispatch({ type: 'setFileRef', fileRef: null });
      }
    },
    [dispatch, fileRef],
  );

  return { save, saveAs, open, rename, remove };
}
