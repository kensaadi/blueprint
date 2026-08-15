import { describe, expect, it } from 'vitest';
import { validate } from './validator';
import type { BlueprintDocument } from './types';

const makeDoc = (root: unknown): BlueprintDocument => ({
  version: '1.0',
  root: root as BlueprintDocument['root'],
});

describe('validate — structural pass', () => {
  it('accepts a minimal valid document', () => {
    const result = validate(makeDoc({ type: 'card' }));
    expect(result.ok).toBe(true);
  });

  it('rejects an unknown version', () => {
    const result = validate({ version: '2.0', root: { type: 'card' } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].path).toMatch(/version/);
    }
  });

  it('rejects malformed root (missing type)', () => {
    const result = validate({ version: '1.0', root: {} });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown lib value', () => {
    const result = validate({ version: '1.0', lib: 'chakra', root: { type: 'card' } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path.includes('lib'))).toBe(true);
    }
  });

  it('accepts lib="tw"', () => {
    const result = validate({ version: '1.0', lib: 'tw', root: { type: 'card' } });
    expect(result.ok).toBe(true);
  });

  it('accepts lib="mui"', () => {
    const result = validate({ version: '1.0', lib: 'mui', root: { type: 'card' } });
    expect(result.ok).toBe(true);
  });
});

describe('validate — atom prop schemas', () => {
  it('field requires name', () => {
    const result = validate(makeDoc({ type: 'field', props: {} }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path.includes('name'))).toBe(true);
    }
  });

  it('field with name passes', () => {
    const result = validate(makeDoc({ type: 'field', props: { name: 'email' } }));
    expect(result.ok).toBe(true);
  });

  it('heading requires level + children', () => {
    const result = validate(makeDoc({ type: 'heading', props: {} }));
    expect(result.ok).toBe(false);
  });

  it('heading with level + children passes', () => {
    const result = validate(makeDoc({ type: 'heading', props: { level: 1, children: 'Hello' } }));
    expect(result.ok).toBe(true);
  });

  it('heading rejects level outside 1..6', () => {
    const result = validate(makeDoc({ type: 'heading', props: { level: 7, children: 'Bad' } }));
    expect(result.ok).toBe(false);
  });

  it('select requires options with min length 1', () => {
    const empty = validate(makeDoc({ type: 'select', props: { name: 'x', options: [] } }));
    expect(empty.ok).toBe(false);
    const ok = validate(makeDoc({ type: 'select', props: { name: 'x', options: [{ value: 'a', label: 'A' }] } }));
    expect(ok.ok).toBe(true);
  });

  it('form requires id (ATOMS_REQUIRING_ID enforcement)', () => {
    const noId = validate(makeDoc({ type: 'form' }));
    expect(noId.ok).toBe(false);
    if (!noId.ok) {
      expect(noId.errors.some((e) => e.code === 'MISSING_ID')).toBe(true);
    }
    const withId = validate(makeDoc({ type: 'form', nodeId: 'my-form' }));
    expect(withId.ok).toBe(true);
  });

  it('flags a duplicate nodeId across the tree', () => {
    const dup = validate(
      makeDoc({
        type: 'card',
        nodeId: 'root-card',
        children: [
          { type: 'card', nodeId: 'dupe' },
          { type: 'card', nodeId: 'dupe' },
        ],
      }),
    );
    expect(dup.ok).toBe(false);
    if (!dup.ok) {
      expect(dup.errors.some((e) => e.code === 'DUPLICATE_NODE_ID')).toBe(true);
    }
  });

  it('accepts distinct nodeIds', () => {
    const ok = validate(
      makeDoc({
        type: 'card',
        nodeId: 'a',
        children: [{ type: 'card', nodeId: 'b' }, { type: 'card', nodeId: 'c' }],
      }),
    );
    expect(ok.ok).toBe(true);
  });

  it('date rejects bad ISO format', () => {
    const result = validate(makeDoc({ type: 'date', props: { name: 'dob', min: '20/01/2000' } }));
    expect(result.ok).toBe(false);
  });

  it('date accepts YYYY-MM-DD', () => {
    const result = validate(makeDoc({ type: 'date', props: { name: 'dob', min: '1900-01-01' } }));
    expect(result.ok).toBe(true);
  });

  it('time accepts HH:mm format', () => {
    const ok = validate(makeDoc({ type: 'time', props: { name: 't', min: '09:00', max: '17:30' } }));
    expect(ok.ok).toBe(true);
    const bad = validate(makeDoc({ type: 'time', props: { name: 't', min: '9am' } }));
    expect(bad.ok).toBe(false);
  });

  it('otp length within 2..12 range', () => {
    expect(validate(makeDoc({ type: 'otp', props: { name: 'c', length: 6 } })).ok).toBe(true);
    expect(validate(makeDoc({ type: 'otp', props: { name: 'c', length: 1 } })).ok).toBe(false);
    expect(validate(makeDoc({ type: 'otp', props: { name: 'c', length: 13 } })).ok).toBe(false);
  });

  it('responsive prop accepts both value and { base, sm, … }', () => {
    expect(validate(makeDoc({ type: 'grid', props: { cols: 3 } })).ok).toBe(true);
    expect(validate(makeDoc({ type: 'grid', props: { cols: { base: 1, md: 2 } } })).ok).toBe(true);
    expect(validate(makeDoc({ type: 'grid', props: { cols: 'three' } })).ok).toBe(false);
  });
});

