/**
 * world.ts — the Bhuvana-kośa as coordinates.
 *
 * Every ring, plate and altitude here is read off the corpus's own
 * cosmographic files and then *compressed* to a viewable scale (the texts give
 * 500,000,000 yojanas across; a phone gives ~390 CSS px). What is preserved is
 * the topology and the order, not the arithmetic:
 *
 *   00-time-and-cosmology/brahmanda-and-bhuvana-kosha.md   the egg, its seven
 *       elemental sheaths, the Garbhodaka ocean in the lower half, the two maps
 *       (horizontal disc + vertical axis) nesting in one vessel.
 *   06-sacred-geography/meru-kailash-and-cosmic-mountains.md   Meru 84,000
 *       yojanas, broader at the summit (32,000) than at the base (16,000),
 *       sunk 16,000 below; Brahmapurī on the summit with the Lokapālas' cities;
 *       the sapta-dvīpa / sapta-samudra roster and their liquids; Kailāsa kept
 *       *distinct* from Meru (§IV, the variant problem); Kāñcanī-bhūmi and the
 *       Lokāloka wall beyond the seventh ocean.
 *   02-deities-and-cosmic-hierarchy/devas-asuras-and-the-lokas.md   the seven
 *       upper lokas Bhū → Satya and the seven lower ones.
 *   00-time-and-cosmology/bila-svarga-and-the-patalas.md   the pātālas as
 *       *paradises* lit by serpent-gems, not hells; the Bhāgavata 5.24 roster
 *       and its tenants; the narakas kept as a separate, lower thing.
 *
 * Units: 1 world unit ≈ the width of a film-leaf. The disc runs 0 → 28.4.
 */
import { getFilms, type Film } from '../../lib/films.ts';

export interface Realm {
  id: string;
  /** Display name, IAST. */
  name: string;
  /** One line of what it is — shown on the ladder and in the fallback. */
  gloss: string;
  /** Height on the world-axis. Bhū-maṇḍala is 0. */
  y: number;
  /** Radius of the luminous plate drawn for this realm (0 = none). */
  plate: number;
  /** Where places default to sitting. */
  r: number;
  band: 'upper' | 'disc' | 'lower';
  /** Painted colour, hex. */
  color: number;
  /** The corpus page that documents it. */
  route: string;
  /** The citation shown in the panel/fallback. */
  cite: string;
  /** Shown on the ladder (short). */
  tick: string;
}

/* --------------------------------------------------------------- realms - */

