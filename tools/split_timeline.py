#!/usr/bin/env python3
"""One-shot migration: split TIMELINE.md (single 2.5MB file) into a hub +
nine per-period files under timeline/. Lossless: asserts every event survives.

After this runs, TIMELINE.md is a compact hub linking timeline/<nn>-<period>.md,
and repo_tools.py maintains the split going forward."""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "TIMELINE.md")
TLDIR = os.path.join(ROOT, "timeline")

# period title (exact) -> (filename, short label for nav)
PERIODS = [
    ("Before Time — Cosmogony & the First Creation", "00-before-time.md", "Before Time"),
    ("The Earlier Manvantaras (1–6) & Primordial Reigns", "01-earlier-manvantaras.md", "Earlier Manvantaras"),
    ("Satya (Kṛta) Yuga — current 28th Mahāyuga", "02-satya-yuga.md", "Satya Yuga"),
    ("Tretā Yuga", "03-treta-yuga.md", "Tretā Yuga"),
    ("Dvāpara Yuga", "04-dvapara-yuga.md", "Dvāpara Yuga"),
    ("Kali Yuga — Scriptural & Prophetic", "05-kali-yuga-scriptural.md", "Kali (Scriptural)"),
    ("Kali Yuga — Documented History", "06-kali-yuga-history.md", "Kali (History)"),
    ("The Future Manvantaras (8–14) & the End", "07-future-manvantaras.md", "Future Manvantaras"),
    ("Cross-Yuga & Recurring Myths", "08-cross-yuga.md", "Cross-Yuga"),
]

LINK_RE = re.compile(r"\]\((?!\.\./|https?://|#|mailto:|/)([^)]+)\)")

def add_dotdot(line):
    """Prepend ../ to every root-relative markdown link target in a moved line."""
    return LINK_RE.sub(lambda m: "](../" + m.group(1) + ")", line)

def main():
    text = open(SRC, encoding="utf-8").read()
    lines = text.split("\n")
    sec_re = re.compile(r"^## (.+?)  ·  (\d+) events$")
    # locate section header indices
    heads = [(i, sec_re.match(l)) for i, l in enumerate(lines) if sec_re.match(l)]
    assert len(heads) == 9, f"expected 9 sections, found {len(heads)}"
    titles = [m.group(1) for _, m in heads]
    assert titles == [p[0] for p in PERIODS], f"section titles differ:\n{titles}"

    top = lines[:heads[0][0]]  # top matter before first section

    sections = []  # (title, header_count, intro, [bullets])
    total_src_bullets = 0
    for k, (idx, m) in enumerate(heads):
        end = heads[k + 1][0] if k + 1 < len(heads) else len(lines)
        block = lines[idx:end]
        title = m.group(1); hdr = int(m.group(2))
        intro = None
        bullets = []
        for l in block[1:]:
            if l.startswith("- **"):
                bullets.append(l)
            elif intro is None and l.startswith("*"):
                intro = l
        assert hdr == len(bullets), f"{title}: header {hdr} != {len(bullets)} bullets"
        total_src_bullets += len(bullets)
        sections.append((title, hdr, intro or "", bullets))
    assert total_src_bullets == 7918 or total_src_bullets == sum(s[1] for s in sections)

    # footer note: trailing lines after the last bullet (the generated-by note)
    last = heads[-1][0]
    tail = lines[last:]
    # find last bullet in tail, capture non-bullet remainder
    lastb = max(i for i, l in enumerate(tail) if l.startswith("- **"))
    footer = [l for l in tail[lastb + 1:] if l.strip() and not l.strip() == "---"]
    footer_note = next((l for l in footer if l.startswith("*")), "")

    os.makedirs(TLDIR, exist_ok=True)
    grand_total = sum(s[1] for s in sections)

    # ---- write the nine period files ----
    written_bullets = 0
    for k, (title, hdr, intro, bullets) in enumerate(sections):
        _, fname, label = PERIODS[k]
        prev = PERIODS[k - 1] if k > 0 else None
        nxt = PERIODS[k + 1] if k + 1 < len(PERIODS) else None
        nav = []
        if prev:
            nav.append(f"← Prev: [{prev[2]}]({prev[1]})")
        nav.append("[↑ TIMELINE hub](../TIMELINE.md)")
        if nxt:
            nav.append(f"Next: [{nxt[2]}]({nxt[1]}) →")
        nav_line = " · ".join(nav)
        body = [
            f"# TIMELINE · {title}",
            "",
            f"> **Period {k + 1} of 9 on the cosmic clock.** One slice of the corpus-wide "
            f"[TIMELINE hub](../TIMELINE.md); each entry links to the file where the event is detailed. "
            f"Back to the [master index](../README.md).",
            f"> {nav_line}",
            "",
            f"**{hdr} events.**",
            "",
            intro,
            "",
            "---",
            "",
        ]
        body += [add_dotdot(b) for b in bullets]
        written_bullets += len(bullets)
        body += ["", "---", "", f"> {nav_line}", ""]
        with open(os.path.join(TLDIR, fname), "w", encoding="utf-8") as fh:
            fh.write("\n".join(body))
        print(f"  timeline/{fname}: {hdr} events")

    assert written_bullets == grand_total, f"lost events: {written_bullets} != {grand_total}"

    # ---- rewrite TIMELINE.md as the hub ----
    hub = [
        "# TIMELINE — The Cosmic-Clock Index (hub)",
        "",
        "> **Every notable event in the corpus, sorted on the cosmic clock.** This hub links the "
        "**nine per-period files** below (split out for fast access and clean diffs); each entry there "
        "links to the file where the event is detailed. Hindu chronology is cyclic and often unordered "
        "within an age, so sequence inside each period is approximate. Back to the [master index](README.md) · "
        "see [AGENTS.md](AGENTS.md) for how to use this · machine-readable in [`data/events.jsonl`](data/events.jsonl).",
        "",
        f"**{grand_total} distinct events** across 9 periods. "
        "Current address: 7th (Vaivasvata) Manvantara → 28th Mahāyuga → **Kali Yuga**.",
        "",
        "---",
        "",
        "## The cosmic clock — periods in order",
        "",
        "Creation → earlier Manvantaras → Satya → Tretā → Dvāpara → Kali → the Future, plus the timeless cross-yuga cycles.",
        "",
    ]
    for k, (title, hdr, intro, _) in enumerate(sections):
        _, fname, _label = PERIODS[k]
        hub.append(f"{k + 1}. **[{title}](timeline/{fname})** · **{hdr} events**  ")
        clean_intro = intro.strip().strip("*").strip()
        if clean_intro:
            hub.append(f"   {clean_intro}")
        hub.append("")
    hub += ["---", ""]
    if footer_note:
        hub.append(footer_note)
        hub.append("")
    with open(SRC, "w", encoding="utf-8") as fh:
        fh.write("\n".join(hub))
    print(f"TIMELINE.md hub rewritten; {grand_total} events across 9 files.")

if __name__ == "__main__":
    main()
