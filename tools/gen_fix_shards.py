#!/usr/bin/env python3
"""Generate N self-contained fix-workflow shard scripts from tools/_findings.json.
Groups findings by file; only files that have at least one high/medium finding
(or a mechanical low) get a fix-agent. Balances shards by finding count."""
import json, os, sys

ROOT = "/home/user/the-Hindu-timeline"
N = int(sys.argv[1]) if len(sys.argv) > 1 else 6

findings = json.load(open(os.path.join(ROOT, "tools/_findings.json")))

# group by file (normalize to repo-relative path)
by_file = {}
for f in findings:
    p = f["path"]
    if p.startswith(ROOT):
        p = os.path.relpath(p, ROOT)
    by_file.setdefault(p, []).append({"severity": f.get("severity"), "kind": f.get("kind"), "detail": f.get("detail")})

# keep files that have any high/medium, OR a low that is mechanical (tag/link/numeric)
MECH = ("missing-tag", "broken-link")
workitems = []
for p, iss in by_file.items():
    keep = [i for i in iss]
    has_hm = any(i["severity"] in ("high", "medium") for i in iss)
    has_mech_low = any(i["severity"] == "low" and (i["kind"] in MECH or "tag" in (i["kind"] or "")) for i in iss)
    if has_hm or has_mech_low:
        workitems.append({"path": p, "findings": keep})

# sort by total severity weight desc for balanced greedy assignment
w = {"high": 3, "medium": 2, "low": 1}
workitems.sort(key=lambda it: -sum(w.get(i["severity"], 1) for i in it["findings"]))
shards = [[] for _ in range(N)]
loads = [0] * N
for it in workitems:
    j = loads.index(min(loads))
    shards[j].append(it)
    loads[j] += sum(w.get(i["severity"], 1) for i in it["findings"])

print(f"files needing fixes: {len(workitems)} (of {len(by_file)} verified-with-findings)")

TEMPLATE = open(os.path.join(ROOT, "tools/wf_fix.js"), encoding="utf-8").read()
OLD = 'const workitems = args.workitems  // [{path, findings:[{severity,kind,detail}]}]'
for si, shard in enumerate(shards):
    if not shard:
        continue
    baked = f"const workitems = {json.dumps(shard, ensure_ascii=False)}"
    script = TEMPLATE.replace(OLD, baked).replace(
        "name: 'hindu-corpus-fix',", f"name: 'hindu-corpus-fix-s{si}',")
    out = os.path.join(ROOT, f"tools/wf_fix_shard{si}.js")
    open(out, "w", encoding="utf-8").write(script)
    print(f"  fix shard {si}: {len(shard)} files, weight {loads[si]} -> {out}")
