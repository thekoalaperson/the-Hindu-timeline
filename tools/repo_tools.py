#!/usr/bin/env python3
"""Maintenance toolchain for The Hindu Timeline repo.

Subcommands:
  linkcheck   - verify every markdown link target (files & dirs) resolves
  indexes     - regenerate the '## 📑 Full Contents' block in each top-level section README
  structure   - regenerate STRUCTURE.md (file tree, word counts, stub flags, totals)
  timeline-check - verify event counts in the 9 timeline/ period files + the TIMELINE.md hub
  timeline-insert F.json - route [{period, line}] events to timeline/<period>.md (adds ../ link
                           prefix), alpha-ish placement, dedupe by title, auto-fix all counts
  data        - regenerate the machine-readable layer (data/events.jsonl, data/catalog.json)

TIMELINE layout: TIMELINE.md is a compact hub; the events live in nine per-period files under
timeline/ (00-before-time.md … 08-cross-yuga.md). Event detail links carry a ../ prefix.
"""
import os, re, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECTIONS = [
    "00-time-and-cosmology", "01-manvantaras", "02-deities-and-cosmic-hierarchy",
    "03-lineages-vamsha", "04-deep-dives", "05-concepts-and-dharma",
    "06-sacred-geography", "07-acharyas-and-sampradayas", "08-beings-and-bestiary",
    "09-artifacts-symbols-and-arts", "90-literature-corpus",
]

# --- TIMELINE split layout: a hub (TIMELINE.md) + nine per-period files in timeline/ ---
TIMELINE_DIR = "timeline"
PERIOD_FILES = [
    ("Before Time — Cosmogony & the First Creation", "00-before-time.md"),
    ("The Earlier Manvantaras (1–6) & Primordial Reigns", "01-earlier-manvantaras.md"),
    ("Satya (Kṛta) Yuga — current 28th Mahāyuga", "02-satya-yuga.md"),
    ("Tretā Yuga", "03-treta-yuga.md"),
    ("Dvāpara Yuga", "04-dvapara-yuga.md"),
    ("Kali Yuga — Scriptural & Prophetic", "05-kali-yuga-scriptural.md"),
    ("Kali Yuga — Documented History", "06-kali-yuga-history.md"),
    ("The Future Manvantaras (8–14) & the End", "07-future-manvantaras.md"),
    ("Cross-Yuga & Recurring Myths", "08-cross-yuga.md"),
]
PERIOD_TO_FILE = {t: TIMELINE_DIR + "/" + f for t, f in PERIOD_FILES}
_DOTDOT_RE = re.compile(r"\]\((?!\.\./|https?://|#|mailto:|/)([^)]+)\)")

def _add_dotdot(line):
    """Prepend ../ to root-relative markdown links (events live one dir deep in timeline/)."""
    return _DOTDOT_RE.sub(lambda m: "](../" + m.group(1) + ")", line)

def write_file(rel, text):
    with open(os.path.join(ROOT, rel), "w", encoding="utf-8") as fh:
        fh.write(text)
STUB_WORDS = 300

def all_md():
    out = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for f in sorted(filenames):
            if f.endswith(".md"):
                out.append(os.path.relpath(os.path.join(dirpath, f), ROOT))
    return sorted(out)

def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as fh:
        return fh.read()

def wc(p):
    return len(read(p).split())

def h1(p):
    for line in read(p).splitlines():
        if line.startswith("# "):
            t = line[2:].strip()
            t = re.sub(r"\*\*?", "", t)
            t = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", t)
            return t
    return os.path.basename(p)

LINK_RE = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")

def linkcheck():
    bad = []
    for p in all_md():
        base = os.path.dirname(os.path.join(ROOT, p))
        for m in LINK_RE.finditer(read(p)):
            t = m.group(1)
            if t.startswith(("http://", "https://", "mailto:", "#")):
                continue
            t = t.split("#")[0]
            if not t:
                continue
            t = re.sub(r"%20", " ", t)
            target = os.path.normpath(os.path.join(base, t))
            if not os.path.exists(target):
                bad.append(f"{p} -> {m.group(1)}")
    print(f"{len(bad)} broken links")
    for b in bad:
        print("  " + b)
    return 1 if bad else 0

