# References: A Curated Reading List

> **TL;DR** — A categorized, annotated reading list behind this repository: the papers that define RAG and its metrics, the research on LLM-as-a-judge reliability, prompt-injection and agent-security work, text-to-SQL and agent benchmarks, the practitioner essays that shaped how teams actually do evals, and the standards (OWASP, NIST, MITRE, ISO) you will be asked about in a security or compliance review. Every link was checked in October 2026. Short on time? Start with [the ten-item starter path](#if-you-only-read-ten-things).

**You'll learn:** which papers and posts are worth your time and why · where each metric or practice in this repo comes from · which standards map to which risks · which benchmarks are relevant to an agentic RAG app (and which are not)  ·  **Prerequisites:** none — use it as a companion to any section  ·  **Related:** [Tooling landscape](../06-tooling-landscape/README.md), [Glossary](../00-foundations/04-glossary.md), [Metric cheatsheet](../05-decision-framework/03-metric-cheatsheet.md)

---

## How to use this list

- Each entry has a **one-line annotation** saying why it matters for an agentic RAG app (docs RAG + text-to-SQL + tools + RBAC).
- Papers link to arXiv abstract pages; the arXiv ID is shown so you can cite it.
- Practitioner posts change titles occasionally; the URLs are stable as of October 2026.
- Tool documentation is not repeated here — see [Eval & observability tools](../06-tooling-landscape/01-eval-and-observability-tools.md) and [Guardrail tools](../06-tooling-landscape/02-guardrail-tools.md).

## If you only read ten things

| # | Read | Why first |
|---|---|---|
| 1 | Hamel Husain — [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) | The case for error analysis before tools |
| 2 | Applied LLMs — [What We've Learned From A Year of Building with LLMs](https://applied-llms.org/) | Tactical, operational and strategic lessons in one place |
| 3 | Anthropic — [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) | Simple agent patterns; when not to build an agent |
| 4 | Eugene Yan — [Task-Specific LLM Evals that Do & Don't Work](https://eugeneyan.com/writing/evals/) | Which metrics are worth computing per task |
| 5 | Es et al. — [RAGAS](https://arxiv.org/abs/2309.15217) | The vocabulary of reference-free RAG metrics |
| 6 | Zheng et al. — [Judging LLM-as-a-Judge](https://arxiv.org/abs/2306.05685) | Judge biases you must control for |
| 7 | Shankar et al. — [Who Validates the Validators?](https://arxiv.org/abs/2404.12272) | Aligning judges with human preferences; criteria drift |
| 8 | Simon Willison — [The lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) | Why private data + untrusted content + exfiltration is the core agent risk |
| 9 | Beurer-Kellner et al. — [Design Patterns for Securing LLM Agents against Prompt Injections](https://arxiv.org/abs/2506.08837) | Architectural defenses instead of detectors alone |
| 10 | [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/) | The shared risk vocabulary for security reviews |

---

## 1. Foundational RAG papers

| Paper | arXiv | Annotation |
|---|---|---|
| Lewis et al. (2020), [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401) | 2005.11401 | The paper that named RAG: a retriever plus a generator trained end to end. |
| Gao et al. (2023), [Retrieval-Augmented Generation for Large Language Models: A Survey](https://arxiv.org/abs/2312.10997) | 2312.10997 | Naive → advanced → modular RAG taxonomy, plus an overview of RAG evaluation. Good map of the design space. |
| Liu et al. (2023), [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) | 2307.03172 | Models use information at the start and end of the context best; motivates reranking and context-size evals. |
| Barnett et al. (2024), [Seven Failure Points When Engineering a Retrieval Augmented Generation System](https://arxiv.org/abs/2401.05856) | 2401.05856 | Practitioner taxonomy of RAG failures (missing content, missed top-ranked docs, not extracted, wrong format …). Pairs with [failure modes](../00-foundations/03-agentic-rag-failure-modes.md). |
| Asai et al. (2023), [Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection](https://arxiv.org/abs/2310.11511) | 2310.11511 | Model decides when to retrieve and critiques its own output with reflection tokens; a precursor to agentic RAG. |
| Xu et al. (2023), [Retrieval meets Long Context Large Language Models](https://arxiv.org/abs/2310.03025) | 2310.03025 | Compares retrieval with long-context models; useful when someone says "just use a bigger context window". |

## 2. RAG evaluation

| Paper | arXiv | Annotation |
|---|---|---|
| Es et al. (2023), [Ragas: Automated Evaluation of Retrieval Augmented Generation](https://arxiv.org/abs/2309.15217) | 2309.15217 | Reference-free faithfulness, answer relevance and context relevance using an LLM. See [End-to-end RAG evals](../02-offline-evals/01-end-to-end-rag-evals.md). |
| Saad-Falcon et al. (2023), [ARES: An Automated Evaluation Framework for Retrieval-Augmented Generation Systems](https://arxiv.org/abs/2311.09476) | 2311.09476 | Trains lightweight judges on synthetic data and uses prediction-powered inference with a small human-labeled set for confidence intervals. |
| Ru et al. (2024), [RAGChecker: A Fine-grained Framework for Diagnosing Retrieval-Augmented Generation](https://arxiv.org/abs/2408.08067) | 2408.08067 | Claim-level metrics that separate retriever errors from generator errors. |
| Gao et al. (2023), [Enabling Large Language Models to Generate Text with Citations (ALCE)](https://arxiv.org/abs/2305.14627) | 2305.14627 | Benchmark and metrics for citation recall and precision. See [Instruction & citation adherence](../02-offline-evals/06-instruction-and-citation-adherence.md). |
| Liu et al. (2023), [Evaluating Verifiability in Generative Search Engines](https://arxiv.org/abs/2304.09848) | 2304.09848 | Human audit showing many generated statements are not fully supported by their citations. |
| Thakur et al. (2021), [BEIR: A Heterogenous Benchmark for Zero-shot Evaluation of Information Retrieval Models](https://arxiv.org/abs/2104.08663) | 2104.08663 | Standard retrieval benchmark; reminds you that in-domain retrieval scores do not transfer. See [Retrieval metrics](../02-offline-evals/02-retrieval-metrics.md). |

## 3. LLM-as-a-judge

| Paper | arXiv | Annotation |
|---|---|---|
| Zheng et al. (2023), [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685) | 2306.05685 | Establishes strong-LLM judges and documents position, verbosity and self-enhancement bias. |
| Liu et al. (2023), [G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment](https://arxiv.org/abs/2303.16634) | 2303.16634 | Chain-of-thought evaluation steps and probability-weighted scores; the basis of many "G-Eval" metrics in tools. |
| Wang et al. (2023), [Large Language Models are not Fair Evaluators](https://arxiv.org/abs/2305.17926) | 2305.17926 | Position bias in pairwise judging and calibration fixes (e.g. swapping order). |
| Shankar et al. (2024), [Who Validates the Validators? Aligning LLM-Assisted Evaluation of LLM Outputs with Human Preferences](https://arxiv.org/abs/2404.12272) | 2404.12272 | Criteria drift: people refine criteria while grading; judges must be aligned iteratively with human labels. |
| Verga et al. (2024), [Replacing Judges with Juries: Evaluating LLM Generations with a Panel of Diverse Models (PoLL)](https://arxiv.org/abs/2404.18796) | 2404.18796 | A panel of smaller, diverse judges can beat one large judge on agreement and cost while reducing intra-model bias. |
| Thakur et al. (2024), [Judging the Judges: Evaluating Alignment and Vulnerabilities in LLMs-as-Judges](https://arxiv.org/abs/2406.12624) | 2406.12624 | Measures judge–human alignment beyond percent agreement; judges can be lenient and sensitive to prompt wording. |
| Gu et al. (2024), [A Survey on LLM-as-a-Judge](https://arxiv.org/abs/2411.15594) | 2411.15594 | Broad survey of judge design, reliability and bias mitigation. See [LLM-as-a-judge](../02-offline-evals/07-llm-as-a-judge.md). |

## 4. Hallucination, factuality and instruction following

| Paper | arXiv | Annotation |
|---|---|---|
| Manakul et al. (2023), [SelfCheckGPT: Zero-Resource Black-Box Hallucination Detection for Generative Large Language Models](https://arxiv.org/abs/2303.08896) | 2303.08896 | Detects hallucination via inconsistency across multiple samples, without retrieval or references. |
| Min et al. (2023), [FActScore: Fine-grained Atomic Evaluation of Factual Precision in Long Form Text Generation](https://arxiv.org/abs/2305.14251) | 2305.14251 | Break answers into atomic facts and verify each; the pattern behind most claim-level faithfulness metrics. |
| Zhou et al. (2023), [Instruction-Following Evaluation for Large Language Models (IFEval)](https://arxiv.org/abs/2311.07911) | 2311.07911 | Verifiable instructions ("answer in under 100 words", "use JSON") checked by code, not judges. |

## 5. Prompt injection, agent security and guardrails

| Paper | arXiv | Annotation |
|---|---|---|
| Perez & Ribeiro (2022), [Ignore Previous Prompt: Attack Techniques For Language Models](https://arxiv.org/abs/2211.09527) | 2211.09527 | Early systematic study of goal hijacking and prompt leaking. |
| Greshake et al. (2023), [Not what you've signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection](https://arxiv.org/abs/2302.12173) | 2302.12173 | Defines indirect prompt injection via retrieved content — the core RAG threat. |
| Hines et al. (2024), [Defending Against Indirect Prompt Injection Attacks With Spotlighting](https://arxiv.org/abs/2403.14720) | 2403.14720 | Delimiting, datamarking and encoding untrusted content to reduce indirect injection. See [Retrieval & context guardrails](../04-guardrails/03-retrieval-and-context-guardrails.md). |
| Wallace et al. (2024), [The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions](https://arxiv.org/abs/2404.13208) | 2404.13208 | Training models to prefer system over user over tool-output instructions. |
| Zhan et al. (2024), [InjecAgent: Benchmarking Indirect Prompt Injections in Tool-Integrated Large Language Model Agents](https://arxiv.org/abs/2403.02691) | 2403.02691 | Benchmark of indirect injections that try to make agents call harmful tools or exfiltrate data. |
| Debenedetti et al. (2024), [AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents](https://arxiv.org/abs/2406.13352) | 2406.13352 | Measures utility and attack success together — the right framing for agent guardrails. |
| Debenedetti et al. (2025), [Defeating Prompt Injections by Design (CaMeL)](https://arxiv.org/abs/2503.18813) | 2503.18813 | Separates control flow from untrusted data with capabilities; security by construction rather than detection. |
| Beurer-Kellner et al. (2025), [Design Patterns for Securing LLM Agents against Prompt Injections](https://arxiv.org/abs/2506.08837) | 2506.08837 | Six patterns (e.g. plan-then-execute, dual LLM, context minimization) with trade-offs. See [Tool & action guardrails](../04-guardrails/05-tool-and-action-guardrails.md). |
| Bullwinkel et al. (2025), [Lessons From Red Teaming 100 Generative AI Products](https://arxiv.org/abs/2501.07238) | 2501.07238 | Microsoft AI Red Team lessons: simple attacks work, system-level context matters, automation helps but humans are essential. |
| Inan et al. (2023), [Llama Guard: LLM-based Input-Output Safeguard for Human-AI Conversations](https://arxiv.org/abs/2312.06674) | 2312.06674 | LLM-based safety classifier for prompts and responses with a configurable taxonomy. |
| Padhi et al. (2024), [Granite Guardian](https://arxiv.org/abs/2412.07724) | 2412.07724 | Open guard models covering harm plus RAG groundedness/relevance risks. |
| Rebedea et al. (2023), [NeMo Guardrails: A Toolkit for Controllable and Safe LLM Applications with Programmable Rails](https://arxiv.org/abs/2310.10501) | 2310.10501 | Programmable rails and Colang; the design behind NeMo Guardrails. |

## 6. Text-to-SQL

| Paper / resource | arXiv | Annotation |
|---|---|---|
| Yu et al. (2018), [Spider: A Large-Scale Human-Labeled Dataset for Complex and Cross-Domain Semantic Parsing and Text-to-SQL Task](https://arxiv.org/abs/1809.08887) · [site](https://yale-lily.github.io/spider) | 1809.08887 | Classic cross-domain text-to-SQL benchmark; introduced exact-match and execution metrics. |
| Zhong et al. (2020), [Semantic Evaluation for Text-to-SQL with Distilled Test Suites](https://arxiv.org/abs/2010.02840) | 2010.02840 | Test-suite accuracy: run against many database variants to avoid false positives from execution match. See [Text-to-SQL evals](../02-offline-evals/05-text-to-sql-evals.md). |
| Li et al. (2023), [Can LLM Already Serve as A Database Interface? A BIg Bench for Large-Scale Database Grounded Text-to-SQLs (BIRD)](https://arxiv.org/abs/2305.03111) · [site](https://bird-bench.github.io/) | 2305.03111 | Large, dirty, real-world databases and external knowledge; adds an efficiency metric (VES). |
| Gao et al. (2023), [Text-to-SQL Empowered by Large Language Models: A Benchmark Evaluation (DAIL-SQL)](https://arxiv.org/abs/2308.15363) | 2308.15363 | Systematic comparison of prompt representations and example selection for LLM text-to-SQL. |
| Lei et al. (2024), [Spider 2.0: Evaluating Language Models on Real-World Enterprise Text-to-SQL Workflows](https://arxiv.org/abs/2411.07763) · [site](https://spider2-sql.github.io/) | 2411.07763 | Enterprise-scale schemas, multiple dialects and multi-step workflows — closest public benchmark to a warehouse assistant. |

## 7. Agents and tool use

| Paper / resource | arXiv | Annotation |
|---|---|---|
| Yao et al. (2024), [τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains](https://arxiv.org/abs/2406.12045) · [site](https://taubench.com) | 2406.12045 | Simulated users + tools + policies; introduces pass^k to measure reliability across repeated trials. See [Agent tool & trajectory evals](../02-offline-evals/04-agent-tool-and-trajectory-evals.md). |
| Barres et al. (2025), [τ²-Bench: Evaluating Conversational Agents in a Dual-Control Environment](https://arxiv.org/abs/2506.07982) · [repo](https://github.com/sierra-research/tau2-bench) | 2506.07982 | Both user and agent act on a shared environment; tests coordination and guidance. |
| Patil et al. (2023), [Gorilla: Large Language Model Connected with Massive APIs](https://arxiv.org/abs/2305.15334) | 2305.15334 | API-calling LLM and the origin of the Berkeley Function Calling Leaderboard. |
| Liu et al. (2023), [AgentBench: Evaluating LLMs as Agents](https://arxiv.org/abs/2308.03688) | 2308.03688 | Multi-environment agent benchmark (OS, DB, web, games …). |
| Mialon et al. (2023), [GAIA: a benchmark for General AI Assistants](https://arxiv.org/abs/2311.12983) · [HF](https://huggingface.co/gaia-benchmark) | 2311.12983 | Questions simple for humans but needing tools, browsing and reasoning for AI. |
| Jimenez et al. (2023), [SWE-bench: Can Language Models Resolve Real-World GitHub Issues?](https://arxiv.org/abs/2310.06770) · [site](https://www.swebench.com/) | 2310.06770 | Real-issue coding benchmark with execution-based grading; a model for outcome-based agent evals. |
| Yehudai et al. (2025), [Survey on Evaluation of LLM-based Agents](https://arxiv.org/abs/2503.16416) | 2503.16416 | Overview of agent capabilities, benchmarks and evaluation frameworks. |

## 8. Benchmarks and leaderboards

Public benchmarks help with **model and embedding selection**; they do not replace evals on your own data.

| Benchmark | Link | What it measures | Relevance to the running example |
|---|---|---|---|
| **BEIR** | [arXiv 2104.08663](https://arxiv.org/abs/2104.08663) | Zero-shot retrieval across 18 datasets | Shortlisting retrievers/rerankers |
| **MTEB** | [arXiv 2210.07316](https://arxiv.org/abs/2210.07316) · [leaderboard](https://huggingface.co/spaces/mteb/leaderboard) | Embedding models across retrieval, clustering, classification and more | Shortlisting embedding models; check the retrieval subset and your languages |
| **BFCL** | [leaderboard](https://gorilla.cs.berkeley.edu/leaderboard.html) | Function calling: single, parallel, multi-turn, agentic (V4) | Choosing a model for tool calls such as `create_ticket` |
| **τ-bench / τ²-bench** | [taubench.com](https://taubench.com) | Tool use under policies with simulated users; pass^k | Closest public analogue to policy-bound enterprise agents |
| **BIRD / Spider 2.0** | [bird-bench.github.io](https://bird-bench.github.io/) · [spider2-sql.github.io](https://spider2-sql.github.io/) | Text-to-SQL accuracy on realistic databases | Choosing a model for the SQL tool |
| **GAIA** | [huggingface.co/gaia-benchmark](https://huggingface.co/gaia-benchmark) | General assistant tasks with tools | General agent capability signal |
| **SWE-bench** | [swebench.com](https://www.swebench.com/) | Resolving real GitHub issues | Coding agents; less relevant here |
| **AgentBench** | [arXiv 2308.03688](https://arxiv.org/abs/2308.03688) | Agents across 8 environments | Broad agent capability signal |
| **HELM** | [crfm.stanford.edu/helm](https://crfm.stanford.edu/helm/) · [arXiv 2211.09110](https://arxiv.org/abs/2211.09110) | Holistic evaluation of models across scenarios and metrics | Model selection; template for multi-metric reporting |

## 9. Practitioner blogs and essays

| Author | Post | Annotation |
|---|---|---|
| Hamel Husain | [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) | Unit tests → human/model eval → A/B tests; look at your data. |
| Hamel Husain | [Using LLM-as-a-Judge For Evaluation: A Complete Guide](https://hamel.dev/blog/posts/llm-judge/) (originally "Creating a LLM-as-a-Judge That Drives Business Results") | Critique shadowing: one domain expert, binary pass/fail with critiques, iterate the judge until it agrees. |
| Hamel Husain | [A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/) | Error analysis first, data viewers, empower domain experts, experiment-based roadmaps. |
| Hamel Husain & Shreya Shankar | [AI Evals: Everything You Need to Know (FAQ)](https://hamel.dev/blog/posts/evals-faq/) | Answers to the most common eval questions from their course. |
| Eugene Yan | [Patterns for Building LLM-based Systems & Products](https://eugeneyan.com/writing/llm-patterns/) | Evals, RAG, fine-tuning, caching, guardrails, defensive UX, user feedback — a full pattern catalogue. |
| Eugene Yan | [Task-Specific LLM Evals that Do & Don't Work](https://eugeneyan.com/writing/evals/) | Metrics per task: classification, summarization, translation, copyright, toxicity. |
| Eugene Yan | [Evaluating the Effectiveness of LLM-Evaluators (aka LLM-as-Judge)](https://eugeneyan.com/writing/llm-evaluators/) | Survey of judge research and practical advice on when judges can be trusted. |
| Eugene Yan | [An LLM-as-Judge Won't Save The Product—Fixing Your Process Will](https://eugeneyan.com/writing/eval-process/) | Evals are a process (observe, annotate, hypothesize, experiment), not a tool. |
| Anthropic | [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) | Workflows vs agents; start simple; prompt chaining, routing, orchestrator-workers, evaluator-optimizer. |
| Anthropic | [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Practical guidance on graders, tasks and outcome vs transcript evaluation for agents. |
| Simon Willison | [The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) | Private data + untrusted content + external communication = exfiltration risk; remove one leg. |
| Simon Willison | [Prompt injection series](https://simonwillison.net/series/prompt-injection/) | Running commentary since 2022 on why prompt injection is unsolved. |
| Simon Willison | [The Dual LLM pattern for building AI assistants that can resist prompt injection](https://simonwillison.net/2023/Apr/25/dual-llm-pattern/) | Privileged vs quarantined LLM; inspiration for later design-pattern papers. |
| Yan, Bischof, Frye, Husain, Liu, Shankar | [What We've Learned From A Year of Building with LLMs](https://applied-llms.org/) | Tactical, operational and strategic lessons from practitioners. |
| Jason Liu | [Systematically Improving Your RAG](https://jxnl.co/writing/2024/05/22/systematically-improving-your-rag/) | Synthetic questions, retrieval recall first, segment queries, improve by cohort. |
| Shreya Shankar | [Personal site and papers](https://www.sh-reya.com/) | Research on eval tooling, criteria drift and data-centric LLM pipelines. |

## 10. Vendor guides worth reading (tool-agnostic content)

| Source | Link | Annotation |
|---|---|---|
| OpenAI | [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) | Eval-driven development, eval types, architecture-specific pitfalls. |
| OpenAI | [Cookbook](https://developers.openai.com/cookbook) | Worked examples for evals, RAG and guardrails. |
| Anthropic | [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | See above; useful even if you use another model provider. |

## 11. Standards and frameworks

| Standard | Link | Annotation |
|---|---|---|
| **OWASP Top 10 for LLM Applications (2025)** | [genai.owasp.org/llm-top-10](https://genai.owasp.org/llm-top-10/) | LLM01 Prompt Injection … LLM10 Unbounded Consumption; the shared vocabulary for security reviews. See [Threat model & OWASP](../04-guardrails/07-threat-model-owasp.md). |
| **OWASP Top 10 for Agentic Applications (2026)** | [genai.owasp.org](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) | Agent-specific risks (published December 2025), e.g. agent goal hijack, tool misuse, identity and privilege abuse. |
| **OWASP Agentic AI – Threats and Mitigations** | [genai.owasp.org](https://genai.owasp.org/resource/agentic-ai-threats-and-mitigations/) | Threat-model reference for agentic systems from the OWASP Agentic Security Initiative. |
| **NIST AI Risk Management Framework (AI RMF 1.0)** | [nist.gov](https://www.nist.gov/itl/ai-risk-management-framework) | Govern, Map, Measure, Manage — the organizational frame most enterprises map their AI controls to. |
| **NIST AI 600-1: Generative AI Profile** | [nvlpubs.nist.gov (PDF)](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf) | GenAI-specific risks (e.g. confabulation, information security, data privacy) with suggested actions mapped to the AI RMF. |
| **MITRE ATLAS** | [atlas.mitre.org](https://atlas.mitre.org/) | ATT&CK-style knowledge base of adversary tactics and techniques against AI systems; useful for red-team planning. |
| **ISO/IEC 42001:2023** | [iso.org](https://www.iso.org/standard/81230.html) | AI management system standard; certifiable, process-level — evals and guardrails become evidence for its controls. |

## 12. Courses and books

| Resource | Link | Annotation |
|---|---|---|
| Chip Huyen, *AI Engineering* (O'Reilly) | [oreilly.com](https://www.oreilly.com/library/view/ai-engineering/9781098166298/) | Book-length treatment of building on foundation models; strong chapters on evaluation methodology and AI-as-a-judge. |
| Hamel Husain & Shreya Shankar, *AI Evals For Engineers & PMs* | [maven.com/parlance-labs/evals](https://maven.com/parlance-labs/evals) | Paid cohort course on error analysis, judges and eval pipelines. |
| DeepLearning.AI, *Building and Evaluating Advanced RAG* | [deeplearning.ai](https://www.deeplearning.ai/courses/building-evaluating-advanced-rag) | Short course on advanced retrieval and the RAG triad (TruLens). |
| DeepLearning.AI, *Evaluating AI Agents* | [deeplearning.ai](https://www.deeplearning.ai/courses/evaluating-ai-agents) | Short course on evaluating agent components and trajectories (Arize Phoenix). |
| DeepLearning.AI, *Quality and Safety for LLM Applications* | [deeplearning.ai](https://www.deeplearning.ai/courses/quality-safety-llm-applications) | Short course on hallucination, data leakage, injection and toxicity monitoring. |
| DeepLearning.AI, *Red Teaming LLM Applications* | [deeplearning.ai](https://www.deeplearning.ai/courses/red-teaming-llm-applications) | Short course on manual and automated red teaming (Giskard). |

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

- The core ideas are few and stable: **retrieve then generate** (Lewis), **decompose answers into claims and verify them** (FActScore, RAGAS), **judges are biased and must be aligned with humans** (Zheng, Shankar), and **prompt injection is an architecture problem** (Greshake, Willison, Design Patterns, CaMeL).
- Practitioner writing (Husain, Yan, Applied LLMs, Anthropic) consistently says the same thing: **look at your data, do error analysis, then build evals** — tools come last.
- Public benchmarks help you **shortlist models and embeddings**; only your own datasets tell you whether your app works.
- Standards (OWASP, NIST, MITRE ATLAS, ISO/IEC 42001) are how security and compliance teams will read your work — map your evals and guardrails to them.
- Re-check links and versions periodically; this list is an October 2026 snapshot.

## Further reading

- [Tooling landscape](../06-tooling-landscape/README.md) — tools that implement the ideas above
- [Glossary](../00-foundations/04-glossary.md) — definitions of terms used in these papers
- [Metric cheatsheet](../05-decision-framework/03-metric-cheatsheet.md) — metrics from these papers in one table
- [Implementation playbook](../05-decision-framework/04-implementation-playbook.md) — turning the reading into a rollout plan
