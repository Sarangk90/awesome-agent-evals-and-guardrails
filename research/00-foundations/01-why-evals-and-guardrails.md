# Why Evals and Guardrails

> **TL;DR**
> - **Demos are easy, but reliability is hard.** You can build an agentic RAG prototype in days. Making it safe and accurate in production takes months.
> - **Evals measure; guardrails enforce.** Evals score system quality on datasets or traffic samples. Guardrails block or fix unsafe behavior on live requests.
> - **One check powers both.** You write a check once (such as *"Is this answer supported by retrieved docs?"*) and run it offline, online, or at runtime.
> - **Start with error analysis, not metrics.** Read real traces first, group your actual failures, and build checks only for what breaks.

- **You will learn:** Why prototypes fail in production · How evals and guardrails share checks · How to run the **Analyze → Measure → Improve** loop · What makes an agent reliable · Who owns what on the team
- **Prerequisites:** None — start here
- **Related guides:** [The Evals & Guardrails Map](./02-the-evals-and-guardrails-map.md) · [Failure Modes](./03-agentic-rag-failure-modes.md) · [Glossary](./04-glossary.md) · [Implementation Playbook](../05-decision-framework/04-implementation-playbook.md)

---

## 1. The running example

Abstract rules are hard to remember. To keep every concept concrete, this guide uses one example system throughout:

> **Acme Internal Assistant** — an enterprise agent that does four jobs:
> 1. **Answers document questions** over company policies, wikis, and runbooks using **vector search + reranking**.
> 2. **Answers data questions** by **generating SQL** and running it against a data warehouse.
> 3. **Takes actions** by calling tools such as `create_ticket` and `lookup_employee`.
> 4. **Enforces role-based access control (RBAC)** across roles (Employee, Manager, HR, Finance, Admin) for every document, table, and tool.

```mermaid
flowchart LR
    U["User - role: Manager"] --> IG["Input guardrails"]
    IG --> R["Router / planner LLM"]
    R -->|docs question| RET["Retriever + reranker"]
    R -->|analytics question| SQL["Text-to-SQL"]
    R -->|action| T["Tool caller"]
    RET --> G["Generator"]
    SQL --> DW[("Data warehouse")]
    DW --> G
    T --> API["Ticketing API"]
    API --> G
    G --> OG["Output guardrails"]
    OG --> U
```

How to read this diagram:
- **Every box can fail on its own.** The router can pick the wrong path, the retriever can miss a policy doc, or the SQL generator can join the wrong table.
- **Every arrow passes errors downstream.** If the retriever fetches an outdated 2022 policy, the generator will confidently state the wrong rule.

---

## 2. Why reliability is the hard part

### 2.1 The gap between a demo and production

Building a prototype that answers ten hand-picked questions is easy. Running that same system for thousands of real users is much harder:

| Prototype reality | Production reality |
|---|---|
| 10–20 clear questions written by the developer | Thousands of messy questions with typos, slang, and follow-ups |
| Clean, hand-picked documents | Stale, duplicated, contradictory, and permission-restricted files |
| One test user with full access | Many user roles, each allowed to see different data |
| Happy-path tool calls | Bad arguments, API timeouts, partial failures, and retries |
| Developer checks answers by eye ("looks good") | Users act on wrong answers ("it gave me the wrong parental leave rule") |
| Friendly testers | Curious users, malicious attackers, and poisoned documents |
| Cost and latency do not matter | Cost per query and p95 latency are strict product limits |

The LLM itself is rarely your main bottleneck. Your real bottleneck is **knowing whether the system works**, **knowing when it breaks**, and **preventing harm when it fails**.

### 2.2 Non-determinism (the same input gives different outputs)

Traditional software returns the same output for the same input. LLM systems change their behavior across four layers:

- **Sampling:** At `temperature > 0`, the model samples different tokens on each run. Even at `temperature = 0`, hosted APIs are rarely bit-identical because of hardware batching.
- **Model drift:** Cloud providers update model weights behind an alias, which can silently change how your prompts behave.
- **Data drift:** Your document index and database change daily. The same question retrieves different chunks tomorrow than it did today.
- **Path dependence:** In a multi-step agent, a small change in step 1 (such as picking a different tool) creates a completely different path.

What this means for how you test:
1. **One test case proves almost nothing.** You need a **dataset** of many inputs—and sometimes multiple runs per input—to measure behavior reliably. See [Running Offline Experiments](../02-offline-evals/08-running-offline-experiments.md).
2. **Exact string matching fails on free text.** Instead, use **structural checks** (JSON schema, SQL results) or **semantic checks** (LLM-as-a-judge, embeddings).
3. **Report pass rates, not single pass/fail booleans.** Measure percentages (such as *92% faithfulness*) and track how they move over time.