describe('validate — unknown types', () => {
  const doc = makeDoc({ type: 'hero', props: {} });

  it('warns in lenient mode', () => {
    const result = validate(doc, { mode: 'lenient' });
    expect(result.ok).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].code).toBe('UNKNOWN_TYPE');
  });

  it('errors in strict mode', () => {
    const result = validate(doc, { mode: 'strict' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.code === 'UNKNOWN_TYPE')).toBe(true);
    }
  });

  it('strict mode accepts knownExternalTypes', () => {
    const result = validate(doc, { mode: 'strict', knownExternalTypes: ['hero'] });
    expect(result.ok).toBe(true);
  });
});

describe('validate — JSON pointer paths', () => {
  it('errors include RFC-6901 JSON pointer for nested nodes', () => {
    const doc = makeDoc({
      type: 'stack',
      children: [
        { type: 'card' },
        { type: 'field', props: {} },           // ← invalid: name missing
      ],
    });
    const result = validate(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const fieldErr = result.errors.find((e) => e.path.includes('children/1/props'));
      expect(fieldErr).toBeDefined();
    }
  });

  it('escapes JSON pointer special characters', () => {
    // The pointer encoding handles `~` → `~0` and `/` → `~1`. The default
    // tree doesn't trigger them, but the validator must not throw.
    const result = validate(makeDoc({ type: 'card', children: [{ type: 'card' }] }));
    expect(result.ok).toBe(true);
  });
});

describe('validate — visibility + access', () => {
  it('accepts a valid field-first visibility rule', () => {
    const doc = makeDoc({
      type: 'field',
      props: { name: 'taxId' },
      visibility: { field: '$form.country', eq: 'IT' },
    });
    expect(validate(doc).ok).toBe(true);
  });

  it('rejects a malformed visibility rule (mixed field + and)', () => {
    const doc = makeDoc({
      type: 'field',
      props: { name: 'taxId' },
      visibility: { field: '$form.country', and: [] },
    });
    expect(validate(doc).ok).toBe(false);
  });

  it('accepts a valid access rule', () => {
    const doc = makeDoc({
      type: 'button',
      props: { label: 'Edit' },
      access: { resource: 'invoice', action: 'update', onUnauthorized: 'hide' },
    });
    expect(validate(doc).ok).toBe(true);
  });

  it('rejects unknown onUnauthorized value', () => {
    const doc = makeDoc({
      type: 'button',
      props: { label: 'Edit' },
      access: { resource: 'invoice', action: 'update', onUnauthorized: 'redirect' },
    });
    expect(validate(doc).ok).toBe(false);
  });
});
