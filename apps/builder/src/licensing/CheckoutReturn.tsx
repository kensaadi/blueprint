/**
 * Checkout return handler.
 *
 * Stripe redirects back to the Builder after a hosted-checkout payment
 * with `?checkout=success&session_id=cs_…`. The Builder has no router,
 * so this component reads the query at mount, then polls Foundry by the
 * unguessable session id (no auth) until the webhook has minted the
 * receipt (marketplace) or license (subscription):
 *
 *   - license token → verify + activate (LicenseContext)
 *   - receipt       → grant template ownership (Entitlements)
 *
 * A session is either a subscription or a one-shot, so we try the
 * license endpoint first and fall back to the receipt endpoint; a 404 on
 * both means the webhook hasn't landed yet — we wait and retry. The URL
 * is cleaned immediately so a refresh doesn't reprocess.
 *
 * Renders nothing. Mounted inside the License + Entitlements + DialogFlow
 * providers.
 */
import { useEffect, useRef, useState } from 'react';
import { useLicense } from './LicenseContext';
import { useEntitlements } from './entitlements';
import { useAlert } from '../primitives/DialogFlow';
import { useFileOps } from '../hooks/useFileOps';
import { saveMarketplaceTemplate } from '../workspaces/saveMarketplaceTemplate';
import * as licenseApi from '../api/license/service';
import * as marketplaceApi from '../api/marketplace/service';
import { HAS_WORKSPACE } from '../api/_shared/config';
import { sessionToken } from '../api/workspace/session';
import { registerLicense } from '../api/workspace/service';

const POLL_ATTEMPTS = 8;
const POLL_DELAY_MS = 1500;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Strip the checkout params so a reload doesn't reprocess the return. */
function cleanUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('checkout');
  url.searchParams.delete('session_id');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}

export function CheckoutReturn() {
  const { activate, syncWorkspace } = useLicense();
  const { refresh } = useEntitlements();
  const { open } = useFileOps();
  const alert = useAlert();
  const [processing, setProcessing] = useState(false);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'success') return;
    const sessionId = params.get('session_id');
    cleanUrl();
    if (!sessionId) return;
    // Hold the Builder behind a loading veil while we wait for the webhook to
    // mint the receipt and we download the contract into the workspace.
    setProcessing(true);

    // Fire-and-forget poll. `ranRef` guarantees this body runs exactly
    // once, so we deliberately register NO cleanup: a StrictMode cleanup
    // (or a stray unmount) must NOT abort the in-flight poll — otherwise
    // it would stop right after the /licenses probe and never reach the
    // /receipts fallback. This component lives at the app root and does
    // not unmount during a session.
    void (async () => {
     try {
      for (let i = 0; i < POLL_ATTEMPTS; i++) {
        // Subscription? Retrieve the signed license token.
        const lic = await licenseApi.getBySession(sessionId);
        if (lic.data) {
          // When connected to a self-hosted Workspace Service, the
          // WS-enforced license is AUTHORITATIVE — activating only the
          // offline token would be immediately overridden by the WS (still
          // Community), so the paid plan would never show. Register the
          // subscription INTO the WS so it persists, enforces, and appears.
          // Owner-only server-side.
          if (HAS_WORKSPACE && sessionToken()) {
            const r = await registerLicense(lic.data.token);
            if (r.error) {
              await alert(
                r.error.status === 403
                  ? {
                      title: 'Almost there',
                      body: 'Your payment went through. Ask your workspace owner to activate the subscription — only the owner can register a license.',
                    }
                  : { title: 'Activation issue', body: r.error.message },
              );
              return;
            }
            await syncWorkspace();
            await alert({
              title: 'Subscription active',
              body: `Your ${lic.data.tier} plan is now active for this workspace.`,
            });
            return;
          }

          // Local-only mode (no Workspace Service): the offline token is
          // the source of truth.
          const ok = await activate(lic.data.token);
          await alert(
            ok
              ? {
                  title: 'Subscription active',
                  body: `Your ${lic.data.tier} plan is now active.`,
                }
              : {
                  title: 'Activation failed',
                  body: 'The license could not be verified. Please contact support.',
                },
          );
          return;
        }

        // One-shot? Retrieve the receipt, then SAVE the purchased template
        // into the buyer's workspace (tagged with its provenance) so it lands
        // in "your contracts", can never be re-bought, and opens ready to
        // edit — no hunting back through the marketplace.
        const rec = await marketplaceApi.getReceiptBySession(sessionId);
        if (rec.data) {
          const tpl = await marketplaceApi.getTemplate(rec.data.templateId);
          const ref = tpl.data ? await saveMarketplaceTemplate(tpl.data) : null;
          await refresh();
          if (ref) {
            await open(ref.workspaceId, ref.fileId);
            await alert({
              title: 'Purchase complete',
              body: `"${tpl.data!.name}" is now in your contracts — opened and ready to edit.`,
            });
          } else {
            // Ownership is recorded server-side by the save attempt; degrade to
            // a manual open if the download/save failed.
            await alert({
              title: 'Purchase complete',
              body: 'The template is now yours — open it from your contracts.',
            });
          }
          return;
        }

        // Neither yet → the webhook is still in flight. Wait and retry.
        await delay(POLL_DELAY_MS);
      }
      await alert({
        title: 'Almost there',
        body: 'Your payment is processing. Refresh in a moment to activate it.',
      });
     } finally {
      setProcessing(false);
     }
    })();
    // Run exactly once on mount (ranRef guards StrictMode double-invoke).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!processing) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Finalizing your purchase"
      className="fixed inset-0 z-[95] flex flex-col items-center justify-center gap-3"
      style={{ background: 'var(--bd-canvas)' }}
    >
      <i
        className="ti ti-loader-2 animate-spin text-[26px]"
        style={{ color: 'var(--bd-accent)' }}
        aria-hidden
      />
      <div className="text-[14px] font-medium" style={{ color: 'var(--bd-text)' }}>
        Finalizing your purchase…
      </div>
      <div className="text-[12px]" style={{ color: 'var(--bd-text-soft)' }}>
        Adding it to your contracts — this takes a moment.
      </div>
    </div>
  );
}
