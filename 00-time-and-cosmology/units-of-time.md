# Units of Cyclic Time

> Hierarchy location: `00-time-and-cosmology/` — the foundational "how the clock works" node. Everything in [`01-manvantaras/`](../01-manvantaras/) is measured in the units defined here. This file builds the chain from the smallest measurable instant (truti / paramanu) up to one year, then converts human years into divine and ancestral time, and stops at the threshold of the yuga (see [the yuga cycle](yugas-and-mahayuga.md)).

The Hindu reckoning of time is **cyclic and nested**: tiny atomic durations aggregate into the human day, human days into the human year, and the human year becomes a single *day* of higher beings (manes, gods), whose years in turn become the cosmic ages. The single most important conversion in the whole system is the **deva ratio: 1 divine year (deva-varsha) = 360 human years** — every yuga, manvantara and kalpa figure descends from it. A second ratio governs the ancestors: **1 month of humans = 1 day of the pitrs (manes)**.

The texts do **not** fully agree on the small-unit multipliers. This file catalogs all four major chains (Surya Siddhanta, Manusmriti, Vishnu Purana, Bhagavata Purana) and flags every divergence.

---

## 1. The small-unit chain (atom → day)

The chain is recited "bottom-up": each unit is a fixed multiple of the one below it. There are **two distinct traditions** for how the bottom rungs are built, plus a *very* fine-grained Puranic atomic chain. They reconverge at the **muhurta** and **ahoratra (day-night)**.

### 1a. Surya Siddhanta chain (jyotisha / astronomical — the project default)

- **Truti** — the base instant (~29.6 µs, ≈ 1/33,750 s). Defined as the time for light/vision to cross a mote of dust in a sunbeam. *"That which begins with atoms (truti) is called unreal [too small to perceive]"* (Surya Siddhanta).
- **Tatpara** = 100 truti (~2.96 ms).
- **Nimesha** ("blink / twinkling of the eye") = 30 tatpara (~0.089 s).
- **Kashtha** = **18 nimesha** (~1.6 s).
- **Kala** = 30 kashtha (~48 s).
- **Ghatika / nadika / danda** = 30 kala (24 min).
- **Muhurta** = 2 ghatika (48 min).
- **Ahoratra** (day + night) = 30 muhurta (24 hr).

