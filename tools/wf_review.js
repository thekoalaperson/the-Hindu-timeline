export const meta = {
  name: 'hindu-corpus-full-review',
  description: 'Full review: TIMELINE-split correctness, tooling, doc consistency, data layer, and a broad corpus-health sample',
  phases: [{ title: 'Review' }, { title: 'Verify' }],
}

const ROOT = '/home/user/the-Hindu-timeline'

const FINDINGS_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['area', 'verdict', 'findings'],
  properties: {
    area: { type: 'string' },
    verdict: { type: 'string', enum: ['pass', 'pass-with-nits', 'problems'] },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['severity', 'file', 'detail'],
        properties: {
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          file: { type: 'string', description: 'repo-relative path the fix applies to' },
          detail: { type: 'string', description: 'specific, actionable — quote the offending text and state the fix' },
        },
      },
    },
  },
}

// Fixed review tasks (baked, no args). Each is one reviewer agent.
const TASKS = [
  {
    area: 'tooling-code-review',
    prompt: `Code-review the maintenance tooling for the TIMELINE split. Read ${ROOT}/tools/repo_tools.py (focus: PERIOD_FILES, _add_dotdot, timeline_check, timeline_insert, build_data, structure) and ${ROOT}/tools/split_timeline.py. Look adversarially for correctness bugs: could timeline_insert route to the wrong file, double-prefix a link, corrupt the bullet region, or miscount? Does timeline_check correctly detect AND fix both the per-file '**N events.**' markers and the hub's per-period + total counts? Does build_data strip the ../ prefix for every detail_file? Could _add_dotdot wrongly rewrite an already-../ or http link? Any regex that fails on real event lines (em-dashes, nested parens, tags)? Report concrete bugs with the exact line and the fix. Do not run destructive commands; you may run read-only python to probe.`,
  },
  {
    area: 'migration-faithfulness',
    prompt: `Verify the TIMELINE split migration is FAITHFUL and lossless. The old single TIMELINE.md was split into ${ROOT}/timeline/00-before-time.md … 08-cross-yuga.md with a hub at ${ROOT}/TIMELINE.md. Check: (a) the hub lists all 9 files with per-period counts that match each file's actual bullet count and '**N events.**' marker (run: python3 tools/repo_tools.py timeline-check); (b) sample ~5 events per period file and confirm each event's [details](../...) link resolves to a real file (ls it) and the period assignment is semantically sensible; (c) the first and last events of each period file are intact (not truncated at the split boundary); (d) no event line lost its formatting (actors, source, tags). Use git to compare against the pre-split version if helpful (git show HEAD~1:TIMELINE.md). Report any lost/misplaced/mangled events or count drift.`,
  },
  {
    area: 'doc-navigation-consistency',
    prompt: `Audit the meta-docs for consistency after the TIMELINE split and round-6 work. Read ${ROOT}/README.md, ${ROOT}/AGENTS.md, ${ROOT}/STRUCTURE.md, and the ${ROOT}/TIMELINE.md hub. Check: (a) event/file/word counts agree across all of them and with reality (python3 tools/repo_tools.py timeline-check; python3 tools/repo_tools.py data prints totals) — current truth is 870 files, ~2.04M words, 7,918 events; (b) no stale claim that TIMELINE.md is a single flat file of all events, or any dangling reference to HANDOFF.md; (c) the navigation contract (AGENTS §3, README) accurately describes the hub → 9 period files → detail files path, including the ../ prefix note; (d) links in these docs resolve. Report specific inconsistencies with the fix.`,
  },
  {
    area: 'data-layer-audit',
    prompt: `Audit the machine-readable layer. Read a sample of ${ROOT}/data/events.jsonl and ${ROOT}/data/catalog.json (and skim tools/repo_tools.py build_data). Verify: (a) events.jsonl has exactly 7,918 lines, each valid JSON with title/description/actors[]/period/source/detail_file; (b) every detail_file is repo-root-relative (NO ../ prefix) and the file exists on disk — spot-check ~20; (c) period values are exactly the 9 canonical period names; (d) catalog.json's file count and total_words match reality; (e) events with a null source/detail_file are genuinely missing that field, not a parser bug (spot-check a few against the timeline/ files). You may run read-only python/jq. Report parser bugs or data errors.`,
  },
]

// Broad corpus-health sample: 6 slices, each samples files in a section-group and adversarially spot-checks.
const SLICES = [
  ['00-time-and-cosmology', '01-manvantaras'],
  ['02-deities-and-cosmic-hierarchy'],
  ['04-deep-dives'],
  ['05-concepts-and-dharma', '03-lineages-vamsha'],
  ['06-sacred-geography', '07-acharyas-and-sampradayas'],
  ['08-beings-and-bestiary', '09-artifacts-symbols-and-arts', '90-literature-corpus'],
]
for (const dirs of SLICES) {
  TASKS.push({
    area: `corpus-health:${dirs[0]}`,
    prompt: `Broad corpus-health spot-check of the section(s): ${dirs.join(', ')} (under ${ROOT}/). Sample ~4–6 files (mix round-6 new files and older ones; ls the dir(s) and pick a spread). For each, adversarially check: conventions (H1, breadcrumb up-link, dense sourced bullets, variants cataloged not merged, sanctioned reliability tags only, ## Sources foot); citation plausibility on the 1–2 most checkable claims (use WebSearch/WebFetch only if genuinely doubtful); cross-link reciprocity and that links resolve; two-clocks distinction where dates appear. This corpus just had an adversarial fix pass (~180 corrections) — also confirm a couple of fixes did NOT introduce new errors or broken links. Report only real, concrete defects with the file and the fix; do not invent nits. If the sampled files are clean, say so (verdict pass).`,
  })
}

const reviews = await parallel(TASKS.map(t => () =>
  agent(t.prompt, { label: `review:${t.area}`, phase: 'Review', schema: FINDINGS_SCHEMA, effort: 'high' })
    .then(r => r ? { ...r, area: r.area || t.area } : { area: t.area, verdict: 'problems', findings: [{ severity: 'high', file: '(n/a)', detail: 'review agent returned null' }] })
))

// Adversarially verify any high/medium finding before trusting it.
const flagged = reviews.flatMap(r => (r.findings || []).filter(f => f.severity !== 'low').map(f => ({ area: r.area, ...f })))
const verified = await parallel(flagged.map(f => () =>
  agent(`Adversarially verify this review finding before it is acted on. File: ${ROOT}/${f.file}. Claim: ${f.detail}\n\nRead the file (and any cited source via WebSearch/WebFetch if needed). Decide if the defect is REAL and the proposed fix correct. Default to 'not-real' if you cannot confirm it.`,
    { label: `verify:${f.file.split('/').pop()}`, phase: 'Verify', schema: { type: 'object', additionalProperties: false, required: ['real', 'reason'], properties: { real: { type: 'boolean' }, reason: { type: 'string' } } } })
    .then(v => ({ ...f, verdict: v || { real: false, reason: 'null' } }))
))

const confirmed = verified.filter(v => v.verdict.real)
log(`review: ${reviews.length} areas; ${flagged.length} high/med findings; ${confirmed.length} confirmed real`)
return {
  areaVerdicts: reviews.map(r => ({ area: r.area, verdict: r.verdict, summary: r.summary, nFindings: (r.findings || []).length })),
  confirmed,
  allFindings: reviews.flatMap(r => (r.findings || []).map(f => ({ area: r.area, ...f }))),
}
