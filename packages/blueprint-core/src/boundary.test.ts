/**
 * Boundary tests — validator behaviour under stress + malformed input.
 *
 * The happy-path validator tests live in `validator.test.ts`. This file
 * exercises the extremes: large trees, garbage payloads, deep nesting,
 * circular references. The point is to lock in the "does not crash /
 * does not hang" guarantee that production consumers rely on.
 */
import { describe, it, expect } from 'vitest';
import { validate } from './validator';
import type { BlueprintNode } from './types';

function buildBalancedTree(nodeCount: number): BlueprintNode {
  // Balanced-ish stack tree — each stack gets up to 5 text children,
  // wrapped in an outer stack when depth grows. Yields a predictable
  // node count without pathological recursion depth.
  const children: BlueprintNode[] = [];
  let remaining = nodeCount - 1; // leave one for the root
  const CHILDREN_PER_CONTAINER = 5;
  let idCounter = 0;
  const nextId = () => `n${idCounter++}`;

  const makeGroup = (count: number): BlueprintNode => {
    const kids: BlueprintNode[] = [];
    const nested = count > CHILDREN_PER_CONTAINER;
    const inThisGroup = nested ? CHILDREN_PER_CONTAINER - 1 : count;
    for (let i = 0; i < inThisGroup; i++) {
      kids.push({
        type: 'text',
        id: nextId(),
        props: { children: `Row ${idCounter}` },
      });
    }
    if (nested) {
      kids.push(makeGroup(count - inThisGroup));
    }
    return {
      type: 'stack',
      id: nextId(),
      props: { spacing: 'md' },
      children: kids,
    };
  };

  while (remaining > 0) {
    const groupSize = Math.min(20, remaining);
    children.push(makeGroup(groupSize));
    remaining -= groupSize + 1;
  }
  return {
    type: 'stack',
    id: 'root',
    props: { spacing: 'lg' },
    children,
  };
}

function countNodes(node: BlueprintNode): number {
  return 1 + (node.children?.reduce((s, c) => s + countNodes(c), 0) ?? 0);
}

describe('validator — large-tree perf boundary', () => {
  it('validates a 500-node contract under 25ms median across 5 runs', () => {
    const root = buildBalancedTree(500);
    const actual = countNodes(root);
    expect(actual).toBeGreaterThanOrEqual(500);

    const doc = { version: '1.0' as const, root };
    const timings: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      const result = validate(doc, { mode: 'strict' });
      const t1 = performance.now();
      expect(result.ok).toBe(true);
      timings.push(t1 - t0);
    }
    timings.sort((a, b) => a - b);
    const median = timings[Math.floor(timings.length / 2)];
    // Cold-V8 headroom. The EXTRACTION-CHECKLIST target is 5ms but that
    // assumes production build. This test runs under vitest with source
    // transforms; 25ms leaves generous margin without inviting regression.
    expect(median).toBeLessThan(25);
  });

  it('validates a 2000-node contract without stack overflow', () => {
    const root = buildBalancedTree(2000);
    const doc = { version: '1.0' as const, root };
    const result = validate(doc, { mode: 'lenient' });
    expect(result.ok).toBe(true);
  });
});

describe('validator — deep visibility nesting', () => {
  it('handles a 20-deep and-chain without crashing', () => {
    // Build: and([and([and([...]), leaf]), leaf])
    // Depth 20 stresses the recursive evaluator + cycle-detection walker.
    let rule: unknown = { field: '$form.x', eq: 1 };
    for (let i = 0; i < 20; i++) {
      rule = { and: [rule, { field: '$form.y', neq: null }] };
    }
    const doc = {
      version: '1.0' as const,
      root: {
        type: 'text',
        id: 'gated',
        props: { children: 'ok' },
        visibility: rule,
      } as BlueprintNode,
    };
    const result = validate(doc, { mode: 'strict' });
    expect(result.ok).toBe(true);
  });
});

describe('validator — malformed input', () => {
  it('rejects null document without throwing', () => {
    const result = validate(null as unknown as {
      version: '1.0';
      root: BlueprintNode;
    }, { mode: 'strict' });
    expect(result.ok).toBe(false);
  });

  it('rejects non-object document without throwing', () => {
    const result = validate('not an object' as unknown as {
      version: '1.0';
      root: BlueprintNode;
    }, { mode: 'strict' });
    expect(result.ok).toBe(false);
  });

  it('rejects missing version', () => {
    const doc = { root: { type: 'text', props: { children: 'x' } } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = validate(doc as any, { mode: 'strict' });
    expect(result.ok).toBe(false);
  });

  it('rejects circular child references without hanging', () => {
    // A → contains → A. Zod can't traverse indefinitely — either the
    // recursive schema stops or we surface an error, but we must NOT
    // infinite-loop the process.
    const parent: BlueprintNode = {
      type: 'stack',
      id: 'a',
      props: { spacing: 'md' },
      children: [],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (parent.children as any).push(parent);
    const doc = { version: '1.0' as const, root: parent };
    // Bound the assertion by a hard time limit — validator MUST return.
    const start = performance.now();
    let result: ReturnType<typeof validate> | null = null;
    try {
      result = validate(doc, { mode: 'strict' });
    } catch {
      // Zod may throw on max-depth exceeded, which is an acceptable
      // fail-fast — the process didn't hang.
    }
    const elapsed = performance.now() - start;
    // 500ms budget — long enough for any legitimate recursive check,
    // short enough to catch an actual hang.
    expect(elapsed).toBeLessThan(500);
    // If we got a result, it must be an error (not silently ok).
    if (result) expect(result.ok).toBe(false);
  });

  it('rejects a node whose type is not a string', () => {
    const doc = {
      version: '1.0' as const,
      root: { type: 42, props: {} },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = validate(doc as any, { mode: 'strict' });
    expect(result.ok).toBe(false);
  });

  it('rejects a document with a huge string as root', () => {
    const huge = 'x'.repeat(1_000_000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = validate({ version: '1.0', root: huge } as any, { mode: 'strict' });
    expect(result.ok).toBe(false);
  });
});
