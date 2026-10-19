# Retrieval Metrics

> **TL;DR**
>
> - **Measure recall@k first.** Verify that your retriever passes all required evidence chunks to the generator LLM.
> - **Use nDCG@k and MRR for ranking.** Evaluate whether your pipeline ranks the most relevant chunks near the top.
> - **Label at stable span granularity.** Anchor relevance labels to document character spans so re-chunking does not break your evals.
> - **Evaluate every retrieval stage separately.** Measure query rewriting, hybrid search, RBAC filters, and rerankers on the same queries.
> - **State your nDCG gain formula.** Linear gain is the library default. Compare systems with paired per-query tests, not with means alone.

- **You will learn:**
    - Hit rate, precision/recall/F1@k, MRR, MAP, nDCG, R-precision, ERR, and RBP
    - Paired significance tests for retrieval runs
    - Relevance labeling, pooling, and incomplete judgments (judged@k, bpref)
    - Chunk vs document matching and span coverage
    - Per-stage retrieval evals, including agentic and multi-hop retrieval
    - Whole-document tasks scored by item-level recall, not top-k ranks
- **Prerequisites:** [End-to-end RAG evals](./01-end-to-end-rag-evals.md), [Dataset strategy](../01-datasets/01-dataset-strategy.md)
- **Related:** [Synthetic datasets](../01-datasets/03-synthetic-datasets.md), [LLM-as-a-judge](./07-llm-as-a-judge.md), [Retrieval and context guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md)

---

## 1. Setup and notation

For each query `q` in your evaluation dataset, collect three inputs:

- **Ranked results** `[d_1, d_2, ..., d_n]`: The ordered list of chunk or document IDs that your retriever returned.
- **Relevance judgments**: Either a set of relevant IDs `R` (**binary**) or a grade map `rel(d) ∈ {0,1,2,3}` (**graded**).
- **A cutoff `k`**: Set `k` to the chunk count you pass to the LLM (such as 5 or 10). Also track a larger cutoff (such as 50) for the candidate pool before reranking.

Dataset row shape:

```json
{"query_id": "q_017",
 "query": "What is the laptop refresh policy for engineers?",
 "relevant": {"d1": 3, "d3": 2, "d5": 2, "d4": 1},
 "tags": {"type": "policy", "source": "it-handbook"}}
```

Compute every metric **per query** first, then average the scores across all queries (**macro-average**). Always inspect the per-query distribution alongside the mean. A mean recall of 0.80 can hide 20% of queries scoring 0.0.

### The running worked example

Query: *"What is the laptop refresh policy for engineers?"*

- Graded relevance labels: `d1 = 3` (exact policy section), `d3 = 2` (engineering exception), `d5 = 2` (request process), `d4 = 1` (tangential mention). All other chunks have grade `0`. Thus `R = {d1, d3, d4, d5}` and `|R| = 4`.
- The retriever returns top 5: `[d7, d3, d1, d9, d4]`. Notice that the retriever missed `d5`.

| Rank | Doc | Graded rel | Binary rel | Hits so far | precision@rank |
|---|---|---|---|---|---|
| 1 | d7 | 0 | 0 | 0 | 0/1 = 0.00 |
| 2 | d3 | 2 | 1 | 1 | 1/2 = 0.50 |
| 3 | d1 | 3 | 1 | 2 | 2/3 = 0.67 |
| 4 | d9 | 0 | 0 | 2 | 2/4 = 0.50 |
| 5 | d4 | 1 | 1 | 3 | 3/5 = 0.60 |

We will compute every metric below using this ranked list.

---

## 2. Metric cards

### Hit rate@k

- **What it measures:** Whether **at least one** relevant item appears in the top `k` results (also called *success@k* or *top-k accuracy*).
- **Inputs required:** Ranked IDs and the relevant set `R`. Requires ground-truth relevance labels.
- **How to compute it:**

    ```text
    hit@k = 1 if |top_k ∩ R| > 0 else 0
    hit_rate@k = mean over queries of hit@k
    ```

- **Score range & interpretation:** 0 to 1. It represents the fraction of queries where the LLM sees at least one relevant chunk.
- **Worked example:** `hit@1 = 0` (`d7` is irrelevant), `hit@3 = 1`, and `hit@5 = 1`.
- **Pitfalls and gotchas:** Hit rate ignores how many relevant chunks the retriever found. It can mislead you on multi-hop or multi-part questions that require several chunks.
- **When to use it:** Use hit rate when each question needs only one source chunk (such as single-chunk synthetic datasets). Do not rely on it alone for multi-chunk questions.
- **Implemented in:** LlamaIndex (`hit_rate`), `ranx`, `pytrec_eval` (`success@k`), or custom Python.

### Precision@k

- **What it measures:** The fraction of the top `k` results that are relevant. It measures the signal-to-noise ratio of your context window.
- **Inputs required:** Ranked IDs and the relevant set `R`.
- **How to compute it:**

    ```text
    precision@k = |top_k ∩ R| / k
    ```

- **Score range & interpretation:** 0 to 1. Note that `|R| / k` caps the maximum possible score. If a query has only 1 relevant chunk, `precision@5` can never exceed `0.20`.
- **Worked example:** `precision@1 = 0`, `precision@3 = 2/3 ≈ 0.67`, and `precision@5 = 3/5 = 0.60`.
- **Pitfalls and gotchas:** Precision@k ignores chunk order inside the top `k` and penalizes queries with few relevant items. Never compare `precision@k` across datasets with different `|R|` distributions.
- **When to use it:** Use it to choose prompt cutoff `k` and control context noise. Pair it with `recall@k` to check evidence coverage.
- **Implemented in:** `ranx`, `pytrec_eval`, LlamaIndex, RAGAS `IDBasedContextPrecision` (exact ID match). RAGAS `NonLLMContextPrecisionWithReference` is a different metric: it matches chunks by string similarity and weights by rank, like average precision.

### Recall@k

- **What it measures:** The fraction of all relevant items that appear in the top `k` results. It answers: *"Did the LLM receive everything it needed?"*
- **Inputs required:** Ranked IDs and a **complete** relevant set `R`.
- **How to compute it:**

    ```text
    recall@k = |top_k ∩ R| / |R|
    ```

