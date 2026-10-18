# Human-Friendly STE100 Style Guide

> **TL;DR**
> - **Write for fast human learning.** Every guide in `research/` adapts **ASD-STE100 (Simplified Technical English)** so practitioners can scan, learn, and apply concepts quickly.
> - **Keep sentences short and active.** Limit procedural sentences to **20 words** and conceptual sentences to **25 words**, with one main idea per sentence.
> - **Use one term per concept.** Follow the controlled vocabulary table below to prevent synonym drift across guides.
> - **Follow the standard page anatomy.** Start every guide with an action-first `> **TL;DR**`, a 3-line navigation header, plain-English intuition, and concrete examples before wide tables or formulas.

---

## 1. Sentence & Paragraph Rules

1. **Sentence length**
   - **Procedural steps and instructions:** Maximum **20 words** per sentence.
   - **Conceptual explanations:** Maximum **25 words** per sentence.
2. **One idea per sentence:** Do not join independent clauses with a semicolon (`;`). Split them into two sentences.
3. **No nested parentheticals or em-dash chains:** If an aside matters, make it a separate sentence or bullet point.
4. **Paragraph length:** Maximum **4 sentences** (or ~65 words) per paragraph.
5. **Active voice and direct address:**
   - Write in active voice: *"The retriever filters documents by role"* (not *"Documents are filtered by role at retrieval time"*).
   - Address the reader as **"you"** when giving instructions: *"Start with 100 production traces"* (not *"One should start with ~100 traces"*).
6. **Imperative verbs for procedures:** Start every procedural step or checklist item with an action verb (**Collect**, **Read**, **Label**, **Group**, **Count**, **Measure**, **Block**, **Verify**).

---

## 2. Controlled Vocabulary (One Term = One Concept)

Use one canonical term consistently across `research/`. Mention common aliases once in parentheses when introducing a term.

| Canonical Term | Meaning | Avoid / Retire as Synonyms |
|---|---|---|
| **Check** | A function `f(input, context, output, trace) -> verdict` that tests one property | detector (unless specifically an ML classifier), validator |
| **Eval** | Running a check on a dataset (offline) or traffic sample (online) to **measure** quality | assessment, test (when referring to a metric suite) |
| **Guardrail** | Running a check in the request path to **enforce** policy on one live interaction | rail (except when naming a specific input/output rail), inline control |
| **Reference data** (or **Reference answer**) | Known-correct expected output stored in a dataset | gold truth, ground truth (use *reference-based* vs. *reference-free*) |
| **Golden dataset** | A versioned dataset reviewed and approved by a Subject-Matter Expert (SME) | gold set, SME set |
| **Faithfulness** | Metric measuring whether every claim in the answer is supported by retrieved context | groundedness (use *groundedness* only when naming a specific vendor metric or output guardrail, and note the equivalence) |
| **Answer correctness** | Metric measuring whether the generated answer matches the reference answer | factual accuracy, answer accuracy |
| **Abstention** | When the system deliberately declines to answer because evidence is missing | "I don't know" behavior (keep only as an example phrase) |
| **Refusal** | When the system declines a request because it violates safety, scope, or access policy | deny message |

---

## 3. Page Structure for Human Learning

Every content page in `research/` follows a predictable flow:

1. **Title (`# ...`)**
2. **Action-first `> **TL;DR**` block** — 3 to 4 short bullets (`- **Imperative takeaway.** One-sentence explanation.`).
3. **Navigation header** — Three scannable lines:
   - `**You will learn:** ...`
   - `**Prerequisites:** ...`
   - `**Related:** ...`
4. **Intuition and concrete story first** — Explain *why* the topic matters using the **Acme Internal Assistant** running example before introducing formulas or wide comparison tables.
5. **Visual diagram (`mermaid`)** — Followed by 2–3 numbered bullets explaining how to read the diagram.
6. **Scannable tables** — Keep table cells concise (~15 words or fewer). Use bold lead-ins and short phrases instead of multi-sentence paragraphs inside cells.
7. **Procedural steps and checklists** — Numbered steps or `- [ ]` checklists starting with imperative verbs.
8. **Key takeaways** — 4 to 6 short, memorable rules at the end of the guide.
9. **Further reading** — Curated internal and external links.

---

## 4. Before / After Examples

| Rule | Before (Dense Academic Prose) | After (Human-Friendly STE100) |
|---|---|---|
| **One idea per sentence + active voice** | *A single check—say, "does this text contain a Social Security Number?" or "is every claim in the answer supported by the retrieved passages?"—can be used in three different places, and confusing those places is the #1 source of wasted engineering effort.* (43 words) | *Consider one check: "Does every claim in the answer come from the retrieved passages?" You can run this single check in three different places. Confusing these three places is the #1 cause of wasted engineering effort.* (36 words across 3 sentences) |
| **Imperative procedure** | *It is recommended that teams begin by sampling approximately 100 production traces and categorizing the observed failure modes prior to selecting automated LLM judges.* (24 words, passive) | *1. **Collect** 100 real traces from your system.<br/>2. **Label** the first step where each failed trace broke.<br/>3. **Pick** automated checks only for your top failure modes.* |

---

## 5. Code Snippets

`scripts/check_snippets.py` runs every `python` block in `research/` in CI.

1. **Make each block run on its own.** Define the data the block needs. Readers copy single blocks.
2. **End with `assert`s, not `print`s.** Pin the edge case that the block exists to teach, such as a missing score or an overlap.
3. **Mark dependent blocks.** Put `<!-- snippet: continue -->` on the line above the fence. The block then runs after the earlier passing blocks on the page.
4. **Mark blocks that cannot run in CI.** Use `<!-- snippet: skip: <reason> -->` for API keys, model downloads, databases, or application imports. The reason is required.
5. **Keep dependencies light.** Add a library to `requirements-snippets.txt` only if it installs without downloads or credentials.
