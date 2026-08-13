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
import { useEffect, useRef } from 'react';
import { useLicense } from './LicenseContext';
import { useEntitlements } from './entitlements';
import { useAlert } from '../primitives/DialogFlow';
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
  const { grant } = useEntitlements();
  const alert = useAlert();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'success') return;
    const sessionId = params.get('session_id');
    cleanUrl();
    if (!sessionId) return;

    // Fire-and-forget poll. `ranRef` guarantees this body runs exactly
    // once, so we deliberately register NO cleanup: a StrictMode cleanup
    // (or a stray unmount) must NOT abort the in-flight poll — otherwise
    // it would stop right after the /licenses probe and never reach the
    // /receipts fallback. This component lives at the app root and does
    // not unmount during a session.
    (async () => {
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

        // One-shot? Retrieve the receipt and grant template ownership.
        const rec = await marketplaceApi.getReceiptBySession(sessionId);
        if (rec.data) {
          grant(rec.data.templateId);
          await alert({
            title: 'Purchase complete',
            body: 'The template is now yours — open it from the marketplace and click "Use this template".',
          });
          return;
        }

        // Neither yet → the webhook is still in flight. Wait and retry.
        await delay(POLL_DELAY_MS);
      }
      await alert({
        title: 'Almost there',
        body: 'Your payment is processing. Refresh in a moment to activate it.',
      });
    })();
    // Run exactly once on mount (ranRef guards StrictMode double-invoke).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
