/**
 * Template entitlements — which marketplace templates the user owns.
 *
 * ORTHOGONAL TO TIER (Decision #37). A marketplace template is a standalone,
 * one-shot purchase at the SAME price for everyone; access depends ONLY on:
 *
 *     free  OR  already-owned
 *
 * Ownership is WS-backed (Model A): a downloaded/purchased template is saved
 * as a workspace file tagged with its `sourceTemplateId` + `sourceVersion`, so
 * "owned" = a file with that templateId exists in the signed-in user's
 * workspace. This survives a cache clear and can't be re-bought. When the
 * stored version differs from Foundry's current card version, an update is
 * available (`hasUpdate` → the "new version" badge).
 *
 * Standalone (no Workspace Service — the dev-only placeholder) falls back to a
 * localStorage id set, versions unknown.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { HAS_WORKSPACE } from '../api/_shared/config';
import { sessionToken } from '../api/workspace/session';
import { listFiles, listWorkspaces } from '../api/workspace/service';
import { useSession } from '../hooks/useSession';
import {
  loadOwnedTemplateIds,
  saveOwnedTemplateIds,
} from './entitlementsStore';

/**
 * The minimal shape template-access needs. Any richer marketplace template
 * type satisfies this structurally. No tier — that's the whole point.
 */
export type OwnableTemplate = {
  id: string;
  /** Free templates are usable by anyone without a purchase. */
  free: boolean;
  /** Foundry's current free-text version marker (for update detection). */
  version?: string;
};

/** What the user owns for one template: the stored version + its WS file. */
export type OwnedEntry = { version: string; fileId: string };

/** Pure access check — free OR owned. Never consults a tier. */
export function canUseTemplate(
  template: OwnableTemplate,
  owned: ReadonlyMap<string, OwnedEntry>,
): boolean {
  return template.free || owned.has(template.id);
}

export type EntitlementsState = {
  owns: (templateId: string) => boolean;
  /** The version string the user owns for this template, if any. */
  ownedVersion: (templateId: string) => string | undefined;
  /** The WS file id of the owned copy, to open it. */
  ownedFileId: (templateId: string) => string | undefined;
  canUse: (template: OwnableTemplate) => boolean;
  /** Owned, but Foundry's version differs → an update is available. */
  hasUpdate: (template: OwnableTemplate) => boolean;
  /** Re-derive ownership from the workspace (after a download / purchase). */
  refresh: () => Promise<void>;
  /**
   * Standalone-only ownership nudge: records the id in localStorage (no WS) and
   * refreshes. In the bundle, ownership is the saved file — the save + refresh
   * (CheckoutReturn / download) is authoritative and `grant` just re-derives.
   */
  grant: (templateId: string) => void;
};

const EMPTY: ReadonlyMap<string, OwnedEntry> = new Map();

const EntitlementsCtx = createContext<EntitlementsState>({
  owns: () => false,
  ownedVersion: () => undefined,
  ownedFileId: () => undefined,
  canUse: (t) => canUseTemplate(t, EMPTY),
  hasUpdate: () => false,
  refresh: async () => {},
  grant: () => {},
});

/**
 * List the signed-in user's workspace files and map templateId → owned entry.
 * When more than one file shares a templateId, the last (most-recent) wins.
 */
async function deriveOwnedFromWs(): Promise<Map<string, OwnedEntry>> {
  const list = await listWorkspaces();
  if (list.error) return new Map();
  const wid = list.data[0]?.id;
  if (!wid) return new Map();
  const files = await listFiles(wid);
  if (files.error) return new Map();
  const owned = new Map<string, OwnedEntry>();
  for (const f of files.data) {
    if (f.sourceTemplateId) {
      owned.set(f.sourceTemplateId, { version: f.sourceVersion ?? '', fileId: f.id });
    }
  }
  return owned;
}

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const [owned, setOwned] = useState<ReadonlyMap<string, OwnedEntry>>(EMPTY);

  const refresh = useCallback(async () => {
    if (HAS_WORKSPACE) {
      if (!sessionToken()) {
        setOwned(EMPTY);
        return;
      }
      setOwned(await deriveOwnedFromWs());
    } else {
      // Standalone placeholder: localStorage ids, versions/files unknown.
      setOwned(
        new Map(loadOwnedTemplateIds().map((id) => [id, { version: '', fileId: '' }])),
      );
    }
  }, []);

  // Re-derive on sign-in / sign-out (and at mount).
  useEffect(() => {
    void refresh();
  }, [refresh, session]);

  const grant = useCallback(
    (templateId: string) => {
      if (!HAS_WORKSPACE) {
        saveOwnedTemplateIds([
          ...new Set([...loadOwnedTemplateIds(), templateId]),
        ]);
      }
      void refresh();
    },
    [refresh],
  );

  const value = useMemo<EntitlementsState>(
    () => ({
      owns: (id) => owned.has(id),
      ownedVersion: (id) => owned.get(id)?.version,
      ownedFileId: (id) => owned.get(id)?.fileId || undefined,
      canUse: (t) => canUseTemplate(t, owned),
      hasUpdate: (t) =>
        owned.has(t.id) && (owned.get(t.id)?.version ?? '') !== (t.version ?? ''),
      refresh,
      grant,
    }),
    [owned, refresh, grant],
  );

  return (
    <EntitlementsCtx.Provider value={value}>
      {children}
    </EntitlementsCtx.Provider>
  );
}

export function useEntitlements(): EntitlementsState {
  return useContext(EntitlementsCtx);
}
