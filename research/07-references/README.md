# References: A Curated Reading List

> **TL;DR**
> - **Start with the 10-item starter path.** Read the foundational papers and practitioner essays before diving into specialized topics.
> - **Trace every metric and defense to its source.** Use this annotated index to find the research behind RAG metrics, judges, and guardrails.
> - **Use public benchmarks only to shortlist models.** Rely on your own domain datasets to evaluate your application.
> - **Map your controls to industry standards.** Connect your evals and guardrails to OWASP, NIST, MITRE ATLAS, and ISO 42001 for reviews.

**You will learn:** Which papers and essays are worth your time · Where each metric and practice comes from · Which standards map to which risks · Which benchmarks fit agentic RAG  
**Prerequisites:** None — use this list alongside any section  
**Related:** [Tooling landscape](../06-tooling-landscape/README.md), [Glossary](../00-foundations/04-glossary.md), [Metric cheatsheet](../05-decision-framework/03-metric-cheatsheet.md)

---

## How to use this list

- Read the **one-line annotation** on each entry to see how it applies to an agentic RAG app with docs RAG, text-to-SQL, tools, and RBAC.
- Follow the arXiv abstract links and use the listed arXiv IDs when you cite papers.
- Expect occasional title changes on practitioner blog posts. All URLs were verified in October 2026.
- Check [Eval & observability tools](../06-tooling-landscape/01-eval-and-observability-tools.md) and [Guardrail tools](../06-tooling-landscape/02-guardrail-tools.md) for direct links to tool documentation.

## If you only read ten things

