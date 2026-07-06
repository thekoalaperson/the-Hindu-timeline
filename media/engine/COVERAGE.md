# Engine Coverage Report — v1 vs. the Corpus

*Audit method: the supplied audit payload was empty (0/0 beings), so this report is
grounded directly in `engine/src/*.js` + `CONTRACTS.md` against the corpus categories
in `08-beings-and-bestiary/` and `09-artifacts-symbols-and-arts/`. Every claim traces
to a function (or its absence) in `people.js`, `wardrobe.js`, `acting.js`, `world.js`.
Tier labels are engineering judgment, not a literal per-being census — no `sets.js`,
`props.js`, `stage.js`, or character registry exist yet to audit programmatically.*

## 1. Executive summary

**The engine can film ordinary humans today. It cannot yet film the myth.**

The only rig that exists — `drawFigure`/`drawSeated`/`drawHead` in `people.js`, dressed
by `wardrobe.js`, posed by `acting.js`'s `POSES` — is a single, well-realized body plan:
one head, two arms, two legs, biped, profile-to-¾ face. It is genuinely strong at what
it does (the shipped `winning-of-draupadi` film proves it): rich wardrobe, 12+ acting
poses, walk cycles, crowd tiling. But it is the *only* body plan, and even within that
plan the rig treats a character as a fixed look, not a stateful one — no age dial, no
mid-scene wounds/torn garments, no dialogue-timed mouth states, no named two-figure
blocking beyond a generic `carry`. There is also no `sets.js`, no fauna rig
(`drawHorse`/`drawElephant`/etc. are contract wishlist, 0 implemented), no
multi-arm/multi-head/animal-head parametrization, no chariots, no combat choreography,
and no data-driven storyboard interpreter (`stage.js`) — every scene today is hand-coded.

