import type { AIProvider } from './provider';
import type { ExtractInput, ExtractResponse, QuotaStatus } from './types';

/**
 * Offline AI provider. Returns a canned, schema-valid contract (a login
 * form) and an in-memory monthly counter, so the entire copilot flow —
 * the orchestrator's generate → validate → repair loop, the quota UI, the
 * upgrade gate — is exercisable with no license, no key, and no spend.
 * There is no real model offline, so the "generated" layout is fixed; set
 * `VITE_PROVIDER=live` against Foundry for real generation.
 */

// A minimal contract that passes blueprint-core validation. The
// orchestrator runs the real validator over this, so it doubles as a
// smoke test that the mock stays in sync with the schema.
const CANNED_CONTRACT = JSON.stringify({
  version: '1.0',
  root: {
    nodeId: 'login-form',
    type: 'form',
    props: {},
    children: [
      {
        nodeId: 'email',
        type: 'field',
        props: { name: 'email', label: 'Email', type: 'email', required: true },
      },
      {
        nodeId: 'password',
        type: 'field',
        props: {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: true,
        },
      },
      { nodeId: 'submit', type: 'submit', props: { label: 'Sign in' } },
    ],
  },
});

const LIMIT = 200;
let used = 0;

function period(): string {
  const now = new Date();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${now.getUTCFullYear()}-${m}`;
}

async function extract(_input: ExtractInput): Promise<ExtractResponse> {
  used += 1;
  return { contract: CANNED_CONTRACT, quota: { used, limit: LIMIT, period: period() } };
}

async function getQuota(): Promise<QuotaStatus> {
  return { used, limit: LIMIT, remaining: Math.max(0, LIMIT - used), period: period() };
}

const aiMockProvider: AIProvider = { extract, getQuota };
export default aiMockProvider;
