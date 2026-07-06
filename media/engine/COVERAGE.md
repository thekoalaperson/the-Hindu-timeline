# Engine Coverage Report — v2 (full census)

*Supersedes the v1 placeholder. This audit covers 311 named beings from the
`08-beings-and-bestiary/` + `09-artifacts-symbols-and-arts/` corpus against the
current `people.js` / `wardrobe.js` / `acting.js` / `world.js` implementation,
checked feature-by-feature against the `Person` / `SETS.*` / `props.js` /
`stage.js` architecture defined in `CONTRACTS.md`. Every gap below is tied to a
named character and a named engine feature, not a vibe.*

## 1. Executive summary

**Tally (311 beings):** Full **43** (13.8%) · Good **137** (44.1%) · Partial
**93** (29.9%) · Poor **38** (12.2%).

- **180/311 (57.9%)** are filmable *as themselves*, as-is or with only prop/set
  polish already in flight — this is the whole human epic core: Pāṇḍavas,
  Kauravas, Rāma's court, sages, kings, most named women.
- **93/311 (29.9%)** are filmable *today only via a workaround* — the character
  appears on screen, but a trait that defines them (a serpent body played as a
  human woman, a mace-duel played with a generic staff, a beheading cut away
  before the blow) is faked, cheated, or dropped to narration.
- **38/311 (12.2%)** cannot be filmed as themselves at all. 27 of these 38 are
  blocked on exactly one missing thing: a vanara body (17 chars), a vulture
  body (3), or a serpent/composite body (7) — not a missing prop, a missing
  *rig*.
- **72 blocker-severity findings** total. Of those, **62** trace to 15 systemic
  features — the same missing rig/prop blocks 2+ characters (`vanara-rig` 17,
  `naga-serpent-body` 7, `lion-tiger` 5, `multi-head` 4, `animal-headed-humanoid`
  4, `tail-humanoid` 4, `garuda-rig` 3, `vulture-fauna-rig` 3, `giant-scale` 2,
  `mace-gada` 2, `kinnara-rig` 2, `dog-fauna` 2, `battlefield-set` 2, `morph-fx`
  1, `chariot-prop` 1). The remaining **10** are one-off signature anatomies
  tied to a single named character each (Aṣṭāvakra's eight-bend body,
  Barbarīka's head-on-pole state, Jarāsandha's split-and-rejoin torso,
  Kabandha's headless/long-arm composite (2 findings), Maṇḍavya's impalement
  state, Jāmbavān's bear form (2 findings), Navaguñjara's nine-animal
  composite) — these will likely stay bespoke one-shot builds rather than
  reusable dials, and should be budgeted that way, not folded into a "rig".
- The largest drag by *volume*, though, isn't the exotic bodies — it's
  **combat-choreography** (59 findings), **battlefield-set** (47),
  **morph-fx** (39), **injury-state** (34), **chariot-prop** (28), and
  **two-person-contact** (25). These hit characters who otherwise render fine
  as ordinary humans (Bhīma, Arjuna, Draupadī, Duryodhana, Kṛṣṇa): the rig is
  there, the *scene grammar* — a duel, a war backdrop, a wound, a hair-drag,
  a chariot — is not.

**Verdict:** the engine is production-ready for the human epic core (58%) and
structurally blind to non-human body plans as a class (vanara, nāga,
garuḍa/vulture, animal-headed, multi-limb iconography = the bulk of the
"poor" tier). Fixing the roadmap below in order clears essentially the whole
corpus without a rewrite — every item is a new dial on the existing `Person` /
`props.js` / `SETS.*` architecture, not a new engine.

## 2. Coverage by category