export const REALMS: Realm[] = [
  {
    id: 'vaikuntha',
    name: 'Vaikuṇṭha',
    gloss: 'Beyond the fourteen worlds — Viṣṇu’s own realm, outside the ladder of lokas.',
    y: 44,
    plate: 3.6,
    r: 2.2,
    band: 'upper',
    color: 0xf4e2b0,
    route: '/deities/vishnu-forms-and-vyuhas/',
    cite: 'Viṣṇu’s forms & vyūhas',
    tick: 'Vaikuṇṭha',
  },
  {
    id: 'satya',
    name: 'Satyaloka',
    gloss: 'Brahmā’s world, the highest of the seven. Those who reach it are not reborn.',
    y: 35,
    plate: 6.6,
    r: 3.4,
    band: 'upper',
    color: 0xf0d79a,
    route: '/deities/devas-asuras-and-the-lokas/',
    cite: 'Devas, Asuras & the 14 Lokas',
    tick: 'Satya',
  },
  {
    id: 'tapa',
    name: 'Tapoloka',
    gloss: 'The world of austerity — the Vairāja ascetics.',
    y: 29,
    plate: 8.4,
    r: 4.2,
    band: 'upper',
    color: 0xe8c98c,
    route: '/deities/devas-asuras-and-the-lokas/',
    cite: 'Devas, Asuras & the 14 Lokas',
    tick: 'Tapas',
  },
  {
    id: 'jana',
    name: 'Janaloka',
    gloss: 'Brahmā’s mind-born sons — the Kumāras, beings of pure mind.',
    y: 23.5,
    plate: 10,
    r: 5,
    band: 'upper',
    color: 0xdfbe86,
    route: '/deities/devas-asuras-and-the-lokas/',
    cite: 'Devas, Asuras & the 14 Lokas',
    tick: 'Jana',
  },
  {
    id: 'mahar',
    name: 'Maharloka',
    gloss: 'The sages who outlive the dissolution — it lasts one Day of Brahmā.',
    y: 18,
    plate: 12,
    r: 5.6,
    band: 'upper',
    color: 0xd8b47e,
    route: '/deities/devas-asuras-and-the-lokas/',
    cite: 'Devas, Asuras & the 14 Lokas',
    tick: 'Mahar',
  },
  {
    id: 'svarga',
    name: 'Svarloka',
    gloss: 'Indra’s heaven on Meru’s summit plateau — Amarāvatī and the Nandana grove.',
    y: 12.6,
    plate: 14,
    r: 5.2,
    band: 'upper',
    color: 0xe6b25e,
    route: '/deities/indra/',
    cite: 'Indra · Meru & the cosmic mountains',
    tick: 'Svar',
  },
  {
    id: 'meru',
    name: 'Meru',
    gloss: 'The golden axis — 84,000 yojanas, broader at the summit than at the base.',
    y: 11,
    plate: 0,
    r: 3.4,
    band: 'upper',
    color: 0xf2c46a,
    route: '/places/meru-kailash-and-cosmic-mountains/',
    cite: 'Mount Meru, Kailāsa & the cosmic mountains',
    tick: 'Meru',
  },
  {
    id: 'kailasa',
    name: 'Kailāsa',
    gloss: 'Śiva and Pārvatī’s mountain — kept distinct from Meru by the older cosmography.',
    y: 3.6,
    plate: 0,
    r: 7.4,
    band: 'upper',
    color: 0xe8eef6,
    route: '/places/meru-kailash-and-cosmic-mountains/',
    cite: 'Meru & Kailāsa §IV',
    tick: 'Kailāsa',
  },
  {
    id: 'bhuvar',
    name: 'Bhuvarloka',
    gloss: 'The antarikṣa — the air between earth and sun, where the planets travel.',
    y: 7,
    plate: 18,
    r: 10.5,
    band: 'upper',
    color: 0xd9a765,
    route: '/deities/devas-asuras-and-the-lokas/',
    cite: 'Devas, Asuras & the 14 Lokas',
    tick: 'Bhuvar',
  },
  {
    id: 'bharata',
    name: 'Bhārata-varṣa',
    gloss: 'The southern land of Jambudvīpa — the one karma-bhūmi, where the yugas actually turn.',
    y: 1.4,
    plate: 0,
    r: 6.3,
    band: 'disc',
    color: 0xd98b52,
    route: '/places/bharatavarsha-and-puranic-geography/',
    cite: 'Bhāratavarṣa & Purāṇic geography',
    tick: 'Bhārata',
  },
  {
    id: 'vindhya',
    name: 'The Vindhya',
    gloss: 'The Goddess’s mountain in the middle of Bhārata — Vindhyavāsinī’s seat.',
    y: 1.8,
    plate: 0,
    r: 5.4,
    band: 'disc',
    color: 0xc2454a,
    route: '/deities/devi-mahatmya-and-the-great-goddess/',
    cite: 'Devī Māhātmya & the great Goddess',
    tick: 'Vindhya',
  },
  {
    id: 'ksira',
    name: 'Kṣīra-sāgara',
    gloss: 'The ocean of milk, sixth of the seven ring-oceans — it circles Śākadvīpa.',
    y: 0.7,
    plate: 0,
    r: 23.1,
    band: 'disc',
    color: 0xf3ead8,
    route: '/places/meru-kailash-and-cosmic-mountains/',
    cite: 'Sapta-dvīpa & sapta-samudra',
    tick: 'Kṣīra',
  },
  {
    id: 'ekarnava',
    name: 'The outer waters',
    gloss: 'Svādu-jala, the sweet-water ocean at the rim, and the one flood that covers all.',
    y: 0.7,
    plate: 0,
    r: 25.9,
    band: 'disc',
    color: 0xa8c8cf,
    route: '/cosmology/kalpa-and-pralaya/',
    cite: 'Kalpa & pralaya',
    tick: 'Rim',
  },
  {
    id: 'atala',
    name: 'Atala',
    gloss: 'Bala’s realm, son of Maya — the first of the cavern-heavens below the disc.',
    y: -6,
    plate: 17,
    r: 6,
    band: 'lower',
    color: 0xb87a86,
    route: '/cosmology/bila-svarga-and-the-patalas/',
    cite: 'Bila-svarga & the seven pātālas',
    tick: 'Atala',
  },
  {
    id: 'vitala',
    name: 'Vitala',
    gloss: 'Śiva as Hāṭakeśvara with Bhavānī; the golden river Hāṭakī flows from them.',
    y: -10,
    plate: 16,
    r: 6,
    band: 'lower',
    color: 0xc08f7a,
    route: '/cosmology/bila-svarga-and-the-patalas/',
    cite: 'Bila-svarga & the seven pātālas',
    tick: 'Vitala',
  },
  {
    id: 'sutala',
    name: 'Sutala',
    gloss: 'Bali’s kingdom — the most honoured pātāla, with Viṣṇu himself at the gate.',
    y: -14,
    plate: 15,
    r: 5.6,
    band: 'lower',
    color: 0xd0a06a,
    route: '/cosmology/bila-svarga-and-the-patalas/',
    cite: 'Bila-svarga §5 · Bhāgavata 5.24.18–21',
    tick: 'Sutala',
  },
  {
    id: 'talatala',
    name: 'Talātala',
    gloss: 'Maya Dānava the sorcerer-architect, spared by Śiva after the three cities burned.',
    y: -18,
    plate: 14,
    r: 5.4,
    band: 'lower',
    color: 0xa9769a,
    route: '/cosmology/bila-svarga-and-the-patalas/',
    cite: 'Bila-svarga & the seven pātālas',
    tick: 'Talātala',
  },
  {
    id: 'mahatala',
    name: 'Mahātala',
    gloss: 'The many-hooded Nāgas, sons of Kadru — Takṣaka, Kāliya and their kin.',
    y: -22,
    plate: 13,
    r: 5.2,
    band: 'lower',
    color: 0x7fa896,
    route: '/beings/nagas-and-serpents/',
    cite: 'Bila-svarga §5 · Bhāgavata 5.24.28',
    tick: 'Mahātala',
  },
  {
    id: 'rasatala',
    name: 'Rasātala',
    gloss: 'The Paṇis — Nivāta-kavacas and Kāleyas, perpetual enemies of the devas.',
    y: -26,
    plate: 12,
    r: 5,
    band: 'lower',
    color: 0x8c6e7e,
    route: '/cosmology/bila-svarga-and-the-patalas/',
    cite: 'Bila-svarga & the seven pātālas',
    tick: 'Rasātala',
  },
  {
    id: 'patala',
    name: 'Pātāla',
    gloss: 'Nāgaloka — Vāsuki’s kingdom; no sun reaches it, and the serpents’ crest-gems light it.',
    y: -30,
    plate: 11,
    r: 4.8,
    band: 'lower',
    color: 0x6f97a8,
    route: '/cosmology/bila-svarga-and-the-patalas/',
    cite: 'Bila-svarga §2 · Bhāgavata 5.24.29–31',
    tick: 'Pātāla',
  },
  {
    id: 'garbhodaka',
    name: 'Garbhodaka',
    gloss: 'The womb-ocean flooding the egg’s lower half, where Viṣṇu reclines on Ananta-Śeṣa.',
    y: -36,
    plate: 20,
    r: 6,
    band: 'lower',
    color: 0x4f6f86,
    route: '/cosmology/brahmanda-and-bhuvana-kosha/',
    cite: 'Brahmāṇḍa & bhuvana-kośa §4',
    tick: 'Garbhodaka',
  },
];

