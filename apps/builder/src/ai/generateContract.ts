import { validate } from '@dashforge/blueprint-core';
import { normalizeContract } from '../state/importContract';
import { stripUid } from '../state/exportContract';
import { extractContract } from '../api/ai/service';
import type { Quota } from '../api/ai/types';
import type { Contract } from '../state/types';

/**
 * The AI orchestrator — the moat that makes a cheap, hosted model
 * reliable. Foundry grounds the model with the closed catalog and runs
 * ONE turn; here we validate its output with blueprint-core (the same
 * validator the canvas uses) and, when it fails, feed the errors back for
 * a bounded repair loop. Only a contract that passes validation is ever
 * handed to the canvas — so the worst case is "try again", never a broken
 * tree.
 *
 * Each turn is a separate metered Foundry call (validation is client-side,
 * so repair cannot happen server-side); `attempts` reports how many ran.
 */

/** Max repair turns after the first generate before giving up. */
const MAX_REPAIRS = 2;

export type GenerateOutcome =
  | { ok: true; contract: Contract; quota: Quota; attempts: number }
  | { ok: false; error: string; issues?: string[] };

export type GenerateOptions = {
  /** Present ⇒ an EDIT: apply `description` to this existing contract. */
  prior?: Contract;
};

/**
 * Turn a plain-English description into a validated contract, ready for
 * `replaceContract`. On an edit, pass the current contract in `opts.prior`.
 */
export async function generateContract(
  description: string,
  opts: GenerateOptions = {},
): Promise<GenerateOutcome> {
  // The prior contract travels to the model WITHOUT Builder-internal _uid.
  let priorJson: string | undefined = opts.prior
    ? JSON.stringify(stripUid(opts.prior))
    : undefined;
  let errors: string[] | undefined;
  let lastIssues: string[] = [];

  for (let attempt = 1; attempt <= MAX_REPAIRS + 1; attempt++) {
    const res = await extractContract({ description, prior: priorJson, errors });
    if (res.error) {
      return { ok: false, error: humanizeError(res.error) };
    }

    const raw = res.data.contract;
    const parsed = tryParse(raw);
    if (parsed === undefined) {
      // Non-JSON output — feed it back as a repair instruction.
      priorJson = raw;
      errors = ['The output was not valid JSON. Return ONE JSON object only.'];
      lastIssues = errors;
      continue;
    }

    const result = validate(parsed);
    if (result.ok) {
      return {
        ok: true,
        contract: normalizeContract(parsed),
        quota: res.data.quota,
        attempts: attempt,
      };
    }

    // Invalid — set up a repair turn from the validator's errors.
    priorJson = raw;
    lastIssues = result.errors.map((e) =>
      e.path ? `${e.path}: ${e.message}` : e.message,
    );
    errors = lastIssues;
  }

  return {
    ok: false,
    error: 'The AI could not produce a valid layout. Try rephrasing your request.',
    issues: lastIssues,
  };
}

function tryParse(raw: string): unknown | undefined {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Map an api error to a message for the panel. The quota case (BUSINESS_
 * ERROR / 429) and the no-license case (UNAUTHORIZED) get dedicated copy;
 * everything else shows the server's own message.
 */
function humanizeError(error: { code: string; message: string; status?: number }): string {
  if (error.status === 429 || error.code === 'BUSINESS_ERROR') {
    return "You've used your AI generations for this month. They reset next month, or upgrade your plan for more.";
  }
  if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
    return 'AI is a Pro feature — activate a license to use it.';
  }
  if (error.code === 'SERVER_ERROR' || error.status === 503) {
    return 'The AI service is unavailable right now. Please try again shortly.';
  }
  return error.message;
}
