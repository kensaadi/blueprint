/**
 * Tabler icon registry for the Builder's live preview.
 *
 * The Blueprint runtime resolves an atom's `icon` id against the registry
 * passed to `<DashBlueprint icons={...}>`. The Builder ships the Tabler
 * webfont (the palette / inspector already render `ti ti-<name>`), so we
 * map every pickable icon id to a webfont `<i>` — this makes `iconButton`,
 * `tooltip` (the ⓘ hint), etc. render real icons in the preview instead of
 * the missing-icon placeholder.
 *
 * A real consumer app supplies its own registry; this one exists purely so
 * the Builder preview matches what the IconPicker offers.
 */
import type { IconRegistry, IconRenderProps } from '@dashforge/blueprint-core';
import { ALL_ICONS } from './commonIcons';

export const tablerIconRegistry: IconRegistry = ALL_ICONS.map((id) => ({
  id,
  sources: ['tabler'],
  render: ({ size, 'aria-hidden': ariaHidden }: IconRenderProps) => (
    <i
      className={`ti ti-${id}`}
      style={{ fontSize: typeof size === 'number' ? size : undefined, lineHeight: 1 }}
      aria-hidden={ariaHidden}
    />
  ),
}));
