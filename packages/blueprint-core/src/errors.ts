/**
 * Validation diagnostics emitted by the contract validator.
 */

export type Severity = 'error' | 'warning';

export type ValidationError = {
  /** RFC-6901 JSON pointer into the document (e.g. "/root/children/2/props/level"). */
  path: string;
  /** Human-readable diagnostic. */
  message: string;
  /** Severity — only `error` rejects in strict mode; warnings always allow render. */
  severity: Severity;
  /** Optional machine code for tooling (Builder, devtools). */
  code?: string;
  /**
   * Enriched diagnostic context (added 2026-06-22). All fields optional
   * and additive — older consumers of `ValidationError` still work.
   *
   * Populated by the validator from zod's `ZodIssue` when available.
   * The Builder + devtools use these to render rich error cards
   * (breadcrumb, expected/received, code snippet with highlight).
   */
  /** Expected type/shape, as reported by the underlying validator. */
  expected?: string;
  /** Received type/value (truncated if very long). */
  received?: string;
  /** The offending value verbatim, for snippet rendering. */
  receivedValue?: unknown;
  /** The atom type at the breaking path, when resolvable. */
  atomType?: string;
  /** The node id at the breaking path, when resolvable. */
  atomId?: string;
};

export type ValidationMode = 'strict' | 'lenient';

export type ValidationOptions = {
  mode?: ValidationMode;
  /**
   * Names of node types known at validation time outside the catalog
   * (`customNodes` keys + slot-override ids). Lets the validator skip
   * the "unknown atom type" warning for these.
   */
  knownExternalTypes?: string[];
};

export type ValidationResult<T> =
  | { ok: true; data: T; warnings: ValidationError[] }
  | { ok: false; errors: ValidationError[]; warnings: ValidationError[] };
