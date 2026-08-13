/**
 * Team templates — the user-facing side of the `custom-catalog` feature.
 *
 * The customer's PRIVATE template catalog, hosted in their self-hosted
 * Workspace Service, surfaced next to Foundry's public marketplace. Any
 * member can start a new contract from a team template ("Use"); an
 * owner/admin can save the current contract as a team template or remove
 * one. Shown only when connected AND the plan entitles `custom-catalog`
 * (Enterprise). The WS re-checks the feature + admin role, so this panel is
 * a convenience surface, not the security boundary.
 */
import { useCallback, useEffect, useState } from 'react';
import { useBuilderState, useBuilderDispatch } from '../state/BuilderStateContext';
import { useFeature } from '../licensing/LicenseContext';
import { useConfirm } from '../primitives/DialogFlow';
import { loadSession, sessionToken } from '../api/workspace/session';
import {
  createCatalogTemplate,
  deleteCatalogTemplate,
  listCatalog,
  readCatalogTemplate,
} from '../api/workspace/service';
import type { CatalogEntry } from '../api/workspace/types';
import { normalizeContract } from '../state/importContract';

export function TeamTemplatesPanel() {
  const hasCatalog = useFeature('custom-catalog');
  const { contract } = useBuilderState();
  const dispatch = useBuilderDispatch();
  const confirm = useConfirm();
  const role = loadSession()?.user.role ?? '';
  const canManage = role === 'owner' || role === 'admin';

  const [items, setItems] = useState<CatalogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [usingId, setUsingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const r = await listCatalog();
    if (r.error) setError(r.error.message);
    else setItems(r.data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (hasCatalog && sessionToken()) void refresh();
  }, [hasCatalog, refresh]);

  // Self-gate: only shown when connected + entitled. Any member sees it
  // (they can "Use"); management affordances are admin-only.
  if (!sessionToken() || !hasCatalog) return null;

  async function save() {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    setError(null);
    const r = await createCatalogTemplate(n, description.trim(), contract);
    setBusy(false);
    if (r.error) {
      setError(r.error.message);
      return;
    }
    setName('');
    setDescription('');
    await refresh();
  }

  async function use(t: CatalogEntry) {
    setUsingId(t.id);
    setError(null);
    const r = await readCatalogTemplate(t.id);
    setUsingId(null);
    if (r.error) {
      setError(r.error.message);
      return;
    }
    dispatch({ type: 'replaceContract', contract: normalizeContract(r.data.content) });
  }

  async function remove(t: CatalogEntry) {
    const ok = await confirm({
      title: `Remove "${t.name}"?`,
      body: 'The team template is deleted for everyone. Files already created from it are unaffected.',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    const r = await deleteCatalogTemplate(t.id);
    if (r.error) {
      setError(r.error.message);
      return;
    }
    await refresh();
  }

  return (
    <section
      className="mt-4 rounded-xl border px-4 py-3"
      style={{ borderColor: 'var(--bd-border)', background: 'var(--bd-panel)' }}
      aria-label="Team templates"
    >
      <div className="flex items-center gap-2">
        <i className="ti ti-books text-[18px]" style={{ color: 'var(--bd-accent)' }} aria-hidden />
        <div className="text-[13px] font-semibold" style={{ color: 'var(--bd-text)' }}>
          Team templates
        </div>
        <span className="text-[12px]" style={{ color: 'var(--bd-text-soft)' }}>
          {items.length > 0 ? `${items.length}` : ''}
        </span>
      </div>

      {error && (
        <div className="mt-2 text-[12px]" style={{ color: 'var(--bd-danger, #dc2626)' }}>
          {error}
        </div>
      )}

      {/* Templates */}
      <ul className="mt-3 flex flex-col gap-1 border-t pt-3" style={{ borderColor: 'var(--bd-border)' }}>
        {items.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2 py-[3px]">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium" style={{ color: 'var(--bd-text)' }}>
                {t.name}
              </div>
              {t.description && (
                <div className="truncate text-[11px]" style={{ color: 'var(--bd-text-soft)' }}>
                  {t.description}
                </div>
              )}
            </div>
            <div className="flex flex-none items-center gap-2">
              <button
                type="button"
                disabled={usingId !== null}
                onClick={() => void use(t)}
                className="cursor-pointer rounded-lg px-3 py-[5px] text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                style={{ background: 'var(--bd-accent-bg)', color: 'var(--bd-accent)' }}
              >
                {usingId === t.id ? 'Loading…' : 'Use'}
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => void remove(t)}
                  title={`Remove ${t.name}`}
                  className="flex cursor-pointer items-center rounded-md border px-2 py-[4px] text-[12px] transition duration-100 hover:opacity-90 active:scale-[0.97]"
                  style={{ borderColor: 'var(--bd-border-strong)', color: 'var(--bd-danger, #dc2626)' }}
                >
                  <i className="ti ti-trash text-[13px]" aria-hidden />
                </button>
              )}
            </div>
          </li>
        ))}
        {loaded && items.length === 0 && !error && (
          <li className="text-[12px]" style={{ color: 'var(--bd-text-faint)' }}>
            No team templates yet.
          </li>
        )}
      </ul>

      {/* Save current as template (admin) */}
      {canManage && (
        <form
          className="mt-3 flex flex-col gap-2 border-t pt-3"
          style={{ borderColor: 'var(--bd-border)' }}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--bd-text-faint)' }}>
            Save current as team template
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              required
              placeholder="Template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-lg border px-3 py-2 text-[13px] outline-none"
              style={{
                borderColor: 'var(--bd-border-strong)',
                background: 'var(--bd-surface, var(--bd-item))',
                color: 'var(--bd-text)',
              }}
            />
            <input
              placeholder="Short description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1 rounded-lg border px-3 py-2 text-[13px] outline-none"
              style={{
                borderColor: 'var(--bd-border-strong)',
                background: 'var(--bd-surface, var(--bd-item))',
                color: 'var(--bd-text)',
              }}
            />
            <button
              type="submit"
              disabled={busy || !contract.root}
              title={!contract.root ? 'Add at least one atom first' : undefined}
              className="cursor-pointer rounded-lg px-4 py-[7px] text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
              style={{ background: 'var(--bd-accent)', color: 'var(--bd-accent-fg)' }}
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
