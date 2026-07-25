/**
 * AtomAboutPanel — collapsible "About this atom" block in the Inspector.
 *
 * Reads the human description from `getAtomDoc()` (owned by devtools/
 * atomDocs.ts, so devtools Catalog + this panel stay in sync). The
 * panel starts COLLAPSED so it doesn't add noise for experienced users;
 * newcomers who click "?" learn the atom's purpose without leaving
 * the Inspector.
 */
import { useState } from 'react';
import { Typography } from '@dashforge/tw';
import { getAtomDoc } from '../atomDocs';
import type { AtomName } from '@dashforge/blueprint-core';

export function AtomAboutPanel({ atomName }: { atomName: string }) {
  const [open, setOpen] = useState(false);
  const doc = getAtomDoc(atomName as AtomName);
  if (!doc.description) return null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between gap-2 text-left"
        style={{ color: 'var(--bd-text-faint)' }}
      >
        <span className="text-[12px] font-medium uppercase tracking-[0.1em]">
          About this atom
        </span>
        <i
          className={`ti ti-chevron-${open ? 'up' : 'down'} text-[14px]`}
          aria-hidden
        />
      </button>
      {open && (
        <Typography
          variant="body2"
          className="text-[12px] leading-relaxed"
          style={{ color: 'var(--bd-text-soft)' }}
        >
          {doc.description}
        </Typography>
      )}
    </div>
  );
}