export const REALM_BY_ID = new Map(REALMS.map((r) => [r.id, r]));

/* ------------------------------------------------- the sapta-dvīpa rings - */

/** Inner radius, outer radius, kind, name, gloss. Drawn onto the ground. */
export interface Ring {
  r0: number;
  r1: number;
  kind: 'land' | 'sea' | 'gold' | 'wall';
  name: string;
  liquid?: string;
}

/** Meru & Kailāsa §III — the seven continents and the seven liquids. */
export const RINGS: Ring[] = [
  { r0: 0, r1: 9.0, kind: 'land', name: 'Jambudvīpa' },
  { r0: 9.0, r1: 10.6, kind: 'sea', name: 'Lavaṇa', liquid: 'salt water' },
  { r0: 10.6, r1: 12.0, kind: 'land', name: 'Plakṣadvīpa' },
  { r0: 12.0, r1: 13.2, kind: 'sea', name: 'Ikṣu', liquid: 'sugarcane juice' },
  { r0: 13.2, r1: 14.6, kind: 'land', name: 'Śālmaladvīpa' },
  { r0: 14.6, r1: 15.8, kind: 'sea', name: 'Surā', liquid: 'wine' },
  { r0: 15.8, r1: 17.2, kind: 'land', name: 'Kuśadvīpa' },
  { r0: 17.2, r1: 18.4, kind: 'sea', name: 'Ghṛta', liquid: 'clarified butter' },
  { r0: 18.4, r1: 19.8, kind: 'land', name: 'Krauñcadvīpa' },
  { r0: 19.8, r1: 21.0, kind: 'sea', name: 'Dadhi', liquid: 'curds' },
  { r0: 21.0, r1: 22.4, kind: 'land', name: 'Śākadvīpa' },
  { r0: 22.4, r1: 23.8, kind: 'sea', name: 'Kṣīra', liquid: 'milk' },
  { r0: 23.8, r1: 25.2, kind: 'land', name: 'Puṣkaradvīpa' },
  { r0: 25.2, r1: 26.6, kind: 'sea', name: 'Svādu-jala', liquid: 'sweet water' },
  { r0: 26.6, r1: 27.6, kind: 'gold', name: 'Kāñcanī-bhūmi' },
  { r0: 27.6, r1: 28.4, kind: 'wall', name: 'Lokāloka' },
];

