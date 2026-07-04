export const meta = {
  name: 'hindu-corpus-writer',
  description: 'Write a shard of source-cited Hindu-mythology corpus files from the round-6 pending queue',
  phases: [{ title: 'Write' }],
}

const ROOT = '/home/user/the-Hindu-timeline'
const items = args.items            // [{title, slug, section, priority, brief}]
const pendingPaths = args.pendingPaths  // ["04-deep-dives/foo.md", ...] all 130 being written this round
const PERIODS = args.periods        // the 9 exact TIMELINE section titles

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['slug', 'ok', 'wordCount', 'eventCount'],
  properties: {
    slug: { type: 'string' },
    ok: { type: 'boolean', description: 'true if the .md file and events sidecar were both written' },
    wordCount: { type: 'integer' },
    eventCount: { type: 'integer' },
    notes: { type: 'string', description: 'anything the merge step should know (e.g. links you could not verify)' },
  },
}

function buildPrompt(it) {
  const target = `${it.section}/${it.slug}.md`
  return `You are an expert scholar-writer extending *The Hindu Timeline*, a large source-cited, chronologically-organized Markdown knowledge base of Hindu mythology, cosmology, scripture, and tradition. Repo root: ${ROOT}

## YOUR ASSIGNMENT — write exactly ONE file
- **Target path:** \`${target}\`  (write to ${ROOT}/${target})
- **H1 title:** ${it.title}
- **Section:** ${it.section}
- **Brief (scope + source citations you must honor):**
${it.brief}

## STEP 1 — study the conventions (do this first, every time)
- Read \`${ROOT}/AGENTS.md\` §4 and §6 (the file conventions and maintenance rules).
- Read ONE or TWO existing files in \`${ROOT}/${it.section}/\` as exemplars of shape, density, and tone (use ls/Glob to pick real, substantial ones — e.g. a large deep-dive). Match their register exactly.

## STEP 2 — write the content file (\`${target}\`)
Follow the corpus shape PRECISELY:
1. **H1 title** (\`# ${it.title}\` — you may refine wording but keep the subject).
2. A **1–3 line breadcrumb** immediately under the H1: a "> " blockquote giving the cosmic address / where this sits, WITH an up-link to the section's parent README (\`> Parent: [<Section Name>](README.md)\`). Compute the correct RELATIVE path to any link from the location of \`${target}\`.
3. **H2 sections** (\`## …\`) grouping **dense bullets**, one item per bullet, in the house style:
   \`- **Name/Event** — what happens, who is involved. (Source text, chapter)\`
4. **Variants are cataloged, NEVER merged.** When traditions disagree, use nested bullets: \`  - *Variant (SourceText):* …\`. Preserve disagreement with attribution — do not resolve it.
5. **Reliability tags**, carried inline where relevant: \`[scholarly]\` \`[disputed]\` \`[late text]\` \`[interpolation]\` \`[folk]\` \`[oral tradition]\` \`[regional]\`.
6. **The "two clocks":** always distinguish the scriptural/cyclic frame (yugas; Kali began 3102 BCE) from the academic/historical frame (e.g. "[scholarly] c. 900–1000 CE"). Never collapse one into the other.
7. A **\`## Sources\`** section at the foot: Primary (scriptural) texts with chapter/verse, then Web/reference links. Cite specific chapters/verses — but do NOT invent chapter numbers beyond what the brief supplies or what you are confident is correct; when unsure, cite at the parva/khaṇḍa/kāṇḍa level, not a fabricated verse.
8. **Length: 1,200–2,500 words.** Dense, accurate, encyclopedic. No filler, no hedging boilerplate.
9. Optionally a \`## Related Nodes\` list before \`## Sources\` linking kindred files.

**Accuracy is the one thing that matters most.** The failure mode to avoid is subtle factual drift — misattributed sources, invented verse numbers, conflated characters, merged variants. Stay faithful to the named source texts. If the brief flags a name-collision or disambiguation, honor it explicitly.

## STEP 3 — cross-links (0 broken links is an invariant)
- You may link to (a) any file that ALREADY EXISTS in the repo, or (b) any path in the "pending this round" list below (they are being written concurrently).
- For (a): before writing a link, VERIFY the target exists (Glob or \`ls ${ROOT}/<path>\`). Do NOT invent paths.
- Compute every link as a correct RELATIVE path from \`${target}\`. (Files two levels deep like \`04-deep-dives/characters/x.md\` need an extra \`../\`.)
- Pending-this-round paths (safe to link even though not yet on disk):
${pendingPaths.map(p => '  ' + p).join('\n')}

## STEP 4 — TIMELINE events sidecar
Produce **4–15** TIMELINE events for this file and write them as a JSON array to \`${ROOT}/tools/_events/${it.slug}.json\`.
Each array element is \`{"period": <one of the exact titles below>, "line": <the bullet>}\`.
- **period** must be EXACTLY one of these nine strings:
${PERIODS.map(p => '    ' + JSON.stringify(p)).join('\n')}
- **line** format (match the house style exactly):
  \`- **Event Title** — one dense sentence of what happens _(actors: A, B, C)_ → [details](${target}) — (Source, chapter)\`
  The \`[details]\` path is **repo-root-relative** (exactly \`${target}\`, NO \`../\` prefix). Keep each event's bold title distinctive (dedup is by bold title).
- Choose the period by where the event sits on the cosmic clock (most named events are Satya/Tretā/Dvāpara/Kali of the current Mahāyuga; timeless deva–asura/Śaiva/Śākta cycles go under "Cross-Yuga & Recurring Myths"; documented-history saints/temples under "Kali Yuga — Documented History").

## STEP 5 — DO NOT TOUCH shared files
Do NOT edit \`TIMELINE.md\`, any \`README.md\` index block, \`STRUCTURE.md\`, \`tools/repo_tools.py\`, or any file other than your one \`${target}\` and your one \`tools/_events/${it.slug}.json\`. The central merge step handles all of those.

When done, return the schema object (slug, ok=true if both files written, wordCount, eventCount, notes).`
}

const results = await parallel(items.map(it => () =>
  agent(buildPrompt(it), { label: `write:${it.slug}`, phase: 'Write', schema: SCHEMA, effort: 'high' })
    .then(r => r || { slug: it.slug, ok: false, wordCount: 0, eventCount: 0, notes: 'agent returned null' })
))

const ok = results.filter(r => r && r.ok).length
const failed = results.filter(r => !r || !r.ok)
log(`shard done: ${ok}/${items.length} ok; ${failed.length} failed`)
return { ok, total: items.length, failed: failed.map(f => f.slug), results }
