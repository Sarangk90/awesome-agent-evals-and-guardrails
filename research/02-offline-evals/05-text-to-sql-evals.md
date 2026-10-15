# Text-to-SQL Evals

> **TL;DR**
>
> - **Build a layered SQL evaluation stack.** Run fast syntax, schema, and safety checks before you execute any queries.
> - **Anchor on execution accuracy against a frozen database.** Compare query results against SME-written gold SQL on a pinned snapshot.
> - **Use string and AST similarity only for diagnostics.** Equivalent SQL queries often look completely different in text or syntax trees.
> - **Evaluate efficiency, schema linking, and the final prose answer.** Check query cost, table recall, and numeric grounding in the user response.

- **You will learn:**
    - The text-to-SQL eval ladder
    - Execution-accuracy comparators
    - SQL normalization with `sqlglot`
    - Spider, Spider 2.0, and BIRD benchmarks
    - Schema linking, safety, efficiency, and answer evals
    - Gold datasets with multiple valid queries
- **Prerequisites:** [Evals & guardrails map](../00-foundations/02-the-evals-and-guardrails-map.md), [SME golden datasets](../01-datasets/02-sme-golden-datasets.md)
- **Related:** [Agent tool & trajectory evals](./04-agent-tool-and-trajectory-evals.md), [LLM-as-a-judge](./07-llm-as-a-judge.md), [Running offline experiments](./08-running-offline-experiments.md), [Tool & action guardrails](../04-guardrails/05-tool-and-action-guardrails.md), [Access control & RBAC](../04-guardrails/06-access-control-rbac.md)

---

## 1. Why text-to-SQL needs its own eval stack

Consider our running example of an internal enterprise assistant. It answers questions over company docs, queries a data warehouse, and creates tickets. In this system, the text-to-SQL path is the most likely component to produce a **confidently wrong number**. A slightly inaccurate RAG answer usually contains visible hedging. By contrast, a SQL answer like "Q3 EMEA revenue was $4.12M" looks authoritative even when the query drops a join condition.

Text-to-SQL is also unusual because the output is **executable**. Execution gives you an objective oracle that most generative tasks lack. Two queries that look nothing alike can return identical results. Conversely, two queries that differ by one character (`>` vs `>=`) can return completely different results. String similarity is therefore a weak signal, whereas execution is a strong signal. However, execution has its own traps, including false positives on lucky data, non-deterministic ordering, and data drift.

```mermaid
flowchart TD
    Q["NL question + user role"] --> SL["Schema linking: pick tables and columns"]
    SL --> GEN["SQL generation"]
    GEN --> L1["L1 Syntactic validity: parses?"]
    L1 --> L2["L2 Schema validity: tables and columns exist?"]
    L2 --> L3["L3 Safety: read-only, LIMIT, allowed tables"]
    L3 --> L4["L4 Execution accuracy vs gold result"]
    L4 --> L5["L5 Semantic: test suites or LLM equivalence judge"]
    L5 --> L6["L6 Efficiency: EXPLAIN cost, bytes scanned"]
    L6 --> L7["L7 Answer-level: NL answer faithful to rows"]
    SL -.-> SLE["Schema-linking recall"]
    GEN -.-> DIAG["Diagnostics: exact match, component F1, AST diff"]
```

**Default recommendation (heuristic):** Gate every change on L1 through L4. Run L5 weekly or on release candidates. Track L6 and L7 as secondary metrics. Use exact match, component F1, and AST diffs only to *debug* failures.

---

## 2. The metric ladder at a glance

| Layer | Metric | Needs a DB? | Needs gold? | Cost | Main failure mode of the metric |
|---|---|---|---|---|---|
| L1 | Syntactic validity | No | No | ~free | Valid SQL can still be totally wrong |
| L2 | Schema validity | No (needs schema) | No | ~free | Correct tables, wrong logic |
| L3 | Safety / policy | No (static) + optional runtime | No | ~free | Static checks miss runtime RLS issues |
| Diagnostic | Exact match (string / normalized) | No | Yes | ~free | Massive false negatives |
| Diagnostic | Component match (clause F1) | No | Yes | ~free | Penalizes equivalent rewrites |
| Diagnostic | AST / tree-edit similarity | No | Yes | cheap | Similar ≠ equivalent |
| Diagnostic | Token / embedding similarity | No | Yes | cheap | Very weak correlation with correctness |
| L4 | Execution accuracy (EX) | Yes | Yes (gold SQL or gold result) | medium | False positives on "lucky" data |
| L5 | Test-suite accuracy | Yes (many DBs) | Yes | high | Expensive to build test DBs |
| L5 | LLM semantic-equivalence judge | No | Yes | medium | Judge errors on subtle logic |
| L6 | VES / cost ratio / bytes scanned | Yes | Gold for ratio | medium | Noisy timings |
| Diagnostic | Schema-linking recall | No | Yes (derived from gold SQL) | ~free | Only measures the retrieval step |
| L7 | Answer-level correctness | Yes | Yes | medium | Needs judge for phrasing |

---

## 3. Static checks (no database needed)

### 3.1 Syntactic validity

