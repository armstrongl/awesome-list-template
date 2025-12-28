#!/usr/bin/env python3
"""Sort awesome list items alphabetically within each section.

This script sorts list items in README.md while preserving:
- Table of contents (doctoc block)
- Section headers and structure
- Non-list content within sections

Only external URLs (https://) are sorted to avoid reordering
anchor links or relative URLs in the TOC.
"""

import re
import sys


def sort_readme_items(filepath: str = "README.md") -> bool:
    """Sort list items in the README file.

    Args:
        filepath: Path to the README file to sort.

    Returns:
        True if changes were made, False otherwise.
    """
    with open(filepath, "r") as f:
        content = f.read()

    original_content = content

    # Extract TOC block to preserve it
    toc_pattern = r"(<!-- START doctoc.*?<!-- END doctoc[^\n]*\n)"
    toc_match = re.search(toc_pattern, content, re.DOTALL)
    toc_placeholder = "<!--TOC_PLACEHOLDER-->"

    if toc_match:
        toc_block = toc_match.group(1)
        content = content.replace(toc_block, toc_placeholder)

    # Pattern to match sections with list items (external URLs only)
    # Matches: ## Section Name\n\n- [Name](https://...)...
    section_pattern = (
        r"(## [^\n]+\n\n(?:[^\n]*\n)*?)"
        r"((?:- \[[^\]]+\]\(https?://[^)]+\)[^\n]*\n)+)"
    )

    def sort_items(match):
        header = match.group(1)
        items = match.group(2)
        # Split into individual items and sort case-insensitively
        item_list = [item for item in items.strip().split("\n") if item.startswith("- [")]
        sorted_items = sorted(item_list, key=lambda x: x.lower())
        return header + "\n".join(sorted_items) + "\n"

    sorted_content = re.sub(section_pattern, sort_items, content)

    # Restore TOC block
    if toc_match:
        sorted_content = sorted_content.replace(toc_placeholder, toc_block)

    if sorted_content != original_content:
        with open(filepath, "w") as f:
            f.write(sorted_content)
        return True

    return False


if __name__ == "__main__":
    filepath = sys.argv[1] if len(sys.argv) > 1 else "README.md"
    changed = sort_readme_items(filepath)
    sys.exit(0 if changed else 1)
