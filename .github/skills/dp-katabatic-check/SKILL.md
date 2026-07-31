---
name: dp-katabatic-check
description: >
  Check the live DP Ecowitt wind meters (Soda Lakes, Standley West, Boulder Res) and make a
  go/no-go call on whether a katabatic (morning drainage) wind event is running and whether it
  will hold through the user's session window. Use this skill whenever the user asks about
  morning wind conditions before heading out — including "is it windy at Soda", "check the soda
  meter", "is this morning lining up", "should I go to the lake", "will it hold until 7", "is it
  katabatic this morning", "what's the wind doing", "check dawn patrol conditions", "am I going
  to get skunked", or any question about whether current or near-term wind at a Colorado DP
  station is worth driving for. Also trigger when the user mentions leaving for the lake, a dawn
  patrol session, kiting/windsurfing/foiling plans this morning, or asks whether wind will die
  before a specific time. Prefer this skill over generic weather lookups — it reads the actual
  on-site meters, not a forecast model.
---

# Katabatic Check

You are helping someone decide, in the next few minutes, whether to drive to the lake. They are
often standing in their kitchen with gear in the car. That framing drives everything below:
**be fast, commit to a call, and be honest about what the data can't tell you.** A wishy-washy
"conditions may vary" answer is worse than useless — they can read the numbers themselves.

## What a katabatic event actually is

Cold air pools on the high terrain overnight, gets dense, and drains downslope under gravity.
At Soda Lakes this arrives as a west/northwest jet, typically building after midnight, peaking
in the pre-dawn hours, and dying once the sun starts heating the slopes and destroys the
inversion that was driving it.

Two consequences matter for the call you're making:

1. **It is local.** The flow follows a specific drainage. If every station in the metro is
   blowing, that's a synoptic gradient event, not katabatic — different beast, different
   lifespan.
2. **It has a shelf life tied to sunrise.** Solar heating is what kills it. This is why "will
   it hold until 7am" is answerable at all: you're estimating how long the inversion survives.

Explaining this reasoning to the user is usually worth a sentence or two — it helps them
calibrate their own judgment on future mornings rather than depending on you.

## Step 1: Pull the data

Run the bundled script. It handles the Ecowitt API, unit correctness, station lookup, sunrise,
and neighbor cross-checks:

```bash
node .github/skills/dp-katabatic-check/scripts/katabatic-check.mjs
```

Useful flags:
- `--station "DP Standley West"` — a different meter (default is `DP Soda Lakes`)
- `--threshold 12` — the sustained speed the user actually needs (default 15)
- `--since 20:00` — pull further back, e.g. to see the full overnight build

Set `--threshold` to whatever number the user gave you. If they said "at least 15 mph", pass
`--threshold 15` so the `over-N` percentages in the output answer their actual question rather
than a generic one.

**Never fabricate readings.** If the script errors or reports no data, say so plainly and tell
the user the meter is down. A confident guess here can send someone on a wasted 45-minute drive.

## Step 2: Read the five signals

The script prints facts; you supply the judgment. Weigh these together — no single one is
decisive, and the strength of the call comes from whether they agree.

**Direction lock.** The most reliable tell. Sustained readings inside the station's ideal window
(270°–330° at Soda, perfect ~297°) with high consistency means a real drainage jet. Direction
wandering across quadrants means the flow is disorganized or already collapsing, even if the
speed number still looks fine. Treat a direction swing as an early warning that arrives before
the speed drops.

**Build shape.** A genuine event ramps over hours: a few mph late evening, steadily climbing
through the small hours. A speed spike with no build behind it is usually a passing gust front
or an outflow and won't sustain. Check the hourly trend table for the shape, and the
`Trend: BUILDING / HOLDING / DECAYING` line for where it is right now.

**Sustained level vs. the user's threshold.** Use the `Last 30 min` and `Last 60 min` rows. Pay
attention to the *range* and the `over-N` percentage, not just the average — an average of 15
that swings 8–22 is a very different session than a steady 15. If they need 15 and it's
averaging 15, say that it's marginal rather than implying comfort.

**Drying air.** Falling humidity overnight indicates the clear-sky radiative cooling that drives
drainage flow. Rising humidity or a cloud deck undercuts the mechanism, and an event running
without it is on borrowed time.

**Neighbor contrast.** If the target station is lit up and the others are calm, that confirms a
local drainage jet. If everything is blowing, reconsider — a synoptic event behaves differently
and often *doesn't* die at sunrise. If everything is calm including the target, there's nothing
to discuss.

## Step 3: Judge the session window

### First: is the park even open?

Bear Creek Lake Park gates are seasonal, and no amount of wind matters before they open.
Check this **before** analysing anything, because it can make the whole question moot:

| Months | Gate opens |
|---|---|
| May–Sep | 6:00 a.m. |
| Mar, Apr, Oct | 7:00 a.m. |
| Nov–Feb | 8:00 a.m. |

If the requested session window starts before the gate opens, say so immediately and shift
the analysis to the time they can actually be on the water. If the gate opens after the event
is likely over (see below), lead with that — it is the answer, regardless of the wind.

### Then: when does the wind end?

Anchor to sunrise, which the script reports. Measured across 14 rideable mornings at this
station, the sustained window **closes a median of ~57 minutes after sunrise** (25th
percentile +3 min, 75th +85 min), as solar heating erodes the nocturnal inversion.

Use sunrise+1hr as the default frame, then adjust with what the data actually shows: a
still-building event with a hard direction lock will run toward the long end; one with
direction starting to wander will not.

Note the interaction — in June sunrise is ~5:32 and the gate opens at 6:00, so the event may
be fading as they arrive. In September sunrise is ~6:43 against the same 6:00 gate, giving a
far longer window. Same gate hour, very different session.

Be explicit about which part of their window is solid and which part is speculative. "Solid
through 6:45, dicey after" is far more useful than a single yes or no, because it tells them
how to spend their time.

## Step 4: Deliver the call

Lead with the verdict. They may only read the first line.

Structure that works well:

1. **Verdict up front** — go / don't go / go now and hurry, in plain language.
2. **Current numbers** — a small table of the most recent readings (time, avg, gust, direction).
   Concrete numbers let them sanity-check you.
3. **Why you think it's real (or not)** — walk the signals that support the call. This is where
   direction lock, build shape, humidity, and neighbor contrast go.
4. **The window assessment** — what happens across their specific session block, and when you
   expect it to fade.
5. **Actionable advice** — anything time-sensitive. If the back half of their window is at risk,
   tell them not to dawdle at the truck.

Keep it tight. Tables beat paragraphs for numbers. Skip preamble entirely — no "I checked the
meter and here's what I found", just lead with the answer.

## Calibration example

A real run, for reference on tone and how the signals fired. At 5:49am the user asked whether
Soda would hold above 15 mph for a 6–7am session:

- Direction locked 262°–288° for 100+ minutes — inside the ideal window, not wandering.
- Clean build: ~3 mph at 3:50 → 10 by 4:15 → 14–16 sustained from 4:25 on.
- Humidity fell 63% → 44% overnight.
- Standley (1.8 mph) and Boulder Res (4.7 mph) were dead — clean local-jet confirmation.
- Sunrise 5:57.

The call was "go now, rig immediately, solid 6:00–6:45, don't burn 20 minutes at the truck,"
with the honest caveat that 14–16 mph sat *at* the 15 mph threshold rather than safely above it.

Outcome: the 6am hour averaged 16.0 mph, the 7am hour fell to 11.3, and by 8am it was 4.9 with
the direction swung to SSE. The window call was right and the caveat was warranted — worth
noting that hedging on a marginal threshold is not weakness, it's accuracy.

## Notes on the data source

Wind readings come from Ecowitt via `services/ecowittService.ts`, which the app also uses. One
sharp edge worth knowing if you ever write your own query: the Ecowitt API silently ignores
`wind_unit`, `temp_unit`, and `pressure_unit`. The real parameter names are `wind_speed_unitid`,
`temp_unitid`, and `pressure_unitid`. Passing the wrong name doesn't error — it just falls back
to defaults, which previously caused a debug script to report 33 mph when actual wind was 15.
The bundled script uses the correct names; prefer it over ad-hoc API calls.

Credentials load from the repo's `.env` (`ECOWITT_APPLICATION_KEY`, `ECOWITT_API_KEY`). If they
are missing the script exits with a clear message — relay that rather than working around it.

### Where the Soda meter physically sits

It is mounted on the **northwest point of Big Soda, between Big Soda and Little Soda**. That
placement is why the direction reading is trustworthy for this call: drainage flow arriving
from the W–NW reaches the meter before crossing the lake, so a clean 270–330° lock there
really is the canyon flow rather than a lake-surface artifact.

### The meter goes dark every winter — by design

The station runs on the **ski shop's wifi**, and the shop shuts down once Little Soda freezes.
Observed dark **2026-01-06 → 2026-02-28**, resuming 2026-03-01, and this repeats annually.

If you get no data in January or February, that is expected, not a fault. Say so plainly and
do not substitute a forecast — there is no way to know conditions remotely until it returns.
Never read missing data as calm conditions. The bundled script already detects this case and
prints the seasonal explanation.