| # | Read | Why first |
|---|---|---|
| 1 | Hamel Husain — [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) | Makes the case for error analysis before adopting eval tools. |
| 2 | Applied LLMs — [What We've Learned From A Year of Building with LLMs](https://applied-llms.org/) | Summarizes tactical, operational, and strategic lessons in one guide. |
| 3 | Anthropic — [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) | Explains simple agent patterns and when not to build an agent. |
| 4 | Eugene Yan — [Task-Specific LLM Evals that Do & Don't Work](https://eugeneyan.com/writing/evals/) | Shows which metrics are worth computing for each task. |
| 5 | Es et al. — [RAGAS](https://arxiv.org/abs/2309.15217) | Defines the core vocabulary of reference-free RAG metrics. |
| 6 | Zheng et al. — [Judging LLM-as-a-Judge](https://arxiv.org/abs/2306.05685) | Documents the judge biases you must control for. |
| 7 | Shankar et al. — [Who Validates the Validators?](https://arxiv.org/abs/2404.12272) | Explains criteria drift and how to align judges with human preferences. |
| 8 | Simon Willison — [The lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) | Shows why combining private data, untrusted content, and exfiltration paths creates core agent risk. |
| 9 | Beurer-Kellner et al. — [Design Patterns for Securing LLM Agents against Prompt Injections](https://arxiv.org/abs/2506.08837) | Provides architectural defenses that do not rely on detectors alone. |
| 10 | [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/) | Establishes the shared risk vocabulary for security reviews. |

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

## 2. RAG evaluation

| Paper | arXiv | Annotation |
|---|---|---|
| Es et al. (2023), [Ragas: Automated Evaluation of Retrieval Augmented Generation](https://arxiv.org/abs/2309.15217) | 2309.15217 | Defines reference-free faithfulness, answer relevance, and context relevance using an LLM. See [End-to-end RAG evals](../02-offline-evals/01-end-to-end-rag-evals.md). |
| Saad-Falcon et al. (2023), [ARES: An Automated Evaluation Framework for Retrieval-Augmented Generation Systems](https://arxiv.org/abs/2311.09476) | 2311.09476 | Trains lightweight judges on synthetic data and uses prediction-powered inference (PPI) with human labels for confidence intervals. |
| Ru et al. (2024), [RAGChecker: A Fine-grained Framework for Diagnosing Retrieval-Augmented Generation](https://arxiv.org/abs/2408.08067) | 2408.08067 | Uses claim-level metrics to separate retriever errors from generator errors. |
| Gao et al. (2023), [Enabling Large Language Models to Generate Text with Citations (ALCE)](https://arxiv.org/abs/2305.14627) | 2305.14627 | Introduces the benchmark and metrics for citation recall and citation precision. See [Instruction & citation adherence](../02-offline-evals/06-instruction-and-citation-adherence.md). |
| Liu et al. (2023), [Evaluating Verifiability in Generative Search Engines](https://arxiv.org/abs/2304.09848) | 2304.09848 | Audits generative search engines and shows that citations often fail to support generated claims. |
| Thakur et al. (2021), [BEIR: A Heterogenous Benchmark for Zero-shot Evaluation of Information Retrieval Models](https://arxiv.org/abs/2104.08663) | 2104.08663 | Provides the standard zero-shot retrieval benchmark and shows that in-domain retrieval scores rarely transfer. See [Retrieval metrics](../02-offline-evals/02-retrieval-metrics.md). |

## 3. LLM-as-a-judge

| Paper | arXiv | Annotation |
|---|---|---|
| Zheng et al. (2023), [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685) | 2306.05685 | Establishes strong LLM judges and documents position, verbosity, and self-enhancement biases. |
| Liu et al. (2023), [G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment](https://arxiv.org/abs/2303.16634) | 2303.16634 | Introduces chain-of-thought evaluation steps and probability-weighted scores. Forms the basis for G-Eval metrics across eval tools. |
| Wang et al. (2023), [Large Language Models are not Fair Evaluators](https://arxiv.org/abs/2305.17926) | 2305.17926 | Demonstrates position bias in pairwise judging and tests calibration fixes like swapping candidate order. |
| Shankar et al. (2024), [Who Validates the Validators? Aligning LLM-Assisted Evaluation of LLM Outputs with Human Preferences](https://arxiv.org/abs/2404.12272) | 2404.12272 | Explains criteria drift: humans refine rubrics while grading, so you must align judges iteratively with human labels. |
| Verga et al. (2024), [Replacing Judges with Juries: Evaluating LLM Generations with a Panel of Diverse Models (PoLL)](https://arxiv.org/abs/2404.18796) | 2404.18796 | Shows that a panel of smaller, diverse judges can beat one large judge on human agreement, cost, and bias. |
| Thakur et al. (2024), [Judging the Judges: Evaluating Alignment and Vulnerabilities in LLMs-as-Judges](https://arxiv.org/abs/2406.12624) | 2406.12624 | Measures judge-human alignment beyond raw percent agreement and shows sensitivity to prompt wording. |
| Gu et al. (2024), [A Survey on LLM-as-a-Judge](https://arxiv.org/abs/2411.15594) | 2411.15594 | Surveys judge design, reliability, and bias mitigation techniques. See [LLM-as-a-judge](../02-offline-evals/07-llm-as-a-judge.md). |

## 4. Hallucination, factuality and instruction following

| Paper | arXiv | Annotation |
|---|---|---|
| Manakul et al. (2023), [SelfCheckGPT: Zero-Resource Black-Box Hallucination Detection for Generative Large Language Models](https://arxiv.org/abs/2303.08896) | 2303.08896 | Detects hallucinations by measuring inconsistency across multiple sampled responses without retrieval or reference answers. |
| Min et al. (2023), [FActScore: Fine-grained Atomic Evaluation of Factual Precision in Long Form Text Generation](https://arxiv.org/abs/2305.14251) | 2305.14251 | Breaks answers into atomic facts and verifies each fact independently. Forms the pattern behind claim-level faithfulness metrics. |
| Zhou et al. (2023), [Instruction-Following Evaluation for Large Language Models (IFEval)](https://arxiv.org/abs/2311.07911) | 2311.07911 | Evaluates verifiable instructions like word limits and JSON formatting using deterministic code instead of LLM judges. |

## 5. Prompt injection, agent security and guardrails

| Paper | arXiv | Annotation |
|---|---|---|
| Perez & Ribeiro (2022), [Ignore Previous Prompt: Attack Techniques For Language Models](https://arxiv.org/abs/2211.09527) | 2211.09527 | Presents an early systematic study of goal hijacking and system prompt leaking. |
| Greshake et al. (2023), [Not what you've signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection](https://arxiv.org/abs/2302.12173) | 2302.12173 | Defines indirect prompt injection through retrieved content, which is the core security threat in RAG systems. |
| Hines et al. (2024), [Defending Against Indirect Prompt Injection Attacks With Spotlighting](https://arxiv.org/abs/2403.14720) | 2403.14720 | Uses delimiters, datamarking, and encoding on untrusted content to reduce indirect injection success. See [Retrieval & context guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md). |
| Wallace et al. (2024), [The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions](https://arxiv.org/abs/2404.13208) | 2404.13208 | Trains models to prioritize system instructions over user messages and untrusted tool outputs. |
| Zhan et al. (2024), [InjecAgent: Benchmarking Indirect Prompt Injections in Tool-Integrated Large Language Model Agents](https://arxiv.org/abs/2403.02691) | 2403.02691 | Benchmarks indirect injections that trick tool-using agents into calling harmful tools or exfiltrating data. |
| Debenedetti et al. (2024), [AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents](https://arxiv.org/abs/2406.13352) | 2406.13352 | Evaluates benign task utility and attack success rate together, which is the right framing for agent guardrails. |
| Debenedetti et al. (2025), [Defeating Prompt Injections by Design (CaMeL)](https://arxiv.org/abs/2503.18813) | 2503.18813 | Separates control flow from untrusted data using capability tracking to enforce security by construction. |
| Beurer-Kellner et al. (2025), [Design Patterns for Securing LLM Agents against Prompt Injections](https://arxiv.org/abs/2506.08837) | 2506.08837 | Catalogs six architectural patterns, including plan-then-execute, dual LLM, and context minimization. See [Tool & action guardrails](../04-guardrails/05-tool-and-action-guardrails.md). |
| Bullwinkel et al. (2025), [Lessons From Red Teaming 100 Generative AI Products](https://arxiv.org/abs/2501.07238) | 2501.07238 | Shares Microsoft AI Red Team findings: simple attacks work, system context matters, and human red-teamers remain essential. |
| Inan et al. (2023), [Llama Guard: LLM-based Input-Output Safeguard for Human-AI Conversations](https://arxiv.org/abs/2312.06674) | 2312.06674 | Introduces an LLM-based safety classifier for prompts and responses using a configurable hazard taxonomy. |
| Padhi et al. (2024), [Granite Guardian](https://arxiv.org/abs/2412.07724) | 2412.07724 | Presents open guard models that detect content harm, RAG hallucination, and function-call risks. |
| Rebedea et al. (2023), [NeMo Guardrails: A Toolkit for Controllable and Safe LLM Applications with Programmable Rails](https://arxiv.org/abs/2310.10501) | 2310.10501 | Introduces programmable rails and the Colang modeling language behind NeMo Guardrails. |

## 6. Text-to-SQL

| Paper / resource | arXiv | Annotation |
|---|---|---|
| Yu et al. (2018), [Spider: A Large-Scale Human-Labeled Dataset for Complex and Cross-Domain Semantic Parsing and Text-to-SQL Task](https://arxiv.org/abs/1809.08887) · [site](https://yale-lily.github.io/spider) | 1809.08887 | Establishes the classic cross-domain text-to-SQL benchmark along with exact-match and execution accuracy metrics. |
| Zhong et al. (2020), [Semantic Evaluation for Text-to-SQL with Distilled Test Suites](https://arxiv.org/abs/2010.02840) | 2010.02840 | Runs queries against distilled database variants to prevent false positives in execution accuracy. See [Text-to-SQL evals](../02-offline-evals/05-text-to-sql-evals.md). |
| Li et al. (2023), [Can LLM Already Serve as A Database Interface? A BIg Bench for Large-Scale Database Grounded Text-to-SQLs (BIRD)](https://arxiv.org/abs/2305.03111) · [site](https://bird-bench.github.io/) | 2305.03111 | Tests dirty, large-scale databases that require external domain knowledge and introduces the Valid Efficiency Score (VES). |
| Gao et al. (2023), [Text-to-SQL Empowered by Large Language Models: A Benchmark Evaluation (DAIL-SQL)](https://arxiv.org/abs/2308.15363) | 2308.15363 | Compares schema prompt representations and few-shot example selection methods for LLM text-to-SQL. |
| Lei et al. (2024), [Spider 2.0: Evaluating Language Models on Real-World Enterprise Text-to-SQL Workflows](https://arxiv.org/abs/2411.07763) · [site](https://spider2-sql.github.io/) | 2411.07763 | Benchmarks enterprise schemas, multiple SQL dialects, and multi-step workflows. Closest public benchmark to a warehouse assistant. |

## 7. Agents and tool use

| Paper / resource | arXiv | Annotation |
|---|---|---|
| Yao et al. (2024), [τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains](https://arxiv.org/abs/2406.12045) · [site](https://taubench.com) | 2406.12045 | Combines simulated users, tools, and domain policies. Introduces `pass^k` to measure reliability across repeated trials. See [Agent tool & trajectory evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md). |
| Barres et al. (2025), [τ²-Bench: Evaluating Conversational Agents in a Dual-Control Environment](https://arxiv.org/abs/2506.07982) · [repo](https://github.com/sierra-research/tau2-bench) | 2506.07982 | Evaluates conversational agents when both the user and the agent act on a shared environment. |
| Patil et al. (2023), [Gorilla: Large Language Model Connected with Massive APIs](https://arxiv.org/abs/2305.15334) | 2305.15334 | Trains an API-calling LLM and establishes the Berkeley Function Calling Leaderboard (BFCL). |
| Liu et al. (2023), [AgentBench: Evaluating LLMs as Agents](https://arxiv.org/abs/2308.03688) | 2308.03688 | Benchmarks LLM agents across eight interactive environments, including operating systems, databases, and the web. |
| Mialon et al. (2023), [GAIA: a benchmark for General AI Assistants](https://arxiv.org/abs/2311.12983) · [HF](https://huggingface.co/gaia-benchmark) | 2311.12983 | Tests real-world questions that are simple for humans but require tool use, browsing, and multi-step reasoning for AI. |
| Jimenez et al. (2023), [SWE-bench: Can Language Models Resolve Real-World GitHub Issues?](https://arxiv.org/abs/2310.06770) · [site](https://www.swebench.com/) | 2310.06770 | Grades coding agents on real GitHub issues using unit test execution. Models outcome-based agent evaluation. |
| Yehudai et al. (2025), [Survey on Evaluation of LLM-based Agents](https://arxiv.org/abs/2503.16416) | 2503.16416 | Surveys agent capabilities, task benchmarks, and evaluation frameworks. |

## 8. Benchmarks and leaderboards

Public benchmarks help you **shortlist models and embeddings**. They never replace evaluations on your own domain data.

| Benchmark | Link | What it measures | Relevance to the running example |
|---|---|---|---|
| **BEIR** | [arXiv 2104.08663](https://arxiv.org/abs/2104.08663) | Zero-shot retrieval across 18 datasets | Shortlist candidate retrievers and rerankers. |
| **MTEB** | [arXiv 2210.07316](https://arxiv.org/abs/2210.07316) · [leaderboard](https://huggingface.co/spaces/mteb/leaderboard) | Embedding models across retrieval, clustering, classification, and more | Shortlist embedding models for your target languages and retrieval tasks. |
| **BFCL** | [leaderboard](https://gorilla.cs.berkeley.edu/leaderboard.html) | Function calling across single, parallel, multi-turn, and agentic (V4) tasks | Choose a model for reliable tool calls like `create_ticket`. |
| **τ-bench / τ²-bench** | [taubench.com](https://taubench.com) | Policy-bound tool use with simulated users and `pass^k` scoring | Closest public benchmark to policy-bound enterprise agents. |
| **BIRD / Spider 2.0** | [bird-bench.github.io](https://bird-bench.github.io/) · [spider2-sql.github.io](https://spider2-sql.github.io/) | Text-to-SQL accuracy on realistic enterprise databases | Choose a generator model for your SQL tool. |
| **GAIA** | [huggingface.co/gaia-benchmark](https://huggingface.co/gaia-benchmark) | General assistant tasks that require multi-step tool use | Check general multi-step agent capability. |
| **SWE-bench** | [swebench.com](https://www.swebench.com/) | Resolving real-world GitHub issues | Relevant for coding agents, not enterprise RAG assistants. |
| **AgentBench** | [arXiv 2308.03688](https://arxiv.org/abs/2308.03688) | Agent performance across 8 interactive environments | Check broad agent capability across diverse environments. |
| **HELM** | [crfm.stanford.edu/helm](https://crfm.stanford.edu/helm/) · [arXiv 2211.09110](https://arxiv.org/abs/2211.09110) | Holistic model evaluation across scenarios and metrics | Select base models and design multi-metric scorecards. |

## 9. Practitioner blogs and essays

| Author | Post | Annotation |
|---|---|---|
| Hamel Husain | [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) | Explains how to layer unit assertions, human and LLM evals, and A/B tests by inspecting real data first. |
| Hamel Husain | [Using LLM-as-a-Judge For Evaluation: A Complete Guide](https://hamel.dev/blog/posts/llm-judge/) (originally "Creating a LLM-as-a-Judge That Drives Business Results") | Teaches critique shadowing: have one domain expert write binary pass/fail critiques and align the judge iteratively. |
| Hamel Husain | [A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/) | Focuses on error analysis, custom data viewers, domain expert labeling, and experiment-driven roadmaps. |
| Hamel Husain & Shreya Shankar | [AI Evals: Everything You Need to Know (FAQ)](https://hamel.dev/blog/posts/evals-faq/) | Answers the most common practical evaluation questions from their cohort course. |
| Eugene Yan | [Patterns for Building LLM-based Systems & Products](https://eugeneyan.com/writing/llm-patterns/) | Catalogs practical patterns for evals, RAG, fine-tuning, caching, guardrails, defensive UX, and user feedback. |
| Eugene Yan | [Task-Specific LLM Evals that Do & Don't Work](https://eugeneyan.com/writing/evals/) | Recommends specific evaluation metrics for classification, summarization, translation, copyright, and toxicity. |
| Eugene Yan | [Evaluating the Effectiveness of LLM-Evaluators (aka LLM-as-Judge)](https://eugeneyan.com/writing/llm-evaluators/) | Surveys LLM judge research and explains when you can trust automated evaluators. |
| Eugene Yan | [An LLM-as-Judge Won't Save The Product—Fixing Your Process Will](https://eugeneyan.com/writing/eval-process/) | Shows why evaluation is an iterative process of observing, annotating, and experimenting rather than a tool purchase. |
| Anthropic | [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) | Contrasts deterministic workflows with autonomous agents and explains routing, chaining, and evaluator-optimizer loops. |
| Anthropic | [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Offers practical guidance on agent graders, task design, and outcome evaluation versus transcript evaluation. |
| Simon Willison | [The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) | Explains why combining private data, untrusted content, and external communication creates exfiltration risk unless you remove one leg. |
| Simon Willison | [Prompt injection series](https://simonwillison.net/series/prompt-injection/) | Tracks prompt injection attacks and defenses since 2022 and explains why the problem remains unsolved. |
| Simon Willison | [The Dual LLM pattern for building AI assistants that can resist prompt injection](https://simonwillison.net/2023/Apr/25/dual-llm-pattern/) | Separates privileged and quarantined LLMs and inspired later architectural security papers. |
| Yan, Bischof, Frye, Husain, Liu, Shankar | [What We've Learned From A Year of Building with LLMs](https://applied-llms.org/) | Distills tactical, operational, and strategic engineering lessons from production LLM systems. |
| Jason Liu | [Systematically Improving Your RAG](https://jxnl.co/writing/2024/05/22/systematically-improving-your-rag/) | Shows how to bootstrap synthetic questions, optimize retrieval recall first, and segment queries by cohort. |
| Shreya Shankar | [Personal site and papers](https://www.sh-reya.com/) | Collects research on evaluation tooling, criteria drift, and data-centric LLM pipelines. |

## 10. Vendor guides worth reading (tool-agnostic content)

| Source | Link | Annotation |
|---|---|---|
| OpenAI | [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) | Covers eval-driven development, grader types, and architecture-specific evaluation pitfalls. |
| OpenAI | [Cookbook](https://developers.openai.com/cookbook) | Provides runnable code examples for evaluations, RAG pipelines, and runtime guardrails. |
| Anthropic | [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Explains practical agent evaluation patterns that apply across all model providers. |

## 11. Standards and frameworks

| Standard | Link | Annotation |
|---|---|---|
| **OWASP Top 10 for LLM Applications (2025)** | [genai.owasp.org/llm-top-10](https://genai.owasp.org/llm-top-10/) | Covers LLM01 Prompt Injection through LLM10 Unbounded Consumption. Serves as the shared vocabulary for security reviews ([Threat model & OWASP](../04-guardrails/07-threat-model-owasp.md)). |
| **OWASP Top 10 for Agentic Applications (2026)** | [genai.owasp.org](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) | Defines agent-specific risks (published December 2025), including goal hijack, tool misuse, and privilege abuse. |
| **OWASP Agentic AI – Threats and Mitigations** | [genai.owasp.org](https://genai.owasp.org/resource/agentic-ai-threats-and-mitigations/) | Provides a detailed threat-model reference from the OWASP Agentic Security Initiative. |
| **NIST AI Risk Management Framework (AI RMF 1.0)** | [nist.gov](https://www.nist.gov/itl/ai-risk-management-framework) | Organizes risk around Govern, Map, Measure, and Manage. Most enterprises map their AI controls to this framework. |
| **NIST AI 600-1: Generative AI Profile** | [nvlpubs.nist.gov (PDF)](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf) | Details generative AI risks like confabulation, information security, and data privacy with actions mapped to the AI RMF. |
| **MITRE ATLAS** | [atlas.mitre.org](https://atlas.mitre.org/) | Documents adversary tactics and techniques against AI systems in an ATT&CK-style matrix for red-team planning. |
| **ISO/IEC 42001:2023** | [iso.org](https://www.iso.org/standard/81230.html) | Defines a certifiable AI management system standard where your evals and guardrails serve as control evidence. |

## 12. Courses and books

| Resource | Link | Annotation |
|---|---|---|
| Chip Huyen, *AI Engineering* (O'Reilly) | [oreilly.com](https://www.oreilly.com/library/view/ai-engineering/9781098166298/) | Covers building applications on foundation models with strong chapters on evaluation methodology and AI-as-a-judge. |
| Hamel Husain & Shreya Shankar, *AI Evals For Engineers & PMs* | [maven.com/parlance-labs/evals](https://maven.com/parlance-labs/evals) | Teaches error analysis, judge calibration, and evaluation pipelines in a cohort course. |
| DeepLearning.AI, *Building and Evaluating Advanced RAG* | [deeplearning.ai](https://www.deeplearning.ai/courses/building-evaluating-advanced-rag) | Demonstrates advanced retrieval techniques and the RAG triad using TruLens. |
| DeepLearning.AI, *Evaluating AI Agents* | [deeplearning.ai](https://www.deeplearning.ai/courses/evaluating-ai-agents) | Shows how to evaluate agent components and multi-step trajectories using Arize Phoenix. |
| DeepLearning.AI, *Quality and Safety for LLM Applications* | [deeplearning.ai](https://www.deeplearning.ai/courses/quality-safety-llm-applications) | Covers monitoring for hallucinations, data leakage, prompt injection, and toxicity. |
| DeepLearning.AI, *Red Teaming LLM Applications* | [deeplearning.ai](https://www.deeplearning.ai/courses/red-teaming-llm-applications) | Introduces manual and automated red teaming for LLM applications using Giskard. |

## 13. Where each reference is used in this repo

| Topic in this repo | Start with |
|---|---|
| [End-to-end RAG evals](../02-offline-evals/01-end-to-end-rag-evals.md) | RAGAS, ARES, RAGChecker, Seven Failure Points |
| [Retrieval metrics](../02-offline-evals/02-retrieval-metrics.md) | BEIR, MTEB, Lost in the Middle |
| [Generation quality & safety](../02-offline-evals/03-generation-quality-and-safety-evals.md) | FActScore, SelfCheckGPT, Llama Guard |
| [Agent tool & trajectory evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md) | τ-bench, τ²-bench, BFCL/Gorilla, Anthropic agent evals |
| [Text-to-SQL evals](../02-offline-evals/05-text-to-sql-evals.md) | Spider, test-suite accuracy, BIRD, Spider 2.0 |
| [Instruction & citation adherence](../02-offline-evals/06-instruction-and-citation-adherence.md) | IFEval, ALCE, Verifiability in generative search |
| [LLM-as-a-judge](../02-offline-evals/07-llm-as-a-judge.md) | MT-Bench judging, G-Eval, Who Validates the Validators, PoLL, Hamel's judge guide |
| [Datasets](../01-datasets/README.md) | Hamel's field guide, Jason Liu on synthetic questions |
| [Guardrails](../04-guardrails/README.md) | Greshake, Spotlighting, Design Patterns, CaMeL, lethal trifecta, OWASP |
| [Threat model](../04-guardrails/07-threat-model-owasp.md) | OWASP LLM + Agentic Top 10, MITRE ATLAS, NIST AI 600-1 |
| [Maturity model](../05-decision-framework/05-maturity-model.md) | NIST AI RMF, ISO/IEC 42001 |

---

## Key takeaways

- **Build on four stable research pillars:** Retrieve then generate (Lewis), verify atomic claims (FActScore, RAGAS), align biased judges with humans (Zheng, Shankar), and solve injection architecturally (Greshake, Willison, CaMeL).
- **Follow the practitioner consensus:** Inspect your data, perform error analysis, and design evaluations before you buy or adopt tools.
- **Use public benchmarks only for model shortlisting:** Test application quality on your own domain datasets.
- **Map your controls to recognized standards:** Use OWASP, NIST, MITRE ATLAS, and ISO/IEC 42001 to communicate with security and compliance teams.
- **Re-check links and versions regularly:** This reading list reflects an October 2026 snapshot.

## Further reading

- [Tooling landscape](../06-tooling-landscape/README.md) — tools that implement the ideas in these papers
- [Glossary](../00-foundations/04-glossary.md) — plain-language definitions of terms from the literature
- [Metric cheatsheet](../05-decision-framework/03-metric-cheatsheet.md) — metrics from these papers summarized in one table
- [Implementation playbook](../05-decision-framework/04-implementation-playbook.md) — step-by-step rollout plan for putting this research into production
