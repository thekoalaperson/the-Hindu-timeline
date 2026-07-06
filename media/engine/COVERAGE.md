# Engine Coverage Report — v2.1 (full census + cross-cutting audit)

*Supersedes the v1 placeholder. This audit covers 311 named beings from the
`08-beings-and-bestiary/` + `09-artifacts-symbols-and-arts/` corpus against the
current `people.js` / `wardrobe.js` / `acting.js` / `world.js` implementation,
checked feature-by-feature against the `Person` / `SETS.*` / `props.js` /
`stage.js` architecture defined in `CONTRACTS.md`. This revision folds in a
cross-cutting pass — female agency beyond consort archetypes, single-character
continuity across life stages, tender (not just violent) two-figure contact,
dialogue-pacing, garment-continuity miracles, in-shot scale-change, mass-army
density, weather range, and color symbolism — so gaps that cut across many
characters aren't lost inside per-character line items.*

## 1. Executive summary

**Tally (311 beings):** Full **43** (13.8%) · Good **137** (44.1%) · Partial
**93** (29.9%) · Poor **38** (12.2%).

- **180/311 (57.9%)** are filmable *as themselves*, as-is or with only prop/set
  polish already in flight — the human epic core: Pāṇḍavas, Kauravas, Rāma's
  court, sages, kings, most named women.
- **93/311 (29.9%)** are filmable *today only via a workaround* — a defining
  trait (serpent body played human, mace-duel played with a generic staff, a
  beheading cut away) is faked, cheated, or dropped to narration.
- **38/311 (12.2%)** cannot be filmed as themselves at all; 27 of 38 are
  blocked on one missing rig — vanara (17), vulture (3), serpent/composite (7).
- **72 blocker-severity findings** total, **62** tracing to 15 systemic
  features (`vanara-rig` 17, `naga-serpent-body` 7, `lion-tiger` 5, `multi-head`
  4, `animal-headed-humanoid` 4, `tail-humanoid` 4, `garuda-rig` 3,
  `vulture-fauna-rig` 3, `giant-scale` 2, `mace-gada` 2, `kinnara-rig` 2,
  `dog-fauna` 2, `battlefield-set` 2, `morph-fx` 1, `chariot-prop` 1). The
  remaining **10** are one-off signature anatomies (Aṣṭāvakra, Barbarīka,
  Jarāsandha, Kabandha ×2, Maṇḍavya, Jāmbavān ×2, Navaguñjara) — budget these
  as bespoke one-shot builds, not a reusable dial.
- The largest drag by *volume* isn't the exotic bodies — it's
  **combat-choreography** (59), **battlefield-set** (47), **morph-fx** (39),
  **injury-state** (34), **chariot-prop** (28), **two-person-contact** (25).
  These hit characters who otherwise render fine as ordinary humans (Bhīma,
  Arjuna, Draupadī, Duryodhana, Kṛṣṇa): the rig is there, the *scene grammar*
  is not.
- Cross-cutting pass adds: non-consort **female agency** is untested as a
  POSES dimension, not just uncounted; **age-dial** and **child-body** were
  scored as separate-character gaps but are really one continuity problem per
  registry character; a named **water set-piece** (Samudra Manthan) and a
  named **scale-change** beat (Trivikrama) were missing outright; and
  **weather**, **mass-army density**, **dialogue pacing**, and **color
  symbolism** had no line item at all despite bearing on the next two
  committed slate stories.

**Verdict:** the engine is production-ready for the human epic core (58%) and
structurally blind to non-human body plans as a class. The roadmap below
clears essentially the whole corpus without a rewrite — every item is a new
dial on the existing `Person` / `props.js` / `SETS.*` architecture.

## 2. Coverage by category