export const DISC_EDGE = 28.4;

/* ------------------------------------------------------------ placements - */

/**
 * Every film put where its story happens. `az` is degrees clockwise from north
 * (0 = away from the camera's home position); `r`/`y` override the realm's
 * defaults so leaves float at different altitudes and never stack.
 */
interface Placement {
  realm: string;
  az: number;
  r?: number;
  y?: number;
  /** Why it sits there — shown in the panel as a one-line "where". */
  where: string;
  /** Overrides the realm's display name for this one leaf. */
  as?: string;
}

const PLACE: Record<string, Placement> = {
  /* — the ocean of milk — */
  manthan: { realm: 'ksira', az: 200, where: 'The ocean of milk, churned with Mandara and Vāsuki' },
  gajendra: { realm: 'ksira', az: 236, where: 'Trikūṭa, the mountain standing in the ocean of milk' },

  /* — the outer waters — */
  matsya: { realm: 'ekarnava', az: 176, where: 'The one ocean, when the flood has covered the disc' },

  /* — beneath everything — */
  varaha: { realm: 'garbhodaka', az: 150, y: -34.6, where: 'The womb-ocean, where the earth had sunk' },

  /* — Vaikuṇṭha — */
  'seventh-gate': { realm: 'vaikuntha', az: 0, y: 43.2, where: 'The seventh gate of Vaikuṇṭha' },

  /* — Satyaloka — */
  'brahma-head': { realm: 'satya', az: 40, where: 'Brahmā’s own world, and the head he lost there' },
  lingodbhava: { realm: 'satya', az: 200, r: 3.0, y: 31, as: 'The pillar of fire', where: 'The pillar of fire whose ends Brahmā and Viṣṇu could not find' },

  /* — the axis: Trivikrama, Dhruva — */
  vamana: { realm: 'mahar', az: 120, r: 3.2, y: 19.6, as: 'The three strides', where: 'Mid-stride — the second pace crossing all the upper worlds' },
  dhruva: { realm: 'mahar', az: 300, r: 2.4, y: 16.2, as: 'Dhruvaloka', where: 'The pole star, fixed above Svarloka' },

  /* — Svarga — */
  garuda: { realm: 'svarga', az: 80, y: 13.6, where: 'Indra’s heaven, raided for the pot of amṛta' },
  yayati: { realm: 'svarga', az: 260, y: 11.8, where: 'Svarga, and the fall out of it' },

  /* — Bhuvarloka, the middle air — */
  tripura: { realm: 'bhuvar', az: 30, r: 9.6, y: 8.2, where: 'The three flying cities, in the air above the earth' },
  ganga: { realm: 'bhuvar', az: 330, r: 6.4, y: 9.4, where: 'The sky-river falling from Brahmā’s world to Śiva’s hair' },
  shani: { realm: 'bhuvar', az: 100, r: 11.6, y: 6.2, where: 'The sun’s course through the antarikṣa' },

  /* — Kailāsa — */
  ganesha: { realm: 'kailasa', az: 12, r: 7.0, y: 4.6, where: 'Kailāsa — the door Pārvatī set a guard on' },
  kartikeya: { realm: 'kailasa', az: 26, r: 7.8, y: 5.4, where: 'Kailāsa and the Śara-vaṇa reed-bed' },
  kamadahana: { realm: 'kailasa', az: 40, r: 7.2, y: 3.6, where: 'Kailāsa, where the third eye opened' },
  mohini: { realm: 'kailasa', az: 54, r: 7.9, y: 4.4, where: 'The slopes below Kailāsa, with Bhasmāsura in pursuit' },
  'ganesha-vs-kartikeya': { realm: 'kailasa', az: 0, r: 8.2, y: 6.0, where: 'Kailāsa — the race around the world' },

  /* — the Vindhya, the Goddess — */
  mahishasura: { realm: 'vindhya', az: 226, r: 5.2, y: 2.6, where: 'The Vindhya — the Goddess assembled from the gods’ own light' },
  raktabija: { realm: 'vindhya', az: 240, r: 4.4, y: 1.6, where: 'The same field, when Kālī stepped out of Durgā’s brow' },

  /* — the pātālas — */
  kaliya: { realm: 'mahatala', az: 210, r: 5.6, y: -21.2, where: 'Mahātala, home of Kadru’s sons — Kāliya among them' },

  /* — Bhārata-varṣa: three arcs, floating at different heights — */
  govardhan: { realm: 'bharata', az: 150, r: 4.1, y: 1.4, where: 'Vraja, under the lifted hill' },
  kamsa: { realm: 'bharata', az: 166, r: 3.8, y: 0.8, where: 'Mathurā, and the prophecy in its prison' },
  'putana-vadha': { realm: 'bharata', az: 182, r: 4.3, y: 1.5, where: 'Gokula, on the night the nurse came' },
  sudama: { realm: 'bharata', az: 198, r: 3.9, y: 0.9, where: 'Dvārakā, at the door of a rich friend' },
  syamantaka: { realm: 'bharata', az: 214, r: 4.2, y: 1.5, where: 'Dvārakā, and a jewel that made him a suspect' },
  'rukmini-haran': { realm: 'bharata', az: 230, r: 3.8, y: 0.8, where: 'Vidarbha, and the letter that asked him to come' },

  narakasura: { realm: 'bharata', az: 142, r: 6.5, y: 3.4, where: 'Prāgjyotiṣa in the east, and the reins Satyabhāmā took' },
  narasimha: { realm: 'bharata', az: 158, r: 6.9, y: 2.8, where: 'Hiraṇyakaśipu’s hall — the pillar on the threshold at dusk' },
  draupadi: { realm: 'bharata', az: 174, r: 6.4, y: 3.5, where: 'Pāñcāla, at the bow and the turning fish' },
  'draupadi-dice-hall': { realm: 'bharata', az: 190, r: 7.0, y: 2.9, where: 'Hastināpura, in the dice hall' },
  lakshagriha: { realm: 'bharata', az: 206, r: 6.4, y: 3.6, where: 'Vāraṇāvata, in the house of lac' },
  abhimanyu: { realm: 'bharata', az: 222, r: 6.9, y: 2.7, where: 'Kurukṣetra, inside the wheel-formation' },
  'karna-vs-arjuna': { realm: 'bharata', az: 238, r: 6.4, y: 3.5, where: 'Kurukṣetra, on the seventeenth day' },
  'bhagavad-gita-vishvarupa': { realm: 'bharata', az: 254, r: 7.0, y: 2.8, where: 'Between the two armies, before the first arrow' },
  'ghatotkacha-final-night': { realm: 'bharata', az: 270, r: 6.5, y: 3.6, where: 'Kurukṣetra, in the dark, under the one spear' },

  ekalavya: { realm: 'bharata', az: 134, r: 9.0, y: 5.6, where: 'The forest, before a teacher made of clay' },
  'karna-kavacha': { realm: 'bharata', az: 148, r: 9.4, y: 6.4, where: 'Aṅga, when the sun’s son gave away his skin' },
  ashwatthama: { realm: 'bharata', az: 162, r: 8.9, y: 5.4, where: 'The camp at night, and the sentence that followed him' },
  barbarik: { realm: 'bharata', az: 176, r: 9.5, y: 6.5, where: 'The hill above the field, where three arrows watched' },
  kirata: { realm: 'bharata', az: 190, r: 9.0, y: 5.5, where: 'Indrakīla in the Himālaya, over a slain boar' },
  savitri: { realm: 'bharata', az: 204, r: 9.5, y: 6.6, where: 'The forest road south, walking behind Yama' },
  markandeya: { realm: 'bharata', az: 218, r: 8.9, y: 5.4, where: 'The liṅga a boy would not let go of' },
  shakuntala: { realm: 'bharata', az: 232, r: 9.5, y: 6.4, where: 'Kaṇva’s āśrama, and a ring the original never had' },
  'daksha-sati': { realm: 'bharata', az: 246, r: 8.9, y: 5.5, where: 'Dakṣa’s sacrifice — and the fifty-one places her body fell' },
  tulsi: { realm: 'bharata', az: 260, r: 9.4, y: 6.6, where: 'Vṛndā’s house, and the plant married to a stone' },
  parashurama: { realm: 'bharata', az: 274, r: 9.0, y: 5.6, where: 'Mahendragiri, where the axe was finally set down' },
  'vaishno-devi-bhairavnath': { realm: 'bharata', az: 288, r: 9.5, y: 6.5, where: 'Trikūṭa in the north, at the cave’s mouth' },
  'origin-of-jagannath': { realm: 'bharata', az: 302, r: 8.9, y: 5.4, where: 'Purī, when the door was opened too soon' },
};

