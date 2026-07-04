#!/usr/bin/env python3
"""Generate N self-contained verify-workflow shard scripts over the round-6 new files."""
import json, os, sys

ROOT = "/home/user/the-Hindu-timeline"
N = int(sys.argv[1]) if len(sys.argv) > 1 else 6

items = json.load(open(os.path.join(ROOT, "tools/round6-pending-items.json")))
paths = []
for it in items:
    p = f"{it['section']}/{it['slug']}.md"
    if os.path.exists(os.path.join(ROOT, p)):
        paths.append(p)
paths = sorted(paths)
print(f"files to verify: {len(paths)}")

shards = [[] for _ in range(N)]
for idx, p in enumerate(paths):
    shards[idx % N].append(p)

TEMPLATE = open(os.path.join(ROOT, "tools/wf_verify.js"), encoding="utf-8").read()
OLD = "const paths = args.paths  // [\"04-deep-dives/foo.md\", ...]"

for si, shard in enumerate(shards):
    if not shard:
        continue
    baked = f"const paths = {json.dumps(shard, ensure_ascii=False)}"
    script = TEMPLATE.replace(OLD, baked).replace(
        "name: 'hindu-corpus-verify',", f"name: 'hindu-corpus-verify-s{si}',")
    out = os.path.join(ROOT, f"tools/wf_verify_shard{si}.js")
    open(out, "w", encoding="utf-8").write(script)
    print(f"  verify shard {si}: {len(shard)} files -> {out}")