Headline: **of the six-plus corpus categories, only "epic humans in ordinary form" is
production-ready.** Everything with a non-human body plan, a non-consort female role, or
a stateful/temporal dimension (speech, injury, submersion, animated scale change) is
currently **unfilmable without a stand-in or a cheat** — not because the art style can't
support it, but because the parameter space (CONTRACTS.md's own stated goal) hasn't been
built out from the human rig yet.

| Coverage tier | Meaning | Rough share of corpus |
|---|---|---|
| **Full** | Rig + props + set + acting all present | Epic humans only (~1 of 6 categories) |
| **Good** | Rig present, needs prop/set additions | Deities *in plain human form*, sages, kings |
| **Partial** | Human rig reusable via costuming/cheat, accuracy compromised | Ordinary rakshasas, apsaras/gandharvas, groups |
| **Poor/absent** | No rig path exists at all | Vanaras, nagas, Garuda, multi-armed/headed deities, giants, animals |

## 2. Coverage table by category

| Category | Tier | Representative names | Why |
|---|---|---|---|
| Epic humans | **Full** | Rāma, Sītā, Arjuna, Draupadī, Kṛṣṇa (human scenes), Karṇa, Yudhiṣṭhira, Bhīma, kings/brahmins/hunters | Rig, wardrobe, acting, crowd all shipped and proven |
| Deities (plain form) | **Good** | Kṛṣṇa as charioteer, Sūrya, Sāndīpani, Dhaumya, human-form ṛṣis | Same rig works; missing is *forms* (charioteer/cowherd/Viśvarūpa switching) and signature props |
| Deities (iconographic) | **Poor** | Viṣṇu (4-armed + cakra/śaṅkha/gadā/padma), Śiva (triśūla+ḍamaru), Durgā (8–18 arms), Brahmā (4 heads) | No multi-arm or multi-head parameter exists on the human rig |
| Rakshasas (human-scale) | **Partial** | Śūrpaṇakhā, ordinary rākṣasa soldiers | Human rig + wardrobe/build dials can approximate; no fangs/tusks/build-extremes yet |
| Rakshasas (marked) | **Poor** | Rāvaṇa (10 heads/20 arms), Kumbhakarṇa (giant), Hiḍimba/Bakāsura (monstrous) | Multi-head and giant-scale unsupported |
| Vanaras & animals | **Poor/absent** | Hanumān, Sugrīva, Vālī, Jāmbavān, all horses/elephants/deer/cows | 0 of 5 fauna rigs (`drawHorse`…`drawCow`) implemented; no tail/fur param |
| Nāgas & composites | **Absent** | Śeṣa/Ananta, Vāsuki, Gaṇeśa (elephant head), Narasiṃha (lion head), Hayagrīva (horse head) | No serpent lower-body, no animal-head-on-human-body composite path |
| Garuḍa | **Absent** | Garuḍa, Jaṭāyu, Sampāti | Bird-human hybrid; no wing/talon rig |
| Groups/crowds | **Partial** | Palace courts, vānara/rākṣasa armies, devas at Kurukṣetra | `crowdStrip` tiles generic seated humans; fine for background court, not for differentiated armies |
| Women beyond consort | **Poor** | Śabarī (ascetic), Kuntī (mother, not wife, in her scenes), Citrāṅgadā (warrior-queen), Satyabhāmā (warrior-consort), Ahalyā (curse/redemption) | Every named woman elsewhere in this table is a consort or antagonist; `acting.js` has no audited ascetic/warrior/maternal-specific cues (nursing, hair-loosening, resisting abduction) |

## 3. THE GAP ROADMAP

Grouped by unlock density (characters newly filmable per engineering effort), consistent
with the "orthogonal dials over hardcoded looks" principle in `CONTRACTS.md`.

### v2.1 — "Unlock the epics" (finish the human category, properly)

| Feature ID | Unlocks | Approach | Effort |
|---|---|---|---|
| `weapons-props-pack` | Every epic warrior scene: swords, maces (Bhīma's gadā), discus, tridents, daṇḍa, noose, all five Pāṇḍava-named conches | Extend `world.js` beyond bow/arrow: parametrized `drawWeapon(kind, x,y,ang,s)` keyed to a name→shape table, hand-attached via existing `hold` grip | **M** |
| `age-dial` | Child Kṛṣṇa/Rāma, aged Bhīṣma/Vidura/Dhṛtarāṣṭra, elder ṛṣis | Ship the already-planned `style.age 0..1`: interpolate head/body ratio, add grey-hair/stoop presets, staff affinity | **M** |
| `riding-and-combat` | Chariot duels (Kurukṣetra), mounted travel, sword/mace clash beats | Add `drawChariot` prop + `mount` pose category; combat = two `POSES` synced by beat offsets, no new rig needed | **M** |
| `battlefield-set` | Kurukṣetra, Laṅkā siege, any war scene | First real `sets.js` entry: parallax dust/banner layers + `crowdStrip` armies + `camLayer` per CONTRACTS depth model | **L** |
| `character-registry` | Any named character reusable across stories without re-authoring style objects | `characters/registry.json` + `Person.of(name)` per CONTRACTS §Person API (no `Person` class yet); absorbs a **women-beyond-consort audit** of Śabarī/Kuntī/Citrāṅgadā/Satyabhāmā/Ahalyā against `acting.js`/`wardrobe.js`, and the `deity-color-presets` item below | **M** |
| `lip-viseme-cues` | Dialogue scenes: Gītā discourse, sabhā speech, curses, vows | `drawHead`'s `face.lipsPart` is a static knob, not beat-driven; add discrete open/closed/mid mouth states keyed to a dialogue-beat track | **S** |
| `continuity-state-layer` | Draupadī's vastraharaṇa and hair-vow, Bhīṣma's arrow-bed, wounded warriors | Persistent wound/blood/torn-garment/loosened-hair overlay on `style` that changes **mid-scene**, on top of `wardrobe.js` — costuming today is per-shot only | **M** |
| `dyad-blocking` | Reunion, blessing, mourning beats: embrace, caraṇa-sparśa (feet-touch), child-in-lap, carrying the wounded | Named two-figure pose-pairs beyond `acting.js`'s one generic `carry`, synced like `riding-and-combat`'s duel beats | **M** |
| `rakshasa-facial-features` | Rākṣasa soldiers, Śūrpaṇakhā, Hiḍimbā — the "no fangs/tusks" gap flagged in §2 | Fold fang/tusk/brow-ridge/build-extreme params into `weapons-props-pack`'s scope as a `drawHead` option | **S** |

### v2.2 — "Divine & beast" (new body plans)

| Feature ID | Unlocks | Approach | Effort |
|---|---|---|---|
| `vanara-rig` | Hanumān, Sugrīva, Vālī, Jāmbavān, the vānara army | Subclass on `drawFigure`: tail param, digitigrade leg bend, fur-textured skin, simian face via head-space overrides | **L** |
| `fauna-pack` | Horses, elephants (Airāvata, war elephants), deer (Māyā-mṛga), cows (Kāmadhenu), birds | Implement the 5 contract-listed `draw*` fauna functions with walk/run/idle gaits, per CONTRACTS §Props & fauna | **L** |
| `naga-body` | Śeṣa/Ananta, Vāsuki, Takṣaka, any serpent-form being | Hybrid rig: human torso/head + serpent coil replacing legs; hood-fan variant for multi-hood nāgas | **M** |
| `animal-headed-humanoid` | Gaṇeśa, Narasiṃha, Hayagrīva, Vārāha | Composite head swap on the human body: parametrize `drawHead` to accept a trunk/mane/muzzle module | **M** |
| `garuda-rig` | Garuḍa, Jaṭāyu, Sampāti | Wing + talon module on the humanoid torso, feather-texture wardrobe variant | **M** |
| `multi-limb-param` | Viṣṇu/Durgā/Śiva iconographic forms, Rāvaṇa (10 heads) | Generalize `drawFigure` arm-pair loop to N arm-pairs and head loop to N heads, each carrying its own `pose`/prop; the hard part is silhouette/overlap ordering | **L** |
| `giant-scale` | Kumbhakarṇa, Hiḍimba's true form, Vibhīṣaṇa's giants | Not new geometry — a constant scale multiplier + parallax adjustment for *fixed-size* giants | **S** |
| `scale-transform-fx` | Vāmana→Trivikrama's three strides (dwarf to cosmic giant *within one shot*) | Different from `giant-scale`: animated morph + progressive reframing across the growth beat, a time-keyed scale+camera track | **L** |
| `apsara-gandharva` | Apsaras/gandharvas — stranded in §2's Partial tier with no roadmap owner until now | Aerial pose set + flight camera path + dance-specific `acting.js` poses distinct from the ground-based `dance` entry | **M** |
| `underwater-staging` | Matsya avatar, Kāliya-daha, submerged Dvārakā — mislabeled as a `cosmic-ocean-heaven-sets` backdrop today | Submerged-camera tint/refraction, floating/swimming pose variant, bubble fx — a staging problem, not set dressing | **M** |

### v2.3 — "Spectacle"

| Feature ID | Unlocks | Approach | Effort |
|---|---|---|---|
| `astra-fx` | Every astra duel (Brahmāstra, Āgneyāstra, Vāruṇāstra, Nāgāstra), Kṛṣṇa's Sudarśana, the massed "rain of arrows" volley | Particle/trail fx keyed to astra name → element (fire/water/wind/serpent/volley), as storyboard `fx` beats sketched in `stage.js`'s spec | **L** |
| `night-lighting` | Kṛṣṇa's midnight birth, forest-exile nights | Moon/torch key-light palette swap + rim-light bias — kept separate from weather since it recurs on clear nights too | **S** |
| `precipitation-fx` | Literal monsoon rain/storm; illusion/māyā transformations (Māyā Dānava, rākṣasa shape-shifts) | Particle/opacity-noise rain layer over `camLayer`; morph = crossfade between two style objects — deliberately not the arrow-volley above | **M** |
| `cosmic-ocean-heaven-sets` | Samudra Manthana, Vaikuṇṭha, Kailāsa, Amarāvatī, Pātāla | New `SETS.*` entries once `sets.js` exists (v2.1 dependency): cosmic-scale parallax skies, churning-ocean animation, celestial props | **L** |
| `chariot-and-vimana-pack` | Puṣpaka Vimāna, divine chariots, Sūrya's ratha | Prop + flight-path camera moves; reuses `riding-and-combat` mount logic from v2.1 | **S** |
| `multi-hood-and-crown-fx` | Śeṣa's thousand hoods, Kāliya's multi-hood dance | Radial repetition of the `naga-body` hood module with falloff opacity, without literally drawing 1000 | **S** |

## 4. Workaround playbook — filming today despite gaps

- **Deities in iconographic form → film in human/avatar form instead.** Kṛṣṇa as
  charioteer or cowherd, Rāma as prince, Śiva as ascetic are fully covered. Reserve
  multi-armed *darśana* moments for a single still composite shot, not the animated
  rig, until `multi-limb-param` ships.
- **Vanaras → costume a human.** Fur-toned skin, tail as a static hip-attached
  accessory, for background/mid-shot vānaras; keep Hanumān close-ups out of scope
  until `vanara-rig`.
- **Animals → props, not rigs.** A static background silhouette stands in; no moving
  fauna hero shot before v2.2.
- **Rāvaṇa/giants/multi-head beings → imply, don't build.** Tight framing on one head,
  low camera angle for scale, cutaways to reaction shots rather than the full form.
- **Battlefields/cosmic sets → generic sets + strong color grade.** `world.js` props
  (banner, pillar, skyline, `crowdStrip`) plus a dusty/bloody wash stand in for
  Kurukṣetra; don't promise ocean-churning or heaven scenes until `sets.js` ships.
- **Weapons beyond bow/arrow → static prop, skip fx.** Draw as a rigid prop in the
  existing `hold` grip; skip astra-launch animation until `astra-fx` exists.
- **Groups/armies → `crowdStrip` today, differentiate later.** Vary `hash1`-seeded
  skin/wardrobe now for variety even though true army differentiation needs v2.2.
- **Dialogue, wounds, embraces → one static state per shot, not a live animation.**
  Hand-pick a mouth position, wound/torn-garment state, and two-figure pose per shot
  rather than promising a mid-scene change (e.g. Draupadī's hair loosening mid-vow)
  until `lip-viseme-cues`, `continuity-state-layer`, and `dyad-blocking` ship.
- **Underwater/night scenes → grade, don't submerge or relight properly yet.** Frame
  Matsya/Kāliya-daha above the waterline or imply it with ripple props; a blue/torch
  color wash covers night scenes until `night-lighting`/`underwater-staging` ship.

## 5. Iconography accuracy notes (from `divine-objects-and-treasures.md` /
`divyastras-and-divine-weapons.md`)

Any film that puts a signature item in a deity's hand must get the *name* and
*count* right — the corpus tracks named variants precisely:

| Deity | Signature items | Accuracy rule |
|---|---|---|
| **Viṣṇu/Kṛṣṇa** | Śaṅkha **Pāñcajanya**, Cakra **Sudarśana** (108 serrated edges, upper-right hand), Gadā **Kaumodakī**, Padma (lotus) | The four *chatur-bhuja* attributes are fixed by hand-position convention — don't swap the discus to the lower hand or rename the conch |
| **Arjuna** | Bow **Gāṇḍīva**, conch **Devadatta** | Named items, distinct from Rāma's/Śiva's bow or any generic conch |
| **Each Pāṇḍava** | Named conch at Kurukṣetra's opening | Yudhiṣṭhira=Anantavijaya, Bhīma=Pauṇḍra, Arjuna=Devadatta, Nakula=Sughoṣa, Sahadeva=Maṇipuṣpaka — don't generic-ify a multi-conch scene |
| **Śiva** | **Triśūla** (three prongs), **Ḍamaru**, bow **Pināka**/**Ājagava** | Trident must show three distinct prongs; the bow broken at Sītā's svayaṃvara is Pināka specifically |
| **Indra** | **Vajra** (thunderbolt, forged from sage Dadhīci's bones) | A lightning-form weapon, distinct from a generic mace |
| **Yama** | **Daṇḍa** (staff/rod of law) + buffalo mount | Defining attribute alongside the vāhana — don't substitute a generic mace |
| **Rāvaṇa** | Ten heads, twenty arms | Reduced-head "implied" shots (§4) should still gesture at multiplicity, not read as ordinary |
| **Karṇa** | **Kavaca-Kuṇḍala** (fused golden armor + earrings, gift of Sūrya) | Inseparable from his skin, not removable costume; their loss to Indra's guile is a plot beat |
| **Āyudhapuruṣas** | Sudarśana, Kaumodakī, Pāñcajanya, Nandaka, Śārṅga, Pināka, Triśūla, Vajra personified | Reserve for ritual/temple-set cameos, not battle continuity |

**General rule for the roadmap above:** every new prop added under `weapons-props-pack`
should carry a *name* field (Pāñcajanya, not "conch #1"), sourced from this file, so a
storyboard can request a weapon by name and get the textually correct object — not a
palette-swapped generic.

### Color & complexion conventions (audited against `wardrobe.js`/`people.js`)

In a flat-color style, **skin and costume color are often the primary recognition
cue**, and this is currently unaudited: `people.js`'s `style.skin` and `wardrobe.js`'s
`clothMain`/`clothAccent`/`sash` are free-form hex with no named, semantic preset.

| Character/state | Convention | Gap |
|---|---|---|
| Kṛṣṇa / Rāma / Viṣṇu | Blue-black (śyāma/nīla) complexion, not brown or tan | No `skin` preset |
| Śiva | Ash-grey (bhasma) body, blue throat patch (Nīlakaṇṭha) | No `throatPatch` token |
| Kālī / fierce Durgā forms | Black or deep-blue body, red tongue/garland contrast | Risk of defaulting to ordinary skin |
| Widow (e.g. Kuntī late, post-war Draupadī) | Plain white, unornamented | No mourning-state flag |
| Bride (Sītā's/Draupadī's svayaṃvara) | Red/saffron with full gold ornament | Defaults already fit — just needs naming |

**Fix:** add a `deity-color-presets` line item under `character-registry` (v2.1, §3) so
color is looked up by name+state, not hand-picked per scene — the same "name it, don't
palette-swap it" rule already applied to props should apply to color.
