# Morning Katabatic Prediction — Research Plan (Soda Lakes)

**Status:** Research plan. Nothing here is built yet.
**Scope:** Soda Lakes, morning drainage-wind events only. Afternoon/thermal wind is a
different physical problem and is tracked separately in the `wind-guru` project.

---

## 1. The problem

Current workflow: wake at 5:30, manually check the Soda meter, go if it reads 15+ mph,
otherwise go back to bed. Recently extended with a second step — asking the assistant for a
read on whether it will *hold*.

Note what is **not** the goal: eliminating the 5:30 wake-up. That was considered and
rejected (see §3). The wake-up is cheap; a missed session is not.

Two distinct questions hide inside "is it worth going," and they need different solutions:

| Question | When asked | Nature |
|---|---|---|
| Q1. Is it blowing right now? | 5:30am | **Observation.** No forecasting required — already solved by looking. |
| Q2. Will it hold through my session? | 5:30am | Short-range decay estimate. **The real open problem.** |
| Q3. Should I even set the alarm? | Night before | True forecasting problem. Hardest, least valuable. |

Q2 is where the value is: the meter already answers Q1 for free, and Q3 saves only a cheap
wake-up. Historically this project failed by attacking Q3 first.

---

## 2. Key reframing: the cost function is asymmetric

- **False positive** (told to go, conditions junk): costs ~5 minutes and a return to bed.
- **False negative** (told to sleep, conditions epic): costs an entire session.

These are not remotely equal, and it changes the target. We are not building a wind-speed
predictor. Any future night-before tool should be a **"confidently dead" filter** that stays
silent unless it is highly confident the morning is hopeless.

Practical consequence: tune for **high recall on good mornings**, accept many false alarms.
A large share of nights are obviously dead (cloud deck, warm, wrong flow aloft); eliminating
only those is high-confidence and low-risk. Chasing marginal nights is where this project
died last time.

**Even then, every output is advisory.** The human makes the call and verifies on site. See §3.

---

## 3. Tier 0 — The manual verification loop (do NOT automate this yet)

**Decision: we are not building an automated alarm.** It was proposed and rejected, and the
reasoning is worth recording so it does not get re-proposed:

- The drive to Soda is ~5 minutes. The cost of a false positive is therefore near zero.
- Automating the decision buys almost nothing while risking the thing that matters — a
  missed session on a good morning.
- A tool that has been run a handful of times has **no established track record**. Trusting
  it to decide whether you sleep in is unearned.

Reality check on the current evidence: the skill has made exactly **one** real morning call
(2026-07-30, "go", verified at 16.0 mph average for the 6am hour). One correct call is not
evidence of skill. It is n=1.

### 3.1 The loop is the validation harness

The existing manual workflow is not a limitation to engineer away — it is the **only source
of labeled prediction/outcome pairs this project has ever had**:

1. Wake at 5:30, check the Soda meter
2. Ask the assistant for a read on whether it will hold
3. **Drive out and observe what actually happened**
4. Record both the prediction and the outcome

Step 3 is the irreplaceable part. Automating steps 1–2 away would destroy the data source
that any future automation would need in order to be trustworthy.

### 3.2 Prediction log

**Research tasks:**
- [ ] Define a prediction log format. Minimum fields: date, time of call, meter state at call
      time (avg/gust/direction/consistency), the call made, confidence, the threshold in use,
      and **actual observed outcome** including whether the session was usable and for how long
- [ ] Decide where it lives — a flat file in `research/` is fine to start; it needs to be
      trivial to append to at 5:30am or it will not get filled in
- [ ] Have the skill emit its call in a copy-pasteable log line to reduce friction
- [ ] Record outcomes even on mornings the call was "don't bother" but the trip happened
      anyway — **these are the most valuable rows in the dataset**, because they are the only
      way to detect false negatives

### 3.3 Exit criteria

Only after roughly **30+ logged mornings** does it become possible to ask:

- What is the hit rate on "go" calls?
- Has it ever produced a false negative, and what did that cost?
- Does it beat "always go and look"?

Automation becomes a legitimate conversation **only** if the answers justify it. Until then,
the assistant's job is to be a second opinion on a decision the human is still making.

---

## 4. Data inventory — VERIFIED findings

Probed the Ecowitt API against DP Soda Lakes (MAC `5C:01:3B:43:7C:03`) on 2026-07-31.
These are measured, not assumed:

### 4.1 Resolution decays with age — but this costs us almost nothing

| Age | Points per day | Effective interval |
|---|---|---|
| 0–~90 days | 288 | **5 minutes** |
| >~90 days | 48 | **30 minutes** |

Confirmed by inspecting timestamps directly: 2026-07-15 returns 04:00, 04:05, 04:10…
while 2025-10-15 returns 04:00, 04:30, 05:00…

