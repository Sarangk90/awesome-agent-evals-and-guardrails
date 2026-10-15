"""Build or preview the docs site: python scripts/docs.py [build|serve] [zensical args...]

Generates the navigation from research/ (folders and files sorted by name, section
titles taken from each folder's README.md H1), writes it into a generated copy of
zensical.toml, then runs Zensical with that config.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "research"
CONFIG = ROOT / "zensical.toml"
GENERATED = ROOT / ".zensical.generated.toml"
H1 = re.compile(r"^#\s+(.+?)\s*#*\s*$", re.MULTILINE)


def title(md: Path) -> str:
    match = H1.search(md.read_text(encoding="utf-8"))
    return match.group(1) if match else md.parent.name


def short_title(md: Path) -> str:
    return title(md).split(":", 1)[0].strip()


def section(folder: Path) -> list:
    entries = []
    readme = folder / "README.md"
    if readme.exists():
        entries.append(readme.relative_to(DOCS).as_posix())
    for child in sorted(folder.iterdir()):
        if child.is_dir() and any(child.rglob("*.md")):
            sub = section(child)
            label = title(child / "README.md") if (child / "README.md").exists() else child.name
            entries.append({label: sub[0] if len(sub) == 1 else sub})
        elif child.suffix == ".md" and child.name != "README.md":
            entries.append({short_title(child): child.relative_to(DOCS).as_posix()})
    return entries


def toml(value) -> str:
    if isinstance(value, list):
        return "[\n" + "".join(f"  {toml(v)},\n" for v in value) + "]"
    if isinstance(value, dict):
        return "{ " + ", ".join(f"{json.dumps(k)} = {toml(v)}" for k, v in value.items()) + " }"
    return json.dumps(value)


def main() -> None:
    nav = section(DOCS)
    if nav and nav[0] == "README.md":
        nav[0] = {"Home": "README.md"}
    config = CONFIG.read_text(encoding="utf-8")
    config = config.replace("[project]\n", f"[project]\nnav = {toml(nav)}\n", 1)
    GENERATED.write_text(config, encoding="utf-8")
    args = sys.argv[1:] or ["build"]
    sys.exit(subprocess.call(["zensical", args[0], "-f", str(GENERATED), *args[1:]], cwd=ROOT))


if __name__ == "__main__":
    main()
