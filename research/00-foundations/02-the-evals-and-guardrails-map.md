# The Evals & Guardrails Map

> **TL;DR**
>
> - **Five questions classify every check:** **When** does it run? **What** is its scope? **How** is it computed? **Does** it need reference data? And for guardrails, **how** does it act?
> - **Three loops keep an agent reliable:** Offline evals gate your releases, runtime guardrails protect live requests, and online evals turn production traffic into new test data.
> - **Use this page as your compass.** Learn the five axes once, then use the master tables in Section 6 to jump to the exact guide you need.

- **You will learn:**
    - The five axes of evals and guardrails
    - Where every metric and guardrail fits
    - How datasets feed offline evals and how production feeds datasets
    - How to choose fail-open or fail-closed behavior and stay inside a latency budget
    - How to deploy one check in three places (with Python code)
- **Prerequisites:** [Why Evals and Guardrails](./01-why-evals-and-guardrails.md)
- **Related guides:**
    - [Failure Modes](./03-agentic-rag-failure-modes.md)
    - [Glossary](./04-glossary.md)
    - [Eval Selection Decision Tree](../05-decision-framework/01-eval-selection-decision-tree.md)
    - [Guardrail Selection Decision Tree](../05-decision-framework/02-guardrail-selection-decision-tree.md)
    - [Metric Cheatsheet](../05-decision-framework/03-metric-cheatsheet.md)

---

## 0. The whole picture on one page

```mermaid
flowchart TD
    subgraph DATA["Datasets - 01-datasets"]
        SME["SME golden datasets"]
        SYN["Synthetic datasets"]
        PROD["Curated production samples"]
    end

    subgraph OFF["Offline evals - pre-deploy - 02-offline-evals"]
        E2E["End-to-end RAG evals"]
        COMP["Component evals: retrieval, tools, SQL, generation, citations"]
        JUDGE["LLM-as-a-judge + human review"]
    end

    subgraph RUN["Runtime - in the request path - 04-guardrails"]
        IN["Input guardrails"]
        APP["Agentic RAG app"]
        CTX["Retrieval/context guardrails"]
        TOOL["Tool/action guardrails"]
        OUT["Output guardrails"]
    end

    subgraph ON["Online evals & observability - 03-online-evals"]
        TRACE["Traces"]
        OEV["Async online evals: deterministic + sampled LLM judges"]
        FB["User feedback"]
        MON["Monitoring, alerting, drift"]
    end

    SME --> OFF
    SYN --> OFF
    PROD --> OFF
    OFF -->|"release gate"| APP
    IN --> APP --> CTX --> APP
    APP --> TOOL --> APP
    APP --> OUT
    RUN --> TRACE
    TRACE --> OEV --> MON
    FB --> MON
    OEV -->|"failures + edge cases"| PROD
    FB -->|"thumbs-down traces"| PROD
    MON -->|"new failure modes"| OFF
```

Read this diagram as three connected loops:

1. **Pre-deploy loop (top):** Datasets feed **offline evals**. Passing scores allow your code to ship.
2. **Runtime protection (middle):** **Guardrails** inspect inputs, retrieved context, tool calls, and outputs on every live request.
3. **Learning flywheel (bottom):** Live requests produce **traces** and **user feedback**. Online evals flag bad traces, which you label and add back to your datasets.

---

## 1. Axis A: When (offline vs online vs runtime guardrails)

Every check runs at one of three times: before deployment, after a live response, or during a live request.

| Dimension | Offline evals | Online evals | Runtime guardrails |
|---|---|---|---|
| **What it runs on** | Fixed datasets (golden, synthetic, past bugs) | Live production traffic (all or sampled) | Every live request, inline |
| **When it runs** | Before deploy (local dev, CI, release gate) | After the response (async, seconds to hours later) | During the request, before the next step runs |
| **Has reference data?** | Usually **Yes** | Usually **No**: reference-free checks on all sampled traffic; reference-based checks only on a labeled sample, after a delay | **Never** (reference-free only) |
| **Main goal** | Compare changes and block regressions before shipping | Catch drift, new failure modes, and live quality drops | Stop harm on this specific request |
| **Cost budget** | High (can use strong judges and human review) | Medium (use sampling and cheaper judges) | Low per request (must run on 100% of traffic) |
| **Latency budget** | Minutes to hours | Seconds to hours (users do not wait) | Milliseconds to ~1 second (users wait) |
| **Action on failure** | Fail the CI build and investigate | Send an alert and add the trace to your dataset | Allow, block, modify (mask or rewrite), escalate (to a human), or flag (log only) |
| **Detailed guides** | [02 · Offline Evals](../02-offline-evals/README.md) | [03 · Online Evals & Observability](../03-online-evals-and-observability/README.md) | [04 · Guardrails](../04-guardrails/README.md) |

Three useful bridges between these modes:

