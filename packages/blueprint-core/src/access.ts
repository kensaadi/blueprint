/**
 * Access rule — declarative RBAC requirement in the contract.
 *
 * Mirror of @dashforge/rbac's AccessRequirement, narrowed to the
 * surface a JSON contract can express (no condition functions).
 * Pass-through to the atom binding which calls `useAccessState` /
 * `resolveAccessState` internally.
 */

import { z } from 'zod';
import type { AccessRequirement } from '@dashforge/rbac';

export const accessRuleSchema = z.object({
  resource: z.string(),
  action: z.string(),
  onUnauthorized: z.enum(['hide', 'disable', 'readonly']).optional(),
}).strict();

/** Carry the @dashforge/rbac shape so consumer code stays interop-safe. */
export type AccessRule = Pick<AccessRequirement, 'resource' | 'action' | 'onUnauthorized'>;
