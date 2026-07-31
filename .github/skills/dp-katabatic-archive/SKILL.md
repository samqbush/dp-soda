---
name: dp-katabatic-archive
description: >
  Refresh and maintain the local katabatic wind research archive for the DP Ecowitt stations,
  then re-score the prediction rule against it. Use this skill whenever the user wants to update,
  refresh, backfill, or check the state of the wind data archive — including "refresh the
  katabatic archive", "update the wind data", "run the weekly archive", "backfill the meter
  history", "how far behind is the archive", "re-run the backtest", "re-score the katabatic
  rule", "how is the wind research looking", "did we get any new rideable mornings", or any
  request to pull down recent Ecowitt history for research rather than for a go/no-go call. Also
  trigger when the user returns from travel and wants to catch the data up, asks whether they
  are losing data resolution, or asks what the archive currently says about monthly or seasonal
  wind patterns. Do NOT use this for "should I go to the lake this morning" — that is
  dp-katabatic-check.
---

# Katabatic Archive Refresh

This is the upkeep half of the katabatic research project. `dp-katabatic-check` answers *"do I
drive to the lake right now?"*. This skill answers *"is the dataset that validates that call
still healthy, and what does it say?"*

**The single most important thing to understand:** this archive is *perishable*. Ecowitt serves
5-minute history for only about 90 days and downsamples anything past roughly a year to 4-hour
rows, which are too coarse to detect a 30-minute sustained-wind event. Days not archived in time
are permanently degraded, and Ecowitt is the only source that ever had them.

**The Holfuy half is worse, and it sets the cadence.** `data/holfuy-archive/` carries ridge-top
stations Ecowitt cannot see — currently Lookout Mtn (Holfuy 1295, run by RMHPA), ~2,000 ft above
Soda and upstream of the drainage. Holfuy publishes a rolling **~5.9-day** window with no
backfill, and station 1295's archive API returns `{"error":"No access"}` because access is a flag
the station owner controls. A Holfuy day missed by a week is not coarsened, it is **gone**. That
is why this runs **daily**, not weekly. Daily also captures the feed's ~1-minute rows for the most
recent day or two before they thin to 15-minute; days are merged by timestamp, never overwritten,
so resolution only ever improves.

## Credentials — this will hard-fail without them

The archive scripts require `ECOWITT_RESEARCH_APPLICATION_KEY` and `ECOWITT_RESEARCH_API_KEY`
in `.env`, and **deliberately refuse to run on the app's `ECOWITT_*` keys.**

Ecowitt rate-limits per account, and the app keys are compiled into the shipped mobile build. A
single backfill is several hundred requests and has tripped that cap before — on the app's
account it could exhaust the shared quota and break wind data on every installed user's phone.

If the user hits that error, **do not work around it** by setting the app keys or editing the
check. Tell them to add a separate Ecowitt research token to `.env`.

Holfuy needs no credentials at all, which is why it runs first and independently.

## The command

One command does everything — status, fetch, re-label, re-score, and a summary of what changed:

```bash
node scripts/katabatic-refresh.mjs
```

Flags:
- `--check` — report archive status and fetch nothing. Use when the user only asks how far
  behind they are.
- `--days 30` — reach back further. The script already widens the window automatically to cover
  whatever gap it finds, so you rarely need this. Use it after a long trip if you want margin.

It is safe to re-run at any time. Already-archived days are skipped, so a repeat run costs
almost nothing.

To pull the ridge stations alone — useful when the user is about to lose the Holfuy window and
you do not want to wait on an Ecowitt backfill:

```bash
node scripts/archive-holfuy.mjs
```

## When to run it

