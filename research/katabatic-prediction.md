# Morning Katabatic Prediction — Research Plan (Soda Lakes)

**Status:** Research plan. Almost nothing here is built — the exceptions are marked 🔗 SHIPPED.
**Scope:** Soda Lakes, morning drainage-wind events only. Afternoon/thermal wind is a
different physical problem and is tracked separately in the `wind-guru` project.

### 🔗 SHIPPED markers — read this before editing a marked number

A few findings have graduated out of research and are now **operating knowledge duplicated in
`.github/skills/dp-katabatic-check/SKILL.md`** (and in one case its bundled script). They are
tagged 🔗 SHIPPED at the section that owns them.

**This document remains the source of truth. If you revise a 🔗 SHIPPED number here, you must
update SKILL.md in the same change, or the morning call will silently run on a stale value.**

Currently mirrored:

| Finding | Owned by | Mirrored in |
|---|---|---|
| Bear Creek gate-hours table | §4.5 | SKILL.md → Step 3, "is the park even open?" |
| Session ends median sunrise **+57 min** (n=14, 25th +3 / 75th +85) | §4.5 | SKILL.md → Step 3, "when does the wind end?" |
| Winter shutdown, dark 2026-01-06 → 2026-02-28, annual | §4.2 | SKILL.md → Notes; also detected by `scripts/katabatic-check.mjs` |
| Meter sits on the NW point of Big Soda | §4.2 | SKILL.md → Notes |
| `DECAYING` threshold **±3.0 mph** | §5 / A.3 | `scripts/katabatic-check.mjs` |

The reverse direction is deliberate and should stay that way: the skill carries **conclusions
only**, never derivations. Appendix A is not mirrored and should not be — see its scope note.

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

> ⚠️ **SUPERSEDED 2026-07-31 — this section's central claim was wrong.** Read §3.4 before acting
> on anything below. The manual loop is *not* the only source of labels, and treating it as such
> would have cost a month of waiting for data that already existed.

The existing manual workflow is not a limitation to engineer away — it is the **only source
of labeled prediction/outcome pairs this project has ever had**:

1. Wake at 5:30, check the Soda meter
2. Ask the assistant for a read on whether it will hold
3. **Drive out and observe what actually happened**
4. Record both the prediction and the outcome

Step 3 is the irreplaceable part. Automating steps 1–2 away would destroy the data source
that any future automation would need in order to be trustworthy.

### 3.4 Correction — the outcome is machine-observable

**The label is computable from meter history, so outcomes do not need a human at all.**

This was forced by a constraint the earlier drafts never accounted for: the user travels for
work and this is a side hobby project. He will not hand-maintain a dataset, and any design that
requires it is dead on arrival. Asked directly, he was unambiguous:

> *"I am not going to manually verify every day for 30 days… I am not going to manually add data
> all the time."*

That constraint turned out to be liberating rather than limiting:

1. **Outcomes auto-fill.** "Did it sustain ≥15 mph for ≥30 continuous minutes after gate-open"
   is a pure function of archived readings. §5 already conceded Tier 1 *"needs only historical
   meter data"* — the same is true of the label itself.
2. **§3.3's 30-morning gate is satisfiable today.** ~420 station-days of Soda history already
   exist. We replay them (§7.1) instead of waiting a month for 30 new ones.
3. **The prediction log is no longer time-sensitive.** The claim that it "accumulates only in
   real time — it cannot be backfilled" (§9 item 2) is false for every machine-derived column.

**What genuinely cannot be auto-derived** is the nuance the meter cannot see: whether it was
*actually* rideable — chop, launch-relative direction, lake ice, gear mismatch. The dawn patrol
group chat was considered as a proxy and rejected by the user as too noisy to be worth wiring
up. So this stays an *optional, opportunistic* note (`human_note` in the log) and **nothing in
the pipeline may block on it.**

**What this does NOT change:** the rejection of an automated alarm at the top of §3 still
stands, for exactly the reasons given there. Automating *scoring* is not automating the
*decision*. The human still makes the call.


### 3.2 Prediction log

> 🔗 **SHIPPED** — schema in `scripts/lib/prediction-log.mjs`, written to
> `research/prediction-log.csv` by `scripts/backtest-katabatic.mjs`. Populated by machine, not
> by hand (§3.4).

