/**
 * Static LIBS map — every published flavor pack is imported here so that
 * `<DashBlueprint lib="tw">` is a synchronous map lookup. No register
 * step, no provider. Decision #12 (DESIGN.md §2): ~80 kB MUI bundle cost
 * accepted in exchange for zero setup.
 */

import type { LibName, Registry } from '@dashforge/blueprint-core';
import { twRegistry } from '@dashforge/blueprint-tw';
import { muiRegistry } from '@dashforge/blueprint-mui';

export const LIBS: Record<LibName, Registry> = {
  tw: twRegistry,
  mui: muiRegistry,
};
