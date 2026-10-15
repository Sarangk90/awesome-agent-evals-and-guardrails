# Running Offline Experiments

> **TL;DR**
>
> - **Treat every change as a controlled experiment.** Run your baseline and variant on the same pinned dataset under identical judge versions.
> - **Compare variants per item with paired statistics.** Inspect item-level flips (regressions and fixes) and compute paired bootstrap confidence intervals or McNemar's test.
> - **Break results down by slice and enforce budgets.** Check critical slices (such as RBAC and safety) with zero-tolerance gates and protect a held-out test set.
> - **Size the eval set for the change you want to detect.** Power depends on how many items flip between runs. 100 items rarely detect a 5-point change.
> - **Automate staged evaluation gates in CI/CD.** Run unit checks and a smoke suite on pull requests, and run the full suite nightly. Gate on new critical failures and a paired test against a fresh per-item baseline.

- **You will learn:**
    - What metadata to record for every run
    - Paired baseline-vs-variant comparisons and flip analysis
    - Handling non-determinism with `pass@k` and `pass^k`
    - Confidence intervals (Wilson, rule of three), paired bootstrap, and McNemar's test
    - Power and minimum detectable effect for paired comparisons
    - Multiple-comparison control for slice tables
    - Slice analysis, cost/latency budgets, and RAG ablations
    - Preventing eval-set overfitting
    - Staged CI/CD gates with GitHub Actions and `pytest`
- **Prerequisites:** [Dataset strategy](../01-datasets/01-dataset-strategy.md), [End-to-end RAG evals](./01-end-to-end-rag-evals.md), [LLM-as-a-judge](./07-llm-as-a-judge.md)
- **Related:** [Retrieval metrics](./02-retrieval-metrics.md), [Text-to-SQL evals](./05-text-to-sql-evals.md), [Agent tool & trajectory evals](./04-agent-tool-and-trajectory-evals.md), [Implementation playbook](../05-decision-framework/04-implementation-playbook.md), [Monitoring, alerting & drift](../03-online-evals-and-observability/04-monitoring-alerting-and-drift.md)

---

## 1. The experiment loop

```mermaid
flowchart LR
    H["Hypothesis: reranker improves faithfulness on policy questions"] --> C["Change ONE thing in a variant config"]
    C --> R["Run baseline and variant on the same pinned dataset"]
    R --> S["Score: deterministic checks, retrieval metrics, judges"]
    S --> A["Analyze: paired diff, CIs, slices, flips, cost and latency"]
    A --> D{"Gate passed and effect is real?"}
    D -->|Yes| M["Merge, new baseline, record decision"]
    D -->|No| I["Read failures, new hypothesis"]
    I --> H
    M --> O["Online monitoring confirms"]
```

Run every comparison as a **paired** experiment on the exact same dataset items, using the same judge versions, at the same time. Never compare today's variant against a stale score from last month's slide deck.

Consider our running example of an enterprise assistant over company docs, a data warehouse (text-to-SQL), and a ticketing tool with RBAC. Typical experiments change the embedding model, `top-k` (5 vs 8), reranker, system prompt, generator model, or SQL schema retriever.

---

## 2. What to record for every run

If you cannot reproduce an evaluation run, you cannot trust any comparison against it. Log these eight categories for every run:

| Category | Record | Why |
|---|---|---|
| **Code** | git SHA, dirty flag | Reproducibility |
| **Config** | model + snapshot, temperature/top-p, max tokens, prompt template IDs/versions, retriever (embedding model, chunk size/overlap, top-k, hybrid weights, reranker + top-n), tools enabled, agent max steps | Know what changed |
| **Data** | dataset name + version/hash, split (dev/test), item IDs, index/corpus snapshot version, DB snapshot for SQL | Same items, same world |
| **Evaluators** | metric implementations + versions, **judge name@version** (prompt, model, params) | Metrics change when judges change |
| **Per-item outputs** | final answer, retrieved doc IDs + scores, tool calls, generated SQL, full trace link | Enables per-item diffs and failure review |
| **Per-item scores** | every metric, judge rationales, errors/timeouts | Paired analysis, slicing |
| **Operational** | latency (end-to-end and per step), tokens in/out, cost, retries, tool-call counts | Budgets and trade-offs |
| **Run meta** | seed(s), repeat index, timestamp, who/what triggered it (PR, nightly) | Non-determinism and audit |

**Tooling:** Dedicated evaluation platforms (such as LangSmith, Braintrust, Arize Phoenix, W&B Weave, MLflow GenAI evaluation, and promptfoo) provide built-in dataset experiment tracking. You can also start with git-tracked config files, JSONL output logs, and a summary script (see [Eval & observability tools](../06-tooling-landscape/01-eval-and-observability-tools.md)). Always persist **per-item** outputs and scores, not just aggregate averages.

**Cache intermediate steps** to reduce cost and variance. When you test a generation-only change, reuse cached retrieval outputs from the baseline run. When you test a retrieval change, compute fast retrieval metrics first and run generation plus LLM judges only if retrieval improves.

---

## 3. Comparing baseline vs variant

### 3.1 Look at flips, not just averages

Two variants can both achieve an 82% pass rate while failing on completely different questions. Build a **paired contingency table** for every binary metric:

|  | Variant PASS | Variant FAIL |
|---|---|---|
| **Baseline PASS** | both pass (a) | **regressions** (b) |
| **Baseline FAIL** | **fixes** (c) | both fail (d) |

- Compute net improvement as `(c − b) / N`.
- **Inspect every regression (`b`)** before merging, because users notice when previously working queries break.
- High counts in both `b` and `c` with a near-zero net difference indicate that the variant is *different*, not better. This pattern usually points to sampling noise (§4) or a trade-off across slices (§6).

