/**
 * `video` binding for the MUI flavor — thin wrapper over @dashforge/ui's
 * `<Video>`. Forwards `node.access` so RBAC gating is resolved by the
 * component's `useAccessState` (like `MuiField`).
 */

import { Video } from '@dashforge/ui';
import type { AccessRequirement } from '@dashforge/rbac';

type Props = {
  src?: string;
  poster?: string;
  aspectRatio?: number | string;
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  showSkeleton?: boolean;
  /** Injected by compileNode from `node.access`. */
  access?: AccessRequirement;
};

export function MuiVideo({ access, ...props }: Props) {
  return <Video {...props} access={access} />;
}
