/**
 * History wrapper around `builderReducer` — implements undo / redo by
 * keeping a bounded stack of past states.
 *
 * Design notes:
 *   - Pure `select` actions do not push a history entry. Otherwise
 *     Cmd+Z would rewind every click-to-focus, which is not what
 *     users expect (Figma / Sketch / Notion all skip selection).
 *   - No-op actions (reducer returned the same state reference) are
 *     also skipped — undo has nothing meaningful to rewind to.
 *   - History is capped at `MAX_HISTORY` entries so a long editing
 *     session doesn't grow unbounded. The oldest entry is discarded
 *     when the cap is reached.
 *   - On a fresh action after an undo, the `future` stack is cleared
 *     (standard undo-tree behavior: taking a new branch drops the
 *     previous redo path).
 */
import { builderReducer, type BuilderAction } from './reducer';
import type { BuilderState } from './types';

const MAX_HISTORY = 50;

export type HistoryState = {
  past: BuilderState[];
  present: BuilderState;
  future: BuilderState[];
};

export type HistoryAction =
  | BuilderAction
  | { type: 'undo' }
  | { type: 'redo' };

export function initHistory(present: BuilderState): HistoryState {
  return { past: [], present, future: [] };
}

/**
 * Actions that mutate selection only. They update the present but do
 * not push a history entry — so Cmd+Z rewinds the last STRUCTURAL edit
 * instead of the last click on the canvas.
 */
function isSelectionOnly(action: BuilderAction): boolean {
  return (
    action.type === 'select' ||
    action.type === 'hover' ||
    // `setFileRef` is a rename / attach-to-file mutation. It doesn't
    // change the contract itself, so Cmd+Z shouldn't unwind it.
    action.type === 'setFileRef'
  );
}

export function historyReducer(
  state: HistoryState,
  action: HistoryAction,
): HistoryState {
  if (action.type === 'undo') {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, -1);
    return {
      past: newPast,
      present: previous,
      future: [state.present, ...state.future],
    };
  }
  if (action.type === 'redo') {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    return {
      past: [...state.past, state.present],
      present: next,
      future: newFuture,
    };
  }

  const nextPresent = builderReducer(state.present, action);
  if (nextPresent === state.present) return state;

  if (isSelectionOnly(action)) {
    // Update present in place; leave past + future untouched.
    return { ...state, present: nextPresent };
  }

  // Push previous present onto the past stack, capped at MAX_HISTORY.
  const nextPast =
    state.past.length >= MAX_HISTORY
      ? [...state.past.slice(1), state.present]
      : [...state.past, state.present];

  return {
    past: nextPast,
    present: nextPresent,
    future: [], // structural change → discard redo branch
  };
}

export function canUndo(state: HistoryState): boolean {
  return state.past.length > 0;
}

export function canRedo(state: HistoryState): boolean {
  return state.future.length > 0;
}
