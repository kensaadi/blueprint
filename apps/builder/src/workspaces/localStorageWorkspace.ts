/**
 * localStorage-backed workspace factory — the shape every "storage
 * backend" in the sandbox reuses. The MVP has three descriptors on top
 * of this single implementation:
 *
 *   - `local`   → the user's laptop (no latency)
 *   - `s3-mock` → simulated cloud bucket (100 ms latency to feel remote)
 *   - `git-mock`→ simulated git repo (200 ms + read-only-ish semantics)
 *
 * When Tauri or a backend proxy lands, we swap the factory input
 * without touching the rest of the app — the FileBrowserModal +
 * palette + useFileOps hooks all consume `WorkspaceAdapter`.
 *
 * Storage layout, per instance:
 *   builder-v2:ws:<namespace>:index → FileEntry[]
 *   builder-v2:ws:<namespace>:file:<fileId> → ContractFile
 */
import type {
  ContractFile,
  FileEntry,
  FileId,
  WorkspaceAdapter,
  WorkspaceDescriptor,
} from './types';
import type { Contract } from '../state/types';

function newFileId(): string {
  return 'f_' + Math.random().toString(36).slice(2, 10);
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Fire-and-forget delay to simulate remote-adapter latency. */
function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createLocalStorageWorkspace(
  descriptor: WorkspaceDescriptor,
  namespace: string,
  /** Simulated network latency for the mocked remote adapters. */
  latencyMs = 0,
): WorkspaceAdapter {
  const INDEX_KEY = `builder-v2:ws:${namespace}:index`;
  const FILE_PREFIX = `builder-v2:ws:${namespace}:file:`;

  function readIndex(): FileEntry[] {
    try {
      const raw = localStorage.getItem(INDEX_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (v): v is FileEntry =>
          v &&
          typeof v === 'object' &&
          typeof v.id === 'string' &&
          typeof v.name === 'string' &&
          typeof v.updatedAt === 'string',
      );
    } catch {
      return [];
    }
  }

  function writeIndex(entries: FileEntry[]) {
    try {
      localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
    } catch {
      // storage full / disabled — the workspace becomes read-only
    }
  }

  function readFileRaw(id: FileId): ContractFile | null {
    try {
      const raw = localStorage.getItem(FILE_PREFIX + id);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.id === 'string' &&
        typeof parsed.name === 'string' &&
        parsed.contract &&
        typeof parsed.contract === 'object'
      ) {
        return parsed as ContractFile;
      }
      return null;
    } catch {
      return null;
    }
  }

  function writeFileRaw(file: ContractFile) {
    try {
      localStorage.setItem(FILE_PREFIX + file.id, JSON.stringify(file));
    } catch {
      // ignore
    }
  }

  function removeFileRaw(id: FileId) {
    try {
      localStorage.removeItem(FILE_PREFIX + id);
    } catch {
      // ignore
    }
  }

  function upsertIndex(entry: FileEntry) {
    const idx = readIndex();
    const i = idx.findIndex((e) => e.id === entry.id);
    if (i >= 0) idx[i] = entry;
    else idx.push(entry);
    writeIndex(idx);
  }

  function removeFromIndex(id: FileId) {
    writeIndex(readIndex().filter((e) => e.id !== id));
  }

  return {
    descriptor,

    async list(): Promise<FileEntry[]> {
      await sleep(latencyMs);
      return readIndex()
        .slice()
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    },

    async read(id: FileId): Promise<ContractFile | null> {
      await sleep(latencyMs);
      return readFileRaw(id);
    },

    async write(
      id: FileId | undefined,
      name: string,
      contract: Contract,
    ): Promise<ContractFile> {
      await sleep(latencyMs);
      const finalId = id ?? newFileId();
      const file: ContractFile = {
        id: finalId,
        workspaceId: descriptor.id,
        name: name.trim() || 'Untitled',
        updatedAt: nowIso(),
        contract,
      };
      writeFileRaw(file);
      upsertIndex({ id: file.id, name: file.name, updatedAt: file.updatedAt });
      return file;
    },

    async rename(id: FileId, newName: string): Promise<ContractFile> {
      await sleep(latencyMs);
      const existing = readFileRaw(id);
      if (!existing) throw new Error(`file not found: ${id}`);
      const updated: ContractFile = {
        ...existing,
        name: newName.trim() || existing.name,
        updatedAt: nowIso(),
      };
      writeFileRaw(updated);
      upsertIndex({
        id: updated.id,
        name: updated.name,
        updatedAt: updated.updatedAt,
      });
      return updated;
    },

    async remove(id: FileId): Promise<void> {
      await sleep(latencyMs);
      removeFileRaw(id);
      removeFromIndex(id);
    },
  };
}

/**
 * The default "My laptop" workspace. Preserved as a named export so
 * existing imports keep working after the factory refactor.
 */
export const localWorkspace: WorkspaceAdapter = createLocalStorageWorkspace(
  {
    id: 'local',
    kind: 'local',
    label: 'My laptop',
    writable: true,
  },
  'local',
  0,
);
