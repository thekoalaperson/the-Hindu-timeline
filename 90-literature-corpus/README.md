# The Literature Corpus — Overview

> Hierarchy location: `90-literature-corpus/` — the meta-spine of the whole repo. These are the **texts that RECORD** everything mapped under [`01-manvantaras/`](../01-manvantaras/). Where the yuga/event files ask *"what happened?"*, this branch asks *"which text says so, and when was it written?"* Every event bullet elsewhere should trace back to a source cataloged here.

This file is the master map: the **Shruti / Smriti** division, then a walk through each genre (Vedas → Upanishads → Itihasa → Puranas → Upavedas → Vedangas → Darshanas → Agamas → Dharmashastras), with **traditional attribution vs. academic dating** flagged for each, plus how each genre plugs into the cosmic timeline.

---

## 0. The Master Division: Shruti vs. Smriti

Hindu tradition sorts its entire canon into two tiers of authority.

- **Shruti ("that which is heard")** — Eternal, *apaurusheya* (authorless / not of human origin), "revealed" to the rishis and transmitted verbally, fixed word-for-word. The highest authority. = the **Vedas** and their embedded layers (Samhita, Brahmana, Aranyaka, Upanishad). (*Shruti* — Britannica; Wikipedia "Śruti")
- **Smriti ("that which is remembered")** — Composed, *paurusheya* (attributed to a human author), derivative and revisable; in principle subordinate to Shruti but in practice **more influential in lived Hinduism**. = Itihasa, Puranas, Vedangas, Upavedas, Darshanas, Agamas, Dharmashastras, and the Bhakti literature. (Wikipedia "Śruti"; testbook.com Vedic Literature)
  - *Note on authority:* the rule is "when Smriti contradicts Shruti, Shruti prevails" (Mimamsa principle) — but most narrative timeline material (cosmology, avatars, lineages, yuga events) lives in **Smriti**, especially the Puranas and Itihasa. Shruti is mostly hymn, ritual, and metaphysics, not chronicle.

```
SANATANA DHARMA CORPUS
├── SHRUTI (revealed, eternal)
│   └── 4 Vedas → each has: Samhita · Brahmana · Aranyaka · Upanishad
└── SMRITI (remembered, authored)
    ├── Itihasa        (Ramayana, Mahabharata)
    ├── Puranas        (18 Maha + 18 Upa)
    ├── Vedangas (6)   (limbs of the Veda)
    ├── Upavedas (4)   (applied sciences)
    ├── Darshanas (6)  (philosophy schools)
    ├── Agamas/Tantras (Shaiva, Vaishnava, Shakta)
    └── Dharmashastras (law/ethics codes)
```

---

## 1. Shruti — The Vedas (the revealed core)

- **The four Vedas (Chaturveda).** The foundational Shruti, traditionally arranged/redacted by **Vyasa** (Krishna Dvaipayana, hence "Veda-Vyasa," the "divider of the Veda") at the **Dvapara–Kali junction** (~3102 BCE in our frame). (Vishnu Purana; Vayu Purana)
  - **Rigveda** — 1,028 hymns (suktas) in 10 mandalas; praise of devas (Agni, Indra, Soma, Varuna…). The oldest layer. *Traditional:* eternal/revealed. *Academic:* core composed **c. 1500–1200 BCE** (Wikipedia "Vedas").
  - **Yajurveda** — sacrificial formulae/prose for the priest (adhvaryu); split into Shukla (White) and Krishna (Black) recensions.
  - **Samaveda** — melodies; hymns (mostly from Rigveda) set to chant (saman); root of Indian music.
  - **Atharvaveda** — spells, healing, daily-life and folk material; admitted to canon latest.
- **Four embedded layers in each Veda** (Shruti throughout):
  - **Samhita** — the hymn/mantra collection itself.
  - **Brahmana** — prose manuals of ritual/sacrifice (yajna) and its meaning.
  - **Aranyaka** — "forest texts," transitional ritual-to-mystical.
  - **Upanishad** — see §2.