**Research tasks:**
- [x] ~~Define a prediction log format~~ → `LOG_COLUMNS` in `scripts/lib/prediction-log.mjs`.
      Carries the call-time features, the verdict, and the auto-derived outcome.
- [x] ~~Decide where it lives~~ → `research/prediction-log.csv`, committed.
- [x] ~~Have the skill emit a copy-pasteable log line~~ → superseded by something better: the
      `--log` flag appends the row directly, and the daily workflow fills the outcome.
- [x] ~~Record outcomes even on mornings the call was "don't bother"~~ → now automatic, and this
      turned out to be the single biggest win. These rows were called *"the most valuable in the
      dataset"* because they are the only way to detect false negatives, yet they were precisely
      the ones a human would never remember to record. The machine records every morning
      regardless of what the call was.

One field could not be automated: `human_note`, for whether it was *actually* rideable. It is
optional and nothing depends on it (§3.4).

### 3.3 Exit criteria

> ⚠️ **The 30-morning wait no longer applies** — see §3.4. These questions are answerable now,
> from ~420 archived station-days, and §7.1 answers them. The criteria themselves are unchanged
> and still the right ones; only the assumption that they required a month of waiting was wrong.

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

### 4.2 The winter gap is a deliberate seasonal shutdown, not an outage

> 🔗 **SHIPPED** — the dark-window dates and the meter's physical placement are mirrored in
> `SKILL.md` ("Notes on the data source") and the dark-window detection lives in
> `scripts/katabatic-check.mjs`. Revise them together.

Monthly probe of the 15th, points/day:

```
2026-07: 288   2026-06: 288   2026-05: 288   2026-04:  48
2026-03:  48   2026-02:   0   2026-01:   0   2025-12:  48
2025-11:  48   2025-10:  48   2025-09:  48   2025-08:  48
2025-07:   6   2025-06:   0   (device created 2025-06-09)
```

Day-by-day probe across 2025-11-01 → 2026-05-10 (191 days, retried to separate genuine
empty responses from API errors) pins the boundaries precisely:

| Month | Days with data | Median pts/day |
|---|---|---|
| 2025-11 | 29 / 30 | 48 |
| 2025-12 | 30 / 30 | 48 |
| **2026-01** | **3 / 29** | dark from Jan 6 |
| **2026-02** | **0 / 27** | dark all month |
| 2026-03 | 30 / 30 | 48 |
| 2026-04 | 28 / 28 | 48 |
| 2026-05 | 8 / 8 | 288 |

> **Dark: 2026-01-06 → 2026-02-28 (~54 days). Data resumes 2026-03-01.**

**Why.** The meter sits on the northwest point of Big Soda, between Big Soda and Little Soda,
and it uses the ski shop's wifi. The shop shuts down once Little Soda freezes over, so the
meter goes dark for the winter. **This is deliberate, recurring, and will happen every year.**

Three consequences that matter more than the gap itself:

1. **It is not recoverable from anywhere.** The data was never transmitted, so there is no
   archive, no backfill, no alternate source. Stop looking. (This closes an earlier open
   question that assumed a station fault might be recoverable.)
2. **Absence of data must never be read as absence of wind.** Any archiver or model has to
   treat the winter gap as *unobserved*, not as calm. Silently averaging zeros into a winter
   baseline would produce exactly the kind of confidently-wrong output this project must avoid.
   The archiver must also not alert on it as a failure.
3. **The shutdown/restart dates are a free freeze/thaw proxy.** The meter going dark is a
   reasonable proxy for "Little Soda has frozen," and its return for the thaw. That partially
   answers the lake-ice open question in §4.5 without any new data source.

**Decision impact is small.** An earlier draft called this "the most damaging possible place
to lose data" because Dec–Feb is peak katabatic season. That was wrong — it ignored park
access (§4.5). The gate does not open until 8 a.m. in Nov–Feb, and by 8 a.m. in Dec/Jan the
event is reliably over, so those mornings are unrideable regardless of what the wind did.

**And crucially, November and December are fully covered** (29/30 and 30/30 days). The §4.5
hypothesis that November may still be sessionable is therefore **testable right now from
existing history** — it does not need a season of new data collection.

- [ ] Test the November hypothesis against Nov–Dec 2025 data. Cheapest open item on this list.

### 4.3 Response size is capped — and so is the call rate

