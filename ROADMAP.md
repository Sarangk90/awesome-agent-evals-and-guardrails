# Roadmap

> **TL;DR**
>
> - **This repo is a reference guide with verified snippets.** It is not a runnable course. Every `python` block runs in CI.
> - **Phases 1–3 are done.** Misleading snippets are fixed, snippets run in CI, and seven reference gaps are filled.
> - **Re-check fast-moving pages every quarter.** Decision model evals, long-horizon evals, and tool status claims change quickly.
> - **Open items are small and optional.** Pick from the list below; none blocks a reader.

Last updated: October 19, 2026.

---

## Direction

In October 2026 we reviewed an outside improvement plan. It proposed turning the guide into a runnable course with fixtures, a trace viewer, and labs. We chose a narrower goal: keep the guide a reference, and make every snippet trustworthy. A course would add a second codebase to maintain, and its fixtures would teach mechanics rather than real results.

---

## Done

| Phase | What changed |
|---|---|
| **1. Fix misleading snippets** | A missing score can no longer pass a gate. The ticket grader catches false success claims. Sampling keeps both selection records on overlap. Judge model selection no longer uses the `test` split. Hosted OpenAI Evals is marked as retiring. |
| **2. Verify snippets in CI** | `scripts/check_snippets.py` runs every `python` block. The `Checks` workflow runs it and the strict docs build on every pull request. Rules are in [STYLE-GUIDE.md §5](./STYLE-GUIDE.md#5-code-snippets). |
| **3. Fill reference gaps** | Human handoff evals, check upkeep and retirement, every-item (whole-document) tasks, language and locale review, an eval validity checklist, decision model evals (experimental), and long-horizon and research agent evals. |

---

## Re-check every quarter

These pages describe a field that changes monthly. Re-verify their sources, dates, and product facts.

- [ ] **Decision model evals** (`research/02-offline-evals/10-decision-model-evals.md`). Check new products, the Artificial Analysis Decision Index, and whether vendors now publish calibration metrics.
- [ ] **Long-horizon and research agent evals** (`research/02-offline-evals/11-long-horizon-and-research-agent-evals.md`). Many sources are 2025–2026 preprints. Check for peer-reviewed versions and new benchmarks.
- [ ] **Tool status table** (`research/06-tooling-landscape/01-eval-and-observability-tools.md`). Check ownership changes and retirements. OpenAI hosted Evals shuts down on November 30, 2026.

---

## Open items

| Item | Why | Size |
|---|---|---|
| **Verify the 9 skipped snippets** | They need API keys, model downloads, PostgreSQL, or application code. Small fakes could let some of them run in CI. | Small each |
| **Add an internal anchor check to CI** | The strict build does not catch every broken `#anchor` link. A short script could compare links with the built page IDs. | Small |
| **Optional Acme quickstart** | One runnable worked example (about 15 traces, a baseline and a candidate, and one report). Build only if readers ask for it. Measure its upkeep cost before you add more. | Medium |
| **Automated prompt-improvement recipe** | A bounded recipe: development-only optimization, manual review, and a frozen final test. | Small |
| **Delete the merged remote branch** | `fix/snippet-correctness` is merged into `main`. | Trivial |

**Not planned:** a trace-review UI, a multimodal document lab, and a shared-platform design guide. The guide already points to tools that do the first, and the other two need assets or scope that a reference guide does not have.