| Category | Tier (mostly) | Representative names | Primary blocker |
|---|---|---|---|
| Epic humans at rest — Kuru/Pāṇḍava kin, Rāma's court, sages, minor royals | **Full/Good** | Ambikā, Ambālikā, Kuntī, Subhadrā, Vidura, Kṛpī, Rāma & Lakṣmaṇa (Ayodhyā chapters), Yudhiṣṭhira | none — rig, wardrobe, acting all shipped; residual gaps are cosmetic (age-dial, minor props) |
| Epic humans in active war/combat — same roster, war chapters | **Partial** | Bhīma, Arjuna, Duryodhana, Bhīṣma, Aśvatthāman, Jayadratha, Duḥśāsana | `combat-choreography`, `chariot-prop`, `battlefield-set`, `injury-state` — feature exists partially but can't stage the named beat |
| Rākṣasas & asuras, ordinary scale | **Good/Partial** | Alambuṣa, Hiḍimbā, Śūrpaṇakhā, Lavaṇa, Vajrajvālā | `rakshasa-anatomy` (tusk/mane/claw dial partial); `morph-fx` absent |
| Rākṣasas, marked or giant | **Poor** | Kumbhakarṇa, Ghaṭotkaca, Rāvaṇa, Hiḍimba | `giant-scale` capped ~1.5×; `multi-head`/multi-arm absent |
| Vānaras (monkey people) | **Poor, uniformly** | Hanumān, Vālī, Aṅgada, Tārā, Sugrīva | `vanara-rig` does not exist — 0 of this cast is filmable as itself |
| Nāga & serpent beings | **Poor/Partial** | Ulūpī (4 separate entries), Ananta/Śeṣa, Vāsuki, Takṣaka, Kāliya | `naga-serpent-body` does not exist; princesses currently shot as ordinary women |
| Garuḍa & vulture kin | **Poor, uniformly** | Garuḍa, Jaṭāyu, Sampāti, Supārśva, Aruṇa | `garuda-rig`/`vulture-fauna-rig` absent; only a generic bird silhouette stands in |
| Singular/composite anatomies | **Poor, one-off** | Aṣṭāvakra, Barbarīka, Jarāsandha, Kabandha, Maṇḍavya, Jāmbavān, Navaguñjara | each needs a bespoke body plan with no reuse path — budget as one-shots |
| Groups, attendants, unremarkable kin | **Full/Good** | palace handmaids, minor princes/princesses, named-but-static kin | `crowdStrip` + `archetypes.js` presets already sufficient |

## 3. THE GAP ROADMAP

