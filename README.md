# Awesome Agent Evals & Guardrails

> A practitioner's guide to building **reliable, safe agentic RAG applications** — how to evaluate them (offline and online) and how to guard them at runtime.

Building a demo agent is easy. Building one you can trust in production means answering hard questions:

- *Is it actually correct?* How do I measure answer correctness, faithfulness, and retrieval quality?
- *Where does it break?* Is it the retriever, the tool call, the generated SQL, or the final answer?
- *What data do I evaluate on?* SME-curated golden sets, synthetic data, or production traces?
- *How do I keep it safe?* Prompt injection, PII leakage, toxic output, unauthorized data access, runaway actions.
- *What should I do first?* And what can wait?

This repository synthesizes the answers into a navigable knowledge base with decision frameworks, metric cards, checklists and code snippets.

## 👉 [Start with the research index](./research/README.md)

| Section | What's inside |
|---|---|
| [00 Foundations](./research/00-foundations/README.md) | Why evals & guardrails, the master taxonomy, failure modes, glossary |
| [01 Datasets](./research/01-datasets/README.md) | SME golden sets, synthetic generation, production data flywheel |
| [02 Offline evals](./research/02-offline-evals/README.md) | End-to-end RAG, retrieval metrics, generation & safety, agents/tools, text-to-SQL, citations, LLM-as-a-judge, experiments & CI |
| [03 Online evals & observability](./research/03-online-evals-and-observability/README.md) | Online evals, tracing, user feedback, monitoring & drift |
| [04 Guardrails](./research/04-guardrails/README.md) | Architecture, input / retrieval / output / tool guardrails, RBAC, OWASP threat model |
| [05 Decision framework](./research/05-decision-framework/README.md) | Which evals and guardrails to pick, metric cheatsheet, implementation playbook, maturity model |
| [06 Tooling landscape](./research/06-tooling-landscape/README.md) | Eval, observability and guardrail tools compared |
| [07 References](./research/07-references/README.md) | Papers, blogs, standards, benchmarks |

## Contributing

Corrections and additions are welcome — especially new metrics, tools, and real-world lessons. Please keep the existing page structure (TL;DR → content → Key takeaways → Further reading) and cite sources.

The docs site is built from `research/` with [Zensical](https://zensical.org) and deployed to GitHub Pages on every push to `main`. Just add or edit markdown files; navigation is generated from the folder and file names (section titles come from each folder's `README.md` heading). To preview locally:

```bash
pip install -r requirements-docs.txt
python scripts/docs.py serve   # http://localhost:8000
```
