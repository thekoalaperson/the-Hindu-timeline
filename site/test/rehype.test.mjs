/**
 * Unit tests for the markdown pipeline, run through the same unified stack
 * Astro uses. The markdown samples are copied verbatim from corpus files
 * (the file each came from is named in the test).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import rehypeCorpus from '../src/lib/rehype-corpus.ts';
import remarkCorpus from '../src/lib/remark-corpus.ts';

const REPO_ROOT = '/repo';

async function render(md, { file = '04-deep-dives/sample.md' } = {}) {
  const out = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkCorpus, { repoRoot: REPO_ROOT })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeCorpus)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process({ value: md, path: `${REPO_ROOT}/${file}` });
  return String(out);
}

/**
 * The pipeline's last pass ships the *popular* spelling as the page's text and
 * carries the scholarly one in `data-iast` (rehype-corpus (l)), so a visitor
 * with no JavaScript reads "Krishna". Every assertion below that was written
 * about the corpus's own IAST prose reads through this: it puts the scholarly
 * spelling back, which is what those tests are actually about. The wrapping
 * itself is asserted directly by "plain spellings ship as the text…" further
 * down.
 */
function scholarly(html) {
  return html.replace(/<span data-iast="([^"]*)">[^<]*<\/span>/g, (_, iast) =>
    iast.replace(/&quot;/g, '"').replace(/&#x3C;|&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
  );
}

test('the H1 is removed from the body', async () => {
  // 08-beings-and-bestiary/garuda.md
  const html = await render('# Garuḍa — King of Birds, Mount of Viṣṇu\n\nBody text.\n');
  assert.ok(!html.includes('<h1'));
  assert.ok(html.includes('Body text.'));
});

test('the opening blockquote is marked as the lede', async () => {
  // 04-deep-dives/mahabharata/01-adi-parva.md
  const html = await render(
    '# Ādi Parva\n\n> Cosmic address: the Mahābhārata unfolds at the cusp of the Dvāpara Yuga.\n> Parent: [index](README.md)\n\nProse.\n',
    { file: '04-deep-dives/mahabharata/01-adi-parva.md' },
  );
  assert.match(html, /<blockquote class="lede">/);
  assert.match(html, /href="\/stories\/mahabharata\/"/);
});

test('relative links become site routes and externals get rel/class', async () => {
  const html = await render(
    [
      '# T',
      '',
      '- See [vāhanas](../09-artifacts-symbols-and-arts/vahanas-and-celestial-vehicles.md).',
      '- See [nāgas](./nagas-and-serpents.md).',
      '- See [Rāmāyaṇa](../04-deep-dives/ramayana/).',
      '- See [Garuda](https://en.wikipedia.org/wiki/Garuda).',
      '',
    ].join('\n'),
    { file: '08-beings-and-bestiary/garuda.md' },
  );
  assert.match(html, /href="\/symbols\/vahanas-and-celestial-vehicles\/" class="xref"/);
  assert.match(html, /href="\/beings\/nagas-and-serpents\/"/);
  assert.match(html, /href="\/stories\/ramayana\/"/);
  assert.match(html, /href="https:\/\/en\.wikipedia\.org\/wiki\/Garuda" class="ext" rel="noopener"/);
});

test('`## 📑 Full Contents` is dropped from section READMEs', async () => {
  // shape from 06-sacred-geography/README.md
  const html = await render(
    [
      '# Beings & Bestiary — Index',
      '',
      'Intro prose.',
      '',
      '## 📑 Full Contents',
      '',
      '*Auto-generated index of all 26 files in this section.*',
      '',
      '- 🟩 [Garuḍa](garuda.md)',
      '',
      '<!-- AUTOINDEX:END -->',
      '',
    ].join('\n'),
    { file: '08-beings-and-bestiary/README.md' },
  );
  assert.ok(!html.includes('Full Contents'));
  assert.ok(!html.includes('Auto-generated index'));
  assert.ok(html.includes('Intro prose.'));
});

test('`## Sources` is cut out into its own section and hoisted', async () => {
  const html = await render(
    ['# T', '', 'Body.', '', '## Cross-References', '', '- [x](./y.md)', '', '## Sources', '', '- **Ṛgveda** — hymn.', ''].join(
      '\n',
    ),
  );
  assert.match(html, /<section class="sources" data-sources=""><h2 id="sources" class="sources-title">Sources<\/h2>/);
  assert.ok(html.indexOf('Cross-References') < html.indexOf('class="sources"'));
});

