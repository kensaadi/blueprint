/**
 * Mock S3 + git workspaces — same `localStorage` backend as `local`
 * behind the scenes, distinct labels + simulated latency in front.
 *
 * The point of these instances is to prove the abstraction: the
 * FileBrowserModal, palette, and useFileOps hooks all treat them
 * exactly like the local workspace. When Tauri (desktop) or a backend
 * proxy (web-self-hosted) lands, we swap the factory input and every
 * consumer picks up the real backend without a code change.
 *
 * Neither adapter tries to fake real conflict detection, presigned
 * URLs, or credentials rotation — that's Sprint D territory, not the
 * MVP shape.
 */
import type { WorkspaceAdapter } from './types';
import { createLocalStorageWorkspace } from './localStorageWorkspace';

/** ~100 ms latency — feels remote but never blocks the palette. */
export const s3MockWorkspace: WorkspaceAdapter = createLocalStorageWorkspace(
  {
    id: 's3-acme',
    kind: 's3',
    label: 'acme S3 (mock)',
    writable: true,
  },
  's3-acme',
  120,
);

/** Slightly slower — git usually costs a fetch. */
export const gitMockWorkspace: WorkspaceAdapter = createLocalStorageWorkspace(
  {
    id: 'git-teamcontracts',
    kind: 'git',
    label: 'team/contracts (mock)',
    writable: true,
  },
  'git-teamcontracts',
  220,
);