- **Shadow mode:** Run a new model, prompt, or guardrail on live traffic without showing its output to users. You get real-world scores with zero user risk. (A shadow model must not call side-effecting tools such as `send_email`; stub or block its writes.)
- **Canary rollout:** Route 1–5% of live traffic to the new version and watch online evals before rolling out to 100%.
- **Red teaming:** Attack the system offline to build an adversarial dataset, then use that dataset in CI to test your runtime guardrails. See [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md).

---

## 2. Axis B: Scope (end-to-end vs component)

An agentic RAG system is a chain of steps. You can score the **entire chain** from question to final answer, or you can isolate and score **one step** at a time.

```mermaid
flowchart LR
    Q["User query"] --> QR["Query rewriter"]
    QR --> RT["Router / planner"]
    RT --> RET["Retriever"]
    RET --> RR["Reranker"]
    RR --> GEN["Generator"]
    RT --> SQLG["SQL generator"]
    SQLG --> EXEC["SQL execution"]
    EXEC --> GEN
    RT --> TC["Tool caller"]
    TC --> GEN
    GEN --> CIT["Citation step"]
    CIT --> A["Answer / action"]
```

| Dimension | End-to-end (E2E) evals | Component evals |
|---|---|---|
| **Question answered** | *"Did the user get a right, safe, helpful result?"* | *"Did this specific step do its job?"* |
| **Inputs & outputs** | User question → Final answer or action | Fixed step input → Single step output |
| **Strength** | Measures what the user actually experiences | Pinpoints the exact broken step; runs fast and cheap |
| **Weakness** | Hard to tell *which* step caused a low score | High component scores do not guarantee a good final answer |
| **Example metrics** | Answer correctness, faithfulness, task success | Recall@k, nDCG@k, routing accuracy, SQL execution accuracy |

> **Rule of thumb:** Use **end-to-end evals** to see *if* your system is healthy. Use **component evals** to see *where* it is broken. Run both.

### 2.1 Component-by-component lookup

| Component | What goes wrong | Key component evals | Needs reference data? | Guide |
|---|---|---|---|---|
| **Query rewriter** | Drops dates/regions or changes user intent | Intent preservation (judge), downstream recall gain | Optional | [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md) |
| **Router / planner** | Picks the wrong path (docs vs. SQL vs. tool) | Routing accuracy (exact match), plan quality (judge) | Yes (route label) | [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md) |
| **Retriever** | Misses the relevant document chunks | Recall@k, Hit Rate@k, MRR, context recall | Yes (doc IDs) or judge | [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md) |
| **Reranker** | Ranks relevant chunks below noisy chunks | nDCG@k, MAP, Precision@k, context precision | Yes (graded labels) or judge | [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md) |
| **Tool caller** | Picks wrong tool, invents arguments, or loops | Tool selection accuracy, argument schema check | Yes (expected call) | [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md) |
| **SQL generator** | Uses wrong table, join, or filter; writes unsafe SQL | Execution accuracy, SQL syntax check, safety rules | Yes (gold SQL/result) | [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md) |
| **Generator** | Hallucinates, skips facts, breaks format, or is rude | Faithfulness, answer relevancy, answer correctness | Mixed | [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md), [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md) |
| **Citation step** | Omits citations, cites wrong doc, or invents IDs | Citation precision, citation recall, ID existence check | Optional | [Instruction & Citation Adherence](../02-offline-evals/06-instruction-and-citation-adherence.md) |
| **Whole agent** | Fails the overall goal or takes too many steps | Task success rate, trajectory match, step count | Yes (success criteria) | [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md) |

---

## 3. Axis C: Method (how the check is computed)

You can build a check using five different methods. Always start at the top of this table and move down only when a simpler method cannot test your rule.

