#!/usr/bin/env python3
"""Aggregate verifier findings from all verify-workflow journals.
Reads every subagents/workflows/*/journal.jsonl, pulls each agent's returned
{path, shapeOk, issues:[{severity,kind,detail}]}, dedupes, and prints grouped by severity."""
import json, glob, os, sys

BASE = "/root/.claude/projects/-home-user-the-Hindu-timeline/5202f9ed-919b-5a8d-b86a-619632cdf381/subagents/workflows"

def extract(obj):
    """Recursively find dicts that look like a verifier result (have 'path' and 'issues')."""
    out = []
    if isinstance(obj, dict):
        if "path" in obj and "issues" in obj and isinstance(obj["issues"], list):
            out.append(obj)
        else:
            for v in obj.values():
                out.append and out.extend(extract(v))
    elif isinstance(obj, list):
        for v in obj:
            out.extend(extract(v))
    elif isinstance(obj, str):
        s = obj.strip()
        if s.startswith(("{", "[")):
            try:
                out.extend(extract(json.loads(s)))
            except Exception:
                pass
    return out

def main():
    # Only look at verify runs: journals whose agents returned path/issues objects.
    results = {}
    for jp in glob.glob(os.path.join(BASE, "*", "journal.jsonl")):
        for line in open(jp, encoding="utf-8"):
            try:
                d = json.loads(line)
            except Exception:
                continue
            if d.get("type") != "result":
                continue
            for r in extract(d):
                p = r["path"]
                # keep the record with the most issues if duplicated across runs
                if p not in results or len(r.get("issues", [])) > len(results[p].get("issues", [])):
                    results[p] = r
    findings = []
    for p, r in results.items():
        for iss in r.get("issues", []):
            findings.append({"path": p, **iss})
    order = {"high": 0, "medium": 1, "low": 2}
    findings.sort(key=lambda f: (order.get(f.get("severity"), 3), f["path"]))
    counts = {}
    for f in findings:
        counts[f.get("severity", "?")] = counts.get(f.get("severity", "?"), 0) + 1
    print(f"files verified: {len(results)} | findings: {len(findings)} | by severity: {counts}")
    show = sys.argv[1] if len(sys.argv) > 1 else "high,medium"
    levels = show.split(",")
    for f in findings:
        if "all" in levels or f.get("severity") in levels:
            print(f"\n[{f.get('severity','?').upper()}] {f['path']} ({f.get('kind','')})")
            print("  " + f.get("detail", "").replace("\n", "\n  "))
    # persist full set
    json.dump(findings, open("/home/user/the-Hindu-timeline/tools/_findings.json", "w"),
              ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
