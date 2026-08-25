import { z } from 'zod';

/**
 * Wire schemas for Foundry's AI copilot endpoints (the `ai-assist`
 * entitlement). Foundry runs one grounded model turn and returns the
 * contract as a JSON STRING — the Builder validates & repairs it with
 * blueprint-core (the single source of truth), so the boundary here is
 * deliberately thin: a string + the caller's quota.
 */

/** Monthly quota snapshot returned alongside every extract. */
export const QuotaSchema = z.object({
  used: z.number(),
  limit: z.number(),
  period: z.string(),
});
export type Quota = z.infer<typeof QuotaSchema>;

/** `POST /ai/extract` → the model's contract JSON (as a string) + quota. */
export const ExtractResponseSchema = z.object({
  contract: z.string(),
  quota: QuotaSchema,
});
export type ExtractResponse = z.infer<typeof ExtractResponseSchema>;

/** `GET /ai/quota` → remaining allowance for the current month. */
export const QuotaStatusSchema = z.object({
  used: z.number(),
  limit: z.number(),
  remaining: z.number(),
  period: z.string(),
});
export type QuotaStatus = z.infer<typeof QuotaStatusSchema>;

/**
 * One copilot turn. `description` is the plain-English ask (generate) or
 * the edit instruction; `prior`/`errors` are set by the orchestrator on a
 * repair turn (the prior contract JSON + the validator's messages).
 */
export type ExtractInput = {
  description?: string;
  prior?: string;
  errors?: string[];
};
