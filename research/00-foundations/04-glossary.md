# Glossary

> **TL;DR**
>
> - **One clear definition per term.** Use this page to look up any metric, guardrail, or security concept in this repository.
> - **Consistent vocabulary.** When two terms mean almost the same thing (such as *faithfulness* and *groundedness*), we note both and link to the deeper guide.

- **You will learn:** Plain-English definitions for ~200 terms across datasets, statistics, evals, retrieval, LLM judges, agents, SQL, online monitoring, guardrails, and security
- **Prerequisites:** None
- **Related guides:**
    - [The Evals & Guardrails Map](./02-the-evals-and-guardrails-map.md)
    - [Failure Modes](./03-agentic-rag-failure-modes.md)
    - [Metric Cheatsheet](../05-decision-framework/03-metric-cheatsheet.md)

---

**Jump to:** [A](#a) · [B](#b) · [C](#c) · [D](#d) · [E](#e) · [F](#f) · [G](#g) · [H](#h) · [I](#i) · [J](#j) · [K](#k) · [L](#l) · [M](#m) · [N](#n) · [O](#o) · [P](#p) · [R](#r) · [S](#s) · [T](#t) · [U](#u) · [V](#v) · [W](#w)

---

## A

**A/B test:** An online experiment that splits live users between two system versions and compares business or quality metrics. → [Online Evals](../03-online-evals-and-observability/01-online-evals.md)

**A2A (Agent2Agent protocol):** An open protocol that lets agents from different vendors find each other, delegate tasks, and exchange results. Each remote agent publishes an **Agent Card**. → [Tool & Action Guardrails](../04-guardrails/05-tool-and-action-guardrails.md#16-multi-agent-and-agent-to-agent-guardrails)

**ABAC (Attribute-Based Access Control):** A permission model that checks user attributes (department, region), document attributes (classification), and request context, rather than only job roles. → [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md)

**Abstention:** When the assistant declines to answer (*"I could not find this in documents you can access"*) because evidence is missing. Correct abstention is a sign of high quality, not a failure. → [Retrieval & Context Guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md)

**Adaptive attack:** An attack that the attacker tunes against the specific defense in place. Measure prompt-injection defenses with adaptive attacks, not only with a fixed public dataset. → [Input Guardrails](../04-guardrails/02-input-guardrails.md)

**Agent archetype:** A common agent shape, such as a coding, browser, deep research, or workflow agent. The archetype tells you which environment and outcome grader to build. → [Agent Archetypes](./05-agent-archetypes.md#4-the-archetype-table)

**Agent Card:** A JSON document in which an A2A agent lists its identity, skills, endpoint, and authentication needs. Treat it as a claim to verify, not as proof. → [Tool & Action Guardrails](../04-guardrails/05-tool-and-action-guardrails.md#16-multi-agent-and-agent-to-agent-guardrails)

**Agent harness:** The code that runs the agent loop: it calls the model, runs tools, and manages context. It is also called the scaffold. When you eval an agent, you eval the model and the harness together. → [Agent Eval Environments & Graders](../02-offline-evals/09-agent-eval-environments-and-graders.md#2-words-used-on-this-page)

**Agents Rule of Two:** A design rule from Meta (2025): in one session, an agent should have at most two of [A] untrusted input, [B] access to sensitive systems or private data, and [C] the power to change state or communicate externally. If it needs all three, add human approval. [C] is broader than the exfiltration leg of the **lethal trifecta**. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md), [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md)

**AI gateway:** A proxy between your app and its model or tool providers. It can enforce guardrails, routing, quotas, and logging in one place. → [Guardrail Tools](../06-tooling-landscape/02-guardrail-tools.md)

**AlignmentCheck:** An LLM-based monitor in Meta's LlamaFirewall. It reads the agent's actions and flags when they no longer match the user's goal (goal hijacking). → [Guardrail Tools](../06-tooling-landscape/02-guardrail-tools.md)

**Answer correctness:** A reference-based metric that scores how well the generated answer matches the facts in a human-written reference answer. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**Answer relevancy:** A reference-free metric that checks whether the answer directly addresses the user's question. It does not check whether the answer is factually true. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**ASCII smuggling (Unicode tag smuggling):** Hiding instructions in invisible Unicode Tag characters (U+E0000–U+E007F). Models read them, but humans do not see them. Strip these characters at input. → [Input Guardrails](../04-guardrails/02-input-guardrails.md)

**Attack success rate (ASR):** The share of attacks in a red-team dataset that achieve their goal. For a guardrail, ASR = 1 − recall on that attack set. → [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md)

**Automated Reasoning checks:** An Amazon Bedrock Guardrails feature that checks answers with formal logic against rules that AWS extracts from your policy documents. Treat it as a detector, not a block. → [Guardrail Tools](../06-tooling-landscape/02-guardrail-tools.md)

**Axial coding:** Step 2 of error analysis: grouping your raw notes from traces into 5–10 named failure categories that you can count and rank. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#51-analyze-error-analysis-first)

## B

**Baseline:** The starting score of your current system on a fixed dataset. Every prompt or code change is compared against this number. → [Running Offline Experiments](../02-offline-evals/08-running-offline-experiments.md)

**Benjamini–Hochberg (BH) correction:** A procedure that controls the false discovery rate (the expected share of false alarms) when you test many slices or metrics at once. → [Running Offline Experiments](../02-offline-evals/08-running-offline-experiments.md)

**BERTScore:** A reference-based similarity metric that compares tokens between the generated answer and the reference answer using contextual embeddings from an encoder model (so it needs a model forward pass, unlike BLEU or ROUGE). → [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md)

**Blast radius:** How much damage one wrong action can do. A read-only draft has a small blast radius. An irreversible payment or production deploy has a large one. → [Agent Archetypes](./05-agent-archetypes.md#6-three-axes-that-change-your-plan)

**Blocking guardrail:** A runtime guardrail that changes what happens to a live request (allows, denies, masks PII, or asks a human to confirm). → [Guardrails Architecture](../04-guardrails/01-guardrails-architecture.md)

**BLEU / ROUGE:** Classic word-overlap metrics from translation (BLEU) and summarization (ROUGE). They are fast and cheap, but correlate poorly with accuracy on open-ended LLM answers. → [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md)

**BM25:** A keyword-based search ranking formula. Teams combine BM25 with vector search (**hybrid search**) so exact product codes and acronyms are not missed. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**bpref:** A retrieval metric that uses only judged documents. It stays stable when many documents have no relevance label. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Brier score:** The mean squared difference between a predicted probability and the 0/1 outcome. Lower is better. It rewards both accuracy and honest probabilities. → [Decision Model Evals](../02-offline-evals/10-decision-model-evals.md#3-what-to-measure)

**Burn rate:** How fast a service spends its error budget. A burn rate of 1 spends exactly the whole budget over the SLO window. A burn rate of 14.4 spends a 30-day budget in about 2 days. → [Monitoring, Alerting & Drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md)

## C

**Calibration:** How well stated probabilities match observed frequencies. When a calibrated model says 0.8, the event happens about 80% of the time. → [Decision Model Evals](../02-offline-evals/10-decision-model-evals.md)

**Canary deployment:** Rolling out a new change to a small percentage of live users first and checking online evals before releasing to everyone. → [Online Evals](../03-online-evals-and-observability/01-online-evals.md)

**Canary token:** A unique secret string placed inside a system prompt or restricted document. If that string appears in an output, a deterministic check blocks the leak immediately. → [Output Guardrails](../04-guardrails/04-output-guardrails.md)

**Check register:** A list of every active check with its failure mode, owner, cadence, pass-rate trend, false-failure rate, and cost assumptions. Review it to retire or fix checks. → [Eval Selection §9.5](../05-decision-framework/01-eval-selection-decision-tree.md#95-which-checks-deserve-ongoing-effort)

**Chunking:** Splitting long documents into smaller passages before indexing them for search. → [Failure Modes](./03-agentic-rag-failure-modes.md#33-retrieval-and-chunking)

**Citation adherence:** Checks that verify whether every factual claim cites a source, and whether the cited source actually supports the claim. → [Instruction & Citation Adherence](../02-offline-evals/06-instruction-and-citation-adherence.md)

**Citation audit:** Sorting each citation into supported, unsupported, dead, not fetched, or fabricated. Join the citations to the agent's fetch log to do it. → [Long-Horizon & Research Agent Evals §2.2](../02-offline-evals/11-long-horizon-and-research-agent-evals.md#22-check-every-citation-against-the-trace)

**Citation precision:** The share of citations that support (or are needed for) the statement they are attached to (ALCE). Citations on unsupported statements get no credit. → [Instruction & Citation Adherence](../02-offline-evals/06-instruction-and-citation-adherence.md)

**Classifier two-sample test (C2ST):** Train a classifier to tell two samples apart, such as synthetic and real questions. An AUC near 0.5 means the classifier cannot tell them apart. → [Synthetic Datasets](../01-datasets/03-synthetic-datasets.md)

**Clustered standard error:** A standard error that accounts for correlated rows, such as paraphrases of one question or repeated runs of one item. It is wider than the naive standard error. → [Dataset Strategy](../01-datasets/01-dataset-strategy.md)

**Cohen's kappa (κ):** A statistical score from -1 to 1 that measures how often two raters (two humans, or a judge and a human) agree beyond random chance. A common rule of thumb for trusting an LLM judge is κ ≥ 0.60 on a held-out split. → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

**Colang:** The modeling language that NeMo Guardrails uses for dialog flows and rails. Colang 1.0 and 2.0 are not compatible. → [Guardrails Architecture](../04-guardrails/01-guardrails-architecture.md), [Guardrail Tools](../06-tooling-landscape/02-guardrail-tools.md)

**Component eval:** An eval that tests one isolated pipeline step (such as the router, retriever, or SQL generator) while holding its inputs fixed. → [The Map](./02-the-evals-and-guardrails-map.md#2-axis-b-scope-end-to-end-vs-component)

**Condensed list:** A ranking with the unjudged documents removed before you score it. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Confidence interval (CI):** A range that likely contains the true value of a metric. For example, a 95% CI of 72–87% around an 81% pass rate on 100 rows. For pass rates, use the **Wilson score interval**. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#54-is-the-change-real-statistics-in-one-page)

**Confident learning:** A method that uses a model's predicted probabilities to rank labels that are likely wrong (for example with cleanlab). Send those labels to human review. → [SME Golden Datasets](../01-datasets/02-sme-golden-datasets.md)

**Constraint retention:** Whether an instruction given early in a long run still holds after compaction. Test it by injecting a constraint early and checking it late. → [Long-Horizon & Research Agent Evals §4](../02-offline-evals/11-long-horizon-and-research-agent-evals.md#4-long-running-agents)

**Construct validity:** Whether an eval measures the property it claims to measure, and only that property. → [Running Offline Experiments §12.1](../02-offline-evals/08-running-offline-experiments.md#121-is-this-eval-valid)

**Containment rate:** The share of sessions that end without a handoff to a human. Never report it alone: it rises when users give up or get stuck. → [Agent Tool & Trajectory Evals §7.2](../02-offline-evals/04-agent-tool-and-trajectory-evals.md#72-human-handoff)

**Content Security Policy (CSP):** A browser header that limits the origins a page can load images or scripts from. It is a backstop against data exfiltration through markdown images. → [Output Guardrails](../04-guardrails/04-output-guardrails.md)

**Context compaction:** Summarizing or trimming an agent's earlier history when it nears the context-window limit. It can silently drop rules or facts. → [Failure Modes](./03-agentic-rag-failure-modes.md#39-multi-turn-conversation)

**Context precision:** A metric that measures whether the relevant chunks appear near the very top of your retrieved results. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**Context recall:** A reference-based metric that measures what fraction of the facts needed to answer the question were actually retrieved. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**Context relevance:** A reference-free metric that checks whether the retrieved chunks are relevant to the user's question. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**Contextual grounding check:** An Amazon Bedrock Guardrails check that scores an answer's grounding in a reference source and its relevance to the query. AWS does not support it for conversational QA or chatbot use cases. → [Guardrail Tools](../06-tooling-landscape/02-guardrail-tools.md)

**ContextUtilization:** RAGAS context precision without a reference. It judges each retrieved chunk against the generated answer. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**Controversial label:** Qwen3Guard's third label, between safe and unsafe. Decide in your policy how to treat it for each use case. → [Guardrail Tools](../06-tooling-landscape/02-guardrail-tools.md)

**CTE shadowing:** A `WITH` alias that has the same name as a real table. It can hide the real table from a naive table allowlist, so resolve table names per scope. → [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md), [Tool & Action Guardrails](../04-guardrails/05-tool-and-action-guardrails.md)

**CUPED:** A variance-reduction method for A/B tests. It adjusts each unit's metric with a pre-experiment covariate, so you need fewer users to detect the same effect. → [Online Evals](../03-online-evals-and-observability/01-online-evals.md)

## D

**Data flywheel:** The continuous loop where failed production traces, user thumbs-downs, and guardrail blocks are labeled and added to your offline datasets. → [Production Data Flywheel](../01-datasets/04-production-data-flywheel.md)

**Decision model:** A model that returns typed answers with probabilities (a choice, a yes/no probability, or a level) instead of generated text. Evals focus on calibration and thresholds. → [Decision Model Evals](../02-offline-evals/10-decision-model-evals.md)

**Delta method:** A way to estimate the variance of a ratio metric (such as thumbs-down per session) when the analysis unit differs from the randomization unit. → [Online Evals](../03-online-evals-and-observability/01-online-evals.md)

**Deterministic check:** A check written in plain code (regex, JSON schema, SQL parser, ID check) without calling an ML model. Always prefer deterministic checks when possible. → [The Map](./02-the-evals-and-guardrails-map.md#3-axis-c-method-how-the-check-is-computed)

**Discordance rate:** The share of paired items where the baseline and the variant get different Pass/Fail verdicts. It drives the power of a paired test such as McNemar's test. → [Running Offline Experiments](../02-offline-evals/08-running-offline-experiments.md)

**Domain-classifier drift test:** Train a classifier to separate reference data from current data. An AUC near 0.5 means no detectable drift. → [Monitoring, Alerting & Drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md)

**Drift:** When live user questions, company documents, or model behaviors shift over time and cause quality to drop. → [Monitoring, Alerting & Drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md)

**Dual-control environment:** A benchmark in which both the agent and a simulated user can act on a shared state (τ²-bench). → [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

## E

**Embedding inversion (Vec2Text):** Reconstructing source text from its embedding vector. Treat embeddings of PII as sensitive data. → [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md), [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md)

**End-to-end (E2E) eval:** An eval that scores the final answer or action produced for a user question across the whole pipeline. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**Environment (agent eval):** The world the agent acts on during an eval, such as files, a database, a browser, or mock APIs. Reset it to a known state before every trial. → [Agent Eval Environments & Graders](../02-offline-evals/09-agent-eval-environments-and-graders.md#4-choose-how-real-the-environment-must-be)

**ERR (Expected Reciprocal Rank):** A graded retrieval metric for a user who stops at the first satisfying result. Each rank's stop probability is `(2^rel − 1) / 2^max_rel`. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Error analysis:** Reading at least ~100 real traces, writing down the first upstream error in each failing trace (open coding), grouping those errors into categories (axial coding), and counting them. It is step 1 of the **Analyze → Measure → Improve** loop. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#5-the-error-analysis-loop-analyze-measure-improve)

**Error budget:** The share of bad events that an SLO allows over its window: `1 − SLO`. An **error-budget policy** says what you do when you spend it, such as a release freeze. → [Monitoring, Alerting & Drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md)

**Eval (evaluation):** Running a check across a dataset or traffic sample to **measure** system quality or safety. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md)

**Eval-driven development (EDD):** Writing evaluators *before* you build a feature, like test-driven development. Husain and Shankar advise against this in general, because you cannot predict how an LLM will fail; they recommend error analysis first (**Analyze → Measure → Improve**). Some people use "EDD" loosely for any eval-centric workflow. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#5-the-error-analysis-loop-analyze-measure-improve)

**Evaluation harness:** The code that resets environments, runs trials, calls graders, and stores results. Keep it separate from the agent harness, so the agent cannot change it. → [Agent Eval Environments & Graders](../02-offline-evals/09-agent-eval-environments-and-graders.md#11-a-minimal-evaluation-harness)

**Evidence-chain completeness:** The share of multi-hop questions where the retriever found every supporting fact. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Exact set match (Spider):** A Spider Text-to-SQL metric that compares SQL clauses as unordered sets of components. It ignores literal values. → [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md)

**Excessive agency:** When an agent can cause harm because it has too many tools, overly broad permissions, or no human confirmation step (`LLM03:2026` in the OWASP Top 10 for LLM Applications 2026; it was `LLM06:2025`). → [Tool & Action Guardrails](../04-guardrails/05-tool-and-action-guardrails.md)

**Exclusion rules (Model Armor):** Google Cloud Model Armor rules that suppress known false positives. → [Guardrail Tools](../06-tooling-landscape/02-guardrail-tools.md)

**Execution accuracy (EX):** The primary Text-to-SQL metric: it checks whether running the generated SQL returns the exact same table rows as running the reference SQL. On a single database snapshot, a wrong query can match by chance; see **test-suite accuracy**. → [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md)

**Exact match (EM):** A binary check that passes only when the output string matches the reference string character-for-character (after basic cleanup). → [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md)

**Expected calibration error (ECE):** The weighted average gap between predicted probability and observed accuracy across bins. It depends on the binning, so prefer equal-count bins and report a CI. → [Decision Model Evals](../02-offline-evals/10-decision-model-evals.md#3-what-to-measure)

## F

**F1@k:** The harmonic mean of `Precision@k` and `Recall@k` for top-k search results. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Fail open / fail closed:** What a guardrail does when it times out or crashes. **Fail closed** blocks the request (or falls back to a safe answer); use it for tool-enabled turns, high-risk (Tier 3) intents, and access control. **Fail open** lets the request through and flags it; use it only for read-only, low-risk turns. → [The Map](./02-the-evals-and-guardrails-map.md#52-fail-open-or-fail-closed)

**Faithfulness:** A reference-free metric that measures what fraction of claims in the answer are directly supported by the retrieved context. Also called **groundedness**. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md)

**False positive / False negative (guardrail):** A **false positive** wrongly blocks a safe user request; a **false negative** lets an unsafe request slip through. Report a guardrail's **false-positive rate** on normal traffic and its **recall** on attack sets. → [Guardrails Architecture](../04-guardrails/01-guardrails-architecture.md)

**Fleiss' kappa (κ):** A chance-corrected agreement score for a fixed number of raters (more than two) per item on categorical labels. → [SME Golden Datasets](../01-datasets/02-sme-golden-datasets.md)

**Four golden signals:** Latency, traffic, errors, and saturation: the four signals Google SRE recommends you monitor for every service. → [Monitoring, Alerting & Drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md)

## G

**`gen_ai.evaluation.result`:** The OpenTelemetry GenAI event that records an evaluation score. Attach it to the span that it evaluates. → [Observability & Tracing](../03-online-evals-and-observability/02-observability-and-tracing.md)

**Golden dataset:** A versioned test dataset whose reference answers, document IDs, or SQL queries have been written or verified by a Subject-Matter Expert (SME). → [SME Golden Datasets](../01-datasets/02-sme-golden-datasets.md)

**Goodhart's law:** "When a measure becomes a target, it ceases to be a good measure." In evals: if you tune prompts on your whole golden set, the score rises but real quality may not. Keep a held-out slice. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#55-common-traps-to-avoid)

**Grader:** A check that scores one part of a trial, such as hidden unit tests, a database-state assertion, or an LLM judge on a rubric. A task can have several graders. → [Agent Eval Environments & Graders](../02-offline-evals/09-agent-eval-environments-and-graders.md#6-choose-graders-by-archetype)

**Grader hacking (reward hacking):** When an agent passes the grader without doing the task, for example by editing the tests. Keep graders outside the agent's write access, and read transcripts of high scores. → [Agent Eval Environments & Graders](../02-offline-evals/09-agent-eval-environments-and-graders.md#7-grader-hacking-and-how-to-stop-it)

**Ground truth (Reference data):** The known-correct answer, document ID list, or SQL result stored in a dataset row. → [Dataset Strategy](../01-datasets/01-dataset-strategy.md)

**Groundedness:** Whether every claim in an output is backed by the retrieved context or tool outputs. Used interchangeably with **faithfulness**. → [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md), [Output Guardrails](../04-guardrails/04-output-guardrails.md)

**Group-sequential design:** An A/B test plan with a fixed number of interim analyses and an alpha-spending rule. You can stop early without more false positives. → [Online Evals](../03-online-evals-and-observability/01-online-evals.md)

**Guard model:** An open-weight classifier or LLM that labels prompts or responses as safe or unsafe against a taxonomy (for example Llama Guard or Qwen3Guard). → [Guardrail Tools](../06-tooling-landscape/02-guardrail-tools.md)

**Guardrail:** A check that runs inline during a live request to **enforce** a safety, security, or quality rule (by allowing, blocking, modifying, escalating, or flagging). → [Guardrails](../04-guardrails/README.md)

**GUC spoofing:** RLS that reads a PostgreSQL session variable (a GUC such as `app.tenant_id`) is unsafe if the agent's SQL can reset that variable with `SET` or `set_config()`. Revoke `set_config` and run each query as one prepared statement. → [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md), [Tool & Action Guardrails](../04-guardrails/05-tool-and-action-guardrails.md)

**Gwet's AC1:** An agreement coefficient like Cohen's κ. Its chance term is less sensitive to skewed label prevalence, so report it next to κ when one label dominates. → [SME Golden Datasets](../01-datasets/02-sme-golden-datasets.md)

## H

**Hallucination:** Any statement in the model's output that is not supported by the retrieved context or contradicts reality. → [Failure Modes](./03-agentic-rag-failure-modes.md#34-generation)

**Held-out split:** Labeled items that you never use to write or tune a prompt or judge, kept only for the final measurement. Typical judge-validation splits are train (few-shot examples), dev (tuning), and test (held out). → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

**Hidden context exposure:** Leaking a system prompt, hidden instructions, tool lists, or other context the user should not see (`LLM08:2026`). Keep secrets out of prompts, and use canary tokens to detect leaks. → [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md)

**Hit Rate@k:** The percentage of user queries where at least one relevant document appears in the top `k` retrieved results. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Horvitz–Thompson (stratified) estimator:** Re-weights each sampled label by `1 / inclusion probability` (or by stratum size). It gives an unbiased population rate from a non-uniform sample. → [Production Data Flywheel](../01-datasets/04-production-data-flywheel.md)

**Human handoff:** Transferring a session from the agent to a human. Evaluate the decision, the timing, the context packet, and the final resolution separately. → [Agent Tool & Trajectory Evals §7.2](../02-offline-evals/04-agent-tool-and-trajectory-evals.md#72-human-handoff)

**Human-in-the-loop (HITL):** Pausing an agent so a human can approve or reject a high-stakes action before it runs, or having humans review sampled production traces. → [Tool & Action Guardrails](../04-guardrails/05-tool-and-action-guardrails.md)

**Hybrid search:** Running both keyword search (BM25) and vector search (embeddings) and merging their ranked results. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

## I

**IDBasedContextPrecision / IDBasedContextRecall:** RAGAS retrieval metrics that compare retrieved chunk IDs with reference chunk IDs. They need no LLM. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**IFEval loose mode:** Re-scores a response under 8 variants (first line removed, last line removed, and/or markdown `*` removed). The response passes if any variant passes. → [Instruction & Citation Adherence](../02-offline-evals/06-instruction-and-citation-adherence.md)

**Inclusion probability:** The chance that a trace enters a sample. You need it to re-weight a non-uniform sample into an unbiased rate. → [Production Data Flywheel](../01-datasets/04-production-data-flywheel.md)

**Indirect prompt injection:** When an attacker hides malicious instructions inside a document, email, or database row that the agent retrieves and reads into its prompt. → [Retrieval & Context Guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md), [Threat Model](../04-guardrails/07-threat-model-owasp.md)

**Input / dialog / retrieval / execution / output rails:** The five rail types in NeMo Guardrails, named by where they run in the pipeline. → [Guardrails Architecture](../04-guardrails/01-guardrails-architecture.md)

**Instruction adherence:** Whether the model obeys explicit rules in the prompt (such as length caps, JSON format, language, or forbidden topics). → [Instruction & Citation Adherence](../02-offline-evals/06-instruction-and-citation-adherence.md)

**Inter-annotator agreement (IAA):** A measure of how often two human reviewers give the same Pass/Fail label to the same examples. Low agreement means your grading rubric is unclear. Common scores are Cohen's κ (two raters), Fleiss' κ, and Krippendorff's α (many raters). → [SME Golden Datasets](../01-datasets/02-sme-golden-datasets.md)

**IORails:** An experimental NeMo Guardrails engine for input and output rails. The built-in tool-call validation needs it. → [Guardrail Tools](../06-tooling-landscape/02-guardrail-tools.md)

**Item-level recall:** The share of reference items that the output contains, matched one-to-one. The success metric for "list every item" tasks. → [Retrieval Metrics §7.2](../02-offline-evals/02-retrieval-metrics.md#72-whole-document-tasks-when-success-means-every-item)

## J

**Jailbreak:** A user prompt crafted to trick the model into bypassing its safety rules (for example, using role-play or encoded text). → [Input Guardrails](../04-guardrails/02-input-guardrails.md)

**judged@k:** The share of the top `k` results that have a relevance label. When it is low, your metric can undercount. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

## K

**k-anonymity / quasi-identifier:** A **quasi-identifier** is a field (such as job title, office, or start date) that can re-identify a person in combination with other fields. **k-anonymity** requires each combination to match at least `k` records. → [Production Data Flywheel](../01-datasets/04-production-data-flywheel.md)

**KS test (Kolmogorov–Smirnov):** A test of whether two samples come from the same continuous distribution. Its statistic `D` is the largest gap between the two cumulative distributions. → [Monitoring, Alerting & Drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md)

**k (top-k):** The number of retrieved chunks scored by a retrieval metric or passed into the generator prompt. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Krippendorff's alpha (α):** An agreement score for any number of raters that handles missing labels. A common reading is α ≥ 0.80 reliable and 0.667–0.80 tentative. → [SME Golden Datasets](../01-datasets/02-sme-golden-datasets.md)

## L

**Latency budget:** The maximum time (in milliseconds) a request or guardrail step is allowed to take before hurting user experience. → [Guardrails Architecture](../04-guardrails/01-guardrails-architecture.md)

**Least privilege:** Giving an agent or tool only the minimum database, document, and API permissions required to do its job. → [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md)

**Lethal trifecta:** Simon Willison's name (2025) for an agent that has (1) access to private data, (2) exposure to untrusted content, and (3) a way to communicate externally. Together they let an attacker steal data through prompt injection. Remove at least one leg, or add human approval. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md)

**LINDDUN:** A privacy threat-modeling framework: Linking, Identifying, Non-repudiation, Detecting, Data disclosure, Unawareness and unintervenability, Non-compliance. Use it next to STRIDE. → [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md)

**Linear vs. exponential gain (nDCG):** Linear gain uses the label `rel`; it is the default in trec_eval, BEIR/MTEB, scikit-learn, and ranx `ndcg`. Exponential gain uses `2^rel − 1` (Burges et al., 2005) and rewards highly relevant items more. Always state which one you report. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**LlamaFirewall:** Meta's open-source guardrail framework for agents. It combines Prompt Guard 2 (injection classifier), AlignmentCheck (goal-hijack monitor), and CodeShield (insecure-code scanner). → [Guardrail Tools](../06-tooling-landscape/02-guardrail-tools.md)

**LLM-as-a-judge:** Using an LLM with a rubric prompt to grade outputs, either one at a time (**pointwise**) or two side by side (**pairwise**). This guide recommends binary Pass/Fail, one criterion per judge. Validate it against human labels on a held-out split before you trust its scores. → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

**Locale:** A language plus regional conventions, written as a BCP 47 tag such as `de-DE`. Store it separately from the policy jurisdiction. → [Generation Quality & Safety §3.7](../02-offline-evals/03-generation-quality-and-safety-evals.md#37-language-locale-and-cultural-review)

**Long-horizon task:** A task that takes many steps or a long time, such as hundreds of tool calls over hours. Small per-step errors compound, so grade milestones as well as the end state. → [Agent Eval Environments & Graders](../02-offline-evals/09-agent-eval-environments-and-graders.md#9-long-horizon-tasks), [Failure Modes](./03-agentic-rag-failure-modes.md#311-long-horizon-autonomy-and-multi-agent)

## M

**MAP (Mean Average Precision):** A retrieval metric that rewards systems for placing *all* relevant documents near the top of the list across many queries. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Maximum bipartite matching (tool calls):** The best one-to-one pairing of predicted and expected tool calls. Use it to compute tool-call precision, recall, and F1. Greedy pairing can undercount matches. → [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

**McNemar's test:** A paired statistical test for two versions run on the same rows. It uses only the rows that flipped (Pass → Fail and Fail → Pass). → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#54-is-the-change-real-statistics-in-one-page)

**MCP (Model Context Protocol):** An open protocol that lets an agent discover and call tools, resources, and prompts on external servers. Each MCP server adds tool descriptions to the model's context, so treat them as untrusted input. → [Tool & Action Guardrails](../04-guardrails/05-tool-and-action-guardrails.md)

**MCP scanner:** A tool that inspects an MCP server's tool descriptions for injected instructions and other risks before you connect to it. → [Guardrail Tools](../06-tooling-landscape/02-guardrail-tools.md)

**Measurement pool vs. discovery pool:** A **measurement pool** is a random sample of traces for unbiased rate estimates. A **discovery pool** holds traces chosen on purpose (such as 👎 or flagged traces) to find failures. Do not report rates from a discovery pool. → [Production Data Flywheel](../01-datasets/04-production-data-flywheel.md)

**Memory poisoning:** Planting false facts or instructions in an agent's long-term memory so that they change its behavior in later sessions (`ASI06` Memory & Context Poisoning). → [Failure Modes](./03-agentic-rag-failure-modes.md#39-multi-turn-conversation)

**Metric cardinality:** The number of unique attribute combinations (time series) per metric. Put high-cardinality attributes, such as user ID, on spans, not on metrics. → [Observability & Tracing](../03-online-evals-and-observability/02-observability-and-tracing.md)

**Milestone completion:** The share of planned checkpoints that a long task reaches. It shows partial progress when the end-to-end success rate is near zero. → [Agent Eval Environments & Graders](../02-offline-evals/09-agent-eval-environments-and-graders.md#9-long-horizon-tasks)

**Minimum detectable effect (MDE):** The smallest true change that a test detects with the chosen power (usually 80%) at the chosen significance level. → [Running Offline Experiments](../02-offline-evals/08-running-offline-experiments.md), [Online Evals](../03-online-evals-and-observability/01-online-evals.md)

**MMD (Maximum Mean Discrepancy):** A kernel-based two-sample test statistic. Teams use it to detect drift in embeddings. → [Monitoring, Alerting & Drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md)

**MQM (Multidimensional Quality Metrics):** An error typology for human review of translation and language quality. Each error gets a severity level, such as Major or Minor. → [Generation Quality & Safety §3.7](../02-offline-evals/03-generation-quality-and-safety-evals.md#37-language-locale-and-cultural-review)

**MRR (Mean Reciprocal Rank):** A retrieval metric equal to the average of `1 / rank` of the *first* relevant chunk found. Best when the user only needs one good hit. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**mSPRT (always-valid p-value):** A sequential test whose p-values stay valid while you check results continuously ("peeking"). → [Online Evals](../03-online-evals-and-observability/01-online-evals.md)

**Multi-turn eval:** Scoring a full back-and-forth conversation rather than a single isolated question and answer. → [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

**Multi-window burn-rate alert:** An alert that fires only when both a long window and a short window (about 1/12 of the long one) exceed a burn-rate threshold. It catches fast and slow burns with few false alarms. → [Monitoring, Alerting & Drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md)

## N

**nDCG (Normalized Discounted Cumulative Gain):** A retrieval ranking metric that supports graded relevance (such as 0 = irrelevant, 1 = partial, 2 = exact) and penalizes relevant docs that appear low in the list. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**NLI (Natural Language Inference):** A fast classification model that checks whether a premise (retrieved chunk) entails, contradicts, or is neutral to a hypothesis (answer sentence). → [Output Guardrails](../04-guardrails/04-output-guardrails.md)

**Non-blocking guardrail:** A guardrail that logs a score or alert without changing or stopping the user's response. → [Guardrails Architecture](../04-guardrails/01-guardrails-architecture.md)

**Novelty and primacy effects:** Early A/B results that are too high (novelty) or too low (primacy) because users react to the change itself. Run tests long enough for them to fade. → [Online Evals](../03-online-evals-and-observability/01-online-evals.md)

**Null agent:** An agent that does nothing and ends at once. It must fail every task. If it passes a task, the grader or the task is broken. → [Agent Eval Environments & Graders](../02-offline-evals/09-agent-eval-environments-and-graders.md#8-validate-every-task-before-you-trust-it)

## O

**Offline eval:** Running checks against a fixed dataset before deployment (during local development or in CI). → [Offline Evals](../02-offline-evals/README.md)

**Online eval:** Running checks asynchronously on live production traffic. Most are reference-free; reference-based checks run online only on a labeled sample of traces. → [Online Evals](../03-online-evals-and-observability/01-online-evals.md)

**Open coding:** Step 1 of error analysis: reading traces and writing a short plain-English note on the first thing that went wrong, before creating formal categories. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#51-analyze-error-analysis-first)

**Open redirect:** An allowlisted URL that forwards to any target. It defeats domain allowlists for links and images. → [Output Guardrails](../04-guardrails/04-output-guardrails.md)

**Oracle run (reference solution):** A known-good solution that passes every grader. If the oracle run fails, fix the task or the grader before you score any agent. → [Agent Eval Environments & Graders](../02-offline-evals/09-agent-eval-environments-and-graders.md#8-validate-every-task-before-you-trust-it)

**OTLP (OpenTelemetry Protocol):** The wire protocol for exporting traces, metrics, and logs to an OpenTelemetry backend. → [Observability & Tracing](../03-online-evals-and-observability/02-observability-and-tracing.md)

**Outcome:** The final state of the environment at the end of a trial, such as database rows, files, or sent messages. Grade the outcome, not what the agent says it did. → [Agent Eval Environments & Graders](../02-offline-evals/09-agent-eval-environments-and-graders.md#2-words-used-on-this-page)

**Over-searching:** Searching more than a question needs. It raises cost and can hurt abstention on unanswerable questions. → [Long-Horizon & Research Agent Evals §2.3](../02-offline-evals/11-long-horizon-and-research-agent-evals.md#23-sources-balance-and-knowing-when-to-stop)

**OWASP Top 10 for LLM Applications:** A widely used community list of the ten biggest security risks in LLM applications. The current edition is **2026**: for example, Prompt Injection (`LLM01:2026`), Sensitive Information Disclosure (`LLM02:2026`), and Excessive Agency (`LLM03:2026`). Always write the year, because IDs change between editions. → [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md)

**OWASP Top 10 for Agentic Applications:** A companion OWASP list (2026 edition) for autonomous agents, with IDs `ASI01`–`ASI10`, such as Agent Goal Hijack (`ASI01`), Tool Misuse and Exploitation (`ASI02`), and Memory & Context Poisoning (`ASI06`). → [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md) → [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md)

## P

**PABAK:** Prevalence- and bias-adjusted kappa. For two categories it equals `2·p_o − 1`, where `p_o` is raw agreement. → [SME Golden Datasets](../01-datasets/02-sme-golden-datasets.md)

**Pairwise evaluation:** Showing a judge two answers (`A` and `B`) to the same question and asking which one is better. → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

**pass@k:** The chance that **at least one** of `k` tries at a task passes. Estimate it without bias from `n` tries with `c` passes as `1 − C(n−c, k) / C(n, k)` (Chen et al., 2021). → [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

**pass^k:** The chance that **all** `k` tries at a task pass, estimated as `C(c, k) / C(n, k)` (Yao et al., 2024, τ-bench). It measures consistency, and it falls as `k` grows. → [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

**PII (Personally Identifiable Information):** Personal data such as names, emails, phone numbers, or government IDs that must be masked by guardrails and scrubbed from eval datasets. → [Input Guardrails](../04-guardrails/02-input-guardrails.md), [Output Guardrails](../04-guardrails/04-output-guardrails.md)

**Pointwise evaluation:** Grading a single output on its own against a rubric (such as binary Pass/Fail), rather than comparing two outputs side by side. → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

**Position bias:** The tendency of an LLM judge in pairwise comparisons to pick whichever answer is listed first (or second). Mitigate it by running the comparison twice with the order swapped. → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

**Precision@k:** The fraction of the top `k` retrieved chunks that are actually relevant to the question. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Prediction-powered inference (PPI):** Combines many judge labels with a small random human-labelled sample. It gives an unbiased pass rate with a valid confidence interval (Angelopoulos et al., 2023). → [LLM-as-a-Judge §8.1](../02-offline-evals/07-llm-as-a-judge.md#81-prediction-powered-inference-ppi)

**Prevalence paradox (kappa paradox):** Cohen's κ can be low even when raw agreement is high, because one label dominates. Also report raw agreement, specific agreement, or Gwet's AC1. → [SME Golden Datasets](../01-datasets/02-sme-golden-datasets.md)

**Prompt-injection design patterns:** Architectures that stop untrusted content from choosing actions: action-selector, plan-then-execute, LLM map-reduce, dual LLM, code-then-execute, and context-minimization (Beurer-Kellner et al., 2025). CaMeL adds a privileged planner and capability tracking on data flow. → [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md), [Retrieval & Context Guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md)

**Prompt injection (direct):** When a user types instructions that try to override your system prompt (such as *"Ignore all previous rules and..."*). → [Input Guardrails](../04-guardrails/02-input-guardrails.md), [Threat Model](../04-guardrails/07-threat-model-owasp.md)

**Pseudonymization (consistent):** Replacing each identifier with the same placeholder everywhere in a row or dataset. Only a separately held key can reverse it. → [Production Data Flywheel](../01-datasets/04-production-data-flywheel.md)

**PSI (Population Stability Index):** A drift score over binned distributions: `Σ (a_i − e_i) ln(a_i / e_i)`. Rules of thumb from credit risk: below 0.10 stable, 0.10–0.25 moderate shift, above 0.25 major shift. → [Monitoring, Alerting & Drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md)

## R

**RAG (Retrieval-Augmented Generation):** Fetching relevant chunks from a knowledge base and passing them into the LLM prompt so the model can answer from your data. **Agentic RAG** adds routing, planning, SQL, and tool calls. → [The Map](./02-the-evals-and-guardrails-map.md)

**RBAC (Role-Based Access Control):** Restricting which documents, database tables, and tools a user can access based on their role (such as `employee` vs. `hr_partner`). Must be enforced in code, never by prompt instructions alone. → [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md)

**RBP (Rank-Biased Precision):** `(1 − p) Σ rel_i · p^(i−1)`, where `p` is user persistence. The **residual** is the most that unjudged documents could add to the score. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Recall@k:** The fraction of all relevant documents in the corpus that appear inside the top `k` retrieved results. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Red teaming:** Deliberately attacking your system with jailbreaks, injections, and permission probes to uncover security holes and build an adversarial test dataset. → [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md)

**Reference-based eval:** A check that compares the system's output against human-verified reference data. Runs offline, or online on a labeled sample of traces; never as a runtime guardrail. → [The Map](./02-the-evals-and-guardrails-map.md#4-axis-d-ground-truth-reference-based-vs-reference-free)

**Reference-free eval:** A check that grades the output using only the question, retrieved context, and trace. Can run offline, online, or as a runtime guardrail. → [The Map](./02-the-evals-and-guardrails-map.md#4-axis-d-ground-truth-reference-based-vs-reference-free)

**Regression suite:** A dataset of past bugs and critical test cases run on every pull request in CI so fixed bugs never come back. → [Running Offline Experiments](../02-offline-evals/08-running-offline-experiments.md)

**Reliability diagram:** A plot of observed accuracy against predicted probability, per bin. Points below the diagonal show overconfidence. → [Decision Model Evals](../02-offline-evals/10-decision-model-evals.md#3-what-to-measure)

**Reranker:** A second-stage model (usually a cross-encoder) that takes the top 20–50 search hits and re-sorts them so the most relevant chunks sit in the top 5. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Retrieve-or-not decision:** An agent's choice of whether to retrieve at all on a turn. Score it as a binary classification. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Reward hacking:** See **Grader hacking**.

**RFC 8693 `act` / `may_act` claims:** OAuth token-exchange claims that record that an agent acts for a user (`act`) or may do so (`may_act`). They keep both identities in the audit trail. → [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md)

**RFC 8707 resource indicator:** An OAuth parameter that binds a token to one resource server (its audience). MCP requires it, so a token for one server cannot be replayed at another. → [Tool & Action Guardrails](../04-guardrails/05-tool-and-action-guardrails.md)

**Rogan–Gladen correction:** Corrects an observed pass rate for judge error: `(observed + TNR − 1) / (TPR + TNR − 1)`, with PASS as the positive class. → [LLM-as-a-Judge §8](../02-offline-evals/07-llm-as-a-judge.md#8-correcting-pass-rate-estimates-for-judge-error)

**Rollout stages (`shadow` → `flag` → `block`):** A new guardrail first only logs (`shadow`), then flags traffic to users or reviewers (`flag`), then enforces (`block`). Measure false positives before each step. → [The Evals & Guardrails Map](./02-the-evals-and-guardrails-map.md), [Guardrails Architecture](../04-guardrails/01-guardrails-architecture.md)

**Row access policy:** The Snowflake and BigQuery form of row-level security. It filters rows by the caller's identity. → [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md)

**Row-level security (RLS):** A database feature that automatically filters table rows based on the current user's identity or role. → [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md)

**Rubric:** The written Pass/Fail rules and examples given to a human reviewer or LLM judge. → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

**Rug pull (MCP):** An MCP server changes a tool's name, description, or schema after a user approved it. Pin server versions and re-approve on any change. → [Tool & Action Guardrails](../04-guardrails/05-tool-and-action-guardrails.md)

**Rule of three:** If you see zero failures in `n` test cases, the 95% upper bound on the true failure rate is about `3/n`. To claim a failure rate below 1%, you need at least ~300 clean cases. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#54-is-the-change-real-statistics-in-one-page)

**R-VES:** The reward-based Valid Efficiency Score from BIRD Mini-Dev. It gives credit for correct SQL, scaled by its runtime against the gold SQL. → [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md)

## S

**Sampling (online eval):** Running heavier checks (such as LLM judges) on a share of live traffic to control cost. A common rule of thumb: run deterministic checks and the injection classifier on 100% of traffic, and LLM judges on 1–5% of traces (or about 500 per day) plus 100% of flagged and thumbs-down traces. → [Online Evals](../03-online-evals-and-observability/01-online-evals.md)

**`security_invoker` view:** A PostgreSQL 15+ view option that runs the view with the caller's privileges, so RLS applies to the caller and not to the view owner. → [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md)

**Selective prediction:** Answering only when confidence is high enough and deferring the rest. Evaluate accuracy on kept cases together with the deferral rate. → [Decision Model Evals](../02-offline-evals/10-decision-model-evals.md)

**Self-preference bias:** The tendency of an LLM judge to rate outputs from its own model (or model family) higher than equally good outputs from other models (Panickssery et al., 2024). → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

**Semantic similarity:** Comparing the meaning of a generated answer and a reference answer using embedding cosine similarity or BERTScore. → [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md)

**Shadow mode:** Running a new model or guardrail on live requests and logging its decisions without changing what the user sees. It is the first stage of a guardrail rollout: `shadow` (log only) → `flag` (log and alert or warn) → `block`. → [Online Evals](../03-online-evals-and-observability/01-online-evals.md), [Guardrails Architecture](../04-guardrails/01-guardrails-architecture.md)

**Slopsquatting:** Registering package names that LLMs often hallucinate, so generated code installs the attacker's package. It is a supply-chain risk (`LLM04:2026`). → [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md)

**SME (Subject-Matter Expert):** A domain specialist (in HR, Finance, Legal, or Support) who defines what a correct answer looks like and reviews golden dataset rows. → [SME Golden Datasets](../01-datasets/02-sme-golden-datasets.md)

**Soft F1 (BIRD):** A table-level F1 between predicted and gold result rows and cells. It is more tolerant than exact set equality. → [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md)

**Span:** One timed step inside a trace (such as a single vector search, LLM call, or SQL query), along with its inputs and outputs. → [Observability & Tracing](../03-online-evals-and-observability/02-observability-and-tracing.md)

**Span coverage:** The share of a gold evidence span that a retrieved chunk covers. Use it to map chunks to span-level relevance labels. → [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md)

**Span link:** An OpenTelemetry reference from one span to a span in another trace, which may have finished. Use it to connect follow-up actions, such as feedback or async evals. → [Observability & Tracing](../03-online-evals-and-observability/02-observability-and-tracing.md)

**Specific agreement (positive / negative):** Agreement computed separately for each label, for example how often raters agree when either of them says FAIL. → [SME Golden Datasets](../01-datasets/02-sme-golden-datasets.md)

**Spotlighting:** Marking untrusted text with delimiters, datamarking, or encoding so the model can tell data from instructions. It lowers non-adaptive attack success but does not stop adaptive attacks. → [Retrieval & Context Guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md)

**SQL component match:** A Text-to-SQL check that compares the parsed clauses (`SELECT`, `JOIN`, `WHERE`, `GROUP BY`) of the generated query against the reference query. → [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md)

**Synthetic dataset:** Test questions and reference answers generated by an LLM from your documents or database schemas to quickly expand test coverage. → [Synthetic Datasets](../01-datasets/03-synthetic-datasets.md)

**Sync vs. async guardrail:** A **synchronous** guardrail makes the request wait so it can block harm before it happens; an **asynchronous** guardrail runs in the background with zero latency penalty. → [The Map](./02-the-evals-and-guardrails-map.md#5-axis-e-guardrail-mode-blocking-vs-non-blocking-sync-vs-async)

## T

**Tail sampling:** Deciding whether to keep or drop a trace after it finishes, based on its content (for example, keep all errors and flagged traces). → [Observability & Tracing](../03-online-evals-and-observability/02-observability-and-tracing.md)

**Taint tracking:** Marking a run as tainted when untrusted content enters the context, then blocking exfiltration-capable tools (such as `send_email` and `fetch_url`) for the rest of the run. → [Tool & Action Guardrails](../04-guardrails/05-tool-and-action-guardrails.md)

**Task success rate:** The percentage of end-to-end user tasks that the agent completes accurately and safely. → [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

**Test-suite accuracy:** A Text-to-SQL metric that runs the generated and reference SQL on several database states. A query passes only if results match on all of them, which removes many false positives of single-snapshot execution accuracy (Zhong, Yu & Klein, 2020). → [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md)

**Text-to-SQL:** Translating a user's natural-language question into a SQL query and running it against a database. → [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md)

**Theoretical saturation:** The point during error analysis when reading more traces stops uncovering new failure categories (read at least ~100 traces, and keep going while you still find new categories). → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#51-analyze-error-analysis-first)

**Time horizon (50%):** METR's measure of agent capability: the length of human task, in time, that an agent completes 50% of the time. → [Agent Archetypes](./05-agent-archetypes.md#why-the-horizon-axis-matters)

**Tool poisoning:** Hiding malicious instructions in a tool's description or metadata (for example, on an MCP server). The model reads the description, but the user rarely sees it. → [Failure Modes](./03-agentic-rag-failure-modes.md#38-security)

**Tool-call correctness:** Whether the agent picked the right tool and passed valid, accurate arguments. → [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

**Tool shadowing:** One MCP server's tool description changes how the agent uses another server's tools, or tool names collide across servers. → [Tool & Action Guardrails](../04-guardrails/05-tool-and-action-guardrails.md)

**Toxicity:** Rude, hateful, profane, or harmful language in inputs or outputs, caught by classifiers and output guardrails. → [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md)

**Trace:** The complete recorded log of one user request, containing every span (router, retrieval, SQL, tool calls, LLM prompts, and guardrail decisions). → [Observability & Tracing](../03-online-evals-and-observability/02-observability-and-tracing.md)

**Trajectory:** The step-by-step sequence of thoughts, tool calls, and observations an agent takes to finish a task. → [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

**Trajectory eval:** A check that grades the path the agent took (such as whether it called tools in the right order without looping), not just its final answer. → [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)

**Transcript:** The full record of one trial: messages, tool calls, tool results, and reasoning. In production, the same record is a **trace**. → [Agent Eval Environments & Graders](../02-offline-evals/09-agent-eval-environments-and-graders.md#2-words-used-on-this-page)

**Trial:** One attempt at a task. Agents are not deterministic, so run several trials per task and report **pass@k** or **pass^k**. → [Agent Eval Environments & Graders](../02-offline-evals/09-agent-eval-environments-and-graders.md#2-words-used-on-this-page)

**TPR / TNR (True Positive Rate / True Negative Rate):** How accurately an LLM judge identifies true Passes (**TPR**) and true Fails (**TNR**) when compared against human labels. A common rule of thumb is TPR ≥ 0.85 and TNR ≥ 0.85 on a held-out split (≥ 0.90 for high-risk slices). → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

## U

**Unanswerable question:** A test question whose answer is not in your documents (or not allowed for the user's role). Used to test whether the system abstains instead of hallucinating. → [Synthetic Datasets](../01-datasets/03-synthetic-datasets.md)

**User feedback (explicit & implicit):** **Explicit feedback** includes thumbs-up/down clicks and written comments; **implicit feedback** includes user retries, copy events, and escalations to human support. → [User Feedback & Implicit Signals](../03-online-evals-and-observability/03-user-feedback-and-implicit-signals.md)

**Utility under attack:** The share of injected runs in which the user's task still succeeds. Report it next to attack success rate, so a defense that breaks the task does not look good. → [Generation Quality & Safety Evals](../02-offline-evals/03-generation-quality-and-safety-evals.md)

## V

**Variation-selector smuggling:** Hiding bytes in Unicode variation selectors (U+FE00–U+FE0F, U+E0100–U+E01EF) attached to a visible character. → [Input Guardrails](../04-guardrails/02-input-guardrails.md)

**Verbosity bias:** The tendency of LLM judges to give higher scores to longer, wordier answers even when they contain no extra facts. → [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)

**Vibe check:** Trying a handful of prompts by hand and eyeballing whether the answers "look good." Fine on day one, dangerous once you have real users. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#4-vibes-based-vs-systematic-evaluation)


## W

**Wasserstein distance:** The distance between two distributions in the signal's own units (also called earth mover's distance). → [Monitoring, Alerting & Drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md)

**Whole-script confusable:** A string written in one non-Latin script whose letters look Latin (for example Cyrillic "аdmin"). Per-character mixed-script checks miss it. → [Input Guardrails](../04-guardrails/02-input-guardrails.md)

**Wilson score interval:** A confidence interval for a pass rate that stays accurate for small datasets and for rates near 0% or 100%, where the simple normal formula fails. → [Why Evals and Guardrails](./01-why-evals-and-guardrails.md#54-is-the-change-real-statistics-in-one-page)

**Workload identity (SPIFFE):** A short-lived, automatically rotated identity for a running service, such as a SPIFFE ID. Each agent authenticates as itself instead of with a shared API key. → [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md)

---

## Key takeaways

- **Know the core pairs:** offline vs. online, end-to-end vs. component, reference-based vs. reference-free, blocking vs. non-blocking, and synchronous vs. asynchronous.
- **Faithfulness (groundedness) is not answer correctness.** Faithfulness means the answer matches the retrieved chunk; answer correctness means the answer matches the truth.
- **Retrieval metrics always end in `@k`.** Make sure you know whether a metric uses binary relevance (`Recall@k`, `MRR`) or graded relevance (`nDCG@k`).
- **Validate your judges against human labels.** Terms like **rubric**, **TPR/TNR**, **Cohen's κ**, **held-out split**, **position bias**, and **self-preference bias** matter whenever an LLM grades another LLM.
- **Know your noise.** Use **confidence intervals**, **paired tests**, and **pass^k** before you call a change an improvement.
- **Always write the OWASP year.** IDs such as `LLM03:2026` change between editions.

## Further reading

- [The Evals & Guardrails Map](./02-the-evals-and-guardrails-map.md): see how every term fits together
- [Metric Cheatsheet](../05-decision-framework/03-metric-cheatsheet.md): formulas and score ranges on one page
- [References](../07-references/README.md): papers, benchmarks, and standards
- OWASP, 2026, [Top 10 for LLM Applications 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/) · [Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- Hamel Husain & Shreya Shankar, [AI Evals FAQ](https://hamel.dev/blog/posts/evals-faq/) (on error analysis and eval-driven development)
- RAGAS, [Documentation](https://docs.ragas.io/)
