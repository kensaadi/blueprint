/**
 * Registry contract — each flavor pack exports a `Registry` that covers
 * every atom in the catalog. The compiler resolves `node.type` against
 * the registry selected by the `lib` prop.
 */

import type { ComponentType } from 'react';
import type { AtomName } from './atoms';

/** A single atom binding: any React component that consumes node.props + children. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AtomBinding = ComponentType<any>;

/** Map from atom name to its concrete React component. Must cover every catalog atom. */
export type Registry = Record<AtomName, AtomBinding>;