test('a heading merely containing the word "source" is not the footer', async () => {
  // 04-deep-dives/…: `## 3. Origin — ALL Variant Birth-Accounts by Source`
  const html = await render('# T\n\n## 3. Origin — ALL Variant Birth-Accounts by Source\n\nBody.\n');
  assert.ok(!html.includes('class="sources"'));
});

test('reliability tags are badged, translator brackets are not', async () => {
  // 02-deities-and-cosmic-hierarchy/… uses [Ganguli]/[Shastri] as credits
  const html = await render(
    '# T\n\n- **X** — a claim [scholarly] mid-sentence [late text] and a credit [Ganguli] plus [open-ended roster].\n',
  );
  assert.match(html, /<span class="tag" data-tag="scholarly" data-tag-kind="scholarly">scholarly<\/span>/);
  assert.match(html, /data-tag="late text" data-tag-kind="late"/);
  assert.match(html, /data-tag="open-ended roster"/);
  assert.ok(html.includes('[Ganguli]'));
  assert.ok(!html.includes('data-tag="Ganguli"'));
});

test('reliability tags with an inline note keep the tag badge and a muted note', async () => {
  // e.g. deities/vithoba-vitthal.md: "[scholarly: this identification is
  // contested by …]"; the old exact-match allowlist left the whole bracket,
  // note included, as raw text.
  const html = await render(
    '# T\n\n- **X** — a claim [scholarly: modern linguistics derives this differently] and ' +
      'more [disputed — some texts disagree] and plain [folk].\n',
  );
  assert.match(
    html,
    /<span class="tag" data-tag="scholarly" data-tag-kind="scholarly">scholarly<\/span><span class="tag-note">modern linguistics derives this differently<\/span>/,
  );
  assert.match(
    html,
    /<span class="tag" data-tag="disputed" data-tag-kind="disputed">disputed<\/span><span class="tag-note">some texts disagree<\/span>/,
  );
  // a bare tag with no note renders exactly as before, no empty note span
  assert.match(html, /<span class="tag" data-tag="folk" data-tag-kind="folk">folk<\/span>\./);
  assert.ok(!html.includes('tag-note">folk'));
});

test('an internal link labelled with its own raw corpus path shows the target title instead', async () => {
  // the home page and /texts/puranas/ both list bare filenames as link text
  const html = await render(
    ['# T', '', 'See [TIMELINE.md](../TIMELINE.md) for the index, or [`timeline/`](../timeline/).', ''].join('\n'),
    { file: '04-deep-dives/sample.md' },
  );
  assert.ok(!html.includes('>TIMELINE.md<'));
  assert.ok(!html.includes('<code>timeline/</code>'));
  // "(hub)" is a note to whoever files the corpus, not part of the title: it is
  // stripped once in scripts/graph.mjs (so the page's own subtitle is clean) and
  // again in rehype-corpus for link labels that quote a heading.
  assert.equal((html.match(/TIMELINE — The Cosmic-Clock Index/g) ?? []).length, 2);
  assert.ok(!html.includes('(hub)'));
});

test('a link whose text is already a real title is left untouched', async () => {
  const html = await render(
    ['# T', '', 'See [the cosmic clock](../TIMELINE.md).', ''].join('\n'),
    { file: '04-deep-dives/sample.md' },
  );
  assert.match(html, />the cosmic clock</);
});

test('`**Name** (gloss) — text` bullets get the entry treatment with a muted gloss', async () => {
  const html = await render(
    [
      '# T',
      '',
      '- **Thiruparankundram** (near Madurai) - 1st abode; Murugan slays **Surapadman**.',
      '- **Vakratuṇḍa** ("curved trunk") — slays **Matsarāsura**.',
      '',
    ].join('\n'),
  );
  assert.match(
    html,
    /<li class="entry"><strong class="lead">Thiruparankundram<\/strong> <span class="gloss">\(near Madurai\)<\/span> — 1st abode/,
  );
  assert.match(html, /<span class="gloss">\(.curved trunk.\)<\/span> — slays/);
});

test('`- **Name** — text` bullets become entries with a run-in lead', async () => {
  const html = await render(
    [
      '# T',
      '',
      '- **Suparṇa** — "He of Excellent Wings" (Mahābhārata, Ādi Parva).',
      '- **Tārkṣya** - patronymic from the sage Tṛkṣa (Purāṇas).',
      '- plain bullet, no lead',
      '',
    ].join('\n'),
  );
  assert.match(scholarly(html), /<li class="entry"><strong class="lead">Suparṇa<\/strong>/);
  assert.match(scholarly(html), /<li class="entry"><strong class="lead">Tārkṣya<\/strong>/);
  assert.ok(html.includes('<li>plain bullet, no lead</li>'));
});