- **Score range & interpretation:** 0 to 1. Recall@k is the **most important retrieval metric for RAG** because the generator cannot recover missing evidence.
- **Worked example:** `recall@1 = 0/4 = 0`, `recall@3 = 2/4 = 0.50`, and `recall@5 = 3/4 = 0.75` (`d5` is missing).
- **Pitfalls and gotchas:** Recall accuracy depends on the completeness of `R`. If labelers mark only one relevant chunk when three exist, your evaluation penalizes retrievers that find the other valid chunks.
- **When to use it:** Report `recall@k` at your prompt cutoff `k` and at your pre-rerank candidate cutoff (such as `recall@50`, which caps reranker performance).
- **Implemented in:** `ranx`, `pytrec_eval`, LlamaIndex, RAGAS `IDBasedContextRecall` (exact ID match). RAGAS `NonLLMContextRecall` (string similarity) and DeepEval `ContextualRecallMetric` (LLM judge on reference-answer statements) are analogs, not exact `recall@k`.

### F1@k

- **What it measures:** The harmonic mean of `precision@k` and `recall@k`.
- **How to compute it:**

    ```text
    F1@k = 2 · P@k · R@k / (P@k + R@k)
    ```

- **Worked example:** `F1@5 = 2 · 0.60 · 0.75 / 1.35 ≈ 0.67`.
- **Pitfalls and gotchas:** F1@k hides whether a change helped precision or recall, and it ignores chunk order.
- **When to use it:** Use F1@k when tuning a dynamic `k` or similarity threshold that trades precision against recall. Otherwise, report precision and recall separately.
- **Implemented in:** Standard IR libraries or custom Python.

### MRR (Mean Reciprocal Rank)

- **What it measures:** How high the **first** relevant item appears in the ranked list.
- **How to compute it:**

    ```text
    RR(q)  = 1 / rank of first relevant item   (0 if none in top k)
    MRR@k  = mean over queries of RR(q)
    ```

- **Score range & interpretation:** 0 to 1. `1 / MRR` is the harmonic-mean rank of the first hit, so an MRR of `0.50` corresponds to a harmonic-mean rank of 2. It does not mean a typical rank of 2: a mix of rank-1 hits and zero-hit queries can also average 0.50. Always inspect the RR distribution and the zero-hit rate.
- **Worked example:** The first relevant chunk is `d3` at rank 2, so `RR = 0.50`. Across three queries with `RR` values of `0.50`, `1.0`, and `0`, `MRR = 0.50`.
- **Pitfalls and gotchas:** MRR ignores every relevant chunk after the first hit.
- **When to use it:** Use MRR for single-fact lookups, navigational queries, and top-1 citation checks. Do not use it as the sole metric for multi-chunk questions.
- **Implemented in:** `ranx`, `pytrec_eval`, LlamaIndex (`mrr`).

### MAP (Mean Average Precision)

- **What it measures:** Precision averaged across the ranks of all relevant items. It rewards retrievers that rank *all* relevant items *near the top*.
- **How to compute it:**

    ```text
    AP(q) = (1 / |R|) · Σ_{k=1..n} precision@k · rel_k        # rel_k ∈ {0,1}
    MAP   = mean over queries of AP(q)
    ```

    Some libraries (such as RAGAS context precision) divide by the number of **retrieved** relevant items instead of `|R|`. Check which denominator your library uses, because dividing by retrieved hits ignores missed items.

- **Score range & interpretation:** 0 to 1.
- **Worked example:** Relevant items appear at ranks 2, 3, and 5 with precisions `0.50`, `0.67`, and `0.60` (sum = `1.767`).
    - Standard AP (dividing by `|R| = 4`): **0.44**
    - Retrieved-only variant (dividing by `3`): **0.59**
- **Pitfalls and gotchas:** MAP works only on binary labels and is harder to explain to non-technical stakeholders than recall or nDCG.
- **When to use it:** Use MAP to compare rankers when queries have multiple relevant chunks and binary relevance labels.
- **Implemented in:** `ranx`, `pytrec_eval`, `trec_eval`.

### nDCG@k (normalised Discounted Cumulative Gain)

- **What it measures:** Ranking quality under **graded** relevance. It rewards placing highly relevant chunks at the top and discounts lower ranks logarithmically.
- **How to compute it:**

    ```text
    DCG@k  = Σ_{i=1..k} gain(rel_i) / log2(i + 1)

    gain(rel) = rel            # "linear" gain: default in trec_eval, pytrec_eval, BEIR/MTEB, scikit-learn, ranx "ndcg"
    gain(rel) = 2^rel − 1      # "exponential" gain (Burges et al. 2005): emphasises highly relevant items; ranx "ndcg_burges"

    IDCG@k = DCG@k of the ideal ordering (all labeled items sorted by rel, descending)
    nDCG@k = DCG@k / IDCG@k     (define as 0 if IDCG@k = 0)
    ```

- **Score range & interpretation:** 0 to 1, where 1.0 indicates a perfect ranking of all labeled relevant items.
- **Worked example (linear gain, the library default):**
    - Grades by rank: `[0, 2, 3, 0, 1]` → gains `[0, 2, 3, 0, 1]`
    - Discounts `log2(i+1)`: `[1, 1.585, 2, 2.322, 2.585]`
    - `DCG@5 = 0 + 2/1.585 + 3/2 + 0 + 1/2.585 = 1.262 + 1.5 + 0.387 =` **3.149**
    - Ideal grades `[3, 2, 2, 1, 0]` → `IDCG@5 = 3 + 2/1.585 + 2/2 + 1/2.322 = 3 + 1.262 + 1 + 0.431 =` **5.693**
    - `nDCG@5 = 3.149 / 5.693 ≈` **0.55**
- **Worked example (exponential gain):**
    - Gains `[0, 3, 7, 0, 1]` → `DCG@5 = 0 + 3/1.585 + 7/2 + 0 + 1/2.585 = 1.893 + 3.5 + 0.387 =` **5.780**
    - Ideal gains `[7, 3, 3, 1, 0]` → `IDCG@5 = 7 + 1.893 + 1.5 + 0.431 =` **10.823**
    - `nDCG@5 = 5.780 / 10.823 ≈` **0.53**
- **Pitfalls and gotchas:**
    - **Exponential and linear gain produce different scores.** State and pin your gain formula in every report. Do not compare your number with a published BEIR or MTEB number unless both use the same gain.
    - **Compute IDCG over all labeled items in `R`**, not just the retrieved subset. Computing IDCG over retrieved items hides missed chunks like `d5`.
    - **`sklearn.metrics.ndcg_score` builds IDCG from the scores you pass in.** Pass every judged document, including relevant documents that the retriever did not return (give them a score below every retrieved item). If you pass only the 5 retrieved documents, the example scores **0.66** instead of **0.55**, because `d5` disappears from the ideal ranking.
    - **Binary labels flatten nDCG's main advantage.**
