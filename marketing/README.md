# marketing/

Forwardable collateral for Blueprint. These are **out-of-band artifacts** —
they travel by email/Slack to a champion inside a prospect's org. They are
**not** hosted on any site (there is no public Blueprint site or demo server;
the proof is open source — you clone it and run it).

## Security & Architecture Brief

`Blueprint-Security-Architecture-Brief.pdf` — a 2-page brief an architect can
forward to their CISO. Distilled from the `for-regulated` positioning, anchored
on the **verifiable** no-eval proof: every claim is either architectural or
something the reader can run from source.

### Regenerate

```bash
pip install reportlab        # once (or use a venv)
python build_brief.py        # writes the PDF next to this script
```

### Keep it honest (do this alongside the compare-page re-verification)

- The **"Verify it yourself"** section points at the repo + local commands
  (`packages/blueprint-runtime/security/csp-no-eval.html`, the no-eval test,
  `SBOM.md`, `github.com/kensaadi/blueprint`) — self-service, no hosted URL to
  go stale.
- Update the **"As of August 2026"** footer date whenever you re-issue.
- When a **third-party pentest** exists, add a line citing it (that's the one
  piece of social proof the brief deliberately omits today).
- Contact is `info@dashforge-ui.com`.
