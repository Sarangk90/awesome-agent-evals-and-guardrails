# Threat Modeling Agentic RAG: OWASP, ATLAS, NIST, and Red Teaming

> **TL;DR**
>
> - **Threat model the full system at trust boundaries.** Map where untrusted text enters, where private data lives, and where actions leave.
> - **Use the OWASP LLM Top 10 (2026) and Agentic Top 10 (2026) as your baseline.** Write LLM IDs with the year suffix, because 2026 renumbered most entries. Pair every identified risk with a deterministic guardrail and an evaluation test.
> - **Break the lethal trifecta in every agent.** Never combine private data, untrusted content, and un-gated external communication in one context. Use design patterns (dual LLM, plan-then-execute, CaMeL) instead of hoping the model resists injection.
> - **Red-team the stack continuously.** Test realistic attack goals against staging guardrails and turn every finding into a CI regression test.

- **You will learn:**
    - Data-flow diagrams and trust boundaries for agentic RAG
    - OWASP LLM Top 10 (2026), its mapping from 2025, and the Agentic Top 10 (2026), mapped to guardrails and evals
    - MITRE ATLAS technique IDs, NIST AI RMF and AI 600-1, ISO/IEC 42001, and the EU AI Act
    - The lethal trifecta, Meta's Agents Rule of Two, and design patterns that resist prompt injection
    - Practical red-teaming workflows, tools, injection benchmarks, and a reusable STRIDE threat-model worksheet
- **Prerequisites:** [Agentic RAG failure modes](../00-foundations/03-agentic-rag-failure-modes.md), [Guardrails architecture](./01-guardrails-architecture.md)
- **Related:** [Input guardrails](./02-input-guardrails.md), [Retrieval & context guardrails](./03-retrieval-and-context-guardrails.md), [Output guardrails](./04-output-guardrails.md), [Tool & action guardrails](./05-tool-and-action-guardrails.md), [Access control & RBAC](./06-access-control-rbac.md), [Generation quality & safety evals](../02-offline-evals/03-generation-quality-and-safety-evals.md)

---

## 1. Why threat model an LLM app

Classic application security rules still apply, including authentication, authorization, injection prevention, secrets management, and dependency hygiene. LLM applications add three distinct risks:

1. **Instructions and data share one channel.** User prompts, retrieved chunks, tool outputs, and memory all enter the context window. Any of them can act as instructions, which causes prompt injection.
2. **Behavior is probabilistic.** An identical prompt can produce 99 safe answers and one unsafe answer. Security controls that rely on the model "deciding correctly" will eventually fail.
3. **Agents take actions.** Tool calls turn text mistakes into real-world side effects at machine speed.

A strong agentic RAG threat model focuses on **trust boundaries** where untrusted text enters, sensitive data lives, and actions leave. Enforce **deterministic controls** at each of those boundaries.

### A simple process

| Step | Question | Output |
|---|---|---|
| 1. Model the system | What are the components, data stores, tools, and trust boundaries? | Data-flow diagram (DFD) |
| 2. Find threats | What can go wrong at each component and boundary? | Threat list using OWASP LLM Top 10, OWASP Agentic threats, STRIDE, and LINDDUN for privacy |
| 3. Rate | How likely is each threat and how severe is the impact? | Prioritized threat list |
| 4. Mitigate | Which guardrails, design changes, or process controls reduce the risk? | Controls mapped to threats |
| 5. Verify | How do we prove that each mitigation works? | Evals, unit tests, red-team cases, and production monitors |
| 6. Repeat | What changed across tools, data sources, or models? | Updated threat model on every major change |