**Daily is the target cadence**, driven by the Holfuy window rather than by Ecowitt. Also run it
whenever the user gets back from travel, or before any question that leans on the data ("what's
the best month", "how often does September work").

Re-running the same day is harmless but pointless for Ecowitt. It is *not* pointless for Holfuy
if the user has been away — run it immediately in that case, before anything else.

## Reading the output

**Archive status** — days held and how far behind each station is. React to the lag:

| Lag | What to say |
|---|---|
| 0–7 days | Healthy. Move on. |
| 8–30 days | Fine, but mention it is drifting. |
| 31–90 days | Warn clearly. Still recoverable at full resolution, but not for long. |
| 90+ days | **Lead with this.** Data is being permanently lost to downsampling right now. |

**Scoring** — the rule's performance against the baselines. Two things to keep straight when
reporting it:

- *Missed sessions* matter far more than *false alarms*. A miss costs the user a whole morning;
  a false alarm costs a five-minute drive. Never present them as equivalent, and never lead with
  a combined "accuracy" number — it hides the failure that actually matters.
- "Beats persistence on both axes: NO" is expected and **is not a failure**. The rule is much
  better on missed sessions and slightly worse on false alarms. Say that plainly instead of
  reporting the NO as if the rule lost.

**What changed** — new days and new rideable mornings. "No new days" is a perfectly normal
result: the archive was already current, or it is the winter shutdown.

## Things that will bite you

**The meter is off every winter.** Roughly Jan 6 – Feb 28 the station is deliberately powered
down. Those days are recorded as `unobserved`, never as calm, and are excluded from every
statistic. If the user asks why January is nearly empty, that is why — it is not a bug and not a
gap worth chasing. **Never describe a dark day as a day with no wind.**

**Ecowitt rate-limits by request rate, and reports it inside a `200 OK` response** rather than a
normal error. A day that hits the limit is deliberately not written to the archive, so a later
run retries it. If a run reports rate limiting, just wait a minute and run it again — do not
lower `--delay`.

**Never invent data.** If a fetch fails, the day stays missing. Do not fill gaps with zeros,
averages, or estimates. The entire value of this archive is that absence is recorded honestly.

**Holfuy data is not yet part of the backtest.** `data/holfuy-archive/` is pure collection —
nothing labels or scores it, because there is not enough of it yet. Do not present Lookout Mtn
numbers as validated; the honest line is "we started recording it on 2026-07-31 and have N days."
Why it is worth collecting is measured, not assumed: over 12 months, as overnight (00:00–05:00)
predictors of the 06:00–08:00 session, Soda's own meter scored AUC 0.729 while every accessible
remote substitute was worse (Golden ridge PWS 0.627, Hwy 93 RWIS 0.587, Rooney Rd RWIS 0.551),
and combining them helped nothing. Lookout is the one candidate never tested at scale, because it
is the only true ridge-top station inside the drainage.

**A day archived mid-morning used to be frozen half-written.** The archiver skipped anything
already on disk, so the day the job ran was stored with only midnight-to-run-time rows and never
completed. Completeness is now judged by whether `fetched_at` is later than the end of that local
day, so partial days are re-fetched once and then settle. A day being re-fetched that looks like
it was already there is this working as intended, not a bug.

**A daily GitHub Action also does this** (`.github/workflows/katabatic-archive.yml`, 14:00 UTC).
Note that GitHub only fires scheduled workflows on the **default branch** — while this work sits
on a feature branch the cron does not run, so the local command is the real mechanism until it
merges. Say so if the user assumes it is running automatically. **This now matters more than it
did:** on a feature branch, every day nobody runs the command locally is a Holfuy day lost.

The workflow commits and pushes on its own. When running locally, do not push anything unless
asked; offer a commit as a checkpoint rather than doing it unprompted.

## Answering questions from the archive

For monthly or seasonal questions, the findings already live in
`research/katabatic-prediction.md` §4.5a and §7.1 — read them rather than recomputing. Key
results worth having in mind:

- Best months are the shoulder months: **Sep ~50%, Mar ~45%, Oct ~42%**.
- **June is the worst month in the entire archive (~3%)** — not because it is calm, but because
  sunrise beats the 6 a.m. gate and the event is dying as you arrive.
- **78 mornings blew hard entirely before the gate opened.** In November that is more than half
  of all events.

**Always attach this caveat when quoting a monthly number: every month has only ONE year of data
behind it.** The station was created 2025-06-09, so no month has been observed twice yet. The
ordering is credible because it matches the sunrise-versus-gate mechanism, but any individual
percentage could move ±10 points. Do not present these as settled climatology.

## Related

- `dp-katabatic-check` — the live morning go/no-go call.
- `research/katabatic-prediction.md` — all findings, constants, and validation rules.
- `docs/developer-setup.md` — the underlying scripts and their gotchas.
