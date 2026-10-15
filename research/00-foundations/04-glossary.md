# Glossary

> **TL;DR** — An alphabetical reference of the terms used across this repo — evals, retrieval metrics, LLM judging, agents, text-to-SQL, guardrails, security, and operations. Each entry has a short definition and a link to where the concept is covered in depth.

**You'll learn:** the shared vocabulary for evals and guardrails in agentic RAG · where each concept lives in this repo
 · **Prerequisites:** none
 · **Related:** [The evals & guardrails map](./02-the-evals-and-guardrails-map.md) · [Failure modes](./03-agentic-rag-failure-modes.md) · [Metric cheatsheet](../05-decision-framework/03-metric-cheatsheet.md)

---

**Jump to:** [A](#a) · [B](#b) · [C](#c) · [D](#d) · [E](#e) · [F](#f) · [G](#g) · [H](#h) · [I](#i) · [J](#j) · [K](#k) · [L](#l) · [M](#m) · [N](#n) · [O](#o) · [P](#p) · [R](#r) · [S](#s) · [T](#t) · [U](#u) · [V](#v)

---

## A

**A/B test** — Online experiment that splits real users between two variants and compares business or quality metrics. The only way to measure true user impact of a change. → [Online evals](../03-online-evals-and-observability/01-online-evals.md)

**ABAC (Attribute-Based Access Control)** — Authorization based on attributes of the user (department, region, clearance), resource (classification, owner), and context (time, device), rather than only roles. Useful when RBAC role explosion becomes unmanageable. → [Access control & RBAC](../04-guardrails/06-access-control-rbac.md)

**Abstention** — The system deliberately declines to answer ("I couldn't find this in documents you can access") when evidence is missing or confidence is low. Correct abstention is a quality goal, not a failure. → [Retrieval & context guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md)

**Answer correctness** — Reference-based end-to-end metric: how well the generated answer matches a gold reference answer, typically via claim-level comparison by an LLM judge, sometimes blended with semantic similarity. → [End-to-end RAG evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**Answer relevancy** — Reference-free metric of whether the answer addresses the question asked (not whether it's correct). Often computed by generating questions from the answer and comparing them to the original question by embedding similarity. → [End-to-end RAG evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**Axial coding** — Second stage of qualitative error analysis: grouping free-text open codes into a smaller set of named failure categories that can be counted. → [Why evals and guardrails](./01-why-evals-and-guardrails.md#51-analyze--error-analysis-first)

## B

**Baseline** — The measured score of the current system on a dataset, against which every change is compared. Without a baseline, scores have no meaning. → [Running offline experiments](../02-offline-evals/08-running-offline-experiments.md)

**BERTScore** — Reference-based text similarity metric that matches tokens between candidate and reference using contextual embeddings. Better semantic sensitivity than BLEU/ROUGE but still not a correctness measure. → [Generation quality & safety](../02-offline-evals/03-generation-quality-and-safety-evals.md)

**Blocking guardrail** — A guardrail whose decision changes the outcome of the request: allow, deny, modify (redact, rewrite, regenerate), or escalate. Must be fast and high-precision. → [Guardrails architecture](../04-guardrails/01-guardrails-architecture.md)

**BLEU / ROUGE** — N-gram overlap metrics from machine translation (BLEU, precision-oriented) and summarization (ROUGE, recall-oriented). Cheap but correlate poorly with correctness for free-form LLM answers. → [Generation quality & safety](../02-offline-evals/03-generation-quality-and-safety-evals.md)

**BM25** — Classic lexical (keyword) ranking function. Often combined with dense vector search ("hybrid search") to catch exact terms like product codes and acronyms. → [Retrieval metrics](../02-offline-evals/02-retrieval-metrics.md)

## C

**Canary (deployment)** — Releasing a new version to a small slice of traffic first and watching online metrics before full rollout. → [Online evals](../03-online-evals-and-observability/01-online-evals.md)

**Canary token** — A unique secret string placed in a system prompt or sensitive document; if it appears in an output, leakage is detected deterministically. → [Output guardrails](../04-guardrails/04-output-guardrails.md)

**Chunking** — Splitting documents into retrievable units. Chunk size, overlap, and structure-awareness strongly affect retrieval quality. → [Failure modes](./03-agentic-rag-failure-modes.md#33-retrieval-and-chunking)

**Citation adherence** — Whether the answer cites sources as instructed, and whether each citation actually supports the claim it's attached to (citation precision/recall/support). → [Instruction & citation adherence](../02-offline-evals/06-instruction-and-citation-adherence.md)

**Cohen's kappa (κ)** — Agreement statistic between two raters that corrects for chance agreement: κ = (p_o − p_e) / (1 − p_e). Used to measure human–human and judge–human agreement. → [LLM-as-a-judge](../02-offline-evals/07-llm-as-a-judge.md)

**Component eval** — An eval of a single pipeline step (retriever, reranker, router, tool caller, SQL generator, generator, citation step) with its inputs held fixed. Localizes failures. → [The map](./02-the-evals-and-guardrails-map.md#2-axis-b--scope-end-to-end-vs-component)

**Context precision** — Retrieval-quality metric: are the relevant chunks among those retrieved ranked near the top? Available in reference-based and LLM-judged (reference-free) variants. → [End-to-end RAG evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**Context recall** — Reference-based metric: what fraction of the information needed for the reference answer is present in the retrieved context. → [End-to-end RAG evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**Context relevance** — Reference-free score of how relevant the retrieved context is to the question (name varies by framework). → [End-to-end RAG evals](../02-offline-evals/01-end-to-end-rag-evals.md)

## D

**Data flywheel** — The loop in which production traces, user feedback, and guardrail hits are curated into datasets that improve evals and the system, which in turn produces better traces. → [Production data flywheel](../01-datasets/04-production-data-flywheel.md)

**Deterministic (code-based) check** — An eval or guardrail implemented in code with no model: regex, schema validation, SQL parsing, exact match, ACL lookups. Cheapest and most consistent; preferred whenever possible. → [The map](./02-the-evals-and-guardrails-map.md#3-axis-c--method-how-the-check-is-computed)

**Drift** — Change over time in input distribution, retrieved content, model behavior, or output quality. Detected by online monitoring. → [Monitoring, alerting & drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md)

## E

**End-to-end (E2E) eval** — Evaluates the system from user input to final answer/action, regardless of internal steps. Closest to user experience; harder to diagnose. → [End-to-end RAG evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**Error analysis** — Systematically reading traces, labeling what went wrong (open coding), clustering into failure modes (axial coding), and counting. The first step before building evals. → [Why evals and guardrails](./01-why-evals-and-guardrails.md#5-the-eval-driven-development-loop)

**Eval (evaluation)** — A repeatable procedure that measures some property of a system's behavior on a set of inputs and produces a score or verdict. → [Why evals and guardrails](./01-why-evals-and-guardrails.md)

**Eval-driven development** — Development practice of analyze → measure → improve, where changes are accepted based on eval results rather than intuition. → [Why evals and guardrails](./01-why-evals-and-guardrails.md#5-the-eval-driven-development-loop)

**Excessive agency** — Risk that an agent takes damaging actions because it has too much functionality, too many permissions, or too much autonomy (OWASP LLM06). → [Tool & action guardrails](../04-guardrails/05-tool-and-action-guardrails.md)

**Execution accuracy (EX)** — Text-to-SQL metric: does the generated SQL return the same result set as the gold SQL when executed on the database? → [Text-to-SQL evals](../02-offline-evals/05-text-to-sql-evals.md)

**Exact match (EM)** — Binary metric: output equals reference exactly (after normalization). Useful for labels, short answers, and structured outputs; too strict for free text. → [Generation quality & safety](../02-offline-evals/03-generation-quality-and-safety-evals.md)

## F

**F1@k** — Harmonic mean of precision@k and recall@k for retrieval. → [Retrieval metrics](../02-offline-evals/02-retrieval-metrics.md)

**Faithfulness** — Reference-free metric of whether every claim in the answer is supported by the retrieved context; the inverse of hallucination relative to context. Often used interchangeably with groundedness. → [End-to-end RAG evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**False positive / false negative (guardrail)** — A false positive blocks a legitimate request (hurts UX); a false negative lets a harmful one through (hurts safety). Every guardrail trades these off via its threshold. → [Guardrails architecture](../04-guardrails/01-guardrails-architecture.md)

## G

**Golden dataset** — A curated, versioned set of inputs with SME-verified expected outputs (answers, docs, SQL, tool calls) used as the authoritative offline test set. → [SME golden datasets](../01-datasets/02-sme-golden-datasets.md)

**Ground truth** — The known-correct output (or label) for an input, against which reference-based metrics compare. Expensive to create and can go stale. → [Dataset strategy](../01-datasets/01-dataset-strategy.md)

**Groundedness** — Whether output claims are supported by provided sources (retrieved docs, SQL results, tool outputs). Near-synonym of faithfulness. → [End-to-end RAG evals](../02-offline-evals/01-end-to-end-rag-evals.md), [Output guardrails](../04-guardrails/04-output-guardrails.md)

**Guardrail** — A runtime control that inspects inputs, intermediate steps, or outputs of an LLM application and enforces a policy (block, modify, escalate, or flag). → [Guardrails](../04-guardrails/README.md)

## H

**Hallucination** — Output content that is unsupported by the provided context or by reality. In RAG, usually measured as unfaithfulness to retrieved context. → [Failure modes](./03-agentic-rag-failure-modes.md#34-generation)

**Hit rate@k** — Fraction of queries for which at least one relevant document appears in the top-k results. → [Retrieval metrics](../02-offline-evals/02-retrieval-metrics.md)

**Human-in-the-loop (HITL)** — A human approves, corrects, or reviews an agent decision before or after it takes effect — e.g. confirming a write action, or labeling sampled traces. → [Tool & action guardrails](../04-guardrails/05-tool-and-action-guardrails.md)

**Hybrid search** — Combining lexical (e.g. BM25) and dense (embedding) retrieval, typically fused by score or rank. → [Retrieval metrics](../02-offline-evals/02-retrieval-metrics.md)

## I

**Indirect prompt injection** — Malicious instructions embedded in content the model ingests from a third party — retrieved documents, web pages, emails, tool outputs — rather than typed by the user. → [Retrieval & context guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md), [Threat model](../04-guardrails/07-threat-model-owasp.md)

**Instruction adherence** — Whether the output follows the system/developer instructions (rules, persona, language, format, refusals). → [Instruction & citation adherence](../02-offline-evals/06-instruction-and-citation-adherence.md)

**Inter-annotator agreement (IAA)** — How consistently multiple human labelers assign the same labels; measured with Cohen's/Fleiss' kappa or Krippendorff's alpha. Low IAA means unclear guidelines. → [SME golden datasets](../01-datasets/02-sme-golden-datasets.md)

## J

**Jailbreak** — An input crafted to make the model violate its safety policy or system instructions (e.g. role-play tricks, obfuscation). A subtype of direct prompt injection aimed at safety alignment. → [Input guardrails](../04-guardrails/02-input-guardrails.md)

## K

**k (top-k)** — Number of retrieved results considered by a retrieval metric or passed to the generator. Metrics are always "@k". → [Retrieval metrics](../02-offline-evals/02-retrieval-metrics.md)

## L

**Latency budget** — Maximum acceptable time for a request or step; determines which guardrails can run synchronously. → [Guardrails architecture](../04-guardrails/01-guardrails-architecture.md)

**LLM-as-a-judge** — Using an LLM with a rubric prompt to evaluate outputs (pointwise, reference-guided, or pairwise). Must be validated against human labels. → [LLM-as-a-judge](../02-offline-evals/07-llm-as-a-judge.md)

**Least privilege** — Security principle: grant an agent/tool only the minimum permissions needed. The main mitigation for excessive agency. → [Access control & RBAC](../04-guardrails/06-access-control-rbac.md)

## M

**MAP (Mean Average Precision)** — Mean over queries of average precision (precision averaged at each rank where a relevant doc appears). Rewards ranking all relevant docs high. → [Retrieval metrics](../02-offline-evals/02-retrieval-metrics.md)

**MRR (Mean Reciprocal Rank)** — Mean over queries of 1/rank of the first relevant result. Good when only the first relevant hit matters. → [Retrieval metrics](../02-offline-evals/02-retrieval-metrics.md)

**Multi-turn eval** — Evaluating a whole conversation (or simulated user dialogue) rather than single question–answer pairs. → [Agent tool & trajectory evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

## N

**nDCG (normalized Discounted Cumulative Gain)** — Ranking metric using graded relevance with a logarithmic position discount, normalized by the ideal ranking: nDCG@k = DCG@k / IDCG@k ∈ [0, 1]. → [Retrieval metrics](../02-offline-evals/02-retrieval-metrics.md)

**NLI (Natural Language Inference)** — Classifying whether a premise entails, contradicts, or is neutral to a hypothesis. Small NLI models can check groundedness quickly. → [Output guardrails](../04-guardrails/04-output-guardrails.md)

**Non-blocking guardrail** — A guardrail that only flags, logs, scores, or alerts without changing the response. Used for monitoring and for trialing new guardrails. → [Guardrails architecture](../04-guardrails/01-guardrails-architecture.md)

## O

**Offline eval** — Evaluation on a fixed dataset before deployment (dev loop, CI, release gate). Can use ground truth and expensive judges. → [Offline evals](../02-offline-evals/README.md)

**Online eval** — Evaluation on live production traffic, usually async and sampled, using reference-free checks and user feedback. → [Online evals](../03-online-evals-and-observability/01-online-evals.md)

**Open coding** — First stage of qualitative error analysis: writing free-text notes on what went wrong in each trace, without a predefined taxonomy. → [Why evals and guardrails](./01-why-evals-and-guardrails.md#51-analyze--error-analysis-first)

**OWASP Top 10 for LLM Applications** — Community list of the most critical security risks for LLM apps (e.g. prompt injection, sensitive information disclosure, excessive agency). → [Threat model & OWASP](../04-guardrails/07-threat-model-owasp.md)

## P

**Pairwise evaluation** — Comparing two outputs for the same input and picking the better one (human or LLM judge). Often more reliable than absolute scores; watch for position bias. → [LLM-as-a-judge](../02-offline-evals/07-llm-as-a-judge.md)

**PII (Personally Identifiable Information)** — Data that can identify a person (names with identifiers, emails, phone numbers, government IDs, etc.). Detected and redacted by input/output guardrails and scrubbed from datasets. → [Input guardrails](../04-guardrails/02-input-guardrails.md), [Output guardrails](../04-guardrails/04-output-guardrails.md)

**Pointwise evaluation** — Scoring a single output on its own against a rubric (e.g. pass/fail). Contrast with pairwise. → [LLM-as-a-judge](../02-offline-evals/07-llm-as-a-judge.md)

**Position bias** — LLM judge tendency to favor an answer based on its order in the prompt. Mitigated by swapping order and aggregating. → [LLM-as-a-judge](../02-offline-evals/07-llm-as-a-judge.md)

**Precision@k** — Fraction of the top-k retrieved items that are relevant. → [Retrieval metrics](../02-offline-evals/02-retrieval-metrics.md)

**Prompt injection (direct)** — A user's input contains instructions that attempt to override the system's instructions ("ignore previous instructions…"). OWASP LLM01. → [Input guardrails](../04-guardrails/02-input-guardrails.md), [Threat model](../04-guardrails/07-threat-model-owasp.md)

## R

**RAG (Retrieval-Augmented Generation)** — Pattern where relevant documents are retrieved and supplied to an LLM as context for generation. **Agentic RAG** adds planning, routing, and tool use around retrieval. → [The map](./02-the-evals-and-guardrails-map.md)

**RBAC (Role-Based Access Control)** — Authorization based on a user's role (Employee, Manager, HR). In RAG, must be enforced at retrieval, SQL, and tool layers — not via prompts. → [Access control & RBAC](../04-guardrails/06-access-control-rbac.md)

**Recall@k** — Fraction of all relevant items that appear in the top-k results. Usually the first retrieval metric to optimize for RAG. → [Retrieval metrics](../02-offline-evals/02-retrieval-metrics.md)

**Red teaming** — Deliberately attacking the system (manually or with automated generators) to find safety and security failures; output is an adversarial dataset. → [Threat model & OWASP](../04-guardrails/07-threat-model-owasp.md)

**Reference-based eval** — An eval that compares output to ground truth. Offline only (in practice). → [The map](./02-the-evals-and-guardrails-map.md#4-axis-d--ground-truth-reference-based-vs-reference-free)

**Reference-free eval** — An eval that needs no ground truth (uses input, context, output, trace). Can run offline, online, and as a guardrail. → [The map](./02-the-evals-and-guardrails-map.md#4-axis-d--ground-truth-reference-based-vs-reference-free)

**Regression suite** — Dataset of previously-fixed failures and critical cases that must keep passing; run in CI on every change. → [Running offline experiments](../02-offline-evals/08-running-offline-experiments.md)

**Reranker** — A second-stage model (often a cross-encoder) that reorders retrieved candidates by relevance. Evaluated with nDCG, MRR, precision@k. → [Retrieval metrics](../02-offline-evals/02-retrieval-metrics.md)

**Row-level security (RLS)** — Database feature that restricts which rows a user can read based on their identity/attributes. Key guardrail for text-to-SQL. → [Access control & RBAC](../04-guardrails/06-access-control-rbac.md)

**Rubric** — The explicit criteria (and examples) a human or LLM judge uses to decide pass/fail or a score. Vague rubrics produce unreliable judges. → [LLM-as-a-judge](../02-offline-evals/07-llm-as-a-judge.md)

## S

**Sampling (online eval)** — Running expensive online evals on a subset of traffic (random, stratified, or triggered by signals like thumbs-down). → [Online evals](../03-online-evals-and-observability/01-online-evals.md)

**Semantic similarity** — Similarity between output and reference measured by embedding cosine similarity or BERTScore. Detects paraphrase, not correctness. → [Generation quality & safety](../02-offline-evals/03-generation-quality-and-safety-evals.md)

**Shadow mode** — Running a new model, prompt, or guardrail on real traffic without affecting users (output not shown / decision not enforced), to evaluate it safely. → [Online evals](../03-online-evals-and-observability/01-online-evals.md), [Guardrails architecture](../04-guardrails/01-guardrails-architecture.md)

**SME (Subject-Matter Expert)** — A domain expert (HR, Finance, Legal…) who defines what "correct" means, writes golden answers, and labels traces. → [SME golden datasets](../01-datasets/02-sme-golden-datasets.md)

**Span** — A single timed operation within a trace (an LLM call, a retrieval, a tool call), with inputs, outputs, and metadata. → [Observability & tracing](../03-online-evals-and-observability/02-observability-and-tracing.md)

**SQL similarity / component match** — Text-to-SQL metrics comparing generated and gold SQL structurally (clauses, tables, columns) rather than by execution result. → [Text-to-SQL evals](../02-offline-evals/05-text-to-sql-evals.md)

**Synthetic dataset** — Test data generated by LLMs or programs (from documents, schemas, personas, or perturbations), used to expand coverage quickly. Needs filtering and review. → [Synthetic datasets](../01-datasets/03-synthetic-datasets.md)

**Sync vs async guardrail** — Synchronous guardrails run in the request path and can prevent harm but add latency; asynchronous ones run in parallel/after and add no latency but can only flag or retract. → [The map](./02-the-evals-and-guardrails-map.md#5-axis-e--guardrail-mode-blocking-vs-non-blocking-sync-vs-async)

## T

**Task success rate** — Fraction of agent tasks completed correctly end-to-end, judged by explicit success criteria (state checks, judge, or human). → [Agent tool & trajectory evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

**Text-to-SQL** — Generating SQL from a natural-language question so an agent can query structured data. → [Text-to-SQL evals](../02-offline-evals/05-text-to-sql-evals.md)

**Theoretical saturation** — The point in error analysis when reviewing more traces stops revealing new failure categories. → [Why evals and guardrails](./01-why-evals-and-guardrails.md#51-analyze--error-analysis-first)

**Tool-call correctness** — Whether the agent selected the right tool and passed correct, schema-valid arguments. → [Agent tool & trajectory evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

**Toxicity** — Harmful, abusive, profane, or hateful content. Measured with classifiers or judges; filtered by output guardrails. → [Generation quality & safety](../02-offline-evals/03-generation-quality-and-safety-evals.md)

**Trace** — The full record of a request through the system: all spans (LLM calls, retrievals, tool calls), inputs, outputs, latencies, and costs. The raw material for error analysis and online evals. → [Observability & tracing](../03-online-evals-and-observability/02-observability-and-tracing.md)

**Trajectory** — The ordered sequence of steps (thoughts, tool calls, observations) an agent takes to complete a task. → [Agent tool & trajectory evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

**Trajectory eval** — Evaluating the agent's path, not just its final answer: exact/in-order/any-order match to an expected trajectory, or judge-scored efficiency and correctness. → [Agent tool & trajectory evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

**TPR / TNR (judge)** — True positive rate and true negative rate of an LLM judge against human labels; more informative than raw accuracy for imbalanced pass/fail data. → [LLM-as-a-judge](../02-offline-evals/07-llm-as-a-judge.md)

## U

**Unanswerable questions** — Test inputs whose answer is not in the corpus or not permitted for the user; the correct behavior is abstention. Essential for measuring hallucination resistance. → [Synthetic datasets](../01-datasets/03-synthetic-datasets.md)

**User feedback (explicit / implicit)** — Explicit: thumbs up/down, ratings, comments. Implicit: copy, retry, rephrase, abandonment, escalation. Online quality signals. → [User feedback & implicit signals](../03-online-evals-and-observability/03-user-feedback-and-implicit-signals.md)

## V

**Verbosity bias** — LLM judge tendency to prefer longer answers regardless of quality. → [LLM-as-a-judge](../02-offline-evals/07-llm-as-a-judge.md)

**Vibe check** — Informal manual testing of a few prompts by eye. Useful early, insufficient once multiple people change the system. → [Why evals and guardrails](./01-why-evals-and-guardrails.md#4-vibes-based-vs-systematic-evaluation)

---

## Key takeaways

- Many terms come in pairs that map to the repo's axes: offline/online, end-to-end/component, reference-based/reference-free, blocking/non-blocking, sync/async.
- Faithfulness ≈ groundedness (supported by context); answer correctness is different (matches the truth). You need both.
- Retrieval metrics are always "@k"; know whether a metric uses binary or graded relevance.
- Judge-related terms (rubric, pairwise, position/verbosity bias, kappa, TPR/TNR) matter as much as the metrics themselves.
- Security terms (direct vs indirect injection, excessive agency, RBAC/ABAC, least privilege) define what guardrails must enforce.

## Further reading

- [The evals & guardrails map](./02-the-evals-and-guardrails-map.md) — where each term fits
- [Metric cheatsheet](../05-decision-framework/03-metric-cheatsheet.md) — formulas and defaults at a glance
- [References](../07-references/README.md) — papers and sources
- OWASP — [Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/)
- RAGAS — [documentation](https://docs.ragas.io/)
