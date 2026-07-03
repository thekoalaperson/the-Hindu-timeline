# HANDOFF — Round-6 "Full One-Over" (state & pending work)

> Status document for the agent (or human) picking up the round-6 completeness drive.
> Read [`AGENTS.md`](AGENTS.md) first — it defines the corpus conventions this work must follow.
> Owner's aims for this round: **(a)** a complete record of Hindu mythology/stories — with special
> attention to *stories the corpus does not have at all*, found by diffing **actual source-text
> inventories** (not just general knowledge); **(b)** keep the data maintainable & accessible
> (decision: stay Markdown-in-git; no OpenDocument — see §4).

---

## 1. What round 6 has already done (committed & pushed on this branch)

| Commit | Content |
|---|---|
| `ee94a2d` | Integrity pass: 36 verified fixes/merges/expands (duplicate files merged — Babhruvahana, Ahalya, Tamil Siddhars, Sarpa-satra, Raghuvamsha kings; manvantara/Kali-yuga arithmetic; stale "planned" blocks; TIMELINE de-duplication −40 events) |
| `c7e60ad` | Batch 1: 9 new files (muhurta, Bhadrakali-Kerala, Radha, Nanda Devi, Ramdev Pir, Tejaji, Tulja Bhavani, Nepal Kumari/Taleju, Theyyam) +69 TIMELINE events |
| `0ed9d6a` | Batch 2a: 92 new files (story deep-dives, characters, sthala legends, text profiles) +830 TIMELINE events |
| (this commit) | `tools/` committed; all section indexes + STRUCTURE.md regenerated; this HANDOFF |

Corpus now: **731 md files · ~1.72M words · TIMELINE 6,890 events · 0 broken internal links.**

How the gaps were found (both plans already verified-by-grep, deduplicated, merged):
- a 24-agent knowledge audit (one auditor per section + 10 thematic sweeps + integrity audit);
- a 17-agent **source-inventory diff**: per-text story inventories (wisdomlib/Wikipedia TOCs where
  reachable, text-structure knowledge otherwise) diffed item-by-item against the corpus —
  e.g. Mahābhārata's 67 upākhyānas (47 were covered), Bhāgavata 127 episodes (113 covered),
  Kathāsaritsāgara cycle (only 4/53 covered → hence the katha-literature items below).

## 2. PENDING — the write queue (130 files)

**[`tools/round6-pending-items.json`](tools/round6-pending-items.json)** holds the remaining 130
verified new-file items: `{title, slug, section, priority (1=must,2=strong,3=nice), brief}`.
Each brief contains scope + source citations + (for merged items) `MERGED-SCOPE:` extensions.
They are ordered priority-first. Target path is always `<section>/<slug>.md`.

Writer contract (same as the 101 files already landed):
- Read `AGENTS.md` §4/§6 + one exemplar file from the target section first.
- Shape: H1 → 1–3-line breadcrumb (up-link to section README) → H2 sections of dense sourced
  bullets `**Name** — what happens. (Source, chapter)` → nested `- *Variant (Source):* …` for
  disagreeing traditions (never merge them) → reliability tags `[scholarly] [disputed] [late text]
  [folk] [regional] [oral tradition]` → `## Sources` foot. 1,200–2,500 words. Two-clocks rule.
- Cross-link only files that already exist (verify + compute correct relative path).
- Do NOT hand-edit indexes/STRUCTURE/TIMELINE — see §3 tooling.
- For each file also produce 4–15 TIMELINE events (see §3 for insertion): line format
  `- **Event** — sentence _(actors: A, B)_ → [details](path/from/repo/root.md) — (Source, chapter)`
  (the details target is the new file's own path from the repo root)
  with period exactly one of the nine `##` section titles in `TIMELINE.md`.

Also pending from the earlier batches:
- **Theyyam events**: `02-deities-and-cosmic-hierarchy/theyyam-deities-and-thottam-myths.md` is
  complete but its TIMELINE events were never generated — extract 5–10 and insert.

## 3. Tooling (now in `tools/repo_tools.py` — run from anywhere, python3, stdlib-only)

```
python3 tools/repo_tools.py linkcheck              # invariant: must print "0 broken links"
python3 tools/repo_tools.py indexes                # regenerate every section README's Full-Contents block
python3 tools/repo_tools.py structure              # regenerate STRUCTURE.md (counts, stub flags, totals)
python3 tools/repo_tools.py timeline-check [--fix] # verify/fix TIMELINE per-section + total counts
python3 tools/repo_tools.py timeline-insert F.json # insert events [{period, line}], alpha-ish placement, auto-fix counts
```
**After every batch of new files:** `timeline-insert` → `indexes` → `structure` → `linkcheck`.
Invariants (AGENTS.md §6): every file reachable from README.md; 0 broken links; TIMELINE counts consistent.

## 4. PENDING — structure/accessibility work (decided, not yet built)

1. **`data/` machine-readable layer** (generated, markdown stays canonical): `data/events.jsonl`
   (parse each TIMELINE bullet → `{title, description, actors[], period, source, detail_file}`)
   and `data/catalog.json` (file inventory: path, H1 title, section, word count). Add a
   `data` subcommand to `tools/repo_tools.py`; regenerate alongside `structure`.
2. **Split `TIMELINE.md` (~265k words) into `timeline/<nn>-<period>.md`** (9 per-period files),
   keeping `TIMELINE.md` as hub (counts + links + "current address"). Requires: rewriting the
   event `[details]()` links with a `../` prefix, updating `timeline-insert`/`timeline-check`,
   and updating the navigation contract in `AGENTS.md` §3 and `README.md`.
   (Owner floated OpenDocument format; decision was to **stay Markdown** — ODF would break
   diffs/grep/links. Do not migrate formats.)
3. **Verification pass** over all round-6 files (101 landed + the 130 to come): spot-check
   accuracy against cited sources (adversarial: try to refute specific chapter citations),
   conventions compliance, and cross-link reciprocity. One note: the Nepal-Kumari file's writer
   finished without its safety-review sidecar — include it in the spot-check.
4. **README.md refresh** at the very end: file/event counts in the intro, link `HANDOFF.md`
   removal once done (this file should be deleted when the round completes).

## 5. Operational notes for the next agent

- This machine has 4 cores → the Workflow engine caps at **2 concurrent agents per workflow**.
  For fan-out, launch **several small workflows in parallel** (e.g. 6 shards × ~22 writers)
  rather than one big one.
- Account-level session usage limits can kill agents mid-fleet ("session limit … resets HH:MM UTC").
  Files already written survive; results are journaled per-run under the session's
  `subagents/workflows/<run>/journal.jsonl`. Pattern: bank completed files (commit + timeline-insert),
  compute remaining = items whose `<section>/<slug>.md` is missing or lacks `## Sources`, relaunch.
- Commit in batches with clear messages; push to `claude/hindu-mythology-record-exyxao`.
- All agents so far ran on the session model (claude-fable-5); keep content-writing on the
  strongest available model — the failure mode that matters is subtle factual drift.
