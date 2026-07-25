/**
 * Fuzzy substring scorer for the command palette.
 *
 * Given a query like "expjs" and a label like "Export as JSON (download)",
 * returns the positions of the matched characters plus a score. The
 * palette uses the score to rank results.
 *
 * Scoring rules (empirical, tuned for a few dozen commands):
 *   + 15  per match at a word boundary (start of label, or right
 *          after a space / dash / dot / slash).
 *   + 10  per contiguous match (this char right after the previous).
 *   −1..−5  gap penalty proportional to distance from previous match
 *          (capped at 5 so a long label doesn't obliterate a match).
 *   − length/10  slight bias towards shorter labels when otherwise tied.
 *
 * Returns `null` when not every query character can be consumed —
 * that command is filtered out of the results.
 */

export type FuzzyMatch = {
  /** Character positions in the label that matched, in order. */
  positions: number[];
  /** Higher is better. Only meaningful when compared to other matches. */
  score: number;
};

const WORD_BOUNDARY = /[ \-._/·]/;

export function fuzzyScore(query: string, label: string): FuzzyMatch | null {
  const q = query.trim().toLowerCase();
  if (!q) return { positions: [], score: 0 };
  const target = label.toLowerCase();

  const positions: number[] = [];
  let qi = 0;
  let score = 0;
  let lastMatch = -2;

  for (let i = 0; i < target.length && qi < q.length; i++) {
    if (target[i] !== q[qi]) continue;
    positions.push(i);
    // Word-boundary bonus — the query char lands at the start of a
    // word (very predictive of intent).
    if (i === 0 || WORD_BOUNDARY.test(target[i - 1])) {
      score += 15;
    }
    if (i === lastMatch + 1) {
      score += 10;
    } else if (lastMatch >= 0) {
      score -= Math.min(5, i - lastMatch - 1);
    }
    lastMatch = i;
    qi++;
  }

  if (qi < q.length) return null;

  score -= Math.floor(target.length / 10);
  return { positions, score };
}

/**
 * Render helper — splits a label into runs of matched / unmatched
 * characters using the position list from `fuzzyScore`. The palette
 * bolds the matched runs.
 */
export function highlightRuns(
  label: string,
  positions: number[],
): Array<{ text: string; matched: boolean }> {
  if (positions.length === 0) return [{ text: label, matched: false }];
  const runs: Array<{ text: string; matched: boolean }> = [];
  const set = new Set(positions);
  let cur = { text: '', matched: set.has(0) };
  for (let i = 0; i < label.length; i++) {
    const m = set.has(i);
    if (m !== cur.matched) {
      if (cur.text) runs.push(cur);
      cur = { text: '', matched: m };
    }
    cur.text += label[i];
  }
  if (cur.text) runs.push(cur);
  return runs;
}
