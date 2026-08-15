/* eslint-disable react-hooks/preserve-manual-memoization */
/**
 * <DashBlueprint /> — runtime entry point.
 *
 *   <DashBlueprint
 *     {...contract}                                 // BlueprintDocument spread
 *     lib="tw"                                       // required flavor selector
 *     customNodes={{ hero: HeroComponent, ... }}    // per-instance node extensions
 *     forms={{ "form-id": { schema, onSubmit } }}   // form configs by id
 *     rules={{ "showForBeta": () => true }}         // named visibility rules
 *     someId={<MyComponent />}                       // slot override for id="someId"
 *   />
 *
 * Pre-compile pipeline: validator (lenient default) → red diagnostics
 * on hard errors → registry resolution → tree compile.
 */

import { type ComponentType, type ReactNode, useEffect, useMemo } from 'react';
import type {
  BlueprintNode,
  FormConfig,
  IconRegistry,
  IntlConfig,
  LibName,
  ValidationError,
  ValidationMode,
} from '@dashforge/blueprint-core';
import { collectMissingIconRefs, collectMissingTranslationKeys, validate } from '@dashforge/blueprint-core';
import { compileTree, type CompileContext } from './compileNode';
import {
  IconProvider,
  IntlProvider,
  DataSourceProvider,
  type DataResolver,
} from '@dashforge/blueprint-runtime';
import { LIBS } from './libs';
import { ValidationErrorCard } from './ValidationErrorCard';
import type { NamedRuleMap } from './VisibilityGate';

/** Reserved prop names — anything else is a slot override keyed by node.id. */
const RESERVED_PROPS = new Set([
  'version',
  'lib',
  'root',
  'metadata',
  'customNodes',
  'forms',
  'rules',
  'slots',
  'icons',
  'intl',
  'resolveData',
  'validationMode',
  'onValidationDiagnostics',
  'children',
  'key',
  'ref',
]);

const EMPTY_ICONS: IconRegistry = [];

export type DashBlueprintProps = {
  version: '1.0';
  lib?: LibName;
  root: BlueprintNode;
  metadata?: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customNodes?: Record<string, ComponentType<any>>;
  forms?: Record<string, FormConfig>;
  rules?: NamedRuleMap;
  /**
   * Slot overrides for nodes whose id is NOT a valid JSX prop name
   * (kebab-case, contains digits at start, etc.). Wins over the
   * top-level prop form for the same id.
   *
   * Use this for ids exported by the Builder, migrated from other DSLs,
   * or any id that doesn't fit the camelCase top-level prop convention.
   */
  slots?: Record<string, ReactNode>;
  /**
   * Icon registry — array of `{ id, render, sources?, meta? }`. The
   * contract references icons by `id`; this registry maps them to the
   * actual render function. Sources are agnostic (custom SVG, lucide,
   * MUI icons, anything).
   */
  icons?: IconRegistry;
  /**
   * i18n config — opt-in. When provided, any `$t` shorthand or
   * `{ type: 'text', $t }` inline node resolves through `intl.t(key, vars)`.
   * The optional `registry` enables static validation of unknown keys
   * (warning in lenient, error in strict — same pattern as `icons`).
   *
   * No `intl` → all `$t` refs render the key literally. Backward compat.
   * The SAME `t` must be supplied on server and client to avoid
   * hydration mismatch — Blueprint does not reconcile this.
   */
  intl?: IntlConfig;
  /**
   * Resolver for dynamic (backend-bound) list props. A `select`/`radio`/
   * `autocomplete`'s `options` or a `breadcrumbs`' `items` may be bound to
   * a `$data.<key>` source instead of a static array; this maps that
   * reference to the actual list. Unresolved references fall back to the
   * binding's `sample` items (so design-time previews are never empty).
   */
  resolveData?: DataResolver;
  validationMode?: ValidationMode;
  /** Fires after every compile with the diagnostics list (errors + warnings). */
  onValidationDiagnostics?: (diagnostics: {
    errors: ValidationError[];
    warnings: ValidationError[];
  }) => void;
  /** Top-level slot override — any camelCase prop maps to a node id. */
  [slot: string]: unknown;
};

