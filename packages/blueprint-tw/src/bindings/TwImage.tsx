/**
 * `image` binding for the TW flavor — thin wrapper over @dashforge/tw's
 * `<Image>`. Forwards `node.access` so RBAC gating is resolved by the
 * component's `useAccessState` (like `TwField`).
 */

import { Image } from '@dashforge/tw';
import type { AccessRequirement } from '@dashforge/rbac';

type Props = {
  src: string;
  alt: string;
  aspectRatio?: number | string;
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  loading?: 'lazy' | 'eager';
  showSkeleton?: boolean;
  /** Injected by compileNode from `node.access`. Resolved by `useAccessState` in the dashforge component. */
  access?: AccessRequirement;
};

export function TwImage({ access, ...props }: Props) {
  return <Image {...props} access={access} />;
}
