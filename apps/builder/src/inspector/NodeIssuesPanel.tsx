/**
 * NodeIssuesPanel — shows validation issues attached to the currently
 * selected node.
 *
 * Only rendered when the selected node has issues; otherwise the
 * Inspector stays clean. Errors are ranked before warnings so the
 * most severe problem is always the first thing the user reads.
 */
import { Typography } from '@dashforge/tw';
import type { ValidationError } from '@dashforge/blueprint-core';

const cardStyle = (severity: ValidationError['severity']): React.CSSProperties => ({
  background: severity === 'error' ? 'rgb(220 38 38 / 0.08)' : 'rgb(234 179 8 / 0.08)',
  borderColor: severity === 'error' ? 'rgb(220 38 38 / 0.35)' : 'rgb(234 179 8 / 0.35)',
});

export function NodeIssuesPanel({ issues }: { issues: ValidationError[] }) {
  if (issues.length === 0) return null;
  // Errors first, then warnings — keeps the eye on what actually blocks
  // export.
  const sorted = [...issues].sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1,
  );
  return (
    <div className="flex flex-col gap-2">
      <Typography
        variant="caption"
        sx="text-[11px] uppercase tracking-[0.1em]"
        style={{ color: 'var(--bd-text-faint)' }}
      >
        Issues on this element
      </Typography>
      {sorted.map((issue, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-md border px-3 py-2"
          style={cardStyle(issue.severity)}
        >
          <i
            className={`ti ${
              issue.severity === 'error'
                ? 'ti-alert-triangle'
                : 'ti-alert-circle'
            } mt-0.5 text-[14px]`}
            style={{
              color: issue.severity === 'error' ? 'rgb(220 38 38)' : 'rgb(234 179 8)',
            }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <Typography
              variant="caption"
              sx="block text-[12px] leading-snug"
              style={{ color: 'var(--bd-text)' }}
            >
              {issue.message}
            </Typography>
            {issue.expected && (
              <Typography
                variant="caption"
                sx="mt-1 block text-[11px] leading-snug"
                style={{ color: 'var(--bd-text-faint)' }}
              >
                Expected: <code>{issue.expected}</code>
                {issue.received !== undefined && (
                  <>
                    {' '}· received: <code>{issue.received}</code>
                  </>
                )}
              </Typography>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
