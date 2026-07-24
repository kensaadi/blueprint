import { Alert, AlertTitle } from '@dashforge/tw';
import type { InlineText as InlineTextValue } from '@dashforge/blueprint-core';
import { InlineText } from '@dashforge/blueprint-runtime';

type Severity = 'info' | 'success' | 'warning' | 'danger';

type Props = {
  severity?: Severity;
  title?: InlineTextValue;
  children?: InlineTextValue;
};

export function TwAlert({ severity = 'info', title, children }: Props) {
  return (
    <Alert severity={severity}>
      {title !== undefined && (
        <AlertTitle>
          <InlineText value={title} />
        </AlertTitle>
      )}
      <InlineText value={children} />
    </Alert>
  );
}