Ordered by unlock density against engineering effort, and by dependency (v2.2
beast rigs need v2.1's prop/set plumbing to be worth anything on screen).
"Unlocks" = characters carrying a blocker/major finding on that feature.

### v2.1 — Unlock the epics (finish the human category)

| Feature | Unlocks | Approach | Effort |
|---|---|---|---|
| `combat-choreography` | 59 findings incl. Abhimanyu, Bhīma, Arjuna, Droṇa, Duryodhana, Aśvatthāman | Named two/multi-figure blocking presets in `acting.js` (`duel`, `mob-attack`, `wrestle`, `disarm`) driven by `stage.js` beat pairs — same synced-beat mechanism as a walk cycle, applied to two actors instead of one | **L** |
| `battlefield-set` | 47 findings incl. Bhīṣma, Droṇa, Gāndhārī, Dhṛṣṭadyumna, Abhimanyu | First real `SETS.battlefield` entry: dust/banner parallax layers + `crowdStrip` armies + corpse/arrow-litter foreground dressing, per the `camLayer` depth model | **L** |
| `weapons-and-props-pack` | mace-gada(10)+sword(9)+trident-prop(7)+staff-danda(5)+dice+veena(3) ≈ 34 findings incl. Bhīma, Kṛṣṇa, Duryodhana, Dhṛṣṭadyumna, Śakuni | One `drawWeapon(name, x,y,ang,s)` in `props.js` keyed to a name→shape table (Kaumodakī, Gāṇḍīva, Chandrahāsa…), hand-attached via existing `hold` grip — never a palette-swapped generic | **M** |
| `chariot-prop` | 28 findings incl. Arjuna, Kṛṣṇa, Bhīṣma, Daśaratha, Jayadratha | `drawChariot` prop + `mount` pose in `acting.js`; reused later by `garuda-rig`/vimāna work in v2.3 | **M** |
| `injury-state` | 34 findings incl. Aśvatthāman's wound-mark, Ekalavya's thumb, Duryodhana's thigh, Draupadī's mourning state | Persistent wound/blood/bandage/torn-garment overlay on `style`, settable **mid-scene** by a `stage.js` beat — first crack at continuity state beyond per-shot costuming | **M** |
| `two-person-contact` | 25 findings incl. Draupadī's hair-drag, Bhīma vs. Duḥśāsana/Jarāsandha | Named contact-pose pairs (`drag`, `grapple`, `strangle`, `carry-slain`) in `acting.js`, same synced-beat model as `combat-choreography` | **M** |
| `age-dial` | 20 findings — every elder in the corpus (Bhīṣma, Vidura, Gāndhārī, Dhṛtarāṣṭra, Kṛpa…) | Ship the already-planned `style.age 0..1`: head/body ratio, grey hair, stoop, staff affinity | **M** |
| `child-body` | 16 findings incl. Abhimanyu, Ghaṭotkaca, young Rāma, Upapāṇḍavas | Scale/proportion preset at the low end of `age`/`build`, reusing the age-dial's interpolation rig rather than a separate body plan | **S** |

### v2.2 — Divine & beast (new body plans)

| Feature | Unlocks | Approach | Effort |
|---|---|---|---|
| `vanara-rig` | 20 findings, the single largest gap — Hanumān, Vālī, Sugrīva, Aṅgada, Tārā | New `Person` subclass: tail param, digitigrade leg bend, fur-textured skin, simian muzzle as a `drawHead` module — same composition strategy as `animal-headed-humanoid` below, so build them together | **L** |
| `naga-serpent-body` | 12 findings — Ulūpī, Ananta/Śeṣa, Vāsuki, Takṣaka, Kāliya | Hybrid rig: human torso/head + serpent-coil replacing legs, hood-fan variant for multi-hood nāgas; princesses need only the coil, not the hood | **M** |
| `multi-head` + multi-arm | 15 findings — Kṛṣṇa's Viśvarūpa, Rāvaṇa, Gaṇḍabheruṇḍa, Śarabha | Generalize `drawFigure`'s arm-pair/head loop to N, each carrying its own pose/prop; hardest part is silhouette/overlap ordering, not the geometry | **L** |
| `giant-scale` | 15 findings — Kumbhakarṇa, Hiḍimbā, Ghaṭotkaca, Jaṭāyu, Rāvaṇa lifting Kailāsa | Not new geometry: lift the current ~1.5× cap, add a parallax/perspective adjustment so a true giant reads correctly against the set | **S** |
| `lion-tiger` fauna | 10 findings — Narasiṃha, Durgā's mount, Śarabha, the Navadurgā set | `drawLion`/`drawTiger` in `props.js` fauna pack, same gait/quality bar as `drawHorse` | **M** |
| `garuda-rig` + `vulture-fauna-rig` | 8 findings — Garuḍa, Jaṭāyu, Sampāti, Supārśva | Wing + talon module on the humanoid torso (Garuḍa) and a pure fauna variant (vultures); share the feather-texture wardrobe asset | **M** |
| `animal-headed-humanoid` | 5 findings — Nandi, Śarabha, Narasiṃha, Pratyaṅgirā | Composite head-swap: parametrize `drawHead` to accept a mane/muzzle/horn module, sharing the `vanara-rig` muzzle work | **M** |
| `tail-humanoid` | 4 findings — Hanumān, Vālī (tail-specific beats: sitting on, binding, setting alight) | Attach point + physics-lite sway on the `vanara-rig` skeleton; not separable from that item | **S** (bundled) |
| `rakshasa-anatomy` completion | 6 findings — Ghaṭotkaca, Hiḍimba, Kumbhakarṇa | Finish the tusk/mane/claw/horn dial already sketched for ordinary rākṣasas; extend range to "monstrous" extreme | **S** |
| `kinnara-rig` / `dog-fauna` / `bear-fauna` / `buffalo-mount` | 2+2+1+3 findings — Kinnara, Sārameyas, Jāmbavān, Durgā's/Yama's mount | Small fauna/hybrid rigs, each low-reuse but cheap; batch into one fauna sprint after the pack above proves the pattern | **S** each |
| One-off composite anatomies | 10 findings, one character each — Aṣṭāvakra, Barbarīka, Jarāsandha, Kabandha, Maṇḍavya, Jāmbavān, Navaguñjara | No dial pays for itself here; author as bespoke one-shot builds on top of the human rig, budgeted per-character, not per-feature | **S** each, **L** total |

### v2.3 — Spectacle

| Feature | Unlocks | Approach | Effort |
|---|---|---|---|
| `morph-fx` | 39 findings — Śikhaṇḍin's sex-change, Ghaṭotkaca's growth, Ahalyā's stone curse, Nāgapāśa illusions | Deliberately **not** a live shape morph: crossfade between two pre-built style objects across a scene cut, keyed by a `stage.js` beat | **M** |
| `astra-fx` | 14 findings — Brahmāstra, Pāśupata, Vāsavī Śakti, Sudarśana | Particle/trail fx keyed to astra name → element (fire/water/wind/serpent/volley), as `fx` beats in the storyboard spec; reuse the "name it, don't palette-swap it" prop-naming rule | **L** |
| `heaven-set` | 18 findings — Indra's Amarāvatī, Draupadī's Śrī-revelation, Yudhiṣṭhira's ascent | New `SETS.heaven`: god-rays + motes parallax sky, once `sets.js`'s pattern is proven by `battlefield-set` | **M** |
| `ocean-cosmic-set` | 6 findings — Ulūpī's Pātāla, Ananta's cosmic ocean, Bandin's Varuṇa realm | Submerged-camera tint/refraction + floating pose variant; a staging problem more than new geometry | **M** |
| `cave-set` | 5 findings — Jāmbavān's cave, Vālī & Sugrīva's Kiṣkindhā, Svayamprabhā | New `SETS.cave`: low, warm, torch-lit parallax variant of the existing mountain set | **S** |
| `chariot-and-vimāna spectacle` | flight-path cases within `chariot-prop`'s 28 — Puṣpaka Vimāna, celestial descents | Flight-path camera moves on top of v2.1's `drawChariot`/`mount`; no new rig | **S** |
| `veena-prop` | 3 findings — Tumburu, Nārada, Sarasvatī | Static held prop + finger-position variants on the existing `hold` grip | **S** |

## 4. Workaround playbook — filming today despite gaps

- **Un-rigged bodies (vanara/nāga/garuḍa/composite) → cut around them, don't
  fake them.** Silhouette, offscreen presence, or a banner/emblem cameo
  (Hanumān-on-Arjuna's-flag) rather than a human in a fur suit — the Director's
  Addendum's "painting, not puppet" rule means a bad stand-in reads worse than
  an absence.
- **Morph beats (sex-change, growth, stone-curse, shapeshift) → hard-cut
  between two pre-built character configs**, not a live transform, until
  `morph-fx` ships. This is already the de facto pattern across a third of the
  audited partials.
- **Signature weapons not yet in `world.js` (mace, trident, dice, discus) →
  hold a generic prop shape in the existing grip**, or omit and let dialogue
  carry it, rather than mis-naming a substitute.
- **Chariots → imply via banner + standing pose**, or a static cart prop,
  never a moving named chariot until `chariot-prop` ships.
- **Battlefields/heaven/ocean/cosmic sets → dress an existing `SETS.*` entry**
  (forest, mountain, palace hall) with fire/smoke/god-ray/water-ripple fx and
  a strong color grade rather than promising a set that doesn't exist.
- **Graphic injury/beheading/dismemberment → cut away before the blow**,
  show only the still aftermath pose (fallen, kneeling, prone), or leave it to
  narration — consistent with the corpus's own restraint and with the absence
  of `injury-state`.
- **Named two-figure violence (hair-drag, grapple, strangle) → freeze as a
  static tableau pose**, not dynamic contact, until `two-person-contact` ships.
- **Age spans → grey hair/beard + build scalar only**; true stoop/wrinkle
  proportions wait on `age-dial`.
- **Groups/armies → `crowdStrip` today**, varying `hash1`-seeded skin/build/
  garment per the anti-twinning rule, even though true army differentiation
  (vānara vs. rākṣasa vs. deva ranks) needs the v2.2 beast rigs.

## 5. Iconography accuracy notes

From the divine-objects/treasures audit — any film that puts a named item in a
deity's hand must get the *name*, *count*, and *hand position* right; the
corpus is precise about these, and `weapons-and-props-pack` (v2.1) should
carry a `name` field per prop for exactly this reason.

| Deity/figure | Signature items | Rule the film must respect |
|---|---|---|
| Viṣṇu/Kṛṣṇa | Cakra **Sudarśana**, Śaṅkha **Pāñcajanya**, Gadā **Kaumodakī**, Padma | Fixed *chatur-bhuja* hand-position convention — don't swap the discus to the wrong hand or leave it unnamed |
| Śiva | **Triśūla** (three distinct prongs, not a generic spear), **Ḍamaru**, bow **Pināka**/**Ājagava** | The trident must read as three-pronged; the bow broken at Sītā's svayaṃvara is Pināka specifically, not a generic bow |
| Yama | **Daṇḍa** (staff/rod of law) + buffalo mount | Both attribute *and* vāhana are required together — a mace or a different mount is wrong, not just a simplification |
| Indra | **Vajra** (thunderbolt, forged from Dadhīci's bones) | A lightning-form weapon, never a generic mace or club |
| Arjuna | Bow **Gāṇḍīva**, conch **Devadatta** | Named and distinct from any other bow/conch in the corpus |
| Each Pāṇḍava | Named conch blown at Kurukṣetra's opening | Yudhiṣṭhira=Anantavijaya, Bhīma=Pauṇḍra, Arjuna=Devadatta, Nakula=Sughoṣa, Sahadeva=Maṇipuṣpaka — a multi-conch scene must not generic-ify |
| Rāvaṇa | Ten heads, twenty arms | Even a reduced/implied shot (per §4) must gesture at multiplicity — one ordinary head reads as wrong, not simplified |
| Karṇa | **Kavaca-Kuṇḍala**, gift of Sūrya | Fused to the skin, not removable costume — its loss to Indra's guile is a plot beat, so it cannot be shown as armor taken off like a garment |
| Āyudhapuruṣas | Sudarśana, Kaumodakī, Pāñcajanya, Nandaka, Śārṅga, Pināka, Triśūla, Vajra, personified | Reserve for ritual/temple cameos, never battle continuity |

**Standing rule for the roadmap:** every prop shipped under
`weapons-and-props-pack` carries a `name` key (`"kaumodaki"`, not `"mace-2"`),
sourced from this table, so a storyboard requests a weapon by name and always
gets the textually correct object.
