# SME Golden Datasets

> **TL;DR**
>
> - **A golden dataset is a small (50–300 row) expert-verified dataset** that defines what "correct" means for your domain. Use 100–300 rows for release gates. LLM-judge validation needs ≥100 human-labelled outputs, including 30–50 FAILs.
> - **Respect expert time:** pre-fill draft answers and show source chunks inline so subject-matter experts (SMEs) only have to verify and edit.
> - **Use binary Pass/Fail rubrics and atomic key-facts lists** instead of vague 1–5 Likert scales.
> - **Measure reviewer agreement** with Cohen's $\kappa$, Fleiss' $\kappa$, or Krippendorff's $\alpha$, with a confidence interval. If two human experts cannot agree on a label, the target is ill-defined, and judge-agreement numbers against those labels mean little.
> - **Watch the prevalence paradox.** When almost all answers pass, $\kappa$ can be low even at 90%+ raw agreement. Report raw agreement, Gwet's AC1, and agreement on FAILs next to $\kappa$.

- **What you will learn:**
    - How to work with subject-matter experts (SMEs) without wasting their time
    - How to write clear annotation guidelines and binary Pass/Fail rubrics
    - Why storing both a reference answer and a `key_facts` list gives the most reliable grading
    - How to handle unanswerable, partial, and false-premise questions
    - How to calculate and interpret Cohen's $\kappa$, Fleiss' $\kappa$, and Krippendorff's $\alpha$ (including ordinal scales and confidence intervals)
    - How skewed pass rates distort $\kappa$, and what to report instead
    - How to find label errors in a gold set
- **Prerequisites:** [Dataset Strategy](./01-dataset-strategy.md)
- **Related guides:**
    - [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)
    - [End-to-End RAG Evals](../02-offline-evals/01-end-to-end-rag-evals.md)
    - [Production Data Flywheel](./04-production-data-flywheel.md)

---

## 1. What a golden dataset is (and isn't)

A **golden dataset** is a set of eval examples whose expected outputs were written or verified by domain experts (such as HR policy owners, finance analysts, support leads, or data engineers).

| What a golden dataset IS | What a golden dataset IS NOT |
|---|---|
| The **source of truth** for what "correct" means in your domain | A massive dataset (50 to 300 rows is typical and plenty) |
| The anchor used to **calibrate LLM judges** and validate synthetic data | Something an LLM can generate without human verification |
| A **living product specification** (including what must be refused) | Frozen forever (policies and database schemas change over time) |
| The benchmark for **release gates** and headline accuracy | A replacement for sampling live production traffic |

Golden data gives you the highest return on investment in five places:

1. **High-stakes RAG answers** (HR policy, finance rules, legal compliance).
2. **Gold SQL queries and expected results** (only data owners know that "active customer" means `status = 'A' AND churn_date IS NULL`).
3. **Graded retrieval relevance labels** (`relevant_docs` graded `0–3`).
4. **Policy and RBAC boundaries** (which requests must be refused or escalated).
5. **LLM-judge calibration sets** (human Pass/Fail grades on *actual system outputs*, used to test your LLM judge).

> **Important distinction:** You need two kinds of human labels:
>
> 1. **Golden references:** The expected answer, SQL query, or relevant docs for a question.
> 2. **Golden judgments:** A human's Pass/Fail grade on a specific *system output* (used to calibrate your [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md)).

---

## 2. Working with subject-matter experts

Expert time is your scarcest resource. Design your labeling workflow so SMEs never waste a minute.

### 2.1 Roles

| Role | Responsibility |
|---|---|
| **Eval owner** (AI engineer or PM) | Defines the schema, prepares batches, writes annotation guidelines, and computes reviewer agreement |
| **Principal domain expert ("benevolent dictator")** | Holds the final say on domain correctness and resolves ambiguous edge cases |
| **Annotators** (SMEs or trained reviewers) | Verify reference answers and grade system outputs |
| **Adjudicator** | Resolves disagreements between annotators (usually the principal domain expert) |

Assigning a single **"benevolent dictator"** (one accountable domain expert) prevents endless committee debates over what counts as a good answer.

### 2.2 Make SME sessions efficient

1. **Pre-fill draft answers.** Never give an SME a blank text box. Show the question, the retrieved chunks, and a draft answer from your system. Editing a draft takes 2 minutes; writing from scratch takes 15 minutes.
2. **Show source documents side by side.** Display the exact policy excerpt and version date right next to the answer so SMEs do not have to search for files.
3. **Batch items by domain.** Send all HR questions to the HR expert and all SQL questions to the analytics engineer.
4. **Time-box labeling sessions to 45–60 minutes.** Start each session by grading 3–5 calibration examples together as a group.
5. **Require a short written critique for every failure.** A 1-sentence note explaining *why* an answer failed becomes your next prompt fix or LLM-judge few-shot example.
6. **Give SMEs quick issue flags.** Let reviewers click `ambiguous_question`, `docs_outdated`, or `not_my_domain` so they never get stuck on a broken item.