(Source: Surya Siddhanta; summarized in [Hindu units of time (Wikipedia)](https://en.wikipedia.org/wiki/Hindu_units_of_time), [DrikPanchang](https://www.drikpanchang.com/tutorials/basics/hindu-time-keeping.html).)

### 1b. Manusmriti chain (dharmashastra, verses 1.64–80)

- **Nimesha** (twinkling) — base perceptible unit (no sub-nimesha atoms given here).
- **Kashtha** = **18 nimesha**.
- **Kala** = 30 kashtha.
- **Muhurta** = 30 kala.  ← **divergence: no intervening ghatika/2-ghatika step; muhurta is built directly from 30 kala.**
- **Ahoratra** (day-night) = 30 muhurta.
- → 30 ahoratra = 1 month; 12 months = 1 year.

Manu is the source for the higher conversions too: he proceeds straight up through divine years to the chaturyuga, 71 chaturyugas = 1 manvantara, 1000 chaturyugas = 1 kalpa (Manusmriti 1.64–80).

- *Variant (Manusmriti vs Surya Siddhanta):* both agree **kashtha = 18 nimesha** and **kala = 30 kashtha**, but Manu makes **muhurta = 30 kala** (one step), while Surya Siddhanta inserts ghatika and makes **muhurta = 2 ghatika = 60 kala**. The two are arithmetically incompatible at the kala→muhurta rung; the muhurta itself ends up the same length (48 min) only because the kala is differently sized.

### 1c. Vishnu Purana chain

- **Truti** — base.
- **Tatpara** = 100 truti.
- **Nimesha** = 30 tatpara.
- **Kashtha** = **15 nimesha**.  ← **divergence: 15, not 18.**
- **Kala** = 30 kashtha.
- **Kshana** = 30 kala.  ← inserts a *kshana* rung.
- **Muhurta** = **12 kshana**.
- **Ahoratra** = 30 muhurta.

(Source: Vishnu Purana; see [Hindu units of time (Wikipedia)](https://en.wikipedia.org/wiki/Hindu_units_of_time).)

- *Variant (Vishnu Purana vs Manu/Surya):* the headline split is **15 nimesha = 1 kashtha (Vishnu Purana)** versus **18 nimesha = 1 kashtha (Manusmriti, Surya Siddhanta)**. Vishnu Purana also routes through *kshana → muhurta (12 kshana)* rather than *ghatika → muhurta (2 ghatika)*.

### 1d. Bhagavata Purana chain (the fine "atomic" ladder, 3.11)

The Bhagavata gives the most granular chain, starting *below* the truti with literal atoms of matter/time:

- **Paramanu** — the ultimate atom of time (~0.000032 s ≈ 32 µs); the time the sun takes to traverse one *paramanu* of space.
- **Anu** = 2 paramanu.
- **Trasarenu** = 3 anu (the speck visible in a sunbeam).
- **Truti** = 3 trasarenu (~30 µs — note this truti is ~one-millionth the size of the Surya-Siddhanta-system truti's role; here it sits low on a finer ladder).
- **Vedha** = 100 truti.
- **Lava** = 3 vedha.
- **Nimesha** = 3 lava.
- **Kshana** = 3 nimesha.
- **Kashtha** = 5 kshana.
- **Laghu** = 15 kashtha.
- **Nadika (danda/ghatika)** = 15 laghu (~24 min).
- **Muhurta** = 2 nadika (~48 min).
- **Prahara** = 6–7 nadika (a "watch," one-quarter of day or night, length varying with season).
- **Ahoratra** = 30 muhurta.

(Source: Bhagavata Purana 3.11; see [Atomic knowledge in Bhagavata Purana (BooksFact)](https://www.booksfact.com/puranas/atomic-molecular-knowledge-in-bhagavata-purana.html), [Hindu units of time (Wikipedia)](https://en.wikipedia.org/wiki/Hindu_units_of_time).)

- *Variant (Bhagavata vs others):* the Bhagavata is the only chain that builds **nimesha from below** (paramanu→anu→trasarenu→truti→vedha→lava→nimesha) using a tripling pattern, and it makes **kashtha = 5 kshana** and **laghu = 15 kashtha**, terms absent from Manu/Surya. It reconverges at nadika/muhurta/ahoratra.
- *Note [interpretive]:* the Bhagavata's paramanu (~32 µs) and the modern claim that it equals ~16.8 µs (some renderings) is a translation/rounding dispute; values 16.8–32 µs all appear in popularizations. Treat the exact micro-figure as approximate.

### Reconciliation table — where the chains agree and differ

| Rung | Surya Siddhanta | Manusmriti | Vishnu Purana | Bhagavata |
|------|------|------|------|------|
| sub-nimesha | truti→tatpara→nimesha | (starts at nimesha) | truti→tatpara→nimesha | paramanu→anu→trasarenu→truti→vedha→lava→nimesha |
| kashtha = | **18** nimesha | **18** nimesha | **15** nimesha | 5 kshana (= 45 nimesha-equiv) |
| kala = | 30 kashtha | 30 kashtha | 30 kashtha | (uses laghu instead) |
| muhurta = | 2 ghatika (60 kala) | 30 kala | 12 kshana | 2 nadika |
| ahoratra = | **30 muhurta** | **30 muhurta** | **30 muhurta** | **30 muhurta** |

**All four agree: 1 ahoratra = 30 muhurta = 1 human day-night.** This is the load-bearing convergence point that lets the systems share the same year and the same yuga math above.

---

## 2. Day → year (the calendrical chain)

Above the day all traditions agree (this is the calendar proper):

- **Ahoratra** (day-night) — 24 hr.
- **Paksha** (fortnight) = 15 ahoratra/tithis. The **shukla paksha** (bright/waxing half) and **krishna paksha** (dark/waning half).
- **Masa** (month) = 2 paksha (~30 days).
- **Ritu** (season) = 2 masa (~60 days). Six ritus: Vasanta, Grishma, Varsha, Sharad, Hemanta, Shishira.
- **Ayana** (solstitial half-year) = 3 ritu (~180 days). **Uttarayana** (sun's northward course) and **Dakshinayana** (southward course).
- **Samvatsara / varsha** (year) = 2 ayana (~360 days).

(Sources: Manusmriti 1.64–80; Surya Siddhanta; [Hindu units of time (Wikipedia)](https://en.wikipedia.org/wiki/Hindu_units_of_time).)

- *Variant [calendrical]:* the **lunar** chain counts the month in *tithis* (lunar days, ~19–26 hr each, so a tithi ≠ a solar ahoratra), while the **solar/sidereal** chain (Surya Siddhanta) counts by the sun's motion. Luni-solar reconciliation uses the intercalary *adhika masa* (leap month). The 360-day "ideal year" used for the cosmic math is the schematic civil year, not the true tropical year.

---

## 3. Human time → divine and ancestral time (the multipliers that build the cosmos)

Here the chain "jumps levels": a whole human cycle becomes a single unit of a higher being. Two ladders branch off the human year.

- **The Pitr (manes / ancestor) ladder.** *"A month of human beings is equal to one day-and-night of the departed manes."* The bright fortnight (shukla paksha) is the pitrs' day (for activity), the dark fortnight (krishna paksha) their night (Manusmriti 1.66; Vishnu Purana).
  - → 1 pitr ahoratra = 1 human masa (month).
  - → 1 pitr year = 360 pitr days = **360 human months = 30 human years.**

- **The Deva (gods) ladder — the master ratio.** *"A year of men is equal to a day-and-night of the gods."* The **uttarayana** (northward half-year) is the devas' day, the **dakshinayana** their night (Manusmriti 1.67; Surya Siddhanta; Vishnu Purana).
  - → 1 deva ahoratra = 1 human samvatsara (year).
  - → **1 deva-varsha (divine year) = 360 human years.** ← the single conversion that generates every higher figure.

- **Why 360.** A divine *day* equals a human *year*; a year (divine or human) is 360 days; therefore a divine year = 360 human years. The same 360 carries up: a year of Brahma = 360 days-of-Brahma, etc.

(Sources: Manusmriti 1.64–73; Surya Siddhanta; Vishnu Purana Book 1; [Hindu units of time (Wikipedia)](https://en.wikipedia.org/wiki/Hindu_units_of_time).)

---

## 4. Divine years → the yuga (the threshold to the next node)

Applying the 360 ratio to the yuga durations (which scripture states in **divine years**, ratio 4:3:2:1, each with a 1/10 sandhya dawn and 1/10 sandhyamsa dusk):

| Yuga | Divine years (incl. sandhyas) | × 360 = Human years |
|------|------|------|
| Satya (Krita) | 4,800 | **1,728,000** |
| Treta | 3,600 | **1,296,000** |
| Dvapara | 2,400 | **864,000** |
| Kali | 1,200 | **432,000** |
| **Mahayuga (Chaturyuga)** | **12,000** | **4,320,000** |

- *Variant (Sri Yukteswar, The Holy Science, 1894):* rejects the ×360 multiplication as a later misreading; treats the yuga figures as plain years tied to a 24,000-year precessional cycle (12,000 ascending + 12,000 descending), so the full mahayuga = 24,000 years, not 4.32 million. [non-canonical / modern].
- *Variant (Aryabhata):* same 3102 BCE Kali epoch, but divides the mahayuga into **four equal quarters** rather than the 4:3:2:1 sandhya scheme.

Everything above one mahayuga (manvantara, kalpa, Brahma's lifespan) continues in [the yuga cycle](yugas-and-mahayuga.md) and the cosmology overview ([`00-time-and-cosmology/`](./)). For where *we* currently sit (7th Vaivasvata Manvantara, 28th Mahayuga, Kali Yuga), see [`01-manvantaras/`](../01-manvantaras/).

---

## Sources

**Scripture / primary texts**
- *Manusmriti* (Laws of Manu) 1.64–80 — nimesha→kashtha→kala→muhurta chain; pitr-day = human-month, deva-day = human-year; chaturyuga, manvantara (71), kalpa (1000).
- *Surya Siddhanta* (jyotisha) — truti/tatpara base, 18-nimesha kashtha, ghatika→muhurta, sidereal day; divine-year and chaturyuga figures.
- *Vishnu Purana*, Book 1 — truti→tatpara→nimesha, **15-nimesha kashtha**, kshana→muhurta chain; deva/pitr ratios.
- *Bhagavata Purana* 3.11 — paramanu/anu/trasarenu atomic ladder up through truti, vedha, lava, nimesha, kshana, kashtha, laghu, nadika, muhurta, prahara.

**Web / reference**
- [Hindu units of time — Wikipedia](https://en.wikipedia.org/wiki/Hindu_units_of_time)
- [Hindu Time Keeping — DrikPanchang](https://www.drikpanchang.com/tutorials/basics/hindu-time-keeping.html)
- [Atomic & Molecular knowledge in Bhagavata Purana — BooksFact](https://www.booksfact.com/puranas/atomic-molecular-knowledge-in-bhagavata-purana.html)
- [Appendix: Hindu units of measurement — Wiktionary](https://en.wiktionary.org/wiki/Appendix:Hindu_units_of_measurement)
- [The Hindu Solar Day — Vedik Heritage](https://vedikheritageblog.wordpress.com/jyotisha-an-introduction/the-hindu-solar-calendar/)
- *The Holy Science* (Sri Yukteswar, 1894) — [variant 24,000-year cycle](https://en.wikipedia.org/wiki/The_Holy_Science)