| Method | Examples | Cost & speed | Best used for | Watch out for |
|---|---|---|---|---|
| **1. Deterministic code** | Regex, JSON schema, SQL parser, exact ID match, length check, RBAC check | Free · microseconds | Formats, schemas, SQL safety, tool arguments, permissions | Too rigid for free-form text |
| **2. Statistical & IR math** | Recall@k, nDCG, MRR, ROUGE, exact match; model-based similarity (embedding cosine, [BERTScore](https://arxiv.org/abs/1904.09675)) | Very cheap · milliseconds for pure math; model-based similarity needs an embedding or encoder model (about 10–100 ms, like a small classifier) | Retrieval ranking, short factual answers | Embedding similarity often gives high scores to wrong answers on the right topic |
| **3. Small ML classifiers** | Toxicity models, PII NER (Presidio), NLI entailment models, injection detectors | Cheap · 10–100 ms | Runtime guardrails for PII, toxicity, prompt injection, and fast groundedness | Can struggle on unusual domain jargon; requires threshold tuning |
| **4. LLM-as-a-judge** | Binary Pass/Fail rubric prompts for faithfulness, correctness, or tone | Moderate to high · 0.5–5 seconds | Semantic checks, completeness, tone, and complex rules | Position bias, verbosity bias, self-preference bias ([Panickssery et al., 2024](https://arxiv.org/abs/2404.13076)), and model drift; must be validated against human labels |
| **5. Human review (SMEs)** | Expert grading, side-by-side comparisons, error analysis | Expensive · hours to days | Creating golden datasets, calibrating LLM judges, launch sign-off | Slow and expensive; requires clear written rubrics so reviewers agree |

> **Golden rule of grading:** Use **code** whenever possible. Use **LLM judges** when you need semantic understanding. Use **humans** to define "good" and to calibrate your LLM judges. As a rule of thumb, trust a judge only when it reaches TPR ≥ 0.85, TNR ≥ 0.85, and Cohen's κ ≥ 0.60 on a **held-out** split of at least 100 human-labeled items with at least 30–50 Fails (aim for ≥ 0.90 on high-risk slices). Re-validate after any change to the judge model or prompt. See [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md).

---

## 4. Axis D: Ground truth (reference-based vs reference-free)

Some checks compare the system's output against a known-correct **reference answer** (ground truth). Other checks grade the output using only the question and the retrieved context.

| Dimension | Reference-based checks | Reference-free checks |
|---|---|---|
| **What inputs it needs** | Question + System output + **Reference data** (gold answer, doc IDs, or SQL) | Question + Retrieved context + System output (no reference data) |
| **Example checks** | Answer correctness, context recall, Recall@k, nDCG, SQL execution accuracy | Faithfulness, answer relevancy, PII detection, toxicity, SQL safety, format checks |
| **Where it can run** | **Offline**, and **online on a labeled sample** of production traces (SMEs label them, or a delayed outcome arrives). **Never as a runtime guardrail**, because a new live request has no reference answer. | **Offline, online, and as runtime guardrails** |
| **Main strength** | Directly measures whether the answer is **true and complete** | Runs on any live traffic with zero human labeling |
| **Main weakness** | Reference datasets are slow to build and go stale when policies change | A faithfulness check cannot tell if an answer is **wrong** when the retrieved document itself is wrong or outdated (use metadata checks such as `status` and `effective_date` for that) |

> **Why you need both:** An answer can be **100% faithful** to an outdated 2021 document and still be **100% wrong**. Conversely, an answer can be **correct by luck** from pre-training memory while ignoring your documents. Combine reference-free checks (faithfulness) with reference-based checks (answer correctness). See [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md).

---

## 5. Axis E: Guardrail mode (blocking vs non-blocking, sync vs async)

When you run a check at runtime as a guardrail, you must make two design choices:

1. **Blocking vs. non-blocking:** Does it change what the user gets, or does it just log an alert?
2. **Synchronous vs. asynchronous:** Does the request wait for the check to finish?

| Mode | How it behaves | Typical examples |
|---|---|---|
| **Blocking (enforcing)** | Allows, denies, modifies (masks PII, strips bad citations), or escalates to a human. Must have very few false positives. | RBAC retrieval filters, read-only SQL checks, PII redaction, human confirmation before `create_ticket`. |
| **Non-blocking (observing)** | Flags, scores, and logs the event without stopping the response. Great for testing new guardrails safely. | Shadow-mode classifiers, async faithfulness scoring, anomaly alerts on tool calls. |
| **Synchronous (in-path)** | Runs before the next step starts. Directly adds latency to the user's request, so it can prevent harm before it happens. | Input injection checks, RBAC filters, SQL syntax/safety checks, fast output regexes. |
| **Asynchronous (out-of-path)** | Runs in parallel or after the response is sent. Adds zero latency unless it cancels a live stream. | Sampled LLM judges, audit logging, drift monitors. |

Four practical runtime patterns:

- **Parallel guardrail:** Start your input guardrail and your LLM call at the same time. If the guardrail fires, cancel the LLM call before showing anything to the user. **Use this only for text-only turns.** In parallel mode the agent may already have spent tokens or **called a tool** (such as `create_ticket` or `send_email`) before the guardrail fires. For tool-enabled turns, run the input guardrail in **blocking** mode first (for example, `run_in_parallel=False` in the [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/guardrails/)).
- **Streaming tripwire:** Stream tokens to the user while a background check watches the output. If the check detects a leak, cut the stream and replace the message.
- **Staged rollout (`shadow` → `flag` → `block`):** Deploy every new guardrail in **non-blocking** `shadow` mode first (log only). Measure how often it false-triggers on real users. Then move to `flag` (log and alert, or show a warning) and finally to `block`.
- **Tiered checking:** Run a fast regex or small classifier synchronously on every request. Call a slower LLM judge only when the fast classifier is unsure.

Every guardrail is a classifier, so it has a **false-positive rate** (it blocks good requests) and a **recall** (the share of bad requests it catches; attack success rate = 1 − recall on an attack set). Measure both offline before you switch to `block`. Sections 5.2 and 5.3 cover what to do when a guardrail fails and how latency adds up.

### 5.1 Where guardrails sit in the pipeline

```mermaid
flowchart LR
    U["User input"] --> G1{"1. Input guardrails: injection, PII, topic, rate limit"}
    G1 -->|deny| X1["Polite refusal"]
    G1 -->|allow| P["Planner / router"]
    P --> R["Retriever"]
    R --> G2{"2. Context guardrails: RBAC filter, indirect injection, freshness, relevance cutoff"}
    G2 --> LLM["Generator"]
    P --> S["SQL generator"]
    S --> G3{"3. SQL guardrails: SELECT-only, table allowlist, row-level security"}
    G3 --> DB[("Warehouse")]
    P --> T["Tool caller"]
    T --> G4{"4. Tool guardrails: JSON schema, role authZ, egress allowlist, human confirmation, step limit"}
    G4 --> API["Tools / APIs"]
    DB --> LLM
    API --> LLM
    LLM --> G5{"5. Output guardrails: faithfulness, PII, toxicity, valid citations, schema"}
    G5 -->|allow / modify| OUT["Final response"]
    G5 -->|deny| X2["Safe fallback"]
```

| Pipeline stage | Detailed guide |
|---|---|
| **1. Input** | [Input Guardrails](../04-guardrails/02-input-guardrails.md) |
| **2. Retrieval & context** | [Retrieval & Context Guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md) |
| **3. SQL & 4. Tools** | [Tool & Action Guardrails](../04-guardrails/05-tool-and-action-guardrails.md) |
| **5. Output** | [Output Guardrails](../04-guardrails/04-output-guardrails.md) |
| **Cross-cutting permissions** | [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md) |
| **Security threats & attacks** | [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md) |

### 5.2 Fail open or fail closed?

A guardrail can time out or crash. Decide in advance what happens then:

- **Fail closed** (block, or fall back to a safe answer) for tool-enabled turns, Tier 3 (high-risk) intents such as HR and finance, and all access-control checks. If an injection classifier times out on a tool-enabled turn, block the turn or continue in a **no-tools** mode.
- **Fail open, and flag the trace** only for read-only, low-risk turns, where a short outage of a quality check is less harmful than blocking every user.

### 5.3 Latency adds up

Sync guardrails run in series on the request path, so their latency adds up. Rules of thumb for each stage: input checks 50–150 ms, retrieval and context checks 10–50 ms (plus 50–150 ms if you run a chunk-level injection classifier), tool-call gates 5–50 ms, and output checks 100–800 ms. Keep the total guardrail overhead at or below about 20–30% of end-to-end latency. Run independent checks in parallel where it is safe (Section 5 explains when parallel is unsafe). See [Guardrails Architecture](../04-guardrails/01-guardrails-architecture.md) for the full latency budgets and failure-mode design.

---

## 6. Master lookup tables

Use these two tables to find any metric or guardrail in the repository.

**Legend:**

- **When:**
    - `Off` = Offline eval
    - `On` = Online eval
    - `GR` = Runtime guardrail (`✅` = standard, `◐` = possible on a sample or with latency trade-offs, `❌` = not applicable)
- **Ref:**
    - `Yes` = Needs reference data
    - `No` = Reference-free
    - `Opt` = Both versions exist
    - For `Ref = Yes` rows, `On = ◐` means the check runs online only on a labeled sample of traces, after a delay
- **Method:**
    - `Code` (deterministic code; `Code (metadata)`, `Code (policy)`, and `Code (canary token)` name what the code checks)
    - `Rules` / `Regex` (pattern lists and regular expressions, a kind of deterministic code)
    - `Policy` (a written business rule, such as "confirm before any write", enforced by the app)
    - `DB roles` (database permissions, such as a read-only role and row-level security)
    - `Stat` (statistical/IR math; `Stat (model-based)` needs an embedding or encoder model)
    - `Clf` (ML classifier; `Clf (NER)` = named-entity recognition, `Clf (NLI)` = entailment model)
    - `Judge` (LLM judge)
    - `Human`

### 6.1 Evals lookup table

| Eval / metric | Scope | Method | Ref | Off | On | GR | Guide |
|---|---|---|---|:-:|:-:|:-:|---|
| **Answer correctness** | E2E | Judge / Stat | Yes | ✅ | ◐ | ❌ | [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md) |
| **Faithfulness (groundedness)** | E2E / Generator | Judge / Clf | No | ✅ | ✅ | ◐ | [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md) |
| **Answer relevancy** | E2E / Generator | Judge / Stat | No | ✅ | ✅ | ◐ | [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md) |
| **Context recall** | Retriever | Judge / Code | Yes | ✅ | ❌ | ❌ | [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md) |
| **Context precision** | Retriever / Reranker | Judge / Code | Opt | ✅ | ✅ | ❌ | [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md) |
| **Precision@k, Recall@k, F1@k** | Retriever | Code | Yes | ✅ | ❌ | ❌ | [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md) |
| **Hit Rate@k, MRR, MAP, nDCG@k** | Retriever / Reranker | Code | Yes | ✅ | ❌ | ❌ | [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md) |
| **BLEU, ROUGE, token F1** | Generator | Stat | Yes | ✅ | ❌ | ❌ | [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md) |
| **Semantic similarity (BERTScore)** | Generator / E2E | Stat (model-based) | Yes | ✅ | ❌ | ❌ | [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md) |
| **Toxicity & profanity** | Generator | Clf / Judge | No | ✅ | ✅ | ✅ | [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md) |
| **Bias & fairness** | Generator | Judge / Clf | No | ✅ | ✅ | ◐ | [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md) |
| **Tone & conciseness** | Generator | Judge | No | ✅ | ✅ | ❌ | [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md) |
| **Routing accuracy** | Router | Code | Yes | ✅ | ◐ | ❌ | [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md) |
| **Tool selection accuracy** | Tool caller | Code / Judge | Opt | ✅ | ◐ | ❌ | [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md) |
| **Tool argument validity** | Tool caller | Code / Judge | Opt | ✅ | ✅ | ✅ | [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md) |
| **Trajectory match** | Agent | Code | Yes | ✅ | ❌ | ❌ | [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md) |
| **Trajectory efficiency (step count)** | Agent | Code / Judge | No | ✅ | ✅ | ✅ | [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md) |
| **Task success (goal completion)** | E2E Agent | Judge / Code | Opt | ✅ | ✅ | ❌ | [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md) |
| **pass@k / pass^k (repeated trials)** | E2E Agent | Code | Opt | ✅ | ❌ | ❌ | [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md) |
| **SQL execution accuracy / test-suite accuracy** | SQL generator | Code | Yes | ✅ | ❌ | ❌ | [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md) |
| **SQL exact / component match** | SQL generator | Code / Stat | Yes | ✅ | ❌ | ❌ | [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md) |
| **SQL syntax validity** | SQL generator | Code | No | ✅ | ✅ | ✅ | [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md) |
| **SQL safety rules** | SQL generator | Code | No | ✅ | ✅ | ✅ | [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md), [Tool Guardrails](../04-guardrails/05-tool-and-action-guardrails.md) |
| **Instruction & format adherence** | Generator / E2E | Code / Judge | No | ✅ | ✅ | ✅ | [Instruction & Citation Adherence](../02-offline-evals/06-instruction-and-citation-adherence.md) |
| **Citation precision & recall** | Citation step | Code / Judge | Opt | ✅ | ✅ | ◐ | [Instruction & Citation Adherence](../02-offline-evals/06-instruction-and-citation-adherence.md) |
| **Pairwise preference (A vs. B)** | E2E | Judge / Human | No | ✅ | ◐ | ❌ | [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md) |
| **Judge–human agreement (TPR/TNR, κ)** | Meta-eval | Code + Human | Yes | ✅ | ◐ | ❌ | [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md) |
| **Guardrail false-positive rate & recall (attack success rate)** | Meta-eval | Code + Human | Yes | ✅ | ◐ | ❌ | [Guardrails Architecture](../04-guardrails/01-guardrails-architecture.md), [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md) |
| **User feedback signals** | E2E | Human | No | ❌ | ✅ | ❌ | [User Feedback & Implicit Signals](../03-online-evals-and-observability/03-user-feedback-and-implicit-signals.md) |
| **Latency, cost, token & error rates** | System | Code | No | ✅ | ✅ | ✅ | [Observability & Tracing](../03-online-evals-and-observability/02-observability-and-tracing.md), [Monitoring](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md) |
| **Input & retrieval drift** | System | Stat | No | ❌ | ✅ | ❌ | [Monitoring, Alerting & Drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md) |

### 6.2 Guardrails lookup table

| Guardrail | Stage | Method | Typical action | Sync / Async | Guide |
|---|---|---|---|---|---|
| **Direct prompt-injection & jailbreak check** | Input | Clf / Rules | Deny | Sync (often parallel) | [Input Guardrails](../04-guardrails/02-input-guardrails.md) |
| **Input PII detection & masking** | Input | Clf (NER) / Regex | Modify (redact) | Sync | [Input Guardrails](../04-guardrails/02-input-guardrails.md) |
| **Topic & scope check** | Input | Clf / Judge | Deny (polite refusal) | Sync | [Input Guardrails](../04-guardrails/02-input-guardrails.md) |
| **SQL / code-in-input detector** | Input | Code / Clf | Deny or flag | Sync | [Input Guardrails](../04-guardrails/02-input-guardrails.md) |
| **Rate limit & input length cap** | Input | Code | Deny | Sync | [Input Guardrails](../04-guardrails/02-input-guardrails.md) |
| **Document RBAC / ACL filter** | Retrieval | Code (metadata) | Filter chunks | Sync | [Retrieval Guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md), [Access Control](../04-guardrails/06-access-control-rbac.md) |
| **Indirect prompt-injection scanner** | Context | Clf / Rules | Drop chunk or flag | Sync | [Retrieval Guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md) |
| **Minimum relevance cutoff** | Context | Stat / Clf | Modify (abstain) | Sync | [Retrieval Guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md) |
| **Document freshness & version check** | Context | Code (metadata) | Drop superseded chunk or flag conflict | Sync | [Retrieval Guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md) |
| **SQL read-only & table allowlist** | Tool (SQL) | Code + DB roles | Deny | Sync | [Tool Guardrails](../04-guardrails/05-tool-and-action-guardrails.md), [Access Control](../04-guardrails/06-access-control-rbac.md) |
| **Tool argument JSON schema check** | Tool | Code | Deny + ask LLM to retry | Sync | [Tool Guardrails](../04-guardrails/05-tool-and-action-guardrails.md) |
| **Per-role tool authorization** | Tool | Code (policy) | Deny | Sync | [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md) |
| **Egress & recipient allowlist** | Tool | Code (policy) | Deny | Sync | [Tool Guardrails](../04-guardrails/05-tool-and-action-guardrails.md) |
| **Human-in-the-loop confirmation** | Tool | Policy | Escalate to user/human | Sync | [Tool Guardrails](../04-guardrails/05-tool-and-action-guardrails.md) |
| **Max step & token budget limits** | Agent | Code | Stop agent loop | Sync | [Tool Guardrails](../04-guardrails/05-tool-and-action-guardrails.md) |
| **Output groundedness check** | Output | Clf (NLI) / Judge | Regenerate once, then abstain with sources (Tier 3); flag (lower tiers) | Sync and blocking for Tier 3; async otherwise | [Output Guardrails](../04-guardrails/04-output-guardrails.md) |
| **Output PII & secret redaction** | Output | Clf / Regex | Modify (redact) | Sync | [Output Guardrails](../04-guardrails/04-output-guardrails.md) |
| **Output toxicity & brand safety** | Output | Clf / Judge | Deny or modify | Sync / Streaming | [Output Guardrails](../04-guardrails/04-output-guardrails.md) |
| **Citation ID validator** | Output | Code / Judge | Strip invalid citations | Sync | [Output Guardrails](../04-guardrails/04-output-guardrails.md) |
| **Output JSON schema validator** | Output | Code | Repair or retry | Sync | [Output Guardrails](../04-guardrails/04-output-guardrails.md) |
| **System-prompt canary check** | Output | Code (canary token) | Deny | Sync | [Output Guardrails](../04-guardrails/04-output-guardrails.md), [Threat Model](../04-guardrails/07-threat-model-owasp.md) |

Not sure which ones to pick first? Use the [Eval Selection Decision Tree](../05-decision-framework/01-eval-selection-decision-tree.md) and the [Guardrail Selection Decision Tree](../05-decision-framework/02-guardrail-selection-decision-tree.md).

---

## 7. Datasets: the fuel for offline evals

Every offline eval requires dataset columns that match its inputs:

| Eval type | Required columns in each row | Example from Acme Internal Assistant |
|---|---|---|
| **Retrieval metrics** | `question`, `relevant_doc_ids` | `"What is the parental leave policy?"` → `["hr-policy-2024#leave"]` |
| **E2E RAG (reference-based)** | `question`, `reference_answer` | `"How many PTO days for L5?"` → `"25 days per year"` |
| **E2E RAG (reference-free)** | `question` (your app generates the answer and context) | Any real user question |
| **Text-to-SQL** | `question`, `gold_sql` (or `expected_result`), one or more `db_snapshot`s (several database states give **test-suite accuracy**) | `"Q3 revenue by region"` → `SELECT region, SUM(rev)...` |
| **Tool & trajectory** | `input`, `expected_tool_calls` (or `success_criteria`) | `"Open a P2 VPN ticket"` → `create_ticket(priority="P2")` |
| **Safety & guardrails** | `input`, `expected_decision` (`allow` / `deny` / `redact`) | `"Ignore previous instructions..."` → `deny` |
| **RBAC permissions** | `user_role`, `question`, `forbidden_doc_ids` (or `must_refuse`) | `role="employee"` asks for executive pay → `must_refuse=true` |
| **Judge calibration** | `input`, `output`, `human_label`, `human_reason`, `split` (`train` / `dev` / `test`) | At least 100 traces graded Pass/Fail by an SME, with at least 30–50 Fails; report agreement on the held-out `test` split |

You will build these datasets from three main sources:

1. **[SME Golden Datasets](../01-datasets/02-sme-golden-datasets.md):** Written or verified by domain experts. Highest quality, slowest to build.
2. **[Synthetic Datasets](../01-datasets/03-synthetic-datasets.md):** Generated by LLMs from your documents and schemas. Fast way to test edge cases before launch.
3. **[Production Samples](../01-datasets/04-production-data-flywheel.md):** Real user traces pulled from production logs and labeled by experts.

See [Dataset Strategy](../01-datasets/01-dataset-strategy.md) for how to size and combine them.

---

## 8. The production data flywheel

Your eval suite should improve automatically as real users interact with your system:

```mermaid
flowchart LR
    P["1. Production traffic"] --> T["2. Traces + guardrail logs + user feedback"]
    T --> S["3. Sample failures, thumbs-down, and guardrail blocks"]
    S --> EA["4. Error analysis: open + axial coding"]
    EA --> L["5. Label with SMEs"]
    L --> D["6. Update versioned datasets"]
    D --> OE["7. Run offline evals in CI"]
    EA --> NE["Build new checks or guardrails"]
    NE --> OE
    OE --> REL["8. Ship better release"]
    REL --> P
```

Three habits keep this flywheel spinning:

1. **Treat every guardrail block and thumbs-down click as a candidate test row.**
2. **Keep your regression dataset separate from your capability dataset.** Regression rows test bugs that must never break again; capability rows test hard problems you are still trying to solve.
3. **Scrub PII before saving production traces into datasets.** See [Production Data Flywheel](../01-datasets/04-production-data-flywheel.md).

---

## 9. One check, three deployments: code example

Let's take a single check (*"Is every claim in the answer supported by the retrieved context?"*) and run it in all three places:

| Where it runs | How it is configured | What happens when it fails |
|---|---|---|
| **1. Offline eval (in CI)** | Run a strong LLM judge across your 300-row golden dataset on every pull request. | Fail the CI build if the pass rate drops below your baseline by more than the noise (see [Why Evals §5.4](./01-why-evals-and-guardrails.md#54-is-the-change-real-statistics-in-one-page)). |
| **2. Online monitor (in prod)** | Run a cheaper judge asynchronously on 1–5% of live traces (or about 500 per day), plus 100% of flagged and thumbs-down traces. | Log pass/fail per trace, page the team if the 24-hour rolling pass rate drops, and send failed traces to the labeling queue. |
| **3. Runtime guardrail (in-path)** | Run a fast NLI classifier synchronously, in blocking mode, before returning answers on Tier 3 routes (HR, finance). | Regenerate the answer once with a stricter prompt. If it still fails, abstain and show the sources checked. If the classifier times out or crashes, fail closed (abstain). |

The code below uses only the standard library (Python 3.9+). `app` and the judges are your own functions. `app(question, strict=False)` returns `(answer, chunks)`, where each chunk is a dict with `doc_id` and `text`. Each judge returns `(passed, score, reason)`. To try the code, stub them (for example, `def judge(answer, texts): return (True, 0.95, "ok")`).

```python
import random
from dataclasses import dataclass
from typing import Callable, Optional

@dataclass
class Verdict:
    passed: bool
    score: Optional[float]
    reason: str

# A judge returns (passed, score, reason). Each judge applies its OWN calibrated
# threshold, because an LLM judge, a cheap judge, and an NLI model use different scales.
Judge = Callable[[str, list[str]], tuple[bool, float, str]]

def check_faithfulness(answer: str, chunks: list[dict], judge: Judge) -> Verdict:
    """One shared check function used across offline, online, and runtime."""
    passed, score, reason = judge(answer, [c["text"] for c in chunks])
    return Verdict(passed=passed, score=score, reason=reason)

# 1. Offline eval: score a dataset in CI
def run_offline_eval(dataset_rows: list[dict], app, strong_judge: Judge) -> float:
    if not dataset_rows:
        raise ValueError("Dataset is empty; refusing to report a pass rate.")
    verdicts = [
        check_faithfulness(*app(row["question"]), strong_judge)
        for row in dataset_rows
    ]
    return sum(v.passed for v in verdicts) / len(verdicts)

# 2. Online monitor: score a sample of traces, plus every thumbs-down
def _score_trace(trace: dict, cheap_judge: Judge, log_metric, enqueue_for_review) -> Verdict:
    verdict = check_faithfulness(trace["answer"], trace["chunks"], cheap_judge)
    log_metric("faithfulness_pass", int(verdict.passed), trace_id=trace["id"])
    if not verdict.passed:
        enqueue_for_review(trace["id"], verdict.reason)  # labeling queue
    return verdict

def on_trace_logged(trace, cheap_judge, log_metric, enqueue_for_review,
                    sample_rate: float = 0.05, rng=random.random):
    """Runs async after the response. Samples 1-5% of traffic."""
    if rng() < sample_rate:
        return _score_trace(trace, cheap_judge, log_metric, enqueue_for_review)
    return None

def on_feedback(trace, feedback: str, cheap_judge, log_metric, enqueue_for_review):
    """Feedback arrives after the trace is logged, so score 100% of thumbs-down here."""
    if feedback == "thumbs_down":
        return _score_trace(trace, cheap_judge, log_metric, enqueue_for_review)
    return None

# 3. Runtime guardrail: sync and blocking on Tier 3 (HR, finance) routes
def _abstain(chunks: list[dict]) -> str:
    sources = ", ".join(sorted({c["doc_id"] for c in chunks})) or "none"
    return ("I could not verify an answer in the documents you can access. "
            f"Sources I checked: {sources}.")

def answer_with_guardrail(question: str, app, fast_judge: Judge, is_high_risk: bool) -> str:
    answer, chunks = app(question)
    if not is_high_risk:
        return answer  # lower tiers: score async with on_trace_logged instead
    for attempt in range(2):  # first answer, then one stricter regeneration
        if attempt == 1:
            answer, chunks = app(question, strict=True)
        try:
            verdict = check_faithfulness(answer, chunks, fast_judge)
        except Exception:  # judge timeout or crash: fail closed on Tier 3
            return _abstain(chunks)
        if verdict.passed:
            return answer
    return _abstain(chunks)
```

You can use this exact three-way pattern for PII checks, SQL safety checks, tool schema checks, and citation checks.

---

## 10. Where to go next

| If you want to… | Read this next |
|---|---|
| See how agentic RAG systems break at each step | [03 · Agentic RAG Failure Modes](./03-agentic-rag-failure-modes.md) |
| Look up an unfamiliar term | [04 · Glossary](./04-glossary.md) |
| Design and label your datasets | [01 · Datasets](../01-datasets/README.md) |
| Implement offline metrics and LLM judges | [02 · Offline Evals](../02-offline-evals/README.md) |
| Set up tracing, online evals, and drift alerts | [03 · Online Evals & Observability](../03-online-evals-and-observability/README.md) |
| Add input, retrieval, tool, and output guardrails | [04 · Guardrails](../04-guardrails/README.md) |
| Pick the right checks for your system today | [05 · Decision Framework](../05-decision-framework/README.md) |
| Compare open-source and commercial tools | [06 · Tooling Landscape](../06-tooling-landscape/README.md) |

---

## Key takeaways

- **Classify any check on five axes:** **When** (offline, online, runtime), **Scope** (end-to-end vs. component), **Method** (code, math, classifier, LLM judge, human), **Reference data** (reference-based vs. reference-free), and **Guardrail mode** (blocking vs. non-blocking, sync vs. async).
- **Pair end-to-end evals with component evals.** End-to-end evals tell you *if* the user got a good answer; component evals tell you *which step* broke.
- **Only reference-free checks work as runtime guardrails.** Reference-based checks need labeled references, so they run offline or online on a labeled sample of traces.
- **Start with deterministic code checks.** Reach for LLM judges only when code cannot test the rule, and always validate judges against human labels on a held-out split.
- **Roll out new guardrails as `shadow` → `flag` → `block`.** Measure false positives on real traffic before blocking live users.
- **Decide failure behavior in advance.** Fail closed on tool-enabled and Tier 3 turns; fail open (and flag) only on read-only, low-risk turns. Do not run a guardrail in parallel with an agent that can call side-effecting tools.

## Further reading

- Es et al., 2023, [Ragas: Automated Evaluation of Retrieval Augmented Generation](https://arxiv.org/abs/2309.15217) · [RAGAS documentation](https://docs.ragas.io/)
- Zheng et al., 2023, [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685)
- Shankar et al., 2024, [Who Validates the Validators?](https://arxiv.org/abs/2404.12272)
- Hamel Husain, [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/)
- Eugene Yan, [Patterns for Building LLM-based Systems & Products](https://eugeneyan.com/writing/llm-patterns/)
- OWASP, 2026, [Top 10 for LLM Applications 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/)
- OpenAI, [Agents SDK: Guardrails](https://openai.github.io/openai-agents-python/guardrails/) (parallel vs blocking execution)
- Zhang et al., 2019, [BERTScore: Evaluating Text Generation with BERT](https://arxiv.org/abs/1904.09675)
- Zhong, Yu & Klein, 2020, [Semantic Evaluation for Text-to-SQL with Distilled Test Suites](https://arxiv.org/abs/2010.02840)
- Anthropic, [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- **Next guide:** [Agentic RAG Failure Modes](./03-agentic-rag-failure-modes.md)