### 2.3 Errors compound across steps

When an agent runs multiple steps in sequence, small error rates multiply fast:

```text
P(end-to-end success) ≈ P(route) × P(retrieve) × P(generate) × P(cite) ...

Illustrative math (assuming independent steps):
  5 steps at 95% reliability each  → 0.95^5  ≈ 77% end-to-end success
  10 steps at 95% reliability each → 0.95^10 ≈ 60% end-to-end success
  10 steps at 99% reliability each → 0.99^10 ≈ 90% end-to-end success
```

Four rules follow from this math:
1. **Measure individual components.** An end-to-end score of 77% tells you the system is broken. Component evals tell you *which step* broke it. See [The Map — Scope](./02-the-evals-and-guardrails-map.md#2-axis-b--scope-end-to-end-vs-component).
2. **Catch silent errors.** A bad retrieval does not throw an exception. Instead, the generator writes a confident, wrong answer from the wrong chunk.
3. **Evaluate the trajectory, not just the final answer.** A good agent recovers from a tool error; a bad agent loops forever. See [Agent, Tool & Trajectory Evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md).
4. **Place guardrails between steps.** Do not wait until the final output. Filter documents by role before generation, and validate SQL before execution.

### 2.4 Your data is part of the attack surface

In classic web apps, you validate untrusted input at the API boundary. In agentic RAG, untrusted text also enters the prompt from retrieved documents, database rows, and tool outputs.

If an attacker hides malicious instructions inside a wiki page or support ticket, the LLM may read that page and obey the attacker (**indirect prompt injection**). When your agent can call tools or run SQL, a text bug becomes an unauthorized action. That is why every agent needs runtime guardrails. See [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md).

---

## 3. Evals vs. guardrails

### 3.1 How they differ

**Evals** measure system quality so your team can make decisions. **Guardrails** enforce safety and policy rules on a single live request.

| Dimension | Evals (Measure) | Guardrails (Enforce) |
|---|---|---|
| **Goal** | Measure quality and safety across many inputs | Stop harm on one live request right now |
| **When it runs** | Offline (before deploy) or online (async on live traffic) | Inline during the live request path |
| **Output** | Pass rates, scores, dashboards, CI pass/fail | Allow, deny, modify, escalate, or flag |
| **Time budget** | Seconds to hours (does not slow down users) | Milliseconds to ~1 second (users wait for it) |
| **Cost budget** | Can use slower, stronger LLM judges or human reviewers | Must be cheap enough to run on 100% of traffic |
| **Cost of a mistake** | Adds noise to a dashboard or blocks a PR | False positive blocks a real user; false negative leaks data |
| **Consumer** | Engineers, product managers, and domain experts | The application itself (plus security and ops logs) |

### 3.2 How they share the same checks

Here is the most important pattern in this repository: **a check is a single function `f(input, context, output, trace) → verdict`.**

Whether that check is an **eval** or a **guardrail** depends only on **where you run it**:

```mermaid
flowchart TD
    C["One check: 'Is the answer supported by retrieved context?'"]
    C --> O["Offline eval: run on golden dataset in CI, report faithfulness rate"]
    C --> M["Online eval: run async on 5% of prod traces, alert if rate drops"]
    C --> G["Guardrail: run sync before responding, block or regenerate if ungrounded"]
```

| Check | Used as an offline eval | Used as an online monitor | Used as a runtime guardrail |
|---|---|---|---|
| **PII detector** | % of test answers that leak PII | Daily PII leak rate in production | Mask PII before showing the answer |
| **Faithfulness check** | Faithfulness score on golden dataset | Rolling faithfulness score on 5% of traffic | Regenerate or abstain if answer is unsupported |
| **SQL safety parser** | % of test SQL queries that break rules | Count of blocked queries by role | Reject non-`SELECT` or forbidden tables before running |
| **Tool schema validator** | Tool-call accuracy rate | Rate of malformed tool calls | Reject bad arguments and ask the model to retry |
| **Prompt-injection scanner** | Recall on red-team attack dataset | Daily count of injection attempts | Block the request before calling the agent |
| **Citation validator** | Citation precision and recall scores | Rate of uncited claims in production | Strip invalid citations before returning the answer |

What this means in practice:
- **Write each check once and reuse it in three places.** Keep your check functions in a shared library.
- **Evaluate your guardrails using offline evals.** Every guardrail is a classifier. Measure its false-positive rate on normal user questions and its recall on attack datasets before turning it on. See [Guardrails Architecture](../04-guardrails/01-guardrails-architecture.md).
- **Use guardrail triggers as monitoring signals.** A sudden spike in blocked requests means you are either under attack or shipping a bug.
- **Remember that reference-based checks cannot be guardrails.** A check that compares an answer against a human-written reference answer can only run offline. Online monitors and runtime guardrails must use **reference-free** checks. See [The Map — Ground Truth](./02-the-evals-and-guardrails-map.md#4-axis-d--ground-truth-reference-based-vs-reference-free).

---

## 4. Vibes-based vs systematic evaluation

Most teams start with **vibe checks**: a developer changes a prompt, tries five questions by hand, and eyeballs the output. Vibe checks are fine on day one, but they fail as soon as your system grows.

| Vibe checks | Systematic evaluation |
|---|---|
| 5–10 questions the developer remembers to try | A versioned dataset covering real user intents and past bugs |
| *"It looks better to me now"* | *"Faithfulness rose from 81% to 88%, and p95 latency stayed flat"* |
| Users discover regressions in production | CI catches regressions before code merges |
| Prompt changes turn into opinion debates | Prompt changes are tested with data |
| Hard to compare two models fairly | Side-by-side runs on the exact same inputs |
| Breaks when a second engineer joins | Shared definition of "good" across engineering, product, and SMEs |

> **Rule of thumb:** As soon as more than one person edits prompts, retrieval, or models, build offline evals. As soon as real users touch the system, add runtime guardrails and online monitoring.

Note that systematic evaluation does **not** mean turning on 30 generic metrics from a library. Generic scores (like a vague 1–5 *"helpfulness"* rating) rarely match what your users care about. Always build evals around **your system's actual failures**.

---

## 5. The eval-driven development loop

High-performing AI teams follow a three-step loop (popularized by practitioners like Hamel Husain and Shreya Shankar):

```mermaid
flowchart LR
    A["1. Analyze: read traces and group real failures"] --> B["2. Measure: build checks for top failures"]
    B --> C["3. Improve: fix prompts, retrieval, tools, or guardrails"]
    C --> D["Ship behind CI gates + guardrails, collect new traces"]
    D --> A
```

### 5.1 Analyze — error analysis first

**Look at your data before writing code.** Do not write a single metric until you have read real traces end-to-end (question, router choice, retrieved chunks, SQL query, tool calls, and final answer).

Follow this five-step procedure to run error analysis:

1. **Collect ~100 diverse traces.** Pull them from production logs if you have users, or generate realistic test conversations across different roles and topics (see [Synthetic Datasets](../01-datasets/03-synthetic-datasets.md)). Keep reading traces until you stop finding new ways the system breaks (**theoretical saturation**).
2. **Label the first error (open coding).** Read each failed trace and write a short, plain-English note on the *first* upstream step that went wrong. Do not invent abstract categories yet. Write concrete notes:
   - *"Retrieved the 2023 PTO policy instead of the 2024 policy."*
   - *"SQL filtered on `created_at` instead of `closed_at`."*
   - *"Answer cited doc #3, but the fact came from doc #1."*
   - *"Called `create_ticket` without asking the user to confirm priority."*
3. **Group notes into failure modes (axial coding).** Cluster your notes into 5–10 clear failure categories, such as *Stale policy retrieved*, *Wrong SQL date column*, *Citation mismatch*, or *Action without confirmation*.
4. **Count and rank.** Count how many traces fall into each category. Usually, 2 or 3 failure modes cause most of your bad answers.
5. **Choose your response.** If a failure is a simple bug (like a typo in a tool description), just fix it and add one regression test. If a failure is common, subtle, or likely to come back, build a dedicated eval for it.

> **Tip:** Do this review in a simple spreadsheet or trace viewer alongside a **Subject-Matter Expert (SME)**. An engineer can spot a broken SQL join, but only an HR expert will notice an outdated parental-leave rule.

### 5.2 Step 2: Measure — build targeted checks

For each top failure mode, pick the simplest check that can catch it reliably:

1. **Use deterministic code first.** If you can check a rule with a regex, JSON schema, SQL parser, or ID check, use code. Code is free, instant, and 100% repeatable.
2. **Use reference-based metrics when you have labeled data.** Measure retrieval with `Recall@k` against labeled document IDs, or measure SQL with execution accuracy against a reference query.
3. **Use an LLM-as-a-judge for semantic rules.** When checking faithfulness, tone, or completeness, use an LLM judge. Keep each judge **binary (Pass / Fail)**, test **one criterion per judge**, and **validate the judge against human labels** before trusting its score. See [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md).
4. **Use human review as your anchor.** Use domain experts to label your golden dataset and verify that your automated checks agree with human judgment.

Once your checks are ready, run them on your dataset (see [Dataset Strategy](../01-datasets/01-dataset-strategy.md)) and record your **baseline score**.

### 5.3 Step 3: Improve — change one thing and re-measure

1. **Change one variable at a time** (such as chunk size, reranker model, system prompt, or tool schema).
2. **Run your eval suite** and compare the new score against your baseline.
3. **Inspect the changed traces.** Even when the overall score goes up, read the traces that flipped from Pass to Fail to make sure you did not introduce a new bug.
4. **Feed production failures back into your dataset.** Every bug you fix in production should become a permanent test row. See [Production Data Flywheel](../01-datasets/04-production-data-flywheel.md).

### 5.4 Common traps to avoid

- ❌ **Installing 20 generic metrics before reading a single trace.** You will waste weeks optimizing numbers that do not fix user complaints.
- ❌ **Using 1-to-5 or 1-to-10 rating scales with an uncalibrated LLM judge.** Neither humans nor LLMs agree on the difference between a 3 and a 4. Use binary Pass/Fail instead.
- ❌ **Building one "overall quality" judge that checks ten rules at once.** When it fails, you will not know why.
- ❌ **Scoring only the final answer in a multi-step agent.** You will miss broken tool calls, infinite loops, and lucky guesses.
- ❌ **Freezing your dataset forever.** User questions and company documents change every month; your dataset must grow with them.
- ❌ **Doing error analysis without domain experts.** Engineers often mark wrong domain answers as "Pass" because the prose sounds fluent.

---

## 6. What "reliable" actually means

An agent that gives accurate answers is still a failure if it leaks executive salaries, takes 45 seconds to respond, or costs $3 per question. Reliability has eight dimensions:

| Dimension | Question it answers | Key metrics | Where to learn more |
|---|---|---|---|
| **1. Quality & correctness** | Does it give accurate answers and run the right actions? | Answer correctness, faithfulness, context recall, SQL accuracy, task success | [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md), [Retrieval Metrics](../02-offline-evals/02-retrieval-metrics.md), [Text-to-SQL Evals](../02-offline-evals/05-text-to-sql-evals.md) |
| **2. Safety** | Does it avoid toxic, biased, or harmful outputs? | Toxicity rate, bias score, refusal accuracy | [Generation Quality & Safety](../02-offline-evals/03-generation-quality-and-safety-evals.md), [Output Guardrails](../04-guardrails/04-output-guardrails.md) |
| **3. Security & privacy** | Does it resist attacks and enforce user permissions? | Injection block rate, PII leak rate, RBAC violation count | [Threat Model & OWASP](../04-guardrails/07-threat-model-owasp.md), [Access Control & RBAC](../04-guardrails/06-access-control-rbac.md) |
| **4. Instruction & citation adherence** | Does it follow formatting rules and back up claims with citations? | Format pass rate, citation precision, citation recall | [Instruction & Citation Adherence](../02-offline-evals/06-instruction-and-citation-adherence.md) |
| **5. Cost** | Can you afford to run it at scale? | Tokens per task, cost per successful task, tool calls per task | [Monitoring, Alerting & Drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md) |
| **6. Latency** | Is it fast enough for the user's workflow? | Time to first token (TTFT), p50 and p95 latency | [Observability & Tracing](../03-online-evals-and-observability/02-observability-and-tracing.md) |
| **7. Robustness** | Does it handle typos, vague questions, missing docs, and API errors gracefully? | Pass rate on perturbed inputs, abstention accuracy | [Synthetic Datasets](../01-datasets/03-synthetic-datasets.md) |
| **8. Calibrated user trust** | Do users know when to trust the answer and when to verify it? | Thumbs-up/down rate, escalation rate, citation click rate | [User Feedback & Implicit Signals](../03-online-evals-and-observability/03-user-feedback-and-implicit-signals.md) |

> **The ultimate business metric:** Measure **cost per correct, safe, policy-compliant task within your latency budget**. Every other metric helps you diagnose that number.

### 6.1 Aim for calibrated trust, not blind trust

You do not want users to trust the agent 100% of the time. You want **calibrated trust**:
- When the documents have the answer, the agent answers clearly and cites the exact source so the user can verify it.
- When the documents do not have the answer, the agent **abstains** (*"I could not find this in the documents you can access"*).
- Before the agent runs an important action (such as filing a high-priority ticket), it asks the user to confirm.

### 6.2 Reliability is a system property, not a model property

Upgrading to a newer LLM will not fix missing document permissions, broken SQL joins, or bad chunking. Reliable agents combine clean retrieval, strict tool schemas, deterministic access control, layered guardrails, and continuous evaluation.

---

## 7. Who owns what on the team

Evals fail when they are treated as "just an engineering chore." Building a reliable agent requires collaboration across roles:

| Role | What they own | Key deliverables |
|---|---|---|
| **AI / ML Engineers** | Eval harness, automated checks, judge prompts, CI gates, and tracing | Eval code, experiment reports, trace pipelines |
| **Subject-Matter Experts (SMEs)** | Defining what "correct" means in the domain (HR, Finance, Legal) | Golden dataset answers, grading rubrics, labeled traces |
| **Product Managers** | Prioritizing failure modes, setting launch bars, designing refusal UX | Acceptance criteria, launch sign-off |
| **Security & Compliance** | Threat modeling, RBAC rules, PII policies, red-teaming | Security rules, attack datasets, audit logs |
| **Data & Platform Engineers** | Document indexing, permission metadata, database schemas | Search indexes, row-level security (RLS) policies |
| **SRE / Operations** | Production dashboards, latency/cost alerts, incident response | SLO alerts, rollback runbooks |

> **Assign one "benevolent dictator" per domain.** Pick one person (usually lead SME or PM) to make the final call when labelers disagree on what counts as a Pass. Committees create inconsistent labels.

---

## 8. Your first-week checklist

If you are starting from zero today, do these six steps in order:

- [ ] **Turn on full tracing** so you log every user input, retrieved chunk, SQL query, tool call, and final answer. → [Observability & Tracing](../03-online-evals-and-observability/02-observability-and-tracing.md)
- [ ] **Add deterministic guardrails for high-severity risks:** enforce RBAC filters at retrieval, restrict SQL to read-only `SELECT` queries, validate tool JSON schemas, and mask PII. → [Guardrails](../04-guardrails/README.md)
- [ ] **Read 50–100 traces with an SME** and group the failures you see (open and axial coding). → [Analyze — error analysis first](#51-analyze--error-analysis-first)
- [ ] **Build a 50-row golden dataset** and write 3–5 checks that catch your top failure modes. → [SME Golden Datasets](../01-datasets/02-sme-golden-datasets.md)
- [ ] **Run those checks in CI** so every pull request is tested against your baseline. → [Running Offline Experiments](../02-offline-evals/08-running-offline-experiments.md)
- [ ] **Sample live production traces** after launch and feed failed traces back into your golden dataset. → [Online Evals](../03-online-evals-and-observability/01-online-evals.md)

---

## Key takeaways

- **Reliability is the bottleneck.** Non-determinism, multi-step error compounding, and untrusted data make naive testing useless.
- **Evals measure; guardrails enforce.** Both use the exact same underlying checks—build your checks once and reuse them offline, online, and inline.
- **Only reference-free checks can run online or as guardrails.** Reference-based checks require labeled datasets and run offline.
- **Always start with error analysis.** Read ~100 traces, label the first upstream error, group the failures, and count them before choosing metrics.
- **Prefer code over judges, and binary over stars.** Use deterministic code checks whenever possible. When you need an LLM judge, make it binary (Pass/Fail) and calibrate it against human labels.

## Further reading

- Hamel Husain — [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/)
- Hamel Husain — [A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/)
- Hamel Husain — [Using LLM-as-a-Judge For Evaluation: A Complete Guide](https://hamel.dev/blog/posts/llm-judge/)
- Hamel Husain & Shreya Shankar — [AI Evals FAQ](https://hamel.dev/blog/posts/evals-faq/)
- Shankar et al., 2024 — [Who Validates the Validators? Aligning LLM-Assisted Evaluation of LLM Outputs with Human Preferences](https://arxiv.org/abs/2404.12272)
- Shreya Shankar — [Homepage & writing](https://www.sh-reya.com/)
- Eugene Yan — [Task-Specific LLM Evals that Do & Don't Work](https://eugeneyan.com/writing/evals/)
- Yan, Bischof, Frye, Husain, Liu, Shankar — [What We've Learned From A Year of Building with LLMs](https://applied-llms.org/)
- Anthropic — [Building effective agents](https://www.anthropic.com/research/building-effective-agents)
- Anthropic — [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- Barnett et al., 2024 — [Seven Failure Points When Engineering a Retrieval Augmented Generation System](https://arxiv.org/abs/2401.05856)
- NIST — [AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- **Next guide:** [The Evals & Guardrails Map](./02-the-evals-and-guardrails-map.md)