- **When to use it:** Use `nDCG@k` as your primary ranking metric when you have graded labels (`0–3` scores) or tune a reranker. BEIR and MTEB use `nDCG@10` as their headline retrieval metric.
- **Implemented in:** `ranx` (`ndcg`, `ndcg_burges`), `pytrec_eval` (`ndcg_cut_k`), `scikit-learn` (`ndcg_score`), BEIR/MTEB evaluators. Original metric: Järvelin & Kekäläinen (2002).

### R-precision

- **What it measures:** Precision at `k = |R|`. It measures the relevant fraction when you retrieve exactly `|R|` items.
- **How to compute it:**

    ```text
    R-precision = |top_|R| ∩ R| / |R|
    ```

    At cutoff `k = |R|`, precision and recall are equal.

- **Worked example:** Because `|R| = 4`, the top 4 results `[d7, d3, d1, d9]` contain 2 relevant items, giving **0.50**.
- **Pitfalls and gotchas:** R-precision requires complete `R` sets and collapses to `hit@1` whenever `|R| = 1`.
- **When to use it:** Use it to compare retrievers across queries that have widely varying numbers of relevant chunks.
- **Implemented in:** `trec_eval`, `pytrec_eval`, `ranx`.

### ERR and RBP (user-model metrics)

nDCG assumes that a user reads down the list regardless of what they have already found. Two metrics model the user more directly:

- **ERR (Expected Reciprocal Rank)** (Chapelle et al., 2009): The user stops at the first result that satisfies them. Each result `i` satisfies with probability `R_i = (2^g_i − 1) / 2^g_max`.

    ```text
    ERR@k = Σ_{r=1..k} (1/r) · R_r · Π_{i<r} (1 − R_i)
    ```

    A highly relevant result at rank 1 makes all later results count for little. Use ERR when one good chunk is enough (single-fact lookups with graded labels).
- **RBP (Rank-Biased Precision)** (Moffat & Zobel, 2008): The user moves from rank `i` to rank `i+1` with a fixed "persistence" probability `p`.

    ```text
    RBP = (1 − p) · Σ_{i=1..n} rel_i · p^(i−1)        # rel_i ∈ {0,1}
    residual = p^n                                    # maximum score that unseen ranks could still add
    ```

    RBP does not need `|R|`, so it works when your relevant set is incomplete. Report the residual next to the score.
- **Worked example:** With `g_max = 3`, `ERR@5 = 0.5 · 3/8 + (1/3) · (5/8) · (7/8) + 0.2 · (5/8) · (1/8) · (1/8) ≈` **0.37**. With binary labels and `p = 0.8`, `RBP = 0.2 · (0.8 + 0.64 + 0.4096) ≈` **0.37**, residual `0.8^5 ≈ 0.33`.
- **Implemented in:** `ranx` (`rbp`), the TREC `gdeval` script (ERR), or custom Python.

### Summary of the worked example

| Metric | Value |
|---|---|
| hit@1 / hit@3 / hit@5 | 0 / 1 / 1 |
| precision@3 / precision@5 | 0.67 / 0.60 |
| recall@3 / recall@5 | 0.50 / 0.75 |
| F1@5 | 0.67 |
| Reciprocal rank | 0.50 |
| Average precision (÷ \|R\|) | 0.44 |
| nDCG@5 (linear gain / exp. gain) | 0.55 / 0.53 |
| R-precision | 0.50 |
| ERR@5 / RBP (p = 0.8) | 0.37 / 0.37 |

---

## 3. Pure-Python implementation

Use this dependency-free implementation as a reference and sanity check for third-party libraries.

```python
import math
from statistics import mean

def hit_at_k(ranked: list[str], relevant: set[str], k: int) -> float:
    return 1.0 if any(d in relevant for d in ranked[:k]) else 0.0

def precision_at_k(ranked: list[str], relevant: set[str], k: int) -> float:
    return sum(d in relevant for d in ranked[:k]) / k

def recall_at_k(ranked: list[str], relevant: set[str], k: int) -> float:
    if not relevant:
        return float("nan")  # undefined; exclude such queries (e.g. unanswerables)
    return sum(d in relevant for d in ranked[:k]) / len(relevant)

def f1_at_k(ranked: list[str], relevant: set[str], k: int) -> float:
    p, r = precision_at_k(ranked, relevant, k), recall_at_k(ranked, relevant, k)
    return 2 * p * r / (p + r) if (p + r) else 0.0

def reciprocal_rank(ranked: list[str], relevant: set[str], k: int | None = None) -> float:
    for i, d in enumerate(ranked[:k], start=1):
        if d in relevant:
            return 1.0 / i
    return 0.0

def average_precision(ranked: list[str], relevant: set[str], k: int | None = None) -> float:
    hits, total = 0, 0.0
    for i, d in enumerate(ranked[:k], start=1):
        if d in relevant:
            hits += 1
            total += hits / i
    return total / len(relevant) if relevant else 0.0

def r_precision(ranked: list[str], relevant: set[str]) -> float:
    r = len(relevant)
    return sum(d in relevant for d in ranked[:r]) / r if r else 0.0

def dcg(gains: list[float]) -> float:
    return sum(g / math.log2(i + 2) for i, g in enumerate(gains))

def ndcg_at_k(ranked: list[str], grades: dict[str, int], k: int,
              exponential: bool = False) -> float:
    """Linear gain by default (matches trec_eval, BEIR/MTEB, sklearn)."""
    gain = (lambda g: 2 ** g - 1) if exponential else (lambda g: g)
    actual = [gain(grades.get(d, 0)) for d in ranked[:k]]
    ideal = [gain(g) for g in sorted(grades.values(), reverse=True)[:k]]
    idcg = dcg(ideal)
    return dcg(actual) / idcg if idcg else 0.0


# --- worked example ---
ranked = ["d7", "d3", "d1", "d9", "d4"]
grades = {"d1": 3, "d3": 2, "d5": 2, "d4": 1}
relevant = {d for d, g in grades.items() if g > 0}

assert hit_at_k(ranked, relevant, 1) == 0.0
assert round(precision_at_k(ranked, relevant, 5), 2) == 0.60
assert round(recall_at_k(ranked, relevant, 5), 2) == 0.75
assert round(f1_at_k(ranked, relevant, 5), 2) == 0.67
assert reciprocal_rank(ranked, relevant) == 0.5
assert round(average_precision(ranked, relevant), 2) == 0.44
assert r_precision(ranked, relevant) == 0.5
assert round(ndcg_at_k(ranked, grades, 5), 2) == 0.55                    # linear
assert round(ndcg_at_k(ranked, grades, 5, exponential=True), 2) == 0.53   # exponential


def evaluate(run: dict[str, list[str]], qrels: dict[str, dict[str, int]],
             ks=(1, 3, 5, 10)) -> dict[str, float]:
    """run: query_id -> ranked IDs; qrels: query_id -> {doc_id: grade}. Macro-averaged."""
    rows = []
    for qid, grades in qrels.items():
        rel = {d for d, g in grades.items() if g > 0}
        if not rel:
            continue  # unanswerable queries are evaluated elsewhere (abstention)
        ranked = run.get(qid, [])
        row = {"mrr": reciprocal_rank(ranked, rel), "map": average_precision(ranked, rel)}
        for k in ks:
            row[f"hit@{k}"] = hit_at_k(ranked, rel, k)
            row[f"recall@{k}"] = recall_at_k(ranked, rel, k)
            row[f"precision@{k}"] = precision_at_k(ranked, rel, k)
            row[f"ndcg@{k}"] = ndcg_at_k(ranked, grades, k)
        rows.append(row)
    return {m: mean(r[m] for r in rows) for m in rows[0]} if rows else {}
```