### 2.3 Sourcing the inputs for SMEs to label

| Input source | Pros | Cons |
|---|---|---|
| **Questions SMEs hear most often** | Realistic and high business value | Skewed toward common questions; small volume |
| **Support tickets and Slack help channels** | Real user phrasing and real pain points | Requires PII scrubbing and cleanup |
| **Sampled production traces** | Matches live traffic distribution | Requires live users ([Production Data Flywheel](./04-production-data-flywheel.md)) |
| **Synthetic candidates verified by SMEs** | Fast way to cover rare slices | Can feel robotic unless filtered ([Synthetic Datasets](./03-synthetic-datasets.md)) |
| **Dimensions and tuples plan** | Guarantees systematic slice coverage | Needs human editing to sound natural ([Dataset Strategy](./01-dataset-strategy.md#42-dimensions-and-tuples-generating-diverse-inputs-systematically)) |

---

## 3. Annotation guidelines

Without written guidelines, every reviewer invents their own rules. Write a 1-page guideline document before labeling begins.

### 3.1 What to include

```markdown
# Annotation Guidelines: Acme Assistant, HR Policy Answers (v1.3)

## Your task
For each question, review the draft answer and the source documents. Provide:
1. A corrected reference answer (2–4 sentences).
2. A list of atomic key facts the answer MUST contain.
3. The doc_ids/chunk_ids that support each fact.
4. Answerability: answerable | partially_answerable | unanswerable.

## Definitions
- "Correct" = matches the CURRENT policy version shown. Do not use unwritten tribal knowledge.
  If the policy document itself is outdated, flag `docs_outdated` and grade against the text shown.
- "Key fact" = a single checkable statement whose absence would make the answer wrong or misleading.
  Do not include greetings or generic disclaimers.

## Decision rules
- If a policy varies by country or role and the user did not specify theirs → either ask a clarifying
  question OR state the general rule and list the variations (if 3 or fewer).
- Numbers: always include units and scope ("16 weeks, full-time employees, Germany").
- Partially answerable questions: mark `partially_answerable`, list key facts for the covered part,
  and require the assistant to state what is missing (`must_acknowledge_gap: true`).

## Worked examples
(Include 3–5 complete examples: 1 clear pass, 1 clear fail, 1 borderline partial, 1 unanswerable)
```

### 3.2 Guideline principles

- **Replace vague adjectives with testable rules.** Do not write *"the answer should be helpful."* Write *"the answer states the numeric limit in the first sentence and cites the policy document."*
- **Grade separate dimensions separately.** Do not ask for one overall "quality" score. Ask separate Pass/Fail questions for correctness, completeness, faithfulness, and policy compliance.
- **State what reviewers should ignore.** For example: *"Ignore bullet vs. paragraph formatting unless it changes the meaning."*
- **Update the guidelines after every adjudication round.** Treat guidelines as versioned code.

---

## 4. Rubric design

### 4.1 Prefer binary (pass/fail) per criterion

Avoid 1–5 Likert scales for release gates. Reviewers rarely agree on the difference between a `3` and a `4`, and LLM judges cluster around `3` or `4`. Instead, use **binary Pass/Fail checks per criterion** paired with a 1-sentence critique.

| Rubric type | Reviewer agreement | Actionability | When to use it |
|---|---|---|---|
| **Binary Pass/Fail + critique** | Highest (if the rubric is clear) | High (*"Fails because it missed the 5-day cap"*) | **Default** for release gates and LLM-judge calibration |
| **Binary checklist (per criterion)** | High | High | Grading multi-part quality (correct, complete, cited, safe) |
| **3-point (`Fail` / `Partial` / `Pass`)** | Medium | Medium | Multi-part questions where partial credit matters |
| **1–5 Likert scale** | Low | Low | Early tone exploration; avoid for CI gates |
| **Pairwise comparison (A vs. B)** | Medium–High (lower when ties are allowed) | Medium | Picking the better of two prompt or model variants |

### 4.2 Example checklist rubric (RAG answer)

| Criterion | Pass condition | Example failure |
|---|---|---|
| **Correct** | No statement contradicts the reference answer or key facts | Gives the wrong hotel cap or cites last year's policy |
| **Complete** | Includes every critical key fact (paraphrasing is fine) | States vacation days carry over, but omits the 5-day cap |
| **Faithful (grounded)** | Every factual claim is supported by the retrieved context | Invents an exception rule not found in the chunks |
| **Cited** | Every factual claim cites the supporting chunk ID | Omits citations or cites an irrelevant chunk |
| **Abstention** | Abstains when context is missing; answers when context is present | Says *"I don't know"* when the answer is in chunk 2 |
| **Policy & RBAC** | Follows role permissions and scope boundaries | Leaks executive salary data to an `employee` role |

Define **Overall Pass** as passing all critical criteria (`Correct`, `Complete`, `Faithful`, and `Policy & RBAC`).

### 4.3 Rubrics for other eval types

| Eval type | What SMEs label | Key rubric rules |
|---|---|---|
| **Retrieval** | Relevance grade (`0–3`) per `(query, chunk)` pair | Define grades `0–3` with concrete examples; pool top-$k$ chunks from multiple retrievers |
| **Text-to-SQL** | `gold_sql`, `expected_result`, and `evidence` | Specify whether row order, extra columns, or floating-point rounding matter |
| **Tool calling** | `expected_tool_calls` and argument match rules | Specify when the agent must ask a clarifying question vs. use default arguments |
| **Trajectories** | Expected final state and forbidden actions | Grade final state separately from step efficiency; allow multiple valid paths |
| **Guardrails** | `block` / `allow` / `redact`, category, and severity | Write explicit rules for borderline benign requests that mention sensitive words |

---

## 5. Reference answers vs key facts lists

You can represent the expected answer as a free-form paragraph (`reference_answer`) or as a list of atomic claims (`key_facts`):

| Feature | Free-form `reference_answer` | Atomic `key_facts` list |
|---|---|---|
| **Example** | *"Full-time employees in Germany get 16 weeks of paid parental leave in addition to statutory Elternzeit."* | `["16 weeks paid parental leave", "applies to full-time employees in Germany", "in addition to statutory Elternzeit"]` |
| **Reviewer agreement** | Lower (reviewers debate whether two paragraphs mean the same thing) | **Higher** (checking whether each fact is present is nearly binary) |
| **Handles longer answers** | Poorly (extra helpful context lowers text-similarity scores) | **Well** (extra true context does not hurt fact recall) |
| **Debugging clarity** | Low (*"Similarity score was 0.71"*) | **High** (*"Missed key fact #2"*) |

**Best practice: store both.** Write a short 2–3 sentence `reference_answer` for human readers, and break it into 1–5 atomic `key_facts` marked `critical: true | false`:

```text
key_fact_recall      = (critical facts present in output) / (total critical facts)
contradiction_free   = output does not contradict any key fact or source chunk
answer_correct (bin) = (key_fact_recall == 1.0) AND contradiction_free
```

```json
{
  "id": "rag-fin-0019",
  "question": "What's the hotel nightly cap for business travel in London?",
  "reference_answer": "The nightly hotel cap in London is GBP 250 including taxes. Exceptions require director approval in advance.",
  "key_facts": [
    {"fact": "Nightly cap in London is GBP 250", "critical": true},
    {"fact": "Cap includes taxes", "critical": false},
    {"fact": "Exceptions require advance director approval", "critical": true}
  ],
  "supporting_chunks": {"0": ["fin-travel-emea#c12"], "1": ["fin-travel-emea#c12"], "2": ["fin-travel-emea#c14"]}
}
```

**How to write good key facts:**

- **Make each fact atomic:** Put *"GBP 250"* and *"includes taxes"* in separate facts.
- **Include scope qualifiers:** Keep the country, user role, or effective date attached to the number.
- **Link each fact to its chunk ID:** This gives you `reference_contexts` for Context Recall at the same time.

---

## 6. Handling "no answer" and unanswerable questions

If your dataset only contains answerable questions, you will never know if your assistant hallucinates when documents are missing. Include at least **10–15% unanswerable or partial questions**.

### 6.1 Taxonomy

| Category | Example prompt | Expected assistant behavior |
|---|---|---|
| **Missing from corpus** | *"Parental leave for contractors in Brazil?"* (no doc exists) | Abstain clearly and state that the docs do not cover Brazil contractors |
| **Partially answerable** | *"Leave policy in Germany and Brazil?"* (only Germany is in docs) | Answer the Germany part and explicitly state that Brazil is not covered |
| **False premise** | *"Why did Acme cancel the 4-day workweek?"* (never existed) | Correct the false premise instead of inventing a reason |
| **Ambiguous** | *"What is the nightly hotel cap?"* (varies by city) | Ask which city the user is traveling to |
| **Out of scope** | *"Write a poem about our CEO."* | Politely decline per scope policy |
| **Restricted (RBAC)** | An `employee` asks for executive bonus targets | Refuse access without leaking whether the document exists |
| **Future / unknown** | *"What will the 2027 bonus pool be?"* | State that 2027 figures are not published yet |

### 6.2 Labeling rules

1. Set `"answerable": false` (or `"partial"`) and set an explicit `"expected_behavior"` enum (`"abstain"`, `"clarify"`, `"correct_premise"`, `"refuse"`).
2. Write `"acceptable_response_notes"` stating what the assistant must not do (for example, *"Must NOT guess from the full-time employee policy"*).
3. **Verify against the actual corpus.** Search the corpus to confirm no document answers the question, and re-verify whenever new documents are indexed.

---

## 7. Inter-annotator agreement (IAA)

If two human experts cannot agree on whether an answer passes or fails, your rubric is unclear. The target is then ill-defined: an LLM judge may match one expert, but its agreement score against the "gold" labels means little.

**How to measure agreement:**

1. **Debug the rubric:** Have at least 2 reviewers independently grade an overlap batch of 30–50 items. Read every disagreement and fix the guidelines before you label the rest of the dataset.
2. **Certify the labels:** Before you use the labels for release gates, collect at least 100 overlap items. You can accumulate them across batches. Report the agreement with a 95% confidence interval (§7.6).

Why so many items? Agreement statistics are noisy on small samples. In the §7.2 example ($\kappa = 0.57$ on 100 items), the 95% bootstrap interval is about 0.40 to 0.73. On a 34-item subset, it widens to about 0.33 to 0.87. That range covers "fair" to "almost perfect".

### 7.1 Percent agreement (and why it's not enough)

Raw percent agreement is simply:

$$p_o = \frac{\text{items where reviewers agree}}{\text{total items}}$$

Why is raw agreement misleading? If 90% of system answers pass, two reviewers who blindly click "Pass" 90% of the time will agree **82% of the time by pure chance** ($0.90 \times 0.90 + 0.10 \times 0.10 = 0.82$). Always report a chance-corrected metric like **Cohen's $\kappa$** or **Krippendorff's $\alpha$**. But read §7.5 first: when one label dominates, chance correction has its own problem.

### 7.2 Cohen's kappa (two annotators, nominal labels)

Use **Cohen's $\kappa$** when two reviewers grade the same items:

$$\kappa = \frac{p_o - p_e}{1 - p_e}$$

Where $p_o$ is observed agreement and $p_e$ is the agreement expected by chance.

**Worked example:** Two SMEs (`A` and `B`) independently grade 100 RAG answers as `Pass` or `Fail`:

| | Reviewer B: `Pass` | Reviewer B: `Fail` | Total (A) |
|---|---|---|---|
| **Reviewer A: `Pass`** | 55 | 15 | 70 |
| **Reviewer A: `Fail`** | 5 | 25 | 30 |
| **Total (B)** | 60 | 40 | 100 |

1. **Observed agreement ($p_o$):** $(55 + 25) / 100 = 0.80$ (80%).
2. **Chance agreement ($p_e$):** $(0.70 \times 0.60) + (0.30 \times 0.40) = 0.42 + 0.12 = 0.54$.
3. **Cohen's $\kappa$:** $(0.80 - 0.54) / (1 - 0.54) = 0.26 / 0.46 \approx \mathbf{0.57}$.

Even though raw agreement looks high (80%), $\kappa = 0.57$ is only moderate. Notice that Reviewer A passed 15 items that Reviewer B failed. Reviewing those 15 disagreements together will immediately reveal which rule in your guideline needs tightening.

```python
def cohens_kappa(a: list[str], b: list[str]) -> float:
    assert len(a) == len(b) and a
    n = len(a)
    labels = set(a) | set(b)
    p_o = sum(x == y for x, y in zip(a, b)) / n
    p_e = sum((a.count(k) / n) * (b.count(k) / n) for k in labels)
    return 1.0 if p_e == 1 else (p_o - p_e) / (1 - p_e)
```

For graded scales (such as retrieval relevance `0–3`), use **weighted kappa** (`sklearn.metrics.cohen_kappa_score(..., weights="quadratic")`), which penalizes a `0 vs. 3` disagreement much more heavily than `2 vs. 3`.

### 7.3 Krippendorff's alpha (any number of annotators, missing data, any scale)

Use **Krippendorff's $\alpha$** when you have 3 or more reviewers or when not every reviewer grades every item:

$$\alpha = 1 - \frac{D_o}{D_e}$$

Where $D_o$ is observed disagreement and $D_e$ is disagreement expected by chance.

```python
from collections import Counter
from itertools import permutations

def krippendorff_alpha_nominal(items: list[list[str | None]]) -> float:
    o = Counter()
    for row in items:
        vals = [v for v in row if v is not None]
        m = len(vals)
        if m < 2:
            continue
        for i, j in permutations(range(m), 2):
            o[(vals[i], vals[j])] += 1 / (m - 1)
    cats = {c for pair in o for c in pair}
    n_c = {c: sum(v for (x, _), v in o.items() if x == c) for c in cats}
    n = sum(n_c.values())
    d_o = sum(v for (x, y), v in o.items() if x != y) / n
    d_e = sum(n_c[x] * n_c[y] for x in cats for y in cats if x != y) / (n * (n - 1))
    return 1.0 if d_e == 0 else 1 - d_o / d_e
```

This hand-rolled version handles nominal labels only. For other scales, use a library (below).

#### Ordinal and interval labels

For graded labels (such as relevance `0–3`), a `0 vs. 3` disagreement is worse than `2 vs. 3`. Use the ordinal or interval form of $\alpha$. The [`krippendorff`](https://github.com/pln-fing-udelar/fast-krippendorff) package takes a raters × items array, with `np.nan` for items a rater skipped:

```python
import numpy as np
import krippendorff

# rows = raters, columns = items; relevance grades 0-3; np.nan = rater skipped the item
grades = np.array([
    [3, 2, 0, 1, 3, 2, np.nan, 0],
    [3, 3, 0, 1, 2, 2, 1,      0],
    [2, 3, 1, np.nan, 3, 2, 1, 0],
])
print(round(krippendorff.alpha(reliability_data=grades, level_of_measurement="ordinal"), 3))
print(round(krippendorff.alpha(reliability_data=grades, level_of_measurement="nominal"), 3))
```

Here the ordinal $\alpha$ (0.85) is much higher than the nominal $\alpha$ (0.54), because most disagreements are one grade apart. Nominal $\alpha$ counts those as full disagreements.

#### Fleiss' kappa (three or more raters, complete data)

If every item gets the same number of raters, you can also use **Fleiss' $\kappa$** ([Fleiss, 1971](https://doi.org/10.1037/h0031619)). It extends chance-corrected agreement to more than two raters. Use $\alpha$ instead when some raters skip items.

```python
import numpy as np
from statsmodels.stats.inter_rater import aggregate_raters, fleiss_kappa

# rows = items, columns = 3 raters; every rater labels every item
labels = np.array([
    ["Pass", "Pass", "Pass"], ["Pass", "Fail", "Pass"], ["Fail", "Fail", "Fail"],
    ["Pass", "Pass", "Fail"], ["Fail", "Fail", "Pass"], ["Pass", "Pass", "Pass"],
    ["Fail", "Fail", "Fail"], ["Pass", "Pass", "Pass"],
])
counts, categories = aggregate_raters(labels)   # items x categories count table
print(categories, round(fleiss_kappa(counts, method="fleiss"), 3))
```

### 7.4 Interpreting agreement

Many teams describe $\kappa$ with the bands from [Landis & Koch (1977)](https://doi.org/10.2307/2529310). These labels are a convention, not a statistical test. Landis and Koch called them arbitrary.

| $\kappa$ | Conventional label (Landis & Koch) |
|---|---|
| $< 0$ | Poor |
| $0.00 – 0.20$ | Slight |
| $0.21 – 0.40$ | Fair |
| $0.41 – 0.60$ | Moderate |
| $0.61 – 0.80$ | Substantial |
| $0.81 – 1.00$ | Almost perfect |

For $\alpha$, Krippendorff recommends stricter cut-offs: rely on data with $\alpha \ge 0.80$, use data with $0.667 \le \alpha < 0.80$ only for tentative conclusions, and discard data below 0.667 (Krippendorff, *Content Analysis*, 2004; see also [Hayes & Krippendorff, 2007](https://doi.org/10.1080/19312450709336664)).

Use these starting rules of thumb for $\kappa$ or $\alpha$, and calibrate them for your domain:

| Result on the overlap batch | Action |
|---|---|
| **Below 0.667** | Stop labeling. Your rubric is ambiguous; rewrite the decision rules and run a new overlap batch. |
| **0.667 – 0.80** | Adjudicate disagreements and tighten boundary rules. Use the labels for directional evals only. |
| **Point estimate $\ge 0.80$ and lower 95% bound $\ge 0.667$** | Ready for release gates and for validating LLM judges. |

Also check the per-class numbers in §7.5. A high $\kappa$ can hide poor agreement on the rare class.

> **Note:** This bar is for **human-vs-human** agreement on gold labels. The bar for an **LLM judge** is different: you compare the judge with adjudicated gold labels and require TPR and TNR ≥ 0.85 and $\kappa \ge 0.60$ on ≥100 items (see §7.7).

### 7.5 The prevalence paradox: when κ is low but agreement is high

When one label dominates, $\kappa$ can be low even when raw agreement is very high. This is the **prevalence paradox** ([Feinstein & Cicchetti, 1990](https://doi.org/10.1016/0895-4356%2890%2990158-L)). RAG pass rates are often 85–95%, so this happens often.

Report these statistics next to $\kappa$:

- **Raw agreement** $p_o$.
- **PABAK** (prevalence-adjusted bias-adjusted kappa) $= 2p_o - 1$ for two categories ([Byrt, Bishop & Carlin, 1993](https://doi.org/10.1016/0895-4356%2893%2990018-V)).
- **Gwet's AC1**, which uses a chance term that stays small when one label dominates. For two categories, $p_e = 2\pi(1 - \pi)$, where $\pi$ is the mean share of `Pass` labels ([Gwet, 2008](https://doi.org/10.1348/000711006X126600)).
- **Positive and negative specific agreement**: how often the raters agree on `Pass` and on `Fail`, separately.

```python
def binary_agreement(a: list[str], b: list[str], pos: str = "Pass") -> dict:
    """Agreement statistics for two raters and two labels (pos / not pos)."""
    n = len(a)
    both_pos = sum(x == pos and y == pos for x, y in zip(a, b))
    both_neg = sum(x != pos and y != pos for x, y in zip(a, b))
    disagree = n - both_pos - both_neg
    p_o = (both_pos + both_neg) / n
    pa, pb = a.count(pos) / n, b.count(pos) / n
    p_e = pa * pb + (1 - pa) * (1 - pb)
    pi = (pa + pb) / 2                        # mean share of `pos` labels
    p_e_ac1 = 2 * pi * (1 - pi)               # Gwet's chance agreement, two categories
    return {
        "raw_agreement": p_o,
        "cohens_kappa": (p_o - p_e) / (1 - p_e) if p_e < 1 else 1.0,
        "pabak": 2 * p_o - 1,
        "gwet_ac1": (p_o - p_e_ac1) / (1 - p_e_ac1),
        "positive_agreement": 2 * both_pos / (2 * both_pos + disagree),
        "negative_agreement": 2 * both_neg / (2 * both_neg + disagree) if both_neg + disagree else float("nan"),
    }

# 100 answers: 88 both Pass, 4 + 4 disagreements, 4 both Fail
a = ["Pass"] * 88 + ["Pass"] * 4 + ["Fail"] * 4 + ["Fail"] * 4
b = ["Pass"] * 88 + ["Fail"] * 4 + ["Pass"] * 4 + ["Fail"] * 4
for k, v in binary_agreement(a, b).items():
    print(f"{k:20s} {v:.2f}")
```

```text
raw_agreement        0.92
cohens_kappa         0.46
pabak                0.84
gwet_ac1             0.91
positive_agreement   0.96
negative_agreement   0.50
```

Raw agreement (92%) and AC1 (0.91) look excellent, and $\kappa$ (0.46) looks poor. The specific agreement explains the gap. The reviewers agree on `Pass` 96% of the time but on `Fail` only 50% of the time. For an eval, the FAILs are what matter, so here $\kappa$ points to a real problem. Do not just switch to AC1 to get a better number.

**Practical fix:** Enrich the overlap batch with likely failures (low judge scores, negative feedback) so that both labels have enough examples. Report that you enriched it.

### 7.6 Confidence intervals for agreement

Report every agreement statistic with a 95% confidence interval. A percentile bootstrap over items works for any statistic in this section:

```python
import random

def bootstrap_ci(a: list, b: list, stat, iters: int = 2000, seed: int = 0) -> tuple[float, float]:
    """95% percentile bootstrap CI for an agreement statistic; resample items, not labels."""
    rng = random.Random(seed)
    n, vals = len(a), []
    for _ in range(iters):
        idx = [rng.randrange(n) for _ in range(n)]
        try:
            vals.append(stat([a[i] for i in idx], [b[i] for i in idx]))
        except ZeroDivisionError:   # a resample where both raters used one label only
            continue
    vals.sort()
    return vals[int(0.025 * len(vals))], vals[int(0.975 * len(vals)) - 1]
```

Call it as `bootstrap_ci(a, b, cohens_kappa)`. For $\alpha$, the [Hayes & Krippendorff (2007)](https://doi.org/10.1080/19312450709336664) macro gives bootstrap intervals. You can also resample items (columns of the raters × items array) with the same loop.

### 7.7 Human-vs-judge agreement

When you validate an LLM judge, compare it with **adjudicated** gold labels, not with a single reviewer. Report the judge's **TPR** (share of human PASSes that the judge passes) and **TNR** (share of human FAILs that the judge fails) separately, plus $\kappa$. A single agreement number hides whether the judge misses failures or raises false alarms. The canonical bar (starting rule of thumb) is ≥100 labelled items with 30–50 FAILs, TPR and TNR ≥ 0.85, and $\kappa \ge 0.60$ on a held-out split (≥ 0.90 for high-risk slices: Tier 3 actions, text-to-SQL correctness, and safety). Re-validate after any change to the judge prompt or model. See [LLM-as-a-Judge](../02-offline-evals/07-llm-as-a-judge.md) for the full method, including how to correct pass rates for judge error.

---

## 8. Adjudication

Adjudication is the step where your principal domain expert resolves reviewer disagreements and updates the annotation guidelines:

```mermaid
flowchart TD
    A["Batch of items"] --> B["Two annotators label independently"]
    B --> C{"Agree?"}
    C -->|yes| D["Accept label"]
    C -->|no| E["Adjudicator reviews both labels and rationales"]
    E --> F{"Root cause"}
    F -->|"annotator error"| G["Correct label"]
    F -->|"guideline gap"| H["Update guideline + changelog"]
    F -->|"item is ambiguous"| I["Rewrite item or mark ambiguous and exclude from gates"]
    F -->|"docs are wrong or stale"| J["Flag to doc owner; label against current docs"]
    G --> D
    H --> D
    I --> D
    J --> D
    D --> K["Recompute agreement on next overlap batch"]
```

**Three rules for adjudication:**

1. **Keep first-pass labeling blind.** Reviewers must not see each other's grades before submitting.
2. **Never majority-vote away expert knowledge.** If two junior reviewers outvote your senior HR policy owner on an HR rule, trust the policy owner and update the guideline.
3. **Save adjudicated items as LLM-judge few-shot examples.** Hard boundary cases that required human adjudication make the best teaching examples for your automated judge. Keep them out of the judge's test split.

### 8.1 Finding label errors in the gold set

Gold labels also contain errors. [Northcutt et al. (2021)](https://arxiv.org/abs/2103.14749) estimated that at least 3.3% of test-set labels, on average, are wrong across 10 widely used ML benchmarks. A wrong gold label penalizes a correct system on every run.

Audit the gold set on a schedule:

- **Review rows where the system and a strong judge both disagree with the gold label.** If both say "Pass" and the label says "Fail", the label is often wrong. Send these rows back to adjudication. Do not flip them automatically.
- **Review rows that fail across many system versions.** A row that every prompt and model fails can be a hard case, or a wrong reference.
- **Use confident learning for large classified sets.** For guardrail or routing labels with a trained classifier, [confident learning](https://arxiv.org/abs/1911.00068) (implemented in [cleanlab](https://github.com/cleanlab/cleanlab)) ranks the examples most likely to be mislabeled.
- **Record each correction** in the dataset changelog with the reason, and bump the dataset version.

---

## 9. Labeling tools

Pick the simplest tool that displays the question, retrieved chunks, tool calls, and final answer on a single screen:

| Tool | Category | Best when… |
|---|---|---|
| **Spreadsheet / Google Sheet** | Ad-hoc | Labeling your first 20–100 rows with SMEs who do not want to learn a new tool |
| **Custom lightweight viewer** (Streamlit / Gradio / internal page) | Custom | You want to render citations, SQL tables, and agent steps exactly the way your SMEs work |
| **[Argilla](https://docs.argilla.io/)** | Open-source annotation app | You need multi-annotator workflows and agreement tracking |
| **[Label Studio](https://labelstud.io/)** | Open-source annotation app | You need customizable labeling forms and self-hosting |
| **[LangSmith Annotation Queues](https://docs.langchain.com/langsmith/annotation-queues)** | Observability platform | You already log traces in LangSmith and want 1-click promotion to datasets |
| **[Langfuse Annotation Queues](https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues)** | Open-source observability | You already log traces in Langfuse and want inline trace scoring |

---

## 10. Cost and time planning

Use these starting estimates to plan SME sessions (measure your own speed in session 1):

| Labeling task | Typical time per row | How to speed it up |
|---|---|---|
| **Verify/edit a pre-filled RAG answer + key facts** | 1–5 min | Pre-fill with your system's output and show source chunks inline |
| **Write a reference answer from scratch** | 5–15 min | Avoid when possible; always pre-fill a draft first |
| **Grade relevance (`0–3`) for top-10 chunks** | 2–5 min | Highlight query keywords in the chunk preview |
| **Write gold SQL + verify query result** | 5–30 min | Have an LLM draft candidate SQL first; let the data engineer fix it |
| **Grade a system output (`Pass`/`Fail` + note)** | 0.5–3 min | Keep the rubric binary |
| **Review a multi-step agent trajectory** | 5–20 min | Collapse boilerplate JSON logs in the trace viewer |

**Sample budget for a 200-row Golden RAG dataset:**

- 200 pre-filled rows × 3 minutes = **10 SME hours**
- 50% double-annotated overlap (100 rows, enough to certify agreement, §7) = **+5 SME hours**
- Adjudication + guideline calibration = **+5 SME hours**
- **Total:** **~20 SME hours** spread across a few 1-hour sessions.

---

## 11. Pitfalls

| Pitfall | What goes wrong | How to prevent it |
|---|---|---|
| **SMEs write clean "textbook" questions** | Your golden set is polite and easy, while real users type `"vpn broke again??"` | Mix real support tickets and production queries into SME batches |
| **SMEs grade using unwritten tribal knowledge** | The system fails for not knowing a rule that isn't in any document | Instruct SMEs to grade strictly against the documents and flag `docs_outdated` separately |
| **Stale golden answers after policy updates** | A policy update silently turns right answers into "failures" | Record `doc_versions` on every row and flag rows when source docs change ([Production Data Flywheel §8](./04-production-data-flywheel.md#8-keeping-datasets-fresh-docs-drift)) |
| **Data leakage into prompts or training sets** | Engineers paste golden examples into few-shot prompts, inflating scores | Keep a locked held-out split and check prompts against eval IDs in CI |
| **Eval FAQ gets indexed into the vector DB** | The retriever finds your answer key document during tests | Exclude test files and eval folders from your document ingestion pipeline |
| **No dataset owner** | The golden dataset rots within 3 months | Assign a named owner and review cadence ([Production Data Flywheel §10](./04-production-data-flywheel.md#10-ownership-and-governance)) |

---

## 12. Golden dataset checklist

- [ ] Row schema matches your target eval types ([Dataset Strategy §3](./01-dataset-strategy.md#3-matching-dataset-shape-to-eval-type)).
- [ ] Slice coverage plan is agreed upon with your principal domain expert.
- [ ] Written annotation guidelines include operational definitions and boundary examples.
- [ ] Rubric uses binary Pass/Fail checks per criterion.
- [ ] RAG rows store both a `reference_answer` and source-linked `key_facts`.
- [ ] Unanswerable, partial, and ambiguous rows specify `expected_behavior`.
- [ ] Rubric debugged on a 30–50 item overlap batch; then ≥100 overlap items (accumulated across batches) reached $\kappa$ or $\alpha \ge 0.80$ with a lower 95% bound $\ge 0.667$.
- [ ] With skewed labels, raw agreement, Gwet's AC1, and agreement on FAILs are reported next to $\kappa$.
- [ ] Gold labels are audited for errors on a schedule (§8.1).
- [ ] Every row records `doc_versions`, `created_by`, and `label_tier: "gold"`.
- [ ] Held-out test rows are blocked from being used in prompts or fine-tuning.

---

## Key takeaways

- **Small, high-quality golden datasets anchor your entire eval system.** 100–300 expert-verified rows are enough to gate releases. Validating an LLM judge needs ≥100 human-labelled outputs, including 30–50 FAILs.
- **Pre-fill drafts and show sources inline** to respect SME time.
- **Use binary Pass/Fail criteria and atomic `key_facts` lists** instead of 1–5 scales.
- **Measure reviewer agreement ($\kappa$ or $\alpha$) early, with a confidence interval.** Low agreement means your rubric is ambiguous, not that your reviewers are careless. Certify gate labels on ≥100 overlap items.
- **Treat Landis & Koch bands as a convention.** When most answers pass, also report raw agreement, Gwet's AC1, and agreement on FAILs.
- **Audit gold labels for errors.** Rows where the system and a strong judge both disagree with the label are the first place to look.

## Further reading

- Hamel Husain, [Creating a LLM-as-a-Judge That Drives Business Results](https://hamel.dev/blog/posts/llm-judge/)
- Shankar et al., [Who Validates the Validators? Aligning LLM-Assisted Evaluation of LLM Outputs with Human Preferences](https://arxiv.org/abs/2404.12272)
- Krippendorff's alpha guide: [k-alpha.org](https://www.k-alpha.org/)
- Landis & Koch, [The Measurement of Observer Agreement for Categorical Data](https://doi.org/10.2307/2529310) (1977)
- Hayes & Krippendorff, [Answering the Call for a Standard Reliability Measure for Coding Data](https://doi.org/10.1080/19312450709336664) (2007)
- Feinstein & Cicchetti, [High Agreement but Low Kappa: I. The Problems of Two Paradoxes](https://doi.org/10.1016/0895-4356%2890%2990158-L) (1990)
- Gwet, [Computing Inter-Rater Reliability and Its Variance in the Presence of High Agreement](https://doi.org/10.1348/000711006X126600) (2008)
- Northcutt et al., [Pervasive Label Errors in Test Sets Destabilize Machine Learning Benchmarks](https://arxiv.org/abs/2103.14749) (2021)
- **Next in this section:**
    - [Synthetic Datasets](./03-synthetic-datasets.md)
    - [Production Data Flywheel](./04-production-data-flywheel.md)