- **Timeline role:** Vedas anchor the **early Kali-Yuga textual horizon** and preserve memory of the **Dvapara/late-Treta** ritual order; they record devas, early rishis, and proto-lineages rather than dated "events." See [`../02-deities-and-cosmic-hierarchy/`](../02-deities-and-cosmic-hierarchy/).
  - *Variant (academic):* "Vedic period" texts span **c. 1500–500 BCE**, far later than the traditional 3102 BCE Vyasa redaction — flag this gap wherever Vedic events are dated.

---

## 2. Shruti — The Upanishads (the philosophical capstone)

- **The Upanishads (Vedanta = "end of the Veda").** The concluding mystical layer of each Veda; subject is **Brahman, Atman, moksha, karma, rebirth**. Foundation of all later Hindu philosophy. (Wikipedia "Vedas")
  - **The 10–13 "principal" (mukhya) Upanishads** — e.g. Isha, Kena, Katha, Prashna, Mundaka, Mandukya, Taittiriya, Aitareya, Chandogya, Brihadaranyaka (the last two oldest/largest), plus Shvetashvatara, Kaushitaki, Maitri. Commented on by Shankara, Ramanuja, Madhva.
  - **108 Upanishads** in the Muktika canon (the rest are "minor"/sectarian: Yoga, Sannyasa, Shaiva, Vaishnava, Shakta Upanishads — many **[late text]**).
  - *Traditional:* Shruti, revealed. *Academic:* oldest (Brihadaranyaka, Chandogya) **c. 800–500 BCE (pre-Buddhist)**; minor ones run into the **medieval/early-modern** period.
- **Timeline role:** they supply the *metaphysics of the cosmic clock* itself (cyclic time, the witness Atman) — see [`../00-time-and-cosmology/`](../00-time-and-cosmology/).

---

## 3. Smriti — Itihasa ("thus it was" — the epics)

The **Itihasa** are the two great narrative chronicles. Traditionally treated as eyewitness-grade history of specific yugas.

- **Ramayana** — Rama's exile, Sita's abduction by Ravana, the war in Lanka, return to Ayodhya. Attributed to **Valmiki** (the "adi-kavi," first poet). 7 kandas, ~24,000 verses.
  - *Timeline:* set in **Treta Yuga**. See [`../01-manvantaras/.../mahayuga-28-current/treta/`](../01-manvantaras/manvantara-07-vaivasvata/mahayuga-28-current/02-treta-yuga.md).
  - *Traditional:* composed by Valmiki, Rama's contemporary. *Academic:* core **c. 7th–4th c. BCE**, with additions to ~3rd c. CE; books 1 and 7 considered later (Wikipedia "Itihasa").
- **Mahabharata** — the Kuru succession war between Pandavas and Kauravas at Kurukshetra; contains the **Bhagavad Gita**, the Krishna saga, and vast didactic material. Attributed to **Vyasa**. ~100,000 verses (longest poem in the world); "what is here may be elsewhere; what is not here is nowhere."
  - *Timeline:* set at the **Dvapara–Kali junction**; Krishna's departure / war aftermath marks the **start of Kali Yuga (3102 BCE)**. See [`../01-manvantaras/.../mahayuga-28-current/dvapara/`](../01-manvantaras/manvantara-07-vaivasvata/mahayuga-28-current/03-dvapara-yuga.md).
  - *Traditional:* one Vyasa composition, ~3102 BCE. *Academic:* grew **c. 400 BCE – 400 CE** from a shorter "Jaya"/"Bharata" core (Wikipedia "Itihasa"; Epic-Puranic chronology).
- **Itihasa-Purana as a unit:** tradition often pairs the epics with the Puranas as the "fifth Veda" — the accessible vehicle of dharma for all castes, especially in Kali Yuga. (dharmawiki.org; Vayu Purana)

---

## 4. Smriti — The Puranas (the cosmic-history encyclopedia)