A 7-day request at `5min` returned 336 points, not 2016. A 31-day request at `30min`
returned 180, not 1488. Archive pulls must be **chunked per-day** and rate-limited.

`cycle_type` accepts `5min` / `30min` / `auto`; `240min` errors with 40015.

> 🔗 **SHIPPED** — both caps are handled in `scripts/archive-ecowitt.mjs`.

**There is also an undocumented call-rate cap** (discovered 2026-07-31, during the first full
backfill). At ~3 requests/second the API began returning:

```
The number of interface accesses reached the upper limit
```

Two things make this more dangerous than it looks:

1. **It arrives as `code != 0` in a 200 response, not an HTTP 429.** A naive client reads the
   body, finds no wind data, and concludes the station reported nothing — which would then be
   archived as absence. Given §4.2, that is the exact failure this project must never make.
   `isRateLimitMessage()` in `scripts/lib/ecowitt.mjs` separates the two, and rate-limited days
   are **not written to the archive at all** so a later re-run retries them.
2. **Retrying with exponential backoff does not help** — a rate cap needs a real cooldown, and
   burning three fast retries against it just deepens the hole. The archiver waits ~65s, and if
   still capped it stops cleanly; the archive is idempotent so a re-run resumes.

Practical rate: **~1.2s between requests** completed a ~420-day station backfill without
tripping the cap.

### 4.3a Boulder Res has almost no history

Device creation times, read from `device/list` on 2026-07-31:

| Station | Created | Usable history |
|---|---|---|
| DP Standley West | 2025-05-19 | ~14 months |
| DP Soda Lakes | 2025-06-09 | ~14 months |
| **DP Boulder Res** | **2026-07-14** | **~2 weeks** |

This materially weakens the station-correlation question in §8 — with a fortnight of overlap,
Boulder Res cannot support any seasonal claim, and the neighbour-contrast signal in `SKILL.md`
effectively rests on Standley West alone for anything before July 2026. Any correlation result
involving Boulder Res should be reported with its `n` attached and treated as provisional.

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

> 🔗 **SHIPPED** — the gate-hours table and the "+57 min after sunrise" session close are
> mirrored in `SKILL.md` (Step 3). Both are load-bearing for the live go/no-go call; revise
> them together. The seasonal-window table below and the shoulder-season hypotheses are
> **not** shipped and should stay research until logged mornings test them.

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

> 🔗 **SHIPPED (partially)** — the **±3.0 mph `DECAYING` threshold** is live in
> `scripts/katabatic-check.mjs`, and "direction rotation is not by itself decay" is stated in
> `SKILL.md` (Step 2, "Direction lock"). Everything else in this section is still open.

The old heuristic was "katabatic typically persists 45–90 minutes past sunrise." That has now
been **replaced by a measurement** (§4.5): across 14 rideable mornings the sustained window
closes a **median +57 min after sunrise** (25th +3, 75th +85). The rule of thumb was roughly
right but the spread is wide, and the spread is the actionable part.

**`DECAYING` threshold — fixed, and the physics and the data agree.** The script previously
flagged decay on a ±1.5 mph swing. Poulos et al. (2007) predicts **1–3 m/s (2–7 mph)
modulation on ~1-hour timescales as expected signal, not decay** (Appendix A.3).

Independently, the measured **median peak-to-lull spread inside a single hour at this station
is 5.6 mph** — squarely inside the MKI band, from data rather than literature. Two independent
lines agreeing is about as much confidence as this project is going to get, so the threshold is
now **±3.0 mph**.

This bug also announced itself during analysis: a first attempt to measure "when does the event
die," defined as the first drop below 60% of the pre-dawn peak, returned nonsense — most
mornings appeared to die ~59 minutes *before* sunrise. That was routine modulation tripping
exactly the kind of tight threshold the script was using. Good illustration of why the error
direction matters: the tight band talks the user out of a session that is still running.

Two further consequences from the same physics, both of which bear on how the check is written:

- There is a **second, microscale variability band at O(1 minute)** from wave breaking aloft.
  Any short-window trend computed on 5-minute data is partly sampling that band. Trend
  detection needs a window comfortably longer than an hour, not three consecutive points.
- A **wind-direction shift is not by itself evidence of decay.** On the Poulos case night the
  BAO direction ran easterly → westerly at onset → N/NE by 0400 MST while the drainage was
  still running (Appendix A.4). Direction rotation over the course of a morning is expected.

