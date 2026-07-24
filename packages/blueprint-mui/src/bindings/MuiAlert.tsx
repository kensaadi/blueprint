/** Feedback primitive — not exposed by @dashforge/ui. Raw MUI Alert with
 *  Dashforge theme overrides applied via @dashforge/theme-mui. */

import { Alert, AlertTitle } from '@mui/material';
import type { InlineText as InlineTextValue } from '@dashforge/blueprint-core';
import { InlineText } from '@dashforge/blueprint-runtime';

type Severity = 'info' | 'success' | 'warning' | 'danger';

type Props = {
  severity?: Severity;
  title?: InlineTextValue;
  children?: InlineTextValue;
};

const SEVERITY_MAP = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'error',
} as const;

export function MuiAlert({ severity = 'info', title, children }: Props) {
  return (
    <Alert severity={SEVERITY_MAP[severity]}>
      {title !== undefined && (
        <AlertTitle>
          <InlineText value={title} />
        </AlertTitle>
      )}
      <InlineText value={children} />
    </Alert>
  );
}