/* Bali's own film is Vāmana's; Sutala gets the *place*, not a second card. */

export interface Place {
  slug: string;
  film: Film;
  realm: Realm;
  /** What the leaf calls its own address — usually the realm's name. */
  realmName: string;
  where: string;
  /** World position. */
  x: number;
  y: number;
  z: number;
  periodSlug: string | null;
  periodName: string;
}

const DEG = Math.PI / 180;

function buildPlaces(): Place[] {
  const out: Place[] = [];
  for (const film of getFilms()) {
    const p = PLACE[film.slug];
    if (!p) continue;
    const realm = REALM_BY_ID.get(p.realm);
    if (!realm) continue;
    const r = p.r ?? realm.r;
    const y = p.y ?? realm.y;
    const a = p.az * DEG;
    out.push({
      slug: film.slug,
      film,
      realm,
      realmName: p.as ?? realm.name,
      where: p.where,
      x: Math.sin(a) * r,
      y,
      z: Math.cos(a) * r,
      periodSlug: film.periodSlug,
      periodName: film.periodName,
    });
  }
  return out;
}

export const PLACES: Place[] = buildPlaces();

/** Realms in top-to-bottom order, for the ladder and the fallback scroll. */
export const LADDER: Realm[] = [...REALMS].sort((a, b) => b.y - a.y);

