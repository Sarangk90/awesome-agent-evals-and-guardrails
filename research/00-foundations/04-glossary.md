# Glossary

> **TL;DR**
>
> - **One clear definition per term.** Use this page to look up any metric, guardrail, or security concept in this repository.
> - **Consistent vocabulary.** When two terms mean almost the same thing (such as *faithfulness* and *groundedness*), we note both and link to the deeper guide.

- **You will learn:** Plain-English definitions for ~90 terms across datasets, evals, retrieval, LLM judges, agents, SQL, and guardrails
- **Prerequisites:** None
- **Related guides:**
    - [The Evals & Guardrails Map](./02-the-evals-and-guardrails-map.md)
    - [Failure Modes](./03-agentic-rag-failure-modes.md)
    - [Metric Cheatsheet](../05-decision-framework/03-metric-cheatsheet.md)

---

**Jump to:** [A](#a) · [B](#b) · [C](#c) · [D](#d) · [E](#e) · [F](#f) · [G](#g) · [H](#h) · [I](#i) · [J](#j) · [K](#k) · [L](#l) · [M](#m) · [N](#n) · [O](#o) · [P](#p) · [R](#r) · [S](#s) · [T](#t) · [U](#u) · [V](#v)

---

## A

**A/B test:** An online experiment that splits live users between two system versions and compares business or quality metrics. → [Online Evals](../03-online-evals-and-observability/01-online-evals.md)

**ABAC (Attribute-Based Access Control):** A permission model that checks user attributes (department, region), document attributes (classification), and request context, rather than only job roles. → [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md)

**Abstention:** When the assistant declines to answer (*"I could not find this in documents you can access"*) because evidence is missing. Correct abstention is a sign of high quality, not a failure. → [Retrieval & Context Guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md)

**Answer correctness:** A reference-based metric that scores how well the generated answer matches the facts in a human-written reference answer. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**Answer relevancy:** A reference-free metric that checks whether the answer directly addresses the user's question. It does not check whether the answer is factually true. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**Axial coding:** Step 2 of error analysis: grouping your raw notes from failed traces into 5–10 named failure categories that you can count and rank. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#51-analyze-error-analysis-first)

## B

**Baseline:** The starting score of your current system on a fixed dataset. Every prompt or code change is compared against this number. → [Running Offline Experiments](../02-offline-evals/08-running-offline-experiments.md)

**BERTScore:** A reference-based similarity metric that compares tokens between the generated answer and the reference answer using contextual embeddings. → [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md)

**Blocking guardrail:** A runtime guardrail that changes what happens to a live request (allows, denies, masks PII, or asks a human to confirm). → [Guardrails Architecture](../04-guardrails/01-guardrails-architecture.md)

**BLEU / ROUGE:** Classic word-overlap metrics from translation (BLEU) and summarization (ROUGE). They are fast and cheap, but correlate poorly with accuracy on open-ended LLM answers. → [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md)

**BM25:** A keyword-based search ranking formula. Teams combine BM25 with vector search (**hybrid search**) so exact product codes and acronyms are not missed. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

## C

**Canary deployment:** Rolling out a new change to a small percentage of live users first and checking online evals before releasing to everyone. → [Online Evals](../03-online-evals-and-observability/01-online-evals.md)

**Canary token:** A unique secret string placed inside a system prompt or restricted document. If that string appears in an output, a deterministic check blocks the leak immediately. → [Output Guardrails](../04-guardrails/04-output-guardrails.md)

**Chunking:** Splitting long documents into smaller passages before indexing them for search. → [Failure Modes](./03-agentic-rag-failure-modes.md#33-retrieval-and-chunking)

**Citation adherence:** Checks that verify whether every factual claim cites a source, and whether the cited source actually supports the claim. → [Instruction & Citation Adherence](../02-offline-evals/06-instruction-and-citation-adherence.md)

**Cohen's kappa (κ):** A statistical score from -1 to 1 that measures how often two raters (two humans, or a judge and a human) agree beyond random chance. → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

**Component eval:** An eval that tests one isolated pipeline step (such as the router, retriever, or SQL generator) while holding its inputs fixed. → [The Map](./02-the-evals-and-guardrails-map.md#2-axis-b-scope-end-to-end-vs-component)

**Context precision:** A metric that measures whether the relevant chunks appear near the very top of your retrieved results. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**Context recall:** A reference-based metric that measures what fraction of the facts needed to answer the question were actually retrieved. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**Context relevance:** A reference-free metric that checks whether the retrieved chunks are relevant to the user's question. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md)

## D

**Data flywheel:** The continuous loop where failed production traces, user thumbs-downs, and guardrail blocks are labeled and added to your offline datasets. → [Production Data Flywheel](../01-datasets/04-production-data-flywheel.md)

**Deterministic check:** A check written in plain code (regex, JSON schema, SQL parser, ID check) without calling an ML model. Always prefer deterministic checks when possible. → [The Map](./02-the-evals-and-guardrails-map.md#3-axis-c-method-how-the-check-is-computed)

**Drift:** When live user questions, company documents, or model behaviors shift over time and cause quality to drop. → [Monitoring, Alerting & Drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md)

## E

**End-to-end (E2E) eval:** An eval that scores the final answer or action produced for a user question across the whole pipeline. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**Error analysis:** Reading ~100 real traces, writing down the first upstream error in each trace (open coding), grouping those errors into categories (axial coding), and counting them. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#5-the-eval-driven-development-loop)

**Eval (evaluation):** Running a check across a dataset or traffic sample to **measure** system quality or safety. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md)

**Eval-driven development:** The engineering loop of **Analyze → Measure → Improve**, where changes are shipped only when data shows they improve quality without breaking regressions. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#5-the-eval-driven-development-loop)

**Excessive agency:** When an agent can cause harm because it has too many tools, overly broad permissions, or no human confirmation step (OWASP LLM06). → [Tool & Action Guardrails](../04-guardrails/05-tool-and-action-guardrails.md)

**Execution accuracy (EX):** The primary Text-to-SQL metric: it checks whether running the generated SQL returns the exact same table rows as running the reference SQL. → [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md)

**Exact match (EM):** A binary check that passes only when the output string matches the reference string character-for-character (after basic cleanup). → [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md)

## F

**F1@k:** The harmonic mean of `Precision@k` and `Recall@k` for top-k search results. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Faithfulness:** A reference-free metric that measures what fraction of claims in the answer are directly supported by the retrieved context. Also called **groundedness**. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**False positive / False negative (guardrail):** A **false positive** wrongly blocks a safe user request; a **false negative** lets an unsafe request slip through. → [Guardrails Architecture](../04-guardrails/01-guardrails-architecture.md)

## G

**Golden dataset:** A versioned test dataset whose reference answers, document IDs, or SQL queries have been written or verified by a Subject-Matter Expert (SME). → [SME Golden Datasets](../01-datasets/02-sme-golden-datasets.md)

**Ground truth (Reference data):** The known-correct answer, document ID list, or SQL result stored in a dataset row. → [Dataset Strategy](../01-datasets/01-dataset-strategy.md)

**Groundedness:** Whether every claim in an output is backed by the retrieved context or tool outputs. Used interchangeably with **faithfulness**. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md), [Output Guardrails](../04-guardrails/04-output-guardrails.md)

**Guardrail:** A check that runs inline during a live request to **enforce** a safety, security, or quality rule (by allowing, denying, modifying, escalating, or flagging). → [Guardrails](../04-guardrails/README.md)

## H

**Hallucination:** Any statement in the model's output that is not supported by the retrieved context or contradicts reality. → [Failure Modes](./03-agentic-rag-failure-modes.md#34-generation)

**Hit Rate@k:** The percentage of user queries where at least one relevant document appears in the top `k` retrieved results. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Human-in-the-loop (HITL):** Pausing an agent so a human can approve or reject a high-stakes action before it runs, or having humans review sampled production traces. → [Tool & Action Guardrails](../04-guardrails/05-tool-and-action-guardrails.md)

**Hybrid search:** Running both keyword search (BM25) and vector search (embeddings) and merging their ranked results. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

## I

**Indirect prompt injection:** When an attacker hides malicious instructions inside a document, email, or database row that the agent retrieves and reads into its prompt. → [Retrieval & Context Guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md), [Threat Model](../04-guardrails/07-threat-model-owasp.md)

**Instruction adherence:** Whether the model obeys explicit rules in the prompt (such as length caps, JSON format, language, or forbidden topics). → [Instruction & Citation Adherence](../02-offline-evals/06-instruction-and-citation-adherence.md)

**Inter-annotator agreement (IAA):** A measure of how often two human reviewers give the same Pass/Fail label to the same examples. Low agreement means your grading rubric is unclear. → [SME Golden Datasets](../01-datasets/02-sme-golden-datasets.md)

## J

**Jailbreak:** A user prompt crafted to trick the model into bypassing its safety rules (for example, using role-play or encoded text). → [Input Guardrails](../04-guardrails/02-input-guardrails.md)

## K

**k (top-k):** The number of retrieved chunks scored by a retrieval metric or passed into the generator prompt. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

## L

**Latency budget:** The maximum time (in milliseconds) a request or guardrail step is allowed to take before hurting user experience. → [Guardrails Architecture](../04-guardrails/01-guardrails-architecture.md)

**Least privilege:** Giving an agent or tool only the minimum database, document, and API permissions required to do its job. → [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md)

**LLM-as-a-judge:** Using an LLM with a focused rubric prompt to grade outputs as Pass or Fail. Must be calibrated against human labels before you trust its scores. → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

## M

**MAP (Mean Average Precision):** A retrieval metric that rewards systems for placing *all* relevant documents near the top of the list across many queries. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**MRR (Mean Reciprocal Rank):** A retrieval metric equal to the average of `1 / rank` of the *first* relevant chunk found. Best when the user only needs one good hit. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Multi-turn eval:** Scoring a full back-and-forth conversation rather than a single isolated question and answer. → [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

## N

**nDCG (Normalized Discounted Cumulative Gain):** A retrieval ranking metric that supports graded relevance (such as 0 = irrelevant, 1 = partial, 2 = exact) and penalizes relevant docs that appear low in the list. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**NLI (Natural Language Inference):** A fast classification model that checks whether a premise (retrieved chunk) entails, contradicts, or is neutral to a hypothesis (answer sentence). → [Output Guardrails](../04-guardrails/04-output-guardrails.md)

**Non-blocking guardrail:** A guardrail that logs a score or alert without changing or stopping the user's response. → [Guardrails Architecture](../04-guardrails/01-guardrails-architecture.md)

## O

**Offline eval:** Running checks against a fixed dataset before deployment (during local development or in CI). → [Offline Evals](../02-offline-evals/README.md)

**Online eval:** Running reference-free checks asynchronously on live production traffic. → [Online Evals](../03-online-evals-and-observability/01-online-evals.md)

**Open coding:** Step 1 of error analysis: reading failed traces and writing a short plain-English note on the first thing that went wrong, before creating formal categories. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#51-analyze-error-analysis-first)

**OWASP Top 10 for LLM Applications:** The industry-standard list of the ten biggest security risks in LLM systems, including Prompt Injection (`LLM01`) and Excessive Agency (`LLM06`). → [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md)

## P

**Pairwise evaluation:** Showing a judge two answers (`A` and `B`) to the same question and asking which one is better. → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

**PII (Personally Identifiable Information):** Personal data such as names, emails, phone numbers, or government IDs that must be masked by guardrails and scrubbed from eval datasets. → [Input Guardrails](../04-guardrails/02-input-guardrails.md), [Output Guardrails](../04-guardrails/04-output-guardrails.md)

**Pointwise evaluation:** Grading a single output on its own against a rubric (such as binary Pass/Fail), rather than comparing two outputs side by side. → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

**Position bias:** The tendency of an LLM judge in pairwise comparisons to pick whichever answer is listed first (or second). Mitigate it by running the comparison twice with the order swapped. → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

**Precision@k:** The fraction of the top `k` retrieved chunks that are actually relevant to the question. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Prompt injection (direct):** When a user types instructions that try to override your system prompt (such as *"Ignore all previous rules and..."*). → [Input Guardrails](../04-guardrails/02-input-guardrails.md), [Threat Model](../04-guardrails/07-threat-model-owasp.md)

## R

**RAG (Retrieval-Augmented Generation):** Fetching relevant chunks from a knowledge base and passing them into the LLM prompt so the model can answer from your data. **Agentic RAG** adds routing, planning, SQL, and tool calls. → [The Map](./02-the-evals-and-guardrails-map.md)

**RBAC (Role-Based Access Control):** Restricting which documents, database tables, and tools a user can access based on their role (such as Employee vs. HR). Must be enforced in code, never by prompt instructions alone. → [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md)

**Recall@k:** The fraction of all relevant documents in the corpus that appear inside the top `k` retrieved results. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Red teaming:** Deliberately attacking your system with jailbreaks, injections, and permission probes to uncover security holes and build an adversarial test dataset. → [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md)

**Reference-based eval:** A check that compares the system's output against human-verified reference data. Runs offline. → [The Map](./02-the-evals-and-guardrails-map.md#4-axis-d-ground-truth-reference-based-vs-reference-free)

**Reference-free eval:** A check that grades the output using only the question, retrieved context, and trace. Can run offline, online, or as a runtime guardrail. → [The Map](./02-the-evals-and-guardrails-map.md#4-axis-d-ground-truth-reference-based-vs-reference-free)

**Regression suite:** A dataset of past bugs and critical test cases run on every pull request in CI so fixed bugs never come back. → [Running Offline Experiments](../02-offline-evals/08-running-offline-experiments.md)

**Reranker:** A second-stage model (usually a cross-encoder) that takes the top 20–50 search hits and re-sorts them so the most relevant chunks sit in the top 5. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Row-level security (RLS):** A database feature that automatically filters table rows based on the current user's identity or role. → [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md)

**Rubric:** The written Pass/Fail rules and examples given to a human reviewer or LLM judge. → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

## S

**Sampling (online eval):** Running heavier checks (such as LLM judges) on a percentage of live traffic (e.g., 5% of all traces plus 100% of thumbs-down traces) to control cost. → [Online Evals](../03-online-evals-and-observability/01-online-evals.md)

**Semantic similarity:** Comparing the meaning of a generated answer and a reference answer using embedding cosine similarity or BERTScore. → [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md)

**Shadow mode:** Running a new model or guardrail on live requests and logging its decisions without changing what the user sees. → [Online Evals](../03-online-evals-and-observability/01-online-evals.md), [Guardrails Architecture](../04-guardrails/01-guardrails-architecture.md)

**SME (Subject-Matter Expert):** A domain specialist (in HR, Finance, Legal, or Support) who defines what a correct answer looks like and reviews golden dataset rows. → [SME Golden Datasets](../01-datasets/02-sme-golden-datasets.md)

**Span:** One timed step inside a trace (such as a single vector search, LLM call, or SQL query), along with its inputs and outputs. → [Observability & Tracing](../03-online-evals-and-observability/02-observability-and-tracing.md)

**SQL component match:** A Text-to-SQL check that compares the parsed clauses (`SELECT`, `JOIN`, `WHERE`, `GROUP BY`) of the generated query against the reference query. → [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md)

**Synthetic dataset:** Test questions and reference answers generated by an LLM from your documents or database schemas to quickly expand test coverage. → [Synthetic Datasets](../01-datasets/03-synthetic-datasets.md)

**Sync vs. async guardrail:** A **synchronous** guardrail makes the request wait so it can block harm before it happens; an **asynchronous** guardrail runs in the background with zero latency penalty. → [The Map](./02-the-evals-and-guardrails-map.md#5-axis-e-guardrail-mode-blocking-vs-non-blocking-sync-vs-async)

## T

**Task success rate:** The percentage of end-to-end user tasks that the agent completes accurately and safely. → [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

**Text-to-SQL:** Translating a user's natural-language question into a SQL query and running it against a database. → [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md)

**Theoretical saturation:** The point during error analysis when reading more traces stops uncovering new failure categories (usually after 50–100 traces). → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#51-analyze-error-analysis-first)

**Tool-call correctness:** Whether the agent picked the right tool and passed valid, accurate arguments. → [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

**Toxicity:** Rude, hateful, profane, or harmful language in inputs or outputs, caught by classifiers and output guardrails. → [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md)

**Trace:** The complete recorded log of one user request, containing every span (router, retrieval, SQL, tool calls, LLM prompts, and guardrail decisions). → [Observability & Tracing](../03-online-evals-and-observability/02-observability-and-tracing.md)

**Trajectory:** The step-by-step sequence of thoughts, tool calls, and observations an agent takes to finish a task. → [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

**Trajectory eval:** A check that grades the path the agent took (such as whether it called tools in the right order without looping), not just its final answer. → [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

**TPR / TNR (True Positive Rate / True Negative Rate):** How accurately an LLM judge identifies true Passes (**TPR**) and true Fails (**TNR**) when compared against human labels. → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

## U

**Unanswerable question:** A test question whose answer is not in your documents (or not allowed for the user's role). Used to test whether the system abstains instead of hallucinating. → [Synthetic Datasets](../01-datasets/03-synthetic-datasets.md)

**User feedback (explicit & implicit):** **Explicit feedback** includes thumbs-up/down clicks and written comments; **implicit feedback** includes user retries, copy events, and escalations to human support. → [User Feedback & Implicit Signals](../03-online-evals-and-observability/03-user-feedback-and-implicit-signals.md)

## V

**Verbosity bias:** The tendency of LLM judges to give higher scores to longer, wordier answers even when they contain no extra facts. → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

**Vibe check:** Trying a handful of prompts by hand and eyeballing whether the answers "look good." Fine on day one, dangerous once you have real users. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#4-vibes-based-vs-systematic-evaluation)

---

## Key takeaways

- **Know the core pairs:** offline vs. online, end-to-end vs. component, reference-based vs. reference-free, blocking vs. non-blocking, and synchronous vs. asynchronous.
- **Faithfulness (groundedness) is not answer correctness.** Faithfulness means the answer matches the retrieved chunk; answer correctness means the answer matches the truth.
- **Retrieval metrics always end in `@k`.** Make sure you know whether a metric uses binary relevance (`Recall@k`, `MRR`) or graded relevance (`nDCG@k`).
- **Calibrate your judges.** Terms like **rubric**, **TPR/TNR**, **Cohen's κ**, and **position bias** matter whenever an LLM grades another LLM.

## Further reading

- [The Evals & Guardrails Map](./02-the-evals-and-guardrails-map.md): see how every term fits together
- [Metric Cheatsheet](../05-decision-framework/03-metric-cheatsheet.md): formulas and score ranges on one page
- [References](../07-references/README.md): papers, benchmarks, and standards
- OWASP, [Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/)
- RAGAS, [Documentation](https://docs.ragas.io/)