**The 30-minute points are true averages of the underlying 5-minute data, not samples.**
Verified by requesting the same day at both `cycle_type=5min` and `cycle_type=30min` and
comparing: every 30-minute value matched the mean of its six 5-minute values to within
0.02 mph (8/8 rows). Sampling would have been badly lossy — the 04:00 instantaneous
reading was 12.1 mph against a true bucket mean of 15.1 — but averaging preserves exactly
the quantity we score on.

**Decision-equivalence test.** Across 30 recent mornings, compare the go/no-go call from
30-minute data (mean of the 6–7am hour ≥ 15 mph) against 5-minute ground truth (was ≥15
for the majority of the hour):

> **29 / 30 mornings agree (97%).** The single mismatch was a boundary case: 14.4 mph mean,
> exactly 50% of samples above threshold — a morning that was ambiguous at any resolution.

This is expected rather than lucky: the 6–7am mean computed from 30-minute averages is
*arithmetically identical* to the one computed from 5-minute data, because the coarse points
are averages. What 30-minute data loses is only sub-30-minute structure — lull depth and
gust factor. Median peak-to-lull spread inside the 6–7 hour is **5.6 mph**, so that structure
is real, but it does not change the call.

**Conclusion: 30-minute resolution is sufficient for the historical archive.** Preserve
5-minute where it is free (it is the live feed's native resolution anyway, and costs nothing
to store), but this is not a reason to rush.

### 4.2 There are real gaps

Monthly probe of the 15th, points/day:

```
2026-07: 288   2026-06: 288   2026-05: 288   2026-04:  48
2026-03:  48   2026-02:   0   2026-01:   0   2025-12:  48
2025-11:  48   2025-10:  48   2025-09:  48   2025-08:  48
2025-07:   6   2025-06:   0   (device created 2025-06-09)
```

Jan–Feb 2026 is missing entirely — station outage, not retention.

**This matters far less than it first appears.** An earlier draft of this document called it
"the most damaging possible place to lose data" because Dec–Feb is peak katabatic season.
That was wrong, because it ignored park access — see §4.5. The park gate does not open until
8 a.m. in Nov–Feb, and by 8 a.m. in December and January the event is reliably over. Those
mornings are **unrideable regardless of what the wind did**, so the missing data has little
decision value. It would matter for physics modelling, not for "should I go."

### 4.3 Response size is capped

A 7-day request at `5min` returned 336 points, not 2016. A 31-day request at `30min`
returned 180, not 1488. Archive pulls must be **chunked per-day** and rate-limited.

`cycle_type` accepts `5min` / `30min` / `auto`; `240min` errors with 40015.

### 4.4 Archiving is worth doing, but it is not an emergency

The earlier draft flagged this as ⚠️ time-critical, on the grounds that each day of delay
permanently destroys 5-minute fine structure. Given §4.1, **that urgency was overstated** —
the surviving 30-minute averages answer the go/no-go question with 97% agreement.

Two things remain true and justify doing it soon anyway, just without panic:

- Ecowitt is the single point of failure. The Jan–Feb gap is proof the data is not
  guaranteed to exist later. A local copy is insurance against loss, not resolution decay.
- Today (2026-07-31) the 90-day window happens to cover ~May 2 onward, which is the whole
  current season at 5-minute resolution. Grabbing it now is nearly free.

- [ ] Build a per-day chunked archiver. Backfill everything available, then append daily.
      Store whatever resolution the API returns; do not treat 30-minute rows as inferior.

### 4.5 Park access is a hard constraint — and it defines the season

Verified against the City of Lakewood site (`lakewoodco.gov/Parks-Rec/Bear-Creek-Lake-Park`,
retrieved 2026-07-31 — note the site 403s automated fetchers, so it needs a real browser):

| Months | Gate hours |
|---|---|
| May–Sep | **6 a.m.** – 10 p.m. |
| Mar, Apr, Oct | **7 a.m.** – 8 p.m. |
| Nov–Feb | **8 a.m.** – 6 p.m. |

No amount of wind matters before the gate opens. This is a hard filter that sits in front of
every prediction, and any tool built here must apply it first.

**How long does the event actually last?** Measured, rather than assumed. Across 72 days of
history, taking mornings where the 30-minute rolling mean sustained ≥15 mph (n=14), the time
the session *ends* relative to sunrise:

| | min | 25th | **median** | 75th | max |
|---|---|---|---|---|---|
| Session end vs. sunrise | −128 min | +3 min | **+57 min** | +85 min | +102 min |

So the rideable window typically closes about **an hour after sunrise**, consistent with
surface heating breaking the nocturnal inversion.

**The counterintuitive part.** Gate time and sunrise both shift seasonally, and they largely
cancel. Combining the gate table with a sunrise+57min close:

