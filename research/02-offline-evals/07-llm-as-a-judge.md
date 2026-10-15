# LLM-as-a-Judge

> **TL;DR** — An LLM judge is a *measurement instrument*, and an uncalibrated instrument produces confident nonsense. Use code when a check is verifiable, humans to define "good" and label a calibration set, and LLM judges to scale the human judgment in between. Prefer narrow, binary, rubric-driven judges with reasoning-before-verdict and structured output; measure their TPR/TNR against human labels before trusting any number they produce, correct pass rates for known judge error, and version the judge like code.

**You'll learn:** when to use a judge vs code vs humans · pointwise vs pairwise vs reference-guided judging · why binary beats Likert · rubric and prompt design (with a template) · known judge biases and mitigations · how to align and validate a judge against human labels (critique shadowing, EvalGen, TPR/TNR, Cohen's κ) · how to correct pass-rate estimates for judge error · G-Eval, small fine-tuned judges, panels of judges · judge versioning
 ·  **Prerequisites:** [Evals & guardrails map](../00-foundations/02-the-evals-and-guardrails-map.md), [SME golden datasets](../01-datasets/02-sme-golden-datasets.md)
 ·  **Related:** [End-to-end RAG evals](./01-end-to-end-rag-evals.md), [Instruction & citation adherence](./06-instruction-and-citation-adherence.md), [Running offline experiments](./08-running-offline-experiments.md), [Online evals](../03-online-evals-and-observability/01-online-evals.md)

---

## 1. Code vs judge vs human: who should grade what?

Most RAG metrics you'll meet — faithfulness, answer relevancy, context precision, answer correctness against a reference — are LLM judges under the hood (see [End-to-end RAG evals](./01-end-to-end-rag-evals.md)). That makes judge quality a first-order concern for the whole eval program.

```mermaid
flowchart TD
    A["New criterion to evaluate"] --> B{"Can code check it exactly? regex, schema, SQL result, ID lookup"}
    B -->|Yes| C["Use code. Free, exact, reproducible"]
    B -->|No| D{"Do humans agree on what good looks like?"}
    D -->|No| E["Clarify the criterion with SMEs first. Error analysis, examples, definitions"]
    E --> D
    D -->|Yes| F{"Volume or frequency needs automation?"}
    F -->|No| G["Human review. Small sets, high stakes, launch reviews"]
    F -->|Yes| H["LLM judge, validated against human labels"]
    H --> I{"Judge agrees with humans well enough?"}
    I -->|No| J["Fix rubric, add examples, split criterion, change model"]
    J --> H
    I -->|Yes| K["Deploy judge offline and on sampled online traffic. Keep auditing"]
```

| Grader | Strengths | Weaknesses | Use for |
|---|---|---|---|
| **Code** | Free, deterministic, exact, can block | Only verifiable properties | Format, schema, citations exist, SQL execution match, length, keywords, tool-call args |
| **LLM judge** | Scales semantic judgments, cheap relative to humans, gives rationales | Biased, noisy, drifts with model updates, must be validated | Faithfulness, relevance, tone, policy, instruction adherence, equivalence |
| **Small fine-tuned judge / classifier** | Cheap, fast, can run inline as a guardrail | Narrow; may not transfer to your domain | Hallucination/NLI checks, toxicity, PII, prompt injection |
| **Human (SME)** | Defines ground truth, catches unknown unknowns | Slow, expensive, inconsistent without guidelines | Defining criteria, labelling calibration sets, error analysis, high-stakes sign-off |

**Order of operations (opinionated):** do error analysis on real traces *before* building judges (see [Production data flywheel](../01-datasets/04-production-data-flywheel.md)). Build judges only for failure modes you've actually observed and care about. A judge for a failure that never happens is cost with no signal.

---

## 2. Judge formats