export function DashBlueprint(props: DashBlueprintProps): ReactNode {
  const {
    version,
    lib,
    root,
    metadata,
    customNodes,
    forms,
    rules,
    slots,
    icons = EMPTY_ICONS,
    intl,
    resolveData,
    // Env-aware default: dev iterates with red blocks inline, prod
    // rejects fail-loud. The Builder (V2) refuses to export anything
    // that would fail strict — so Builder-shipped contracts always
    // pass in prod. Hand-written contracts opt into the strictness.
    // `import.meta.env` is a Vite/esbuild define; the cast keeps this
    // package free of a Vite/@types/node type dependency.
    validationMode = ((import.meta as { env?: { PROD?: boolean } }).env?.PROD
      ? 'strict'
      : 'lenient'),
    onValidationDiagnostics,
    ...rest
  } = props;

  // Slot overrides resolution (decision #14 in DESIGN.md):
  //   1. start with top-level props (rest minus reserved) — camelCase ids
  //   2. merge `slots` on top — wins over top-level for the same id;
  //      handles kebab-case / numeric-leading / any non-JSX-safe id
  const slotOverrides: Record<string, ReactNode> = {};
  for (const k of Object.keys(rest)) {
    if (!RESERVED_PROPS.has(k)) {
      slotOverrides[k] = rest[k] as ReactNode;
    }
  }
  if (slots) {
    for (const k of Object.keys(slots)) {
      slotOverrides[k] = slots[k];
    }
  }

  // Stable signal — only the SET of keys matters for the validator
  // (which checks whether unknown atom types are accounted for).
  const customNodeKeys = customNodes ? Object.keys(customNodes).sort().join(',') : '';
  const slotKeys = Object.keys(slotOverrides).sort().join(',');
  const knownExternalTypes = useMemo(
    () => [
      ...(customNodes ? Object.keys(customNodes) : []),
      ...Object.keys(slotOverrides).sort(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customNodeKeys, slotKeys],
  );

  // Stable document reference (no `rest` dep — it changes every render).
  const document = useMemo(
    () => ({ version, lib, root, metadata }),
    [version, lib, root, metadata],
  );

  const validation = useMemo(
    () => validate(document, { mode: validationMode, knownExternalTypes }),
    [document, validationMode, knownExternalTypes],
  );

  // Icon reference pass — only runs when structural validation passed.
  // Misses become warnings in lenient mode and errors in strict mode.
  const iconDiagnostics = useMemo<ValidationError[]>(() => {
    if (!validation.ok) return [];
    return collectMissingIconRefs(validation.data.root, icons, validationMode);
  }, [validation, icons, validationMode]);

  // Translation key pass — same pattern as icons. When `intl.registry`
  // is undefined the pass is a no-op (runtime fallback handles missing
  // keys by rendering the key literal).
  const intlRegistry = intl?.registry;
  const intlDiagnostics = useMemo<ValidationError[]>(() => {
    if (!validation.ok) return [];
    return collectMissingTranslationKeys(validation.data.root, intlRegistry, validationMode);
  }, [validation, intlRegistry, validationMode]);

  const mergedDiagnostics = useMemo(() => {
    const baseErrors = validation.ok ? [] : validation.errors;
    const baseWarnings = validation.warnings;
    const iconErrors = iconDiagnostics.filter((d) => d.severity === 'error');
    const iconWarnings = iconDiagnostics.filter((d) => d.severity !== 'error');
    const intlErrors = intlDiagnostics.filter((d) => d.severity === 'error');
    const intlWarnings = intlDiagnostics.filter((d) => d.severity !== 'error');
    return {
      errors: [...baseErrors, ...iconErrors, ...intlErrors],
      warnings: [...baseWarnings, ...iconWarnings, ...intlWarnings],
    };
  }, [validation, iconDiagnostics, intlDiagnostics]);

  // Fire diagnostics after render. Guard against infinite loops by
  // memoizing a CONTENT KEY: setState fires only when the diagnostic
  // payload actually differs.
  const diagKey = useMemo(() => JSON.stringify(mergedDiagnostics), [mergedDiagnostics]);

  useEffect(() => {
    if (!onValidationDiagnostics) return;
    onValidationDiagnostics(mergedDiagnostics);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagKey, onValidationDiagnostics]);

  if (!validation.ok) {
    return <ValidationErrorPanel errors={mergedDiagnostics.errors} contract={document} />;
  }
  // Icon-pass + intl-pass escalations only matter once structural
  // validation passed. Both behave the same way: error severity rejects
  // render with the diagnostic panel.
  const iconErrors = iconDiagnostics.filter((d) => d.severity === 'error');
  if (iconErrors.length) {
    return <ValidationErrorPanel errors={iconErrors} contract={document} />;
  }
  const intlErrors = intlDiagnostics.filter((d) => d.severity === 'error');
  if (intlErrors.length) {
    return <ValidationErrorPanel errors={intlErrors} contract={document} />;
  }

  const effectiveLib: LibName | undefined = lib ?? validation.data.lib;
  if (!effectiveLib) {
    return (
      <ValidationErrorPanel
        errors={[
          {
            path: '/',
            message:
              '<DashBlueprint> requires a flavor. Pass `lib="tw"` or `lib="mui"`, or set `lib` on the contract.',
            severity: 'error',
          },
        ]}
      />
    );
  }
  const registry = LIBS[effectiveLib];
  if (!registry) {
    return (
      <ValidationErrorPanel
        errors={[
          {
            path: '/lib',
            message: `Unknown lib "${String(effectiveLib)}". Expected "tw" or "mui".`,
            severity: 'error',
          },
        ]}
      />
    );
  }

  const ctx: CompileContext = {
    registry,
    customNodes,
    forms,
    slotOverrides,
    rules,
  };

  return (
    <IntlProvider intl={intl}>
      <IconProvider registry={icons}>
        <DataSourceProvider resolve={resolveData}>
          {compileTree(validation.data.root, ctx)}
        </DataSourceProvider>
      </IconProvider>
    </IntlProvider>
  );
}

function ValidationErrorPanel({
  errors,
  contract,
}: {
  errors: ValidationError[];
  contract?: unknown;
}) {
  return (
    <div className="rounded-md border border-red-300 bg-red-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl" aria-hidden>⛔</span>
        <div className="text-sm font-semibold text-red-900">
          Blueprint contract is invalid — {errors.length} {errors.length === 1 ? 'error' : 'errors'}
        </div>
      </div>
      <div className="space-y-3">
        {errors.map((e, i) => (
          <ValidationErrorCard
            key={i}
            error={e}
            contract={contract}
            variant="inline"
          />
        ))}
      </div>
    </div>
  );
}
