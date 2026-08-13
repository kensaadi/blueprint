/**
 * The Blueprint pricing page — where upgrade CTAs point. Env-overridable
 * (`VITE_PRICING_URL`) so production targets the real domain; defaults to
 * the local Blueprint site for dev.
 */
export const PRICING_URL: string =
  (import.meta.env.VITE_PRICING_URL as string | undefined) ??
  'http://localhost:5173/blueprint/pricing';
