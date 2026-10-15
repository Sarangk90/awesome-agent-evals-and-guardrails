# 05 — Decision Framework

> **TL;DR** — This is the "what do I actually do?" section. It turns the catalogue of evals and guardrails from the rest of the repo into decision trees, a one-page metric cheatsheet, a phased implementation playbook with checklists, and a maturity model you can score yourself against.

Everything here assumes the running example used across the repo: an **internal enterprise assistant** that answers questions over company docs (vector search), queries a data warehouse via **text-to-SQL**, can **call tools** (e.g. create a ticket), and serves users in **different roles** (RBAC). The frameworks generalize to simple RAG chatbots, agentic RAG, text-to-SQL agents, multi-agent workflows, and multi-turn assistants.

## Start here if you are…

| You are… | Go to | Then |
|---|---|---|
| **Building your first RAG prototype** | [Playbook — Phases 0–1](./04-implementation-playbook.md#phase-0--define-success-and-risks) (define success, tracing, 30–100 examples, error analysis) | [Eval selection §8.0 universal core](./01-eval-selection-decision-tree.md#80-the-universal-core-every-archetype-every-stage) |
| **Choosing metrics for an agent / text-to-SQL / multi-agent system** | [Eval selection decision tree](./01-eval-selection-decision-tree.md) — find your archetype in §8 | [Metric cheatsheet quick picks](./03-metric-cheatsheet.md#3-quick-picks-by-question) |
| **Asking "which metric tells me X?"** | [Metric cheatsheet](./03-metric-cheatsheet.md) | Follow the link in the table to the detailed metric card |
| **About to launch** | [Launch readiness checklist](./04-implementation-playbook.md#42-launch-readiness-checklist) | [Guardrail selection](./02-guardrail-selection-decision-tree.md) to confirm your tier's required controls |
| **Facing a security / risk review** | [Guardrail selection: risk questionnaire + lethal trifecta](./02-guardrail-selection-decision-tree.md#2-risk-assessment-questionnaire) | [Threat model & OWASP](../04-guardrails/07-threat-model-owasp.md), [Access control & RBAC](../04-guardrails/06-access-control-rbac.md) |
| **Adding a write/action tool to an existing assistant** | [Lethal-trifecta check](./02-guardrail-selection-decision-tree.md#3-the-lethal-trifecta-check) and [A2 guardrail stack](./02-guardrail-selection-decision-tree.md#112-a2--agentic-rag-with-tools) | [A2 eval stack](./01-eval-selection-decision-tree.md#82-a2--agentic-rag-with-tools) |
| **Already in production and quality dropped** | [Playbook — Phase 5](./04-implementation-playbook.md#phase-5--production-online-evals-monitoring-feedback) (online evals, weekly review) | [Monitoring & drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md), [Production quick picks](./03-metric-cheatsheet.md#37-production) |
| **Upgrading the model or embedding provider** | [CI gates](./04-implementation-playbook.md#41-ci-gates) — treat it as a code change | [Running offline experiments](../02-offline-evals/08-running-offline-experiments.md) |
| **Unsure whether your LLM judge can be trusted** | [Deterministic vs judge vs human](./01-eval-selection-decision-tree.md#4-decision-deterministic-vs-llm-judge-vs-human) | [LLM-as-a-judge](../02-offline-evals/07-llm-as-a-judge.md) |
| **Short on budget or SME time** | [Budget section](./01-eval-selection-decision-tree.md#9-budget-making-the-plan-affordable) and [which dataset at which stage](./01-eval-selection-decision-tree.md#7-decision-which-dataset-at-which-stage) | [Synthetic datasets](../01-datasets/03-synthetic-datasets.md) |
| **A lead planning a roadmap / reporting status** | [Maturity model](./05-maturity-model.md) — run the scorecard | [Playbook RACI & 30/60/90 plan](./04-implementation-playbook.md#1-roles-and-raci) |

## Files in this section

| File | What it covers | Read when… |
|---|---|---|
| [01-eval-selection-decision-tree.md](./01-eval-selection-decision-tree.md) | Five input questions (architecture, risk, ground truth, stage, budget); master decision tree; deterministic vs judge vs human; E2E vs component; reference-based vs reference-free; dataset per stage; must-have / nice-to-have eval stack and build order for five archetypes | You need to decide *which evals* to build |
| [02-guardrail-selection-decision-tree.md](./02-guardrail-selection-decision-tree.md) | Risk questionnaire, lethal-trifecta / Rule-of-Two check, tier → required guardrails, blocking vs non-blocking, sync vs async, fail-open vs fail-closed, latency budgets, build vs buy, per-archetype guardrail stacks | You need to decide *which guardrails* to build and how they behave |
| [03-metric-cheatsheet.md](./03-metric-cheatsheet.md) | One reference table of every metric/eval/guardrail check in the repo with ground-truth needs, method, where it runs, cost; quick picks by question | You need to look something up fast |
| [04-implementation-playbook.md](./04-implementation-playbook.md) | Phases 0–6 from defining success to the production flywheel; checklists; RACI; time heuristics; CI gates; launch readiness checklist; anti-patterns | You are planning or executing the work |
| [05-maturity-model.md](./05-maturity-model.md) | Levels 0–4, capability matrix, self-assessment scorecard, how to level up | You want to know where you stand and what to do next |

## Suggested reading order

1. **[Implementation playbook](./04-implementation-playbook.md)** — skim the phase table and anti-patterns to get the overall shape.
2. **[Eval selection decision tree](./01-eval-selection-decision-tree.md)** — pick your archetype and minimum viable eval suite.
3. **[Guardrail selection decision tree](./02-guardrail-selection-decision-tree.md)** — run the risk questionnaire and lethal-trifecta check.
4. **[Metric cheatsheet](./03-metric-cheatsheet.md)** — keep open as a reference while building.
5. **[Maturity model](./05-maturity-model.md)** — score yourself now, and again every quarter.

```mermaid
flowchart LR
    A["Playbook: the phases"] --> B["Eval selection: what to measure"]
    A --> C["Guardrail selection: what to enforce"]
    B --> D["Metric cheatsheet: lookup"]
    C --> D
    D --> E["Maturity model: where you stand, what next"]
```

## How this section relates to the rest of the repo

| Need | Section |
|---|---|
| Concepts and vocabulary | [00-foundations](../00-foundations/README.md) |
| Building the datasets your evals run on | [01-datasets](../01-datasets/README.md) |
| Detailed metric cards (formulas, examples, pitfalls) | [02-offline-evals](../02-offline-evals/README.md) |
| Production evals, tracing, feedback, monitoring | [03-online-evals-and-observability](../03-online-evals-and-observability/README.md) |
| How each guardrail works | [04-guardrails](../04-guardrails/README.md) |
| Which tools implement what | [06-tooling-landscape](../06-tooling-landscape/README.md) |
| Papers, posts, standards | [07-references](../07-references/README.md) |
