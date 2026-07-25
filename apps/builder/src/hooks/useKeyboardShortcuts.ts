/**
 * Global keyboard shortcuts for the Builder.
 *
 * Currently wires:
 *   - Delete / Backspace  → remove the selected node
 *   - Cmd/Ctrl + Z        → undo
 *   - Cmd/Ctrl + Shift + Z→ redo (also Ctrl+Y on Windows/Linux)
 *
 * The listener is attached at the window level so shortcuts work
 * regardless of which panel has DOM focus, but it explicitly bails
 * when the focused element is an input, textarea, or contentEditable
 * region — otherwise typing a name in the Inspector would nuke the
 * node the user is trying to edit, and Cmd+Z would fight the browser's
 * own text-undo instead of undoing the contract change.
 */
import { useEffect } from 'react';
import { useBuilderState, useBuilderDispatch } from '../state/BuilderStateContext';

/** Elements where typing means "edit text", not "edit the tree". */
function isTypingContext(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function useKeyboardShortcuts(
  onOpenPalette?: (mode?: 'all' | 'navigate') => void,
  onSave?: () => void,
  onSaveAs?: () => void,
  onOpenFile?: () => void,
) {
  const { selectedId } = useBuilderState();
  const dispatch = useBuilderDispatch();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+K opens the full Command Palette. Works even while
      // typing in an input so the user can search from any focus
      // context.
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenPalette?.('all');
        return;
      }
      // Cmd/Ctrl+P is the VSCode-style "Go to node" — same palette
      // restricted to the Navigate section.
      if (mod && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        onOpenPalette?.('navigate');
        return;
      }
      // Cmd/Ctrl(+Shift)+S — Save / Save-As routed to the workspace
      // layer. Skips typing contexts so a user in the Inspector can
      // still Cmd+S their browser page if they insist.
      if (mod && e.key.toLowerCase() === 's' && !isTypingContext(e.target)) {
        e.preventDefault();
        if (e.shiftKey) onSaveAs?.();
        else onSave?.();
        return;
      }
      // Cmd/Ctrl+O — File browser modal.
      if (mod && e.key.toLowerCase() === 'o' && !isTypingContext(e.target)) {
        e.preventDefault();
        onOpenFile?.();
        return;
      }

      // Undo / Redo — skip while the user is typing so the browser's
      // native text-undo keeps working inside the Inspector inputs.
      if (mod && !isTypingContext(e.target)) {
        const key = e.key.toLowerCase();
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault();
          dispatch({ type: 'undo' });
          return;
        }
        if ((key === 'z' && e.shiftKey) || key === 'y') {
          e.preventDefault();
          dispatch({ type: 'redo' });
          return;
        }
      }

      // Delete key — remove the selected node.
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (!selectedId) return;
      if (isTypingContext(e.target)) return;
      e.preventDefault();
      dispatch({ type: 'removeNode', id: selectedId });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, dispatch, onOpenPalette, onSave, onSaveAs, onOpenFile]);
}
