# AGENTS.md — How to Query *The Hindu Timeline*

This repository is a large, source-cited, **chronologically-organized** knowledge base of Hindu
mythology, cosmology, scripture, and tradition (~200 markdown files, ~400k words). This file tells an
agent (or a human) how it is organized and how to find or verify anything in **≤ 2 hops**.

---

## 1. The one thing to understand first: it is organized on the cosmic clock

Hindu time is **cyclic and nested**. The whole spine mirrors that nesting:

```
Brahmā's life (100 yrs) → Kalpa (a day of Brahmā) → 14 Manvantaras → 71 Mahāyugas each
                                                   → 4 Yugas (Satya, Tretā, Dvāpara, Kali) → events
```

**Current address ("you are here"):** Śveta-Vārāha Kalpa · **7th (Vaivasvata) Manvantara** ·
**28th Mahāyuga** · **Kali Yuga** (began 3102 BCE). Most named events sit in the four yugas of this
current Mahāyuga; that branch is the most deeply populated.

---

## 2. Map: which section answers which kind of question

| If the question is about… | Look in |
|---|---|
| How time/cosmology works (yugas, kalpas, pralaya, creation, calendar, jyotiṣa) | `00-time-and-cosmology/` |
| **When** an event happened / the chronological spine (manvantaras → yugas → events) | `01-manvantaras/` |
| A god/goddess, avatar, cosmic beings, the lokas, deity forms | `02-deities-and-cosmic-hierarchy/` |
| Royal genealogies (Solar/Lunar dynasties) | `03-lineages-vamsha/` |
| A specific big story in depth (Rāmāyaṇa kāṇḍa, Mahābhārata parva, Gītā, Samudra Manthana, a named tale) | `04-deep-dives/` |
| A doctrine/concept (karma, mokṣa, the darśanas, yoga, varṇa/āśrama) | `05-concepts-and-dharma/` |
| A sacred place (pīṭha, jyotirliṅga, dhām, temple legend, river) | `06-sacred-geography/` |
| A teacher or sect (Śaṅkara, Rāmānuja, sampradāyas, bhakti saints, modern reformers) | `07-acharyas-and-sampradayas/` |
| A *class* of being (apsaras, nāgas, asuras, yakṣas, the 33 devas, rishis) | `08-beings-and-bestiary/` |
| A divine weapon/object, vāhana, the 64 arts, a symbol | `09-artifacts-symbols-and-arts/` |
| A **text** (a Veda, Upaniṣad, a specific Purāṇa, an Āgama, the Tamil canon) | `90-literature-corpus/` (per-Purāṇa maps in `90-…/puranas/`) |

A topic often appears in **layers**, by design: a thumbnail in a roster, a chronological summary in the
relevant yuga file, and a full treatment in a `04-deep-dives/` file — all cross-linked. The deep-dive is
the canonical home; the others summarize and link to it.

## 3. How to find a specific thing (navigation contract)

1. Start at **[`README.md`](README.md)** — the master index with the "you are here" address and links to every section.
2. Open the relevant **section `README.md`** — each ends with an auto-generated **`## 📑 Full Contents`** block that links **every** file in that section (so nothing is hidden).
3. Or jump straight to **[`STRUCTURE.md`](STRUCTURE.md)** — a flat list of *all* files with word counts and deep/stub flags.

**Invariant:** every file is reachable from `README.md`, and there are **0 broken internal links**
(files and directories). If you add a file, append it to its section index (or re-run the indexer) and
re-run the link check so these invariants hold.

## 4. How to read a file (conventions)

Every content file follows the same shape:
- An **H1 title**, then a 1–3 line **breadcrumb** ("where this sits", with an up-link to its parent).
- **Dense bullets**, one per event/item: `**Name** — what happens, who's involved. (Source text)`.
- **Variants are cataloged, never merged.** When traditions disagree, you'll see nested
  `- *Variant (SourceText):* …` bullets. *Treat these as deliberate — multiple traditions are all recorded and attributed, not contradictions to resolve.*
- A **`## Sources`** section at the foot lists the texts/links used.

### Reliability tags — read these before trusting a claim
- **`(Source text)`** in parentheses = the scripture/text the claim is attributed to.
- **`[scholarly]` / academic dating** = modern historical-critical view (vs the traditional/scriptural one).
- **`[disputed]`** = contested even within tradition. **`[late text]` / `[interpolation]`** = likely a later addition.
- **`[folk]` / `[oral tradition]` / `[regional]`** = outside the Sanskrit canon.

### The "two clocks"
Dates come in two frames, always distinguished: the **scriptural/cyclic** frame (yugas; e.g. Kali began
3102 BCE) and the **academic/historical** frame (e.g. Vedic period c. 1500–500 BCE). Never collapse one
into the other; the corpus deliberately keeps both.

## 5. Answering a question well
- **Prefer the deepest, most specific file** (the canonical home) over a roster mention.
- **Report variants** when they exist — the value of this corpus is that it preserves disagreement with attribution.
- **Carry the tags through:** if the source is `[disputed]` or `[scholarly]`, say so rather than stating it as settled fact.
- **Cite the file path** you used (e.g. `04-deep-dives/samudra-manthana.md`) so the answer is checkable.

## 6. Maintenance (for an agent extending the corpus)
- Tools live in the build history; the two invariant checks are: **(a)** every `.md` reachable from `README.md`, **(b)** 0 broken links (resolve every markdown link target, for files *and* dirs).
- New files: place them in the right section, give them the standard shape (H1 + breadcrumb + bullets + `## Sources`), then refresh the section's `## 📑 Full Contents` index and `STRUCTURE.md`.
- Keep the canonical-home rule: deep treatment in one file, summaries elsewhere cross-link to it.