| Format | Question asked | Needs reference? | Pros | Cons | Typical use |
|---|---|---|---|---|---|
| **Pointwise, reference-free** | "Does this response satisfy criterion X?" | No | Works on production traffic; simple | Judge must know what "correct" is — weak for factual correctness | Faithfulness to context, tone, policy, relevance |
| **Pointwise, reference-guided** | "Does this response match the reference on the key facts?" | Yes (gold answer / key facts) | Much more reliable for correctness, math, domain facts | Needs gold data; penalizes valid alternatives if rubric is strict | Answer correctness on golden datasets |
| **Pairwise** | "Which of A and B is better on X?" | Optional | Easier, more consistent than absolute scores; great for A/B of prompts/models | Position bias; doesn't tell you if *either* is good; O(n²) for many systems | Comparing variants, preference data, model selection |
| **Rubric / checklist** | "Which of these N binary requirements are met?" | Optional | Diagnostic; maps to fixes | More calls or longer prompts | Instruction adherence, completeness |

**Defaults (heuristic):**

- Golden dataset with reference answers → **reference-guided pointwise, binary**.
- Production traffic, no reference → **reference-free pointwise, binary**, on narrow criteria (faithfulness to retrieved context, policy, refusal correctness).
- Choosing between two prompts/models → **pairwise with position swap**, *plus* pointwise pass rates (so you know if the winner is actually good).

---

## 3. Binary pass/fail over Likert scales