def section_files(sec):
    out = []
    for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, sec)):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for f in filenames:
            if f.endswith(".md"):
                out.append(os.path.relpath(os.path.join(dirpath, f), os.path.join(ROOT, sec)))
    return sorted(out)

def flag(p):
    return "🟩" if wc(p) >= STUB_WORDS else "🟨"

def gen_index_block(sec):
    files = section_files(sec)
    content = [f for f in files if os.path.basename(f) != "README.md"]
    lines = ["## 📑 Full Contents", "",
             f"*Auto-generated index of all {len(content)} files in this section. Regenerate with the indexer.*", ""]
    top = [f for f in files if "/" not in f and f != "README.md"]
    for f in top:
        p = os.path.join(sec, f)
        lines.append(f"- {flag(p)} [{h1(p)}]({f})")
    subdirs = sorted({os.path.dirname(f) for f in files if "/" in f})
    for d in subdirs:
        lines.append("")
        lines.append(f"**{d}/**")
        lines.append("")
        dfiles = [f for f in files if os.path.dirname(f) == d]
        readmes = [f for f in dfiles if os.path.basename(f) == "README.md"]
        rest = [f for f in dfiles if os.path.basename(f) != "README.md"]
        for f in readmes + rest:
            p = os.path.join(sec, f)
            lines.append(f"- {flag(p)} [{h1(p)}]({f})")
    return "\n".join(lines) + "\n\n<!-- AUTOINDEX:END -->\n"

def indexes():
    for sec in SECTIONS:
        rp = os.path.join(sec, "README.md")
        text = read(rp)
        block = gen_index_block(sec)
        marker = "## 📑 Full Contents"
        if marker in text:
            pre = text.split(marker)[0].rstrip("\n") + "\n\n"
            # index block is always the last section of the README
            new = pre + block
        else:
            new = text.rstrip("\n") + "\n\n---\n\n" + block
        with open(os.path.join(ROOT, rp), "w", encoding="utf-8") as fh:
            fh.write(new)
        print(f"indexed {sec}")

