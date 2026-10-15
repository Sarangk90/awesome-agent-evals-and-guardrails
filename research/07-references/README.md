# 07 · References

> **TL;DR**
>
> - **Start with the 10-item starter path.** Read the foundational papers and practitioner essays before diving into specialized topics.
> - **Trace every metric and defense to its source.** Use this annotated index to find the research behind RAG metrics, judges, statistics, and guardrails. Every arXiv paper cited elsewhere in this repo appears here.
> - **Treat defense claims with care.** Adaptive attacks break most published prompt-injection defenses. Prefer architectural controls and test against adaptive attackers.
> - **Use public benchmarks only to shortlist models.** Rely on your own domain datasets to evaluate your application.
> - **Map your controls to industry standards.** Connect your evals and guardrails to the OWASP Top 10 for LLM Applications 2026, the OWASP Agentic Top 10, NIST, MITRE ATLAS, ISO/IEC 42001, and the EU AI Act for reviews.

- **You will learn:**
    - Which papers and essays are worth your time
    - Where each metric, statistical method, and practice comes from
    - Which attacks and defenses matter for MCP servers and tool-using agents
    - Which standards and regulations map to which risks
    - Which benchmarks fit agentic RAG
- **Prerequisites:** None (use this list alongside any section)
- **Related:** [Tooling landscape](../06-tooling-landscape/README.md), [Glossary](../00-foundations/04-glossary.md), [Metric cheatsheet](../05-decision-framework/03-metric-cheatsheet.md)

---

## How to use this list

- Read the **one-line annotation** on each entry to see how it applies to an agentic RAG app with docs RAG, text-to-SQL, tools, and RBAC.
- Follow the arXiv abstract links and use the listed arXiv IDs when you cite papers. The year is the year of the first arXiv version (v1).
- Expect occasional title changes on practitioner blog posts. We verified all arXiv IDs (title, first author, v1 year) against the arXiv API and checked all URLs on October 16, 2026.
- Check [Eval & observability tools](../06-tooling-landscape/01-eval-and-observability-tools.md) and [Guardrail tools](../06-tooling-landscape/02-guardrail-tools.md) for direct links to tool documentation.
- Check the license before you deploy an open judge or guard model. For example, Patronus Lynx and GLIDER use CC-BY-NC-4.0 (non-commercial).

## If you only read ten things

