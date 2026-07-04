export const meta = {
  name: 'hindu-corpus-fix',
  description: 'Apply verified corrections to round-6 corpus files from the adversarial-verifier findings',
  phases: [{ title: 'Fix' }],
}

const ROOT = '/home/user/the-Hindu-timeline'
const workitems = args.workitems  // [{path, findings:[{severity,kind,detail}]}]

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['path', 'appliedCount', 'applied', 'skipped'],
  properties: {
    path: { type: 'string' },
    appliedCount: { type: 'integer' },
    applied: { type: 'array', items: { type: 'string' }, description: 'one short line per fix applied' },
    skipped: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['finding', 'reason'],
        properties: { finding: { type: 'string' }, reason: { type: 'string' } },
      },
      description: 'findings deliberately not applied, with why',
    },
    notes: { type: 'string' },
  },
}

function prompt(it) {
  const findings = it.findings.map((f, i) =>
    `${i + 1}. [${f.severity}/${f.kind}] ${f.detail}`).join('\n\n')
  return `You are a careful copy-editor and fact-checker fixing ONE file in *The Hindu Timeline* corpus (repo root ${ROOT}).

## File to fix
\`${ROOT}/${it.path}\`

## Verifier findings to act on
${findings}

## How to act
1. Read the file first: \`${ROOT}/${it.path}\`. Also read \`${ROOT}/AGENTS.md\` §4 for the conventions.
2. For each **high** and **medium** finding: **independently confirm the correction before editing.** The finding usually states the correct fact and cites a source (a text + chapter, or a scholarly reference). Verify it — use WebSearch/WebFetch (available via ToolSearch) when a citation/date/author/name is in doubt; otherwise rely on your own knowledge. Apply the fix ONLY if you are confident the correction is right. Make the **minimal faithful edit** (fix the name/number/attribution/link; adjust surrounding wording only as needed for accuracy). Preserve the house style, the two-clocks distinction, and the "variants cataloged, never merged" rule. If a finding is itself wrong or unconvincing, do NOT edit — record it in \`skipped\` with your reasoning.
3. For **low** findings, apply only the **mechanical, unambiguous** ones:
   - Non-standard reliability tags → nearest sanctioned tag (\`[open-ended]\`, \`[disputed identification]\`, \`[folk tradition]\`, \`[late]\` etc. → one of \`[scholarly] [disputed] [late text] [folk] [regional] [oral tradition]\`).
   - Clear numeric/date slips and semantic mislinks (a link whose anchor text names X but points to a file about Y — repoint to the correct existing file; VERIFY the new target exists with ls/Glob).
   - Skip purely subjective/word-count-trim lows unless the fix is trivial and safe.
4. **Cross-links:** if you change or add a link, compute the correct RELATIVE path from \`${it.path}\` and confirm the target file exists. Never introduce a broken link.
5. **Do NOT touch** \`TIMELINE.md\`, any \`README.md\` index, \`STRUCTURE.md\`, or any file other than \`${it.path}\`. (If a finding is about a TIMELINE event, note it in \`notes\` — the central step handles TIMELINE.)

Return the schema object: \`appliedCount\`, an \`applied\` list (one terse line each), a \`skipped\` list with reasons, and any \`notes\` (e.g. TIMELINE-event corrections the central step should make).`
}

const results = await parallel(workitems.map(it => () =>
  agent(prompt(it), { label: `fix:${it.path.split('/').pop()}`, phase: 'Fix', schema: SCHEMA, effort: 'high' })
    .then(r => r || { path: it.path, appliedCount: 0, applied: [], skipped: [], notes: 'agent returned null' })
))

const totalApplied = results.reduce((n, r) => n + (r.appliedCount || 0), 0)
log(`fix shard: ${totalApplied} fixes applied across ${results.length} files`)
return { totalApplied, results }