| Category | Tier (mostly) | Representative names | Primary blocker |
|---|---|---|---|
| Epic humans at rest — Kuru/Pāṇḍava kin, Rāma's court, sages, minor royals | **Full/Good** | Ambikā, Kuntī, Subhadrā, Vidura, Rāma & Lakṣmaṇa (Ayodhyā chapters), Yudhiṣṭhira | none — residual gaps are cosmetic |
| Epic humans in active war/combat — same roster, war chapters | **Partial** | Bhīma, Arjuna, Duryodhana, Bhīṣma, Aśvatthāman, Jayadratha | `combat-choreography`, `chariot-prop`, `battlefield-set`, `injury-state` |
| **Women beyond consort/queen archetypes** — warriors, ascetics, teachers, ruling queens, combatant goddess forms | **Partial, untested** | Ambā (tapasya-then-warrior), Chitrāṅgadā, Gārgī, Maitreyī, ruling queens, Durgā/Kālī as combatants | `acting.js` POSES (teach/rule/fight/bless) ship keyed to consort-archetype presets on `Woman`; never audited against a non-consort role |
| Rākṣasas & asuras, ordinary scale | **Good/Partial** | Alambuṣa, Hiḍimbā, Śūrpaṇakhā, Lavaṇa | `rakshasa-anatomy` partial; `morph-fx` absent |
| Rākṣasas, marked or giant | **Poor** | Kumbhakarṇa, Ghaṭotkaca, Rāvaṇa | `giant-scale` capped ~1.5×; `multi-head`/arm absent |
| Vānaras (monkey people) | **Poor, uniformly** | Hanumān, Vālī, Aṅgada, Tārā, Sugrīva | `vanara-rig` does not exist |
| Nāga & serpent beings | **Poor/Partial** | Ulūpī, Ananta/Śeṣa, Vāsuki, Takṣaka, Kāliya | `naga-serpent-body` does not exist |
| Garuḍa & vulture kin | **Poor, uniformly** | Garuḍa, Jaṭāyu, Sampāti, Supārśva | `garuda-rig`/`vulture-fauna-rig` absent |
| Singular/composite anatomies | **Poor, one-off** | Aṣṭāvakra, Barbarīka, Jarāsandha, Kabandha, Jāmbavān, Navaguñjara | bespoke body plan, no reuse path |
| Groups, attendants, unremarkable kin | **Full/Good** | handmaids, minor princes/princesses | `crowdStrip` + `archetypes.js` sufficient *at palace scale only* — see `mass-army-scale` below |

## 3. THE GAP ROADMAP

Ordered by unlock density against effort, and by dependency. "Unlocks" =
characters/beats carrying a blocker/major finding on that feature.

### v2.1 — Unlock the epics (finish the human category)