This workflow follows the standard OWASP [threat modeling process](https://community.owasp.org/Threat_Modeling). Step 5 connects threat modeling to the rest of this guide: every mitigation requires a test.

### DFD for the running example

Our internal enterprise assistant combines RAG over company documents, text-to-SQL over the warehouse, ticket and email tools, and multiple roles and tenants.

```mermaid
flowchart LR
    subgraph EXT["Untrusted zone"]
        U["User browser"]
        WEB["Web pages via fetch_url"]
        EMAIL_IN["Inbound emails and uploads"]
        MCP3["Third-party MCP servers"]
    end
    subgraph APP["Application trust boundary"]
        GW["Gateway and auth"]
        ORC["Agent orchestrator and tool gate"]
        GR["Guardrail services"]
        MEM["Conversation memory"]
        CACHE["Semantic cache"]
    end
    subgraph DATA["Data zone"]
        VS["Vector store with ACL metadata"]
        DW["Data warehouse"]
        TIX["Ticketing system"]
    end
    subgraph PROV["Model provider"]
        LLM["LLM API"]
    end
    OUT["Outbound: email API, links, images"]

    U --> GW --> ORC
    ORC <--> GR
    ORC <--> LLM
    ORC <--> VS
    ORC <--> DW
    ORC <--> TIX
    ORC <--> MEM
    ORC <--> CACHE
    WEB --> ORC
    EMAIL_IN --> VS
    MCP3 <--> ORC
    ORC --> OUT
```

Inspect every arrow that crosses a boundary and ask four questions: *Is this payload trusted? Is it authorized? Is it validated? Is it logged?*

---

## 2. OWASP Top 10 for LLM Applications (2026)

The [OWASP Top 10 for LLM Applications 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/) (published 3 August 2026) is the current baseline checklist for LLM risks. It replaces the [2025 edition](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/) and renumbers most entries, so always write IDs with the year suffix (`LLM03:2026`, not `LLM03`). The 2026 ranking weights a practitioner vote at 75% and a corpus of real incidents at 25% (7,714 incidents collected, 6,639 classified).

OWASP draws one boundary: this list covers the model as a **component** of your application. When the model becomes an **actor** with tools, memory, and downstream effects, pair each entry with the [Agentic Top 10](#32-owasp-top-10-for-agentic-applications-2026).

Each card below summarizes the **description**, **agentic RAG example**, **guardrails**, and **evals/tests**, plus related [MITRE ATLAS](#mitre-atlas) technique IDs. OWASP has not yet published per-risk web pages for 2026; the cards link to the 2026 resource page and to the matching 2025 entry. Read the official OWASP document for full details.

### Mapping from 2025 to 2026

| 2025 ID and name | 2026 ID | Change |
|---|---|---|
| LLM01:2025 Prompt Injection | LLM01:2026 | Same rank; adds cross-modal injection |
| LLM02:2025 Sensitive Information Disclosure | LLM02:2026 | Same rank; covers all output channels |
| LLM03:2025 Supply Chain | LLM04:2026 | Down one |
| LLM04:2025 Data and Model Poisoning | LLM05:2026 | Down one; absorbs fine-tuning subversion |
| LLM05:2025 Improper Output Handling | LLM10:2026 | Down five; adds insecure generated code |
| LLM06:2025 Excessive Agency | LLM03:2026 | Up three |
| LLM07:2025 System Prompt Leakage | LLM08:2026 Hidden Context Exposure | Renamed and broadened |
| LLM08:2025 Vector and Embedding Weaknesses | LLM09:2026 | Down one |
| LLM09:2025 Misinformation | LLM07:2026 | Up two |
| LLM10:2025 Unbounded Consumption | LLM06:2026 | Up four |

### Summary map

| ID | Risk | Primary guardrail layers in this repo |
|---|---|---|
| LLM01:2026 | Prompt Injection | [Input](./02-input-guardrails.md), [retrieval & context](./03-retrieval-and-context-guardrails.md), [tool & action](./05-tool-and-action-guardrails.md) |
| LLM02:2026 | Sensitive Information Disclosure | [Access control](./06-access-control-rbac.md), [output](./04-output-guardrails.md) |
| LLM03:2026 | Excessive Agency | [Tool & action](./05-tool-and-action-guardrails.md), [access control](./06-access-control-rbac.md) |
| LLM04:2026 | Supply Chain | Process controls, [tool & action (MCP)](./05-tool-and-action-guardrails.md) |
| LLM05:2026 | Data and Model Poisoning | [Retrieval & context](./03-retrieval-and-context-guardrails.md), ingestion controls |
| LLM06:2026 | Unbounded Consumption | [Tool & action (budgets)](./05-tool-and-action-guardrails.md), [monitoring](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md) |
| LLM07:2026 | Misinformation | [Output](./04-output-guardrails.md), [E2E RAG evals](../02-offline-evals/01-end-to-end-rag-evals.md), [citation adherence](../02-offline-evals/06-instruction-and-citation-adherence.md) |
| LLM08:2026 | Hidden Context Exposure | [Output](./04-output-guardrails.md), design (no secrets in prompts, tool schemas, or retrieved policy text) |
| LLM09:2026 | Vector and Embedding Weaknesses | [Access control](./06-access-control-rbac.md), [retrieval & context](./03-retrieval-and-context-guardrails.md) |
| LLM10:2026 | Improper Output Handling | [Output](./04-output-guardrails.md), [tool & action](./05-tool-and-action-guardrails.md) |

---

### LLM01:2026 Prompt Injection

**Description.** Crafted inputs alter the model's behavior in unintended ways. *Direct* injection comes from the user's prompt, including jailbreaks. *Indirect* injection arrives through external content the model processes, such as web pages, documents, emails, tool results, or images. The 2026 entry also covers **cross-modal** injection, where instructions hide in an image or audio track. Indirect injection through retrieved documents belongs here, not under LLM09:2026 ([2025 entry](https://genai.owasp.org/llmrisk/llm01-prompt-injection/), [Greshake et al., 2023](https://arxiv.org/abs/2302.12173)). ATLAS: AML.T0051.000 (direct) and AML.T0051.001 (indirect).

**Agentic RAG example.** An indexed wiki page hides instructions to call `search_docs('salary bands')` and append results to `https://evil.example/?d=`. When an employee asks for a summary, the agent executes those hidden instructions.

**Guardrails.**

- Assume prompt injection **will** sometimes succeed, and limit its blast radius with least privilege, blocked exfiltration channels, and human approval ([lethal trifecta](#5-the-lethal-trifecta)).
- Run injection and jailbreak classifiers on user inputs, retrieved chunks, and tool outputs ([input guardrails](./02-input-guardrails.md), [retrieval & context guardrails](./03-retrieval-and-context-guardrails.md)). Treat classifier scores as risk signals rather than guarantees.
- Delimit untrusted content clearly in the prompt and instruct the model to treat it as data.
- Enable taint tracking so T2 and T3 tools require approval or stay disabled once untrusted content enters the context ([tool & action guardrails](./05-tool-and-action-guardrails.md)).
- Enforce authorization in code using the end-user identity so injected cross-user queries fail ([access control](./06-access-control-rbac.md)).

**Evals/tests.**

- Run direct and indirect injection suites against a test index containing planted malicious chunks, and measure **attack success rate** and **unsafe tool-call attempt rate**.
- Measure injection classifier precision and recall on labeled attacks alongside false-positive rates on benign traffic.
- Convert every red-team or production injection finding into a permanent regression test ([production data flywheel](../01-datasets/04-production-data-flywheel.md)).

---

### LLM02:2026 Sensitive Information Disclosure

**Description.** The application exposes PII, credentials, confidential business data, or other users' data through the context window, training data, logs, or caches. The 2026 entry treats every channel as output: the final answer, tool-call arguments, reasoning traces, retrieved chunks, embeddings, logs, and side channels ([2025 entry](https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/)). ATLAS: AML.T0057 LLM Data Leakage.

**Agentic RAG example.** An `employee` asks for executive bonus numbers. An unfiltered service-account retriever fetches an HR spreadsheet, or a shared semantic cache returns an HR partner's prior answer.

**Guardrails.**

- Enforce permission-aware retrieval and database RLS keyed on the authenticated end user ([access control](./06-access-control-rbac.md)).
- Redact PII and secrets across outputs, tool arguments, reasoning traces, and logs ([output guardrails](./04-output-guardrails.md)).
- Minimize data at ingestion by excluding secrets, credentials, and unnecessary sensitive records from the index.
- Scope all caches and conversation memory by tenant and user permissions.

**Evals/tests.**

- Run an RBAC test matrix with canary documents and require an **unauthorized retrieval rate of 0** ([access control evals](./06-access-control-rbac.md)).
- Run a PII elicitation test suite and measure leakage using deterministic detectors plus an LLM judge for paraphrased leaks.
- Scan stored traces and logs regularly for unredacted PII and secrets.

---

### LLM03:2026 Excessive Agency

**Description.** An agent causes damage when given **excessive functionality** (broad tools), **excessive permissions** (over-privileged tokens), or **excessive autonomy** (unapproved high-impact actions). It moved from sixth to third place in 2026, because both the community vote and the incident record show that agentic deployments cause the most damage ([2025 entry](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)). When the model acts on its own, pair this card with the Agentic Top 10 (§3.2). ATLAS: AML.T0053 AI Agent Tool Invocation, AML.T0101 Data Destruction via AI Agent Tool Invocation.

**Agentic RAG example.** A ticketing integration uses an admin token and exposes a generic `ticket_api(method, path, body)` tool. A prompt-injected document tricks the agent into closing all open security tickets.

**Guardrails.**

- Build narrow, purpose-specific tools, enforce per-role tool allowlists, and use least-privilege user-scoped credentials.
- Assign tool impact tiers, require human approval and dry-run previews for destructive or external actions, and enforce step and call budgets ([tool & action guardrails](./05-tool-and-action-guardrails.md)).
- Enforce object-level authorization on every tool call ([access control](./06-access-control-rbac.md)).

**Evals/tests.**

- Run policy unit tests across all `role × tool` combinations.
- Run trajectory evaluations to confirm the agent calls the right tools with valid arguments on benign tasks ([agent tool & trajectory evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md)).
- Run adversarial injection tests targeting destructive tools and require an **unsafe action execution rate of 0**.

---

### LLM04:2026 Supply Chain

**Description.** Third-party components introduce vulnerabilities, backdoors, bias, or licensing risks. Common supply-chain dependencies include base models, fine-tuning adapters (LoRA), datasets, libraries, and model hubs. The 2026 entry adds promoted model artifacts that are not what they claim to be, and attackers who register package names that coding assistants hallucinate ("slopsquatting"). It covers third-party tool packages, but defers MCP server and tool-registry risks to **ASI04 Agentic Supply Chain Vulnerabilities** ([2025 entry](https://genai.owasp.org/llmrisk/llm032025-supply-chain/)). ATLAS: AML.T0010 AI Supply Chain Compromise (AML.T0010.005 AI Agent Tool).

**Agentic RAG example.** A team installs a community MCP server for Confluence search. A subsequent update modifies a tool description to exfiltrate context via tool arguments, or an unverified model checkpoint executes arbitrary code during deserialization.

**Guardrails.**

- Maintain an AI bill of materials (AI BOM) covering models, versions, providers, datasets, embedding models, MCP servers, prompt templates, and guardrail models.
- Pin dependency versions, verify cryptographic hashes and signatures, and use safe serialization formats (`safetensors`).
- Vet and allowlist MCP servers, and diff tool manifests on every update ([MCP security](./05-tool-and-action-guardrails.md)).
- Sandbox third-party code and issue least-privilege credentials per integration.

**Evals/tests.**

- Re-run your full offline evaluation suite on every model, prompt, embedding, or dependency update ([running offline experiments](../02-offline-evals/08-running-offline-experiments.md)).
- Verify in CI that MCP tool descriptions and manifests match approved hashes.
- Run automated dependency and container vulnerability scans in CI.

---

### LLM05:2026 Data and Model Poisoning

**Description.** Attackers manipulate pre-training, fine-tuning, embedding, or RAG knowledge-base data to introduce backdoors, false facts, or biases. The 2026 entry also absorbs fine-tuning subversion ([2025 entry](https://genai.owasp.org/llmrisk/llm042025-data-and-model-poisoning/)). ATLAS: AML.T0020 Training Data Poisoning, AML.T0070 RAG Poisoning, AML.T0071 False RAG Entry Injection.

**Agentic RAG example.** An insider edits an open internal wiki page on expense policy to state that purchases under $10,000 need no approval. The assistant then repeats that false rule as company policy, or an attacker crafts a document to rank first and deliver an injection payload.

**Guardrails.**

- Assign source trust tiers at ingestion (official policy repo > team wiki > user uploads), boost authoritative sources during ranking, and display source labels to users.
- Record provenance metadata on every chunk (author, last editor, timestamp, source system) and monitor edits to high-impact documents.
- Scan documents at ingestion for prompt-injection patterns and anomalous content ([retrieval & context guardrails](./03-retrieval-and-context-guardrails.md)).
- Require human review before indexing changes to documents that govern high-stakes policies.

**Evals/tests.**

- Run poisoning drills by inserting tampered documents into a staging index and measuring the **poison success rate**.
- Run a golden Q&A regression set on critical policies nightly and alert on answer drift ([monitoring & drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md)).
- Verify in retrieval tests that authoritative documents outrank lower-trust copies.

---

### LLM06:2026 Unbounded Consumption

**Description.** Uncontrolled inference or tool execution drives denial of service, runaway cloud spend ("denial of wallet"), or model extraction via high-volume querying. It rose four places in 2026 ([2025 entry](https://genai.owasp.org/llmrisk/llm102025-unbounded-consumption/)). ATLAS: AML.T0029 Denial of AI Service, AML.T0034.002 Agentic Resource Consumption.

**Agentic RAG example.** A crafted prompt traps the agent in a 200-step loop between `run_sql` and `search_docs`, or triggers a full-warehouse table scan.

**Guardrails.**

- Enforce per-run step, tool-call, token, cost, and wall-clock budgets alongside loop detection and per-user rate limits ([tool & action guardrails](./05-tool-and-action-guardrails.md)).
- Cap input length, enforce SQL `EXPLAIN` cost limits, and set strict database statement timeouts.
- Configure spend alerts and automated kill switches.

**Evals/tests.**

- Run load tests and scripted looping-agent tests to confirm runs stop at their budget limits.
- Monitor p95 and p99 cost and latency per request with automated alerts ([monitoring & drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md)).

---

### LLM07:2026 Misinformation

**Description.** The model generates false or misleading claims that sound authoritative (hallucinations), causing users or downstream systems to make bad decisions. In the 2026 ranking the incident record placed misinformation much higher than the community vote, so it moved up from ninth to seventh place. Insecure generated code belongs to LLM10:2026, and hallucinated package names belong to LLM04:2026 ([2025 entry](https://genai.owasp.org/llmrisk/llm092025-misinformation/)).

**Agentic RAG example.** Retrieval misses the current travel policy. The model then answers from a stale 2023 document or invents a reimbursement limit with a plausible citation.

**Guardrails.**

- Run groundedness checks and verify citations against retrieved, permitted chunks before display ([output guardrails](./04-output-guardrails.md)).
- Abstain when retrieval relevance or groundedness scores fall below threshold.
- Track document freshness metadata, boost current policy versions, and display source dates in the UI.
- Display the executed SQL query and assumptions alongside data answers so users can verify numbers.

**Evals/tests.**

- Evaluate faithfulness, answer correctness, and context recall and precision ([E2E RAG evals](../02-offline-evals/01-end-to-end-rag-evals.md)).
- Measure citation precision and recall ([instruction & citation adherence](../02-offline-evals/06-instruction-and-citation-adherence.md)).
- Measure text-to-SQL execution accuracy ([text-to-SQL evals](../02-offline-evals/05-text-to-sql-evals.md)).
- Test an unanswerable-question dataset to verify the abstention rate.

---

### LLM08:2026 Hidden Context Exposure

**Description.** Attackers extract, infer, or reconstruct hidden context that the user should not see. In 2026 this entry replaces **System Prompt Leakage** (LLM07:2025) and covers more than the system prompt: developer instructions, retrieved policy text, tool and function schemas, and other material the application puts in the context window. OWASP says to assume hidden context is discoverable. Never put credentials in it, and never rely on it as a security boundary ([2026 list](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/), [2025 entry](https://genai.owasp.org/llmrisk/llm072025-system-prompt-leakage/)). ATLAS: AML.T0056 Extract LLM System Prompt.

**Agentic RAG example.** A system prompt contains "Admins have emails ending in `-adm@company.com`. Never show HR data to others. Warehouse password: ...". A user extracts the full text by asking the assistant to repeat its instructions verbatim.

**Guardrails.**

- **Store zero secrets in prompts.** Keep credentials in a vault and inject them inside tool execution code.
- Enforce authorization in deterministic code rather than prompt instructions ([access control](./06-access-control-rbac.md)).
- Add canary tokens and n-gram overlap checks on outputs and tool arguments to detect extraction attempts ([output guardrails](./04-output-guardrails.md)).

**Evals/tests.**

- Run a prompt-extraction attack suite and measure verbatim and near-verbatim overlap with the system prompt, tool schemas, and retrieved policy text.
- Scan prompt templates in CI with secret-detection tools.

---

### LLM09:2026 Vector and Embedding Weaknesses

**Description.** Flaws in vector generation, storage, or retrieval lead to unauthorized access, cross-tenant leakage, embedding inversion attacks, or knowledge-base poisoning. The 2026 entry also covers vector-backed agent memory and semantic caches ([2025 entry](https://genai.owasp.org/llmrisk/llm082025-vector-and-embedding-weaknesses/)).

**Agentic RAG example.** Multiple tenants share a single vector index. One retrieval helper omits the `tenant_id` filter, returning chunks from Subsidiary B to a user in Subsidiary A.

**Guardrails.**

- Build a permission-aware vector pipeline with ingestion ACL metadata, query pre-filtering, code post-checks, fast ACL sync, and deliberate tenant partitioning ([access control](./06-access-control-rbac.md)).
- Scope semantic caches by tenant and principal, and set conservative similarity thresholds so a near-duplicate query cannot return another user's answer.
- Protect embeddings of sensitive text with the same access controls, encryption, and retention rules as the source documents.
- Validate and authenticate document sources at ingestion (shared with LLM05:2026).

**Evals/tests.**

- Run cross-tenant and cross-role retrieval tests with canary documents in CI.
- Monitor production canary hits and alert on any post-check ACL mismatches.
- Measure retrieval recall and precision per role to catch overly restrictive filters ([retrieval metrics](../02-offline-evals/02-retrieval-metrics.md)).

---

### LLM10:2026 Improper Output Handling

**Description.** Passing unvalidated model output to browsers, databases, or shells enables XSS, CSRF, SSRF, privilege escalation, SQL injection, or remote code execution. The 2026 entry also covers insecure code that coding assistants generate. It fell from fifth to tenth place in 2026. A lower rank does not make it safe to skip: any output that reaches a browser, shell, SQL engine, or tool still needs the controls below ([2025 entry](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)). ATLAS: AML.T0077 LLM Response Rendering.

**Agentic RAG example.** The app runs model-generated SQL under a write role, renders `<script>` tags or tracking images, or runs Python on the host.

**Guardrails.**

- Treat all model outputs as **untrusted input** to every downstream component.
- Enforce a text-to-SQL AST guard alongside a read-only database role and RLS ([tool & action guardrails](./05-tool-and-action-guardrails.md)).
- Sanitize HTML, enforce a strict Content Security Policy, and block arbitrary remote images in the chat UI ([output guardrails](./04-output-guardrails.md)).
- Execute generated code only inside an isolated sandbox, and use parameterized APIs instead of string-concatenated commands.

**Evals/tests.**

- Run a labeled SQL guard test corpus and require 100% accuracy on safe and unsafe queries.
- Fuzz prompts to elicit HTML, JavaScript, and markdown-image payloads, and verify that the rendered DOM stays inert.
- Track schema-validation pass rates on structured outputs.

---

## 3. OWASP agentic guidance

The OWASP GenAI Security Project's [Agentic Security Initiative](https://genai.owasp.org/initiatives/agentic-security-initiative/) publishes threat taxonomies and controls specifically for tool-using and multi-agent systems.

### 3.1 Agentic AI – Threats and Mitigations

[Agentic AI – Threats and Mitigations](https://genai.owasp.org/resource/agentic-ai-threats-and-mitigations/) defines agentic threats and maps them to mitigation playbooks. Version 1.0 (February 2025) defines T1–T15. Version 1.1 (December 2025) adds T16 and T17, and the [Agentic Top 10 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) cites v1.1. At the time of writing, the linked resource page still shows v1.0, so you may see only 15 threats there:

| ID | Threat | In the running example |
|---|---|---|
| T1 | Memory Poisoning | Injected false facts are saved to long-term memory and reused in future sessions |
| T2 | Tool Misuse | Prompt injection steers the agent into abusing permitted tools (such as mass ticket updates) |
| T3 | Privilege Compromise | The agent's service account acts beyond the requester's permissions (confused deputy) |
| T4 | Resource Overload | Agent loops and expensive SQL queries exhaust budgets or warehouse capacity |
| T5 | Cascading Hallucination Attacks | A hallucinated value is written to a ticket or memory and treated as fact later |
| T6 | Intent Breaking & Goal Manipulation | An injected document hijacks the agent's execution plan |
| T7 | Misaligned & Deceptive Behaviors | The agent takes policy-violating shortcuts to satisfy a goal |
| T8 | Repudiation & Untraceability | Missing audit logs prevent teams from linking an action to a user, prompt, and approval |
| T9 | Identity Spoofing & Impersonation | A prompt claims "I am an admin", or an agent impersonates another user downstream |
| T10 | Overwhelming Human-in-the-Loop | Frequent approval prompts cause reviewers to rubber-stamp risky actions |
| T11 | Unexpected RCE and Code Attacks | Generated Python code escapes a weak execution sandbox |
| T12 | Agent Communication Poisoning | One compromised sub-agent passes manipulated messages to peer agents |
| T13 | Rogue Agents in Multi-Agent Systems | A compromised or drifting agent acts outside its assigned role |
| T14 | Human Attacks on Multi-Agent Systems | Attackers exploit delegation chains across agents to escalate privileges |
| T15 | Human Manipulation | Agent responses socially engineer human operators with fabricated urgency |
| T16 | Insecure Inter-Agent Protocol Abuse | Attackers exploit unauthenticated or unvalidated agent-to-agent protocols |
| T17 | Supply Chain Compromise | Malicious models, tools, MCP servers, or agent frameworks compromise the app |

The OWASP guide organizes mitigations into six playbooks:

- Preventing reasoning manipulation.
- Preventing memory poisoning and knowledge corruption.
- Securing tool execution and preventing unauthorized actions.
- Strengthening authentication, identity, and privilege controls.
- Protecting human-in-the-loop review from decision fatigue.
- Securing multi-agent communication and trust.

### 3.2 OWASP Top 10 for Agentic Applications (2026)

The [OWASP Top 10 for Agentic Applications for 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) distills the agentic threat landscape into ten core risks:

| ID | Risk | Closest controls in this repo |
|---|---|---|
| ASI01 | Agent Goal Hijack | Injection defenses, taint tracking, human approval ([input](./02-input-guardrails.md), [tool & action](./05-tool-and-action-guardrails.md)) |
| ASI02 | Tool Misuse and Exploitation | Tool gate, allowlists, argument validation, budgets ([tool & action](./05-tool-and-action-guardrails.md)) |
| ASI03 | Identity and Privilege Abuse | Identity propagation, OBO tokens, object-level authz ([access control](./06-access-control-rbac.md)) |
| ASI04 | Agentic Supply Chain Vulnerabilities | Approved MCP registry, version pinning, manifest hashing ([tool & action](./05-tool-and-action-guardrails.md)) |
| ASI05 | Unexpected Code Execution (RCE) | Isolated sandboxes with no network or credentials ([tool & action](./05-tool-and-action-guardrails.md)) |
| ASI06 | Memory & Context Poisoning | Ingestion validation, provenance tracking, per-user memory ([retrieval & context](./03-retrieval-and-context-guardrails.md), [access control](./06-access-control-rbac.md)) |
| ASI07 | Insecure Inter-Agent Communication | Authenticated, schema-validated peer messages treated as untrusted input |
| ASI08 | Cascading Failures | Step budgets, circuit breakers, inter-step validation ([monitoring](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md)) |
| ASI09 | Human-Agent Trust Exploitation | Clear dry-run previews, source provenance, calibrated confidence, approval UX |
| ASI10 | Rogue Agents | Least privilege, anomaly monitoring, kill switches, immutable audit logs |

Use the LLM Top 10 for model and data risks, and use the Agentic Top 10 for planning, tool execution, memory, identity, and multi-agent risks. Appendix A of the [LLM Top 10 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/) gives a version-pinned crosswalk from each LLM entry to the ASI IDs, MITRE ATLAS, MITRE ATT&CK, CWE, NIST AI 600-1, NIST AI RMF, the CSA AI Controls Matrix (AICM), and AIVSS. Use it when a security team asks how one risk maps to another framework.

---

## 4. Other frameworks you will meet

### MITRE ATLAS

[MITRE ATLAS](https://atlas.mitre.org/) (Adversarial Threat Landscape for Artificial-Intelligence Systems) catalogs adversary tactics, techniques, and real-world case studies against AI systems using the MITRE ATT&CK structure. Use ATLAS for three purposes:

- **Share vocabulary with security operations teams** that already use MITRE ATT&CK.
- **Model full attack paths** from reconnaissance and initial access to execution and exfiltration.
- **Seed red-team scenarios** from documented AI attack case studies.

Pair OWASP with ATLAS: OWASP tells builders *which weaknesses to fix*, whereas ATLAS shows defenders *how adversaries chain attacks*.

Cite ATLAS technique IDs in your threat model and in red-team findings, so that security operations can link them to detections. These IDs are relevant to agentic RAG (checked against ATLAS data release v2026.09; IDs and names change between releases, so check [atlas.mitre.org](https://atlas.mitre.org/techniques/) before you cite them):

| ATLAS ID | Technique | Where it hits the running example |
|---|---|---|
| AML.T0051.000 / .001 | LLM Prompt Injection: Direct / Indirect | User prompt; wiki pages, emails, and `fetch_url` results |
| AML.T0054 | LLM Jailbreak | User prompt that tries to disable policy |
| AML.T0056 | Extract LLM System Prompt | Hidden context exposure (LLM08:2026) |
| AML.T0057 | LLM Data Leakage | Cross-tenant or HR data in an answer |
| AML.T0070 | RAG Poisoning | Edited wiki page that is indexed |
| AML.T0071 | False RAG Entry Injection | Fake document crafted to rank for a target query |
| AML.T0080.000 | AI Agent Context Poisoning: Memory | False fact saved to long-term memory |
| AML.T0053 | AI Agent Tool Invocation | Injected instruction makes the agent call `update_ticket` |
| AML.T0086 | Exfiltration via AI Agent Tool Invocation | Private data sent out through `send_email` or `fetch_url` |
| AML.T0101 | Data Destruction via AI Agent Tool Invocation | Agent closes or deletes tickets |
| AML.T0110 | AI Agent Tool Poisoning | Malicious MCP tool description |
| AML.T0099 | AI Agent Tool Data Poisoning | Injected text in a tool result |
| AML.T0098 | AI Agent Tool Credential Harvesting | Agent tricked into reading tokens through a tool |
| AML.T0083 | Credentials from AI Agent Configuration | Secrets in MCP or agent config files |
| AML.T0010.005 | AI Supply Chain Compromise: AI Agent Tool | Compromised MCP server package |
| AML.T0077 | LLM Response Rendering | Markdown image that leaks data when the client renders it |
| AML.T0105 | Escape to Host | `run_python` sandbox escape |
| AML.T0029 | Denial of AI Service | Agent loops that exhaust the service |
| AML.T0034.002 | Cost Harvesting: Agentic Resource Consumption | Expensive tool loops billed to you |

### NIST AI RMF (AI 100-1) and the Generative AI Profile (AI 600-1)

The [NIST AI Risk Management Framework 1.0 (NIST AI 100-1)](https://doi.org/10.6028/NIST.AI.100-1) organizes AI risk management across four lifecycle functions:

| Function | What it means for an agentic RAG team |
|---|---|
| **Govern** | Define ownership, security policies, risk tolerance, and launch approval gates |
| **Map** | Document system context, intended use, users, data flows, and the threat model |
| **Measure** | Run offline evals, red-team suites, guardrail metrics, and online monitoring |
| **Manage** | Prioritize and mitigate risks, run incident response, and decommission unsafe features |

The [Generative AI Profile (NIST AI 600-1, July 2024)](https://doi.org/10.6028/NIST.AI.600-1) adapts the RMF to generative AI across 12 risk areas. Key areas include confabulation, data privacy, information security, information integrity, human-AI configuration, and value-chain integration. Use [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) as your **governance structure**, OWASP and ATLAS as your **threat catalog**, and your evals and guardrails as the **verifiable controls**.

AI 600-1 gives each suggested action an ID (for example `MS-2.7-007`). Put these IDs in your control register, so that an auditor can trace each eval or guardrail to the profile. Examples that apply to this page:

| AI 600-1 action | What it asks for | Evidence from this guide |
|---|---|---|
| MS-2.7-001 | Apply security measures to assess vulnerabilities and threats (for example compromised dependencies and data breaches) | Threat-model worksheet (§7), MCP checks in [tool & action guardrails](./05-tool-and-action-guardrails.md) |
| MS-2.7-007 | Perform AI red-teaming, including prompt injection and attacks on other systems | Red-team process and metrics (§6) |
| MS-2.10-001 | Red-team for leaks of training data and confidential information | Canary documents and cross-tenant tests ([access control](./06-access-control-rbac.md)) |
| MP-4.1-001 | Monitor AI-generated content for privacy risks such as PII exposure | Output PII rails and monitors ([output guardrails](./04-output-guardrails.md)) |
| MG-4.3-001 | Run after-action reviews of GAI incidents | Part D review triggers (§7) |

### ISO/IEC 42001 and the EU AI Act

- **[ISO/IEC 42001:2023](https://www.iso.org/standard/42001)** specifies an AI management system (AIMS). Like ISO/IEC 27001 for information security, it is certifiable and focuses on process: policy, roles, risk assessment, impact assessment, and continual improvement. Your threat model, eval suites, and guardrail metrics are the evidence that the AIMS asks for. ISO/IEC 42001 does not tell you which technical controls to use; use OWASP and ATLAS for that.
- **The [EU AI Act (Regulation (EU) 2024/1689)](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)** applies its obligations in phases. Obligations for general-purpose AI model providers started in August 2025. Most obligations for high-risk systems are scheduled to start in August 2026 or later. An internal enterprise assistant is usually not a high-risk system, but the use case decides this (for example, HR decisions about workers can be high-risk). The dates and scope can change, so ask your legal team to confirm which obligations apply. Do not rely on this summary as legal advice.

---

## 5. The lethal trifecta

Simon Willison's [lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) is a fast, practical heuristic for agent design reviews. An agent faces severe data-exfiltration risk whenever it combines all three legs in one context:

1. **Access to private data**
2. **Exposure to untrusted content** (any text an attacker can influence)
3. **The ability to communicate externally** (any outbound channel that can carry data out)

When all three legs meet, an attacker who places instructions inside untrusted content can trick the model into stealing private data and sending it out. LLMs follow instructions in data and cannot reliably separate trusted instructions from untrusted text.

```mermaid
flowchart TD
    A["Private data: docs, warehouse, tickets"] --> R{"All three present in one context?"}
    B["Untrusted content: web pages, emails, uploads, third-party tool output, editable wikis"] --> R
    C["External communication: email, fetch_url, links, markdown images, webhooks"] --> R
    R -- yes --> X["High exfiltration risk: remove a leg or gate it deterministically"]
    R -- no --> OK["Residual risk: still apply least privilege and monitoring"]
```

Our running example combines all three legs by default: private enterprise data, editable wikis and `fetch_url` outputs, and outbound `send_email` calls and markdown links. Break the lethal trifecta using deterministic boundaries:

| Leg | How to remove or gate it |
|---|---|
| Private data | Run untrusted-content tasks (such as summarizing public web pages) in an isolated agent with **zero** access to private data |
| Untrusted content | Index only vetted, access-controlled sources for high-privilege agents, and treat open wikis as untrusted |
| External communication | Remove `fetch_url` and `send_email` from agents that read private data, allowlist domains and recipients, block remote markdown images, and sanitize links |
| Dynamic gating | Use taint tracking to disable or require human approval for every outbound tool once untrusted content and sensitive data both enter the context ([tool & action guardrails](./05-tool-and-action-guardrails.md)) |

Remember that "untrusted content" includes internal wikis anyone can edit, inbound emails, shared tickets, and third-party MCP tool outputs, not just the public web.

### Meta's Agents Rule of Two

Meta's [Agents Rule of Two](https://ai.meta.com/blog/practical-ai-agent-security/) (October 2025) is a related rule. Within one session, an agent may have at most two of these three properties without human supervision:

- **[A]** It processes untrustworthy inputs.
- **[B]** It has access to sensitive systems or private data.
- **[C]** It can change state or communicate externally.

Leg [C] is broader than the trifecta's third leg. It includes state changes such as `update_ticket` or deleting data, not only exfiltration. So the Rule of Two also covers integrity attacks that do not send data out. If a task needs all three properties, require human approval or start a new session. This matches the taint rule in [tool & action guardrails](./05-tool-and-action-guardrails.md).

### Design patterns that resist prompt injection

Beurer-Kellner et al., [Design Patterns for Securing LLM Agents against Prompt Injections](https://arxiv.org/abs/2506.08837) (2025), describe six patterns. Each one limits what untrusted text can cause, instead of trying to detect it:

| Pattern | How it works | Fit in the running example |
|---|---|---|
| Action-selector | The LLM only picks one action from a fixed list and never sees tool outputs | Routing a request to a fixed FAQ or a ticket form |
| Plan-then-execute | The agent fixes its plan (the tool calls) before it reads untrusted content; content cannot add new calls | "Summarize ticket 123 and email me" with recipient fixed at plan time |
| LLM map-reduce | An isolated LLM processes each untrusted item, and returns constrained output (for example a boolean); a second step combines the results | Classify each of 50 inbound emails |
| Dual LLM | A privileged LLM plans and calls tools, but sees only symbolic references to untrusted text; a quarantined LLM reads that text but has no tools | Summarizing `fetch_url` pages without tool access |
| Code-then-execute | The LLM writes a program before it reads data; the program runs with untrusted data as values, not instructions ([CaMeL](https://arxiv.org/abs/2503.18813) adds capabilities and data-flow policies to this pattern) | SQL analysis pipelines whose control flow is fixed before any row is read |
| Context-minimization | Remove the user prompt or untrusted text from the context before later steps | Drop the raw user message after it becomes a validated SQL query |

These patterns reduce utility for open-ended tasks. Choose the most restrictive pattern that still completes the task, and measure the cost with benign task success (§6).

---

## 6. Red teaming

Red teaming uses structured human and automated attacks to make the system violate its security policies. Red teaming uncovers multi-step failures that static evaluation sets miss, and every finding feeds back into your regression suite.

### Process

```mermaid
flowchart LR
    S["1. Scope: threat model, policies, in-scope tools"] --> P["2. Plan: attack goals per threat"]
    P --> G["3. Generate attacks: manual + automated"]
    G --> E["4. Execute against staging with real guardrails"]
    E --> J["5. Judge: deterministic oracles first, then LLM or human review"]
    J --> F["6. Fix: design, guardrails, prompts, policies"]
    F --> R["7. Regress: add cases to eval suites and CI"]
    R --> P
```

Red-teaming checklist:

- [ ] Test the full stack (gateway, retriever, tool gate, output rails) with realistic roles and data.
- [ ] Define concrete attacker goals from your threat model, such as cross-tenant reads or external emails.
- [ ] Attack every input surface, including prompts, uploads, wiki docs, web pages, tool results, and MCP metadata.
- [ ] Grade attacks with deterministic oracles first (canaries, audit logs), and use [LLM judges](../02-offline-evals/07-llm-as-a-judge.md) for fuzzy goals.
- [ ] Track attack success rate per goal and per input surface across releases.
- [ ] Combine automated scanners for broad regression coverage with human red teamers for creative, multi-step exploits.
- [ ] Re-run the red-team suite on every material change to models, tools, data sources, or system prompts.
- [ ] Scope and authorize all red-team exercises in advance, especially when testing shared or third-party environments.

### Tools

Common open-source LLM red-teaming tools include:

| Tool | What it is | Good for |
|---|---|---|
| [garak](https://github.com/NVIDIA/garak) (NVIDIA) | LLM vulnerability scanner with attack probes and detectors | Broad model-level scans for jailbreaks, prompt injection, leakage, and toxicity |
| [PyRIT](https://github.com/Azure/PyRIT) (Microsoft) | Python Risk Identification Tool for orchestrating single- and multi-turn attack campaigns | Custom, programmable red-team campaigns against application endpoints |
| [promptfoo red teaming](https://www.promptfoo.dev/docs/red-team/) | CLI that generates adversarial test cases mapped to frameworks like the OWASP LLM Top 10 | Application-level red teaming wired directly into CI alongside offline evals |

Public prompt-injection benchmarks for tool-using agents let you compare defenses against a shared baseline before you build your own suite:

| Benchmark | What it measures |
|---|---|
| [AgentDojo](https://arxiv.org/abs/2406.13352) (Debenedetti et al., 2024) | 97 realistic tasks and 629 injection test cases across workspace, banking, travel, and Slack environments; reports utility with and without attack, and targeted attack success rate |
| [InjecAgent](https://arxiv.org/abs/2403.02691) (Zhan et al., 2024) | 1,054 indirect-injection test cases over 17 user tools and 62 attacker tools; separates direct harm from data stealing |
| [Agent Security Bench (ASB)](https://arxiv.org/abs/2410.02644) (Zhang et al., 2024) | Many attack types (direct and indirect injection, memory poisoning, Plan-of-Thought backdoor) and defenses across 10 scenarios |

Public benchmarks do not use your tools, data, or policies. Use them to choose and compare defenses, and use your own threat-model-driven suite as the release gate.

Compare additional options in [guardrail tools](../06-tooling-landscape/02-guardrail-tools.md) and [eval & observability tools](../06-tooling-landscape/01-eval-and-observability-tools.md).

### Metrics

| Metric | Definition | Target / use |
|---|---|---|
| Attack success rate (ASR) | Successful attacks divided by attempted attacks per goal | Track per release, with a target of **0** for data leakage and unauthorized actions |
| Utility under attack | Benign task success rate, measured with and without injected content | Report next to ASR; a defense that blocks every task is not a fix |
| Unsafe action execution rate | Unapproved T2 or T3 actions executed during adversarial tests | **0** |
| Detection rate | Fraction of attacks flagged by guardrails, even when blocked downstream | Higher is better to confirm defense-in-depth visibility |
| False positive rate | Fraction of benign requests blocked by security guardrails | Measure on normal traffic and keep low |
| Time to fix | Elapsed time from red-team finding to deployed fix and CI regression test | Measures security engineering responsiveness |

---

## 7. Threat-model worksheet template

Copy this STRIDE-based worksheet into your design document. STRIDE (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege) plus LLM-specific rows gives a broad baseline for agentic RAG reviews. It does not give complete coverage. Cross-check the result against the OWASP LLM and Agentic Top 10 and MITRE ATLAS. For privacy threats such as linkability, identifiability, and unawareness, add [LINDDUN](https://linddun.org/).

### Part A: System summary

| Field | Your answer |
|---|---|
| System name / owner | |
| Purpose and users (roles, tenants) | |
| Model(s) and providers | |
| Data sources (and sensitivity) | |
| Tools (with tier: read / write / external / destructive) | |
| Untrusted input surfaces | |
| Outbound channels | |
| Memory / caches | |
| Lethal trifecta present? Which legs, and how is it broken? | |

### Part B: STRIDE for LLM apps

| STRIDE category | LLM/agent-specific prompts | Example threat (running example) | Mitigation | Verification (eval/test/monitor) | Owner | Status |
|---|---|---|---|---|---|---|
| **S**poofing | Can a prompt claim an identity or role? Can content impersonate the system or another agent? Are MCP servers and agents authenticated? | "I'm an HR partner" unlocks HR answers | Resolve identity from auth session only, enforce authz in code | RBAC test matrix and role-claim red-team cases | | |
| **T**ampering | Can untrusted text alter instructions (injection)? Can someone edit indexed docs, memory, or tool descriptions? | Wiki page edited to change expense policy | Source trust tiers, provenance metadata, change monitoring | Poisoning drills and nightly golden Q&A drift checks | | |
| **R**epudiation | Can we prove who asked, what was retrieved, which tool ran, and who approved? | Ticket closed with no record of approver | Immutable audit log with identity, payload hash, and approval | Audit completeness assertions in CI | | |
| **I**nformation disclosure | Can unauthorized data enter the context, exfiltrate via links/images/tools, or leak via cache, memory, logs, or system prompt? | Semantic cache returns HR answer to employee | Permission-scoped cache, ACL pre-filter, egress controls | Canary docs and unauthorized retrieval rate = 0 | | |
| **D**enial of service | Can inputs trigger loops, huge queries, token blowups, or cost spikes? | Agent loops `run_sql` 200 times | Step/call/cost budgets, loop detector, EXPLAIN caps, rate limits | Looping-agent abuse tests and p99 cost alerts | | |
| **E**levation of privilege | Can the agent do more than the user could via generic tools, over-scoped tokens, or sandbox escape? | Service account reads all tickets | OBO tokens, object-level authz, narrow tools, isolated sandbox | Policy unit tests and unsafe action execution rate = 0 | | |
| **Misinformation** *(LLM addition)* | Can the assistant state false facts confidently or report wrong numbers from SQL? | Outdated travel policy cited as current | Groundedness gate, freshness metadata, abstention | Faithfulness, correctness, and SQL execution accuracy evals | | |
| **Harmful content** *(LLM addition)* | Can the assistant emit toxic, biased, or off-policy responses? | Offensive reply to a frustrated user | Output moderation classifiers and tone regeneration | Safety evaluation suite ([generation quality & safety](../02-offline-evals/03-generation-quality-and-safety-evals.md)) | | |

### Part C: Rating and decisions

| Threat ID | Likelihood (L/M/H) | Impact (L/M/H) | Risk | Decision (mitigate / accept / transfer / avoid) | Residual risk notes |
|---|---|---|---|---|---|
| | | | | | |

### Part D: Review triggers

- [ ] Review the threat model when adding a new tool or changing a tool impact tier.
- [ ] Update the threat model when connecting a new data source or changing data sensitivity.
- [ ] Re-evaluate risks before switching models, providers, or core system prompts.
- [ ] Review trust boundaries when onboarding a new user role, tenant, or channel (such as Slack or external users).
- [ ] Update controls and regression tests after any security incident or red-team finding.
- [ ] Schedule a recurring threat-model review at a fixed cadence (such as quarterly).

---

## 8. From threat model to guardrails and evals

Close the loop by mapping every identified threat to at least one **deterministic or probabilistic control** and one **automated verification**:

| Threat (example) | Control | Blocking? | Offline verification | Online verification |
|---|---|---|---|---|
| Indirect injection via wiki | Taint tracking + approval for T2/T3, plus injection classifier on retrieved chunks | Yes (gate), No (classifier signal) | Injection suite ASR | Classifier hit rate and blocked-action logs |
| Cross-tenant retrieval | Tenant resolved from identity, namespace per tenant, code post-check | Yes | Cross-tenant test matrix | Canary monitoring and post-check mismatch alerts |
| SQL write/DDL | Read-only database role + `sqlglot` AST guard | Yes | SQL guard corpus | Denied-query rate by reason |
| Data exfiltration via images | Disable remote image rendering and rewrite external links | Yes | Output fuzzing | Outbound request logs |
| Runaway cost | Step/cost budgets + loop detection | Yes | Scripted looping-agent tests | Cost p99 alerts |
| Misinformation | Groundedness gate and abstention fallback | Optional (block or warn) | Faithfulness and correctness evals | Sampled LLM-judge scores and user feedback |

See the [guardrail selection decision tree](../05-decision-framework/02-guardrail-selection-decision-tree.md) and [implementation playbook](../05-decision-framework/04-implementation-playbook.md) to prioritize controls for your architecture.

---

## Key takeaways

- **Threat model the full system, not the model in isolation.** Map trust boundaries where untrusted text enters, private data lives, and actions leave.
- **Use OWASP LLM Top 10 (2026) and Agentic Top 10 (2026) as your baseline.** Cover model, data, tool, memory, identity, and multi-agent risks systematically. Write IDs with the year suffix; 2026 renumbered most entries.
- **Assume prompt injection will sometimes succeed.** Contain the blast radius with least privilege, code-enforced authorization, and gated outbound channels.
- **Break the lethal trifecta in every agent.** Never allow private data, untrusted content, and un-gated external communication in the same context. Apply the Rule of Two to state changes too.
- **Combine NIST AI RMF governance with MITRE ATLAS attack paths.** Cite ATLAS technique IDs and AI 600-1 action IDs, and use your guardrails and evaluations as the measurable controls.
- **Red-team the complete stack using deterministic oracles.** Report attack success rate together with benign task success, and turn every red-team or production finding into a permanent CI regression test.
- **Pair every threat with both a control and a test.** If you do not test a mitigation automatically, you cannot trust it in production.

## Further reading

- [OWASP Top 10 for LLM Applications 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/) · [2025 edition](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/)
- [OWASP Agentic AI – Threats and Mitigations](https://genai.owasp.org/resource/agentic-ai-threats-and-mitigations/)
- [OWASP Top 10 for Agentic Applications for 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [OWASP: A Practical Guide for Secure MCP Server Development](https://genai.owasp.org/resource/a-practical-guide-for-secure-mcp-server-development/)
- [OWASP Threat Modeling](https://community.owasp.org/Threat_Modeling) · [LINDDUN privacy threat modeling](https://linddun.org/)
- [MITRE ATLAS](https://atlas.mitre.org/) · [ATLAS techniques](https://atlas.mitre.org/techniques/)
- [NIST AI RMF 1.0 (AI 100-1)](https://doi.org/10.6028/NIST.AI.100-1) · [NIST AI 600-1 Generative AI Profile](https://doi.org/10.6028/NIST.AI.600-1) · [NIST AI RMF hub](https://www.nist.gov/itl/ai-risk-management-framework)
- [ISO/IEC 42001:2023](https://www.iso.org/standard/42001) · [EU AI Act (Regulation (EU) 2024/1689)](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [Simon Willison: The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)
- [Greshake et al.: Not what you've signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection](https://arxiv.org/abs/2302.12173)
- [Debenedetti et al.: Defeating Prompt Injections by Design (CaMeL)](https://arxiv.org/abs/2503.18813)
- [Beurer-Kellner et al.: Design Patterns for Securing LLM Agents against Prompt Injections](https://arxiv.org/abs/2506.08837)
- [Meta: Agents Rule of Two](https://ai.meta.com/blog/practical-ai-agent-security/)
- Injection benchmarks: [AgentDojo](https://arxiv.org/abs/2406.13352) · [InjecAgent](https://arxiv.org/abs/2403.02691) · [Agent Security Bench](https://arxiv.org/abs/2410.02644)
- [MCP Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices) · [MCP specification (latest)](https://modelcontextprotocol.io/specification/latest) · [OWASP MCP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)
- Red-team tools: [garak](https://github.com/NVIDIA/garak) · [PyRIT](https://github.com/Azure/PyRIT) · [promptfoo red teaming](https://www.promptfoo.dev/docs/red-team/)
- **Within this repo:**
    - [Tool & action guardrails](./05-tool-and-action-guardrails.md)
    - [Access control & RBAC](./06-access-control-rbac.md)
    - [Guardrail selection decision tree](../05-decision-framework/02-guardrail-selection-decision-tree.md)
    - [References](../07-references/README.md)