| Month | Gate | Sunrise | Window closes | Usable |
|---|---|---|---|---|
| Jan | 8:00 | 7:19 | 8:16 | ~16 min — effectively dead |
| Feb | 8:00 | 6:52 | 7:49 | **gate opens after it's over** |
| Mar | 7:00 | 7:12 | 8:09 | ~69 min ✅ |
| Apr | 7:00 | 6:23 | 7:20 | ~20 min — marginal |
| May | 6:00 | 5:45 | 6:42 | ~42 min ✅ |
| Jun | 6:00 | 5:32 | 6:29 | ~29 min — marginal |
| Jul | 6:00 | 5:46 | 6:43 | ~43 min ✅ |
| Aug | 6:00 | 6:14 | 7:11 | ~71 min ✅ |
| Sep | 6:00 | 6:43 | 7:40 | **~100 min — best of the year** |
| Oct | 7:00 | 7:11 | 8:08 | ~68 min ✅ |
| Nov | 8:00 | 7:46 | 8:43 | ~43 min ✅ |
| Dec | 8:00 | 7:14 | 8:11 | ~11 min — dead |

Two things fall out of this that are worth testing rather than assuming:

1. **September and October look like the best months**, not June. Late sunrise against an
   unchanged gate hour buys a much longer window. June is one of the *worst* despite the 6
   a.m. gate, because sunrise is at 5:32 and the wind is dying as you rig.
2. **November may not be the end of the season.** An 8 a.m. gate sounds fatal, but sunrise
   is 7:46, so the gate opens only 14 minutes after sunrise. The working assumption that
   "November they go to 8 a.m. and the season is over" may be losing a usable month.

**Caveats, stated plainly.** The +57 min figure is measured entirely from June–July mornings.
Winter behaviour is unverified and could go either way: weaker sun and snow albedo may hold
the inversion longer (extending the window), while a frozen or partly frozen lake and the
practical realities of cold are separate blockers that have nothing to do with wind. Treat
the shoulder-season rows as **hypotheses to test in the prediction log**, not conclusions.

- [ ] Log a few Sep/Oct mornings against this table — cheapest possible test of the claim.
- [ ] Confirm whether lake ice or a separate watercraft season closes Nov–Mar independently.

### 4.6 Base rate: most mornings are not worth it

Of 30 recent mornings with complete data, only **4 (~13%)** had a 6–7am mean at or above
15 mph. Widening to "sustained ≥15 at any point in the 3–11am window" gives 14 of ~72 (~20%).

This is the number any future tool has to beat. A predictor that says "no" every morning is
already ~85% accurate, which is exactly why accuracy is the wrong metric here (§7) and why
the asymmetric cost function in §2 matters so much.

### 4.7 Realistic sample size

The naive count is ~12 months minus the 2-month gap ≈ 300 mornings. The **useful** count is
much smaller, because §4.5 rules out mornings the gate was shut and §4.6 shows most of the
rest were flat:

- Gate-accessible months (Mar–Nov, generously) ≈ **270 mornings/year**
- Of those, roughly **13–20% have a real event** ≈ **35–55 positive examples per year**

Positives are the scarce resource, and there are only a few dozen. That is enough for a
handful of physically-motivated predictors with a couple of parameters each. It is emphatically
**not** enough for a many-feature ML model — with seasonality, some calendar months contribute
single-digit positives. This argues strongly for simple, interpretable rules over anything fancy,
and for measuring skill on positives (recall) rather than overall accuracy.

---

## 5. Tier 1 — Q2, "will it hold?"

Currently answered with a heuristic: katabatic typically persists 45–90 minutes past sunrise.
This worked on 2026-07-30 (6am hour averaged 16.0, 7am fell to 11.3, dead by 8am) but is
a rule of thumb, not a model.

**Known bug to fix regardless:** `katabatic-check.mjs` flags `DECAYING` on a ±1.5 mph swing.
Poulos et al. (2007) mountain-wave/katabatic interaction predicts **1–3 m/s (2–7 mph)
modulation on ~1-hour timescales as expected signal, not decay.** The current threshold will
report death during normal wave modulation. See the physics reference in the `wind-guru`
project.

**Research tasks:**
- [ ] From the archive, extract decay-time distribution relative to sunrise across all events
- [ ] Test whether decay time correlates with event strength, onset time, or date/season
- [ ] Re-derive the `DECAYING` threshold empirically instead of guessing
- [ ] Quantify: given it is X mph at 5:30, what is P(still ≥15 at 7:00)? This is directly
      the question being asked, and it is answerable from the archive alone with no forecast

Note this tier also needs **only historical meter data** — no external forecast source.

---

## 6. Tier 2 — Q3, the night-before call

The only tier that is genuinely a forecasting problem, and the only one that needs external data.