The **primary source for this entire repo's timeline**: creation, dissolution, manvantaras, yugas, avatars, royal genealogies (vamsha), tirthas, and rites. Traditionally attributed to **Vyasa**, narrated by the suta Lomaharshana/Ugrashravas. (vyasaonline.com; dharmawiki.org)

- **Pancha-Lakshana** ("five marks") — a Purana ideally covers: **sarga** (creation), **pratisarga** (re-creation after pralaya), **vamsha** (genealogy of gods/rishis), **manvantara** (the cosmic cycles of the Manus), **vamshanucharita** (dynastic histories of kings). This 5-fold scheme *is* the skeleton of [`01-manvantaras/`](../01-manvantaras/) and [`03-lineages-vamsha/`](../03-lineages-vamsha/). (dharmawiki.org)
- **18 Mahapuranas (Ashtadasha Mahapuranas).** Sectarian self-classification into Sattva/Rajas/Tamas (Vishnu / Brahma / Shiva oriented):
  - *Sattvic (Vaishnava):* Vishnu, Bhagavata, Naradiya, Garuda, Padma, Varaha.
  - *Rajasic (Brahma):* Brahma, Brahmanda, Brahma-Vaivarta, Markandeya, Bhavishya, Vamana.
  - *Tamasic (Shaiva):* Shiva (Vayu), Linga, Skanda, Agni, Matsya, Kurma.
  - *Most cosmology-dense for us:* **Vishnu, Bhagavata, Vayu, Brahmanda, Matsya, Markandeya** (yuga durations, manvantaras, avatar lists, vamshas).
- **18 Upapuranas** ("minor" Puranas) + countless **Sthala Puranas** (local/temple) and caste/sect Puranas **[regional/folk tradition]** — catalog these as variant sources wherever they add or differ.
- **Variant policy hotspot:** Puranas openly disagree (number of avatars, yuga sub-details, which Manu/Indra rules now, sequence of creations). **Always attribute each version to its specific Purana.**
  - *Traditional:* one Vyasa authorship at the Dvapara–Kali junction. *Academic:* "first versions composed **c. 3rd–10th c. CE**," over many hands and centuries, with continuous interpolation (Wikipedia "Puranas"; prekshaa.in "Dating of the Puranas"). The Bhavishya Purana notoriously contains **[late text]** material naming much later figures.
- **Timeline role:** the load-bearing source for nearly every node under [`01-manvantaras/`](../01-manvantaras/).

---

## 5. Smriti — Upavedas (the four applied sciences)

"Sub-Vedas" — technical knowledge appended to (one each, by tradition) the four Vedas. Highly sanctified but **not** part of Vedic Shruti. (testbook.com; hinduwebsite.com)

- **Ayurveda** (→ Atharva/Rig) — medicine and longevity (Charaka, Sushruta Samhitas).
- **Dhanurveda** (→ Yajur) — the science of warfare, archery, weapons.
- **Gandharvaveda** (→ Sama) — music, dance, performing arts.
- **Sthapatyaveda / Shilpaveda / Arthashastra** (→ Atharva) — architecture/sculpture (and, in some lists, statecraft).
  - *Variant:* lists differ on the 4th Upaveda — some give **Sthapatyaveda** (architecture), some **Arthashastra** (polity), some **Shilpaveda** (crafts). Catalog all.
- **Timeline role:** mostly atemporal craft-knowledge; useful for *how* events were enacted (war, healing, temple-building) rather than *when*.

---

## 6. Smriti — Vedangas (the six "limbs" of the Veda)

Six auxiliary disciplines needed to correctly preserve, recite, and apply the Vedas; typically in terse **sutra** form. (Vedic Heritage Portal "Vedangas"; testbook.com)

