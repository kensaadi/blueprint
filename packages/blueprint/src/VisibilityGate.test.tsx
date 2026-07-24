import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { VisibilityGate } from './VisibilityGate';

describe('VisibilityGate — outside a form', () => {
  it('renders children when rule resolves true via named rule', () => {
    const { queryByText } = render(
      <VisibilityGate rule={{ rule: 'always' }} rules={{ always: () => true }}>
        <span>visible</span>
      </VisibilityGate>,
    );
    expect(queryByText('visible')).toBeTruthy();
  });

  it('hides children when named rule returns false', () => {
    const { queryByText } = render(
      <VisibilityGate rule={{ rule: 'never' }} rules={{ never: () => false }}>
        <span>hidden</span>
      </VisibilityGate>,
    );
    expect(queryByText('hidden')).toBeNull();
  });

  it('hides children when $form path can\'t resolve (no form context)', () => {
    const { queryByText } = render(
      <VisibilityGate rule={{ field: '$form.country', eq: 'IT' }}>
        <span>hidden</span>
      </VisibilityGate>,
    );
    expect(queryByText('hidden')).toBeNull();
  });

  it('shows children when $form.X is checked for "absent" outside form', () => {
    const { queryByText } = render(
      <VisibilityGate rule={{ field: '$form.country', exists: false }}>
        <span>visible</span>
      </VisibilityGate>,
    );
    expect(queryByText('visible')).toBeTruthy();
  });

  it('composes and/or/not correctly', () => {
    const { queryByText } = render(
      <VisibilityGate
        rule={{
          and: [{ rule: 'a' }, { not: { rule: 'b' } }],
        }}
        rules={{ a: () => true, b: () => false }}
      >
        <span>composed</span>
      </VisibilityGate>,
    );
    expect(queryByText('composed')).toBeTruthy();
  });
});
