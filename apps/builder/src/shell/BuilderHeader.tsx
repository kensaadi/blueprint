/**
 * Builder header — uses @dashforge/tw `<TopBar>` with the 3 slots
 * (start / center / end) to compose the chrome.
 *
 * Layout:
 *   start  → brand + project file path
 *   center → (empty — could host a global search / command palette later)
 *   end    → StatusChip + HeaderActions
 *
 * DOGFOOD notes:
 *   - G-01: TopBar's `start` slot accepts ReactNode but doesn't offer
 *     a layout helper for "brand + secondary text" — a frequent pattern.
 *     We wrap in a plain `<div className="flex">`. Proposal: `<TopBar.Brand>`
 *     subcomponent.
 *   - G-06: TopBar background defaults to product theme tokens; honoring
 *     Builder's CSS variables (--bd-header) required style override.
 */
import { TopBar, Typography } from '@dashforge/tw';
import { StatusChip, type ValidationState } from './StatusChip';
import { HeaderActions } from './HeaderActions';

type BuilderHeaderProps = {
  filePath: string;
  validation: ValidationState;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  sourceOpen: boolean;
  onToggleSource: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport?: () => void;
  onNew?: () => void;
  onOpen?: () => void;
  /** When false, Save and Export are disabled (empty or invalid contract). */
  canExport?: boolean;
};

export function BuilderHeader(props: BuilderHeaderProps) {
  return (
    <TopBar
      start={
        <div className="flex items-center gap-2">
          <Typography variant="body1" sx="font-medium">
            <span style={{ color: 'var(--bd-accent)' }}>@dashforge/</span>builder
          </Typography>
          <Typography
            variant="body2"
            style={{ color: 'var(--bd-text-soft)' }}
          >
            ·  {props.filePath}
          </Typography>
        </div>
      }
      end={
        <div className="flex items-center gap-2">
          <StatusChip state={props.validation} />
          <HeaderActions
            theme={props.theme}
            onToggleTheme={props.onToggleTheme}
            sourceOpen={props.sourceOpen}
            onToggleSource={props.onToggleSource}
            onSave={props.onSave}
            onExport={props.onExport}
            onImport={props.onImport}
            onNew={props.onNew}
            onOpen={props.onOpen}
            canExport={props.canExport ?? true}
          />
        </div>
      }
      slotProps={{
        root: {
          className: 'border-b bg-[var(--bd-header)] border-[var(--bd-border)]',
        },
      }}
    />
  );
}
