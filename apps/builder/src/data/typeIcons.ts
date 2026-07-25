/**
 * Single source of truth for atom-type → Tabler-icon lookup.
 *
 * The palette catalog (ATOM_CATEGORIES) already maps every atom to
 * its icon; deriving the flat lookup at module load keeps the palette,
 * canvas node cards and drag preview visually consistent without
 * copying the mapping in three places.
 */
import { ATOM_CATEGORIES } from './atomCatalog';

const ICON_BY_TYPE: Record<string, string> = Object.fromEntries(
  ATOM_CATEGORIES.flatMap((c) => c.atoms.map((a) => [a.type, a.icon])),
);

/** Fallback icon for atoms not present in the catalog (defensive). */
const FALLBACK_ICON = 'square';

export function iconForType(atomType: string): string {
  return ICON_BY_TYPE[atomType] ?? FALLBACK_ICON;
}
