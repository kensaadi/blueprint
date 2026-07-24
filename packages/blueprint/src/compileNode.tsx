/**
 * Blueprint compiler — thin dispatcher.
 *
 * Pipeline for each node, in priority order:
 *   1. Visibility gate (wraps whatever else this node would render)
 *   2. Slot override (top-level prop on <DashBlueprint /> matching the id)
 *   3. Custom node registry (customNodes map)
 *   4. Form node — inject formConfig and delegate to the registry binding
 *   5. Active flavor registry (LIBS[lib]) lookup
 *   6. Unknown type → red dev-warn block
 *
 * `node.access` (RBAC) is always forwarded to the binding as a prop —
 * the @dashforge/{tw,ui} components honor it via `useAccessState`.
 */

import {
  type ReactNode,
  type ReactElement,
  type ComponentType,
  isValidElement,
  cloneElement,
} from 'react';

import type {
  BlueprintNode,
  FormConfig,
  Registry,
  VisibilityRule,
  AccessRule,
} from '@dashforge/blueprint-core';
import { VisibilityGate, type NamedRuleMap } from './VisibilityGate';
import { NodeErrorBoundary } from './NodeErrorBoundary';

export type CompileContext = {
  registry: Registry;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customNodes?: Record<string, ComponentType<any>>;
  forms?: Record<string, FormConfig>;
  slotOverrides: Record<string, ReactNode>;
  rules?: NamedRuleMap;
};

export function compileTree(root: BlueprintNode, ctx: CompileContext): ReactNode {
  return compileNode(root, ctx, 0);
}

function compileChildren(
  children: BlueprintNode[] | undefined,
  ctx: CompileContext,
): ReactNode {
  if (!children?.length) return null;
  return children.map((child, idx) => compileNode(child, ctx, idx));
}

function compileNode(
  node: BlueprintNode,
  ctx: CompileContext,
  key: number,
): ReactNode {
  // Fast-path: `visibility: false` short-circuits everything below.
  if (node.visibility === false) return null;
  const inner = renderInner(node, ctx, key);
  // `visibility: true` or absent → render normally (no gate).
  // VisibilityRule predicate → wrap in gate.
  if (node.visibility === undefined || node.visibility === true) return inner;
  return (
    <VisibilityGate key={`v-${key}`} rule={node.visibility as VisibilityRule} rules={ctx.rules}>
      {inner}
    </VisibilityGate>
  );
}

function renderInner(node: BlueprintNode, ctx: CompileContext, key: number): ReactNode {
  // 1. Slot override wins (after visibility — id-overrides should still
  //    respect node.visibility). Wrapped in a NodeErrorBoundary so a
  //    throwing user element degrades to an inline fallback instead of
  //    taking the whole tree down.
  if (node.id && ctx.slotOverrides[node.id] !== undefined) {
    const override = ctx.slotOverrides[node.id];
    const rendered = isValidElement(override)
      ? cloneElement(override as ReactElement)
      : <>{override}</>;
    return (
      <NodeErrorBoundary key={key} scope="slot" nodeId={node.id} nodeType={node.type}>
        {rendered}
      </NodeErrorBoundary>
    );
  }

  const hasNestedChildren = !!node.children?.length;
  const compiledChildren = hasNestedChildren ? compileChildren(node.children, ctx) : undefined;
  const accessProps = node.access ? { access: node.access as AccessRule } : {};
  // Static structural disable from the contract. Bindings OR-compose this
  // with their existing `props.disabled` (most-restrictive-wins) and with
  // any access-resolved disabled state via useAccessState.
  const disabledProps = node.disabled === true ? { disabled: true } : {};
  // `grid` is the only container that reads per-child `layoutHint`. We
  // pass the hints as an index-aligned array via a compiler-injected
  // prop (underscore-prefixed so the schema-driven inspector doesn't
  // surface it as a user-editable field). Other atoms ignore the hint.
  const gridHints =
    node.type === 'grid' && hasNestedChildren && node.children
      ? { _childLayoutHints: node.children.map((c) => c.layoutHint) }
      : {};

  // 2. customNodes (per-instance user extensions) beat the native registry.
  // Wrapped in a NodeErrorBoundary — a throwing user component becomes
  // an inline fallback, not a whole-tree crash.
  if (ctx.customNodes?.[node.type]) {
    const Custom = ctx.customNodes[node.type];
    return (
      <NodeErrorBoundary key={key} scope="customNode" nodeType={node.type} nodeId={node.id}>
        {wrap(Custom, undefined, { ...node.props, ...accessProps, ...disabledProps }, compiledChildren, hasNestedChildren)}
      </NodeErrorBoundary>
    );
  }

  // 3. `form` is dispatched through the registry like any atom but receives
  //    the resolved FormConfig as an extra prop from the compiler.
  if (node.type === 'form') {
    const FormBinding = ctx.registry.form;
    const formConfig = node.id ? ctx.forms?.[node.id] : undefined;
    return (
      <FormBinding key={key} formConfig={formConfig} {...accessProps} {...disabledProps}>
        {compiledChildren}
      </FormBinding>
    );
  }

  // 4. Active flavor registry
  const Binding = ctx.registry[node.type as keyof Registry];
  if (Binding) {
    return wrap(Binding, key, { ...node.props, ...accessProps, ...disabledProps, ...gridHints }, compiledChildren, hasNestedChildren);
  }

  // 5. Fallback
  return renderUnknown(node, key);
}

function wrap(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: ComponentType<any>,
  key: number | undefined,
  nodeProps: Record<string, unknown> | undefined,
  compiledChildren: ReactNode | undefined,
  hasNestedChildren: boolean,
): ReactNode {
  if (hasNestedChildren) {
    return (
      <Component key={key} {...(nodeProps as Record<string, unknown>)}>
        {compiledChildren}
      </Component>
    );
  }
  return <Component key={key} {...(nodeProps as Record<string, unknown>)} />;
}

function renderUnknown(node: BlueprintNode, key: number): ReactNode {
  return (
    <div key={key} className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
      Unknown node type: <code>{node.type}</code>
      {node.id && (
        <>
          {' '}with id <code>{node.id}</code>
        </>
      )}
      . Add it to <code>customNodes</code>, override via slot prop, or correct the contract.
    </div>
  );
}