**Research tasks:**
- [x] ~~Extract decay-time distribution relative to sunrise~~ → §4.5, median +57 min (n=14)
- [x] ~~Re-derive the `DECAYING` threshold empirically instead of guessing~~ → ±3.0 mph
- [ ] Test whether decay time correlates with event strength, onset time, or date/season.
      The +57 min figure is summer-only; seasonal dependence is the obvious next question and
      matters directly for the shoulder-season hypothesis in §4.5.
- [ ] Quantify: given it is X mph at 5:30, what is P(still ≥15 at 7:00)? This is directly
      the question being asked, and it is answerable from the archive alone with no forecast

Note this tier also needs **only historical meter data** — no external forecast source.

---

## 6. Tier 2 — Q3, the night-before call

The only tier that is genuinely a forecasting problem, and the only one that needs external data.

### 6.1 Candidate predictors

Derived from `wind-guru/docs/katabatic-winds-reference.md`, summarised in Appendix A. Which
of these matter is an **empirical question** — the point is to test, not assume:

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

**But do not assume "more wind aloft → more wind at Soda."** The relationship is non-monotonic
(Appendix A.2). Stronger flow over the Divide drives mountain waves that *weaken* the surface
jet by deepening the katabatic layer and shrinking its temperature deficit, and at high enough
Froude number scour the drainage off the slopes entirely. Any predictor built on 700mb wind
speed should be allowed a **non-linear or bucketed** response rather than a single sign.

**Chinook contamination is a live labelling risk.** A strong westerly downslope event is *not*
katabatic (Appendix A.1) but will produce a 15+ mph westerly reading at Soda that the binary
label in §7 happily counts as a positive. In the Nov–Mar window especially, some fraction of
labelled positives may be chinook, which has entirely different predictors. Worth checking
whether positives separate cleanly on temperature trend — katabatic events cool overnight,
chinooks warm sharply.

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

1. **Define one binary label.** ~~Proposal: did Soda sustain ≥15 mph for ≥30 continuous minutes
   between 05:00 and 08:00?~~ **Amended before use** — the fixed label is: *did Soda sustain
   ≥15 mph for ≥30 continuous minutes, entirely after that month's gate-open time (§4.5) and
   within sunrise+3h?* Two corrections to the original proposal, both load-bearing:
   - **Gate at the front.** A fixed 05:00–08:00 window counts mornings the user physically
     could not reach — Nov–Feb the gate does not open until 08:00. 78 archived mornings blew
     well *before* the gate opened; scoring those as wins would flatter every downstream number.
   - **sunrise+3h at the back.** Without a back edge the scan runs into the afternoon thermal,
     a different physical phenomenon (tracked in the separate `wind-guru` project). This was
     not theoretical: the first implementation reported a 46.4% base rate against §4.6's
     documented ~13–20%, entirely from afternoon contamination.

   Implemented once in `scripts/lib/label.mjs` and imported everywhere, so it cannot drift.
   Unobserved days return `null`, never `false` (§4.2).
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

## 7.1 RESULT — the backtest, and what it says we are actually predicting

> 🔗 **SHIPPED** — `scripts/backtest-katabatic.mjs` (replay) and `scripts/score-backtest.mjs`
> (scoring). Run date 2026-07-31. Reproduce with:
> `node scripts/backtest-katabatic.mjs && node scripts/score-backtest.mjs --call-time 06:30`

This section exists because of a direct challenge from the user, and it deserves to be recorded
verbatim because it turned out to be correct:

> *"I'm honestly not sure what we should do with this. I mean what are we actually predicting?
> It seems to me you are just checking the dp-soda meter and looking at consistency, which is
> what I am waking up and doing."*

**He was right.** The measured answer is below.

### Method

The `SKILL.md` go/no-go logic was transcribed into a deterministic function
(`scripts/lib/call-rule.mjs`) — **a transcription, not a fit**. No weight was tuned against the
archive, so this first backtest is genuinely out-of-sample. It was replayed over 311 archived
mornings at nine call times (05:00–07:00), scored against the gate-conditioned label (§7 rule 1,
as amended), using **only readings available at the call time**. Leakage would make the rule look
better than reality, so the barrier is a single function guarded by four explicit tests.