### 6.1 Candidate predictors

Derived from `wind-guru/docs/katabatic-winds-reference.md`. Which of these matter is an
**empirical question** — the point is to test, not assume:

- Overnight cloud cover (radiative cooling is the driver)
- Surface dewpoint / RH (dry air limits longwave trapping)
- 700mb / 500mb wind direction and speed over the Divide — the canonical setup is
  high SW / low NE giving W–NW flow aloft; Poulos case night showed 319° at 8.6 m/s
- Froude number `U/(NH)`, H≈2000m — predicts whether upper slopes get wave-scoured
- Surface pressure gradient (e.g. Grand Junction vs Denver)
- Antecedent conditions / persistence

### 6.2 A caution about the target

Pure radiative drainage is **1–4 m/s (2–9 mph)**. The 15 mph threshold is well above that,
meaning these sessions are **synoptically reinforced or gap-amplified events**, not pure
drainage. Flow aloft is therefore likely a first-order predictor, not background detail —
and it is data this repo currently has no access to at all.

### 6.3 Data sources to research

- [ ] **Open-Meteo archive API** — free, no key, historical reanalysis including pressure-level
      winds. Best candidate for backfilling predictors against the label set
- [ ] **Univ. of Wyoming sounding archive** — KDNR Denver 00Z/12Z, for real stability profiles
      and Froude number
- [ ] NOAA RAP/HRRR via NOMADS — higher resolution, heavier lift
- [ ] Verify licensing/rate limits on each before depending on it

---

## 7. Validation methodology — the part that was missing last time

The previous attempt most likely failed not because predictions were wrong, but because
**there was no way to tell whether they were wrong.** Design against that from the start.

**Non-negotiable rules:**

1. **Define one binary label.** Proposal: did Soda sustain ≥15 mph for ≥30 continuous minutes
   between 05:00 and 08:00? Write it down and do not change it midway.
2. **Establish the base rate first.** If good mornings are 40% of days, a 70%-accurate model
   is barely better than guessing. Compute this before any modelling.
3. **Beat two dumb baselines or ship nothing:**
   - *Always say yes*
   - *Same as yesterday* (persistence — surprisingly strong for wind)
4. **Hold out a test set by time, not randomly.** Random splits leak across adjacent days.
5. **Report asymmetric cost, not accuracy.** Track missed-session rate separately from
   false-alarm rate. Accuracy alone hides the failure that actually matters.
6. **Be willing to conclude it does not work.** A documented "does not beat persistence" is a
   successful outcome of this research and prevents a third attempt at the same dead end.

---

## 8. Open questions

- [ ] Is Soda's 2-month outage recoverable from any other source? (Low priority — §4.2:
      those months are gated out anyway.)
- [ ] Should the archive live in-app, or as a standalone job independent of app releases?
- [ ] **Do the shoulder months actually work?** §4.5 predicts Sep/Oct are the best of the
      year and Nov is still viable. This contradicts the current working assumption that the
      season ends when the gate moves to 8 a.m. Cheap to test, potentially adds months.
- [ ] Does lake ice or a separate watercraft season close Nov–Mar independently of gate hours?
- [ ] Does the +57 min "session end vs. sunrise" figure hold outside June–July? It is measured
      from summer only, and winter inversions may behave differently.
- [ ] After 30+ logged mornings: does the assistant's call beat "always drive out and look"?
      If not, the honest answer is that the tool is a convenience, not a predictor.

Answered since first draft:
- ~~What is the actual base rate of good mornings?~~ → §4.6: ~13% for a 6–7am session.
- ~~Does the 90-day 5-minute window block winter modelling?~~ → §4.1: no. The 30-minute
  archive is decision-equivalent (97% agreement).

---

## 9. Sequencing

1. **Apply the park-hours filter everywhere** (§4.5). It is a hard gate, it is already
   verified, and it costs one lookup table. No point predicting wind for a closed park.
2. **Start the prediction log** (§3.2). Zero infrastructure. Nothing downstream can be
   validated without it, and it accumulates only in real time — it cannot be backfilled.
   This is now the top *time-sensitive* item, since the archiver no longer is.
3. **Fix the `DECAYING` threshold** in `katabatic-check.mjs`. Live bug, independent of
   everything else here — and §4.5's measurements confirm it: routine pre-dawn modulation
   dips well below the current trigger, so the script will call death during a normal lull.
4. **Build the archiver** (§4.4). Still worth doing as insurance against Ecowitt data loss,
   but at a normal priority rather than an emergency.
5. **Tier 1 from the archive** (§5). Establishes the validation harness without needing any
   external forecast source.
6. **Only then consider Tier 2** (§6), and only if Tiers 0–1 leave a gap worth the effort.

Explicitly **not** on this list: building an automated alarm. See §3 for why.