| # | Read | Why first |
|---|---|---|
| 1 | Hamel Husain, [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) | Makes the case for error analysis before adopting eval tools. |
| 2 | Applied LLMs, [What We've Learned From A Year of Building with LLMs](https://applied-llms.org/) | Summarizes tactical, operational, and strategic lessons in one guide. |
| 3 | Anthropic, [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) | Explains simple agent patterns and when not to build an agent. |
| 4 | Eugene Yan, [Task-Specific LLM Evals that Do & Don't Work](https://eugeneyan.com/writing/evals/) | Shows which metrics are worth computing for each task. |
| 5 | Es et al., [RAGAS](https://arxiv.org/abs/2309.15217) | Defines the core vocabulary of reference-free RAG metrics. |
| 6 | Zheng et al., [Judging LLM-as-a-Judge](https://arxiv.org/abs/2306.05685) | Documents the judge biases you must control for. |
| 7 | Shankar et al., [Who Validates the Validators?](https://arxiv.org/abs/2404.12272) | Explains criteria drift and how to align judges with human preferences. |
| 8 | Simon Willison, [The lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) | Shows why combining private data, untrusted content, and exfiltration paths creates core agent risk. |
| 9 | Beurer-Kellner et al., [Design Patterns for Securing LLM Agents against Prompt Injections](https://arxiv.org/abs/2506.08837) | Provides architectural defenses that do not rely on detectors alone. |
| 10 | [OWASP Top 10 for LLM Applications 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/) | Establishes the shared risk vocabulary for security reviews. |

---

## 1. Foundational RAG papers

| Paper | arXiv | Annotation |
|---|---|---|
| Lewis et al. (2020), [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401) | 2005.11401 | Introduces the RAG architecture: a retriever plus a generator trained end to end. |
| Gao et al. (2023), [Retrieval-Augmented Generation for Large Language Models: A Survey](https://arxiv.org/abs/2312.10997) | 2312.10997 | Defines the naive, advanced, and modular RAG taxonomy and surveys RAG evaluation. |
| Liu et al. (2023), [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) | 2307.03172 | Shows that models use information best at the start and end of context. Motivates reranking and context-size evals. |
| Barnett et al. (2024), [Seven Failure Points When Engineering a Retrieval Augmented Generation System](https://arxiv.org/abs/2401.05856) | 2401.05856 | Catalogs practical RAG failures such as missing content, missed top docs, failed extraction, and wrong format. Pairs with [failure modes](../00-foundations/03-agentic-rag-failure-modes.md). |
| Asai et al. (2023), [Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection](https://arxiv.org/abs/2310.11511) | 2310.11511 | Trains a model to decide when to retrieve and critique its own output using reflection tokens. Precursor to agentic RAG. |
| Xu et al. (2023), [Retrieval meets Long Context Large Language Models](https://arxiv.org/abs/2310.03025) | 2310.03025 | Compares retrieval against long-context models. Useful when someone claims a larger context window replaces RAG. |
| Jeong et al. (2024), [Adaptive-RAG: Learning to Adapt Retrieval-Augmented Large Language Models through Question Complexity](https://arxiv.org/abs/2403.14403) | 2403.14403 | Uses a small classifier to predict query complexity and picks no retrieval, single-step, or multi-step retrieval. A model for routing evals. |
| Singh et al. (2025), [Agentic Retrieval-Augmented Generation: A Survey on Agentic RAG](https://arxiv.org/abs/2501.09136) | 2501.09136 | Surveys agentic RAG architectures and lists open problems in evaluation, coordination, memory, and governance. |

## 2. RAG evaluation

| Paper | arXiv | Annotation |
|---|---|---|
| Es et al. (2023), [Ragas: Automated Evaluation of Retrieval Augmented Generation](https://arxiv.org/abs/2309.15217) | 2309.15217 | Defines reference-free faithfulness, answer relevance, and context relevance using an LLM. See [End-to-end RAG evals](../02-offline-evals/01-end-to-end-rag-evals.md). |
| Saad-Falcon et al. (2023), [ARES: An Automated Evaluation Framework for Retrieval-Augmented Generation Systems](https://arxiv.org/abs/2311.09476) | 2311.09476 | Trains lightweight judges on synthetic data and uses prediction-powered inference (PPI) with human labels for confidence intervals. |
| Ru et al. (2024), [RAGChecker: A Fine-grained Framework for Diagnosing Retrieval-Augmented Generation](https://arxiv.org/abs/2408.08067) | 2408.08067 | Uses claim-level metrics to separate retriever errors from generator errors. |
| Gao et al. (2023), [Enabling Large Language Models to Generate Text with Citations (ALCE)](https://arxiv.org/abs/2305.14627) | 2305.14627 | Introduces the benchmark and metrics for citation recall and citation precision. See [Instruction & citation adherence](../02-offline-evals/06-instruction-and-citation-adherence.md). |
| Liu et al. (2023), [Evaluating Verifiability in Generative Search Engines](https://arxiv.org/abs/2304.09848) | 2304.09848 | Audits generative search engines and shows that citations often fail to support generated claims. |
| Thakur et al. (2021), [BEIR: A Heterogenous Benchmark for Zero-shot Evaluation of Information Retrieval Models](https://arxiv.org/abs/2104.08663) | 2104.08663 | Provides the standard zero-shot retrieval benchmark and shows that in-domain retrieval scores rarely transfer. See [Retrieval metrics](../02-offline-evals/02-retrieval-metrics.md). |
| Craswell et al. (2020), [Overview of the TREC 2019 Deep Learning Track](https://arxiv.org/abs/2003.07820) | 2003.07820 | Describes large-scale graded relevance judgments with pooling for passage and document ranking. A reference design for relevance labels. |
| Upadhyay et al. (2024), [UMBRELA: UMbrela is the (Open-Source Reproduction of the) Bing RELevance Assessor](https://arxiv.org/abs/2406.06519) | 2406.06519 | Reproduces LLM relevance assessment with GPT-4o. LLM labels give system rankings that correlate highly with human-label rankings on TREC DL 2019–2023. |
| Yang et al. (2018), [HotpotQA: A Dataset for Diverse, Explainable Multi-hop Question Answering](https://arxiv.org/abs/1809.09600) | 1809.09600 | Provides 113k Wikipedia multi-hop questions with sentence-level supporting facts. Use it to test multi-hop retrieval. |
| Trivedi et al. (2021), [MuSiQue: Multihop Questions via Single-hop Question Composition](https://arxiv.org/abs/2108.00573) | 2108.00573 | Composes multi-hop questions from single-hop questions so that shortcuts fail. Adds unanswerable contrast questions. |
| Yang et al. (2024), [CRAG – Comprehensive RAG Benchmark](https://arxiv.org/abs/2406.04744) | 2406.04744 | Benchmarks RAG on 4,409 questions across five domains with mock web and knowledge-graph search APIs. Accuracy drops for fast-changing and long-tail facts. |
| Krishna et al. (2024), [Fact, Fetch, and Reason: A Unified Evaluation of Retrieval-Augmented Generation (FRAMES)](https://arxiv.org/abs/2409.12941) | 2409.12941 | Tests factuality, retrieval, and reasoning together on multi-hop questions that need several sources. |
| Niu et al. (2023), [RAGTruth: A Hallucination Corpus for Developing Trustworthy Retrieval-Augmented Language Models](https://arxiv.org/abs/2401.00396) | 2401.00396 | Provides about 18,000 RAG responses with word-level hallucination labels. Use it to test and fine-tune groundedness detectors. |
| Jacovi et al. (2025), [The FACTS Grounding Leaderboard](https://arxiv.org/abs/2501.03200) | 2501.03200 | Scores long-form answers for grounding in documents up to 32k tokens. Uses an aggregate of several judge models to reduce judge bias. |
| Yu et al. (2024), [Evaluation of Retrieval-Augmented Generation: A Survey](https://arxiv.org/abs/2405.07437) | 2405.07437 | Surveys RAG benchmarks, datasets, and metrics for the retrieval and generation components and lists their limits. |

## 3. LLM-as-a-judge

| Paper | arXiv | Annotation |
|---|---|---|
| Zheng et al. (2023), [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685) | 2306.05685 | Establishes strong LLM judges and documents position, verbosity, and self-enhancement biases. |
| Liu et al. (2023), [G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment](https://arxiv.org/abs/2303.16634) | 2303.16634 | Introduces chain-of-thought evaluation steps and probability-weighted scores. Forms the basis for G-Eval metrics across eval tools. |
| Wang et al. (2023), [Large Language Models are not Fair Evaluators](https://arxiv.org/abs/2305.17926) | 2305.17926 | Demonstrates position bias in pairwise judging and tests calibration fixes like swapping candidate order. |
| Shankar et al. (2024), [Who Validates the Validators? Aligning LLM-Assisted Evaluation of LLM Outputs with Human Preferences](https://arxiv.org/abs/2404.12272) | 2404.12272 | Explains criteria drift: humans refine rubrics while grading, so you must align judges iteratively with human labels. |
| Verga et al. (2024), [Replacing Judges with Juries: Evaluating LLM Generations with a Panel of Diverse Models (PoLL)](https://arxiv.org/abs/2404.18796) | 2404.18796 | Shows that a panel of smaller, diverse judges can beat one large judge on human agreement, cost, and bias. |
| Thakur et al. (2024), [Judging the Judges: Evaluating Alignment and Vulnerabilities in LLMs-as-Judges](https://arxiv.org/abs/2406.12624) | 2406.12624 | Recommends Scott's π over percent agreement. Shows that judges are sensitive to prompt complexity and length and tend toward leniency. |
| Gu et al. (2024), [A Survey on LLM-as-a-Judge](https://arxiv.org/abs/2411.15594) | 2411.15594 | Surveys judge design, reliability, and bias mitigation techniques. See [LLM-as-a-judge](../02-offline-evals/07-llm-as-a-judge.md). |
| Kim et al. (2023), [Prometheus: Inducing Fine-grained Evaluation Capability in Language Models](https://arxiv.org/abs/2310.08491) | 2310.08491 | Fine-tunes an open 13B judge on custom score rubrics. An open alternative to proprietary judges. |
| Kim et al. (2024), [Prometheus 2: An Open Source Language Model Specialized in Evaluating Other Language Models](https://arxiv.org/abs/2405.01535) | 2405.01535 | Supports both direct scoring and pairwise ranking with user-defined criteria in one open judge. |
| Ravi et al. (2024), [Lynx: An Open Source Hallucination Evaluation Model](https://arxiv.org/abs/2407.08488) | 2407.08488 | Releases a RAG hallucination judge and the HaluBench benchmark. Model license is CC-BY-NC-4.0 (non-commercial). |
| Deshpande et al. (2024), [GLIDER: Grading LLM Interactions and Decisions using Explainable Ranking](https://arxiv.org/abs/2412.14140) | 2412.14140 | Releases a small judge that gives rubric scores, reasoning, and highlighted spans. Model license is CC-BY-NC-4.0 (non-commercial). |
| Koo et al. (2023), [Benchmarking Cognitive Biases in Large Language Models as Evaluators (CoBBLEr)](https://arxiv.org/abs/2309.17012) | 2309.17012 | Measures six cognitive biases in LLM judges and finds low agreement with human preference rankings. |
| Panickssery et al. (2024), [LLM Evaluators Recognize and Favor Their Own Generations](https://arxiv.org/abs/2404.13076) | 2404.13076 | Links self-preference bias to the ability of a model to recognize its own outputs. Use a judge from a different model family. |
| Wataoka et al. (2024), [Self-Preference Bias in LLM-as-a-Judge](https://arxiv.org/abs/2410.21819) | 2410.21819 | Shows that judges score low-perplexity (familiar) text higher, whether or not they wrote it. |
| Ye et al. (2024), [Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge (CALM)](https://arxiv.org/abs/2410.02736) | 2410.02736 | Quantifies 12 judge biases with the CALM framework, including position, verbosity, authority, and self-enhancement. |
| Sharma et al. (2023), [Towards Understanding Sycophancy in Language Models](https://arxiv.org/abs/2310.13548) | 2310.13548 | Shows that assistants match user beliefs over the truth, likely because human preference data rewards it. A risk for judges that see user framing. |
| Tan et al. (2024), [JudgeBench: A Benchmark for Evaluating LLM-based Judges](https://arxiv.org/abs/2410.12784) | 2410.12784 | Tests judges on hard pairs with objective correctness labels. Many strong judges score only slightly above random. |
| Jung et al. (2024), [Trust or Escalate: LLM Judges with Provable Guarantees for Human Agreement](https://arxiv.org/abs/2407.18370) | 2407.18370 | Lets a judge abstain when unsure and escalate to a stronger judge or a human, with a guaranteed human-agreement level. |
| Raina et al. (2024), [Is LLM-as-a-Judge Robust? Investigating Universal Adversarial Attacks on Zero-shot LLM Assessment](https://arxiv.org/abs/2402.14016) | 2402.14016 | Shows that short universal phrases appended to answers inflate judge scores. Absolute scoring is more vulnerable than comparative scoring. |
| Shi et al. (2024), [Optimization-based Prompt Injection Attack to LLM-as-a-Judge (JudgeDeceiver)](https://arxiv.org/abs/2403.17710) | 2403.17710 | Optimizes injected text so that a judge picks the attacker's response. Known detection defenses are insufficient. |
| Zhao et al. (2025), [One Token to Fool LLM-as-a-Judge](https://arxiv.org/abs/2507.08794) | 2507.08794 | Shows that tokens such as ":" or "Thought process:" make reference-based judges and reward models give false positives. |

## 4. Hallucination, attribution, bias and instruction following

| Paper | arXiv | Annotation |
|---|---|---|
| Manakul et al. (2023), [SelfCheckGPT: Zero-Resource Black-Box Hallucination Detection for Generative Large Language Models](https://arxiv.org/abs/2303.08896) | 2303.08896 | Detects hallucinations by measuring inconsistency across multiple sampled responses without retrieval or reference answers. |
| Min et al. (2023), [FActScore: Fine-grained Atomic Evaluation of Factual Precision in Long Form Text Generation](https://arxiv.org/abs/2305.14251) | 2305.14251 | Breaks answers into atomic facts and verifies each fact independently. Forms the pattern behind claim-level faithfulness metrics. |
| Zhang et al. (2019), [BERTScore: Evaluating Text Generation with BERT](https://arxiv.org/abs/1904.09675) | 1904.09675 | Scores token similarity with contextual embeddings. A cheap semantic-similarity baseline, not a faithfulness metric. |
| Rashkin et al. (2021), [Measuring Attribution in Natural Language Generation Models](https://arxiv.org/abs/2112.12870) | 2112.12870 | Defines Attributable to Identified Sources (AIS), a human-evaluation framework for whether sources support a statement. |
| Gao et al. (2022), [RARR: Researching and Revising What Language Models Say, Using Language Models](https://arxiv.org/abs/2210.08726) | 2210.08726 | Finds evidence for model output and revises unsupported content. Measures attribution with human AIS ratings and an automatic NLI-based AIS score. |
| Bohnet et al. (2022), [Attributed Question Answering: Evaluation and Modeling for Attributed Large Language Models](https://arxiv.org/abs/2212.08037) | 2212.08037 | Defines attributed QA and shows that an automatic metric that correlates with human AIS ratings is good enough for development. |
| Li et al. (2024), [AttributionBench: How Hard is Automatic Attribution Evaluation?](https://arxiv.org/abs/2402.15089) | 2402.15089 | Shows that even a fine-tuned GPT-3.5 reaches only about 80% macro-F1 on automatic attribution checks. Do not treat citation checkers as ground truth. |
| Zhang et al. (2024), [LongCite: Enabling LLMs to Generate Fine-grained Citations in Long-context QA](https://arxiv.org/abs/2409.02897) | 2409.02897 | Introduces the LongBench-Cite benchmark and trains models to emit sentence-level citations. |
| Tang et al. (2024), [L-CiteEval: Do Long-Context Models Truly Leverage Context for Responding?](https://arxiv.org/abs/2410.02115) | 2410.02115 | Benchmarks answer quality and citation faithfulness for long-context models. RAG improves faithfulness. |
| Zhou et al. (2023), [Instruction-Following Evaluation for Large Language Models (IFEval)](https://arxiv.org/abs/2311.07911) | 2311.07911 | Evaluates verifiable instructions like word limits and JSON formatting using deterministic code instead of LLM judges. |
| Pyatkin et al. (2025), [Generalizing Verifiable Instruction Following (IFBench)](https://arxiv.org/abs/2507.02833) | 2507.02833 | Adds 58 new out-of-domain verifiable constraints. Shows that most models overfit to the small set of constraints in existing benchmarks. |
| Qin et al. (2024), [InFoBench: Evaluating Instruction Following Ability in Large Language Models](https://arxiv.org/abs/2401.03601) | 2401.03601 | Introduces the Decomposed Requirements Following Ratio (DRFR): split each instruction into simple criteria and score each one. |
| Jiang et al. (2023), [FollowBench: A Multi-level Fine-grained Constraints Following Benchmark for Large Language Models](https://arxiv.org/abs/2310.20410) | 2310.20410 | Adds constraints one level at a time to find where instruction following breaks. |
| He et al. (2024), [Multi-IF: Benchmarking LLMs on Multi-Turn and Multilingual Instructions Following](https://arxiv.org/abs/2410.15553) | 2410.15553 | Extends IFEval to multi-turn and multilingual prompts. Accuracy drops with each turn and for non-Latin scripts. |
| Röttger et al. (2023), [XSTest: A Test Suite for Identifying Exaggerated Safety Behaviours in Large Language Models](https://arxiv.org/abs/2308.01263) | 2308.01263 | Provides 250 safe prompts that models should not refuse and 200 unsafe contrast prompts. Use it to measure over-refusal. |
| Parrish et al. (2021), [BBQ: A Hand-Built Bias Benchmark for Question Answering](https://arxiv.org/abs/2110.08193) | 2110.08193 | Tests whether QA models rely on social stereotypes in ambiguous and disambiguated contexts. |
| Borkan et al. (2019), [Nuanced Metrics for Measuring Unintended Bias with Real Data for Text Classification](https://arxiv.org/abs/1903.04561) | 1903.04561 | Introduces threshold-agnostic subgroup AUC metrics for bias in classifiers. Apply them to guard classifiers. |

## 5. Prompt injection, guard models and guardrails

| Paper | arXiv | Annotation |
|---|---|---|
| Perez & Ribeiro (2022), [Ignore Previous Prompt: Attack Techniques For Language Models](https://arxiv.org/abs/2211.09527) | 2211.09527 | Presents an early systematic study of goal hijacking and system prompt leaking. |
| Greshake et al. (2023), [Not what you've signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection](https://arxiv.org/abs/2302.12173) | 2302.12173 | Defines indirect prompt injection through retrieved content, which is the core security threat in RAG systems. |
| Liu et al. (2023), [Formalizing and Benchmarking Prompt Injection Attacks and Defenses](https://arxiv.org/abs/2310.12815) | 2310.12815 | Gives a formal framework for prompt injection and benchmarks 5 attacks and 10 defenses across 10 LLMs. |
| Yi et al. (2023), [Benchmarking and Defending Against Indirect Prompt Injection Attacks on Large Language Models (BIPIA)](https://arxiv.org/abs/2312.14197) | 2312.14197 | Introduces the BIPIA benchmark for indirect injection and tests black-box and white-box defenses. |
| Zou et al. (2024), [PoisonedRAG: Knowledge Corruption Attacks to Retrieval-Augmented Generation of Large Language Models](https://arxiv.org/abs/2402.07867) | 2402.07867 | Shows that five injected texts per target question can reach about 90% attack success on a large knowledge base. Tested defenses were insufficient. |
| Bagdasaryan et al. (2023), [Abusing Images and Sounds for Indirect Instruction Injection in Multi-Modal LLMs](https://arxiv.org/abs/2307.10490) | 2307.10490 | Hides injected instructions in adversarial perturbations of images and audio. |
| Morris et al. (2023), [Text Embeddings Reveal (Almost) As Much As Text (Vec2Text)](https://arxiv.org/abs/2310.06816) | 2310.06816 | Reconstructs text from dense embeddings. Treat vector stores as sensitive data. |
| Zou et al. (2023), [Universal and Transferable Adversarial Attacks on Aligned Language Models (GCG)](https://arxiv.org/abs/2307.15043) | 2307.15043 | Introduces Greedy Coordinate Gradient suffixes that jailbreak aligned models and transfer across models. |
| Hines et al. (2024), [Defending Against Indirect Prompt Injection Attacks With Spotlighting](https://arxiv.org/abs/2403.14720) | 2403.14720 | Uses delimiters, datamarking, and encoding on untrusted content to reduce indirect injection success. See [Retrieval & context guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md). |
| Wallace et al. (2024), [The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions](https://arxiv.org/abs/2404.13208) | 2404.13208 | Trains models to prioritize system instructions over user messages and untrusted tool outputs. The research basis for role separation. |
| Chen et al. (2024), [StruQ: Defending Against Prompt Injection with Structured Queries](https://arxiv.org/abs/2402.06363) | 2402.06363 | Separates prompt and data into channels and fine-tunes the model to ignore instructions in the data channel. |
| Chen et al. (2024), [SecAlign: Defending Against Prompt Injection with Preference Optimization](https://arxiv.org/abs/2410.05451) | 2410.05451 | Uses preference optimization to train models to prefer the legitimate instruction over the injected one. |
| Chen et al. (2025), [Meta-SecAlign: Training LLMs against Prompt Injection for Robust Agents](https://arxiv.org/abs/2507.02735) | 2507.02735 | Releases open models trained against prompt injection and reports that SecAlign loses utility on agentic tasks. Evaluated on AgentDojo, InjecAgent, and WASP. |
| Zhan et al. (2024), [InjecAgent: Benchmarking Indirect Prompt Injections in Tool-Integrated Large Language Model Agents](https://arxiv.org/abs/2403.02691) | 2403.02691 | Benchmarks indirect injections that trick tool-using agents into calling harmful tools or exfiltrating data. |
| Debenedetti et al. (2024), [AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents](https://arxiv.org/abs/2406.13352) | 2406.13352 | Evaluates benign task utility and attack success rate together, which is the right framing for agent guardrails. |
| Zhu et al. (2025), [MELON: Provable Defense Against Indirect Prompt Injection Attacks in AI Agents](https://arxiv.org/abs/2502.05174) | 2502.05174 | Re-runs the agent with a masked user prompt and flags an attack when the tool calls stay the same. |
| Debenedetti et al. (2025), [Defeating Prompt Injections by Design (CaMeL)](https://arxiv.org/abs/2503.18813) | 2503.18813 | Separates control flow from untrusted data using capability tracking to enforce security by construction. |
| Beurer-Kellner et al. (2025), [Design Patterns for Securing LLM Agents against Prompt Injections](https://arxiv.org/abs/2506.08837) | 2506.08837 | Catalogs six architectural patterns, including plan-then-execute, dual LLM, and context minimization. See [Tool & action guardrails](../04-guardrails/05-tool-and-action-guardrails.md). |
| Bullwinkel et al. (2025), [Lessons From Red Teaming 100 Generative AI Products](https://arxiv.org/abs/2501.07238) | 2501.07238 | Shares Microsoft AI Red Team findings: simple attacks work, system context matters, and human red-teamers remain essential. |
| Inan et al. (2023), [Llama Guard: LLM-based Input-Output Safeguard for Human-AI Conversations](https://arxiv.org/abs/2312.06674) | 2312.06674 | Introduces an LLM-based safety classifier for prompts and responses using a configurable hazard taxonomy. |
| Padhi et al. (2024), [Granite Guardian](https://arxiv.org/abs/2412.07724) | 2412.07724 | Presents open guard models for harmful content, jailbreaks, and RAG risks (context relevance, groundedness, answer relevance). Later [releases](https://github.com/ibm-granite/granite-guardian) add function-call hallucination checks. |
| Han et al. (2024), [WildGuard: Open One-Stop Moderation Tools for Safety Risks, Jailbreaks, and Refusals of LLMs](https://arxiv.org/abs/2406.18495) | 2406.18495 | Detects harmful prompts, harmful responses, and refusals in one open model. |
| Zeng et al. (2024), [ShieldGemma: Generative AI Content Moderation Based on Gemma](https://arxiv.org/abs/2407.21772) | 2407.21772 | Releases Gemma 2-based classifiers for four harm types in user input and model output. |
| Zhao et al. (2025), [Qwen3Guard Technical Report](https://arxiv.org/abs/2510.14276) | 2510.14276 | Adds a three-class label (safe, controversial, unsafe) and a streaming variant that checks tokens during generation. Apache 2.0. |
| Galinkin & Sablotny (2024), [Improved Large Language Model Jailbreak Detection via Pretrained Embeddings](https://arxiv.org/abs/2412.01547) | 2412.01547 | Detects jailbreaks with embeddings plus a classic classifier. The basis of NVIDIA NemoGuard JailbreakDetect. |
| Li & Liu (2024), [InjecGuard: Benchmarking and Mitigating Over-defense in Prompt Injection Guardrail Models](https://arxiv.org/abs/2410.22770) | 2410.22770 | Introduces the NotInject dataset. Shows that prompt-injection classifiers over-flag benign inputs with trigger words. |
| Sharma et al. (2025), [Constitutional Classifiers: Defending against Universal Jailbreaks across Thousands of Hours of Red Teaming](https://arxiv.org/abs/2501.18837) | 2501.18837 | Trains input and output classifiers on synthetic data from a written constitution. Reports a 0.38% absolute refusal increase on production traffic. |
| Chennabasappa et al. (2025), [LlamaFirewall: An open source guardrail system for building secure AI agents](https://arxiv.org/abs/2505.03574) | 2505.03574 | Combines PromptGuard 2, an experimental chain-of-thought alignment auditor, and the CodeShield static analyzer as a final defense layer for agents. |
| Rebedea et al. (2023), [NeMo Guardrails: A Toolkit for Controllable and Safe LLM Applications with Programmable Rails](https://arxiv.org/abs/2310.10501) | 2310.10501 | Introduces programmable rails and the Colang modeling language behind NeMo Guardrails. |
| Mazeika et al. (2024), [HarmBench: A Standardized Evaluation Framework for Automated Red Teaming and Robust Refusal](https://arxiv.org/abs/2402.04249) | 2402.04249 | Standardizes automated red-teaming evaluation for attacks and refusal defenses. |
| Chao et al. (2024), [JailbreakBench: An Open Robustness Benchmark for Jailbreaking Large Language Models](https://arxiv.org/abs/2404.01318) · [site](https://jailbreakbench.github.io/) | 2404.01318 | Provides a jailbreak dataset, a standard scoring setup, and a leaderboard of attacks and defenses. |

## 6. Adaptive attacks, MCP and agent security

| Paper / resource | arXiv | Annotation |
|---|---|---|
| Nasr et al. (2025), [The Attacker Moves Second: Stronger Adaptive Attacks Bypass Defenses Against LLM Jailbreaks and Prompt Injections](https://arxiv.org/abs/2510.09023) | 2510.09023 | Bypasses 12 recent defenses with over 90% attack success for most. Most of them first reported near-zero success. Evaluate defenses against adaptive attackers. |
| Zhan et al. (2025), [Adaptive Attacks Break Defenses Against Indirect Prompt Injection Attacks on LLM Agents](https://arxiv.org/abs/2503.00061) | 2503.00061 | Breaks eight indirect-injection defenses for agents with adaptive attacks. Attack success stays above 50%. |
| Andriushchenko et al. (2024), [AgentHarm: A Benchmark for Measuring Harmfulness of LLM Agents](https://arxiv.org/abs/2410.09024) | 2410.09024 | Measures whether agents complete harmful multi-step tool tasks. Simple jailbreak templates work on agents. |
| Zhang et al. (2024), [Agent Security Bench (ASB): Formalizing and Benchmarking Attacks and Defenses in LLM-based Agents](https://arxiv.org/abs/2410.02644) | 2410.02644 | Benchmarks injection, memory poisoning, and backdoor attacks on agents. Adds a metric for the utility-security balance. |
| Evtimov et al. (2025), [WASP: Benchmarking Web Agent Security Against Prompt Injection Attacks](https://arxiv.org/abs/2504.18575) | 2504.18575 | Tests web agents against realistic injections. Attacks partially succeed in up to 86% of cases, but agents often fail to finish the attacker goal. |
| Hou et al. (2025), [Model Context Protocol (MCP): Landscape, Security Threats, and Future Research Directions](https://arxiv.org/abs/2503.23278) | 2503.23278 | Surveys MCP architecture and maps security threats to four phases of the MCP server lifecycle. |
| Radosevich & Halloran (2025), [MCP Safety Audit: LLMs with the Model Context Protocol Allow Major Security Exploits](https://arxiv.org/abs/2504.03767) | 2504.03767 | Shows that MCP tools let models perform attacks such as malicious code execution, remote access, and credential theft. Releases the MCPSafetyScanner audit tool. |
| Yang et al. (2025), [MCPSecBench: A Systematic Security Benchmark and Playground for Testing Model Context Protocols](https://arxiv.org/abs/2508.13220) | 2508.13220 | Defines 17 attack types across four MCP attack surfaces and tests them. Current protections succeed less than 30% of the time on average. |
| Invariant Labs (2025), [MCP Security Notification: Tool Poisoning Attacks](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks) | – | Shows that hidden instructions in MCP tool descriptions can steer an agent to exfiltrate data. |
| Meta (2025), [Agents Rule of Two: A Practical Approach to AI Agent Security](https://ai.meta.com/blog/practical-ai-agent-security/) | – | Allows an agent at most two of [A] untrusted input, [B] sensitive systems or private data, and [C] state change or external communication without human supervision. [C] is broader than the exfiltration leg of the lethal trifecta. |
| Rehberger (2023), [Bing Chat: Data Exfiltration Exploit Explained](https://embracethered.com/blog/posts/2023/bing-chat-data-exfiltration-poc-and-fix/) | – | Shows data exfiltration through injected markdown images. The pattern behind output URL and image allowlists. |
| NVD, [CVE-2025-32711 (EchoLeak)](https://nvd.nist.gov/vuln/detail/CVE-2025-32711) | – | Records a zero-click information disclosure vulnerability in Microsoft 365 Copilot. A real-world indirect-injection exfiltration case. |

## 7. Text-to-SQL

| Paper / resource | arXiv | Annotation |
|---|---|---|
| Yu et al. (2018), [Spider: A Large-Scale Human-Labeled Dataset for Complex and Cross-Domain Semantic Parsing and Text-to-SQL Task](https://arxiv.org/abs/1809.08887) · [site](https://yale-lily.github.io/spider) | 1809.08887 | Establishes the classic cross-domain text-to-SQL benchmark along with exact-match and execution accuracy metrics. |
| Zhong et al. (2020), [Semantic Evaluation for Text-to-SQL with Distilled Test Suites](https://arxiv.org/abs/2010.02840) | 2010.02840 | Runs queries against distilled database variants to prevent false positives in execution accuracy. See [Text-to-SQL evals](../02-offline-evals/05-text-to-sql-evals.md). |
| Li et al. (2023), [Can LLM Already Serve as A Database Interface? A BIg Bench for Large-Scale Database Grounded Text-to-SQLs (BIRD)](https://arxiv.org/abs/2305.03111) · [site](https://bird-bench.github.io/) | 2305.03111 | Tests dirty, large-scale databases that require external domain knowledge and introduces the Valid Efficiency Score (VES). |
| Gao et al. (2023), [Text-to-SQL Empowered by Large Language Models: A Benchmark Evaluation (DAIL-SQL)](https://arxiv.org/abs/2308.15363) | 2308.15363 | Compares schema prompt representations and few-shot example selection methods for LLM text-to-SQL. |
| Lei et al. (2024), [Spider 2.0: Evaluating Language Models on Real-World Enterprise Text-to-SQL Workflows](https://arxiv.org/abs/2411.07763) · [site](https://spider2-sql.github.io/) | 2411.07763 | Benchmarks enterprise schemas, multiple SQL dialects, and multi-step workflows. Closest public benchmark to a warehouse assistant. |
| Bhaskar et al. (2023), [Benchmarking and Improving Text-to-SQL Generation under Ambiguity (AmbiQT)](https://arxiv.org/abs/2310.13659) | 2310.13659 | Provides questions with more than one valid SQL answer. Tests whether a model can produce all valid readings. |
| Saparina & Lapata (2024), [AMBROSIA: A Benchmark for Parsing Ambiguous Questions into Database Queries](https://arxiv.org/abs/2406.19073) | 2406.19073 | Benchmarks scope, attachment, and vagueness ambiguity in questions over databases. |
| Huo et al. (2025), [BIRD-INTERACT: Re-imagining Text-to-SQL Evaluation for Large Language Models via Lens of Dynamic Interactions](https://arxiv.org/abs/2510.05318) · [site](https://bird-interact.github.io/) | 2510.05318 | Evaluates multi-turn text-to-SQL with a simulated user and clarification. Even GPT-5 completes few tasks. |

## 8. Agents and tool use

| Paper / resource | arXiv | Annotation |
|---|---|---|
| Yao et al. (2024), [τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains](https://arxiv.org/abs/2406.12045) · [site](https://taubench.com) | 2406.12045 | Combines simulated users, tools, and domain policies. Introduces `pass^k` to measure reliability across repeated trials. See [Agent tool & trajectory evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md). |
| Barres et al. (2025), [τ²-Bench: Evaluating Conversational Agents in a Dual-Control Environment](https://arxiv.org/abs/2506.07982) · [repo](https://github.com/sierra-research/tau2-bench) | 2506.07982 | Evaluates conversational agents when both the user and the agent act on a shared environment. |
| Chen et al. (2021), [Evaluating Large Language Models Trained on Code (Codex)](https://arxiv.org/abs/2107.03374) | 2107.03374 | Introduces HumanEval and the unbiased `pass@k` estimator. Compare with `pass^k` from τ-bench. |
| Patil et al. (2023), [Gorilla: Large Language Model Connected with Massive APIs](https://arxiv.org/abs/2305.15334) | 2305.15334 | Introduces Gorilla, a retrieval-aware API-calling model, and the APIBench dataset. |
| Patil et al. (2025), *The Berkeley Function Calling Leaderboard (BFCL): From Tool Use to Agentic Evaluation of Large Language Models*, ICML 2025 · [leaderboard](https://gorilla.cs.berkeley.edu/leaderboard.html) | – | Describes the BFCL benchmark for single, parallel, multi-turn, and agentic function calling. Not on arXiv. The citation is on the leaderboard page. |
| Lu et al. (2024), [ToolSandbox: A Stateful, Conversational, Interactive Evaluation Benchmark for LLM Tool Use Capabilities](https://arxiv.org/abs/2408.04682) | 2408.04682 | Adds stateful tools, implicit state dependencies, a user simulator, and milestone-based scoring of trajectories. |
| Trivedi et al. (2024), [AppWorld: A Controllable World of Apps and People for Benchmarking Interactive Coding Agents](https://arxiv.org/abs/2407.18901) · [site](https://appworld.dev/) | 2407.18901 | Tests agents on multi-app tasks through APIs. Uses state-based unit tests that also check for collateral damage. |
| Liu et al. (2023), [AgentBench: Evaluating LLMs as Agents](https://arxiv.org/abs/2308.03688) | 2308.03688 | Benchmarks LLM agents across eight interactive environments, including operating systems, databases, and the web. |
| Zhou et al. (2023), [WebArena: A Realistic Web Environment for Building Autonomous Agents](https://arxiv.org/abs/2307.13854) | 2307.13854 | Provides fully functional websites in four domains with functional task checks. The base for many web-agent benchmarks. |
| Xie et al. (2024), [OSWorld: Benchmarking Multimodal Agents for Open-Ended Tasks in Real Computer Environments](https://arxiv.org/abs/2404.07972) | 2404.07972 | Runs computer-use agents in real Ubuntu, Windows, and macOS environments. Grades each task with an execution-based script. |
| Mialon et al. (2023), [GAIA: a benchmark for General AI Assistants](https://arxiv.org/abs/2311.12983) · [HF](https://huggingface.co/gaia-benchmark) | 2311.12983 | Tests real-world questions that are simple for humans but require tool use, browsing, and multi-step reasoning for AI. |
| Wei et al. (2025), [BrowseComp: A Simple Yet Challenging Benchmark for Browsing Agents](https://arxiv.org/abs/2504.12516) | 2504.12516 | Provides 1,266 questions with hard-to-find answers that are short and easy to verify. |
| Jimenez et al. (2023), [SWE-bench: Can Language Models Resolve Real-World GitHub Issues?](https://arxiv.org/abs/2310.06770) · [site](https://www.swebench.com/) | 2310.06770 | Grades coding agents on real GitHub issues using unit test execution. Models outcome-based agent evaluation. |
| Xu et al. (2024), [TheAgentCompany: Benchmarking LLM Agents on Consequential Real World Tasks](https://arxiv.org/abs/2412.14161) | 2412.14161 | Simulates a small software company with internal sites and simulated coworkers. Long-horizon tasks remain hard. |
| Wang et al. (2025), [MCP-Bench: Benchmarking Tool-Using LLM Agents with Complex Real-World Tasks via MCP Servers](https://arxiv.org/abs/2508.20453) | 2508.20453 | Tests multi-step tasks over real MCP servers. Scores schema use, trajectory planning, and task completion. |
| Luo et al. (2025), [MCP-Universe: Benchmarking Large Language Models with Real-World Model Context Protocol Servers](https://arxiv.org/abs/2508.14704) | 2508.14704 | Uses execution-based evaluators over 11 real MCP servers. Top models complete fewer than half of the tasks. |
| Zhuge et al. (2024), [Agent-as-a-Judge: Evaluate Agents with Agents](https://arxiv.org/abs/2410.10934) | 2410.10934 | Uses an agent to grade intermediate steps of other agents. Reports agreement close to human evaluators on the DevAI benchmark. |
| Cemri et al. (2025), [Why Do Multi-Agent LLM Systems Fail? (MAST)](https://arxiv.org/abs/2503.13657) | 2503.13657 | Defines 14 failure modes in 3 categories: system design issues, inter-agent misalignment, and task verification. See [failure modes](../00-foundations/03-agentic-rag-failure-modes.md). |
| Zhu et al. (2025), [Establishing Best Practices for Building Rigorous Agentic Benchmarks (ABC)](https://arxiv.org/abs/2507.02825) | 2507.02825 | Finds task and reward flaws that misstate agent performance by up to 100% relative. Provides the Agentic Benchmark Checklist. |
| Kapoor et al. (2025), [Holistic Agent Leaderboard: The Missing Infrastructure for AI Agent Evaluation (HAL)](https://arxiv.org/abs/2510.11977) · [site](https://hal.cs.princeton.edu/) | 2510.11977 | Runs a standard harness across models, scaffolds, and benchmarks and reports cost with accuracy. Log review finds shortcut behaviors. |
| Kwa et al. (2025), [Measuring AI Ability to Complete Long Software Tasks](https://arxiv.org/abs/2503.14499) | 2503.14499 | Defines the 50% task-completion time horizon: the human task length at which an agent succeeds half the time. Reports that this horizon doubled about every seven months since 2019. |
| Yehudai et al. (2025), [Survey on Evaluation of LLM-based Agents](https://arxiv.org/abs/2503.16416) | 2503.16416 | Surveys agent capabilities, task benchmarks, and evaluation frameworks. |

## 9. Evaluation statistics and experiment design

| Paper | arXiv | Annotation |
|---|---|---|
| Miller (2024), [Adding Error Bars to Evals: A Statistical Approach to Language Model Evaluations](https://arxiv.org/abs/2411.00640) | 2411.00640 | Treats evals as experiments. Gives formulas for standard errors, clustered questions, paired model comparisons, and power analysis. |
| Angelopoulos et al. (2023), [Prediction-Powered Inference](https://arxiv.org/abs/2301.09633) · [ppi_py](https://github.com/aangelopoulos/ppi_py) | 2301.09633 | Combines a small human-labeled set with many model predictions to get valid confidence intervals. Use it to correct judge-estimated rates. |
| Angelopoulos et al. (2023), [PPI++: Efficient Prediction-Powered Inference](https://arxiv.org/abs/2311.01453) | 2311.01453 | Improves PPI so that its intervals are never wider than intervals from labeled data alone. |
| Atil et al. (2024), [Non-Determinism of "Deterministic" LLM Settings](https://arxiv.org/abs/2408.04667) | 2408.04667 | Shows that accuracy varies by up to 15% across runs with settings that should be deterministic. Introduces total agreement rate metrics (TARr@N, TARa@N). |
| Johari et al. (2015), [Always Valid Inference: Bringing Sequential Analysis to A/B Testing](https://arxiv.org/abs/1512.04922) | 1512.04922 | Gives p-values and intervals that stay valid when you monitor an A/B test continuously. |
| Deng et al. (2018), [Applying the Delta method in metric analytics: A practical guide with novel ideas](https://arxiv.org/abs/1803.06336) | 1803.06336 | Explains the delta method for ratio metrics in online experiments, such as per-session rates. |
| Manheim & Garrabrant (2018), [Categorizing Variants of Goodhart's Law](https://arxiv.org/abs/1803.04585) | 1803.04585 | Names four ways a metric fails under optimization pressure. Read it before you set eval targets. |

### Classic statistics and IR references (non-arXiv)

| Reference | Link | Used for |
|---|---|---|
| Landis & Koch (1977), *The Measurement of Observer Agreement for Categorical Data*, Biometrics | [doi:10.2307/2529310](https://doi.org/10.2307/2529310) | Conventional kappa interpretation bands. |
| Fleiss (1971), *Measuring nominal scale agreement among many raters*, Psychological Bulletin | [doi:10.1037/h0031619](https://doi.org/10.1037/h0031619) | Fleiss' kappa for a fixed number of raters. |
| Hayes & Krippendorff (2007), *Answering the Call for a Standard Reliability Measure for Coding Data* | [doi:10.1080/19312450709336664](https://doi.org/10.1080/19312450709336664) | Krippendorff's alpha for any number of raters and missing labels. |
| Feinstein & Cicchetti (1990), *High agreement but low kappa: I. The problems of two paradoxes* | [doi:10.1016/0895-4356(90)90158-L](https://doi.org/10.1016/0895-4356(90)90158-L) | The kappa prevalence paradox. |
| Byrt, Bishop & Carlin (1993), *Bias, prevalence and kappa* | [doi:10.1016/0895-4356(93)90018-V](https://doi.org/10.1016/0895-4356(93)90018-V) | Prevalence- and bias-adjusted kappa. |
| Gwet (2008), *Computing inter-rater reliability and its variance in the presence of high agreement* | [doi:10.1348/000711006X126600](https://doi.org/10.1348/000711006X126600) | Gwet's AC1 for imbalanced classes. |
| Brown, Cai & DasGupta (2001), *Interval Estimation for a Binomial Proportion*, Statistical Science | [doi:10.1214/ss/1009213286](https://doi.org/10.1214/ss/1009213286) | Use Wilson intervals, not Wald intervals, for pass rates. |
| Hanley & Lippman-Hand (1983), *If Nothing Goes Wrong, Is Everything All Right?*, JAMA | [doi:10.1001/jama.1983.03330370053031](https://doi.org/10.1001/jama.1983.03330370053031) | Rule of three: zero failures in n cases gives a 95% upper bound of about 3/n. |
| Rogan & Gladen (1978), *Estimating prevalence from the results of a screening test* | [doi:10.1093/oxfordjournals.aje.a112510](https://doi.org/10.1093/oxfordjournals.aje.a112510) | Corrects a judge-measured rate for judge sensitivity and specificity. |
| Connor (1987), *Sample Size for Testing Differences in Proportions for the Paired-Sample Design*, Biometrics | [doi:10.2307/2531961](https://doi.org/10.2307/2531961) | Sample size for paired (McNemar) model comparisons. |
| Benjamini & Hochberg (1995), *Controlling the False Discovery Rate* | [doi:10.1111/j.2517-6161.1995.tb02031.x](https://doi.org/10.1111/j.2517-6161.1995.tb02031.x) | Multiple-comparison control across many eval slices. |
| Schenker & Gentleman (2001), *On Judging the Significance of Differences by Examining the Overlap Between Confidence Intervals* | [doi:10.1198/000313001317097960](https://doi.org/10.1198/000313001317097960) | Overlapping intervals do not prove "no difference". |
| Horvitz & Thompson (1952), *A Generalization of Sampling Without Replacement from a Finite Universe* | [doi:10.1080/01621459.1952.10483446](https://doi.org/10.1080/01621459.1952.10483446) | Inverse-probability weights for stratified production sampling. |
| Deng et al. (2013), *Improving the Sensitivity of Online Controlled Experiments by Utilizing Pre-Experiment Data (CUPED)* | [doi:10.1145/2433396.2433413](https://doi.org/10.1145/2433396.2433413) | Variance reduction for online A/B tests. |
| Kendall (1938), *A New Measure of Rank Correlation*, Biometrika | [doi:10.1093/biomet/30.1-2.81](https://doi.org/10.1093/biomet/30.1-2.81) | Kendall's tau for judge-human rank agreement. |
| Gretton et al. (2012), *A Kernel Two-Sample Test*, JMLR | [jmlr.org](https://jmlr.org/papers/v13/gretton12a.html) | Maximum mean discrepancy (MMD) for drift and synthetic-data checks. |
| Järvelin & Kekäläinen (2002), *Cumulated gain-based evaluation of IR techniques*, ACM TOIS | [doi:10.1145/582415.582418](https://doi.org/10.1145/582415.582418) | Origin of (n)DCG. |
| Burges et al. (2005), *Learning to rank using gradient descent*, ICML | [doi:10.1145/1102351.1102363](https://doi.org/10.1145/1102351.1102363) | Introduces RankNet and popularized the exponential gain form of nDCG. |
| Chapelle et al. (2009), *Expected reciprocal rank for graded relevance*, CIKM | [doi:10.1145/1645953.1646033](https://doi.org/10.1145/1645953.1646033) | Expected reciprocal rank (ERR), a cascade-model metric. |
| Moffat & Zobel (2008), *Rank-biased precision for measurement of retrieval effectiveness*, ACM TOIS | [doi:10.1145/1416950.1416952](https://doi.org/10.1145/1416950.1416952) | Rank-biased precision (RBP) with a user persistence parameter. |
| Buckley & Voorhees (2004), *Retrieval evaluation with incomplete information*, SIGIR | [doi:10.1145/1008992.1009000](https://doi.org/10.1145/1008992.1009000) | Introduces bpref for incomplete relevance judgments. |
| Sakai (2007), *Alternatives to Bpref*, SIGIR | [doi:10.1145/1277741.1277756](https://doi.org/10.1145/1277741.1277756) | Condensed-list metrics as a better option than bpref with incomplete labels. |
| Smucker, Allan & Carterette (2007), *A comparison of statistical significance tests for information retrieval evaluation*, CIKM | [doi:10.1145/1321440.1321528](https://doi.org/10.1145/1321440.1321528) | Prefers randomization, bootstrap, or t-tests over sign and Wilcoxon tests. |

## 10. Datasets, labels and drift

| Paper | arXiv | Annotation |
|---|---|---|
| Northcutt et al. (2019), [Confident Learning: Estimating Uncertainty in Dataset Labels](https://arxiv.org/abs/1911.00068) | 1911.00068 | Finds likely label errors from model confidence. The method behind cleanlab. |
| Northcutt et al. (2021), [Pervasive Label Errors in Test Sets Destabilize Machine Learning Benchmarks](https://arxiv.org/abs/2103.14749) | 2103.14749 | Finds label errors in 10 common test sets. Small error rates can change model rankings. Audit your golden set. |
| Gebru et al. (2018), [Datasheets for Datasets](https://arxiv.org/abs/1803.09010) | 1803.09010 | Proposes a standard document for dataset motivation, composition, collection, and use. |
| Pushkarna et al. (2022), [Data Cards: Purposeful and Transparent Dataset Documentation for Responsible AI](https://arxiv.org/abs/2204.01075) | 2204.01075 | Gives a structured dataset summary format and lessons from over 20 deployed Data Cards. |
| Xu et al. (2023), [WizardLM: Empowering Large Pre-Trained Language Models to Follow Complex Instructions (Evol-Instruct)](https://arxiv.org/abs/2304.12244) | 2304.12244 | Introduces Evol-Instruct, which rewrites seed instructions into harder variants. A pattern for synthetic eval data. |
| Lopez-Paz & Oquab (2016), [Revisiting Classifier Two-Sample Tests](https://arxiv.org/abs/1610.06545) | 1610.06545 | Uses a classifier to test whether two samples come from the same distribution. Use it to compare synthetic and real queries. |
| Rabanser et al. (2018), [Failing Loudly: An Empirical Study of Methods for Detecting Dataset Shift](https://arxiv.org/abs/1810.11953) | 1810.11953 | Compares shift detectors. Two-sample tests on reduced representations work best. |
| Chen et al. (2023), [How is ChatGPT's behavior changing over time?](https://arxiv.org/abs/2307.09009) | 2307.09009 | Shows large behavior changes between versions of the same hosted model. Monitor continuously and pin versions. |

## 11. Benchmarks and leaderboards

Public benchmarks help you **shortlist models and embeddings**. They never replace evaluations on your own domain data.

| Benchmark | Link | What it measures | Relevance to the running example |
|---|---|---|---|
| **BEIR** | [arXiv 2104.08663](https://arxiv.org/abs/2104.08663) | Zero-shot retrieval across 18 datasets | Shortlist candidate retrievers and rerankers. |
| **MTEB** | [arXiv 2210.07316](https://arxiv.org/abs/2210.07316) · [leaderboard](https://huggingface.co/spaces/mteb/leaderboard) | Embedding models across retrieval, clustering, classification, and more | Shortlist embedding models for your target languages and retrieval tasks. |
| **CRAG / FRAMES / FACTS Grounding** | [arXiv 2406.04744](https://arxiv.org/abs/2406.04744) · [arXiv 2409.12941](https://arxiv.org/abs/2409.12941) · [arXiv 2501.03200](https://arxiv.org/abs/2501.03200) | End-to-end RAG accuracy, multi-hop retrieval, and long-document grounding | Shortlist generator models for grounded answers. |
| **BFCL** | [leaderboard](https://gorilla.cs.berkeley.edu/leaderboard.html) | Function calling across single, parallel, multi-turn, and agentic (V4) tasks | Choose a model for reliable tool calls like `create_ticket`. |
| **τ-bench / τ²-bench** | [taubench.com](https://taubench.com) | Policy-bound tool use with simulated users and `pass^k` scoring | Closest public benchmark to policy-bound enterprise agents. |
| **MCP-Bench / MCP-Universe** | [arXiv 2508.20453](https://arxiv.org/abs/2508.20453) · [arXiv 2508.14704](https://arxiv.org/abs/2508.14704) | Multi-step tasks over real MCP servers | Check tool use through MCP servers. |
| **BIRD / Spider 2.0 / BIRD-Interact** | [bird-bench.github.io](https://bird-bench.github.io/) · [spider2-sql.github.io](https://spider2-sql.github.io/) · [bird-interact.github.io](https://bird-interact.github.io/) | Text-to-SQL accuracy on realistic enterprise databases, including multi-turn clarification | Choose a generator model for your SQL tool. |
| **GAIA** | [huggingface.co/gaia-benchmark](https://huggingface.co/gaia-benchmark) | General assistant tasks that require multi-step tool use | Check general multi-step agent capability. |
| **HAL** | [hal.cs.princeton.edu](https://hal.cs.princeton.edu/) | Cost and accuracy across agent benchmarks with one harness | Compare agents on cost as well as accuracy. |
| **AgentDojo / AgentHarm / ASB** | [AgentDojo repo](https://github.com/ethz-spylab/agentdojo) · [arXiv 2410.09024](https://arxiv.org/abs/2410.09024) · [arXiv 2410.02644](https://arxiv.org/abs/2410.02644) | Agent utility under prompt injection and harmful-task refusal | Check agent security before you enable write tools. |
| **HarmBench / JailbreakBench** | [harmbench.org](https://www.harmbench.org/) · [jailbreakbench.github.io](https://jailbreakbench.github.io/) | Jailbreak attack success and refusal robustness | Compare base models and guard models. |
| **SWE-bench** | [swebench.com](https://www.swebench.com/) | Resolving real-world GitHub issues | Relevant for coding agents, not enterprise RAG assistants. |
| **AgentBench** | [arXiv 2308.03688](https://arxiv.org/abs/2308.03688) | Agent performance across 8 interactive environments | Check broad agent capability across diverse environments. |
| **HELM** | [crfm.stanford.edu/helm](https://crfm.stanford.edu/helm/) · [arXiv 2211.09110](https://arxiv.org/abs/2211.09110) | Holistic model evaluation across scenarios and metrics | Select base models and design multi-metric scorecards. |

## 12. Practitioner blogs and essays

| Author | Post | Annotation |
|---|---|---|
| Hamel Husain | [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) | Explains how to layer unit assertions, human and LLM evals, and A/B tests by inspecting real data first. |
| Hamel Husain | [Using LLM-as-a-Judge For Evaluation: A Complete Guide](https://hamel.dev/blog/posts/llm-judge/) (originally "Creating a LLM-as-a-Judge That Drives Business Results") | Teaches critique shadowing: have one domain expert write binary pass/fail critiques and align the judge iteratively. |
| Hamel Husain | [A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/) | Focuses on error analysis, custom data viewers, domain expert labeling, and experiment-driven roadmaps. |
| Hamel Husain & Shreya Shankar | [AI Evals: Everything You Need to Know (FAQ)](https://hamel.dev/blog/posts/evals-faq/) | Answers the most common practical evaluation questions from their cohort course. |
| Eugene Yan | [Patterns for Building LLM-based Systems & Products](https://eugeneyan.com/writing/llm-patterns/) | Catalogs practical patterns for evals, RAG, fine-tuning, caching, guardrails, defensive UX, and user feedback. |
| Eugene Yan | [Task-Specific LLM Evals that Do & Don't Work](https://eugeneyan.com/writing/evals/) | Recommends specific evaluation metrics for classification, summarization, translation, copyright, and toxicity. |
| Eugene Yan | [Evaluating the Effectiveness of LLM-Evaluators (aka LLM-as-Judge)](https://eugeneyan.com/writing/llm-evaluators/) | Surveys LLM judge research and explains when you can trust automated evaluators. |
| Eugene Yan | [An LLM-as-Judge Won't Save The Product: Fixing Your Process Will](https://eugeneyan.com/writing/eval-process/) | Shows why evaluation is an iterative process of observing, annotating, and experimenting rather than a tool purchase. |
| Anthropic | [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) | Contrasts deterministic workflows with autonomous agents and explains routing, chaining, and evaluator-optimizer loops. |
| Anthropic (2026) | [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Offers practical guidance on agent graders, task design, and outcome evaluation versus transcript evaluation. Applies across model providers. |
| Anthropic (2025) | [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Treats context as a limited budget. Explains context rot, compaction, and just-in-time retrieval for agents. |
| Anthropic (2025) | [A postmortem of three recent issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues) | Describes three infrastructure bugs that silently degraded response quality. Shows why you need continuous quality evals in production. |
| Thinking Machines Lab (2025) | [Defeating Nondeterminism in LLM Inference](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/) | Traces temperature-0 variation to inference kernels that are not batch-invariant, not only to floating-point concurrency. |
| Simon Willison | [The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) | Explains why combining private data, untrusted content, and external communication creates exfiltration risk unless you remove one leg. |
| Simon Willison | [New prompt injection papers: Agents Rule of Two and The Attacker Moves Second](https://simonwillison.net/2025/Nov/2/new-prompt-injection-papers/) | Compares the Agents Rule of Two with the lethal trifecta and summarizes the adaptive-attack results. |
| Simon Willison | [Prompt injection series](https://simonwillison.net/series/prompt-injection/) | Tracks prompt injection attacks and defenses since 2022 and explains why the problem remains unsolved. |
| Simon Willison | [The Dual LLM pattern for building AI assistants that can resist prompt injection](https://simonwillison.net/2023/Apr/25/dual-llm-pattern/) | Separates privileged and quarantined LLMs and inspired later architectural security papers. |
| Yan, Bischof, Frye, Husain, Liu, Shankar | [What We've Learned From A Year of Building with LLMs](https://applied-llms.org/) | Distills tactical, operational, and strategic engineering lessons from production LLM systems. |
| Jason Liu | [Systematically Improving Your RAG](https://jxnl.co/writing/2024/05/22/systematically-improving-your-rag/) | Shows how to bootstrap synthetic questions, optimize retrieval recall first, and segment queries by cohort. |
| Shreya Shankar | [Personal site and papers](https://www.sh-reya.com/) | Collects research on evaluation tooling, criteria drift, and data-centric LLM pipelines. |

## 13. Vendor guides worth reading (tool-agnostic content)

| Source | Link | Annotation |
|---|---|---|
| OpenAI | [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) | Covers eval-driven development, grader types, and architecture-specific evaluation pitfalls. |
| OpenAI | [Cookbook](https://developers.openai.com/cookbook) | Provides runnable code examples for evaluations, RAG pipelines, and runtime guardrails. |
| OpenAI | [Model Spec](https://model-spec.openai.com/) | Defines the chain of command between platform, developer, and user instructions and how models treat tool output. Useful for writing judge rubrics. |
| Google | [Site Reliability Engineering](https://sre.google/sre-book/embracing-risk/) and [SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/) | Explains error budgets and multi-window burn-rate alerts. Apply them to online eval scores. |

## 14. Standards, frameworks and regulation

| Standard | Link | Annotation |
|---|---|---|
| **OWASP Top 10 for LLM Applications 2026** | [genai.owasp.org](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/) | Covers LLM01:2026 Prompt Injection through LLM10:2026 Improper Output Handling (published August 2026). Serves as the shared vocabulary for security reviews. See the 2025→2026 mapping in [Threat model & OWASP](../04-guardrails/07-threat-model-owasp.md). |
| **OWASP Top 10 for LLM Applications 2025** | [genai.owasp.org](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/) | The previous edition. Keep it to map older findings and tool reports to 2026 IDs. |
| **OWASP Top 10 for Agentic Applications (2026)** | [genai.owasp.org](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) | Defines ASI01 Agent Goal Hijack through ASI10 Rogue Agents (published December 2025), including tool misuse, privilege abuse, and memory poisoning. |
| **OWASP Agentic AI – Threats and Mitigations** | [genai.owasp.org](https://genai.owasp.org/resource/agentic-ai-threats-and-mitigations/) | Provides the detailed agentic threat taxonomy (T1–T15) from the OWASP Agentic Security Initiative. |
| **OWASP Securing Agentic Applications Guide 1.0** | [genai.owasp.org](https://genai.owasp.org/resource/securing-agentic-applications-guide-1-0/) | Gives technical controls for agent architecture, development, and deployment. |
| **OWASP Agentic Threats Navigator** | [genai.owasp.org](https://genai.owasp.org/resource/owasp-gen-ai-security-project-agentic-threats-navigator/) | Maps agentic threats to architecture components for threat modeling. |
| **OWASP AI Testing Guide** | [owasp.org](https://owasp.org/www-project-ai-testing-guide/) | Gives a test methodology for AI systems, including security, robustness, and data tests. |
| **OWASP MCP Security Cheat Sheet** | [cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html) | Lists practical controls for MCP clients and servers, such as tool pinning, least privilege, and input validation. |
| **NIST AI Risk Management Framework (AI RMF 1.0)** | [nist.gov](https://www.nist.gov/itl/ai-risk-management-framework) | Organizes risk around Govern, Map, Measure, and Manage. Most enterprises map their AI controls to this framework. |
| **NIST AI 600-1: Generative AI Profile** | [nvlpubs.nist.gov (PDF)](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf) | Details generative AI risks like confabulation, information security, and data privacy with actions mapped to the AI RMF. |
| **NIST AI 100-2 E2025: Adversarial Machine Learning** | [csrc.nist.gov](https://csrc.nist.gov/pubs/ai/100/2/e2025/final) | Defines a taxonomy and terms for attacks on predictive and generative AI, including direct and indirect prompt injection. |
| **MITRE ATLAS** | [atlas.mitre.org](https://atlas.mitre.org/) | Documents adversary tactics and techniques against AI systems in an ATT&CK-style matrix for red-team planning. |
| **CSA MAESTRO** | [cloudsecurityalliance.org](https://cloudsecurityalliance.org/blog/2025/02/06/agentic-ai-threat-modeling-framework-maestro) | Gives a layered threat-modeling framework for agentic AI systems. |
| **Google Secure AI Framework (SAIF)** | [saif.google](https://saif.google/) | Lists AI security risks and controls across the model and application lifecycle. |
| **ISO/IEC 42001:2023** | [iso.org](https://www.iso.org/standard/42001) | Defines a certifiable AI management system standard where your evals and guardrails serve as control evidence. |
| **EU AI Act (Regulation (EU) 2024/1689)** | [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2024/1689/oj) | Sets risk-based obligations. High-risk systems need risk management, logging, accuracy, robustness, and cybersecurity evidence. Employment uses are high-risk. |
| **EU General-Purpose AI Code of Practice** | [digital-strategy.ec.europa.eu](https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai) | Gives a voluntary way for GPAI model providers to show AI Act compliance on transparency, copyright, and safety. Relevant when you assess model vendors. |

### Protocol, identity and telemetry specifications

| Specification | Link | Annotation |
|---|---|---|
| **Model Context Protocol (MCP) specification** | [modelcontextprotocol.io](https://modelcontextprotocol.io/specification/latest) | The current version is 2026-07-28 (stateless). Defines tools, resources, prompts, and authorization for agent integrations. |
| **MCP security best practices** | [modelcontextprotocol.io](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices) | Covers confused-deputy attacks, token passthrough, session hijacking, and server-side request forgery. |
| **RFC 8707: Resource Indicators for OAuth 2.0** | [rfc-editor.org](https://www.rfc-editor.org/rfc/rfc8707) | Binds access tokens to one resource server. MCP authorization uses it to stop token reuse. |
| **RFC 8693: OAuth 2.0 Token Exchange** | [rfc-editor.org](https://www.rfc-editor.org/rfc/rfc8693) | Exchanges a user token for a narrower downstream token. Use it for on-behalf-of tool calls. |
| **SPIFFE** | [spiffe.io](https://spiffe.io/) | Gives workloads, including agents, cryptographic identities. |
| **OpenTelemetry GenAI semantic conventions** | [GitHub](https://github.com/open-telemetry/semantic-conventions-genai) | Defines span and attribute names for LLM, agent, and tool calls. Status is Development. See [Observability & tracing](../03-online-evals-and-observability/02-observability-and-tracing.md). |

## 15. Courses and books

| Resource | Link | Annotation |
|---|---|---|
| Chip Huyen, *AI Engineering* (O'Reilly, 2025) | [oreilly.com](https://www.oreilly.com/library/view/ai-engineering/9781098166298/) · [book repo](https://github.com/chiphuyen/aie-book) | Covers building applications on foundation models with strong chapters on evaluation methodology and AI-as-a-judge. |
| Hamel Husain & Shreya Shankar, *AI Evals For Engineers & PMs* | [maven.com/parlance-labs/evals](https://maven.com/parlance-labs/evals) | Teaches error analysis, judge calibration, and evaluation pipelines in a cohort course. |
| DeepLearning.AI, *Building and Evaluating Advanced RAG* | [deeplearning.ai](https://www.deeplearning.ai/courses/building-evaluating-advanced-rag) | Demonstrates advanced retrieval techniques and the RAG triad using TruLens. |
| DeepLearning.AI, *Evaluating AI Agents* | [deeplearning.ai](https://www.deeplearning.ai/courses/evaluating-ai-agents) | Shows how to evaluate agent components and multi-step trajectories using Arize Phoenix. |
| DeepLearning.AI, *Quality and Safety for LLM Applications* | [deeplearning.ai](https://www.deeplearning.ai/courses/quality-safety-llm-applications) | Covers monitoring for hallucinations, data leakage, prompt injection, and toxicity. |
| DeepLearning.AI, *Red Teaming LLM Applications* | [deeplearning.ai](https://www.deeplearning.ai/courses/red-teaming-llm-applications) | Introduces manual and automated red teaming for LLM applications using Giskard. |

## 16. Where each reference is used in this repo

| Topic in this repo | Start with |
|---|---|
| [Why evals and guardrails](../00-foundations/01-why-evals-and-guardrails.md) | Goodhart variants, Codex `pass@k`, Agents Rule of Two, EU AI Act |
| [Failure modes](../00-foundations/03-agentic-rag-failure-modes.md) | Seven Failure Points, MAST, MCP tool poisoning, context engineering |
| [Agent archetypes](../00-foundations/05-agent-archetypes.md) | WebArena, OSWorld, METR time horizon, τ-bench |
| [Datasets](../01-datasets/README.md) | Hamel's field guide, Jason Liu on synthetic questions, label errors, Datasheets, Data Cards, Evol-Instruct, classifier two-sample tests, agreement statistics |
| [End-to-end RAG evals](../02-offline-evals/01-end-to-end-rag-evals.md) | RAGAS, ARES, RAGChecker, Seven Failure Points, CRAG, FRAMES, RAGTruth |
| [Retrieval metrics](../02-offline-evals/02-retrieval-metrics.md) | BEIR, MTEB, Lost in the Middle, HotpotQA, MuSiQue, nDCG/ERR/RBP classics |
| [Generation quality & safety](../02-offline-evals/03-generation-quality-and-safety-evals.md) | FActScore, SelfCheckGPT, BERTScore, Llama Guard, XSTest, BBQ, BIPIA |
| [Agent tool & trajectory evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md) | τ-bench, τ²-bench, Gorilla, BFCL, Codex `pass@k`, Anthropic agent evals |
| [Agent eval environments & graders](../02-offline-evals/09-agent-eval-environments-and-graders.md) | WebArena, OSWorld, τ-bench, SWE-bench, METR time horizon |
| [Text-to-SQL evals](../02-offline-evals/05-text-to-sql-evals.md) | Spider, test-suite accuracy, BIRD, Spider 2.0, AmbiQT, AMBROSIA, BIRD-Interact |
| [Instruction & citation adherence](../02-offline-evals/06-instruction-and-citation-adherence.md) | IFEval, IFBench, InFoBench, FollowBench, Multi-IF, ALCE, AIS, AttributionBench, LongCite, L-CiteEval |
| [LLM-as-a-judge](../02-offline-evals/07-llm-as-a-judge.md) | MT-Bench judging, G-Eval, Who Validates the Validators, PoLL, Prometheus, CALM, JudgeDeceiver, PPI, Hamel's judge guide |
| [Running offline experiments](../02-offline-evals/08-running-offline-experiments.md) | Miller error bars, Codex `pass@k`, classic statistics |
| [Online evals & observability](../03-online-evals-and-observability/README.md) | PPI, always-valid inference, delta method, non-determinism, Failing Loudly, ChatGPT drift, SRE burn-rate alerts, OTel GenAI |
| [Guardrails](../04-guardrails/README.md) | Greshake, Spotlighting, StruQ, SecAlign, PoisonedRAG, LlamaFirewall, Attacker Moves Second, Design Patterns, CaMeL, lethal trifecta, OWASP |
| [Tool & action guardrails](../04-guardrails/05-tool-and-action-guardrails.md) | Agents Rule of Two, ASB, MCP spec and security best practices, OWASP MCP cheat sheet, RFC 8707 |
| [Threat model](../04-guardrails/07-threat-model-owasp.md) | OWASP LLM Top 10 2026 + Agentic Top 10, MITRE ATLAS, NIST AI 600-1, EU AI Act |
| [Guardrail tools](../06-tooling-landscape/02-guardrail-tools.md) | WildGuard, Qwen3Guard, NemoGuard, HarmBench, JailbreakBench, AgentHarm |
| [Maturity model](../05-decision-framework/05-maturity-model.md) | NIST AI RMF, ISO/IEC 42001, Google SAIF |

---

## Key takeaways

- **Build on four stable research pillars:** Retrieve then generate (Lewis), verify atomic claims (FActScore, RAGAS), align biased judges with humans (Zheng, Shankar), and solve injection architecturally (Greshake, Willison, CaMeL).
- **Report uncertainty:** Put confidence intervals on every eval score (Miller), and correct judge-measured rates with PPI or Rogan–Gladen.
- **Distrust defense claims that skip adaptive attacks:** Adaptive attackers break most published detectors and fine-tuning defenses (Nasr, Zhan). Limit agent capabilities by design (Rule of Two, CaMeL).
- **Follow the practitioner consensus:** Inspect your data, perform error analysis, and design evaluations before you buy or adopt tools.
- **Use public benchmarks only for model shortlisting:** Test application quality on your own domain datasets.
- **Map your controls to recognized standards:** Use OWASP, NIST, MITRE ATLAS, ISO/IEC 42001, and the EU AI Act to communicate with security and compliance teams.
- **Re-check links and versions regularly:** This reading list reflects an October 2026 snapshot.

## Further reading

- [Tooling landscape](../06-tooling-landscape/README.md): tools that implement the ideas in these papers
- [Glossary](../00-foundations/04-glossary.md): plain-language definitions of terms from the literature
- [Metric cheatsheet](../05-decision-framework/03-metric-cheatsheet.md): metrics from these papers summarized in one table
- [Implementation playbook](../05-decision-framework/04-implementation-playbook.md): step-by-step rollout plan for putting this research into production
