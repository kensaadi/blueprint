/**
 * `video` binding for the TW flavor — thin wrapper over @dashforge/tw's
 * `<Video>`. Forwards `node.access` so RBAC gating is resolved by the
 * component's `useAccessState` (like `TwField`).
 */

import { Video } from '@dashforge/tw';
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
  /** Injected by compileNode from `node.access`. Resolved by `useAccessState` in the dashforge component. */
  access?: AccessRequirement;
};

export function TwVideo({ access, ...props }: Props) {
  return <Video {...props} access={access} />;
}
