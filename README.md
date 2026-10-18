# Awesome Agent Evals & Guardrails

> A practitioner's guide to building **reliable, safe AI agents**: how to evaluate them (offline and online) and how to guard them at runtime. Agentic RAG is the worked example. The same methods apply to coding, browser, research, and workflow agents.

Building a demo agent is easy. Building one you can trust in production means answering hard questions:

- *Is it actually correct?* How do I measure answer correctness, faithfulness, and retrieval quality?
- *Where does it break?* Is it the retriever, the tool call, the generated SQL, or the final answer?
- *Did the task really get done?* Did the code pass hidden tests, or did the agent only claim success?
- *What data do I evaluate on?* SME-curated golden sets, synthetic data, or production traces?
- *How do I keep it safe?* Prompt injection, PII leakage, toxic output, unauthorized data access, runaway actions.
- *What should I do first?* And what can wait?

This repository synthesizes the answers into a navigable knowledge base with decision frameworks, metric cards, checklists and code snippets.

## 📖 [Read it as a website →](https://sarangk90.github.io/awesome-agent-evals-and-guardrails/)

Searchable docs with navigation, dark mode and zoomable diagrams.

## 👉 [Start with the research index](./research/README.md)

| Section | What's inside |
|---|---|
| [00 Foundations](./research/00-foundations/README.md) | Why evals & guardrails, the master taxonomy, failure modes, a ~200-term glossary, and how to apply the guide to other agent archetypes |
| [01 Datasets](./research/01-datasets/README.md) | Dataset strategy and sizing, SME golden sets and reviewer agreement, synthetic generation, production data flywheel |
| [02 Offline evals](./research/02-offline-evals/README.md) | End-to-end RAG, retrieval metrics, generation & safety, agents/tools, text-to-SQL, citations, LLM-as-a-judge, experiments & CI, agent eval environments & graders |
| [03 Online evals & observability](./research/03-online-evals-and-observability/README.md) | Online evals and A/B tests, OpenTelemetry tracing, user feedback, SLOs, monitoring & drift |
| [04 Guardrails](./research/04-guardrails/README.md) | Architecture, input / retrieval / output / tool guardrails, MCP safety, RBAC, threat model with OWASP LLM Top 10 (2026) and Agentic Top 10 (2026) |
| [05 Decision framework](./research/05-decision-framework/README.md) | Which evals and guardrails to pick, metric cheatsheet, implementation playbook, maturity model |
| [06 Tooling landscape](./research/06-tooling-landscape/README.md) | Eval, observability and guardrail tools compared |
| [07 References](./research/07-references/README.md) | Papers, blogs, standards, benchmarks |

## Contributing

Corrections and additions are welcome, especially new metrics, tools, and real-world lessons. Please follow the [Human-Friendly STE100 Style Guide](./STYLE-GUIDE.md), keep the existing page structure (TL;DR → content → Key takeaways → Further reading), and cite sources.

The docs site is built from `research/` with [Zensical](https://zensical.org) and deployed to GitHub Pages on every push to `main`. Just add or edit markdown files; navigation is generated from the folder and file names (section titles come from each folder's `README.md` heading). To preview locally:

```bash
pip install -r requirements-docs.txt
python scripts/docs.py serve   # http://localhost:8000
```

Every `python` code block runs in CI. Each block runs on its own, so readers can copy it. End examples with `assert`s that pin the edge cases. If a block needs an earlier block on the same page, put `<!-- snippet: continue -->` on the line above its fence. If it needs an API key, a model download, a database, or your own application code, use `<!-- snippet: skip: <reason> -->`. To check locally:

```bash
pip install -r requirements-snippets.txt
python scripts/check_snippets.py                 # or pass one page: research/02-offline-evals/07-llm-as-a-judge.md
```
