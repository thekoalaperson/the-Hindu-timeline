export const meta = {
  name: 'hindu-corpus-verify',
  description: 'Adversarially verify round-6 corpus files: shape/conventions, cross-links, and citation plausibility',
  phases: [{ title: 'Verify' }],
}

const ROOT = '/home/user/the-Hindu-timeline'
const paths = args.paths  // ["04-deep-dives/foo.md", ...]

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['path', 'shapeOk', 'wordCount', 'issues'],
  properties: {
    path: { type: 'string' },
    shapeOk: { type: 'boolean', description: 'true if H1 + breadcrumb up-link + dense bullets + ## Sources all present and word count in 1200-2500' },
    wordCount: { type: 'integer' },
    issues: {
      type: 'array',
      description: 'concrete defects found; empty if clean',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'kind', 'detail'],
        properties: {
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          kind: { type: 'string', description: 'e.g. shape, broken-link, suspect-citation, merged-variant, missing-tag, two-clocks, factual' },
          detail: { type: 'string', description: 'specific, actionable — quote the offending text and say the fix' },
        },
      },
    },
  },
}

function prompt(p) {
  return `You are an adversarial fact-checker and conventions auditor for *The Hindu Timeline* corpus (repo root ${ROOT}). Audit exactly ONE file: \`${p}\`.

Read \`${ROOT}/${p}\` and \`${ROOT}/AGENTS.md\` (§4 conventions). Then audit HARD. Report only real, concrete defects — do not invent nitpicks, but do not rubber-stamp.

Check, in order:
1. **Shape/conventions:** H1 title; a 1–3 line breadcrumb blockquote with an up-link to the section README; dense sourced bullets \`**Name** — … (Source)\`; variants CATALOGED not merged (nested \`*Variant (Source):*\`); reliability tags used where warranted (\`[scholarly] [disputed] [late text] [folk] [regional] [oral tradition]\`); a \`## Sources\` foot. Word count roughly 1,200–2,500.
2. **Cross-links resolve:** for each internal markdown link, verify the RELATIVE target actually exists (use \`ls\`/Glob from the file's directory). Any link that does not resolve is a high-severity \`broken-link\` issue — quote the exact link text and target.
3. **Citation plausibility (adversarial):** pick the 2–4 most specific/checkable citations in the file (named text + chapter/verse). For each, judge whether the attribution is plausible for that text and story. Flag \`suspect-citation\` for anything that looks fabricated, misattributed, or where a specific verse number is implausibly precise for a story that text does not contain. Use WebSearch/WebFetch (available via ToolSearch) ONLY when you genuinely need to settle a doubtful citation — otherwise rely on your own knowledge. Do not flag correct-but-unfamiliar citations.
4. **Two clocks:** wherever the file gives dates, confirm the scriptural/cyclic frame and the academic/historical frame are kept distinct (not collapsed). Flag \`two-clocks\` violations.
5. **Merged variants / false certainty:** flag places where genuinely disputed traditions are stated as settled fact (\`merged-variant\` or \`factual\`).

Return the schema object. \`shapeOk\` reflects only criterion 1. Put everything else in \`issues\` with precise, actionable \`detail\` (quote the text, name the fix). Do NOT edit the file.`
}

const results = await parallel(paths.map(p => () =>
  agent(prompt(p), { label: `verify:${p.split('/').pop()}`, phase: 'Verify', schema: SCHEMA, effort: 'high' })
    .then(r => r || { path: p, shapeOk: false, wordCount: 0, issues: [{ severity: 'high', kind: 'audit-failed', detail: 'verifier returned null' }] })
))

const withIssues = results.filter(r => r.issues && r.issues.length)
const highs = results.flatMap(r => (r.issues || []).filter(i => i.severity === 'high').map(i => ({ path: r.path, ...i })))
log(`verified ${results.length}; ${withIssues.length} files with issues; ${highs.length} high-severity`)
return { results, highs }
