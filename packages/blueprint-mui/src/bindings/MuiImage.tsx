/**
 * `image` binding for the MUI flavor — thin wrapper over @dashforge/ui's
 * `<Image>`. Forwards `node.access` so RBAC gating is resolved by the
 * component's `useAccessState` (like `MuiField`).
 */

import { Image } from '@dashforge/ui';
import type { AccessRequirement } from '@dashforge/rbac';

type Props = {
  src: string;
  alt: string;
  aspectRatio?: number | string;
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  loading?: 'lazy' | 'eager';
  showSkeleton?: boolean;
  /** Injected by compileNode from `node.access`. */
  access?: AccessRequirement;
};

export function MuiImage({ access, ...props }: Props) {
  return <Image {...props} access={access} />;
}
