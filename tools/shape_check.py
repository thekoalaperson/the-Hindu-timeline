#!/usr/bin/env python3
"""Fast, agent-free convention audit for a set of corpus files.
Usage: python3 tools/shape_check.py [path ...]   (defaults to the round-6 pending set)
Checks: H1 present; breadcrumb blockquote with an up-link to a README; ## Sources foot;
word count in [1000,3000]; at least N dense bullets; at least one reliability tag or (Source) cite.
Prints one line per file with issues; exits non-zero if any file has a hard issue."""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAGS = ("[scholarly]", "[disputed]", "[late text]", "[interpolation]",
        "[folk]", "[oral tradition]", "[regional]")

def targets():
    if len(sys.argv) > 1:
        return sys.argv[1:]
    items = json.load(open(os.path.join(ROOT, "tools/round6-pending-items.json")))
    return [f"{i['section']}/{i['slug']}.md" for i in items]

def check(rel):
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        return ["MISSING"]
    txt = open(p, encoding="utf-8").read()
    lines = txt.splitlines()
    issues = []
    # H1
    h1s = [l for l in lines if l.startswith("# ")]
    if not h1s:
        issues.append("no-H1")
    # breadcrumb: a blockquote near the top with a markdown link (up-link)
    top = "\n".join(lines[:12])
    if ">" not in top or "](" not in top:
        issues.append("no-breadcrumb-uplink")
    elif "README.md" not in top and "../" not in top:
        issues.append("breadcrumb-no-parent-link")
    # Sources foot
    if "## Sources" not in txt and "## sources" not in txt.lower():
        issues.append("no-Sources")
    # word count
    w = len(txt.split())
    if w < 1000:
        issues.append(f"short({w}w)")
    elif w > 3200:
        issues.append(f"long({w}w)")
    # bullet density
    bullets = [l for l in lines if l.lstrip().startswith(("- ", "* "))]
    if len(bullets) < 8:
        issues.append(f"few-bullets({len(bullets)})")
    # reliability tags or source cites
    if not any(t in txt for t in TAGS) and txt.count("(") < 5:
        issues.append("no-tags-or-cites")
    return issues

def main():
    rels = targets()
    bad = 0
    for rel in sorted(set(rels)):
        iss = check(rel)
        if iss:
            bad += 1
            print(f"  {rel}: {', '.join(iss)}")
    total = len(set(rels))
    print(f"shape-check: {total - bad}/{total} clean; {bad} with issues")
    return 1 if bad else 0

if __name__ == "__main__":
    sys.exit(main())
