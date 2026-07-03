#!/usr/bin/env python3
"""Generate N self-contained writer-workflow shard scripts from the pending queue."""
import json, os, sys

ROOT = "/home/user/the-Hindu-timeline"
N = int(sys.argv[1]) if len(sys.argv) > 1 else 6

items = json.load(open(os.path.join(ROOT, "tools/round6-pending-items.json")))
pending_paths = sorted(f"{i['section']}/{i['slug']}.md" for i in items)
periods = [
    "Before Time — Cosmogony & the First Creation",
    "The Earlier Manvantaras (1–6) & Primordial Reigns",
    "Satya (Kṛta) Yuga — current 28th Mahāyuga",
    "Tretā Yuga",
    "Dvāpara Yuga",
    "Kali Yuga — Scriptural & Prophetic",
    "Kali Yuga — Documented History",
    "The Future Manvantaras (8–14) & the End",
    "Cross-Yuga & Recurring Myths",
]

# Optional: only regenerate shards for items whose file is still missing/incomplete
def incomplete(it):
    p = os.path.join(ROOT, it["section"], it["slug"] + ".md")
    if not os.path.exists(p):
        return True
    txt = open(p, encoding="utf-8").read()
    return "## Sources" not in txt

remaining = [it for it in items if incomplete(it)] if "--remaining" in sys.argv else items
print(f"items to write this run: {len(remaining)} (of {len(items)} total)")

# round-robin split so priority-2 items are spread across shards
shards = [[] for _ in range(N)]
for idx, it in enumerate(sorted(remaining, key=lambda x: (x["priority"], x["section"], x["slug"]))):
    shards[idx % N].append(it)

TEMPLATE = open(os.path.join(ROOT, "tools/wf_writer.js"), encoding="utf-8").read()
# Replace the args-based header lines with baked-in literals.
HEADER_OLD = """const items = args.items            // [{title, slug, section, priority, brief}]
const pendingPaths = args.pendingPaths  // ["04-deep-dives/foo.md", ...] all 130 being written this round
const PERIODS = args.periods        // the 9 exact TIMELINE section titles"""

for si, shard in enumerate(shards):
    if not shard:
        continue
    baked = (
        f"const items = {json.dumps(shard, ensure_ascii=False)}\n"
        f"const pendingPaths = {json.dumps(pending_paths, ensure_ascii=False)}\n"
        f"const PERIODS = {json.dumps(periods, ensure_ascii=False)}"
    )
    script = TEMPLATE.replace(HEADER_OLD, baked)
    # give each shard a distinct meta name
    script = script.replace(
        "name: 'hindu-corpus-writer',",
        f"name: 'hindu-corpus-writer-s{si}',",
    )
    out = os.path.join(ROOT, f"tools/wf_writer_shard{si}.js")
    open(out, "w", encoding="utf-8").write(script)
    print(f"  shard {si}: {len(shard)} items -> {out}")
