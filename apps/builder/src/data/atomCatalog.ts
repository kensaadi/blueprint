/**
 * Builder palette catalog — list of atoms grouped by category. Pure
 * data, no React. Source of truth for what shows up in the left panel.
 *
 * Every entry MUST correspond to a key in Blueprint core's
 * `ATOM_PROP_SCHEMAS`; otherwise dropping the atom would create a node
 * the runtime can't render. The palette is exhaustive today (36 atoms
 * mirrors the closed catalog — see Decision #16 in DESIGN.md).
 *
 * Categories are Builder-authoring aid only; they do not appear in the
 * exported JSON.
 *
 * Each atom carries a Tabler icon name (loaded via the Tabler webfont
 * the host page injects). When Blueprint extraction completes, this
 * will pull from `@dashforge/blueprint-core`'s ATOM_NAMES while keeping
 * the icon/category mapping local to Builder.
 */
export type AtomEntry = {
  /** Atom type name, must match a catalog entry in Blueprint */
  type: string;
  /** Tabler icon class fragment (without the `ti-` prefix). */
  icon: string;
};

export type AtomCategory = {
  id: string;
  label: string;
  atoms: AtomEntry[];
};

export const ATOM_CATEGORIES: AtomCategory[] = [
  {
    id: 'layout',
    label: 'Layout',
    atoms: [
      { type: 'stack',     icon: 'stack-2' },
      { type: 'card',      icon: 'id-badge-2' },
      { type: 'grid',      icon: 'grid-dots' },
      { type: 'section',   icon: 'section' },
      { type: 'box',       icon: 'box' },
      { type: 'container', icon: 'frame' },
    ],
  },
  {
    id: 'form',
    label: 'Form',
    // `form` first — it's the wrapper for the whole form contract.
    // Fields, actions and specialised inputs follow.
    atoms: [
      { type: 'form',         icon: 'file-text' },
      { type: 'field',        icon: 'forms' },
      { type: 'textarea',     icon: 'align-left' },
      { type: 'number',       icon: 'number-123' },
      { type: 'select',       icon: 'list' },
      { type: 'autocomplete', icon: 'search' },
      { type: 'checkbox',     icon: 'checkbox' },
      { type: 'switch',       icon: 'toggle-right' },
      { type: 'radio',        icon: 'circle-dot' },
      { type: 'date',         icon: 'calendar-event' },
      { type: 'time',         icon: 'clock' },
      { type: 'dateTime',     icon: 'calendar-clock' },
      { type: 'dateRange',    icon: 'calendar-week' },
      { type: 'otp',          icon: 'key' },
      { type: 'submit',       icon: 'send' },
    ],
  },
  {
    id: 'actions',
    label: 'Actions',
    atoms: [
      { type: 'button',     icon: 'square-rounded' },
      { type: 'iconButton', icon: 'circle-dot' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    atoms: [
      { type: 'heading', icon: 'heading' },
      { type: 'text',    icon: 'letter-t' },
      { type: 'alert',   icon: 'alert-triangle' },
      { type: 'divider', icon: 'minus' },
    ],
  },
  {
    id: 'navigation',
    label: 'Navigation',
    atoms: [
      { type: 'tabs',        icon: 'browser' },
      { type: 'accordion',   icon: 'chevron-down' },
      { type: 'breadcrumbs', icon: 'chevrons-right' },
      { type: 'pagination',  icon: 'dots' },
    ],
  },
  {
    id: 'display',
    label: 'Display',
    atoms: [
      { type: 'badge',    icon: 'circle-filled' },
      { type: 'chip',     icon: 'tag' },
      { type: 'avatar',   icon: 'user-circle' },
      { type: 'tooltip',  icon: 'info-circle' },
      { type: 'calendar', icon: 'calendar' },
    ],
  },
  {
    id: 'media',
    label: 'Media',
    atoms: [
      { type: 'image', icon: 'photo' },
      { type: 'video', icon: 'video' },
    ],
  },
];