### Headline (call time 06:30, n=307, base rate 29.6%)

| Strategy | Missed sessions | False alarms | Precision |
|---|---|---|---|
| always go | **0.0%** | 100.0% | 29.6% |
| never go | 100.0% | **0.0%** | n/a |
| persistence (same as yesterday) | 56.8% | 24.3% | 42.2% |
| **call rule v1** | **20.9%** | **29.2%** | **53.3%** |

Against persistence the rule is dramatically better on the axis §2 says matters — 20.9% vs 56.8%
missed — at a slightly worse false-alarm rate. Per §2's asymmetry (a miss costs a session, a
false alarm costs a five-minute drive) the rule clearly dominates persistence in expected cost,
even though the scorer's strict "better on both axes" test prints NO.

### The finding that actually matters — skill collapses with lead time

Restricting to rideable mornings and bucketing by how far ahead of the park gate the call was made:

| Lead time from call to gate open | n | Missed sessions |
|---|---|---|
| Gate already open (call inside the window) | 37 | **0.0%** |
| 0–60 min ahead | 36 | 27.8% |
| 90+ min ahead | 18 | **50.0%** |

Monotonic, and unambiguous:

**The rule is a very good *measurement* and a poor *forecast*.** When it can observe the window
it is judging, it misses nothing. Asked to project 90 minutes forward, it is a coin flip.

That is the honest answer to *"what are we actually predicting?"* — **at present, largely
nothing beyond what the meter already shows.** This is §1's own claim, now measured rather than
asserted, and it confirms the user's suspicion exactly.

### Same result, seen seasonally

| Season | n | Rideable | Missed | False alarm |
|---|---|---|---|---|
| Warm (Apr–Sep) | 184 | 46 | **4.3%** | 30.4% |
| Cool (Oct–Mar) | 123 | 45 | **37.8%** | 21.8% |

This is not a different finding — it is the same one. Nov–Feb the gate opens at 08:00 (§4.5), so
a 06:30 call is forced to forecast 90+ minutes ahead. Warm months open at 05:00–06:00, where the
call sits inside the window. **Season is a proxy for lead time, not an independent effect.**

Chinook contamination (§6.2) was checked first, per the label-poisoning concern: only 5 of 45
cool-season positives show the >15 °F warming signature (2025-10-19, 2025-11-19, 2025-12-14,
2026-03-07, 2026-03-12). Real, but far too few to explain 17 missed mornings. Lead time does.

### What ships, and what does not

Applying §7 rule 6 honestly — this is a **partial** pass, so only the part that earned it ships:

- ✅ **Ship the call at zero/short lead** (gate open, or <60 min out). 0% missed at n=37.
- ❌ **Do not ship a suppressing call at 90+ min lead.** At 50% missed it is worse than useless:
  it would talk the user out of one session in two while sounding confident. Report *"too early
  to tell — check again closer to gate open"* and let the meter decide.
- ⏸️ **P(hold) (§5) is not yet justified.** It is the same 90-min-ahead extrapolation that just
  failed. Revisit only with a signal that leads the wind rather than describing it.

### What would actually add forecast skill

The backtest says the ceiling on meter-only prediction has been reached — the remaining error is
not in the rule's weights, it is in the absence of any variable that *leads* the surface wind.
That means §5's Tier 2/3 (synoptic gradient, 700 mb flow, soil moisture) is no longer optional
polish; it is the only route to answering Q2. Tuning `call-rule.mjs` further would be fitting
noise on 91 positives (§4.7).

---

## 8. Open questions

- [ ] Should the archive live in-app, or as a standalone job independent of app releases?
      It must tolerate the annual winter shutdown (§4.2) without alerting or backfilling zeros.
- [ ] **Do the shoulder months actually work?** §4.5 predicts Sep/Oct are the best of the
      year and Nov is still viable. This contradicts the current working assumption that the
      season ends when the gate moves to 8 a.m. Cheap to test, potentially adds months.
- [ ] Does lake ice close the shoulder season independently of gate hours? Partially answered
      by §4.2 — the meter's winter shutdown tracks Little Soda freezing (dark Jan 6 – Feb 28),
      which suggests open water through December and from about March.
- [ ] Does the +57 min "session end vs. sunrise" figure hold outside June–July? It is measured
      from summer only, and winter inversions may behave differently.
