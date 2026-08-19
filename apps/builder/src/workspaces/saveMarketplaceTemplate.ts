/**
 * Persist a downloaded/purchased marketplace template as a file in the
 * signed-in user's workspace, tagged with its Foundry provenance
 * (`sourceTemplateId` + `sourceVersion`). This is what makes a template
 * "owned" (Model A): it lives in the WS, survives a cache clear, can't be
 * re-bought, and — when Foundry later bumps the version — surfaces the
 * "new version" badge.
 *
 * Returns a `FileRef` the caller can hand to `useFileOps.open()` so the fresh
 * copy opens with its file identity set (edits update THAT file, no dup on
 * save). Null on any failure — ownership is still recorded server-side by the
 * create, so a subsequent refresh reflects it regardless.
 *
 * Stores the contract as Foundry serves it (public `nodeId`, no Builder
 * `_uid`); the WS read boundary re-hydrates `_uid` on open.
 */
import { REMOTE_WORKSPACE_ID } from './remoteWorkspace';
import { createFile, listWorkspaces } from '../api/workspace/service';
import type { MarketplaceTemplate } from '../marketplace/types';
import type { FileRef } from '../state/types';

export async function saveMarketplaceTemplate(
  t: MarketplaceTemplate,
): Promise<FileRef | null> {
  if (!t.contract) return null;

  const list = await listWorkspaces();
  if (list.error) return null;
  const wid = list.data[0]?.id;
  if (!wid) return null;

  const created = await createFile(wid, t.name, t.contract, {
    templateId: t.id,
    version: t.version,
  });
  if (created.error) return null;

  return {
    workspaceId: REMOTE_WORKSPACE_ID,
    fileId: created.data.id,
    name: created.data.name,
  };
}
