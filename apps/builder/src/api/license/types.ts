import { z } from 'zod';

/**
 * Wire schemas for the Foundry license endpoints.
 *
 * The `token` is the Ed25519-signed license JWT — the Builder verifies
 * it offline (see `licensing/verifyToken.ts`); the sibling fields are a
 * convenience preview. Status is the non-sensitive shape from
 * `GET /licenses/:id`.
 */

/** `GET /licenses?session_id=…` — post-checkout token retrieval. */
export const LicenseTokenSchema = z.object({
  token: z.string(),
  licenseId: z.string(),
  tier: z.string(),
  seats: z.number(),
  activeUntil: z.string(),
});
export type LicenseToken = z.infer<typeof LicenseTokenSchema>;

/** `GET /licenses/:id` — minimal status. */
export const LicenseStatusSchema = z.object({
  licenseId: z.string(),
  tier: z.string(),
  seats: z.number(),
  activeUntil: z.string(),
  revoked: z.boolean(),
  active: z.boolean(),
});
export type LicenseStatus = z.infer<typeof LicenseStatusSchema>;
