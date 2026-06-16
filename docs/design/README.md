# `docs/design/`

Living design documents for in-repo design initiatives. Unlike the numbered ADRs in
`docs/` (which record *settled* architectural decisions, one decision per file), the
documents here are **long-lived and continuously maintained**: each one carries its own
embedded decision log and an iteration history of what worked and what didn't, so the
design's *evolution* is captured alongside its current state.

## Documents

- [world-gen-generative-level-design.md](world-gen-generative-level-design.md) — the
  multi-agent generative level generator. A coordinator/optimizer fleet that turns a
  short player prompt into a fully playable, solver-validated narrative level — a
  self-contained story within a level's context boundary, like the examples in
  `public/levels/` — then iteratively improves it under human steering. Built on the two
  tools merged into the
  `world-gen` branch: the **solver** (structural oracle) and the **`/world-test` skill**
  (semantic oracle).
- [world-gen-agentic-hld.md](world-gen-agentic-hld.md) — **HLD: the current-state agentic call
  graph** for `/world-gen` (user → coordinator → sub-agents → validators), as Mermaid sequence +
  delegation diagrams plus a call table. Living companion to the design doc; update it whenever an
  inter- or intra-agent call changes (new/removed/merged sub-agent, changed payload, LIVE↔PLANNED).

## Maintenance convention

These documents are **expected to drift** as the implementation teaches us things. When
you make a decision, change a cap, hit a generative success or failure, or revise the
plan:

1. Update the relevant section so the document still describes the *current* design.
2. Add a dated entry to that document's **Decision Log** (for design choices) or
   **Iteration History** (for empirical "this worked / this didn't" learnings).
3. Bump its **Changelog** at the bottom.

The goal is that someone — including a future maintainer, or someone porting the approach
to a different project — can read the document top-to-bottom for the current design, and
read its Decision Log / Iteration History to understand *why* it is the way it is and what
was tried and rejected along the way.