| Feature | Unlocks | Approach | Effort |
|---|---|---|---|
| `combat-choreography` | 59 findings incl. Abhimanyu, Bhīma, Arjuna, Droṇa | Named multi-figure blocking presets in `acting.js` (`duel`, `mob-attack`, `wrestle`, `disarm`), synced-beat pairs via `stage.js` | **L** |
| `battlefield-set` | 47 findings incl. Bhīṣma, Droṇa, Gāndhārī, Abhimanyu | First real `SETS.battlefield`: dust/banner parallax + `crowdStrip` armies + corpse/arrow-litter dressing, per `camLayer` depth model | **L** |
| `mass-army-scale` | akṣauhiṇī battle armies, the vānara bridge-building host — thousands, not `crowdStrip`'s tens | Aerial parallax-tiled density layers receding to a horizon, distinct from `battlefield-set`'s foreground dressing | **M** |
| `weapons-and-props-pack` | mace/sword/trident/staff/veena ≈ 34 findings incl. Bhīma, Kṛṣṇa, Duryodhana | `drawWeapon(name,x,y,ang,s)` keyed to a name→shape table, hand-attached via existing `hold` grip | **M** |
| `chariot-prop` | 28 findings incl. Arjuna, Kṛṣṇa, Bhīṣma, Daśaratha | `drawChariot` prop + `mount` pose; reused by v2.3 vimāna work | **M** |
| `injury-state` | 34 findings incl. Aśvatthāman's wound, Ekalavya's thumb, Draupadī's mourning | Persistent wound/blood/torn-garment overlay on `style`, settable mid-scene by a `stage.js` beat | **M** |
| `two-person-contact` | 25 findings — Draupadī's hair-drag, Bhīma vs. Duḥśāsana **plus tender contact**: caraṇa-sparśa (touching an elder's feet), the Bharata-Rāma embrace, Kṛṣṇa seated in Yaśodā's lap, being carried tenderly | Named contact-pose pairs for **both** registers — violent (`drag`, `grapple`, `strangle`, `carry-slain`) and devotional (`embrace`, `touch-feet`, `lap-sit`, `carry-tender`) — same synced two-figure model; `acting.js` today only has single-figure namaste/pranam | **M** |
| `age-dial` + `child-body` + **life-stage continuity** | 20 + 16 findings, plus every character who appears at multiple ages (child/adult/aged Kṛṣṇa, Rāma, Bhīṣma-on-the-arrow-bed) | Ship `style.age 0..1` and the child-scale preset as one interpolation rig; per CONTRACTS.md's `forms` sub-object, a registry character's ages must resolve to **one entry that interpolates**, not a re-keyed archetype swap per life stage | **M** |
| `dialogue-hold` | scoped to sustained 2-figure Q&A — Yakṣa Praśna (Yudhiṣṭhira vs. the Yakṣa), any long verbal exchange | Turn-taking gaze-hold/brow/`face.lipsPart` pacing across multi-turn beats — distinct from full viseme lip-sync (deferred by decision in CONTRACTS.md); needed ahead of the Yakṣa Praśna slate slot | **S** |
| `weather-fx` | rain/storm dial — Govardhana's "blue-black rain slants outside" (Director's Addendum); any monsoon beat | New `SETS` opt alongside `timeOfDay`: a precipitation axis (clear/overcast/rain/storm) with rain-streak parallax + darkened grade; ship before the Govardhana production slot | **S** |

### v2.2 — Divine & beast (new body plans)

| Feature | Unlocks | Approach | Effort |
|---|---|---|---|
| `vanara-rig` | 20 findings — Hanumān, Vālī, Sugrīva, Aṅgada, Tārā | New `Person` subclass: tail, digitigrade leg bend, fur skin, simian muzzle `drawHead` module — build alongside `animal-headed-humanoid` | **L** |
| `naga-serpent-body` | 12 findings — Ulūpī, Ananta/Śeṣa, Vāsuki, Takṣaka, Kāliya | Human torso/head + serpent-coil legs, hood-fan variant; princesses need only the coil | **M** |
| `multi-head` + multi-arm | 15 findings — Kṛṣṇa's Viśvarūpa, Rāvaṇa, Gaṇḍabheruṇḍa | Generalize `drawFigure`'s arm/head loop to N; hardest part is overlap ordering, not geometry | **L** |
| `giant-scale` | 15 findings — Kumbhakarṇa, Hiḍimbā, Ghaṭotkaca, Rāvaṇa lifting Kailāsa | Lift the ~1.5× cap for permanently-giant characters + a matching perspective adjustment | **S** |
| `scale-transform` | Vāmana→Trivikrama's three-stride growth — the corpus's defining scale-change beat, distinct from the static `giant-scale` cap above | Real-time size ramp **within one continuous shot**: camera pull-back + parallax rescale synced to a `stage.js` beat, not a hard cut between two fixed sizes | **M** |
| `lion-tiger` fauna | 10 findings — Narasiṃha, Durgā's mount, Śarabha | `drawLion`/`drawTiger` in `props.js`, same bar as `drawHorse` | **M** |
| `garuda-rig` + `vulture-fauna-rig` | 8 findings — Garuḍa, Jaṭāyu, Sampāti, Supārśva | Wing + talon module on humanoid torso (Garuḍa) and pure fauna variant (vultures) | **M** |
| `animal-headed-humanoid` | 5 findings — Nandi, Śarabha, Narasiṃha, Pratyaṅgirā | Parametrize `drawHead` for mane/muzzle/horn, sharing `vanara-rig` work | **M** |
| `tail-humanoid` | 4 findings — Hanumān, Vālī (tail beats: sitting on, binding, alight) | Attach point + physics-lite sway on `vanara-rig` skeleton | **S** (bundled) |
| `rakshasa-anatomy` completion | 6 findings — Ghaṭotkaca, Hiḍimba, Kumbhakarṇa | Finish tusk/mane/claw/horn dial; extend to "monstrous" extreme | **S** |
| `kinnara-rig`/`dog-fauna`/`bear-fauna`/`buffalo-mount` | 8 findings total | Small fauna/hybrid rigs, low-reuse but cheap; batch into one sprint | **S** each |
| One-off composite anatomies | 10 findings, one character each | Bespoke one-shot builds on the human rig, budgeted per-character | **S** each, **L** total |

