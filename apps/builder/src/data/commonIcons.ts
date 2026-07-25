/**
 * Curated Tabler icon set for the Inspector's icon picker.
 *
 * Not the whole Tabler catalog (5k+ icons is overwhelming) — a compact
 * pool grouped by intent that covers 95% of atom-icon needs (button,
 * iconButton, form.field icons, etc.). The picker offers free-text
 * search so the user can still type an icon name outside the list.
 */

export type IconGroup = {
  label: string;
  icons: string[];
};

export const ICON_GROUPS: IconGroup[] = [
  {
    label: 'Actions',
    icons: [
      'check', 'x', 'plus', 'minus', 'trash', 'edit', 'copy', 'refresh',
      'download', 'upload', 'send', 'share', 'save', 'settings', 'filter',
      'sort-ascending', 'sort-descending', 'search', 'zoom-in', 'zoom-out',
    ],
  },
  {
    label: 'Navigation',
    icons: [
      'home', 'arrow-left', 'arrow-right', 'arrow-up', 'arrow-down',
      'chevron-left', 'chevron-right', 'chevron-up', 'chevron-down',
      'dots', 'menu-2', 'external-link', 'link',
    ],
  },
  {
    label: 'People & auth',
    icons: [
      'user', 'user-plus', 'user-check', 'user-x', 'users', 'lock',
      'lock-open', 'key', 'login', 'logout', 'shield', 'shield-check',
    ],
  },
  {
    label: 'Communication',
    icons: [
      'mail', 'message', 'phone', 'bell', 'bell-off', 'chat', 'send-2',
    ],
  },
  {
    label: 'Files & storage',
    icons: [
      'file', 'file-text', 'file-plus', 'folder', 'folder-plus',
      'photo', 'camera', 'cloud', 'cloud-upload', 'cloud-download',
    ],
  },
  {
    label: 'Data & display',
    icons: [
      'chart-bar', 'chart-line', 'chart-pie', 'table', 'list', 'calendar',
      'clock', 'tag', 'bookmark', 'star', 'heart', 'flag',
    ],
  },
  {
    label: 'Status',
    icons: [
      'info-circle', 'alert-triangle', 'alert-circle', 'circle-check',
      'circle-x', 'help', 'help-circle', 'ban',
    ],
  },
];

/** Flat list — used for search + the "does this icon exist" check. */
export const ALL_ICONS: string[] = Array.from(
  new Set(ICON_GROUPS.flatMap((g) => g.icons)),
);