- [ ] **Are Soda, Standley West and Boulder Res actually correlated?** Appendix A.4: adjacent
      Front Range canyons behaved differently on the same night in ASCOT. If the correlation is
      weak, the other two stations are not evidence about Soda and nothing should imply they
      are. Answerable from the archive alone.
- [ ] Do any labelled positives look like chinook rather than katabatic (Appendix A.1)? Check
      whether overnight temperature trend separates them — katabatic cools, chinook warms.
- [ ] After 30+ logged mornings: does the assistant's call beat "always drive out and look"?
      If not, the honest answer is that the tool is a convenience, not a predictor.

Answered since first draft:
- ~~Is the winter gap recoverable from another source?~~ → §4.2: no. It is a deliberate
  seasonal wifi shutdown; the data was never transmitted and does not exist anywhere.
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
3. ~~**Fix the `DECAYING` threshold**~~ — **done.** Widened ±1.5 → ±3.0 mph, confirmed by
   both MKI's 1–3 m/s modulation band and a measured 5.6 mph median intra-hour spread (§5).
4. **Build the archiver** (§4.4). Still worth doing as insurance against Ecowitt data loss,
   but at a normal priority rather than an emergency.
5. **Tier 1 from the archive** (§5). Establishes the validation harness without needing any
   external forecast source.
6. **Only then consider Tier 2** (§6), and only if Tiers 0–1 leave a gap worth the effort.

Explicitly **not** on this list: building an automated alarm. See §3 for why.

---

## Appendix A — Physics carried over from the `wind-guru` reference

> **Scope note — deliberately not mirrored into the skill.** This appendix is the *derivation*
> layer: it exists so the numbers elsewhere in this document can be justified and re-derived.
> `SKILL.md` carries only the conclusions that change a morning call (±3.0 mph modulation band,
> direction rotation ≠ decay, sunrise-driven breakdown) and should never absorb the reasoning
> behind them — the skill is loaded while someone stands in their kitchen with gear in the car.
> If a finding here starts changing live behaviour, promote the **one-line conclusion** and tag
> the owning section 🔗 SHIPPED rather than copying the physics across.

Condensed from `~/Code/wind-guru/docs/katabatic-winds-reference.md`, which is the fuller
treatment (definitions, full literature table, ASCOT case-night detail). Repeated here so this
document is self-contained and the same ground does not get re-covered. **Primary source for
the Front Range material: Poulos, Bossert, McKee & Pielke Sr. 2007, *J. Atmos. Sci.* 64,
1857–1879 — the "MKI" paper (Part I: Poulos et al. 2000, *JAS* 57, 1919–1936).** Treat it as
authoritative; a co-author is a neighbour.

### A.1 Definition — use the narrow one

Two definitions of "katabatic" are in circulation and it is the biggest source of confusion:

- **Broad/classical:** any downslope wind, including foehn/chinook.
- **Narrow/modern operational:** only **cold, negatively buoyant, gravity-driven drainage
  flow**. **Use this one.** Under it a chinook is *not* katabatic — it warms by adiabatic
  compression and is dynamically, not buoyancy, driven.

Formation chain: clear sky → longwave radiative cooling of the surface → slope-adjacent air
cools → density rises → negative buoyancy → downslope acceleration → pooling in valley bottoms
and on the plains. Required ingredients: elevated cold source, clear sky, dry air (limits
longwave trapping), weak-or-reinforcing synoptic gradient, and a slope with a drainage path.

Magnitude is set by the **temperature deficit of the drainage layer relative to free air at the
same altitude** and by the **surface pressure-gradient force**. Depth of the cold layer ≈ depth
of the katabatic layer. Onset after sunset, strongest pre-dawn, breaks down after sunrise as the
slope warms and the flow reverses to anabatic — which is the physical basis of the measured
"+57 min past sunrise" close in §4.5.

### A.2 MKI — mountain waves change everything (the key finding)

On the Front Range, terrain-forced mountain waves and katabatic drainage **coexist on most
clear nights with westerly flow aloft**, and near the surface they are often "inseparable and
indistinguishable." Two interaction mechanisms:

**Turbulence/mixing.** Katabatic flow normally needs strong surface stratification
(**dθ/dz > 10 K/km**). A mountain wave makes that stratification weaker and deeper, so the
katabatic layer is **deeper but its temperature contrast is smaller** → **slower jet, sitting
higher up**. Strong enough wave momentum **scours** the drainage layer off the upper slopes
entirely, down to the wave separation point. **Higher Froude number → scouring reaches farther
downslope.**

**Why this is good news for Soda.** For **0.40 < Fr < 1.0** the upper slopes scour but flow
below the separation point stays quiescent enough for katabatic flow to form. Even at Fr ≈ 1.0,
low-elevation drainage can survive if surface cooling builds stratification strong enough to
block wave penetration. Soda sits at the mountain–plains interface, i.e. **on the favourable
side of the separation point** — upper-slope scouring does not imply a dead morning here.

Case-night reference values: Fr = U/(NH) ≈ **0.45** with H = 2000 m (nonlinear wave regime);
geostrophic flow **319° at 8.6 m/s**; stability in the 2–4 km MSL layer **1.6 → 1.0 K/km**
overnight. Front Range terrain-wave vertical wavelength ≈ **4 km**.

### A.3 Two variability timescales — expect them, do not call them decay

Waves aloft perturb **surface pressure by O(1 hPa)**. Because katabatic flow is
pressure-gradient driven, wave structure thousands of metres overhead modulates surface speed:

| Band | Timescale | Amplitude | Cause |
|---|---|---|---|
| Meso-β | **O(1 hour)** | **1–3 m/s (2–7 mph)** | mountain-wave system evolution |
| Microscale | **O(1 minute)** | — | wave breaking aloft |

Poulos et al.'s own framing: "a far more variable stable nocturnal boundary layer in complex
terrain than has been generally understood to exist." **Swings of 2–7 mph on the hour scale are
expected signal, not instrument error and not the event dying.** This is the direct basis for
the `DECAYING` threshold bug in §5.

### A.4 Do not generalise across stations

The ASCOT network found the timing of the overnight wind shift **highly variable canyon to
canyon** — Eldorado and Coal Creek, a short distance apart, behaved differently on the same
night, with low-level Coal Creek staying continuously westerly while BAO rotated easterly →
westerly → N/NE by 0400 MST.

**Consequence for the multi-station check (Soda / Standley West / Boulder Res):** these drain
different canyons and **must not be assumed correlated**. Whether one leads or predicts another
is an empirical question the archive can answer — and if the answer is "weakly," the other
stations are not useful evidence about Soda and should not be presented as if they were.

Corollary: flow aloft is **not** background detail. It sets katabatic depth, speed, and whether
the flow exists at all on the upper slopes.

### A.5 Quick-reference numbers

| Quantity | Value | Source |
|---|---|---|
| Typical gentle/pure katabatic speed | 1–4 m/s (2–9 mph) | general |
| Front Range near-surface, lowest 10 m, case night | 2–5 m/s | ASCOT 4 Sep 1993 |
| Katabatic jet depth | ~400 m AGL | Banta et al. 1995 |
| Stratification needed to support katabatic flow | dθ/dz > 10 K/km | Poulos et al. 2007 |
| Case-night Froude number | ~0.45 | nonlinear wave regime |
| Fr with upper-slope scouring but surviving low-level drainage | 0.40 < Fr < 1.0 | Poulos et al. 2007 |
| Wave-induced surface pressure perturbation | O(1 hPa) | Poulos et al. 2007 |
| Resulting katabatic speed modulation | 1–3 m/s over O(1 h) | Poulos et al. 2007 |
| Microscale oscillation timescale | O(1 min) | wave breaking |
| Front Range terrain wave vertical wavelength | ~4 km | Lee et al. 1989 |

### A.6 Fetching the sources

The AMS site **403s plain fetchers**. Use `curl -A "Mozilla/5.0 ..."` or the playwright-cli
fallback. Same pattern as the Lakewood parks site in §4.5. Other directly on-topic references,
should Tier 2 ever need them: **Coulter & Gudiksen 1995**, *J. Appl. Meteor.* 34, 1419–1429,
"The dependence of canyon winds on surface cooling and external forcing in Colorado's Front
Range"; **Banta et al. 1995**, *Theor. Appl. Climatol.* 52, 27–42 (canyon flows over the
adjacent plains); **Durran 1990**, *Meteor. Monogr.* 45, 59–81 (mountain waves and downslope
winds — the standard reference).