### v2.3 — Spectacle

| Feature | Unlocks | Approach | Effort |
|---|---|---|---|
| `morph-fx` / **garment-continuity** | 39 findings — Śikhaṇḍin's sex-change, Ghaṭotkaca's growth, Ahalyā's curse, **Draupadī's vastraharaṇa (the infinitely-unraveling sari)** | Crossfade between pre-built style objects across a cut, keyed by a `stage.js` beat; vastraharaṇa specifically needs a sequenced multi-layer garment state-swap, not a live cloth morph | **M** |
| `astra-fx` | 14 findings — Brahmāstra, Pāśupata, Vāsavī Śakti, Sudarśana | Particle/trail fx keyed to astra name → element, as `fx` beats; reuse the name-it-don't-palette-swap rule | **L** |
| `heaven-set` | 18 findings — Amarāvatī, Draupadī's Śrī-revelation | New `SETS.heaven`: god-ray/motes parallax sky, once `battlefield-set` proves the pattern | **M** |
| `ocean-cosmic-set` | 6 findings — Ulūpī's Pātāla, Ananta's cosmic ocean, Varuṇa's realm, **and Samudra Manthan (the churning) — the corpus's largest water set-piece, unnamed until now** | Submerged-camera tint/refraction + floating pose; Samudra Manthan is a composite beat needing a rotating-mountain prop (Mandara on Kūrma's back) plus `mass-army-scale`'s two-side tug-of-war blocking, not a simple set reskin | **L** (Manthan beat) / **M** (rest) |
| `cave-set` | 5 findings — Jāmbavān's cave, Kiṣkindhā, Svayamprabhā | New `SETS.cave`: low, warm, torch-lit mountain variant | **S** |
| `chariot-and-vimāna spectacle` | flight-path cases within `chariot-prop` | Flight-path camera moves on v2.1's `drawChariot`/`mount`; no new rig | **S** |
| `veena-prop` | 3 findings — Tumburu, Nārada, Sarasvatī | Static held prop + finger-position variants on `hold` | **S** |

## 4. Workaround playbook — filming today despite gaps

- **Un-rigged bodies (vanara/nāga/garuḍa/composite) → cut around them.**
  Silhouette, offscreen presence, or a banner cameo, not a human in a fur
  suit — a bad stand-in reads worse than an absence.
- **Morph and garment-continuity beats (sex-change, growth, curse,
  vastraharaṇa) → hard-cut between pre-built configs**, not a live transform.
- **Signature weapons not yet in `world.js` → hold a generic shape in the
  existing grip**, or omit and let dialogue carry it.
- **Chariots → imply via banner + standing pose**, never a moving named
  chariot until `chariot-prop` ships.
- **Battlefields/heaven/ocean/cosmic sets → dress an existing `SETS.*` entry**
  with fire/smoke/ray/ripple fx and a strong grade.
- **Rain, mass armies, in-shot growth (Trivikrama) → dress with grade + sfx
  and cut before the transform**, same restraint rule, until `weather-fx` /
  `mass-army-scale` / `scale-transform` ship.
- **Graphic injury/beheading/dismemberment → cut away before the blow**, show
  only the aftermath pose, or leave it to narration.
- **Named two-figure contact, violent or tender → freeze as a static
  tableau**, not dynamic contact, until `two-person-contact` v2.1 ships.
- **Age spans → grey hair/beard + build scalar only** until `age-dial` ships;
  treat every age of one character as the same registry entry, not a recast.
- **Groups/armies → `crowdStrip` today**, though true palace-vs.-battlefield
  differentiation needs `mass-army-scale` and the v2.2 beast rigs.

## 5. Iconography accuracy notes

Any film that puts a named item — or color — on a deity or marked figure must
get it right; `weapons-and-props-pack` (v2.1) carries a `name` field per prop
for exactly this reason.

| Deity/figure | Signature items | Rule the film must respect |
|---|---|---|
| Viṣṇu/Kṛṣṇa | Cakra **Sudarśana**, Śaṅkha **Pāñcajanya**, Gadā **Kaumodakī**, Padma | Fixed *chatur-bhuja* hand-position; never unnamed |
| Śiva | **Triśūla** (three prongs), **Ḍamaru**, bow **Pināka**/**Ājagava** | Trident must read three-pronged; broken bow at Sītā's svayaṃvara is Pināka specifically |
| Yama | **Daṇḍa** + buffalo mount | Attribute and vāhana required together |
| Indra | **Vajra** (Dadhīci's bones) | Lightning-form, never a generic mace |
| Arjuna | Bow **Gāṇḍīva**, conch **Devadatta** | Distinct from any other bow/conch in the corpus |
| Each Pāṇḍava | Named conch at Kurukṣetra's opening | Yudhiṣṭhira=Anantavijaya, Bhīma=Pauṇḍra, Arjuna=Devadatta, Nakula=Sughoṣa, Sahadeva=Maṇipuṣpaka |
| Rāvaṇa | Ten heads, twenty arms | Even a reduced shot must gesture at multiplicity |
| Karṇa | **Kavaca-Kuṇḍala** (Sūrya's gift) | Fused to skin; loss to Indra's guile cannot read as armor removed |
| Āyudhapuruṣas | Weapons personified | Ritual/temple cameo only, never battle continuity |

**Color symbolism** — a distinct audit dimension from attribute-naming, since
`Person.skin`/`clothMain` currently pick from a free palette:

| Figure/state | Rule |
|---|---|
| Viṣṇu/Kṛṣṇa | skin dark blue-black (megha-śyāma) — not brown/tan |
| Śiva | ash-white body (bhasma); throat band blue-black (Nīlakaṇṭha) only, not skin-wide |
| Kālī | skin/aura black |
| Durgā | red as signature garment/aura color |
| Widow/mourning (Kuntī post-war, Gāndhārī) | white, unadorned — never bridal color |
| Bride (Draupadī's, Sītā's wedding) | red, full ornament |
| Ascetics/sages | ash-smeared or ochre/saffron, no jewel tones |

**Standing rule for the roadmap:** every prop under `weapons-and-props-pack`
carries a `name` key sourced from the item table above, and every
`skin`/`clothMain` assignment for a marked figure or life-state pulls from the
color table above — a storyboard requests a weapon or a state by name and
always gets the textually correct object or hue.

---

**File updated:** `/home/user/the-Hindu-timeline/media/engine/COVERAGE.md` (full rewrite, 2243 words, was 2281 words before revision — all ten critic omissions integrated in-line into existing sections; no separate "Additional dimensions" section was needed).