test('the trailing citation parenthetical becomes a cite', async () => {
  const html = await render(
    [
      '# T',
      '',
      '- **A** — text (Bhāgavata Purāṇa 10.83)',
      '- **B** — text (Mahābhārata, Ādi Parva).',
      '- **C** — text (Padma Purāṇa, Uttara-khaṇḍa 38) [late text]',
      '- **D** — text (his lower body unmade)',
      '',
    ].join('\n'),
  );
  assert.match(html, /<cite class="cit">\(Bhāgavata Purāṇa 10\.83\)<\/cite>/);
  assert.match(html, /<cite class="cit">\(Mahābhārata, Ādi Parva\)<\/cite>\./);
  assert.match(html, /<cite class="cit">\(Padma Purāṇa, Uttara-khaṇḍa 38\)<\/cite>/);
  // a lowercase, digit-free parenthetical is prose, not a citation
  assert.ok(!html.includes('<cite class="cit">(his lower body unmade)'));
});

test('a citation whose text names are italicised is still wrapped', async () => {
  // 04-deep-dives/samudra-manthana.md — every bullet on that page italicises
  // the text names, so the parenthetical reaches hast as text + <em> + text +
  // <em> + text. Before this was handled the page shipped 0 of 32 citations.
  const html = await render(
    [
      '# T',
      '',
      "- **Durvasa's curse on Indra** - The sage gifts Indra a garland; Indra drapes it on " +
        '**Airavata**, who tramples it. (*Bhagavata Purana* 8.5; *Vishnu Purana* 1.9)',
      '- **Lakshmi withdraws into the ocean** - Stripped of fortune, the three worlds wither. ' +
        '(*Vishnu Purana* 1.9; *Bhagavata Purana* 8.8)',
      '- **The mountain sinks** - Mandara plunges into the ocean. ' +
        '(*Bhagavata Purana* 8.7; *Vishnu Purana*; *Agni*, *Kurma*, *Padma* Puranas)',
      '- **Halahala** - Shiva drinks the poison. ' +
        '(*Bhagavata Purana* 8.7.36–42; *Shiva Purana, Rudra Samhita*) [scripture]',
      '',
    ].join('\n'),
    { file: '04-deep-dives/samudra-manthana.md' },
  );

  // four entries, four citations
  assert.equal(html.match(/<cite class="cit">/g)?.length, 4);
  // the opening bracket, the <em>s and the closing bracket are all inside
  assert.match(
    html,
    /<cite class="cit">\(<em>Bhagavata Purana<\/em> 8\.5; <em>Vishnu Purana<\/em> 1\.9\)<\/cite>/,
  );
  assert.match(
    html,
    /<cite class="cit">\(<em>Vishnu Purana<\/em> 1\.9; <em>Bhagavata Purana<\/em> 8\.8\)<\/cite>/,
  );
  // five italics and a comma inside one parenthetical
  assert.match(html, /<cite class="cit">\(<em>Bhagavata Purana<\/em> 8\.7; .*Puranas\)<\/cite>/);
  // the reliability tag stays outside the cite, and is still badged
  assert.match(
    html,
    /<\/cite> <span class="tag" data-tag="scripture" data-tag-kind="scripture">scripture<\/span>/,
  );
  // nothing before the bracket is swallowed
  assert.match(html, /who tramples it\. <cite class="cit">\(/);
});

test('nested variant bullets fold into "Other tellings"', async () => {
  // 04-deep-dives/krishna-lila.md
  const html = await render(
    [
      '# T',
      '',
      '- **The other queens** — Kālindī, Mitravindā and the rest complete the eight (Bhāgavata X.58).',
      '  - *Variant:* Bhāgavata lists Rukmiṇī, Satyabhāmā, Jāmbavatī.',
      '  - *Variant (Viṣṇu Purāṇa / other lists):* names of the minor queens vary. [textual]',
      '',
    ].join('\n'),
  );
  assert.match(html, /<details class="tellings"><summary>Other tellings \(2\)<\/summary>/);
  assert.match(html, /<em>Variant:<\/em>/);
});

test('a nested list that is not variants is left alone', async () => {
  const html = await render(
    ['# T', '', '- **Niyoga and the three births** — Vyāsa fathers children.', '  - **Dhṛtarāṣṭra** — born blind.', '  - **Pāṇḍu** — born pale.', ''].join(
      '\n',
    ),
  );
  assert.ok(!html.includes('tellings'));
});

test('heading ids use github-slugger semantics', async () => {
  const html = await render('# T\n\n## The Great Goddess — Durgā, Kālī\n\n## 2. The Six Vedāngas (वेदाङ्ग)\n');
  assert.match(html, /id="the-great-goddess--durgā-kālī"/);
  assert.match(html, /id="2-the-six-vedāngas-वेदाङ्ग"/);
});

test('GFM tables survive untouched', async () => {
  // 00-time-and-cosmology/units-of-time.md
  const html = await render('# T\n\n| Rung | Surya Siddhanta |\n|---|---|\n| kashtha = | **18** nimesha |\n');
  assert.match(html, /<table>/);
  assert.match(html, /<strong>18<\/strong> nimesha/);
});

test('a bare `<` in prose is not treated as a tag', async () => {
  // 02-deities-and-cosmic-hierarchy/gramadevatas-village-deities.md
  const html = await render('# T\n\nBonalu < bhōjanālu, and Herath (< Hara-rātri).\n');
  const bare = scholarly(html);
  assert.ok(bare.includes('Bonalu &#x3C; bhōjanālu') || bare.includes('Bonalu &lt; bhōjanālu'));
});

test('a citation still counts when a cross-reference or a long note trails it', async () => {
  // 04-deep-dives/samudra-manthana.md — both shapes, verbatim. Before the
  // trailing-tail allowance these two entries shipped uncited.
  const html = await render(
    '- **The mountain sinks — Kurma avatara** - Lacking a base, Mandara plunges into the ocean. ' +
      '(*Bhagavata Purana* 8.7; *Vishnu Purana*) — see [Dashavatara](../02-deities-and-cosmic-hierarchy/dashavatara.md).\n' +
      '- **Vasuki vomits fire** - Smoke and fire vent from the mouths. (*Bhagavata Purana* 8.7) ' +
      '[iconographic cross-reference: the Angkor Wat churning relief matches the text, the creature count and all]\n',
    { file: '04-deep-dives/samudra-manthana.md' },
  );
  assert.equal(html.match(/<cite class="cit">/g)?.length, 2);
  assert.match(html, /<cite class="cit">\(<em>Bhagavata Purana<\/em> 8\.7; <em>Vishnu Purana<\/em>\)<\/cite> — see <a/);
  assert.match(html, /<cite class="cit">\(<em>Bhagavata Purana<\/em> 8\.7\)<\/cite> \[iconographic/);
});

test('straight quotes curl to typographic quotes in prose, but not in code or a citation', async () => {
  const html = await render(
    [
      '# T',
      '',
      'Rāma says "the forest is home" and calls it "Sītā\'s home."',
      '',
      '`raw "quote" in code`',
      '',
      "- **A** — text (see p. 12, \"the earlier verse\").",
      '',
    ].join('\n'),
  );
  assert.ok(html.includes('“the forest is home”'));
  assert.ok(scholarly(html).includes('Sītā’s home'));
  assert.ok(html.includes('<code>raw "quote" in code</code>'));
  assert.ok(html.includes('(see p. 12, "the earlier verse")'));
});

test('a parenthetical followed by more prose is left as prose', async () => {
  // 04-deep-dives/samudra-manthana.md — an aside, not the entry's citation.
  const html = await render(
    "- **Dhanvantari** - The divine physician rises last. (*Bhagavata Purana* 8.8) " +
      'Dhanvantari is counted an aspect of Vishnu and the patron of Ayurveda.\n',
  );
  assert.ok(!html.includes('<cite class="cit">'));
});

/*
 * (l) — the page ships the popular spelling; the scholarly one rides in
 * `data-iast`. This is what makes plain English the default for a visitor
 * whose JavaScript never runs (FIXLIST L2b-3); the client toggle converts
 * *up* out of the same attribute. Code spans, Devanagari and the citation
 * apparatus are exempt, exactly as the runtime converter's skip list is.
 */
test('plain spellings ship as the text, with the scholarly form in data-iast', async () => {
  const html = await render(
    ['# T', '', 'Kṛṣṇa tells Arjuna that Śiva is `Śiva` in code.', '', '- **A** — text (Bhāgavata Purāṇa 10.83)', ''].join('\n'),
  );
  assert.ok(html.includes('<span data-iast="Kṛṣṇa">Krishna</span>'), html);
  assert.ok(html.includes('<span data-iast="Śiva">Shiva</span>'), html);
  // never inside a code span
  assert.ok(html.includes('<code>Śiva</code>'), html);
  // never inside the citation apparatus
  assert.ok(html.includes('<cite class="cit">(Bhāgavata Purāṇa 10.83)</cite>'), html);
  // and the whole thing still reads as the scholarly text once unwrapped
  assert.ok(scholarly(html).includes('Kṛṣṇa tells Arjuna that Śiva is'), scholarly(html));
});
