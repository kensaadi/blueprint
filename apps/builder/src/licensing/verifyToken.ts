/**
 * Offline license-token verification (design §7.2).
 *
 * Foundry signs license tokens with Ed25519 (EdDSA JWT). The Builder
 * PINS Foundry's public key and verifies **fully offline** — it never
 * calls back to check a license. A valid signature + `typ:"license"` is
 * the whole trust chain (there is no auth between Foundry and Builder).
 *
 * The pinned key defaults to the local-dev key (`LICENSE_KEY_ID=dev`);
 * a production build overrides it with `VITE_FOUNDRY_PUBLIC_KEY` (the
 * base64url `x` of Foundry's prod Ed25519 public key). Rotating the key
 * means shipping a new pin — old tokens carry a `kid` so a keyset can be
 * added later if needed.
 */
import { importJWK, jwtVerify } from 'jose';
import type { FeatureFlag, LicenseClaims, Tier } from './types';

/** base64url `x` of the pinned Ed25519 public key. */
const PUBLIC_KEY_X: string =
  (import.meta.env.VITE_FOUNDRY_PUBLIC_KEY as string | undefined) ??
  '8eXii8WD453M0tY6ozC3GWYANycIcC4fhdtMyCIRzjA'; // local-dev key (kid=dev)

const PUBLIC_JWK = { kty: 'OKP', crv: 'Ed25519', x: PUBLIC_KEY_X } as const;

// Import once; jose returns a CryptoKey (WebCrypto Ed25519) reused for
// every verification.
let keyPromise: Promise<CryptoKey | Uint8Array> | null = null;
function pinnedKey(): Promise<CryptoKey | Uint8Array> {
  keyPromise ??= importJWK(PUBLIC_JWK, 'EdDSA');
  return keyPromise;
}

/** The raw Foundry claims we read off a verified token. */
type FoundryLicensePayload = {
  typ?: unknown;
  tier?: unknown;
  features?: unknown;
  seats?: unknown;
  activeUntil?: unknown;
  licenseId?: unknown;
  sub?: unknown;
};

/**
 * Verify a token's signature against the pinned key and map its claims
 * to `LicenseClaims`. Returns null on ANY failure (bad signature, wrong
 * algorithm, tampered, not a license token) — the caller treats null as
 * "stay Community". Never throws.
 */
export async function verifyLicenseToken(
  token: string,
): Promise<LicenseClaims | null> {
  try {
    const key = await pinnedKey();
    // `algorithms` pins EdDSA — blocks an alg-confusion downgrade. The
    // license token deliberately carries no `exp`, so jose does no
    // expiry check here; the perpetual/activeUntil gate lives in the
    // license context.
    const { payload } = await jwtVerify<FoundryLicensePayload>(token, key, {
      algorithms: ['EdDSA'],
    });
    if (payload.typ !== 'license') return null;

    return {
      tier: payload.tier as Tier,
      features: Array.isArray(payload.features)
        ? (payload.features as FeatureFlag[])
        : undefined,
      seats: typeof payload.seats === 'number' ? payload.seats : 1,
      activeUntil: typeof payload.activeUntil === 'string' ? payload.activeUntil : '',
      licenseId: typeof payload.licenseId === 'string' ? payload.licenseId : '',
      subject: typeof payload.sub === 'string' ? payload.sub : '',
    };
  } catch {
    return null;
  }
}