### 3.2 A comparison report

```text
Experiment: rerank-v1 vs baseline (main@a1b2c3)     Dataset: enterprise-qa v12 (test, n=400)
Judges: faithfulness@v7 (pinned), answer_correctness@v4 (pinned)       Repeats: 3

Metric                         Baseline        Variant         Δ (paired, 95% CI)       Gate
answer_correctness (pass)      0.780           0.815           +0.035 [+0.008, +0.062]   ✅ McNemar: no sig. regression
faithfulness (pass)            0.880           0.905           +0.025 [+0.004, +0.046]   ✅ ≥ 0.85
context_recall@5               0.740           0.810           +0.070 [+0.045, +0.095]   none
citation_valid_id_rate         1.000           1.000           0                          ✅ = 1.0 (critical)
RBAC must-pass (n=40)          40/40           40/40           0                          ✅ no new failures (critical)
p95 latency                    3.1 s           3.9 s           +0.8 s                     ✅ ≤ 5 s
cost / query                   $0.0041         $0.0048         +17%                       ✅ ≤ $0.006
Flips (correctness)            regressions 9 · fixes 23
Worst slice                    sql/finance: 0.70 → 0.68 (n=50, CI overlaps 0)
Decision                       Ship after reviewing the 9 regressions (6 are SQL questions routed after the rerank change).
```

(Numbers are illustrative.) The gates match §10.2. Note that 40/40 on the RBAC slice only shows that the leak rate is probably below about 7.5% (rule of three, §5.1). It does not prove zero leaks.

---

## 4. Handling non-determinism

### 4.1 Sources of variance

| Source | Example | Mitigation |
|---|---|---|
| Generator sampling | Temperature > 0 | Evaluate at the production temperature; repeat runs |
| Provider-side nondeterminism | Outputs differ even at temperature 0 | Repeat runs; don't assume temp 0 = deterministic |
| Judge noise | Same output graded differently across calls | Pin judge; lowest supported temperature or fixed reasoning effort (see [LLM-as-a-judge](./07-llm-as-a-judge.md) §4.1); measure judge self-consistency; repeat judging on borderline items |
| Retrieval ties / ANN index | Approximate nearest-neighbour results vary with index build | Pin index snapshot; fix seeds where possible |
| Agent/tool environment | APIs, time, DB state change | Mock or snapshot tools; freeze "now"; pinned DB snapshot |
| Item sampling | Small eval set | More items; CIs; stratify |

**Evaluate at the exact temperature you deploy in production.** Evaluating at temperature `0.0` while serving production traffic at `0.7` tests a different system.

### 4.2 Repeated runs

Execute each evaluation item **`k` times** (use 3 to 5 repeats for pull-request checks on small sets, and more repeats for multi-step agent trajectories). Compute the per-item pass rate and average across items. Repeated runs reduce within-item sampling variance, but they **do not** replace a larger dataset because they cannot reduce item-sampling variance.

### 4.3 pass@k vs pass^k

`pass@k` and `pass^k` answer opposite reliability questions. The canonical definitions and agent examples are in [Agent tool & trajectory evals](./04-agent-tool-and-trajectory-evals.md). This summary shows how to use them in experiments:

| Metric | Question | Definition (from n trials with c successes) | Use for |
|---|---|---|---|
| **pass@k** | "Does *at least one* of k attempts succeed?" | `1 − C(n−c, k) / C(n, k)`, the unbiased estimator from [Chen et al., 2021 (Codex)](https://arxiv.org/abs/2107.03374) | Settings with a verifier/selector or user retries (e.g. code + tests, best-of-k with a checker) |
| **pass^k** | "Do *all* k attempts succeed?" (consistency/reliability) | `C(c, k) / C(n, k)`, introduced in [τ-bench (Yao et al., 2024)](https://arxiv.org/abs/2406.12045) | User-facing agents: each user gets one attempt, and many users ask similar things |

As `k` increases, `pass@k` rises while `pass^k` falls. For an enterprise assistant that must succeed reliably on the first try, **use `pass^k` as your primary reliability metric**. An agent with an 80% single-trial success rate can easily drop below 40% on `pass^8` if its failures are spread across items.

```python
from math import comb

def pass_at_k(n: int, c: int, k: int) -> float:
    if n - c < k:
        return 1.0
    return 1.0 - comb(n - c, k) / comb(n, k)

def pass_hat_k(n: int, c: int, k: int) -> float:
    return comb(c, k) / comb(n, k) if c >= k else 0.0

def dataset_metric(per_item: list[tuple[int, int]], k: int, fn) -> float:
    """per_item: [(n_trials, n_successes)] for each task; returns mean over tasks."""
    return sum(fn(n, c, k) for n, c in per_item) / len(per_item)

items = [(8, 8), (8, 6), (8, 2), (8, 0)]           # 4 tasks, 8 trials each
dataset_metric(items, 1, pass_at_k)                  # 0.50  (= mean per-trial success)
dataset_metric(items, 4, pass_at_k)                  # ≈ 0.70
dataset_metric(items, 4, pass_hat_k)                 # ≈ 0.30
```

---

## 5. Statistical significance

Evaluation datasets are often small, LLM outputs are stochastic, and real improvements are frequently only 2 to 5 percentage points. Without confidence intervals, teams routinely ship random noise. Follow Evan Miller's [Adding Error Bars to Evals](https://arxiv.org/abs/2411.00640) (2024): report confidence intervals, run **paired** comparisons, and cluster standard errors by source document.

### 5.1 How big must the eval set be?

The table below shows the approximate 95% confidence interval half-width for a single pass rate `p` using the normal approximation `1.96 · sqrt(p(1 − p) / n)`:

| n | p = 0.8 | p = 0.95 |
|---|---|---|
| 50 | ± 0.11 | ± 0.06 |
| 100 | ± 0.08 | ± 0.04 |
| 200 | ± 0.055 | ± 0.03 |
| 500 | ± 0.035 | ± 0.02 |
| 1000 | ± 0.025 | ± 0.014 |

**Paired comparisons** achieve narrower confidence intervals than unpaired comparisons because shared item difficulty cancels out. How much narrower depends on the **discordance rate** `d`: the share of items whose verdict differs between baseline and variant (`(b + c) / n` in §3.1). Estimate `d` from an A/A run (run the baseline twice) or from past experiments. For a paired binary metric, the number of items you need to detect a change `Δ` with 80% power at α = 0.05 is about ([Connor, 1987](https://doi.org/10.2307/2531961)):

```text
n ≈ ( 1.96 · sqrt(d) + 0.84 · sqrt(d − Δ²) )² / Δ²
```

| Change to detect (Δ) | d = 5% | d = 10% |
|---|---|---|
| 2.5 points | ≈ 630 items | ≈ 1,250 items |
| 5 points | ≈ 155 items | ≈ 310 items |

On 100 items with `d = 10%`, a real 5-point gain has only about 25–35% power, and the smallest change you can reliably detect is about 9 points. More repeats reduce `d` from generator and judge noise, but they cannot replace items. For dataset sizing in general, see [Dataset strategy](../01-datasets/01-dataset-strategy.md).

**Use Wilson or Clopper–Pearson intervals for small slices and rates near 0 or 1.** The normal approximation and the percentile bootstrap both fail there. For example, a bootstrap of 40/40 passes gives the interval [1.0, 1.0]. The Wilson interval for 40/40 is [0.91, 1.0].

- **Rule of three:** If you see 0 failures in `n` cases, the 95% upper bound on the failure rate is about `3 / n` ([Hanley & Lippman-Hand, 1983](https://doi.org/10.1001/jama.1983.03330370053031)). 0 leaks in 40 RBAC cases means "leak rate probably below 7.5%".
- **Hard safety gates need many clean cases:** To claim a failure rate below 1%, you need at least 300 cases with no failures.

```python
import math
from statistics import NormalDist

Z = NormalDist().inv_cdf

def wilson(k: int, n: int, alpha: float = 0.05) -> tuple[float, float]:
    """Wilson score interval for k successes in n trials. Works at k = 0 and k = n."""
    z = Z(1 - alpha / 2)
    p = k / n
    centre = (p + z * z / (2 * n)) / (1 + z * z / n)
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return max(0.0, centre - half), min(1.0, centre + half)

def paired_n(delta: float, discordance: float, alpha: float = 0.05, power: float = 0.8) -> int:
    """Items needed to detect a paired change of `delta` in pass rate (McNemar design, Connor 1987).
    discordance: share of items whose verdict differs between baseline and variant (b + c) / n."""
    za, zb = Z(1 - alpha / 2), Z(power)
    n = (za * math.sqrt(discordance) + zb * math.sqrt(discordance - delta ** 2)) ** 2 / delta ** 2
    return math.ceil(n)

def paired_power(n: int, delta: float, discordance: float, alpha: float = 0.05) -> float:
    za = Z(1 - alpha / 2)
    return NormalDist().cdf((math.sqrt(n) * delta - za * math.sqrt(discordance)) / math.sqrt(discordance - delta ** 2))

wilson(34, 40)                    # (0.71, 0.93): TNR 0.85 on 40 FAIL items
wilson(40, 40)                    # (0.91, 1.0): 40/40 RBAC refusals
paired_n(0.025, 0.10)             # 1254 items for a 2.5-point change if 10% of items flip
paired_n(0.025, 0.05)             # 626 items if 5% of items flip
paired_n(0.05, 0.10)              # 312 items for a 5-point change if 10% of items flip
round(paired_power(100, 0.05, 0.10), 2)   # 0.35: a 100-item set usually misses a 5-point change
```

### 5.2 Paired bootstrap for the difference

```python
import random

def paired_bootstrap(base: list[float], var: list[float], n_boot: int = 10_000, seed: int = 0,
                     clusters: list[str] | None = None) -> dict:
    """base/var: per-item scores (0/1 or continuous) aligned by item. clusters: optional group id per item."""
    rng = random.Random(seed)
    diffs = [v - b for b, v in zip(base, var)]
    if clusters is None:
        groups = [[d] for d in diffs]
    else:  # resample whole clusters (e.g. all questions about one doc): wider, more honest CIs
        by = {}
        for d, g in zip(diffs, clusters):
            by.setdefault(g, []).append(d)
        groups = list(by.values())
    stats = []
    for _ in range(n_boot):
        sample = [d for _ in groups for d in rng.choice(groups)]
        stats.append(sum(sample) / len(sample))
    stats.sort()
    point = sum(diffs) / len(diffs)
    lo, hi = stats[int(0.025 * n_boot)], stats[int(0.975 * n_boot) - 1]
    return {"delta": point, "ci95": (lo, hi), "p_le_0": sum(s <= 0 for s in stats) / n_boot}
```

- **Clusters matter:** On the 400-item example from §3.2, the unclustered CI for Δ = 0.035 is about [0.008, 0.062]. If the same 400 items come from only 40 source documents, and the flips concentrate in a few of them (10 consecutive items per document), the clustered CI widens to about [−0.04, 0.12]. If the flips spread evenly across documents, clustering changes little. Always cluster when items share a source, so the data decides.
- **Small samples:** With fewer than about 30 clusters, the percentile bootstrap is too narrow. Use a BCa or studentized bootstrap (for example `scipy.stats.bootstrap(..., method="BCa")`) or a permutation test.
- `p_le_0` is the share of bootstrap replicates at or below zero. It is a useful summary, but it is not a p-value.

### 5.3 McNemar's test for paired pass/fail

For binary pass/fail metrics on the same items, **McNemar's test** analyzes only discordant pairs (`b` regressions and `c` fixes). The exact McNemar test is a binomial test of whether `b` and `c` are equally likely:

```python
from math import comb

def mcnemar_exact(base: list[bool], var: list[bool]) -> dict:
    b = sum(x and not y for x, y in zip(base, var))      # regressions
    c = sum((not x) and y for x, y in zip(base, var))    # fixes
    n = b + c
    if n == 0:
        return {"regressions": 0, "fixes": 0, "p_value": 1.0}
    k = min(b, c)
    p = 2 * sum(comb(n, i) for i in range(k + 1)) / 2 ** n
    return {"regressions": b, "fixes": c, "p_value": min(1.0, p)}

# 400 items: 9 regressions, 23 fixes
base = [True] * 300 + [True] * 9 + [False] * 23 + [False] * 68
var  = [True] * 300 + [False] * 9 + [True] * 23 + [False] * 68
mcnemar_exact(base, var)    # {'regressions': 9, 'fixes': 23, 'p_value': ≈0.02}
```

In SciPy, call `scipy.stats.binomtest(min(b, c), b + c, 0.5)` to compute the same exact p-value.

### 5.4 Practical rules

- [ ] **Report 95% confidence intervals** alongside point estimates in every pull-request summary.
- [ ] **Use paired statistical tests** (paired bootstrap or McNemar's test) when comparing a variant against a baseline.
- [ ] **Resample by cluster** whenever multiple test questions share a source document, conversation, or template.
- [ ] **Pre-declare 1 to 3 primary metrics** to avoid false discoveries from testing 20 metrics across 10 slices simultaneously.
- [ ] **Control false discoveries across slices:** When you report significance for many slices, apply Benjamini–Hochberg (below), or pre-register the critical slices that you gate on.
- [ ] **Do not re-run until it passes:** Re-running a noisy eval and keeping the best run inflates false positives. Fix the number of repeats in advance and report all runs.
- [ ] **Re-run the baseline on the same dataset version and judge version.** Never compare against a stored score from an older run.
- [ ] **Define a minimum practical effect size** before running the experiment (such as "+2 points on answer correctness").
- [ ] **Validate your LLM judges first** (§7 of [LLM-as-a-judge](./07-llm-as-a-judge.md)), because statistical tests cannot detect systematic judge bias.

```python
def benjamini_hochberg(p_values: dict[str, float], q: float = 0.05) -> list[str]:
    """Return the slices whose change is significant with the false discovery rate controlled at q."""
    ranked = sorted(p_values.items(), key=lambda kv: kv[1])
    m, cutoff = len(ranked), 0
    for rank, (_, p) in enumerate(ranked, start=1):
        if p <= rank / m * q:
            cutoff = rank
    return [name for name, _ in ranked[:cutoff]]

benjamini_hochberg({"docs-QA/HR": 0.004, "docs-QA/IT": 0.03, "text-to-SQL/finance": 0.62,
                    "ticket tool": 1.0, "unanswerable": 0.04})
# ['docs-QA/HR']: the IT and unanswerable gains (p < 0.05 alone) are not significant after correction
```

SciPy 1.11+ provides the same correction as `scipy.stats.false_discovery_control` (it returns adjusted p-values). See [Benjamini & Hochberg, 1995](https://www.jstor.org/stable/2346101).

---

## 6. Slice-level analysis

Aggregate scores hide localized regressions. Tag every item in your dataset (see [Dataset strategy](../01-datasets/01-dataset-strategy.md)) and break down primary metrics by slice:

| Slice dimension | Example values (running example) |
|---|---|
| Route / capability | docs-QA, text-to-SQL, ticket tool, multi-step |
| User role | employee, manager, analyst, finance, hr_partner |
| Difficulty | single-hop, multi-hop, aggregation, comparison |
| Source / domain | HR policies, IT runbooks, finance tables |
| Language | en, de, fr, ja |
| Question type | answerable, unanswerable, ambiguous, should-refuse |
| Freshness | old docs vs recently updated docs |
| Data origin | SME-gold, synthetic, mined from production |

```text
                        n     baseline   variant   Δ
docs-QA / HR           120     0.86       0.91    +0.05
docs-QA / IT           110     0.81       0.87    +0.06
text-to-SQL / finance   50     0.70       0.68    −0.02   ← flat or slightly worse
ticket tool             40     0.95       0.95     0.00
should-refuse (RBAC)    40     1.00       1.00     0.00   ← critical slice, must stay 1.00
unanswerable            40     0.60       0.70    +0.10
```

- **Display slice size (`n`) and confidence intervals** (Wilson, §5.1) to avoid overreacting to 1-item flips while still reading every regression. Apply Benjamini–Hochberg (§5.4) before you call several slice changes significant.
- **Check for Simpson's paradox**, where a large gain in a dominant slice masks a regression in a smaller business-critical slice.
- **Enforce zero-tolerance gates on critical slices** (such as RBAC, safety, and prompt-injection refusals) regardless of overall score improvements.

---

## 7. Cost and latency budgets

A quality gain that doubles latency or token cost is rarely shippable. Measure operational metrics alongside quality in every experiment:

| Metric | Granularity | Typical budget form (heuristic) |
|---|---|---|
| End-to-end latency | p50, p95 per route | p95 ≤ X s for chat; tighter for autocomplete-like UX |
| Time to first token | p50, p95 | Matters for streaming UIs |
| Cost per query | mean, p95 per route | ≤ $Y; alert on +Z% vs baseline |
| Tokens in/out | mean per step | Watch prompt growth from more retrieved chunks |
| Tool calls / LLM calls per task | mean, max | Agent loops are where costs explode |
| SQL bytes scanned | per query | Warehouse cost (see [Text-to-SQL evals](./05-text-to-sql-evals.md)) |

Plot **quality against cost** and **quality against p95 latency** across candidate configurations, and select configurations on the **Pareto frontier**. Enforce cost and latency ceilings as explicit CI gates. Confirm latency online after deployment, since offline concurrency and cache behavior differ from production.

---

## 8. Ablations and sweeps for agentic RAG

### 8.1 Ablations: change one thing at a time

| Knob | Primary metrics to watch | Secondary / side effects |
|---|---|---|
| Chunk size / overlap | Context recall, context precision, hit rate@k | Faithfulness (too-small chunks lose context), tokens/cost |
| Top-k retrieved | Context recall@k (↑), context precision (↓) | Faithfulness, latency, cost, "lost in the middle" effects |
| Embedding model | Recall@k, MRR, nDCG | Index rebuild cost, latency, multilingual slices |
| Hybrid search weights (BM25 vs dense) | Recall on keyword-heavy/ID queries | Recall on paraphrased queries |
| Reranker on/off, top-n | Precision@n, nDCG, faithfulness | Latency (+), cost |
| Query rewriting / HyDE / decomposition | Recall on multi-hop and vague queries | Latency, drift from user intent |
| System prompt variant | Instruction adherence, refusal rates, citation metrics | Answer correctness, length |
| Generator model | Correctness, faithfulness, adherence | Cost, latency, refusal behaviour |
| Schema retrieval for SQL (k tables) | Schema-linking recall, execution accuracy | Prompt length, hallucinated columns |
| Agent max steps / tool set | Task success, pass^k | Cost, latency, loops |

Pair **component-level metrics** ([Retrieval metrics](./02-retrieval-metrics.md)) with **end-to-end metrics** ([End-to-end RAG evals](./01-end-to-end-rag-evals.md)) to isolate bottlenecks. If a retrieval change improves `recall@k` by 10 points without moving end-to-end answer correctness, your generator prompt or evaluation dataset is the bottleneck.

### 8.2 Sweeps

- **Use grid search** when tuning 1 or 2 parameters across a small set of values (such as `top_k ∈ {3, 5, 8, 12}` × `reranker ∈ {off, on}`).
- **Use random or Bayesian search** for higher-dimensional spaces, but keep the total number of evaluated configurations small to avoid overfitting your `dev` set (§9).
- **Filter with cheap component metrics first:** Run fast retrieval-only evaluations across the grid and discard configurations that exceed latency budgets. Run expensive end-to-end LLM judges only on the top 2 or 3 candidates.
- **Select on `dev` and verify once on `test`:** Tune hyperparameters on your `dev` split and evaluate the winning configuration once on your held-out `test` split.

```python
import itertools

GRID = {"top_k": [3, 5, 8], "reranker": [None, "cross-encoder"], "chunk_size": [256, 512]}

def sweep(run_retrieval_eval, dev_items):
    """run_retrieval_eval(config, items) -> {"recall@k": float, "p95_latency_s": float} (your code)."""
    results = []
    for values in itertools.product(*GRID.values()):
        cfg = dict(zip(GRID.keys(), values))
        results.append({**cfg, **run_retrieval_eval(cfg, dev_items)})
    feasible = [r for r in results if r["p95_latency_s"] <= 1.5]           # budget first
    return sorted(feasible, key=lambda r: r["recall@k"], reverse=True)[:3]  # shortlist for full E2E eval
```

---

## 9. Avoiding overfitting to the eval set

Every time you inspect failed items and tweak your prompt to fix them, information from the evaluation dataset leaks into your system. Over time, your `dev` score measures memorization rather than generalization. Prevent evaluation overfitting with these practices:

- [ ] **Maintain strict `dev` and held-out `test` splits** stratified by slice, and run `test` only on release candidates.
- [ ] **Never copy evaluation items or close paraphrases** into few-shot prompt examples, system instructions, or fine-tuning datasets.
- [ ] **Refresh datasets continuously** by adding mined production failures ([Production data flywheel](../01-datasets/04-production-data-flywheel.md)) under a new dataset version tag.
- [ ] **Grade a periodic fresh sample** of recent production traces as an out-of-sample reality check.
- [ ] **Guard against Goodhart's law:** Audit responses with humans so prompts do not game judge biases (like length padding).
- [ ] **Investigate large `dev`-to-`test` score gaps**, which indicate either prompt overfitting or distribution mismatch between splits.
- [ ] **Treat public benchmarks as contaminated** by pre-training data and rely on private enterprise datasets for shipping decisions.

---

## 10. Regression testing in CI/CD

### 10.1 Stages

These are CI **stages**, not the Tier 1–3 risk tiers used elsewhere in this repo.

| Stage | Trigger | Contents | Runtime target (heuristic) | Gate type |
|---|---|---|---|---|
| **0. Unit / deterministic** | Every commit | Parsers, schema validators, citation-ID checker, SQL safety checker, prompt templates render | Seconds | Hard fail |
| **1. Smoke eval** | Every PR touching prompts, retrieval, tools, model config | 20–50 representative items + all **must-pass critical** items (RBAC, safety, injection); deterministic checks + 1–2 validated judges | < 10 min | Hard fail on critical items; warnings only on aggregate scores |
| **2. Full offline suite** | Nightly, pre-release, or on label (e.g. `run-full-evals`) | Full dev set (and test set pre-release), repeats, all judges, slices, cost/latency | 30–120 min | No new critical failures + paired test vs a fresh baseline; human sign-off on flips |
| **3. Online** | After deploy | Canary/shadow, sampled online judges, user feedback | Continuous | Alerts, rollback (see [Online evals](../03-online-evals-and-observability/01-online-evals.md)) |

### 10.2 Designing gates

Combine three gate types in your CI pipeline:

1. **Critical zero-tolerance gates:** Block pull requests on any RBAC leak, unsafe SQL, fabricated citation ID, injection compliance, or invalid schema. Also block when an item in a critical slice passed on the baseline and fails on the variant.
2. **Absolute floor gates:** Enforce minimum acceptable quality bars (`faithfulness ≥ 0.85`, `execution_accuracy ≥ 0.75`, `p95_latency ≤ 5.0s`). These are starting rules of thumb; calibrate them on your data and set them below the baseline by more than the run-to-run noise.
3. **Relative non-regression gates:** Compare against a baseline that you **re-ran on the same dataset version and judge version**. Use a paired test: a one-sided McNemar test for pass/fail metrics, or the lower bound of a paired bootstrap CI for continuous metrics (§5). A fixed rule such as "Δ ≥ −2 points" is valid only when you state `n` and the measured noise. Measure the noise by running the baseline against itself 3 to 5 times (A/A runs).

A "no significant regression" test is weak on small sets, because it cannot detect real regressions with low power (§5.1). Use it in the full suite with a powered `n`, not on a 50-item smoke set.

**Operational rules:**

- **Stage 1 (pull requests):** Hard-fail on critical items. Post aggregate scores as warnings only, because small smoke sets have wide confidence intervals.
- **Stage 2 (full suite):** Enforce the paired non-regression gates.
- **Store per-item baselines, not scalars.** Save per-item results with the dataset hash and judge version. Fail closed if either differs from the current run, and re-run the baseline.
- **Cap spend and cache outputs.** Cap the LLM spend per CI run and fail if the cap stops the run early (an incomplete run is not a pass). Cache outputs by (item ID, repeat, config hash, judge version).
- **Quarantine flaky items.** If an item flips in A/A runs, move it to a quarantine list, fix the item or its rubric, and track the quarantine size. Do not quietly drop it.
- **Do not re-run CI until it passes.** If you re-run, report all runs (§5.4).
- **Post one comparison comment per pull request** and update it on each push.

### 10.3 Illustrative GitHub Actions workflow

```yaml
# .github/workflows/evals.yml: illustrative; adapt paths, secrets and commands to your repo.
name: llm-evals

on:
  pull_request:
    paths:                       # see the note on required checks below
      - "app/prompts/**"
      - "app/rag/**"
      - "app/agent/**"
      - "config/models.yaml"
      - "evals/**"
  schedule:
    - cron: "0 2 * * *"          # nightly full suite
  workflow_dispatch: {}

concurrency:
  group: evals-${{ github.event_name }}-${{ github.ref }}   # a manual run does not cancel the nightly run
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  smoke:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: "3.12"
          cache: pip
      - run: pip install -r requirements.txt -r evals/requirements.txt
      - name: Deterministic tests
        run: pytest tests/unit -q
      - name: Smoke eval (critical items)
        env:
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
          EVAL_DATASET: evals/data/smoke_v12.jsonl
          EVAL_MAX_COST_USD: "3"
        run: pytest evals -m "smoke" -q --junitxml=eval-results.xml
      - name: Post summary to PR (one comment, updated on each push)
        if: always()
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          python evals/report.py --format markdown > eval-summary.md
          gh pr comment ${{ github.event.pull_request.number }} --body-file eval-summary.md --edit-last --create-if-none
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: smoke-eval-results
          path: |
            eval-results.xml
            evals/out/

  full:
    if: github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 180
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: "3.12"
          cache: pip
      - run: pip install -r requirements.txt -r evals/requirements.txt
      - name: Full eval suite with repeats
        env:
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
          EVAL_DATASET: evals/data/dev_v12.jsonl
          EVAL_BASELINE: evals/baselines/main.json      # per-item results from the last main run
          EVAL_REPEATS: "3"
          EVAL_MAX_COST_USD: "40"
        run: pytest evals -m "full" -q
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: full-eval-results
          path: evals/out/          # on main, promote evals/out/faithfulness.json to the next baseline
```

Notes on this workflow:

- **Pull requests from forks get no secrets.** GitHub does not pass secrets (except `GITHUB_TOKEN`) to workflows triggered from forks, and the token is read-only ([GitHub docs](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)). The eval step and the PR comment fail on fork PRs. Do not switch to `pull_request_target` to get secrets. It runs with your secrets, so checking out and running the fork's code there exposes them. Use a maintainer-applied label or a manual dispatch for fork PRs.
- **`paths` filters and required checks do not mix.** If a required check's workflow is skipped by a `paths` filter, the check stays "Pending" and blocks merging ([GitHub docs](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks)). Either do not make this workflow required, or remove the `paths` filter and skip the expensive steps inside the job.
- **Action versions:** The majors shown were current in October 2026. Pin to a full commit SHA for supply-chain safety.

Tools like promptfoo also provide pre-built GitHub Actions ([promptfoo-action](https://github.com/promptfoo/promptfoo-action)) for pull-request evaluation comments.

### 10.4 pytest-style eval tests

Use `pytest` to structure your evaluation suite. Parametrize **critical items** as individual test cases. Run the floor and paired non-regression checks over cached per-item results. This example reads `EVAL_REPEATS` and `EVAL_MAX_COST_USD`, caches one run per (item, repeat), compares per item with a baseline from the same dataset and judge version, and fails closed if they differ:

```python
# evals/test_agent_evals.py: illustrative; `my_app.run_agent`, `evals.checks`, and the file formats are yours.
import hashlib
import json
import os
from pathlib import Path

import pytest
from scipy.stats import binomtest

from my_app import run_agent                      # returns {"answer", "sources", "sql", "refused", "cost_usd", ...}
from evals.checks import JUDGE_VERSION, citation_checks, judge_faithfulness, safety_violations

DATASET = Path(os.environ.get("EVAL_DATASET", "evals/data/smoke_v12.jsonl"))
BASELINE = Path(os.environ.get("EVAL_BASELINE", "evals/baselines/main.json"))   # per-item results from main
REPEATS = int(os.environ.get("EVAL_REPEATS", "1"))
MAX_COST_USD = float(os.environ.get("EVAL_MAX_COST_USD", "inf"))
OUT = Path("evals/out")

DATASET_HASH = hashlib.sha256(DATASET.read_bytes()).hexdigest()[:16]
ITEMS = {i["id"]: i for i in map(json.loads, filter(str.strip, DATASET.read_text().splitlines()))}
CRITICAL = [i for i in ITEMS.values() if i.get("critical")]
_cache: dict[tuple[str, int], dict] = {}
_spent_usd = 0.0

def output_for(item_id: str, repeat: int) -> dict:
    """One cached agent run per (item, repeat), with a hard cost cap for the whole session."""
    global _spent_usd
    if (item_id, repeat) not in _cache:
        if _spent_usd >= MAX_COST_USD:
            pytest.fail(f"eval budget of ${MAX_COST_USD} used up; results are incomplete", pytrace=False)
        item = ITEMS[item_id]
        out = run_agent(item["question"], role=item["role"], as_of=item.get("as_of_date"))
        _spent_usd += out.get("cost_usd", 0.0)
        _cache[(item_id, repeat)] = out
    return _cache[(item_id, repeat)]

# ---- Critical, zero-tolerance checks: one test per item, every repeat must pass ------------------
@pytest.mark.smoke
@pytest.mark.full
@pytest.mark.parametrize("item", CRITICAL, ids=lambda i: i["id"])
def test_critical_item(item):
    for r in range(REPEATS):
        out = output_for(item["id"], r)
        if item["expected_behavior"] == "refuse":
            assert out["refused"], f"repeat {r}: should refuse for role={item['role']}: {out['answer'][:200]}"
            assert not out.get("doc_ids_outside_role"), f"repeat {r}: retrieved documents outside the role"
        if out.get("sql"):
            assert safety_violations(out["sql"]) == [], out["sql"]
        assert citation_checks(out["answer"], out["sources"])["invalid_ids"] == []

# ---- Per-item judge results, paired with the baseline ------------------------------------------
@pytest.fixture(scope="session")
def faithfulness():
    """item_id -> True if the judge says PASS on a majority of repeats. Saved so main can promote it."""
    res = {}
    for item_id, item in ITEMS.items():
        if item["expected_behavior"] == "answer":
            verdicts = [judge_faithfulness(output_for(item_id, r)) for r in range(REPEATS)]
            res[item_id] = sum(v == "PASS" for v in verdicts) > REPEATS / 2
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "faithfulness.json").write_text(json.dumps(
        {"dataset_hash": DATASET_HASH, "judge_version": JUDGE_VERSION, "items": res}, indent=1))
    return res

@pytest.mark.full
def test_faithfulness_floor(faithfulness):
    rate = sum(faithfulness.values()) / len(faithfulness)
    assert rate >= 0.85, f"faithfulness pass rate {rate:.3f} below floor 0.85"

@pytest.mark.full
def test_faithfulness_non_regression(faithfulness):
    base = json.loads(BASELINE.read_text())
    # Fail closed: a baseline from another dataset or judge version is not comparable. Re-run it.
    assert base["dataset_hash"] == DATASET_HASH, "baseline uses another dataset version; re-run the baseline"
    assert base["judge_version"] == JUDGE_VERSION, "baseline uses another judge version; re-run the baseline"
    assert set(base["items"]) == set(faithfulness), "baseline and run cover different items"

    pairs = [(base["items"][i], faithfulness[i]) for i in faithfulness]
    new_critical = [i for i in faithfulness if ITEMS[i].get("critical") and base["items"][i] and not faithfulness[i]]
    assert not new_critical, f"newly failing critical items: {new_critical}"

    b = sum(old and not new for old, new in pairs)                  # regressions
    c = sum(new and not old for old, new in pairs)                  # fixes
    if b + c:
        p = binomtest(b, b + c, 0.5, alternative="greater").pvalue  # one-sided exact McNemar
        assert p >= 0.05, f"significant regression: {b} regressions vs {c} fixes (p={p:.3f})"
```

Register the custom `smoke` and `full` markers in `pytest.ini` or `pyproject.toml`. The baseline file has the same format as `evals/out/faithfulness.json`: `{"dataset_hash": ..., "judge_version": ..., "items": {item_id: true|false}}`. The nightly run on `main` produces it.

---

## 11. Reporting and dashboards

Tailor your evaluation reports to each audience:

| Audience | Wants | Format |
|---|---|---|
| Engineer on a PR | Did I break anything? Which items regressed and why? | PR comment: gates, deltas with CIs, list of regressed items with trace links |
| Team lead / weekly review | Trend over time, biggest failure modes, slice health | Dashboard: primary metrics per release, per slice, failure-mode counts |
| Stakeholders / launch review | Is it good enough and safe? | One page: headline pass rates with CIs, critical-slice results, known limitations, cost |

Include five essential views in your evaluation dashboard:

- **Primary metrics over time** per release with 95% confidence intervals and vertical annotations marking **dataset or judge version updates**.
- **A slice-by-metric heatmap** highlighting weak or regressed slices.
- **Failure-mode taxonomy counts** from error analysis (such as "wrong fiscal quarter", "missed carry-over rule", or "fabricated citation").
- **Cost and p95 latency trends** plotted alongside quality metrics.
- **Direct drill-down links** from every aggregate score to the underlying dataset items and execution traces.

---

## 12. Checklist: running a good offline experiment

- [ ] **Write down your hypothesis, primary metrics, and minimum effect size** before running the experiment.
- [ ] **Change one variable at a time** and log the full config, dataset hash, judge versions, and git SHA.
- [ ] **Run the baseline and variant on the exact same items** and reuse cached intermediate steps where valid.
- [ ] **Evaluate at your production temperature**, run repeats for stochastic tasks, and compute `pass^k` for agent reliability.
- [ ] **Compute paired deltas with 95% confidence intervals** (using clustered bootstrap or McNemar's test), and check that `n` gives enough power for your minimum effect size (§5.1).
- [ ] **Inspect every regression (`Baseline PASS → Variant FAIL`)** and a sample of fixed items.
- [ ] **Check slice-level scores** with Wilson intervals and Benjamini–Hochberg, enforcing zero-tolerance gates on RBAC, safety, and refusal slices.
- [ ] **Verify that cost and p95 latency stay within budget.**
- [ ] **Iterate on the `dev` split and validate once on the held-out `test` split** before release.
- [ ] **Record the shipping decision, update the baseline artifact, and feed new production failures into the next dataset version.**

---

## Key takeaways

- **Treat every change as a paired experiment:** Use a pinned dataset, recorded config, same-item baseline, pre-declared primary metrics, and explicit release gates.
- **Analyze item-level flips and paired statistics** (regressions vs fixes, paired bootstrap confidence intervals, and McNemar's test) instead of raw aggregate averages.
- **Account for non-determinism:** Evaluate at production temperature, run repeated trials, and use **`pass^k`** to measure user-facing reliability.
- **Size your dataset for your target effect:** On 100 items, a single pass rate has a 95% CI of about ±4 to ±8 points (for p = 0.95 to 0.8). Paired power depends on the discordance rate: a 2.5-point change needs roughly 600–1,250 items (§5.1).
- **Use Wilson intervals and the rule of three for small or perfect slices:** 0 failures in 40 cases only bounds the failure rate below about 7.5%.
- **Break results down by slice** and enforce zero-tolerance gates on critical security and safety slices.
- **Ablate one knob at a time**, filter sweeps with fast component metrics first, and choose configurations on the quality–cost–latency Pareto frontier.
- **Protect a held-out test split** and continuously refresh datasets from production traces to prevent overfitting.
- **Automate staged CI/CD gates:** Run unit checks on every commit, smoke suites on pull requests, full suites nightly, and sampled judges online. Gate on new critical failures plus a paired test against a fresh per-item baseline from the same dataset and judge version.

## Further reading

- Evan Miller, 2024, [Adding Error Bars to Evals: A Statistical Approach to Language Model Evaluations](https://arxiv.org/abs/2411.00640)
- Chen et al., 2021, [Evaluating Large Language Models Trained on Code (pass@k)](https://arxiv.org/abs/2107.03374)
- Yao et al., 2024, [τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains (pass^k)](https://arxiv.org/abs/2406.12045)
- Hamel Husain, [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) · [A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/)
- Eugene Yan, [Evaluating the Effectiveness of LLM-Evaluators](https://eugeneyan.com/writing/llm-evaluators/)
- [promptfoo GitHub Action](https://github.com/promptfoo/promptfoo-action)
- Connor, 1987, [Sample Size for Testing Differences in Proportions for the Paired-Sample Design](https://doi.org/10.2307/2531961) (Biometrics)
- Brown, Cai & DasGupta, 2001, [Interval Estimation for a Binomial Proportion](https://doi.org/10.1214/ss/1009213286) (why to prefer Wilson over the normal approximation)
- Hanley & Lippman-Hand, 1983, [If Nothing Goes Wrong, Is Everything All Right?](https://doi.org/10.1001/jama.1983.03330370053031) (rule of three)
- Benjamini & Hochberg, 1995, [Controlling the False Discovery Rate](https://www.jstor.org/stable/2346101)
- GitHub Docs, [Troubleshooting required status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks)
- **In this repo:**
    - [Dataset strategy](../01-datasets/01-dataset-strategy.md) (dataset sizing)
    - [Agent tool & trajectory evals](./04-agent-tool-and-trajectory-evals.md) (pass@k and pass^k)
    - [Eval & observability tools](../06-tooling-landscape/01-eval-and-observability-tools.md)
    - [Implementation playbook](../05-decision-framework/04-implementation-playbook.md)
    - [Maturity model](../05-decision-framework/05-maturity-model.md)
    - [Online evals](../03-online-evals-and-observability/01-online-evals.md)
