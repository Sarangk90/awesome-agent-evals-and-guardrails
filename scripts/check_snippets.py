"""Run every ```python block in research/: python scripts/check_snippets.py [paths...]

Each block runs in a fresh interpreter, so a reader can copy it on its own. Put a marker
on the line just before a fence to change that:

    <!-- snippet: continue -->            run after the earlier runnable blocks on the page
    <!-- snippet: skip: <reason> -->      do not run; the reason is required

A block fails if it raises (including a failed assert) or runs longer than TIMEOUT seconds.
"""

import json
import os
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "research"
TIMEOUT = 120
PREFIX = re.compile(r"^((?:\s*>)*\s*)")  # blockquote markers and indentation before a fence
MARKER = re.compile(r"^<!--\s*snippet:\s*(continue|skip)\s*(?::\s*(.*?))?\s*-->$")

# Runs inside the child interpreter: exec the blocks in one namespace, report the failing one.
DRIVER = """
import json, sys, traceback
ns = {"__name__": "__main__"}
for label, code in json.load(sys.stdin):
    try:
        exec(compile(code, label, "exec"), ns)
    except BaseException:
        print(label, file=sys.stderr)
        traceback.print_exc()
        sys.exit(1)
"""


@dataclass
class Block:
    md: Path
    line: int
    code: str
    mode: str = "run"  # run | continue | skip
    reason: str = ""

    @property
    def label(self) -> str:
        return f"{Path(os.path.relpath(self.md, ROOT)).as_posix()}:{self.line}"


def blocks(md: Path) -> list[Block]:
    lines = md.read_text(encoding="utf-8").splitlines()
    found, i = [], 0
    while i < len(lines):
        prefix = PREFIX.match(lines[i]).group(1)
        if not lines[i][len(prefix):].startswith("```python"):
            i += 1
            continue
        start, body, i = i, [], i + 1
        while i < len(lines) and not lines[i][len(prefix):].lstrip().startswith("```"):
            body.append(lines[i][len(prefix):] if lines[i].startswith(prefix) else lines[i].lstrip(" >"))
            i += 1
        block = Block(md, start + 1, "\n".join(body) + "\n")
        unquoted = (l.lstrip(" >").rstrip() for l in reversed(lines[:start]))
        before = next((l for l in unquoted if l), "")  # nearest non-blank line above the fence
        if marker := MARKER.match(before):
            block.mode, block.reason = marker.group(1), marker.group(2) or ""
        found.append(block)
        i += 1
    return found


def run(chain: list[Block]) -> str | None:
    """Return None on success, or the error output."""
    payload = json.dumps([(b.label, b.code) for b in chain])
    with tempfile.TemporaryDirectory() as tmp:  # blocks that write files stay out of the repo
        try:
            proc = subprocess.run([sys.executable, "-I", "-c", DRIVER], input=payload, text=True,
                                  capture_output=True, cwd=tmp, timeout=TIMEOUT)
        except subprocess.TimeoutExpired:
            return f"timed out after {TIMEOUT}s"
    return None if proc.returncode == 0 else proc.stderr.strip()


def check(md: Path) -> tuple[int, int, list[str]]:
    passed, skipped, failures, page = 0, 0, [], []
    for b in blocks(md):
        if b.mode == "skip":
            skipped += 1
            if not b.reason:
                failures.append(f"{b.label}: a skip marker needs a reason")
            continue
        chain = page + [b] if b.mode == "continue" else [b]
        if b.mode == "continue" and not page:
            failures.append(f"{b.label}: 'continue' with no earlier runnable block on the page")
        elif error := run(chain):
            failures.append(f"{b.label}: failed\n{error}")
        else:
            passed += 1
            page.append(b)  # only passing blocks feed later 'continue' blocks: one bug, one report
    return passed, skipped, failures


def main() -> None:
    paths = [Path(p).resolve() for p in sys.argv[1:]] or [DOCS]
    pages = sorted({md for p in paths for md in ([p] if p.is_file() else p.rglob("*.md"))})
    passed = skipped = 0
    failures = []
    for md in pages:
        p, s, f = check(md)
        passed, skipped, failures = passed + p, skipped + s, failures + f
    for failure in failures:
        print(f"FAIL {failure}\n")
    print(f"{passed} passed, {skipped} skipped, {len(failures)} failed")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