/** Every realm, top to bottom, with whatever films sit in it (often none). */
export function placesByRealm(): { realm: Realm; places: Place[] }[] {
  const map = new Map<string, Place[]>();
  for (const p of PLACES) {
    const list = map.get(p.realm.id);
    if (list) list.push(p);
    else map.set(p.realm.id, [p]);
  }
  return LADDER.map((realm) => ({ realm, places: map.get(realm.id) ?? [] }));
}

/* ---------------------------------------------------------------- ages - */

/**
 * The nine periods in cosmic order with the light each one casts. Satya is
 * gold and full daylight; the four legs of dharma are lost one by one and the
 * world darkens to Kali's indigo. (`00-time-and-cosmology/yugas-and-mahayuga.md`)
 */
export interface Age {
  slug: string;
  short: string;
  /** The one line under the rail when this age is lit. */
  line: string;
  /** Sky colour. */
  sky: string;
  /** Key light / accent. */
  key: string;
}

export const AGE_LIGHT: Record<string, { sky: string; key: string; line: string }> = {
  'before-time': {
    sky: '#0a0708',
    key: '#8f7ab8',
    line: 'Before the count begins — the creations, told as parallel variants.',
  },
  'earlier-manvantaras': {
    sky: '#120b0a',
    key: '#c98d5a',
    line: 'The six manvantaras before ours, and the first kings.',
  },
  'satya-yuga': {
    sky: '#1a1108',
    key: '#f2c76b',
    line: 'Dharma stands on four legs. The light is gold and level.',
  },
  'treta-yuga': {
    sky: '#170e08',
    key: '#e39a54',
    line: 'Dharma on three legs. Sacrifice begins; the light turns amber.',
  },
  'dvapara-yuga': {
    sky: '#130b0b',
    key: '#cf6f52',
    line: 'Dharma on two legs. The great war, and the god who drove the chariot.',
  },
  'kali-yuga-scriptural': {
    sky: '#0c0912',
    key: '#8e79c6',
    line: 'Dharma on one leg. Our age, from 3102 BCE, and its prophesied end.',
  },
  'kali-yuga-history': {
    sky: '#0a0a10',
    key: '#7fa1c0',
    line: 'The same age on the other clock — what the record can date.',
  },
  'future-manvantaras': {
    sky: '#080a0e',
    key: '#6fb3a8',
    line: 'After us: seven manvantaras, then the Night of Brahmā.',
  },
  'cross-yuga': {
    sky: '#100a10',
    key: '#c78bb0',
    line: 'Episodes the texts never pin to one age — they recur.',
  },
};