For production pipelines, use established libraries like [ranx](https://github.com/AmenRa/ranx) or [pytrec_eval](https://github.com/cvangysel/pytrec_eval). Of these two, only ranx has built-in paired significance tests ([`ranx.compare`](https://amenra.github.io/ranx/compare/)). With pytrec_eval, export the per-query scores and run the paired test yourself (see [§3.1](#31-compare-systems-with-paired-per-query-tests)).

To cross-check nDCG against scikit-learn, pass every judged document, including the missed `d5`:

<!-- snippet: continue -->
```python
import numpy as np
from sklearn.metrics import ndcg_score

docs = ["d7", "d3", "d1", "d9", "d4", "d5"]          # retrieved + missed relevant
y_true = np.asarray([[grades.get(d, 0) for d in docs]])
y_score = np.asarray([[5, 4, 3, 2, 1, 0]])           # retriever order; d5 ranks last
assert round(ndcg_score(y_true, y_score, k=5), 2) == 0.55       # linear gain

# Wrong: only the retrieved docs. IDCG no longer contains d5.
assert round(ndcg_score(y_true[:, :5], y_score[:, :5], k=5), 2) == 0.66
```

### 3.1 Compare systems with paired per-query tests

Two retrievers are evaluated on the same queries, so compare them **per query**, not by their means alone. Smucker, Allan & Carterette (2007) compared significance tests for IR evaluation. The randomization (permutation) test, the paired bootstrap, and the paired t-test mostly agree. They recommend against the sign test and the Wilcoxon signed-rank test.

```python
import random

def paired_randomization_test(a: list[float], b: list[float],
                              n_resamples: int = 10_000, seed: int = 0) -> tuple[float, float]:
    # a, b: per-query scores of systems A and B on the same queries, in the same order.
    # Returns (mean difference B - A, two-sided p-value).
    assert len(a) == len(b) and a, "need paired per-query scores"
    diffs = [y - x for x, y in zip(a, b)]
    observed = sum(diffs) / len(diffs)
    rng = random.Random(seed)
    extreme = 0
    for _ in range(n_resamples):
        flipped = sum(d if rng.random() < 0.5 else -d for d in diffs) / len(diffs)
        if abs(flipped) >= abs(observed) - 1e-12:
            extreme += 1
    return observed, (extreme + 1) / (n_resamples + 1)


base = [0.50, 0.75, 0.25, 1.00, 0.50, 0.00, 0.75, 0.50, 0.25, 0.50]   # recall@5 per query
new  = [0.75, 1.00, 0.50, 1.00, 0.75, 0.25, 0.75, 0.75, 0.50, 0.75]
delta, p = paired_randomization_test(base, new)
assert round(delta, 3) == 0.2 and p < 0.01
```

- Keep the per-query scores from every run. Means alone cannot support a paired test.
- When you test many slices or metrics, correct for multiple comparisons (for example Benjamini–Hochberg).
- Report the effect size (mean difference and its interval), not only the p-value.
- For sample sizes, confidence intervals, and release gates, see [Running offline experiments](./08-running-offline-experiments.md).

---

## 4. Choosing concepts: binary vs graded, rank-aware vs rank-unaware

| Relevance type | Rank-unaware | Rank-aware |
|---|---|---|
| **Binary relevance** | hit@k, precision@k, recall@k, F1@k, R-precision | MRR, MAP / AP |
| **Graded relevance** | Graded recall variants (rarely used) | **nDCG@k** |

- **Start with binary labels.** Binary relevance is cheaper to collect and produces higher agreement between human labelers.
- **Upgrade to graded labels for rerankers.** A 0–3 scale (`0` = irrelevant, `1` = tangential, `2` = partial, `3` = complete) separates direct answers from keyword-only matches.
- **Track chunk rank even when the LLM reads all `k` chunks.** Rank determines which chunks survive token truncation, which facts the model attends to ("lost in the middle"), and which source gets cited first. Use `recall@k` as your primary metric and `nDCG@k` or `MRR` as your secondary metric.

### Which metric when

| Situation | Primary metric | Secondary | Why |
|---|---|---|---|
| Checking if evidence reaches the LLM | **recall@k** (`k` = prompt chunk count) | hit@k | The generator cannot recover missing evidence |
| Single-chunk synthetic dataset | **hit@k**, MRR | recall@k (equals hit@k here) | Each query has only one known relevant chunk |
| Tuning a reranker | **nDCG@k** (`k` = post-rerank count) | MRR, recall@k | Reranking optimizes chunk ordering |
| Choosing `k` or a similarity cutoff | precision@k and recall@k curves | F1@k | Shows the exact noise-versus-coverage trade-off |
| Multi-hop or multi-part questions | **recall@k** | MAP | The generator needs every supporting piece |
| Navigational or single-answer lookups | **MRR** | hit@1 | The top-ranked result matters most |
| Comparing against BEIR or MTEB | **nDCG@10** | recall@100 | Matches standard public benchmark metrics |
| Evaluating candidate generation before reranking | **recall@50** or **recall@100** | None | Sets the upper bound on reranker performance |
| Reference answers available, no chunk labels | LLM-based context recall / precision ([01](./01-end-to-end-rag-evals.md)) | None | Evaluates retrieval without chunk ID labels |

---

## 5. Getting relevance labels

Retrieval metrics require `qrels` (a mapping from each query to its relevant chunk IDs). Combine three labeling sources to build reliable `qrels`:

| Source | How it works | Cost | Quality | Main risk |
|---|---|---|---|---|
| **SME labels** | Domain experts grade candidate chunks from a **pooled** list across multiple retrievers | High | Highest | Incomplete `R` if labelers inspect output from only one retriever |
| **LLM-judged relevance** | An LLM judge grades `(query, chunk)` pairs on a 0–3 rubric, validated against human labels | Medium | High when validated | Judge bias toward keyword overlap or long chunks |
| **Synthetic from source chunk** | An LLM generates a question from a source chunk, making that chunk the label ([synthetic datasets](../01-datasets/03-synthetic-datasets.md)) | Low | Partial | Other valid chunks count as false misses, and verbatim phrasing inflates BM25 scores |

**Recommended labeling workflow:**

- [ ] Generate synthetic questions per chunk to get a fast initial `hit@k` and `MRR` baseline.
- [ ] Pool top 20 chunks from 2–3 retrievers (BM25, dense, hybrid) per query. Grade the pool on a 0–3 scale with an LLM judge.
- [ ] Validate the LLM judge before you trust it. Have SMEs label at least 100 `(query, chunk)` pairs, oversampled so that at least 30–50 pairs are not relevant. On a held-out split, require TPR ≥ 0.85, TNR ≥ 0.85, and Cohen's κ ≥ 0.60 against the SMEs (≥ 0.90 TPR/TNR for high-risk slices such as RBAC-restricted content). See [LLM-as-a-judge](./07-llm-as-a-judge.md) for the full procedure.
- [ ] Re-pool and grade newly surfaced chunks whenever you test a new retriever. This prevents unlabeled relevant chunks from counting as misses.
- [ ] Rewrite synthetic questions to remove verbatim source phrases so your eval does not artificially favor BM25.

### 5.1 Incomplete judgments and pooling bias

Pooled labels are never complete. A new retriever can return relevant chunks that nobody judged. Most metrics treat an unjudged chunk as **not relevant**, so a better retriever can score lower than the old one. Detect and limit this bias:

- **Report judged@k.** This is the fraction of the top `k` results that have a label (relevant or not). If judged@10 drops for a new system, its scores are not comparable with the old system. Judge the new chunks first.
- **Use bpref for large judgment gaps** (Buckley & Voorhees, 2004). bpref uses only judged documents: it counts how many judged non-relevant documents rank above each relevant document. Unjudged documents have no effect.
- **Or use condensed lists** (Sakai, 2007). Remove unjudged documents from each ranked list, then compute the normal metrics (for example nDCG′ or AP′). Sakai found that condensed-list metrics are often more robust than bpref.
- **Prefer RBP when `|R|` is unknown.** Its residual shows the maximum effect of unseen results (see [ERR and RBP](#err-and-rbp-user-model-metrics)).
- **Re-pool after every new retriever** (see the workflow above). This is the real fix. The other methods only limit the damage.

### 5.2 LLM relevance prompt

LLM relevance prompt sketch:

```text
Query: {query}
Passage: {chunk_text}

Grade how well the passage helps answer the query:
3 = directly and fully answers it
2 = answers part of it or provides essential supporting info
1 = on-topic but does not help answer
0 = irrelevant
Reply with JSON: {"reason": "...", "grade": 0|1|2|3}
```

---

## 6. Chunk-level vs document-level matching pitfalls

When your relevance labels and your retriever use different granularities, naive ID matching silently corrupts your metrics.

| Pitfall | Symptom | Fix |
|---|---|---|
| **Re-chunking breaks chunk IDs** | Changing chunk size from 512 to 256 tokens drops recall near zero because all chunk IDs changed | Label `(doc_id, start_char, end_char)` spans and match retrieved chunks by **character overlap** at eval time |
| **Doc-level labels vs chunk-level retrieval** | Retrieving an irrelevant section of the right document still counts as a hit | Report both doc-level and span-level metrics, and deduplicate chunks to document IDs before scoring doc-level rank |
| **Duplicate or near-duplicate chunks** | Boilerplate or copied policy text appears in multiple documents, so retrieving the duplicate counts as a miss | Deduplicate your corpus or group identical chunks into equivalence classes |
| **Multiple valid sources** | Synthetic generation marks one chunk as relevant, while another chunk answers the query equally well | Pool candidates and grade with an LLM judge (section 5), or check whether the chunk entails the reference claims |
| **Stale document versions** | An outdated policy matches the query text and inflates recall | Include version metadata in labels and grade superseded documents as `0` |
| **Overlapping sliding-window chunks** | Adjacent overlapping chunks both match the gold span and inflate precision@k | Merge overlapping chunks or measure total character-span coverage |

Span-overlap matching sketch. A chunk is relevant if the overlap covers at least `min_overlap` of the **shorter** of the two spans. Do not divide by the gold-span length only: a 1,000-character chunk inside a 3,000-character gold span then covers only 33% and counts as a miss. Use `span_coverage` for recall-like scoring, so that several small chunks of one long span add up and duplicate chunks do not inflate the score.

```python
Span = dict  # {"doc_id": str, "start": int, "end": int} in character offsets, end exclusive

def overlap(a: Span, b: Span) -> int:
    if a["doc_id"] != b["doc_id"]:
        return 0
    return max(0, min(a["end"], b["end"]) - max(a["start"], b["start"]))

def chunk_is_relevant(chunk: Span, gold_spans: list[Span], min_overlap: float = 0.5) -> bool:
    chunk_len = chunk["end"] - chunk["start"]
    for g in gold_spans:
        ov = overlap(chunk, g)
        # ov > 0 implies both spans have positive length, so no division by zero
        if ov and ov / min(chunk_len, g["end"] - g["start"]) >= min_overlap:
            return True
    return False

def span_coverage(chunks: list[Span], gold_spans: list[Span]) -> float:
    """Fraction of gold characters covered by the union of retrieved chunks."""
    total = sum(max(0, g["end"] - g["start"]) for g in gold_spans)
    if total == 0:
        return float("nan")  # nothing to cover; exclude the query
    covered = 0
    for g in gold_spans:
        parts = sorted((max(c["start"], g["start"]), min(c["end"], g["end"]))
                       for c in chunks if overlap(c, g))
        end = g["start"]
        for s, e in parts:  # merge overlapping intervals
            covered += max(0, e - max(s, end))
            end = max(end, e)
    return covered / total


gold = [{"doc_id": "it-handbook", "start": 0, "end": 3000}]
chunks = [{"doc_id": "it-handbook", "start": i, "end": i + 1000} for i in (0, 1000, 2000)]
assert [chunk_is_relevant(c, gold) for c in chunks] == [True, True, True]
assert span_coverage(chunks[:2], gold) == 2 / 3
assert span_coverage(chunks + chunks, gold) == 1.0        # duplicates do not inflate coverage
assert not chunk_is_relevant({"doc_id": "it-handbook", "start": 2900, "end": 3900}, gold)
assert not chunk_is_relevant(chunks[0], [{"doc_id": "it-handbook", "start": 5, "end": 5}])  # empty span
```

---

## 7. Evaluating each retrieval stage

Modern retrieval pipelines chain multiple stages. Compute the **same metrics at the output of every stage** on the same query set to isolate where quality gains or losses happen.

```mermaid
flowchart LR
    Q["User query"] --> QR["Query rewrite / expansion / HyDE"]
    QR --> BM["BM25 top 50"]
    QR --> DE["Dense top 50"]
    BM --> F["Fusion e.g. RRF"]
    DE --> F
    F --> RBAC["Metadata + RBAC filter"]
    RBAC --> RR["Reranker top 5"]
    RR --> LLM["Generator"]
```

| Stage | What to compare | Metric | Notes |
|---|---|---|---|
| **Query rewriting** (expansion, decomposition, HyDE, multi-turn rewrite) | Original query vs rewritten query on the same retriever | recall@k, MRR | Evaluate multi-turn rewrites ("what about contractors?") to ensure they resolve coreferences without adding latency spikes |
| **Lexical search (BM25)** | BM25 baseline | recall@50 | Excels on exact IDs, error codes, product names, and acronyms |
| **Dense search** | Embedding model A vs model B | recall@50, nDCG@10 | Excels on paraphrases and conceptual queries |
| **Hybrid fusion** | BM25 alone vs dense alone vs fused (such as RRF) | recall@50, nDCG@10 per **query slice** | Reciprocal Rank Fusion (RRF) is a strong zero-tuning baseline |
| **Metadata and RBAC filters** | Filtered vs unfiltered retrieval per user role | recall@k, unauthorized leak rate | Overly strict filters hurt recall, while leaky filters violate security. Target **0** restricted docs (see [access control](../04-guardrails/06-access-control-rbac.md)) |
| **Reranker** | Fused top-`N` before vs after reranking | nDCG@5, MRR, recall@5 | **Reranker lift** = `metric(after) - metric(before)`. Candidate pool `recall@N` caps maximum reranker recall |
| **Final prompt context** (post-dedup and truncation) | Post-rerank list vs final prompt chunks | recall@k at prompt | Measures what the generator LLM actually receives |

**Reranker lift example:** Suppose fused candidate pool `recall@50` is `0.92`, pre-rerank `recall@5` is `0.61`, and post-rerank `recall@5` is `0.79`. The reranker closed `(0.79 - 0.61) / (0.92 - 0.61) ≈ 58%` of the recoverable gap. If candidate pool `recall@50` were only `0.65`, no reranker could push `recall@5` above `0.65`. Fix candidate generation first when pool recall is low.

```python
def stage_report(stages: dict[str, dict[str, list[str]]], qrels, ks=(5, 10, 50)):
    """stages: stage_name -> run (query_id -> ranked ids). Prints recall/nDCG per stage."""
    for name, run in stages.items():
        m = evaluate(run, qrels, ks=ks)
        print(f"{name:12s} " + "  ".join(f"{k}={v:.3f}" for k, v in m.items()
                                          if k.startswith(("recall", "ndcg"))))
```

**Break down results by query slice.** Hybrid search and query rewriting often produce large gains on specific slices (like acronym-heavy queries) even when the overall mean shifts by 1–2 points.

### 7.1 Agentic and multi-hop retrieval

In an agentic RAG app, the agent decides **whether** to search, **what** to search for, and **how many times**. One ranked list per query no longer describes retrieval. Add these checks:

| Check | What to label | Metric | Notes |
|---|---|---|---|
| **Retrieve-or-not decision** | For each query: "needs retrieval" yes/no | Precision and recall of the decision; false-skip rate | A skipped search on a policy question forces the model to answer from memory. Self-RAG (Asai et al., 2023) and Adaptive-RAG (Jeong et al., 2024) make this decision explicit |
| **Per-hop recall** | The evidence needed at each hop | `recall@k` for each search call, against that hop's evidence | Hop 2 depends on hop 1. Score each hop with the gold hop-1 result as well, so that one early miss does not hide a working hop 2 |
| **Evidence-chain completeness** | All supporting facts for the final answer | Fraction of queries where the union of all searches contains **every** supporting fact | HotpotQA (Yang et al., 2018) labels supporting facts. MuSiQue (Trivedi et al., 2022) builds questions that need every hop |
| **Redundant retrieval** | Nothing extra | Searches per query; fraction of retrieved chunks already seen in this trajectory | Repeated searches add latency and cost without new evidence |
| **Query formulation** | Optional: a reference sub-query per hop | `recall@k` of the agent's sub-query vs the reference sub-query on the same retriever | Separates "bad query" from "bad retriever" |

Score the trajectory-level behaviour (tool choice, step count, loops) with [agent and trajectory evals](./04-agent-tool-and-trajectory-evals.md). Score the evidence in each search call with the metrics on this page.

### 7.2 Whole-document tasks: when success means every item

An employee asks Acme Assistant for "every country where we pay a daily travel allowance, with the rate". The travel policy is 40 pages long and names 23 countries. The retriever returns five chunks, and each one is relevant, so precision@5 is 1.0. The answer lists 9 countries.

Top-k metrics ask whether you found supporting evidence. This task asks whether you found **every** item.

Husain and Shankar draw the same line. "Unlike RAG, where chunks are optimized for retrieval, document processing assumes the model will see every chunk" ([Evals FAQ](https://hamel.dev/blog/posts/evals-faq/how-do-i-choose-the-right-chunk-size-for-my-document-processing-tasks.html)). For tasks such as "List all customer complaints", they recommend smaller chunks and a map-reduce pattern to preserve "output completeness".

| Task shape | Example | Success metric |
|---|---|---|
| **Find support** | "What is the daily rate for Japan?" | `recall@k`, MRR (sections 2–3) |
| **Extract every item** | "List every country and its rate" | Item-level recall and precision over a reference item list |
| **Cover every point** | "Summarize every change in the 2026 policy" | Key-fact recall ([end-to-end RAG evals](./01-end-to-end-rag-evals.md#310-response-completeness)) |

Do not infer coverage from a single-needle test. On RULER, models reach "nearly perfect accuracy in the vanilla NIAH test". They still drop sharply on harder long-context tasks, such as aggregation ([Hsieh et al., 2024](https://arxiv.org/abs/2404.06654)). On the Oolong benchmark, GPT-5, Claude Sonnet 4, and Gemini 2.5 Pro all scored "less than 50% accuracy" at 128K tokens ([Bertsch et al., 2025](https://arxiv.org/abs/2511.02817)).

**Score every-item tasks with these rules.**

1. **Build a reference item list.** Store one row per item, with its character span ([section 6](#6-chunk-level-vs-document-level-matching-pitfalls)) and its page.
2. **Match items one-to-one.** A duplicate in the output must not earn credit twice. Report the duplicate count separately.
3. **State a normalization rule per field.** Fold case and whitespace in names. Convert numbers to a canonical form yourself, and do not rely on tool defaults. Google Document AI never fuzzy-matches numbers: "1 and 1.00 don't match" ([docs](https://docs.cloud.google.com/document-ai/docs/evaluate)).
4. **Score records, not only fields.** The right rate under the wrong country is a wrong record.
5. **Seed boundary cases.** Put some items across a chunk boundary or a page break, and some in long tables. Report recall on these cases separately.
6. **Report recall by position.** Models use information at the start and end of a long context better than information in the middle ([Liu et al., 2023](https://arxiv.org/abs/2307.03172)). Page position is only a proxy for context position. Measure context position directly when the whole document goes into the prompt.
7. **Score map and reduce separately.** For a map-reduce pipeline, measure per-chunk recall after the map step. Then measure what the reduce step lost, merged, or duplicated.

```python
from decimal import Decimal

def key(item: dict) -> tuple[str, Decimal]:
    """Normalize one record: folded country name plus the rate in canonical form."""
    return item["country"].strip().casefold(), Decimal(str(item["daily_rate"])).normalize()

def item_scores(predicted: list[dict], reference: list[dict], pages: int) -> dict:
    gold = {key(r): r for r in reference}
    pred = {key(p) for p in predicted}                # one-to-one: a duplicate counts once
    hits = gold.keys() & pred                         # country and rate must both match
    by_position: dict[str, list[bool]] = {}
    for k, r in gold.items():
        third = ("start", "middle", "end")[min(2, 3 * (r["page"] - 1) // pages)]
        by_position.setdefault(third, []).append(k in hits)
    return {"recall": len(hits) / len(gold),
            "precision": len(hits) / len(pred) if pred else 0.0,
            "duplicates": len(predicted) - len(pred),
            "recall_by_position": {t: sum(v) / len(v) for t, v in by_position.items()}}


reference = [{"country": "Germany", "daily_rate": "28.00", "page": 2},
             {"country": "Japan", "daily_rate": "6200", "page": 18},
             {"country": "India", "daily_rate": "2500", "page": 21},
             {"country": "Brazil", "daily_rate": "180", "page": 39}]
predicted = [{"country": "germany ", "daily_rate": "28"},      # normalizes to the reference record
             {"country": "Germany", "daily_rate": "28.0"},     # duplicate: no extra credit
             {"country": "Japan", "daily_rate": "6000"},       # wrong rate: a wrong record
             {"country": "Brazil", "daily_rate": "180"}]
s = item_scores(predicted, reference, pages=40)
assert (s["recall"], s["precision"], s["duplicates"]) == (0.5, 2 / 3, 1)
assert s["recall_by_position"] == {"start": 1.0, "middle": 0.0, "end": 1.0}   # the middle is missed
```

---

## 8. Embedding model choice: MTEB and BEIR as references

- **[BEIR](https://github.com/beir-cellar/beir)** (Thakur et al., 2021) benchmarks zero-shot retrieval across diverse domains. It showed that BM25 is a tough out-of-domain baseline and that dense embeddings often degrade on unfamiliar domains.
- **[MTEB](https://huggingface.co/spaces/mteb/leaderboard)** (Muennighoff et al., 2022) benchmarks text embeddings across many tasks, including BEIR retrieval datasets.

Use public leaderboards to **shortlist** candidates, never to make your final production choice:

- [ ] Shortlist 3–4 embedding models from MTEB's **Retrieval** tab. Filter by language, context length, vector dimension, license, and hosting constraints.
- [ ] Benchmark each candidate on **your own labeled queries** using `recall@k` and `nDCG@10`, both standalone and fused with BM25.
- [ ] Inspect domain-specific slices such as internal acronyms, code snippets, markdown tables, and non-English queries.
- [ ] Account for the operational cost of re-embedding and re-indexing your corpus when switching models.
- [ ] Watch out for benchmark contamination, as public leaderboard winners frequently underperform on private enterprise corpora.

---

## 9. Retrieval latency and cost

Every extra retrieval stage adds latency and compute cost (query rewriting adds an LLM call, and reranking runs a cross-encoder over `N` candidates).

| Component | What to measure | Notes |
|---|---|---|
| Query rewrite | p50/p95 latency, token cost | Often the slowest step in retrieval if it calls an LLM |
| Vector search | p50/p95 latency vs index size, ANN recall vs exact search | Approximate nearest neighbor (ANN) indexes trade recall for speed. Benchmark ANN recall against exact brute-force search |
| Reranker | Latency vs candidate count `N` | Latency scales linearly with `N`. Pick the smallest `N` where the `recall@N` curve flattens |
| End-to-end retrieval | Share of total p95 latency budget | Keep total retrieval latency to a small fraction of your overall chat response budget |

Plot `recall@k` or `nDCG@k` against p95 latency for each pipeline configuration. Select configurations on the **Pareto frontier**, and avoid expensive stages that add negligible quality gains.

---

## 10. Checklist

- [ ] Anchor relevance labels to document character spans (`doc_id`, `start`, `end`) so labels survive re-chunking.
- [ ] Pool top candidates across multiple retrievers before labeling to avoid single-retriever bias.
- [ ] Exclude unanswerable queries from `recall@k` and `MRR`, and evaluate them with [abstention metrics](./01-end-to-end-rag-evals.md#311-abstention-correctness-i-dont-know).
- [ ] Report `recall@k` at your prompt cutoff, `recall@N` at your candidate pool cutoff, `nDCG@k` after reranking, and `MRR`.
- [ ] Evaluate every stage on the same queries to measure hybrid lift and reranker lift per slice.
- [ ] Verify RBAC filters across roles to ensure zero leakage of restricted chunks.
- [ ] Track p95 retrieval latency alongside retrieval quality metrics.
- [ ] Score "list every item" tasks with item-level recall and precision, one-to-one matching, and recall by document position.
- [ ] Re-run your retrieval suite whenever you change chunking, embeddings, index parameters, or corpus documents.

---

## Key takeaways

- **Prioritize recall@k.** The generator cannot use evidence that never enters the prompt. Pair `recall@k` with `nDCG@k` or `MRR` to evaluate ranking order.
- **Build complete relevance sets.** Pool candidates across diverse retrievers, validate LLM relevance judges against SMEs, and re-pool when testing new retrievers.
- **Label character spans instead of chunk IDs.** Span-based labels let you tune chunk sizes and overlap without invalidating your dataset.
- **Measure every retrieval stage.** Compare query rewriting, BM25, dense search, fusion, filters, and reranking on the same queries.
- **State the nDCG gain formula.** Linear gain is the default in trec_eval, BEIR/MTEB, and scikit-learn. Exponential gain gives different numbers.
- **Test differences per query.** Use a paired randomization test or paired bootstrap on per-query scores. Watch judged@k when you add a new retriever.
- **Evaluate agentic retrieval per hop.** Check the retrieve-or-not decision, per-hop recall, and evidence-chain completeness.
- **Validate embeddings on your own data.** Use MTEB and BEIR only to shortlist candidates.
- **Score every-item tasks by items, not ranks.** A perfect top-k list can still miss most of the items a whole-document task needs.
- **Balance quality against latency.** Pick retrieval configurations from the quality-versus-latency Pareto frontier.

## Further reading

- Thakur et al., *BEIR: A Heterogenous Benchmark for Zero-shot Evaluation of Information Retrieval Models*, [arXiv:2104.08663](https://arxiv.org/abs/2104.08663)
- Muennighoff et al., *MTEB: Massive Text Embedding Benchmark*, [arXiv:2210.07316](https://arxiv.org/abs/2210.07316) · [Leaderboard](https://huggingface.co/spaces/mteb/leaderboard)
- Liu et al., *Lost in the Middle: How Language Models Use Long Contexts*, [arXiv:2307.03172](https://arxiv.org/abs/2307.03172)
- Hsieh et al., *RULER: What's the Real Context Size of Your Long-Context Language Models?*, [arXiv:2404.06654](https://arxiv.org/abs/2404.06654)
- Bertsch et al., *Oolong: Evaluating Long Context Reasoning and Aggregation Capabilities*, [arXiv:2511.02817](https://arxiv.org/abs/2511.02817)
- Hamel Husain & Shreya Shankar, [How do I choose the right chunk size for my document processing tasks?](https://hamel.dev/blog/posts/evals-faq/how-do-i-choose-the-right-chunk-size-for-my-document-processing-tasks.html) (Evals FAQ)
- Google Cloud, [Evaluate performance (Document AI)](https://docs.cloud.google.com/document-ai/docs/evaluate) (entity-level precision, recall, and matching rules)
- Cormack, Clarke & Büttcher, *Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods* (SIGIR 2009)
- Manning, Raghavan & Schütze, *Introduction to Information Retrieval*, ch. 8 "Evaluation in information retrieval", [online book](https://nlp.stanford.edu/IR-book/)
- [ranx](https://github.com/AmenRa/ranx) · [pytrec_eval](https://github.com/cvangysel/pytrec_eval) · [trec_eval](https://github.com/usnistgov/trec_eval)
- Järvelin & Kekäläinen, *Cumulated gain-based evaluation of IR techniques*, ACM TOIS 2002, [doi:10.1145/582415.582418](https://doi.org/10.1145/582415.582418)
- Burges et al., *Learning to rank using gradient descent*, ICML 2005 (exponential gain), [doi:10.1145/1102351.1102363](https://doi.org/10.1145/1102351.1102363)
- Chapelle, Metzler, Zhang & Grinspan, *Expected reciprocal rank for graded relevance*, CIKM 2009, [doi:10.1145/1645953.1646033](https://doi.org/10.1145/1645953.1646033)
- Moffat & Zobel, *Rank-biased precision for measurement of retrieval effectiveness*, ACM TOIS 2008, [doi:10.1145/1416950.1416952](https://doi.org/10.1145/1416950.1416952)
- Buckley & Voorhees, *Retrieval evaluation with incomplete information*, SIGIR 2004, [doi:10.1145/1008992.1009000](https://doi.org/10.1145/1008992.1009000)
- Sakai, *Alternatives to Bpref*, SIGIR 2007, [doi:10.1145/1277741.1277756](https://doi.org/10.1145/1277741.1277756)
- Smucker, Allan & Carterette, *A comparison of statistical significance tests for information retrieval evaluation*, CIKM 2007, [doi:10.1145/1321440.1321528](https://doi.org/10.1145/1321440.1321528)
- Asai et al., *Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection*, [arXiv:2310.11511](https://arxiv.org/abs/2310.11511)
- Jeong et al., *Adaptive-RAG: Learning to Adapt Retrieval-Augmented Large Language Models through Question Complexity*, [arXiv:2403.14403](https://arxiv.org/abs/2403.14403)
- Yang et al., *HotpotQA: A Dataset for Diverse, Explainable Multi-hop Question Answering*, [arXiv:1809.09600](https://arxiv.org/abs/1809.09600)
- Trivedi et al., *MuSiQue: Multihop Questions via Single-hop Question Composition*, [arXiv:2108.00573](https://arxiv.org/abs/2108.00573)
- [scikit-learn `ndcg_score`](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.ndcg_score.html)
- **Within this repo:**
    - [End-to-end RAG evals](./01-end-to-end-rag-evals.md)
    - [Synthetic datasets](../01-datasets/03-synthetic-datasets.md)
    - [Retrieval and context guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md)
    - [Metric cheatsheet](../05-decision-framework/03-metric-cheatsheet.md)
