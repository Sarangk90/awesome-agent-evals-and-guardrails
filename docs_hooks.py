"""MkDocs hook: name each nav section after the H1 of its folder's README.md.

Without this, sections would be titled from folder names (e.g. "00 foundations").
"""

import re
from pathlib import Path

from mkdocs.structure.nav import Section
from mkdocs.structure.pages import Page

_H1 = re.compile(r"^#\s+(.+?)\s*#*\s*$", re.MULTILINE)


def _retitle(items):
    for item in items:
        if not isinstance(item, Section):
            continue
        index = next(
            (c for c in item.children if isinstance(c, Page) and c.file.name == "index"),
            None,
        )
        if index is not None:
            match = _H1.search(Path(index.file.abs_src_path).read_text(encoding="utf-8"))
            if match:
                item.title = match.group(1)
        _retitle(item.children)


def on_nav(nav, config, files):
    _retitle(nav.items)
    return nav