export const DEFAULT_SKY = '#0b0806';
export const DEFAULT_KEY = '#e8b45c';

/* ------------------------------------------------------------ leaf names - */

/**
 * What a leaf is called when it hangs in the sky. The films carry headline
 * titles ("Why Vaishno Devi Granted Bhairavnath Liberation") that are right on
 * YouTube and impossible on a star; the first clause of the title covers most
 * of them, and the rest are named here, in the map's own IAST register.
 */
export const LEAF_NAME: Record<string, string> = {
  garuda: 'Garuḍa & the Nectar',
  ganga: 'The Descent of Gaṅgā',
  kirata: 'Kirātārjunīya',
  ekalavya: 'Ekalavya',
  'brahma-head': 'Brahmā’s Fifth Head',
  'vaishno-devi-bhairavnath': 'Vaiṣṇo Devī',
  'ghatotkacha-final-night': 'Ghaṭotkaca’s Last Night',
  lakshagriha: 'The House of Lac',
  'draupadi-dice-hall': 'The Dice Hall',
  'putana-vadha': 'Pūtanā',
  'origin-of-jagannath': 'Jagannātha of Purī',
  'bhagavad-gita-vishvarupa': 'The Viśvarūpa',
  syamantaka: 'The Syamantaka Jewel',
  abhimanyu: 'Abhimanyu',
  'rukmini-haran': 'Rukmiṇī-haraṇa',
  kamadahana: 'Kāmadahana',
  'karna-vs-arjuna': 'Karṇa’s Sunken Wheel',
  'karna-kavacha': 'Karṇa’s Armour',
  'ganesha-vs-kartikeya': 'The Race Round the World',
  narasimha: 'Prahlāda & Narasiṃha',
  mahishasura: 'Durgā & Mahiṣāsura',
  raktabija: 'Kālī & Raktabīja',
  'daksha-sati': 'Satī & Dakṣa’s Yajña',
  narakasura: 'Narakāsura & Satyabhāmā',
  savitri: 'Sāvitrī & Satyavān',
  markandeya: 'Mārkaṇḍeya & Yama',
  shani: 'Sūrya’s Shadow Wife',
  tulsi: 'Vṛndā & Jalandhara',
  govardhan: 'The Lifting of Govardhana',
  matsya: 'Matsya & the Deluge',
  varaha: 'Varāha',
  draupadi: 'The Marriage of Draupadī',
  sudama: 'Kṛṣṇa & Sudāmā',
  kamsa: 'Kṛṣṇa & Kaṃsa',
  mohini: 'Mohinī & Bhasmāsura',
  kaliya: 'Kāliya-mardana',
  kartikeya: 'The Birth of Kārttikeya',
  ganesha: 'The Birth of Gaṇeśa',
  gajendra: 'Gajendra-mokṣa',
  vamana: 'Vāmana & Bali',
  manthan: 'Samudra Manthana',
  'seventh-gate': 'The Seventh Gate',
  lingodbhava: 'Liṅgodbhava',
  tripura: 'Tripurāntaka',
  dhruva: 'Dhruva',
  yayati: 'Yayāti',
  shakuntala: 'Śakuntalā',
  ashwatthama: 'Aśvatthāman',
  parashurama: 'Paraśurāma',
  barbarik: 'Barbarīka',
};