Prefer **binary pass/fail per criterion** to 1–5 or 1–10 scales. Rationale, as argued by practitioners such as [Hamel Husain](https://hamel.dev/blog/posts/llm-judge/) and in [Eugene Yan's survey of LLM-evaluators](https://eugeneyan.com/writing/llm-evaluators/):

| Problem with Likert | Why binary helps |
|---|---|
| Nobody can define the difference between a 3 and a 4; humans and judges disagree on the middle | A pass/fail definition forces you to decide what "good enough to ship" means |
| Scores cluster (judges love 4/5); averages move by 0.1 and nobody knows if that matters | Pass rate is interpretable: "92% of answers were faithful" |
| Hard to validate: agreement on a 5-point scale is murky | Binary maps to a confusion matrix → TPR, TNR, κ |
| Not actionable: "tone = 3.7" | A failed item + rationale points at a fix |
| Multi-dimension averages hide failures | Separate binary criteria stay separate |

When you need gradations, use **several binary criteria** (e.g. "states the PTO amount correctly", "mentions the carry-over limit", "cites the policy") and report the count or per-criterion rates. Reserve continuous scores for **ranking** use cases (e.g. G-Eval-style probability-weighted scores, §6) where only the ordering matters.

---

## 4. Designing the judge: rubric and prompt

### 4.1 Principles

1. **One criterion per judge.** "Is it faithful, relevant, concise and polite?" → four judges (or a rubric with four separately-reported binary items). Mixed criteria produce mixed verdicts.
2. **Define pass and fail in operational terms**, using your domain's language. "Faithful" → "Every factual statement (numbers, dates, names, policy rules) is supported by the CONTEXT. Paraphrase is fine. Adding a specific not in the context is a FAIL, even if true."
3. **Reasoning before verdict.** Ask for the reasoning/critique first, then the verdict, in a structured output. Asking for the verdict first lets the model rationalize after the fact. (Chain-of-thought for evaluation is also the core of G-Eval, §6.)
4. **Few-shot examples, including borderline ones.** 2–6 labelled examples with critiques written by your domain expert, covering a clear pass, a clear fail, and the tricky boundary cases you found in error analysis. The critiques teach the judge your standards.
5. **Allow "not applicable"** where the criterion may not apply (e.g. "cites sources" on a greeting).
6. **Structured output.** JSON with a fixed schema (`reasoning`, `verdict` enum). Parse strictly; treat parse failures as errors, not passes.
7. **Give the judge only what it needs.** For faithfulness: context + answer (the question is optional). Extra material invites distraction and costs tokens.
8. **Deterministic-ish settings.** Temperature 0 (or low), pinned model snapshot. Note that even at temperature 0 outputs aren't guaranteed identical across calls.
9. **Hide identity.** Don't tell the judge which model or variant produced the output; in pairwise, randomize labels.
10. **Pre-compute what code can compute.** If a claim extraction step or SQL execution result is available, pass it in rather than asking the judge to infer it.

### 4.2 Template judge prompt (reference-free, binary, faithfulness)

```text
SYSTEM:
You are an exacting reviewer for an internal enterprise assistant. You evaluate ONE criterion.

CRITERION — Faithfulness to retrieved context
PASS if every factual statement in the RESPONSE is supported by the CONTEXT.
  - Paraphrases and summaries of the context are fine.
  - Statements that are clearly non-factual (greetings, offers to help, questions) are ignored.
  - If the response says the information is not available AND the context indeed lacks it, that is a PASS.
FAIL if ANY factual statement:
  - adds a specific (number, date, name, condition, scope) not present in the context, OR
  - contradicts the context, OR
  - overgeneralizes (e.g. context says "EU employees", response says "all employees").
Being true in the real world does NOT make an unsupported statement pass.

EXAMPLES
<example>
CONTEXT: [hr-31] Unused PTO up to 5 days may be carried over to the next year.
RESPONSE: You can carry over up to 5 unused PTO days into next year.
CRITIQUE: The single claim matches hr-31 exactly (5 days, next year).
VERDICT: PASS
</example>
<example>
CONTEXT: [hr-31] Unused PTO up to 5 days may be carried over to the next year.
RESPONSE: You can carry over up to 5 unused days, but they expire at the end of March.
CRITIQUE: The 5-day carry-over is supported. The March expiry is not in the context — added specific.
VERDICT: FAIL
</example>
<example>
CONTEXT: [it-04] Contractors must use the guest VPN profile.
RESPONSE: Hi! I couldn't find anything about laptop refresh cycles in the documents I can access. Want me to open an IT ticket?
CRITIQUE: The only factual statement (information not found) is consistent with the context, which does not cover laptop refresh cycles.
VERDICT: PASS
</example>

USER:
CONTEXT:
{retrieved_passages_with_ids}

RESPONSE:
{assistant_response}

Think step by step: list each factual statement in the RESPONSE and whether the CONTEXT supports it.
Then return ONLY this JSON:
{"statements": [{"text": "...", "supported": true|false, "evidence_id": "...|null"}],
 "critique": "<one or two sentences>",
 "verdict": "PASS" | "FAIL"}
```

### 4.3 Calling a judge (framework-agnostic skeleton)

```python
import json
from dataclasses import dataclass

@dataclass(frozen=True)
class JudgeConfig:
    name: str            # e.g. "faithfulness"
    version: str         # bump on ANY change to prompt, examples, model, or params
    model: str           # pinned snapshot, not a floating alias
    temperature: float = 0.0

def call_llm(model: str, prompt: str, temperature: float) -> str:
    raise NotImplementedError("wire to your provider; request JSON / structured output if supported")

def run_judge(cfg: JudgeConfig, prompt_template: str, **fields) -> dict:
    raw = call_llm(cfg.model, prompt_template.format(**fields), cfg.temperature)
    try:
        out = json.loads(raw)
        verdict = out["verdict"].upper()
        assert verdict in {"PASS", "FAIL", "N/A"}
    except Exception as e:  # never silently count a broken judgment as a pass
        return {"verdict": "ERROR", "error": repr(e), "raw": raw, "judge": f"{cfg.name}@{cfg.version}"}
    return {"verdict": verdict, "critique": out.get("critique"), "judge": f"{cfg.name}@{cfg.version}"}
```

(If you use `str.format`, escape literal braces in the template as `{{ }}`; many teams use Jinja or f-strings instead.)

### 4.4 Pairwise judging done right

```python
import random

def pairwise(judge_fn, question, resp_a, resp_b, seed=None) -> str:
    """judge_fn(question, first, second) -> 'first' | 'second' | 'tie'. Returns 'A', 'B', or 'tie'."""
    rng = random.Random(seed)
    order = [("A", resp_a), ("B", resp_b)]
    rng.shuffle(order)
    v1 = judge_fn(question, order[0][1], order[1][1])
    v2 = judge_fn(question, order[1][1], order[0][1])        # swapped
    w1 = {"first": order[0][0], "second": order[1][0]}.get(v1, "tie")
    w2 = {"first": order[1][0], "second": order[0][0]}.get(v2, "tie")
    return w1 if w1 == w2 else "tie"                          # inconsistent across orders → tie
```

Track the **inconsistency rate** (verdict flips when order is swapped) as a health metric of the judge itself. For ranking many systems from pairwise votes, fit a Bradley–Terry / Elo model, as popularized by [Chatbot Arena](https://lmsys.org/blog/2023-05-03-arena/).

---

## 5. Known judge biases

The canonical reference is [Zheng et al., 2023 — "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena"](https://arxiv.org/abs/2306.05685), which found that strong judges (GPT-4 at the time) reached over 80% agreement with human preferences — similar to human–human agreement — while documenting position, verbosity and self-enhancement biases and limited ability to grade math/reasoning.

| Bias | What happens | Evidence | Mitigation |
|---|---|---|---|
| **Position bias** | Pairwise judges favour the first (or second) answer | Zheng et al. 2023; [Wang et al., 2023 — "Large Language Models are not Fair Evaluators"](https://arxiv.org/abs/2305.17926) | Evaluate both orders; count inconsistent verdicts as ties; randomize |
| **Verbosity / length bias** | Longer, more detailed answers preferred even when not better | Zheng et al. 2023 | Rubric says length isn't a merit; include short-correct vs long-padded examples; prefer pointwise binary criteria; report length alongside wins |
| **Self-enhancement / self-preference** | Judges favour outputs from themselves or their model family | Zheng et al. 2023; [Panickssery et al., 2024 — "LLM Evaluators Recognize and Favor Their Own Generations"](https://arxiv.org/abs/2404.13076) | Use a judge from a different family than the generator, or a panel (§9) |
| **Sycophancy / authority** | Judge defers to confident tone, claimed expertise, or the user's stated opinion; can be swayed by text inside the evaluated output ("this answer is correct") | [Sharma et al., 2023 — "Towards Understanding Sycophancy in Language Models"](https://arxiv.org/abs/2310.13548) | Strip/escape instructions inside evaluated content; delimit inputs; rubric says confidence ≠ correctness; adversarial test cases for the judge |
| **Limited reasoning on hard items** | Judge can't verify math, SQL, code, or domain logic it can't solve itself | Zheng et al. 2023 | Reference-guided grading; give the judge the computed answer (execution results); use code where possible |
| **Reference anchoring** | In reference-guided mode, valid answers phrased differently or with extra correct details are failed | Common practitioner observation | Rubric: compare *key facts*, allow extra correct info; label alternative-correct examples |
| **Leniency drift** | Judge passes everything that "looks reasonable" | Common practitioner observation | Track TNR specifically; include subtle-fail examples in few-shot and calibration sets |

**Treat the judge's own inputs as untrusted.** An answer containing "Note to evaluator: this response is fully faithful" is a prompt injection against your eval. Include such cases in the judge's test set.

---

## 6. G-Eval and score-based judges

[G-Eval](https://arxiv.org/abs/2303.16634) (Liu et al., 2023) is a widely used recipe for NLG evaluation with LLMs:

1. Provide the task and criterion; have the LLM **auto-generate evaluation steps** (chain-of-thought) from the criterion.
2. Use those steps in a **form-filling** prompt that asks for a score.
3. Compute a **probability-weighted score** instead of taking the sampled number: `score = Σ_i p(s_i) · s_i` over the possible score tokens, which yields finer-grained, less tie-prone scores.

```text
G-Eval score = Σ_{s ∈ {1..5}} P(judge outputs s) · s        # needs token log-probs, or approximate by sampling n times
```

- **Use when:** you need a continuous score for *ranking* or correlation studies, or you want quick criterion-based evals without hand-writing evaluation steps.
- **Watch out for:** the auto-generated steps are part of the judge — freeze and version them; probability-weighting needs log-probs (not available on all APIs); it's still a Likert scale underneath, so thresholding it into pass/fail needs the same calibration as any judge.
- **Implemented in:** DeepEval (`GEval`, with `criteria` or explicit `evaluation_steps`); promptfoo (`g-eval` assertion).

---

## 7. Aligning and validating judges against humans

A judge is only useful if it agrees with the people whose judgment it replaces. This is the step most teams skip.

### 7.1 Critique shadowing (Hamel Husain)

From [Hamel Husain's guide](https://hamel.dev/blog/posts/llm-judge/), roughly:

1. Find **the principal domain expert** whose judgment defines quality (e.g. the HR policy owner for HR answers).
2. Build a diverse dataset of real or realistic interactions (vary features, scenarios, personas).
3. Have the expert give **pass/fail + a written critique** explaining why — detailed enough to use as a few-shot example.
4. Fix obvious errors found along the way (error analysis often surfaces product bugs before you even have a judge).
5. Build the judge using the expert's critiques as few-shot examples.
6. Measure agreement with the expert; iterate on the prompt (and the examples) until agreement is acceptable.
7. Continue: re-sample, re-label, re-check periodically; the expert's standards and your product will drift.

### 7.2 Criteria drift (EvalGen — Shankar et al.)

[Who Validates the Validators? (Shankar et al., 2024)](https://arxiv.org/abs/2404.12272) introduces EvalGen, a mixed-initiative tool where an LLM proposes criteria and candidate evaluators, and users grade outputs to select the evaluators that best align. A key finding is **criteria drift**: people *refine their criteria while grading outputs* — you can't fully specify the rubric up front. Practical implications:

- Expect to rewrite the rubric after labelling the first 30–50 examples. That's normal, not failure.
- Re-label earlier examples after the rubric changes.
- Keep humans in the loop on a continuing sample even after the judge "works".

### 7.3 Agreement metrics

Treat human labels as ground truth and the judge as a classifier. With PASS as the positive class:

```text
TPR (sensitivity) = judge PASS ∧ human PASS / human PASS      # good answers correctly passed
TNR (specificity) = judge FAIL ∧ human FAIL / human FAIL      # bad answers correctly failed ← usually the one that's too low
Precision (PASS)  = judge PASS ∧ human PASS / judge PASS
Raw agreement     = (TP + TN) / N                              # misleading under class imbalance
Cohen's κ         = (p_o − p_e) / (1 − p_e)                    # agreement corrected for chance
```

**Why not just raw agreement?** If 90% of answers are good, a judge that always says PASS has 90% agreement and is useless (TNR = 0, κ = 0). Report **TPR and TNR separately**; for most eval purposes the failure-detection side (TNR, or recall on FAIL) is what matters.

**Starting thresholds (heuristic, adjust to stakes):** TPR and TNR both ≥ ~0.85–0.9 on a held-out labelled set, κ ≥ ~0.6 ("substantial" on the commonly used Landis & Koch scale). Compare against **human–human agreement** on the same items: if two SMEs only agree 80% of the time, demanding 95% from the judge is unrealistic — and a sign the criterion needs sharpening.

**Avoid overfitting the judge prompt.** Split your labelled data: a **dev** set you iterate the prompt on (and draw few-shot examples from) and a **test** set you only use to report final agreement. Few-shot examples must never appear in the test set.

```python
def judge_agreement(human: list[bool], judge: list[bool]) -> dict:
    """True = PASS. Lists aligned by item."""
    tp = sum(h and j for h, j in zip(human, judge))
    tn = sum((not h) and (not j) for h, j in zip(human, judge))
    fp = sum((not h) and j for h, j in zip(human, judge))
    fn = sum(h and (not j) for h, j in zip(human, judge))
    n = tp + tn + fp + fn
    p_o = (tp + tn) / n
    p_yes = ((tp + fp) / n) * ((tp + fn) / n)
    p_no = ((tn + fn) / n) * ((tn + fp) / n)
    p_e = p_yes + p_no
    return {
        "n": n, "tpr": tp / (tp + fn) if tp + fn else None, "tnr": tn / (tn + fp) if tn + fp else None,
        "precision_pass": tp / (tp + fp) if tp + fp else None,
        "raw_agreement": p_o, "cohens_kappa": (p_o - p_e) / (1 - p_e) if p_e < 1 else None,
    }

human = [True] * 80 + [False] * 20
judge = [True] * 76 + [False] * 4 + [True] * 6 + [False] * 14
judge_agreement(human, judge)
# tpr 0.95, tnr 0.70, raw_agreement 0.90, kappa ≈ 0.68 — high agreement hides that 30% of bad answers pass
```

### 7.4 How many labels?

Rough guidance (heuristic): **≥ 100 labelled items** for a first estimate, with **at least ~30–50 FAILs** — TNR is estimated only from human-FAIL items, so if failures are rare, oversample likely failures (e.g. low-confidence traces, thumbs-down) for the calibration set. Report confidence intervals: with 40 FAIL items, a measured TNR of 0.85 has a 95% interval spanning roughly ±0.1.

---

## 8. Correcting pass-rate estimates for judge error

If the judge has known TPR and TNR, its raw pass rate on a large unlabelled eval set is biased. You can correct it (this is the Rogan–Gladen estimator from epidemiology, applied to "pass" as the condition):

```text
observed_pass = TPR · θ + (1 − TNR) · (1 − θ)
⇒ θ̂ = (observed_pass + TNR − 1) / (TPR + TNR − 1)          clip to [0, 1]; requires TPR + TNR > 1
```

**Worked example:** judge says 80% of answers pass. On the labelled test set, TPR = 0.95, TNR = 0.70. Corrected true pass rate θ̂ = (0.80 + 0.70 − 1) / (0.95 + 0.70 − 1) = 0.50 / 0.65 ≈ **0.77**. The judge's leniency inflated the pass rate by ~3 points — and in a comparison between variants with different failure profiles, that bias need not cancel.

Uncertainty comes from both the eval set and the (smaller) labelled set; bootstrap both:

```python
import random

def corrected_pass_rate(judge_on_eval: list[bool], human_lbl: list[bool], judge_lbl: list[bool],
                        n_boot: int = 2000, seed: int = 0) -> dict:
    def estimate(je, hl, jl):
        pos = [j for h, j in zip(hl, jl) if h]
        neg = [not j for h, j in zip(hl, jl) if not h]
        if not pos or not neg:
            return None
        tpr, tnr = sum(pos) / len(pos), sum(neg) / len(neg)
        if tpr + tnr <= 1:
            return None
        obs = sum(je) / len(je)
        return min(1.0, max(0.0, (obs + tnr - 1) / (tpr + tnr - 1)))

    rng = random.Random(seed)
    point = estimate(judge_on_eval, human_lbl, judge_lbl)
    boots = []
    for _ in range(n_boot):
        je = [rng.choice(judge_on_eval) for _ in judge_on_eval]
        idx = [rng.randrange(len(human_lbl)) for _ in human_lbl]
        b = estimate(je, [human_lbl[i] for i in idx], [judge_lbl[i] for i in idx])
        if b is not None:
            boots.append(b)
    boots.sort()
    return {"corrected": point, "ci95": (boots[int(0.025 * len(boots))], boots[int(0.975 * len(boots)) - 1])}
```

When TPR + TNR is close to 1 the correction explodes — that's the math telling you the judge is barely better than chance. Fix the judge instead.

---

## 9. Choosing the judge model, cost, and alternatives

### 9.1 Model choice and cost

- **Develop** the judge with a strong frontier model; once validated, **try cheaper models** against the same labelled test set and keep the cheapest one that meets your agreement thresholds.
- **Different family than the generator** where practical (self-preference bias).
- **Pin snapshots.** A provider silently updating the model behind an alias changes your metric.
- **Cost model:** `cost ≈ N_items × N_criteria × N_repeats × (prompt_tokens × p_in + output_tokens × p_out)`. Few-shot examples and long contexts dominate prompt tokens — use prompt caching where your provider supports it, and batch APIs for offline runs.
- **Online:** judge a **sample** of production traffic (and 100% of flagged/negative-feedback traces); see [Online evals](../03-online-evals-and-observability/01-online-evals.md).

### 9.2 Small, fine-tuned judges

Open evaluator models trade generality for cost, latency and data control (useful when traces can't leave your environment):

| Model | What it is | Use for |
|---|---|---|
| [Prometheus](https://arxiv.org/abs/2310.08491) / [Prometheus 2](https://arxiv.org/abs/2405.01535) | Open LMs fine-tuned for rubric-based evaluation; Prometheus 2 supports both absolute (direct) grading and pairwise ranking ([prometheus-eval](https://github.com/prometheus-eval/prometheus-eval)) | Custom-rubric grading without a proprietary judge |
| [Lynx](https://arxiv.org/abs/2407.08488) (Patronus AI) | Open hallucination-detection model for RAG (is the answer faithful to the context?), released with the HaluBench benchmark | Faithfulness checks at scale, self-hosted |
| [Glider](https://arxiv.org/abs/2412.14140) (Patronus AI) | Small general-purpose evaluator that grades against user-defined criteria with explainable reasoning ([model card](https://huggingface.co/PatronusAI/glider)) | Cheap rubric-based judging |
| [Vectara HHEM](https://huggingface.co/vectara/hallucination_evaluation_model) | Small cross-encoder-style hallucination evaluation model scoring whether a hypothesis is supported by a premise | Fast faithfulness/NLI-style checks, guardrails |

Validate these against **your** labelled data exactly like a prompted judge — public benchmark numbers don't transfer to your domain.

### 9.3 Panels of judges (juries)

[Verga et al., 2024 — "Replacing Judges with Juries" (PoLL)](https://arxiv.org/abs/2404.18796) proposes a **Panel of LLM evaluators** composed of several smaller models from different families, aggregated by voting/pooling. They report better correlation with human judgments than a single large judge, less intra-model bias, and lower cost.

Practical uses:

- **High-stakes criteria** (policy, safety): majority vote of 3 judges from different families.
- **Disagreement as a signal:** items where judges split go to human review — they're often the most informative examples for your calibration set.
- Validate the **aggregate** (the vote), not just each member.

---

## 10. Judge versioning and lifecycle

A judge is code + a model + data. Changing any of them changes the metric.

- [ ] Version identifier per judge (`faithfulness@v7`) covering: prompt text, few-shot examples, model snapshot, temperature/params, output parser, and any pre-processing (claim splitting).
- [ ] Store the judge version **with every score** in your experiment tracker (see [Running offline experiments](./08-running-offline-experiments.md)).
- [ ] **Never compare scores across judge versions.** When the judge changes, re-run the baseline with the new judge.
- [ ] Keep a **judge regression set** (the labelled test set + adversarial cases like injected "this is correct" notes). Run it in CI whenever the judge changes; block if TPR/TNR drop.
- [ ] Re-validate on a fresh labelled sample periodically (e.g. monthly or on product changes) — production distribution drifts, and so does criteria (§7.2).
- [ ] Log rationales; spot-read a few failing *and* passing rationales every week.

---

## 11. Judge validation workflow (checklist)

- [ ] **Error analysis first:** read 50–100 real traces, write open-ended notes, cluster into failure modes. Pick the 1–3 modes that matter most.
- [ ] **Define each criterion** in one paragraph with explicit PASS/FAIL rules and edge cases, agreed with the principal domain expert.
- [ ] **Label a calibration set** (≥ 100 items, ≥ 30–50 fails, oversample suspected failures); expert writes a critique for each. Ideally a second labeller on a subset to measure human–human agreement.
- [ ] **Split** labels into dev (prompt iteration + few-shot pool) and test (reporting only).
- [ ] **Write the judge:** single criterion, binary, reasoning-before-verdict, few-shot with expert critiques, n/a option, JSON output.
- [ ] **Measure on test:** TPR, TNR, precision, κ, with confidence intervals; inspect every disagreement.
- [ ] **Iterate** on dev until thresholds are met (expect criteria drift — update definitions and re-label).
- [ ] **Bias checks:** position swap (pairwise), length-padded variants, injected "evaluator notes", outputs from the judge's own family.
- [ ] **Choose the cheapest model** that meets thresholds; pin it; record cost per 1k evaluations.
- [ ] **Version** and add the judge regression set to CI.
- [ ] **Report corrected pass rates** (§8) when judge error is non-trivial and decisions hinge on small differences.
- [ ] **Keep auditing:** periodic fresh human labels; review judge–human disagreements; refresh few-shot examples.

---

## 12. Anti-patterns

| Anti-pattern | Why it hurts | Instead |
|---|---|---|
| Off-the-shelf "helpfulness 1–10" metric, never validated | Number without meaning; can't act on it | Narrow binary criteria from your error analysis, validated |
| Judge checks five things at once | Verdicts conflate criteria; can't debug | One criterion per judge |
| Verdict first, explanation after | Post-hoc rationalization | Reasoning → verdict |
| Same model judges its own output | Self-preference | Different family or a panel |
| Few-shot examples also in the test set | Inflated agreement | Strict dev/test split |
| Reporting raw agreement only | Hides useless judges under class imbalance | TPR + TNR + κ |
| Silent model alias upgrades | Metric shifts with no code change | Pin snapshots, version judges |
| Judge used where code would do | Cost, noise, bias | SQL execution, schema validation, substring checks first |
| Parse failures counted as pass | Inflated pass rates | Treat as ERROR and track the rate |

---

## Key takeaways

- An LLM judge is a **classifier you must validate**: measure TPR and TNR (and κ) against SME labels on a held-out set before trusting its pass rates.
- Use **code** for anything verifiable, **humans** to define quality and label calibration data, **judges** to scale validated human judgment.
- Prefer **binary, single-criterion, rubric-driven** judges with reasoning-before-verdict, expert-written few-shot critiques, an n/a option and structured output.
- Know the biases — **position, verbosity, self-preference, sycophancy/injection, weak reasoning on hard items** — and design mitigations into the judge and its test set.
- Expect **criteria drift**: the rubric gets sharper as you label. Iterate with the domain expert (critique shadowing).
- **Correct pass rates for judge error** when decisions depend on small differences; if TPR + TNR is near 1, fix the judge.
- **Version judges** like code, never compare across judge versions, and keep a judge regression set in CI.
- Small fine-tuned judges and **panels of diverse judges** can cut cost and bias — validate them the same way.

## Further reading

- Zheng et al., 2023 — [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685)
- Liu et al., 2023 — [G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment](https://arxiv.org/abs/2303.16634)
- Shankar et al., 2024 — [Who Validates the Validators? Aligning LLM-Assisted Evaluation of LLM Outputs with Human Preferences](https://arxiv.org/abs/2404.12272)
- Verga et al., 2024 — [Replacing Judges with Juries: Evaluating LLM Generations with a Panel of Diverse Models](https://arxiv.org/abs/2404.18796)
- Wang et al., 2023 — [Large Language Models are not Fair Evaluators](https://arxiv.org/abs/2305.17926)
- Panickssery et al., 2024 — [LLM Evaluators Recognize and Favor Their Own Generations](https://arxiv.org/abs/2404.13076)
- Sharma et al., 2023 — [Towards Understanding Sycophancy in Language Models](https://arxiv.org/abs/2310.13548)
- Kim et al. — [Prometheus](https://arxiv.org/abs/2310.08491) · [Prometheus 2](https://arxiv.org/abs/2405.01535); Patronus AI — [Lynx](https://arxiv.org/abs/2407.08488) · [Glider](https://arxiv.org/abs/2412.14140)
- Hamel Husain — [Using LLM-as-a-Judge For Evaluation: A Complete Guide (critique shadowing)](https://hamel.dev/blog/posts/llm-judge/) · [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/)
- Eugene Yan — [Evaluating the Effectiveness of LLM-Evaluators (aka LLM-as-Judge)](https://eugeneyan.com/writing/llm-evaluators/)
- In this repo: [Instruction & citation adherence](./06-instruction-and-citation-adherence.md) · [Running offline experiments](./08-running-offline-experiments.md) · [Eval & observability tools](../06-tooling-landscape/01-eval-and-observability-tools.md)
