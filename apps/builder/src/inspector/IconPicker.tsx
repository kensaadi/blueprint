/* eslint-disable react-refresh/only-export-components -- component colocates with a tiny helper predicate */
/**
 * IconPicker — text input + popover grid for the `icon` prop.
 *
 * Layout:
 *   [ icon preview | text input     ] [ v ]
 *                                   ↓ popover ↓
 *   ┌──────────────────────────────────────┐
 *   │ [ search…                            ]│
 *   │ Actions                              │
 *   │  □ □ □ □ □ □ □ □ ...                 │
 *   │ Navigation                           │
 *   │  □ □ □ □ □ ...                       │
 *   └──────────────────────────────────────┘
 *
 * The text input stays authoritative — the picker just makes the
 * common cases one click away. Free-text names outside the curated
 * pool still work (Tabler is huge; we don't want to gatekeep).
 *
 * The popover is portalled to `document.body` so it escapes the
 * Inspector's overflow-y-auto (same G-fix pattern as FieldHint).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ALL_ICONS, ICON_GROUPS } from '../data/commonIcons';

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

const inputBase =
  'w-full rounded-md border px-2.5 py-2 text-[13px] outline-none';
const inputStyle: React.CSSProperties = {
  background: 'var(--bd-item)',
  borderColor: 'var(--bd-border)',
  color: 'var(--bd-text)',
};

const POPOVER_WIDTH = 320;

export function IconPicker({ value, onChange, placeholder }: Props) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [query, setQuery] = useState('');

  const reposition = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Prefer below; flip above if there isn't 320px of room.
    let top = r.bottom + 6;
    if (top + 320 > vh - 12) top = Math.max(12, r.top - 320 - 6);
    let left = r.left;
    if (left + POPOVER_WIDTH > vw - 12) left = vw - POPOVER_WIDTH - 12;
    if (left < 12) left = 12;
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const onWin = () => reposition();
    window.addEventListener('scroll', onWin, true);
    window.addEventListener('resize', onWin);
    return () => {
      window.removeEventListener('scroll', onWin, true);
      window.removeEventListener('resize', onWin);
    };
  }, [open]);

  // Close on click-outside and on Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      const pop = document.getElementById('icon-picker-pop');
      if (pop?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_GROUPS;
    return ICON_GROUPS.map((g) => ({
      label: g.label,
      icons: g.icons.filter((i) => i.toLowerCase().includes(q)),
    })).filter((g) => g.icons.length > 0);
  }, [query]);

  // If the searched name is outside the curated pool but exists as
  // any Tabler icon (we can't verify without loading the whole set),
  // we still let the user commit — they can just type it.
  const hasResults = filtered.some((g) => g.icons.length > 0);

  return (
    <div ref={anchorRef} className="flex items-stretch gap-2">
      <div
        className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-md border"
        style={{
          background: 'var(--bd-item)',
          borderColor: 'var(--bd-border)',
        }}
      >
        {value ? (
          <i
            className={`ti ti-${value} text-[18px]`}
            style={{ color: 'var(--bd-text)' }}
            aria-hidden
          />
        ) : (
          <i
            className="ti ti-question-mark text-[16px]"
            style={{ color: 'var(--bd-text-faint)' }}
            aria-hidden
          />
        )}
      </div>
      <input
        type="text"
        className={inputBase}
        style={inputStyle}
        value={value}
        placeholder={placeholder ?? 'e.g. user'}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open icon picker"
        className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-md border transition-colors"
        style={{
          background: open ? 'var(--bd-accent-bg)' : 'var(--bd-item)',
          borderColor: open ? 'var(--bd-accent)' : 'var(--bd-border)',
          color: open ? 'var(--bd-accent)' : 'var(--bd-text-soft)',
        }}
      >
        <i
          className={`ti ti-${open ? 'chevron-up' : 'chevron-down'} text-[14px]`}
          aria-hidden
        />
      </button>

      {open && pos &&
        createPortal(
          <div
            id="icon-picker-pop"
            className="fixed rounded-md border shadow-lg"
            style={{
              top: pos.top,
              left: pos.left,
              width: POPOVER_WIDTH,
              maxHeight: 320,
              zIndex: 1000,
              background: 'var(--bd-header)',
              borderColor: 'var(--bd-border-strong)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 24px rgb(0 0 0 / 0.15)',
            }}
          >
            <div className="border-b p-2" style={{ borderColor: 'var(--bd-border)' }}>
              <input
                autoFocus
                type="text"
                placeholder="Search icons…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded border px-2 py-1.5 text-[12px] outline-none"
                style={inputStyle}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {hasResults ? (
                filtered.map((g) => (
                  <div key={g.label} className="mb-3 last:mb-0">
                    <div
                      className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em]"
                      style={{ color: 'var(--bd-text-faint)' }}
                    >
                      {g.label}
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                      {g.icons.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          title={icon}
                          aria-label={`Icon ${icon}`}
                          aria-pressed={icon === value}
                          onClick={() => {
                            onChange(icon);
                            setOpen(false);
                            setQuery('');
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded transition-colors"
                          style={{
                            background:
                              icon === value ? 'var(--bd-accent-bg)' : 'transparent',
                            color:
                              icon === value ? 'var(--bd-accent)' : 'var(--bd-text)',
                            border:
                              icon === value
                                ? '1px solid var(--bd-accent)'
                                : '1px solid transparent',
                          }}
                        >
                          <i className={`ti ti-${icon} text-[16px]`} aria-hidden />
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className="p-3 text-center text-[12px]"
                  style={{ color: 'var(--bd-text-soft)' }}
                >
                  No matches. Any Tabler icon name still works — type it in
                  the input above.
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Convenience — whether the icon appears in the curated group set. */
export function isCommonIcon(name: string): boolean {
  return ALL_ICONS.includes(name);
}
