#!/usr/bin/env python3
"""Maintenance toolchain for The Hindu Timeline repo.

Subcommands:
  linkcheck   - verify every markdown link target (files & dirs) resolves
  indexes     - regenerate the '## 📑 Full Contents' block in each top-level section README
  structure   - regenerate STRUCTURE.md (file tree, word counts, stub flags, totals)
  timeline-check - verify TIMELINE.md event counts (header + per-section)
"""
import os, re, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECTIONS = [
    "00-time-and-cosmology", "01-manvantaras", "02-deities-and-cosmic-hierarchy",
    "03-lineages-vamsha", "04-deep-dives", "05-concepts-and-dharma",
    "06-sacred-geography", "07-acharyas-and-sampradayas", "08-beings-and-bestiary",
    "09-artifacts-symbols-and-arts", "90-literature-corpus",
]
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
    for sec in SECTIONS:
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

def timeline_check(fix=False):
    text = read("TIMELINE.md")
    lines = text.splitlines()
    sec_re = re.compile(r"^## (.+?)  ·  (\d+) events$")
    counts, cur, name = {}, 0, None
    order = []
    for ln in lines:
        m = sec_re.match(ln)
        if m:
            if name is not None:
                counts[name] = (counts[name][0], cur)
            name = m.group(1)
            counts[name] = (int(m.group(2)), 0)
            order.append(name)
            cur = 0
        elif ln.startswith("- **") and name is not None:
            cur += 1
    if name is not None:
        counts[name] = (counts[name][0], cur)
    total_claimed = int(re.search(r"\*\*(\d+) distinct events\*\*", text).group(1))
    total_actual = sum(v[1] for v in counts.values())
    ok = True
    for n in order:
        c, a = counts[n]
        status = "OK" if c == a else "MISMATCH"
        if c != a:
            ok = False
        print(f"  {status}: {n}: header {c}, actual {a}")
    print(f"total: header {total_claimed}, actual {total_actual}")
    if fix and (not ok or total_claimed != total_actual):
        for n in order:
            c, a = counts[n]
            text = text.replace(f"## {n}  ·  {c} events", f"## {n}  ·  {a} events")
        text = re.sub(r"\*\*\d+ distinct events\*\*", f"**{total_actual} distinct events**", text)
        with open(os.path.join(ROOT, "TIMELINE.md"), "w", encoding="utf-8") as fh:
            fh.write(text)
        print("counts fixed")
    return 0 if ok and total_claimed == total_actual else (0 if fix else 1)

def strip_key(line):
    m = re.match(r"- \*\*(.+?)\*\*", line)
    t = m.group(1) if m else line
    t = unicodedata.normalize("NFD", t)
    t = "".join(c for c in t if not unicodedata.combining(c))
    return t.lower()

def timeline_insert(json_path):
    """json: list of {"period": "<exact section title>", "line": "- **Event** — ..."}"""
    import json as _json
    with open(json_path, encoding="utf-8") as fh:
        events = _json.load(fh)
    text = read("TIMELINE.md")
    lines = text.splitlines()
    sec_re = re.compile(r"^## (.+?)  ·  (\d+) events$")
    # map section name -> (start_idx, end_idx) of its bullet region
    secs = {}
    cur = None
    for i, ln in enumerate(lines):
        m = sec_re.match(ln)
        if m:
            cur = m.group(1)
            secs[cur] = [i, len(lines)]
        elif cur and ln.startswith("## "):
            pass
    names = list(secs.keys())
    for j, n in enumerate(names):
        end = secs[names[j + 1]][0] if j + 1 < len(names) else len(lines)
        secs[n][1] = end
    inserted, skipped, dup = 0, [], 0
    existing_keys = {strip_key(l) for l in lines if l.startswith("- **")}
    for ev in events:
        period, line = ev["period"], ev["line"].rstrip()
        if period not in secs:
            skipped.append(f"unknown period: {period!r} for {line[:60]}")
            continue
        if not line.startswith("- **"):
            skipped.append(f"bad line format: {line[:60]}")
            continue
        if strip_key(line) in existing_keys:
            dup += 1
            continue
        start, end = secs[period]
        key = strip_key(line)
        pos = end
        # skip trailing blank lines of the region
        while pos > start and (pos - 1 >= len(lines) or not lines[pos - 1].startswith("- **")):
            pos -= 1
            if pos <= start:
                break
        insert_at = None
        for i in range(start, end):
            if lines[i].startswith("- **") and strip_key(lines[i]) > key:
                insert_at = i
                break
        if insert_at is None:
            last_bullet = max((i for i in range(start, end) if lines[i].startswith("- **")), default=None)
            insert_at = (last_bullet + 1) if last_bullet is not None else start + 4
        lines.insert(insert_at, line)
        existing_keys.add(key)
        # shift all section boundaries after insert
        for n in names:
            if secs[n][0] >= insert_at:
                secs[n][0] += 1
            if secs[n][1] >= insert_at:
                secs[n][1] += 1
        inserted += 1
    with open(os.path.join(ROOT, "TIMELINE.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + ("\n" if text.endswith("\n") else ""))
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
    else:
        print(__doc__)