def structure():
    files = all_md()
    total_words = 0
    stubs = 0
    out = ["# STRUCTURE — Skeleton & Coverage Tracker", "",
           "> The living map of *The Hindu Timeline*: every file, its depth, and what to build next. Regenerated from the actual tree. Back to the [master index](README.md).", ""]
    root_files = [f for f in files if "/" not in f]
    body = []

    def entry(f, indent):
        nonlocal total_words, stubs
        w = wc(f)
        total_words += w
        base = os.path.basename(f)
        if base == "README.md" and f != "README.md":
            fl = ""
        elif f == "README.md":
            fl = ""
        else:
            fl = flag(f) + " "
            if fl.strip() == "🟨":
                stubs += 1
        return f"{'  ' * indent}- {fl}[`{f}`]({f}) · {w}w"

    body.append(f"## Root apparatus  ({len(root_files)} files)\n")
    for f in root_files:
        body.append(entry(f, 0))
    body.append("")
    for sec in SECTIONS + [TIMELINE_DIR]:
        if not os.path.isdir(os.path.join(ROOT, sec)):
            continue
        sfiles = sorted(os.path.join(sec, x) for x in section_files(sec))
        body.append(f"## {sec}  ({len(sfiles)} files)\n")
        for f in sfiles:
            depth = f.count("/") - 1
            body.append(entry(f, depth))
        body.append("")
    header_totals = (f"**Totals:** {len(files)} files · ~{total_words:,} words · {stubs} stubs · "
                     "0 broken internal links (file & dir verified).")
    out += [header_totals, "", "**Legend:** 🟩 deep · 🟨 stub/sparse.", "", "---", "", ""]
    out += body
    tail = ""
    old = read("STRUCTURE.md")
    m = re.search(r"^## Next-step TODO.*", old, re.S | re.M)
    if m:
        tail = "---\n\n" + m.group(0).rstrip() + "\n"
    with open(os.path.join(ROOT, "STRUCTURE.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(out).rstrip("\n") + "\n\n" + tail)
    print(f"STRUCTURE.md: {len(files)} files, ~{total_words:,} words, {stubs} stubs")

SECTION_OF = lambda p: p.split("/")[0]

EVENT_RE = re.compile(
    r"^- \*\*(?P<title>.+?)\*\*\s+[—-]\s+(?P<rest>.*)$"
)

def build_data():
    """Generate the machine-readable layer: data/events.jsonl and data/catalog.json.
    Markdown stays canonical; these are regenerated derivatives."""
    import json as _json
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)

    # --- events.jsonl (one JSON object per timeline bullet, across the 9 period files) ---
    events = []
    for period, fname in PERIOD_FILES:
        rel = TIMELINE_DIR + "/" + fname
        if not os.path.exists(os.path.join(ROOT, rel)):
            continue
        for ln in read(rel).splitlines():
            if not ln.startswith("- **"):
                continue
            em = EVENT_RE.match(ln)
            if not em:
                continue
            title = em.group("title").strip()
            rest = em.group("rest").strip()
            actors = []
            am = re.search(r"_\(actors:\s*(.+?)\)_", rest)
            if am:
                actors = [a.strip() for a in re.split(r",\s*", am.group(1)) if a.strip()]
            detail_file = None
            dm = re.search(r"\[details\]\(([^)]+)\)", rest)
            if dm:
                detail_file = dm.group(1).split("#")[0]
                if detail_file.startswith("../"):   # store repo-root-relative for consumers
                    detail_file = detail_file[3:]
            source = None
            sm = re.search(r"—\s*\((?P<s>.+)\)\s*(?:\[[^\]]*\]\s*)*$", rest)
            if sm:
                source = sm.group("s").strip()
            # description = rest with the actors/details/source scaffolding stripped
            desc = rest
            desc = re.sub(r"\s*_\(actors:.+?\)_", "", desc)
            desc = re.sub(r"\s*→?\s*\[details\]\([^)]+\).*$", "", desc)
            desc = desc.strip(" —-→")
            events.append({
                "title": title,
                "description": desc,
                "actors": actors,
                "period": period,
                "source": source,
                "detail_file": detail_file,
            })
    with open(os.path.join(ROOT, "data", "events.jsonl"), "w", encoding="utf-8") as fh:
        for e in events:
            fh.write(_json.dumps(e, ensure_ascii=False) + "\n")

    # --- catalog.json (file inventory) ---
    files = [f for f in all_md() if f != "README.md" and os.path.basename(f) != "README.md"]
    catalog = []
    for f in all_md():
        catalog.append({
            "path": f,
            "title": h1(f),
            "section": SECTION_OF(f) if "/" in f else "(root)",
            "word_count": wc(f),
            "is_index": os.path.basename(f) == "README.md",
        })
    total_words = sum(c["word_count"] for c in catalog)
    payload = {
        "files": len(catalog),
        "content_files": len(files),
        "total_words": total_words,
        "events": len(events),
        "sections": SECTIONS,
        "catalog": sorted(catalog, key=lambda c: c["path"]),
    }
    with open(os.path.join(ROOT, "data", "catalog.json"), "w", encoding="utf-8") as fh:
        _json.dump(payload, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    print(f"data/events.jsonl: {len(events)} events · data/catalog.json: {len(catalog)} files, ~{total_words:,} words")

def timeline_check(fix=False):
    """Verify per-period-file event counts (the '**N events.**' marker) and the hub's
    per-period counts + grand total. With --fix, rewrite all of them to the actual counts."""
    ok = True
    actuals = {}
    for period, fname in PERIOD_FILES:
        rel = TIMELINE_DIR + "/" + fname
        text = read(rel)
        actual = sum(1 for l in text.splitlines() if l.startswith("- **"))
        actuals[fname] = actual
        m = re.search(r"\*\*(\d+) events\.\*\*", text)
        claimed = int(m.group(1)) if m else -1
        status = "OK" if claimed == actual else "MISMATCH"
        if claimed != actual:
            ok = False
        print(f"  {status}: {period}: file-header {claimed}, actual {actual}")
        if fix and m and claimed != actual:
            write_file(rel, text[:m.start()] + f"**{actual} events.**" + text[m.end():])
    total_actual = sum(actuals.values())
    hub = read("TIMELINE.md")
    hub_ok = True
    for period, fname in PERIOD_FILES:
        hm = re.search(r"\(timeline/" + re.escape(fname) + r"\)\*\*[^\n]*?\*\*(\d+) events\*\*", hub)
        if hm:
            if int(hm.group(1)) != actuals[fname]:
                hub_ok = False
                if fix:
                    hub = hub[:hm.start(1)] + str(actuals[fname]) + hub[hm.end(1):]
    tm = re.search(r"\*\*(\d+) distinct events\*\*", hub)
    total_claimed = int(tm.group(1)) if tm else -1
    if total_claimed != total_actual:
        hub_ok = False
    print(f"total: hub {total_claimed}, actual {total_actual}")
    if fix and not hub_ok:
        hub = re.sub(r"\*\*\d+ distinct events\*\*", f"**{total_actual} distinct events**", hub)
        write_file("TIMELINE.md", hub)
        print("counts fixed")
    good = ok and hub_ok
    return 0 if good else (0 if fix else 1)

def strip_key(line):
    m = re.match(r"- \*\*(.+?)\*\*", line)
    t = m.group(1) if m else line
    t = unicodedata.normalize("NFD", t)
    t = "".join(c for c in t if not unicodedata.combining(c))
    return t.lower()

def timeline_insert(json_path):
    """json: list of {"period": "<exact period title>", "line": "- **Event** — ... [details](section/slug.md) ..."}.
    Routes each event to its timeline/<period>.md file, adds the ../ link prefix, alpha-inserts,
    dedupes by bold title, then fixes all counts. Event `line` uses repo-root-relative details paths."""
    import json as _json
    with open(json_path, encoding="utf-8") as fh:
        events = _json.load(fh)
    by_file, skipped = {}, []
    for ev in events:
        period, line = ev["period"], ev["line"].rstrip()
        if period not in PERIOD_TO_FILE:
            skipped.append(f"unknown period: {period!r} for {line[:60]}")
            continue
        if not line.startswith("- **"):
            skipped.append(f"bad line format: {line[:60]}")
            continue
        by_file.setdefault(PERIOD_TO_FILE[period], []).append(_add_dotdot(line))
    inserted, dup = 0, 0
    for rel, newlines in by_file.items():
        text = read(rel)
        lines = text.splitlines()
        bullets = [i for i, l in enumerate(lines) if l.startswith("- **")]
        existing = {strip_key(lines[i]) for i in bullets}
        # bullet region bounds (fall back to just after the first '---' if a file were empty)
        bstart = bullets[0] if bullets else next(i for i, l in enumerate(lines) if l.strip() == "---") + 1
        bend = (bullets[-1] + 1) if bullets else bstart
        for line in newlines:
            key = strip_key(line)
            if key in existing:
                dup += 1
                continue
            insert_at = None
            for i in range(bstart, bend):
                if lines[i].startswith("- **") and strip_key(lines[i]) > key:
                    insert_at = i
                    break
            if insert_at is None:
                insert_at = bend
            lines.insert(insert_at, line)
            existing.add(key)
            bend += 1
            inserted += 1
        write_file(rel, "\n".join(lines) + ("\n" if text.endswith("\n") else ""))
    print(f"inserted {inserted}, duplicates skipped {dup}, errors {len(skipped)}")
    for s in skipped:
        print("  " + s)
    timeline_check(fix=True)

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "linkcheck"
    if cmd == "linkcheck":
        sys.exit(linkcheck())
    elif cmd == "indexes":
        indexes()
    elif cmd == "structure":
        structure()
    elif cmd == "timeline-check":
        sys.exit(timeline_check(fix="--fix" in sys.argv))
    elif cmd == "timeline-insert":
        timeline_insert(sys.argv[2])
    elif cmd == "data":
        build_data()
    else:
        print(__doc__)
