# Long-Horizon and Research Agent Evals

> **TL;DR**
>
> - **Grade research reports claim by claim.** Narrow checks on single claims agree with humans far more often than judges that score a whole report.
> - **Check every citation against the agent's trace.** Separate fabricated URLs, dead links, pages the agent never opened, and pages that do not support the claim.
> - **Treat a harness change as an experiment.** Change one thing, run at least 5 trials per task, match budgets and infrastructure, and fix broken tasks first.
> - **Probe long runs where they break.** Test whether constraints survive compaction, gate on full success, and measure reliability across runs.

!!! note "Fast-moving topic: checked October 19, 2026"
    Many sources on this page are 2025–2026 preprints. Their numbers describe specific models and setups. Use them to decide what to test, not as rates to expect.

- **You will learn:**
    - How to grade long research reports and their citations
    - How to run harness changes as controlled experiments
    - How to evaluate agents that run for hours or across many context windows
    - What is still unsolved
- **Prerequisites:** [Agent eval environments & graders](./09-agent-eval-environments-and-graders.md), [Agent tool & trajectory evals](./04-agent-tool-and-trajectory-evals.md), [LLM-as-a-judge](./07-llm-as-a-judge.md)
- **Related:** [Agent archetypes: deep research](../00-foundations/05-agent-archetypes.md#53-a8-deep-research-agent), [Running offline experiments](./08-running-offline-experiments.md), [Is this eval valid?](./08-running-offline-experiments.md#121-is-this-eval-valid)

---

## 1. Why long work needs its own evals

Acme's research agent writes a 12-page vendor comparison with 60 citations. A whole-report LLM judge gives it 0.9. An engineer then checks 10 citations by hand. Two URLs never existed, and three pages do not support the claims next to them.

The same week, the coding team changes the agent's compaction prompt. The pass rate moves from 52% to 55% on one run. Nobody can say whether the change helped.

Long work breaks three habits that short evals rely on:

1. **The output is too long to judge in one pass.** A single score hides which claims are wrong.
2. **Many paths are valid.** You cannot compare the run with one reference trajectory.
3. **The harness is part of the system.** Prompts, tools, context management, and budgets change the score as much as the model does.

---

## 2. Deep research agents

A deep research agent searches, reads many sources, and writes a long cited report. The [archetype note](../00-foundations/05-agent-archetypes.md#53-a8-deep-research-agent) lists the basics. This section shows how to grade the report.

### 2.1 Grade claims, not whole reports

Narrow checks are reliable. Whole-report judging is not.

- **Narrow checks work.** Mind2Web 2 verifies each claim against the cited page with a rubric tree. Its verifier was correct on 99.03% of 720 human-checked judgments ([Gou et al., 2025](https://arxiv.org/abs/2506.21506)).
- **Whole-report judging is weak.** On REFLECT, even the best LLM judges scored "below 55%" when asked to find injected failures. They showed "especially poor performance on evidence verification" ([Wang et al., 2026](https://arxiv.org/abs/2605.19196)).
- **Rubric scores can hide errors.** ClaimProbe found that "rubric-based evaluations of deep-research (DR) systems often obscure fine-grained factual failures" ([Hayashi et al., 2026](https://arxiv.org/abs/2608.28643)).

Grade a report in four steps:

1. **Split the report into atomic claims.** Keep each claim's citation with it.
2. **Check each cited claim against its source.** Fetch the cited page and judge whether it supports the claim. DeepResearch Bench's FACT method does this for every statement–URL pair ([Du et al., 2025](https://arxiv.org/abs/2506.11763)).
3. **Score coverage against an expert rubric.** On ResearchRubrics, leading agents reached "under 68% average compliance" with expert-written rubric items ([Sharma et al., 2025](https://arxiv.org/abs/2511.07685)).
4. **Gate on critical claims.** Treat a wrong critical claim as a failure, even when the rubric score is high. Validate every judge on human labels first ([LLM-as-a-judge](./07-llm-as-a-judge.md)).

### 2.2 Check every citation against the trace

A citation can fail in five ways. Count each one separately.

| Result | What happened | How to detect it |
|---|---|---|
| **Supported** | The agent opened the page, and the page supports the claim | Claim-level support judge |
| **Unsupported** | The agent opened the page, but the page does not support the claim | Claim-level support judge |
| **Dead link** | The agent fetched the URL, but it returned an error | Fetch status in the trace |
| **Not fetched** | The page exists, but the agent never opened it in this run | Join citations to the fetch log |
| **Fabricated** | The URL never existed | No fetch, and no record in a web archive |

Fabrication is common. Across 10 models and agents, 3–13% of citation URLs "have no record in the Wayback Machine and likely never existed" ([Rao et al., 2026](https://arxiv.org/abs/2604.03173)). Unsupported claims are common too. DeepTRACE found "large fractions of statements unsupported by their own listed sources" ([Venkit et al., 2025](https://arxiv.org/abs/2509.04499)).

No benchmark we found checks citations against the agent's own fetch log. You can do this yourself, because your traces record every fetch.

```python
def audit_citations(citations: list[dict], fetched: dict[str, int], archived: set[str]) -> dict:
    """Classify each citation. fetched maps URL -> HTTP status from the trace; archived holds URLs found in a web archive."""
    counts = {"supported": 0, "unsupported": 0, "dead": 0, "not_fetched": 0, "fabricated": 0}
    for c in citations:
        url = c["url"]
        if url not in fetched:
            counts["not_fetched" if url in archived else "fabricated"] += 1
        elif fetched[url] != 200:
            counts["dead"] += 1
        else:
            counts["supported" if c["supported"] else "unsupported"] += 1
    return counts


citations = [{"url": "a", "supported": True}, {"url": "a", "supported": False},
             {"url": "b", "supported": True}, {"url": "c", "supported": True},
             {"url": "d", "supported": True}, {"url": "e", "supported": True}]
fetched = {"a": 200, "b": 200, "c": 404}       # the agent opened a, b, and c
archived = {"a", "b", "c", "d"}                 # e has no archive record
counts = audit_citations(citations, fetched, archived)
assert counts == {"supported": 2, "unsupported": 1, "dead": 1, "not_fetched": 1, "fabricated": 1}
assert counts["supported"] / len(citations) == 1 / 3     # citation accuracy is only 33%
```

**Report citation accuracy and the number of supported claims together.** They trade off. On DeepResearch Bench, Perplexity's agent had the highest citation accuracy (90.24%) with 31.26 effective citations per task. Gemini's agent had lower accuracy (81.44%) but 111.21 effective citations ([Du et al., 2025](https://arxiv.org/abs/2506.11763)).

### 2.3 Sources, balance, and knowing when to stop

- [ ] **Score source quality.** Anthropic's human testers found early agents "consistently chose SEO-optimized content farms" over authoritative sources ([Anthropic, 2025](https://www.anthropic.com/engineering/multi-agent-research-system)).
- [ ] **Test contested questions for balance.** DeepTRACE found agents often give "one-sided, highly confident responses on debate queries".
- [ ] **Include questions that have no good answer.** Search "improves answer accuracy on answerable queries but harms abstention on unanswerable ones" ([Xie et al., 2026](https://arxiv.org/abs/2601.05503)). The authors propose Tokens Per Correctness to measure the cost of over-searching.
- [ ] **Check confidence on wrong answers.** In BrowseComp, browsing models showed higher calibration error, so web access may "increase the model's confidence in incorrect answers" ([Wei et al., 2025](https://arxiv.org/abs/2504.12516)).
- [ ] **Red-team with poisoned pages.** Adding "as few as 13 words" to one page was enough. Open research agents then cited the attacker's content in 38–51% of reports ([Zhang et al., 2026](https://arxiv.org/abs/2605.24245)). Plant such pages in your own test corpus.

### 2.4 Fixed corpus for regressions, live web for realism

Live-web runs drift. Pages change, links die, and rankings shift. Use a fixed corpus for regression tests, and run live-web evals separately. BrowseComp-Plus uses "a fixed, carefully curated corpus" with human-verified supporting documents ([Chen et al., 2025](https://arxiv.org/abs/2508.06600)).

**Start small.** Anthropic began with "a set of about 20 queries representing real usage patterns". Early changes moved success rates from 30% to 80%, so a few cases were enough to see them ([Anthropic, 2025](https://www.anthropic.com/engineering/multi-agent-research-system)). Grow the set as the effects you need to detect get smaller.

---

## 3. Harness changes as experiments

The **agent harness** is everything around the model: the system prompt, tools, context management, retries, subagents, and budgets ([environments §2](./09-agent-eval-environments-and-graders.md#2-words-used-on-this-page)). A harness change can move scores as much as a model change. Evaluate it like any other change.

The evidence is strong:

- **Scaffolds change cost and accuracy.** HAL ran 21,730 agent rollouts. It found that "the choice of scaffold can be consequential in determining the final cost and accuracy of the agent" ([Kapoor et al., 2025](https://arxiv.org/abs/2510.11977)).
- **More reasoning is not always better.** In HAL, higher reasoning effort did not improve accuracy in 21 of 36 runs.
- **Infrastructure moves scores.** Anthropic measured a 6-point gap on Terminal-Bench 2.0 between its most- and least-resourced setups. It says "leaderboard differences below 3 percentage points deserve skepticism" until configurations match ([Anthropic, 2026](https://www.anthropic.com/engineering/infrastructure-noise)).
- **Broken tasks hide capability.** In τ-Bench Airline, 25 of 50 tasks had errors. Fixing them took average `pass^5` from 20.8% to 40.0% ([Kirgis et al., 2026](https://arxiv.org/abs/2605.08545)).
- **Extra compute can look like a better design.** Anthropic's multi-agent system beat a single agent by 90.2% on an internal eval. Token usage alone explained 80% of the performance variance, and multi-agent systems used about 15× the tokens of chats ([Anthropic, 2025](https://www.anthropic.com/engineering/multi-agent-research-system)).

**Run every harness change with these rules.**

- [ ] **Change one variable at a time:** a tool, the prompt, the compaction strategy, memory, subagents, or a budget.
- [ ] **Freeze the task suite** and keep a held-out split. Anthropic "relied on held-out test sets" to avoid overfitting tools to its evals ([writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)).
- [ ] **Run at least 5 trials per task.** Report `pass^k` and a paired comparison ([pass^k](./04-agent-tool-and-trajectory-evals.md#43-reliability-across-trials-passk), [paired tests](./08-running-offline-experiments.md#5-statistical-significance)).
- [ ] **Hold the model version and infrastructure constant,** and record them with the run.
- [ ] **Compare at a matched budget.** Report tokens and cost per successful task. A harness that wins by spending 3× more has not shown a better design.
- [ ] **Fix broken tasks and graders before you trust a delta** ([validity checklist](./08-running-offline-experiments.md#121-is-this-eval-valid)).
- [ ] **Read transcripts** for both arms, not only the scores.

The comparison below flags a harness that wins only by spending more.

```python
def pass_k(trials: dict[str, list[bool]]) -> float:
    """Share of tasks where every trial passed."""
    return sum(all(runs) for runs in trials.values()) / len(trials)

def compare_harnesses(a: dict, b: dict, max_cost_ratio: float = 1.25) -> dict:
    cost_ratio = b["tokens"] / a["tokens"]
    return {"delta_pass_k": round(pass_k(b["trials"]) - pass_k(a["trials"]), 2),
            "cost_ratio": round(cost_ratio, 2),
            "budget_matched": cost_ratio <= max_cost_ratio}


flaky = [True, True, False, True, True]
harness_a = {"trials": {f"t{i}": [True] * 5 if i < 6 else flaky for i in range(10)}, "tokens": 1_000_000}
harness_b = {"trials": {f"t{i}": [True] * 5 if i < 8 else flaky for i in range(10)}, "tokens": 3_100_000}
result = compare_harnesses(harness_a, harness_b)
assert result == {"delta_pass_k": 0.2, "cost_ratio": 3.1, "budget_matched": False}   # better, but 3.1× the tokens
```

Harness B passes more tasks, but it spends 3.1× the tokens. Re-run A with a matched budget before you credit B's design.

---

## 4. Long-running agents

Some agents work for hours or across many context windows. They summarize their history (compaction), keep progress files, and resume. Each of these steps can lose information.

- **Compaction drops constraints.** Compactors kept "only 17% of injected" side constraints on average. In one test, an agent "deleted emails without approval in 30/100 sessions after compaction, compared with none before compaction" ([Wang et al., 2026](https://arxiv.org/abs/2608.11242)).
- **Compaction alone is not enough.** Anthropic found that "compaction isn't sufficient" for long coding runs. One failure mode: the agent "declares victory on the entire project too early" ([Anthropic, 2025](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)).
- **Errors feed more errors.** Models "become more likely to make mistakes when the context contains their errors from prior turns" ([Sinha et al., 2025](https://arxiv.org/abs/2509.09677)).
- **Multi-turn work degrades.** LLMs showed "an average drop of 39%" in multi-turn settings, mostly from "a significant increase in unreliability" ([Laban et al., 2025](https://arxiv.org/abs/2505.06120)).
- **Long runs fail in ways context limits do not explain.** Vending-Bench found "no clear correlation between failures and the point at which the model's context window becomes full" ([Backlund & Petersson, 2025](https://arxiv.org/abs/2502.15840)).

**Test long runs with these probes.**

1. **Gate on full success, and report milestones.** Use milestones to see where runs fail ([environments §9](./09-agent-eval-environments-and-graders.md#9-long-horizon-tasks)).
2. **Inject a constraint early and test it late.** For example, "never delete files in `billing/`" in turn 1. Check it after each compaction. Report the retention rate.
3. **Check completion claims against a task list.** Compare "done" with a checklist of required features, so that early victory claims fail.
4. **Run long variants of short tasks.** Add irrelevant context, more turns, or a forced compaction. Context rot research found that "even a single distractor reduces performance" ([Chroma, 2025](https://www.trychroma.com/research/context-rot)).
5. **Measure reliability, not only capability.** Rabanser et al. split reliability into "consistency, robustness, predictability, and safety". Capability gains "have only yielded small improvements in reliability" ([Rabanser et al., 2026](https://arxiv.org/abs/2602.16666)).

If you need partial credit, keep it subordinate to full success. TheAgentCompany scores `S_partial = 0.5 × (checkpoints passed / total) + 0.5 × S_full`, where `S_full` is 1 only when every checkpoint passes ([Xu et al., 2024](https://arxiv.org/abs/2412.14161)).

```python
def partial_score(passed: int, total: int) -> float:
    """TheAgentCompany-style score: half for checkpoints, half reserved for full success."""
    full = 1.0 if passed == total else 0.0
    return 0.5 * passed / total + 0.5 * full


assert partial_score(3, 4) == 0.375      # 3 of 4 milestones still scores below one half
assert partial_score(4, 4) == 1.0
assert partial_score(0, 4) == 0.0
```

For tasks that take a human hours, METR's time horizon gives a common scale ([environments §9](./09-agent-eval-environments-and-graders.md#9-long-horizon-tasks)). METR says its confidence intervals are "still very wide" and that it is adding more long tasks ([METR, 2026](https://metr.org/blog/2026-1-29-time-horizon-1-1/)).

---

## 5. Pitfalls

| Pitfall | What goes wrong | Instead |
|---|---|---|
| **One judge score per report** | Wrong claims hide inside a high score | Judge claims one by one |
| **Citation count as quality** | More citations can mean less accuracy | Report accuracy and supported-claim count |
| **Live web only** | Results drift, and links rot | Keep a fixed corpus for regressions |
| **Harness wins at a higher budget** | Extra tokens look like a better design | Compare at a matched budget |
| **Small deltas on unmatched setups** | Infrastructure noise looks like progress | Match configurations, and distrust gaps under 3 points |
| **Trusting a delta before checking tasks** | Broken tasks hide or fake gains | Run the validity checklist first |
| **Partial credit as the headline** | 3 of 4 milestones looks like success | Gate on full success |

---

## 6. What is still open

- **No standard method for evaluating harness changes.** Most guidance comes from vendor engineering posts, not controlled studies.
- **No check of citations against fetch logs** in public benchmarks.
- **Whole-report judging** remains unreliable on long, open-ended work.
- **Human baselines for very long tasks are scarce,** so time-horizon estimates for multi-hour tasks are uncertain.
- **No budget-matched comparison** of multi-agent and single-agent designs that we found.
- **Keeping safety rules through compaction** is an active research problem.

Re-check this page at least once a quarter.

---

## Key takeaways

- **Grade reports claim by claim.** Use whole-report scores only as a diagnostic.
- **Classify every citation.** Supported, unsupported, dead, not fetched, and fabricated are different failures.
- **Treat harness changes as experiments.** Change one thing, run repeated trials, and match budgets and infrastructure.
- **Fix broken tasks before you trust a gain.**
- **Probe compaction directly.** Inject constraints early and test them late.
- **Gate on full success.** Milestones show where a long run failed.

## Further reading

- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) (2025)
- Anthropic, [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) (2025)
- Anthropic, [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) (2025)
- Anthropic, [Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) (2025)
- Anthropic, [Quantifying infrastructure noise in agentic coding evals](https://www.anthropic.com/engineering/infrastructure-noise) (2026)
- Gou et al., *Mind2Web 2: Evaluating Agentic Search with Agent-as-a-Judge*, NeurIPS 2025 Datasets and Benchmarks, [arXiv:2506.21506](https://arxiv.org/abs/2506.21506)
- Du et al., *DeepResearch Bench*, [arXiv:2506.11763](https://arxiv.org/abs/2506.11763)
- Sharma et al., *ResearchRubrics*, [arXiv:2511.07685](https://arxiv.org/abs/2511.07685)
- Chen et al., *BrowseComp-Plus*, [arXiv:2508.06600](https://arxiv.org/abs/2508.06600)
- Wei et al., *BrowseComp*, [arXiv:2504.12516](https://arxiv.org/abs/2504.12516)
- Rao, Wong & Callison-Burch, [arXiv:2604.03173](https://arxiv.org/abs/2604.03173) (hallucinated citation URLs)
- Venkit et al., *DeepTRACE*, [arXiv:2509.04499](https://arxiv.org/abs/2509.04499)
- Hayashi et al., *Redesigning and Auditing Deep Research Writing for Faithful Reports* (ClaimProbe), [arXiv:2608.28643](https://arxiv.org/abs/2608.28643)
- Wang et al., *Time to REFLECT: Can We Trust LLM Judges for Evidence-based Research Agents?*, [arXiv:2605.19196](https://arxiv.org/abs/2605.19196)
- Xie et al., *Over-Searching in Search-Augmented Large Language Models*, [arXiv:2601.05503](https://arxiv.org/abs/2601.05503)
- Zhang, Triedman & Shmatikov, [arXiv:2605.24245](https://arxiv.org/abs/2605.24245) (poisoning research agents)
- Kapoor et al., *Holistic Agent Leaderboard*, [arXiv:2510.11977](https://arxiv.org/abs/2510.11977)
- Kirgis et al., *Log analysis is necessary for credible evaluation of AI agents*, [arXiv:2605.08545](https://arxiv.org/abs/2605.08545)
- Rabanser et al., *Towards a Science of AI Agent Reliability*, ICML 2026, [arXiv:2602.16666](https://arxiv.org/abs/2602.16666)
- Sinha et al., *The Illusion of Diminishing Returns: Measuring Long Horizon Execution in LLMs*, [arXiv:2509.09677](https://arxiv.org/abs/2509.09677)
- Laban et al., *LLMs Get Lost In Multi-Turn Conversation*, [arXiv:2505.06120](https://arxiv.org/abs/2505.06120)
- Chroma, [Context Rot](https://www.trychroma.com/research/context-rot) (2025)
- Wang et al., *Lost in Context Compaction: When LLM Systems Drop Side Constraints*, [arXiv:2608.11242](https://arxiv.org/abs/2608.11242)
- Backlund & Petersson, *Vending-Bench*, [arXiv:2502.15840](https://arxiv.org/abs/2502.15840)
- Xu et al., *TheAgentCompany*, [arXiv:2412.14161](https://arxiv.org/abs/2412.14161)
- METR, [Time horizon 1.1](https://metr.org/blog/2026-1-29-time-horizon-1-1/) (2026)
- **Within this repo:**
    - [Agent eval environments & graders](./09-agent-eval-environments-and-graders.md)
    - [Agent archetypes](../00-foundations/05-agent-archetypes.md)
    - [Running offline experiments](./08-running-offline-experiments.md)