- **What it measures:** Whether the generated SQL parses in the target dialect.
- **Inputs required:** Generated SQL and target dialect. You do not need ground truth.
- **How to compute it:** Check whether `parse(sql, dialect)` succeeds, and divide valid queries by total queries. Use a real parser like [`sqlglot`](https://github.com/tobymao/sqlglot). Better yet, run the warehouse's own `EXPLAIN` or dry-run command to catch dialect-specific functions.
- **Score range & interpretation:** 0 to 1. Modern LLMs with a known schema should score very close to 1. Lower scores usually indicate prompt or formatting issues such as markdown fences, trailing prose, or the wrong dialect.
- **Pitfalls / gotchas:** Parsers vary in leniency. For example, `sqlglot` may accept SQL that Snowflake rejects, and vice versa. Strip markdown fences consistently before you parse, or you will only measure your post-processor.
- **When to use / when not to:** Always use this check as a fast first gate and an online guardrail. Never use it as a standalone success metric.
- **Implemented in:** promptfoo (`is-sql` assertion) or custom scripts.

### 3.2 Schema validity

- **What it measures:** Whether every referenced table and column exists in the role-visible schema without hallucinated identifiers.
- **Inputs required:** Generated SQL and the schema catalog (optionally filtered by user role). You do not need ground truth.
- **How to compute it:** Parse the query, qualify columns against the schema, and flag unknown tables or columns.
- **Score range & interpretation:** 0 to 1 (fraction of queries with zero unknown identifiers). Hallucinated columns typically indicate poor schema linking or overly long schema prompts.
- **Pitfalls / gotchas:** Exclude CTE names and subquery aliases so you do not mistake them for real tables. Account for dialect-specific case sensitivity and quoting rules. Include views and synonyms in your schema catalog.
- **When to use / when not to:** Always run this check. Use it both in offline evals and as a pre-execution guardrail.
- **Implemented in:** Custom scripts with `sqlglot`, or promptfoo's `is-sql` table and column restrictions.

```python
# Requires: pip install sqlglot  (tested against a recent sqlglot release; APIs evolve, so pin your version)
import sqlglot
from sqlglot import exp
from sqlglot.errors import ParseError
from sqlglot.optimizer.qualify import qualify

SCHEMA = {
    "orders":    {"order_id": "INT", "customer_id": "INT", "amount": "DECIMAL",
                  "created_at": "DATE", "region": "TEXT", "status": "TEXT"},
    "customers": {"customer_id": "INT", "name": "TEXT", "segment": "TEXT"},
}

def static_checks(sql: str, schema=SCHEMA, dialect="postgres") -> dict:
    try:
        tree = sqlglot.parse_one(sql, read=dialect)
    except ParseError as e:
        return {"parses": False, "schema_valid": False, "errors": [str(e)]}
    errors = []
    ctes = {c.alias_or_name.lower() for c in tree.find_all(exp.CTE)}
    for t in tree.find_all(exp.Table):
        if t.name.lower() not in schema and t.name.lower() not in ctes:
            errors.append(f"unknown table: {t.name}")
    if not errors:
        try:  # raises if a column can't be resolved against the schema
            qualify(tree.copy(), schema=schema, dialect=dialect, validate_qualify_columns=True)
        except Exception as e:
            errors.append(f"unresolved column: {e}")
    return {"parses": True, "schema_valid": not errors, "errors": errors}

static_checks("SELECT foo FROM orders")   # -> schema_valid False, "Column 'foo' could not be resolved"
static_checks("SELECT * FROM orderz")     # -> schema_valid False, "unknown table: orderz"
```

### 3.3 Safety and policy checks

Text-to-SQL is a **tool call with side effects on shared infrastructure**. Evaluate safety offline to see if the model proposes unsafe queries on adversarial prompts. Enforce safety online as a blocking guardrail. See [Tool & action guardrails](../04-guardrails/05-tool-and-action-guardrails.md) and [Access control & RBAC](../04-guardrails/06-access-control-rbac.md) for details.

| Check | Static or runtime | Blocking guardrail? | Offline eval metric |
|---|---|---|---|
| Single statement only (no `;` chaining) | Static | Yes | % violating |
| Read-only: no `INSERT/UPDATE/DELETE/MERGE`, no DDL (`CREATE/DROP/ALTER/TRUNCATE`), no `GRANT` | Static + read-only DB role | Yes | % violating |
| `LIMIT` present and ≤ max | Static (or auto-inject) | Rewrite or block | % missing / exceeding |
| Allowed tables only (role-scoped) | Static | Yes | % touching forbidden tables |
| Row-level security respected | Runtime (DB policies) | Yes, at DB layer | % of RBAC test cases leaking rows |
| No PII columns selected for role | Static (column tags) | Yes / mask | % selecting tagged columns |
| Cost ceiling | Runtime (`EXPLAIN` / dry run) | Yes | % over budget |

```python
# Static safety checker: a defence-in-depth layer, NOT a substitute for a read-only DB role + RLS.
import sqlglot
from sqlglot import exp
from sqlglot.errors import ParseError

WRITE_NODES = tuple(getattr(exp, n) for n in (
    "Insert", "Update", "Delete", "Merge", "Create", "Drop", "Alter", "AlterTable",
    "TruncateTable", "Command", "Grant",   # names vary across sqlglot versions; hasattr keeps this portable
) if hasattr(exp, n))

def safety_violations(sql, dialect="postgres", max_limit=1000, allowed_tables=None) -> list[str]:
    try:
        stmts = [s for s in sqlglot.parse(sql, read=dialect) if s is not None]
    except ParseError:
        return ["unparseable"]
    if len(stmts) != 1:
        return [f"expected 1 statement, got {len(stmts)}"]
    tree, v = stmts[0], []
    if not isinstance(tree, exp.Query):
        v.append(f"top-level {type(tree).__name__} is not a read query")
    v += [f"write/DDL node: {type(n).__name__}" for n in tree.walk() if isinstance(n, WRITE_NODES)]
    limit = tree.args.get("limit")
    if limit is None:
        v.append("missing LIMIT")
    elif isinstance(limit.expression, exp.Literal) and int(limit.expression.this) > max_limit:
        v.append(f"LIMIT {limit.expression.this} > {max_limit}")
    if allowed_tables is not None:
        ctes = {c.alias_or_name.lower() for c in tree.find_all(exp.CTE)}
        v += [f"table not allowed: {t.name}" for t in tree.find_all(exp.Table)
              if t.name.lower() not in allowed_tables | ctes]
    return v

safety_violations("SELECT 1 LIMIT 1; DROP TABLE orders")  # ['expected 1 statement, got 2']
safety_violations("WITH x AS (SELECT * FROM salaries) SELECT * FROM x LIMIT 5",
                  allowed_tables={"orders"})               # ['table not allowed: salaries']
```

**You cannot verify row-level security (RLS) statically.** Build an **RBAC test slice** that asks the same question under different roles (`sales_emea`, `finance_global`, `contractor`). Compute expected results by executing the gold SQL *as that role* against a database that enforces RLS. Check that the predicted results match the role-scoped gold results. For forbidden questions, verify that the agent refuses the request or returns zero rows. Never connect your eval harness as a superuser, or you will test a system that does not match production.

---

## 4. Similarity metrics (diagnostics, not success criteria)

Similarity metrics compare predicted SQL to gold SQL *as text or syntax trees*. They are cheap and do not require a database. Use them to **cluster and debug failures**, not to make release decisions.

### 4.1 Exact match (string and normalized)

- **What it measures:** Whether predicted SQL matches gold SQL as raw strings or after normalization.
- **Inputs required:** Predicted SQL and one or more gold SQL queries.
- **How to compute it:** Set `EM = 1` if `normalize(pred) == normalize(g)` for any gold query `g`, and `0` otherwise.
- **Score range & interpretation:** 0 to 1. Raw string EM is nearly useless because of whitespace, casing, and alias differences. Normalized EM gives a **lower bound** on correctness: a match is almost certainly right, but a mismatch tells you very little.
- **Pitfalls / gotchas:** Equivalent constructs fail exact match. Examples include `GROUP BY 1` vs `GROUP BY region`, `a >= x` vs `x <= a`, `COUNT(*)` vs `COUNT(id)` on a non-null primary key, `IN (subquery)` vs `JOIN`, and CTEs vs subqueries.
- **When to use / when not to:** Use normalized EM as a fast "definitely correct" signal and for caching. Do not use it as your headline metric.
- **Implemented in:** Spider's official evaluation script ("exact set match", which compares clause sets and ignores literals) or custom scripts.

**Normalization with `sqlglot`.** The `sqlglot.optimizer.optimize` function qualifies columns, quotes identifiers, canonicalizes expressions, and expands positional `GROUP BY` clauses. Add table-alias canonicalization on top of the optimizer:

```python
# Requires: pip install sqlglot. Optimizer rules change between versions; pin and snapshot-test.
import sqlglot
from sqlglot import exp
from sqlglot.errors import ParseError, OptimizeError
from sqlglot.optimizer import optimize

def normalize_sql(sql: str, schema: dict, dialect: str = "postgres") -> str | None:
    try:
        tree = sqlglot.parse_one(sql, read=dialect)
    except ParseError:
        return None
    # Canonicalize table aliases (o.amount -> orders.amount). Skip if a table appears twice (self-join).
    names = [t.name for t in tree.find_all(exp.Table)]
    if len(names) == len(set(names)):
        alias_to_table = {}
        for t in tree.find_all(exp.Table):
            if t.alias:
                alias_to_table[t.alias] = t.name
                t.set("alias", None)
        for c in tree.find_all(exp.Column):
            if c.table in alias_to_table:
                c.set("table", exp.to_identifier(alias_to_table[c.table]))
    try:
        tree = optimize(tree, schema=schema, dialect=dialect)
    except OptimizeError:
        pass  # fall back to the parsed-but-unoptimized tree
    return tree.sql(dialect=dialect)

a = "select region, sum(amount) as total from orders where created_at >= '2024-01-01' group by region"
b = "SELECT o.region, SUM(o.amount) total FROM orders AS o WHERE '2024-01-01' <= o.created_at GROUP BY 1"
normalize_sql(a, SCHEMA) == normalize_sql(b, SCHEMA)   # True with the version we tested
```

Even after normalization, `FROM orders JOIN customers` and `FROM customers JOIN orders` produce different strings. Normalization narrows the false-negative gap, but it never closes it completely.

### 4.2 Component matching (Spider-style clause F1)

- **What it measures:** Per-clause overlap between predicted and gold SQL across `SELECT`, `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, and `LIMIT`. The original [Spider](https://arxiv.org/abs/1809.08887) evaluation uses this approach and buckets questions by hardness (easy, medium, hard, extra hard).
- **Inputs required:** Predicted SQL and gold SQL.
- **How to compute it:** Treat the items in each clause (select expressions, AND-ed predicates, group keys) as a set. Compute F1 between the gold and predicted sets:

    ```text
    P_c = |gold_c ∩ pred_c| / |pred_c|     R_c = |gold_c ∩ pred_c| / |gold_c|
    F1_c = 2·P_c·R_c / (P_c + R_c)          (F1_c = 1 if both sets empty)
    ```

- **Score range & interpretation:** 0 to 1 per component. Aggregate these scores across your dataset to find weak spots. For example, a low `WHERE` F1 tells you to improve filter generation (date ranges, status codes) rather than joins.
- **Worked example:**

    ```text
    gold: SELECT region, SUM(amount) AS total FROM orders
          WHERE created_at >= '2024-01-01' AND status = 'paid'
          GROUP BY region ORDER BY total DESC LIMIT 5
    pred: SELECT region, SUM(amount) FROM orders
          WHERE status = 'paid'
          GROUP BY region ORDER BY SUM(amount) DESC LIMIT 5

    select 1.0 · from 1.0 · where 0.67 · group_by 1.0 · having 1.0 · order_by 0.0 · limit 1.0
    ```

    The `WHERE` score of 0.67 correctly flags the missing date filter. However, the `ORDER BY` score of 0.0 is a **false alarm** because `total` and `SUM(amount)` are equivalent. This false alarm illustrates the main weakness of syntactic metrics.

- **Pitfalls / gotchas:** Watch for alias-versus-expression mismatches, OR-ed predicates, and nested subqueries. Normalize both queries before you compare components.
- **When to use / when not to:** Use component F1 for error analysis and clause-level debugging dashboards. Do not use it as a release gate.
- **Implemented in:** Spider evaluation script ([taoyds/spider](https://github.com/taoyds/spider)) or custom scripts.

```python
import sqlglot
from sqlglot import exp

def _split_and(node):
    if node is None:
        return []
    if isinstance(node, exp.And):
        return _split_and(node.left) + _split_and(node.right)
    return [node]

def components(sql: str, dialect="postgres") -> dict[str, set[str]]:
    tree = sqlglot.parse_one(sql, read=dialect)
    sel = tree if isinstance(tree, exp.Select) else tree.find(exp.Select)
    fmt = lambda nodes: {n.unalias().sql(dialect=dialect).lower() for n in nodes}
    w, h, g, o = (sel.args.get(k) for k in ("where", "having", "group", "order"))
    return {
        "select":   fmt(sel.expressions),
        "from":     {t.name.lower() for t in sel.find_all(exp.Table)},
        "where":    fmt(_split_and(w.this if w else None)),
        "group_by": fmt(g.expressions if g else []),
        "having":   fmt(_split_and(h.this if h else None)),
        "order_by": fmt(o.expressions if o else []),
        "limit":    {sel.args["limit"].sql(dialect=dialect).lower()} if sel.args.get("limit") else set(),
    }

def f1(gold: set, pred: set) -> float:
    if not gold and not pred:
        return 1.0
    tp = len(gold & pred)
    if tp == 0:
        return 0.0
    p, r = tp / len(pred), tp / len(gold)
    return 2 * p * r / (p + r)

def component_scores(gold_sql: str, pred_sql: str) -> dict[str, float]:
    g, p = components(gold_sql), components(pred_sql)
    return {k: f1(g[k], p[k]) for k in g}
```

### 4.3 AST / tree-edit similarity

- **What it measures:** Structural distance between the parse trees of predicted and gold SQL. It counts the insert, delete, update, and move operations needed to transform one tree into the other.
- **Inputs required:** Predicted SQL and gold SQL.
- **How to compute it:** Parse both queries after normalization and compute a tree diff. Calling `sqlglot.diff(source_tree, target_tree)` returns edit operations (`Insert`, `Remove`, `Move`, `Update`, `Keep`). You can define similarity heuristically as `1 - edits / max(nodes_gold, nodes_pred)`, or use Zhang–Shasha tree edit distance.
- **Score range & interpretation:** 0 to 1 (higher means more similar). Use this score to gauge structural distance and cluster failure patterns.
- **Pitfalls / gotchas:** A single-node edit (`>` to `>=`, or `LEFT` to `INNER JOIN`) can completely change semantics. Conversely, a large rewrite (subquery to CTE) can preserve exact equivalence. Structural similarity correlates weakly with semantic correctness.
- **When to use / when not to:** Use for diagnostics, partial credit in research, and sorting failures for human review. Never use it as a release gate.
- **Implemented in:** `sqlglot.diff` (as a building block) or custom scripts.

### 4.4 Token and embedding similarity

- **What it measures:** Lexical similarity (BLEU, ROUGE, token Jaccard) or embedding cosine similarity between SQL strings.
- **Inputs required:** Predicted SQL and gold SQL.
- **How to compute it:** Tokenize normalized SQL to compute Jaccard or BLEU, or embed both SQL strings and compute cosine similarity.
- **Score range & interpretation:** 0 to 1. High scores do **not** guarantee correctness, and low scores do **not** prove an error.
- **Pitfalls / gotchas:** `WHERE amount > 100` and `WHERE amount < 100` score near 1.0 on both lexical and embedding similarity. Generic text embedding models do not encode SQL semantics.
- **When to use / when not to:** Use rarely. You can use it to detect near-duplicates in datasets or group similar failures, but never report it as accuracy.
- **Implemented in:** Generic string or embedding similarity assertions (promptfoo `similar`, RAGAS semantic similarity), though none are SQL-aware.

---

## 5. Execution-based metrics (the core)

### 5.1 Execution accuracy (EX)

- **What it measures:** Whether running the predicted SQL returns the same result table as running the gold SQL on the same database state.
- **Inputs required:** Predicted SQL, gold SQL (or stored gold result), and a pinned database snapshot.
- **How to compute it:** Execute both queries, canonicalize the result tables, and compare them: `EX = (1/N) Σ 1[result(pred_i) ≡ result(gold_i)]`. Define equivalence (`≡`) through an explicit **comparison policy**:

| Policy decision | Default (heuristic) | Why |
|---|---|---|
| Row order | Ignore unless gold has a top-level `ORDER BY` | Without `ORDER BY`, SQL row order is undefined |
| Duplicates | Compare as **multisets** (keep duplicates) | `SELECT DISTINCT` vs not can matter (counts) |
| Column order | Ignore (find a column permutation) | `SELECT a, b` vs `SELECT b, a` answer the same question |
| Column names / aliases | Ignore | Aliases are presentation |
| Extra columns | Fail by default; optionally allow "pred ⊇ gold columns" | Extra context columns are often harmless for a chat answer; decide per use case |
| Floats | Round to ~6 decimals or use relative tolerance | `AVG` across engines/plans differs in low bits |
| Decimals / ints | Cast numerics to float before compare | `Decimal('10.0')` vs `10` |
| Dates / timestamps | ISO-format; normalize timezone | Drivers return different types |
| NULLs | `NULL == NULL` for result comparison | Result sets, not SQL semantics |
| Empty results | Flag separately | Both empty → "match", but often a weak signal (see pitfalls) |
| Prediction errors | Count as failure; log error class | Separate "invalid" from "wrong" in reports |

- **Score range & interpretation:** 0 to 1. Anchor your evaluation stack and release gates on this metric, provided your gold dataset is reliable.
- **Pitfalls / gotchas:**
    - **False positives on lucky data.** A query that omits `status = 'paid'` still passes if every row in the snapshot is paid. Empty-result matches are the worst offenders. Mitigate this with test suites (§5.2), multiple snapshots, and seeded edge-case fixtures.
    - **False negatives on valid alternatives.** A prompt asking for "top customers" might validly use `LIMIT 5` or `LIMIT 10`. Store **multiple gold queries** or tag the item as ambiguous.
    - **Data drift.** Stored gold *results* go stale when warehouse data changes. Store gold *SQL* instead, and execute both queries against the same pinned snapshot (time-travel `AS OF`, a cloned schema, or a fixture database).
    - **Non-determinism.** Queries can be non-deterministic due to `LIMIT` without `ORDER BY`, ties in `ORDER BY ... LIMIT k`, or functions like `NOW()` and `CURRENT_DATE`. Freeze the reference date in your eval harness and make gold queries deterministic.
    - **Timeouts and cost.** Enforce a statement timeout and a cost ceiling on your evaluation database connection.
- **When to use / when not to:** Always use execution accuracy once you have a database snapshot. It is the closest fast proxy for whether the user got the right data.
- **Implemented in:** Spider and BIRD official eval scripts, RAGAS `DataCompyScore`, or the custom comparator below.

**Pure-Python execution-accuracy comparator:**

```python
import math
from collections import Counter
from datetime import date, datetime
from decimal import Decimal
from itertools import permutations

def _canon(v, ndigits=6):
    if v is None:
        return None
    if isinstance(v, bool):
        return int(v)
    if isinstance(v, (int, float, Decimal)):
        f = float(v)
        return "NaN" if math.isnan(f) else round(f, ndigits) + 0.0   # +0.0 folds -0.0 into 0.0
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    if isinstance(v, str):
        return v.strip()
    return v

def results_match(gold_rows, pred_rows, *, order_matters=False, ignore_column_order=True,
                  ignore_duplicates=False, ndigits=6, max_cols_for_permutation=8) -> bool:
    g = [tuple(_canon(v, ndigits) for v in r) for r in gold_rows]
    p = [tuple(_canon(v, ndigits) for v in r) for r in pred_rows]
    if not g and not p:
        return True                      # report empty-vs-empty matches separately!
    ncols = len(g[0]) if g else 0
    if ncols != (len(p[0]) if p else 0):
        return False
    if ignore_duplicates and not order_matters:
        g, p = list(dict.fromkeys(g)), list(dict.fromkeys(p))
    if len(g) != len(p):
        return False

    def same(perm):
        pp = [tuple(r[i] for i in perm) for r in p]
        return pp == g if order_matters else Counter(pp) == Counter(g)

    if same(tuple(range(ncols))):
        return True
    if not ignore_column_order or ncols > max_cols_for_permutation:
        return False
    # Prune: gold column i can only map to pred columns with the same value multiset.
    g_cols = [Counter(r[i] for r in g) for i in range(ncols)]
    p_cols = [Counter(r[j] for r in p) for j in range(ncols)]
    cands = [{j for j in range(ncols) if p_cols[j] == g_cols[i]} for i in range(ncols)]
    if any(not c for c in cands):
        return False
    return any(all(perm[i] in cands[i] for i in range(ncols)) and same(perm)
               for perm in permutations(range(ncols)))

def execution_match(conn, gold_sql: str, pred_sql: str, gold_is_ordered: bool, **kw) -> dict:
    gold = conn.execute(gold_sql).fetchall()
    try:
        pred = conn.execute(pred_sql).fetchall()
    except Exception as e:  # syntax error, unknown column, timeout...
        return {"match": False, "error": type(e).__name__, "empty_gold": not gold}
    return {"match": results_match(gold, pred, order_matters=gold_is_ordered, **kw),
            "error": None, "empty_gold": not gold}
```

Derive `gold_is_ordered` from the parsed gold query (`sqlglot.parse_one(gold).args.get("order") is not None`) rather than a substring search. An `ORDER BY` inside a window function or subquery does not order the final result. When an item has **multiple valid gold queries**, mark the prediction as passing if it matches *any* gold query.

### 5.2 Test-suite accuracy (Zhong et al., 2020)

- **What it measures:** Semantic equivalence approximated by executing queries across **many** database instances instead of one. See [Semantic Evaluation for Text-to-SQL with Distilled Test Suites](https://arxiv.org/abs/2010.02840) (Zhong, Yu & Klein, EMNLP 2020).
- **Inputs required:** Predicted SQL, gold SQL, and a test suite of databases sharing the same schema.
- **How to compute it:** Generate random database instances via fuzzing. Mutate the gold query to create "neighbor" queries (such as changing operators or dropping predicates). Distill a small suite of databases that distinguishes the gold query from as many neighbors as possible. Mark a prediction as passing only if its output matches the gold output on **every** database in the suite. The Spider leaderboard adopted this metric ([taoyds/test-suite-sql-eval](https://github.com/taoyds/test-suite-sql-eval)).
- **Score range & interpretation:** 0 to 1. Test-suite accuracy is always less than or equal to single-database EX because it is strictly harder to pass. The gap between EX and test-suite accuracy estimates your false-positive rate.
- **Pitfalls / gotchas:** Generating realistic synthetic fixtures for a complex enterprise warehouse with hundreds of tables, foreign keys, and business invariants is difficult. Random data can violate business invariants and cause spurious mismatches.
- **When to use / when not to:** Use on release candidates and to estimate how much single-snapshot EX over-counts. In enterprise warehouses, approximate test-suite accuracy with three practical steps:
    - [ ] Run EX across **2–3 different snapshots or date partitions** of the warehouse.
    - [ ] Build a **small seeded fixture database** with edge cases (NULLs, `LIMIT` ties, duplicate names, timezone boundaries, soft-deleted rows).
    - [ ] **Mutation-check your fixture suite:** Mutate gold queries (drop predicates, flip `>` to `>=`) and verify every mutant fails.
- **Implemented in:** [taoyds/test-suite-sql-eval](https://github.com/taoyds/test-suite-sql-eval) (for Spider-format schemas) or custom harnesses.

### 5.3 Valid Efficiency Score (VES, BIRD)

- **What it measures:** Query correctness and runtime efficiency together, introduced in [BIRD](https://arxiv.org/abs/2305.03111) (Li et al., 2023).
- **Inputs required:** Predicted SQL, gold SQL, database connection, and execution timings.
- **How to compute it:**

    ```text
    VES = (1/N) · Σ_n  1[result(pred_n) == result(gold_n)] · R(n)
    R(n) = sqrt( time(gold_n) / time(pred_n) )
    ```

    Incorrect queries score 0. Correct queries earn higher credit when they run faster relative to the gold query. BIRD Mini-Dev also introduced a **Reward-based VES (R-VES)** that assigns reward points by time-ratio buckets for greater stability, alongside a result-table **Soft F1-score**. See the [BIRD Mini-Dev repo](https://github.com/bird-bench/mini_dev) for details.

- **Score range & interpretation:** 0 or higher (can exceed EX if predicted queries run faster than gold). If VES is much lower than EX, your generated queries are correct but slow.
- **Pitfalls / gotchas:** Wall-clock timings fluctuate due to caching, concurrency, and warehouse auto-scaling. Run repeated executions, take the median, and control cache state consistently.
- **When to use / when not to:** Use when query cost or latency matters in your warehouse. For enterprise cloud warehouses, deterministic cost proxies (§7) are usually more stable than wall-clock timings.
- **Implemented in:** BIRD evaluation scripts ([bird-bench](https://bird-bench.github.io/)) or custom scripts.

---

## 6. Semantic equivalence with an LLM judge

- **What it measures:** Whether predicted SQL and gold SQL answer the question equivalently, as graded by an LLM judge inspecting both queries.
- **Inputs required:** Question, relevant schema (DDL and column descriptions), gold SQL, predicted SQL, and optional result previews.
- **How to compute it:** Run a binary judge prompt (see [LLM-as-a-judge](./07-llm-as-a-judge.md) for prompt design and calibration):

    ```text
    You are a senior analytics engineer. Decide whether CANDIDATE SQL answers the QUESTION
    equivalently to REFERENCE SQL on ANY valid database state for this SCHEMA.
    Consider: filters (incl. inclusive/exclusive bounds), join types and NULL handling, DISTINCT,
    aggregation grain, GROUP BY keys, ORDER BY + LIMIT ties, date/timezone logic.
    Ignore: aliases, formatting, column order, CTE vs subquery style.
    First list each semantic difference you find, then output JSON:
    {"differences": [...], "equivalent": true|false}
    ```

- **Score range & interpretation:** 0 to 1 (fraction judged equivalent). Use this judge to resolve EX failures, catch EX false positives on lucky data, or evaluate without database access.
- **Pitfalls / gotchas:** LLM judges often miss subtle NULL, `LEFT JOIN`, or boundary condition bugs, and surface similarity can fool them. Validate the judge against human labels (aim for TPR and TNR ≥ 0.9) before trusting it. Never use an LLM judge *instead of* execution when a database is available. Use it *alongside* execution.
- **When to use / when not to:** Use to triage EX disagreements and evaluate items where maintaining all valid gold queries is impractical. Never use it as your sole correctness signal for numeric answers.
- **Implemented in:** RAGAS (`SQLSemanticEquivalence`, formerly `LLMSQLEquivalence`), DeepEval `GEval`, or promptfoo `llm-rubric`.

**Combining signals.** Use this flow to assign a practical verdict per item:

```mermaid
flowchart TD
    A["Pred parses and is schema-valid?"] -->|No| F["FAIL: invalid"]
    A -->|Yes| B["Results match ANY gold on all snapshots?"]
    B -->|Yes| C["Gold result empty or trivially small?"]
    C -->|No| P["PASS"]
    C -->|Yes| J1["LLM equivalence judge"]
    B -->|No| J2["LLM equivalence judge"]
    J1 -->|equivalent| P
    J1 -->|not equivalent| F2["FAIL: lucky match"]
    J2 -->|equivalent| R["Human review: possibly a new valid gold"]
    J2 -->|not equivalent| F3["FAIL: wrong result"]
```

Route disagreements (`J2 -> equivalent`) to human review so your dataset accumulates **alternate gold queries** over time.

---

## 7. Efficiency and cost

A correct query that scans 4 TB is still a production incident. Evaluate query efficiency with deterministic proxies before relying on wall-clock timings:

| Signal | How to get it | Metric (heuristic) |
|---|---|---|
| Planner cost estimate | Postgres `EXPLAIN (FORMAT JSON)` → top-level `Total Cost`; other engines have their own `EXPLAIN` | `cost_ratio = cost(pred) / cost(gold)`; flag > 2× |
| Bytes scanned | BigQuery dry run (`totalBytesProcessed`); warehouse query history | % of queries over a per-query byte budget |
| Rows scanned / partitions pruned | `EXPLAIN` output; Snowflake query profile | Flag full scans on partitioned fact tables |
| Anti-patterns | Static `sqlglot` checks | `SELECT *` on wide tables, missing partition filter, cross join, `ORDER BY` without `LIMIT` on huge sets |
| Wall-clock latency | Repeated execution, median | p50/p95 vs budget; VES (§5.3) |

Compute efficiency metrics **only on correct queries**, or a broken query that returns zero rows immediately will look artificially efficient. Track efficiency as a guardrail metric with a strict budget rather than a score to maximize.

---

## 8. Schema-linking evals

Enterprise warehouse schemas rarely fit in a single prompt. Most agents first **retrieve** relevant tables and columns using vector search over table docs, a semantic layer, or an LLM selector. If schema linking misses a required table, SQL generation cannot succeed. Evaluate schema linking as a retrieval step (see [Retrieval metrics](./02-retrieval-metrics.md)).

- **What it measures:** Whether the retriever selects all schema elements needed to answer the question.
- **Inputs required:** Question, retrieved schema elements (tables and columns), and gold schema elements. You can **derive gold schema elements automatically** by extracting tables and columns from your gold SQL queries.
- **How to compute it:**

    ```text
    table_recall@k  = |gold_tables ∩ retrieved_tables@k|  / |gold_tables|
    column_recall@k = |gold_cols   ∩ retrieved_cols@k|    / |gold_cols|
    all_tables_hit  = 1 if gold_tables ⊆ retrieved_tables@k else 0     # strict, per question
    precision@k     = |gold ∩ retrieved@k| / k                         # prompt-noise proxy
    ```

- **Score range & interpretation:** 0 to 1. Focus on **`all_tables_hit`** because partial table recall is almost as bad as zero recall for join queries. Track precision secondarily, since extra irrelevant tables increase prompt length, confusion, and cost.
- **Worked example:** Suppose the gold query uses `{orders, customers}`. At `k=5`, the retriever returns `{orders, order_items, products, regions, customers}`, giving `table_recall = 1.0`, `all_tables_hit = 1`, and `precision = 0.4`. At `k=3`, it returns `{orders, order_items, products}`, dropping recall to `0.5` and `all_tables_hit` to `0`, which causes generation to fail or hallucinate a column.
- **Pitfalls / gotchas:** Different valid gold queries may use different tables (such as a view versus base tables). Accept a match against any valid gold query, and include columns used in `JOIN ... ON` clauses. Compare the tables used in the predicted SQL against the retrieved tables to distinguish retrieval failures from generator failures.
- **When to use / when not to:** Always evaluate schema linking when your pipeline retrieves schema subsets. Run sweeps across `k` when tuning your retriever (see [Running offline experiments](./08-running-offline-experiments.md)).
- **Implemented in:** Custom scripts or standard retrieval metric libraries.

```python
import sqlglot
from sqlglot import exp

def schema_elements(sql: str, dialect="postgres") -> tuple[set[str], set[str]]:
    tree = sqlglot.parse_one(sql, read=dialect)
    ctes = {c.alias_or_name.lower() for c in tree.find_all(exp.CTE)}
    tables = {t.name.lower() for t in tree.find_all(exp.Table)} - ctes
    cols = {c.name.lower() for c in tree.find_all(exp.Column)}   # qualify() first for table.column precision
    return tables, cols

def schema_linking_scores(gold_sqls: list[str], retrieved_tables: list[str], k: int) -> dict:
    top_k = {t.lower() for t in retrieved_tables[:k]}
    best = None
    for g in gold_sqls:                                     # any valid gold counts
        gold_tables, _ = schema_elements(g)
        rec = len(gold_tables & top_k) / len(gold_tables)
        cand = {"table_recall": rec, "all_tables_hit": gold_tables <= top_k,
                "precision": len(gold_tables & top_k) / max(len(top_k), 1)}
        best = cand if best is None or rec > best["table_recall"] else best
    return best
```

---

## 9. Answer-level evals (the user sees prose, not SQL)

Most agents summarize SQL result rows into natural language (for example, "EMEA revenue in Q3 was $4.12M, up 8% QoQ"). Even when the SQL query is correct, the generator can misread a column, use the wrong units, or hallucinate a trend. Because the user only sees the prose answer, evaluate the final response directly:

| Eval | Inputs | Method | Ground truth? |
|---|---|---|---|
| **Numeric grounding** | answer, result rows | Extract numbers from answer; each must match a value (or simple derivation) in the result within tolerance | No |
| **Answer faithfulness to result** | answer, result rows | LLM judge: is every claim supported by the rows? (same idea as RAG faithfulness; see [End-to-end RAG evals](./01-end-to-end-rag-evals.md)) | No |
| **Answer correctness** | answer, gold answer or gold result | LLM judge or numeric compare vs gold result | Yes |
| **Completeness** | answer, question, result | Judge: does it answer all parts (e.g. "and QoQ change")? | No |
| **Empty / error handling** | answer, result | Deterministic: empty result → answer must say "no data" and not invent numbers | No |
| **Assumption disclosure** | answer, SQL | Judge: did it state interpretations (fiscal vs calendar quarter, timezone, "active" definition)? | No |
| **Clarification behaviour** | question tagged ambiguous | Pass if agent asks a clarifying question instead of guessing | Label required |

```python
import re

# Standalone numbers like "$4.12M", "1,200", "8%", but not the "3" in "Q3".
NUM = re.compile(r"(?<![\w.])-?\$?\d[\d,]*(?:\.\d+)?(?:\s*[kKmMbB%])?(?!\w)")
SCALE = {"k": 1e3, "m": 1e6, "b": 1e9}

def _to_float(tok: str):
    t = tok.replace("$", "").replace(",", "").strip()
    mult = SCALE.get(t[-1].lower(), 1) if t and t[-1].lower() in SCALE else 1
    try:
        return float(t.rstrip("kKmMbB").strip()) * mult
    except ValueError:
        return None

def ungrounded_numbers(answer: str, rows: list[tuple], rel_tol=0.01) -> list[str]:
    """Numbers in the answer that don't approximately match any numeric cell in the result."""
    cells = [float(v) for r in rows for v in r if isinstance(v, (int, float))]
    bad = []
    for tok in NUM.findall(answer):
        if tok.strip().endswith("%"):
            continue   # derived values (percent change) need a judge or an allow-list of derivations
        x = _to_float(tok)
        if x is None or (x.is_integer() and 1900 <= x <= 2100):   # crude: skip years
            continue
        if not any(abs(x - c) <= rel_tol * max(abs(c), 1) for c in cells):
            bad.append(tok.strip())
    return bad

ungrounded_numbers("EMEA revenue was $4.12M in Q3.", [("EMEA", 4_118_530.0)])   # []
ungrounded_numbers("EMEA revenue was $5.2M in Q3.",  [("EMEA", 4_118_530.0)])   # ['$5.2M']
```

---

## 10. Agentic text-to-SQL: beyond single-shot

Modern text-to-SQL agents explore the schema, run probe queries, inspect error messages, and retry. Evaluate the full **trajectory** alongside the final query (see [Agent tool & trajectory evals](./04-agent-tool-and-trajectory-evals.md)):

- **Final-state metrics:** Measure execution accuracy of the *final* SQL query and correctness of the final prose answer.
- **Process metrics:** Track SQL executions per question, schema-exploration calls, and total bytes scanned across *all* probe queries. Also measure error-recovery rate (the fraction of runs with an initial execution error that still finish correct).
- **Safety across the trajectory:** Validate every intermediate probe query with the safety checks in §3.3, not just the final query.
- **Clarify vs guess:** Check whether the agent asks a clarifying question on ambiguous inputs instead of guessing.

---

## 11. Benchmarks: what they tell you (and don't)

| Benchmark | What it is | Primary metrics | Use it for |
|---|---|---|---|
| [Spider](https://arxiv.org/abs/1809.08887) (Yu et al., 2018) | Cross-domain text-to-SQL: ~10k questions over 200 databases; hardness buckets | Exact set match (component-based, values ignored), execution accuracy, later test-suite accuracy | Historical baseline; understanding component matching. Largely saturated by modern LLMs |
| [Spider 2.0](https://arxiv.org/abs/2411.07763) (Lei et al., 2024) | Real-world *enterprise* text-to-SQL **workflows**: large schemas, multiple dialects/warehouses (e.g. BigQuery, Snowflake), multi-step and agentic tasks; has lighter variants (Spider 2.0-Lite, Spider 2.0-Snow) | Execution-based task success | Closest public proxy for enterprise warehouse agents; good reality check |
| [BIRD](https://arxiv.org/abs/2305.03111) (Li et al., 2023) | ~12.7k question/SQL pairs over 95 large, "dirty" real databases, with **external-knowledge evidence** per question | Execution accuracy, VES | Testing value/knowledge grounding and efficiency |

**Public benchmark scores do not transfer to your warehouse.** Internal table names, custom business definitions, and data hygiene dominate real-world performance. Use public benchmarks to shortlist candidate models, and use your **own SME gold dataset** to make final decisions.

---

## 12. Building the dataset

Use this record structure for your text-to-SQL dataset (see [SME golden datasets](../01-datasets/02-sme-golden-datasets.md) and [Synthetic datasets](../01-datasets/03-synthetic-datasets.md)):

```yaml
id: sql-0142
question: "What was net revenue by region last quarter?"
role: finance_global                       # RBAC context the query runs under
as_of_date: "2025-10-01"                   # freezes "last quarter" for determinism
gold_sql:                                  # one or more valid golds
  - "SELECT region, SUM(net_amount) FROM fct_revenue WHERE fiscal_quarter = '2025-Q3' GROUP BY region"
  - "SELECT r.region, SUM(f.net_amount) FROM fct_revenue f JOIN dim_region r ON ... GROUP BY r.region"
gold_result_ordered: false
gold_tables: [fct_revenue]                 # derived automatically; reviewed by SME
tags: {difficulty: medium, needs_business_definition: net_revenue, ambiguity: low, domain: finance}
expected_behavior: answer                  # or: clarify | refuse
notes: "Fiscal quarter, not calendar. Net = after refunds."
```

Follow this checklist when building your dataset:

- [ ] **Collect gold SQL from SMEs** (such as analytics engineers) or have SMEs execute and verify model-drafted SQL.
- [ ] **Store multiple valid gold queries** when questions allow legitimate alternatives (such as views versus base tables).
- [ ] **Store gold SQL rather than static results**, and execute both gold and predicted SQL against a pinned snapshot.
- [ ] **Freeze time with `as_of_date`** on every question that uses relative dates.
- [ ] **Include business-definition questions** ("churned", "ARR", "active"), where enterprise agents fail most often.
- [ ] **Add ambiguous, unanswerable, forbidden, and adversarial items** to test clarification, refusal, RBAC, and prompt injection.
- [ ] **Tag SQL difficulty** (joins, nesting, window functions, date math) so you can run slice analysis.
- [ ] **Generate synthetic questions from verified SQL** (SQL-to-question is safer than question-to-SQL) and re-verify every pair.
- [ ] **Mine production logs** for failed queries and negative user feedback (see [Production data flywheel](../01-datasets/04-production-data-flywheel.md)).
- [ ] **Hold out a test split** that you never inspect while tuning prompts (see [Running offline experiments](./08-running-offline-experiments.md)).

**Starting size (heuristic):** Start with 50–100 SME items, and scale to 200–500 stratified items for high-confidence release decisions.

---

## 13. What to do first

1. **Implement L1–L3 static checks** (parse, schema validity, and safety) and reuse them as online guardrails.
2. **Create a pinned, read-only, role-scoped database snapshot** for reproducible evaluation runs.
3. **Collect 50 SME gold queries** with `as_of_date` and compute execution accuracy using the comparator in §5.1.
4. **Add schema-linking recall** (`all_tables_hit`) if your pipeline retrieves schema elements.
5. **Add an LLM equivalence judge** to triage EX disagreements, and validate it on 50 human-labelled pairs.
6. **Check numeric grounding** on the final natural-language answer before adding LLM answer judges.
7. **Set query efficiency budgets** and build a mutation-checked fixture database for edge cases.

---

## Key takeaways

- **Anchor on execution accuracy** over SME gold SQL against a pinned snapshot, with an explicit result-comparison policy.
- **Treat string, component, AST, and embedding similarity as diagnostics** for clustering failures, not as correctness gates.
- **Mitigate single-snapshot false positives** by running across multiple snapshots, seeded edge-case fixtures, or test suites.
- **Support multiple valid gold queries** and review cases where the LLM judge and execution accuracy disagree.
- **Evaluate safety offline and enforce it online** using static AST checks alongside a read-only database role and RLS.
- **Measure schema linking separately**, focusing on `all_tables_hit` as a primary predictor of SQL generation success.
- **Verify the final prose answer** to ensure every number in the response is grounded in the returned rows.

## Further reading

- Yu et al., 2018, [Spider: A Large-Scale Human-Labeled Dataset for Complex and Cross-Domain Semantic Parsing and Text-to-SQL Task](https://arxiv.org/abs/1809.08887) · eval code: [taoyds/spider](https://github.com/taoyds/spider)
- Zhong, Yu & Klein, 2020, [Semantic Evaluation for Text-to-SQL with Distilled Test Suites](https://arxiv.org/abs/2010.02840) · code: [taoyds/test-suite-sql-eval](https://github.com/taoyds/test-suite-sql-eval)
- Li et al., 2023, [Can LLM Already Serve as A Database Interface? A BIg Bench for Large-Scale Database Grounded Text-to-SQLs (BIRD)](https://arxiv.org/abs/2305.03111) · [BIRD site](https://bird-bench.github.io/)
- Lei et al., 2024, [Spider 2.0: Evaluating Language Models on Real-World Enterprise Text-to-SQL Workflows](https://arxiv.org/abs/2411.07763)
- [sqlglot](https://github.com/tobymao/sqlglot): SQL parser, transpiler, optimizer and diff
- [RAGAS SQL metrics](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/sql/): `DataCompyScore`, `SQLSemanticEquivalence`
- **In this repo:**
    - [LLM-as-a-judge](./07-llm-as-a-judge.md)
    - [Tool & action guardrails](../04-guardrails/05-tool-and-action-guardrails.md)
    - [Access control & RBAC](../04-guardrails/06-access-control-rbac.md)
    - [Metric cheatsheet](../05-decision-framework/03-metric-cheatsheet.md)
