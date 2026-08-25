import { attempt } from '../_shared/attempt';
import type { Result } from '../_shared/result.types';
import { aiProvider } from './provider';
import type { ExtractInput, ExtractResponse, QuotaStatus } from './types';

/**
 * AI copilot api surface — every function returns the `Result<T>`
 * envelope (never throws). One grounded turn per `extractContract`; the
 * validate + repair loop that turns these calls into a guaranteed-valid
 * contract lives one layer up in `ai/generateContract.ts`.
 */

export async function extractContract(
  input: ExtractInput,
): Promise<Result<ExtractResponse>> {
  const provider = await aiProvider();
  return attempt(provider.extract(input));
}

export async function getAIQuota(): Promise<Result<QuotaStatus>> {
  const provider = await aiProvider();
  return attempt(provider.getQuota());
}
