/**
 * Header actions cluster — theme + source + File menu + Data menu.
 *
 * Menu structure (dropdown pattern, decision 2026-07-05):
 *   File ▾  — New   (⌘N)
 *           — Open… (⌘O)
 *           — Save  (⌘S)
 *   Data ▾  — Import JSON…
 *           — Export JSON
 *
 * Save is disabled when the contract is empty or invalid (canExport = false);
 * shortcut hints render right-aligned inside each item, macOS-style. The
 * File menu is scalable — Save As, revert, workspaces list can slot in
 * without touching the header layout.
 *
 * DOGFOOD notes:
 *   - G-03: no inline-ReactNode escape hatch on `<IconButton>`; the theme
 *     toggle still uses `<Button variant="ghost">` with an emoji.
 *   - G-07: `<Button pressed>` is missing; we approximate Source as an
 *     outline/ghost variant swap tied to `sourceOpen`.
 */
import { Button, Menu, MenuTrigger, MenuContent, MenuItem } from '@dashforge/tw';
import type { ReactNode } from 'react';

type HeaderActionsProps = {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  sourceOpen: boolean;
  onToggleSource: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport?: () => void;
  onNew?: () => void;
  /**
   * When false, Save and Export are visually disabled. Prevents a
   * broken JSON from being exported (empty or invalid contract). The
   * tooltip explains why the buttons are inactive.
   */
  canExport: boolean;
  /** Fires when the user picks File → Open. */
  onOpen?: () => void;
};

const disabledTooltip =
  'Add at least one element and resolve any validation issues to enable export.';

/** Small right-aligned keyboard hint chip inside a MenuItem. */
function Shortcut({ keys }: { keys: string }) {
  return (
    <span
      className="ml-auto pl-4 font-mono text-[11px]"
      style={{ color: 'var(--bd-text-faint)' }}
      aria-hidden
    >
      {keys}
    </span>
  );
}

function MenuRow({
  label,
  shortcut,
  onClick,
  disabled,
  title,
}: {
  label: ReactNode;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <MenuItem onClick={onClick} disabled={disabled}>
      <span className="flex w-full items-center" title={title}>
        <span>{label}</span>
        {shortcut && <Shortcut keys={shortcut} />}
      </span>
    </MenuItem>
  );
}

export function HeaderActions({
  theme,
  onToggleTheme,
  sourceOpen,
  onToggleSource,
  onSave,
  onExport,
  onImport,
  onNew,
  onOpen,
  canExport,
}: HeaderActionsProps) {
  return (
    <>
      <Button
        variant="ghost"
        color="secondary"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {theme === 'dark' ? '☀' : '☾'}
      </Button>
      <Button
        variant={sourceOpen ? 'outline' : 'ghost'}
        color="primary"
        onClick={onToggleSource}
        aria-pressed={sourceOpen}
      >
        Source
      </Button>

      {/* File menu — New / Open / Save */}
      <Menu>
        <MenuTrigger>
          <Button variant="ghost" color="secondary">
            File ▾
          </Button>
        </MenuTrigger>
        <MenuContent minWidth={200}>
          {onNew && (
            <MenuRow
              label="New"
              shortcut="⌘N"
              onClick={onNew}
              title="Start a new untitled contract"
            />
          )}
          {onOpen && (
            <MenuRow
              label="Open…"
              shortcut="⌘O"
              onClick={onOpen}
              title="Open a saved contract from a workspace"
            />
          )}
          <MenuRow
            label="Save"
            shortcut="⌘S"
            onClick={onSave}
            disabled={!canExport}
            title={canExport ? 'Save the contract to the active workspace' : disabledTooltip}
          />
        </MenuContent>
      </Menu>

      {/* Data menu — Import / Export */}
      <Menu>
        <MenuTrigger>
          <Button variant="ghost" color="secondary">
            Data ▾
          </Button>
        </MenuTrigger>
        <MenuContent minWidth={200}>
          {onImport && (
            <MenuRow
              label="Import JSON…"
              onClick={onImport}
              title="Load a contract from a .json file on disk"
            />
          )}
          <MenuRow
            label="Export JSON"
            onClick={onExport}
            disabled={!canExport}
            title={canExport ? 'Download the contract as a .json file' : disabledTooltip}
          />
        </MenuContent>
      </Menu>
    </>
  );
}
