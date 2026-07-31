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

### 4.1 Resolution decays with age

| Age | Points per day | Effective interval |
|---|---|---|
| 0–~90 days | 288 | **5 minutes** |
| >~90 days | 48 | **30 minutes** |

Confirmed by inspecting timestamps directly: 2026-07-15 returns 04:00, 04:05, 04:10…
while 2025-10-15 returns 04:00, 04:30, 05:00…

**Ecowitt downsamples to 30-minute data after roughly 90 days.**

### 4.2 There are real gaps

Monthly probe of the 15th, points/day:

```
2026-07: 288   2026-06: 288   2026-05: 288   2026-04:  48
2026-03:  48   2026-02:   0   2026-01:   0   2025-12:  48
2025-11:  48   2025-10:  48   2025-09:  48   2025-08:  48
2025-07:   6   2025-06:   0   (device created 2025-06-09)
```

Jan–Feb 2026 is missing entirely — station outage, not retention. That removes a chunk of
**peak katabatic season**, which is the most damaging possible place to lose data.

### 4.3 Response size is capped

A 7-day request at `5min` returned 336 points, not 2016. A 31-day request at `30min`
returned 180, not 1488. Archive pulls must be **chunked per-day** and rate-limited.

### 4.4 ⚠️ Time-critical implication

Every day that passes, another day of 5-minute data silently degrades to 30-minute and the
fine structure is **permanently lost**. Onset slope, decay rate, and gust structure are
exactly what Q2 needs.

- [ ] **Start a daily archiver immediately**, before any modelling work. Pull yesterday at
      `5min` and append to local storage. This is cheap, independent of every other decision
      here, and its value only compounds. Cheapest high-value action on this list.

### 4.5 Realistic sample size

~12 months of history minus the 2-month gap ≈ **300 labeled mornings**, most at 30-minute
resolution, covering roughly **one incomplete winter**.

That is enough for a handful of physically-motivated predictors. It is **not** enough for
a many-feature ML model — seasonality means ~1 sample per calendar month. This argues
strongly for simple, interpretable rules over anything fancy.

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

- [ ] Does the ~90-day 5-minute window make winter modelling impossible until we have
      archived a full season ourselves?
- [ ] Is Soda's 2-month outage recoverable from any other source?
- [ ] Should the archive live in-app, or as a standalone job independent of app releases?
- [ ] What is the actual base rate of good mornings? Until this is known, no claim about
      predictive value means anything.
- [ ] After 30+ logged mornings: does the assistant's call beat "always drive out and look"?
      If not, the honest answer is that the tool is a convenience, not a predictor.

---

## 9. Sequencing

1. **Start the daily 5-minute archiver.** Time-critical, cheap, unblocks everything else.
   Every day of delay permanently costs resolution.
2. **Start the prediction log** (§3.2). Zero infrastructure. Nothing downstream can be
   validated without it, and it accumulates only in real time — it cannot be backfilled.
3. **Fix the `DECAYING` threshold** in `katabatic-check.mjs`. Live bug, independent of
   everything else here.
4. **Tier 1 from the archive alone** (§5). Establishes base rates and the validation harness
   without needing any external forecast source.
5. **Only then consider Tier 2** (§6), and only if Tiers 0–1 leave a gap worth the effort.

Explicitly **not** on this list: building an automated alarm. See §3 for why.