- **Shiksha** — phonetics, pronunciation, accent.
- **Kalpa** — ritual procedure (incl. **Shrauta, Grihya, Dharma, and Shulba Sutras** — the last on altar geometry).
- **Vyakarana** — grammar (apex: **Panini's Ashtadhyayi**).
- **Nirukta** — etymology (Yaska's Nirukta).
- **Chhandas** — prosody/metre.
- **Jyotisha** — astronomy/astrology — **directly underpins the cosmic clock**: the calendrical machinery for yuga/kalpa reckoning (Surya Siddhanta lineage). See [`../00-time-and-cosmology/`](../00-time-and-cosmology/).
  - *Academic dating:* Vedanga sutra corpus **c. 800–200 BCE**; Panini **c. 5th–4th c. BCE**.

---

## 7. Smriti — Darshanas (the six orthodox philosophy schools)

The **Shad-Darshana** ("six viewpoints") — astika (Veda-accepting) systems, usually paired. (testbook.com; Britannica "Hinduism — Sutras, shastras")

- **Nyaya** (Gautama/Akshapada) — logic, epistemology.
- **Vaisheshika** (Kanada) — atomism, categories of reality.
- **Samkhya** (Kapila) — dualism of Purusha (consciousness) & Prakriti (matter); the cosmological substrate many Puranas use.
- **Yoga** (Patanjali, Yoga Sutras) — discipline/meditation toward kaivalya.
- **Purva Mimamsa** (Jaimini) — ritual exegesis; rules of Vedic interpretation.
- **Uttara Mimamsa / Vedanta** (Badarayana/Vyasa, Brahma Sutras) — metaphysics of Brahman; later sub-schools Advaita (Shankara), Vishishtadvaita (Ramanuja), Dvaita (Madhva).
  - *Nastika (heterodox, Veda-rejecting) counterparts* — Buddhism, Jainism, Charvaka — **[non-Vedic]**; noted here only for contrast.
- **Timeline role:** supplies the *theory of time, causation, and liberation* framing the whole hierarchy; Samkhya cosmology in particular feeds Puranic sarga accounts.

---

## 8. Smriti — Agamas / Tantras (the temple & sectarian canon)

"That which has come down" — voluminous sectarian scripture on **temple ritual, deity worship, mantra, yantra, philosophy, and yoga**; the practical backbone of theistic Hinduism. Classed as Smriti but treated as revealed within their own sects. (Wikipedia "Agama (Hinduism)"; SSRN Koul)

- **Shaiva Agamas** — traditionally **28** (Shiva worship; ground of Shaiva Siddhanta, Kashmir Shaivism).
- **Vaishnava Agamas** — **108 Pancharatra Samhitas** (+ Vaikhanasa tradition); Vishnu/Narayana worship.
- **Shakta Agamas / Tantras** — traditionally **64** (Devi/Shakti worship).
  - Plus numerous **Upa-Agamas**.
- **Variant policy hotspot:** Shaiva, Vaishnava, and Shakta streams give **different cosmologies and supreme-deity claims** — these are exactly the divergences this repo must catalog side-by-side, never collapse. See [`../02-deities-and-cosmic-hierarchy/`](../02-deities-and-cosmic-hierarchy/).
  - *Traditional:* eternal/revealed, even "pre-Vedic." *Academic:* chronology "unclear"; textual existence attested by **mid-1st millennium CE** (Pallava-era epigraphy), some elements earlier (Wikipedia "Agama (Hinduism)").

---

## 9. Smriti — Dharmashastras (the law & ethics codes)

Treatises on **dharma**: law, duty, varna/ashrama, statecraft, expiation. Grew out of the **Dharma Sutras** (part of Kalpa Vedanga). (Britannica "Hinduism — Sutras, shastras, smritis")

- **Manusmriti (Manava Dharmashastra)** — the most famous; attributed to **Manu** (the very Vaivasvata Manu of our 7th Manvantara — see [`../01-manvantaras/manvantara-07-vaivasvata/`](../01-manvantaras/manvantara-07-vaivasvata/)). *Academic:* **c. 200 BCE – 200 CE**.
- **Yajnavalkya Smriti**, **Narada Smriti**, **Parashara Smriti** — the last traditionally named the **prescribed code for Kali Yuga** ("Kalau Parasharah smritah"). (Britannica)
- **Arthashastra** (Kautilya/Chanakya) — statecraft/economics; *academic:* Mauryan-era core, ~4th c. BCE onward.
- **Timeline role:** Dharmashastras encode the *expected conduct per yuga* — directly tied to the **declining dharma (4→3→2→1 legs of the bull of Dharma)** in [`../00-time-and-cosmology/`](../00-time-and-cosmology/) and the Kali-Yuga files.

---

## 10. Traditional vs. Academic Dating — the standing caveat

This repo holds **both frames in parallel** and never lets one silently overwrite the other:

- **Traditional frame:** most core texts are **eternal (Shruti)** or were **redacted/composed by Vyasa at the Dvapara–Kali junction (~3102 BCE)**, with the events they describe placed in Treta (Ramayana), Dvapara (Mahabharata), or earlier yugas/manvantaras.
- **Academic frame:** Rigveda core **c. 1500–1200 BCE**; principal Upanishads **c. 800–500 BCE**; epics **c. 400 BCE – 400 CE**; Puranas **c. 3rd–10th c. CE** (with later interpolation); Agamas attested by **mid-1st millennium CE**. (Wikipedia "Vedas," "Puranas," "Itihasa," "Agama"; prekshaa.in)
- **Rule for all child files:** when stating a date, **label it** *(scriptural)* or *(academic)*, and treat divergent Puranic accounts as **variants attributed to their named text**.

---

## Sub-files (to be expanded under this node)

- `./shruti/` — Vedas, Brahmanas, Aranyakas, Upanishads in detail.
- `./itihasa/` — Ramayana & Mahabharata, kanda/parva breakdowns, event-to-yuga maps.
- `./puranas/` — the 18 Maha- + 18 Upa-Puranas, each profiled with its variant cosmology.
- `./vedangas/`, `./upavedas/`, `./darshanas/`, `./agamas/`, `./dharmashastras/` — genre detail files.
- *(See parent index for cross-links into [`01-manvantaras/`](../01-manvantaras/), [`02-deities-and-cosmic-hierarchy/`](../02-deities-and-cosmic-hierarchy/), [`03-lineages-vamsha/`](../03-lineages-vamsha/).)*

---

## Sources

**Primary texts referenced (classification & attribution):** Vishnu Purana; Bhagavata Purana; Vayu Purana; Brahmanda Purana; Matsya Purana; Markandeya Purana (Pancha-Lakshana scheme, Vyasa redaction of Veda & Puranas); Ramayana (Valmiki); Mahabharata (Vyasa); Manusmriti; Parashara Smriti; Brahma Sutras; Yoga Sutras.

**Web / scholarly sources:**
- [Śruti — Wikipedia](https://en.wikipedia.org/wiki/%C5%9Aruti)
- [Shruti — Britannica](https://www.britannica.com/topic/Shruti)
- [Vedic Literature: Four Vedas, Upanishads, Shruti and Smriti — Testbook](https://testbook.com/ias-preparation/vedic-literature)
- [Vedas — Wikipedia](https://en.wikipedia.org/wiki/Vedas)
- [Vedangas — Vedic Heritage Portal](https://vedicheritage.gov.in/vedangas/)
- [About the Vedas and Vedic Literature — HinduWebsite](https://www.hinduwebsite.com/vedicsection/aboutvedas.asp)
- [Itihasa — Wikipedia](https://en.wikipedia.org/wiki/Itihasa)
- [Epic-Puranic chronology — Wikipedia](https://en.wikipedia.org/wiki/Epic-Puranic_chronology)
- [Puranas — Wikipedia](https://en.wikipedia.org/wiki/Puranas)
- [Puranas — Dharmawiki](https://dharmawiki.org/index.php/Puranas_(%E0%A4%AA%E0%A5%81%E0%A4%B0%E0%A4%BE%E0%A4%A3%E0%A4%BE%E0%A4%A8%E0%A4%BF))
- [Maha Puranas — VyasaOnline](https://www.vyasaonline.com/maha-puranas/)
- [Dating of the Puranas and Interpolations — Prekshaa](https://prekshaa.in/article/dating-puranas-and-interpolations)
- [Agama (Hinduism) — Wikipedia](https://en.wikipedia.org/wiki/Agama_(Hinduism))
- [Sacred Texts and Spiritual Pathways: Shaiva, Vaishnava, Shakta Agamas (Koul) — SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5165893)
- [Hinduism — Sutras, Shastras, Smritis — Britannica](https://www.britannica.com/topic/Hinduism/Sutras-shastras-and-smritis)

<!-- AUTOINDEX:START (generated — do not edit by hand) -->

## 📑 Full Contents

*Auto-generated index of all 31 files in this section. Regenerate with the indexer.*

- 🟩 [Āgamas, Tantras & Dharmaśāstras](agamas-tantras-dharmashastras.md)
- 🟩 [The Bhāgavata Purāṇa — Skandha-by-Skandha Map](bhagavata-purana-skandha-map.md)
- 🟩 [The Principal Upaniṣads — Per-Text Detail](principal-upanishads-detail.md)
- 🟩 [Regional & Oral Epics & Folk Traditions](regional-and-oral-epics.md)
- 🟩 [Śruti — Vedas & Upanishads](shruti-vedas-and-upanishads.md)
- 🟩 [Smṛti — Itihāsa (The Epics)](smriti-itihasa-epics.md)
- 🟩 [Smṛti — The Purāṇas](smriti-puranas.md)
- 🟩 [The Tamil Canon — Sangam, Tirukkuṟaḷ & Bhakti Corpus](tamil-canon-sangam-and-bhakti.md)
- 🟩 [Upavedas, Vedāngas & the Six Darśanas](upavedas-vedangas-darshanas.md)
- 🟩 [Vedic Deities & Famous Sūktas](vedic-deities-and-suktas.md)
- 🟩 [Yajñas & Vedic Rituals](yajnas-and-vedic-rituals.md)

**puranas/**

- 🟩 [The Purāṇas — Per-Text Story Maps (Index)](puranas/README.md)
- 🟩 [Agni Purāṇa](puranas/agni-purana.md)
- 🟩 [Bhaviṣya Purāṇa](puranas/bhavishya-purana.md)
- 🟩 [Brahma Purāṇa](puranas/brahma-purana.md)
- 🟩 [Brahmāṇḍa Purāṇa](puranas/brahmanda-purana.md)
- 🟩 [Brahmavaivarta Purāṇa](puranas/brahmavaivarta-purana.md)
- 🟩 [Devī Bhāgavata (Upapurāṇa)](puranas/devi-bhagavata-upapurana.md)
- 🟩 [Gaṇeśa & Mudgala (Upapurāṇas)](puranas/ganesha-and-mudgala-upapuranas.md)
- 🟩 [Garuḍa Purāṇa](puranas/garuda-purana.md)
- 🟩 [Kūrma Purāṇa](puranas/kurma-purana.md)
- 🟩 [Liṅga Purāṇa](puranas/linga-purana.md)
- 🟩 [Mārkaṇḍeya Purāṇa](puranas/markandeya-purana.md)
- 🟩 [Matsya Purāṇa](puranas/matsya-purana.md)
- 🟩 [Nārada Purāṇa](puranas/narada-purana.md)
- 🟩 [Padma Purāṇa](puranas/padma-purana.md)
- 🟩 [Śiva Purāṇa](puranas/shiva-purana.md)
- 🟩 [Skanda Purāṇa](puranas/skanda-purana.md)
- 🟩 [The 18 Upapurāṇas — Overview & Per-Text Notes](puranas/upapuranas-overview.md)
- 🟩 [Vāmana Purāṇa](puranas/vamana-purana.md)
- 🟩 [Varāha Purāṇa](puranas/varaha-purana.md)
- 🟩 [Viṣṇu Purāṇa](puranas/vishnu-purana.md)

<!-- AUTOINDEX:END -->
