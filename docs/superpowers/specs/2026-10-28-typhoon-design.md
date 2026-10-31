# Typhoon design

Date: 2026-10-28
Status: draft for Ed's approval

## Intent

Ed rides a Wattbike Pro/Trainer on the David Lloyd gym floor instead of
attending the club's Cyclone studio class. Typhoon puts a Cyclone-style
class on his phone: a power-zone ride plan driven by the bike's live
watts. Music plays from whatever Ed already has in his ears. Typhoon
does not connect to Spotify or play tracks itself.

Cyclone is David Lloyd's power-based indoor cycling class, built on
Stages Studio software. The parts that matter to this app: each rider has
an FTP (functional threshold power), rides are interval plans where each
interval targets one of seven colour zones expressed as a percentage of
FTP, a studio screen shows the plan as a coloured timeline and each
rider's live effort against the current target, and a short in-class
test sets or resets FTP. Ed already rides virtual (screen-led) Cyclone
classes with his own music in his ears, so no instructor voice or
coaching text is being replaced.

## Goals

- Run a complete 30 or 45 minute Cyclone-style ride from the phone,
  reading live power and cadence from the Wattbike over Bluetooth.
- A library of distinct rides spanning moderate to brutal, with real
  variety of interval shapes inside each ride.
- A ride screen that looks designed, not defaulted. Ed named this as the
  thing that would make him wince if wrong.
- FTP stored on the phone with an in-app test to set it.
- A post-ride summary and a history that builds up over weeks.

## Non-goals

- No accounts, no backend, no sync between devices.
- No video, no heart rate, no instructor voice, no coaching text, no
  riding-position cues (Ed always rides seated).
- No in-app music, playlist, or Spotify connection. Ed brings his own
  music.
- No cadence targets shown on screen while Bluetooth is on. Cadence is
  Ed's choice. With Bluetooth off, the ride screen shows a target rpm
  for the current zone.
- No iPhone support. Web Bluetooth is not available in Safari and Ed's
  phone is Android.
- No per-user scaling of rides by a difficulty "dial". Difficulty is a
  property of each ride, not a multiplier.
- No named blocks or sections inside a ride. Ed found that too
  regimented; a ride is a flat list of intervals.

## Anti-goals

- A ride screen that looks like a default component library.
- A ride library where every ride is a few long steady blocks. Short
  sprints, stepped ramps, pyramids, over/unders and surges inside a
  longer effort must all appear.

## Constraints

- Phone: Android, Chrome. Landscape, mounted above the Wattbike monitor.
- Bike: Wattbike Pro/Trainer with a Performance Monitor. The Model B
  monitor broadcasts Bluetooth; Bluetooth is enabled on the monitor at
  `Settings > Remote > Bluetooth On` and the bike advertises as
  `WattbikePM<serial>`. Ed will confirm the gym's monitors are Model B
  (Bluetooth icon on the sticker on the back). The monitor is a standard
  Bluetooth power meter to third-party apps (Zwift, TrainerRoad, Rouvy
  all pair with it as a power source), so the app pairs through the
  Cycling Power Service and reads the Cycling Power Measurement
  characteristic for watts and crank cadence. Resistance is manual (two
  levers); the app never controls the bike.
- Speed and distance: the Wattbike monitor derives speed from power. If
  the broadcast carries no wheel data, the app derives mph from watts
  using the same kind of power-to-speed curve, so figures will be close
  to the monitor's but not guaranteed identical. Units are mph and miles.
- Hosting: GitHub Pages for this repo. HTTPS is required for Web
  Bluetooth. A GitHub Action builds and deploys on every push to main.
- Stack: Vite, plain TypeScript, no UI framework. Ed asked for something
  lighter than his usual Next starter. Ed's guardrails still apply (one
  function per file, `@/` imports, explicit return types, verbose and
  explicit style, no barrel files).
- Storage: FTP, settings, and ride history live in the browser's local
  storage on the phone. Older blobs may still contain Spotify client id,
  playlist id, a music toggle, `typhoon.spotifyAuth.v2`, or
  `typhoon.tempoCache`. The app ignores those keys and does not throw.

## What Ed decided

### Rides

- Lengths: 30 and 45 minutes only.
- Difficulty: five grades, Gentle, Easy, Moderate, Hard, Very hard
  (stored as 1 to 5). Ed's second normalisation on 2026-10-31 ("Easy
  is not easy enough, Moderate is too hard, Hard is too hard, Very
  hard is too hard, Brutal is next to impossible") brought every grade
  down again and capped effort lengths: Gentle never leaves zone 4 and
  its orange kicks are 20 s or less; Easy adds red bursts of 20 s or
  less; Moderate allows red to 30 s and dark red to 15 s, no purple;
  Hard allows red to 45 s, dark red to 20 s, purple to 10 s; Very hard
  allows red to 60 s, dark red to 30 s, purple to 15 s. The FTP test
  effort is the one exemption. Share of the ride at zone 4+ by grade,
  roughly: Gentle 10%, Easy 18%, Moderate 27%, Hard 36%, Very hard 40%.
  Mean intensity, zone 4+ and zone 5+ time rise with every grade, and
  every Very hard ride has more zone 4+ time than any Gentle ride.
- Every ride is written by hand, the way an instructor builds a
  class: one concept per ride (a climb with hairpins that close in,
  pops of red that never come in the same size twice, three summits
  of which two are false), song-length tracks of different shapes
  and lengths, sets that grow or shrink rather than repeat, and
  recoveries that vary from 30 s to two minutes, some of them green
  or yellow. Durations are musical: 10, 15, 20, 30, 45, 60, 90 s.
  Even the top grade keeps a third of a 45 minute class at zone 3 or
  below.
- No ride is derived from another by scaling.
- A ride is a flat ordered list of intervals. Each interval is a target
  zone (1 to 7) and a duration in seconds. No names, no blocks, no
  cadence, no position.
- Interval shapes must vary within a ride: short sprints (10 to 30 s),
  stepped ramps (zone 2, 3, 4, 5 in succession), pyramids, over/unders
  (alternating zone 4 and zone 5 at 30 to 60 s each), surges (a short
  zone 6 inside a zone 3 block), as well as long steady blocks. Rides
  follow the Cyclone archetypes: climbs, time trials, HIIT, under/over
  threshold, endurance, and a "mash up" of several.
- Every ride opens with a 45 to 90 s zone 1 spin and a warm-up that
  ends inside four minutes from the start: a ladder, a pyramid, tempo
  pulls or a couple of short sprints, never a plain green block (Ed,
  2026-10-29). Hard work in that window is 45 s at most. Rides end
  with a fixed 2:00 cool-down in zone 1, after a roll-down block.
- The library list shows each ride's shape under its name, with History
  and Settings as icons in the top right.

### Zones and FTP

Seven zones as percentages of FTP, as Ed reads them off the Cyclone
screen (final word, 2026-10-29):

| Zone | % of FTP | Colour |
|---|---|---|
| 1 | 0 to 55 | blue |
| 2 | 55 to 75 | green |
| 3 | 76 to 90 | yellow |
| 4 | 91 to 110 | orange |
| 5 | 111 to 125 | red |
| 6 | 126 to 150 | dark red |
| 7 | 151 and up | purple |

Rides are written in these zones: the spin and cool-down are zone 1,
every rest after zone 4 or harder work is zone 1 (blue: Ed,
2026-10-29, "green is not a rest zone"), green appears sparingly as
active easy riding after zone 3 or as a warm-up step, threshold work
is zone 4, and zone 7 sprints are 30 s or less.

- FTP is stored on the phone. Default is 150 W when none has been set
  (Cyclone's own default for riders without one).
- FTP test: baked into some rides rather than a separate ride (Ed,
  2026-10-29). Six rides carry one: a 1, 3 or 5 minute all-out seated
  effort off a fresh lead-in, followed by an easy recovery, in each ride
  length. The library marks them "N min FTP test". FTP is set to 70, 80
  or 85 percent of the average power over the test interval
  respectively. Ed confirms the new value before it is saved.

### The ride screen (Ed chose this from mockups)

Landscape. Three bands:

1. **Top band**: the quiet ghost buttons on the right, in the order
   Test, Connect bike, Start before the ride and Pause, End ride during
   it. The ride name is not shown on the ride screen. There is no track
   row.
2. **Middle band, the main event**: the ride profile drawn as bars, one
   per interval, width proportional to duration and height proportional
   to zone out of the ride's own hardest zone, so the tallest bar always
   meets the top of the band and an easy ride has no empty strip above
   it (Ed, 2026-10-31). Bike toasts float over the band, fixed under the
   controls, and never push it down. Height proportional
   to zone. A white vertical line moves along the profile at the current
   position and the ridden part behind it is slightly masked. No effort
   dot and no zone label: the watts figure and the countdown colour
   carry that.
3. **Bottom band**: one small stats strip of seven equal-width cells
   with centred text. Percent of FTP (coloured by the zone actually
   being ridden), watts, rpm, mph, average mph,
   miles, time left in the current interval (uncoloured), time
   remaining in the ride.

No gauge and no text cues. With Bluetooth on there is no cadence target.
With Bluetooth off the bottom band shows the target rpm for the zone.

Test mode: the Test button runs the ride without a bike at 4x speed with
simulated watts and rpm inside each zone's band. Test rides are never
saved. Styling is a first-class requirement: dark, legible from the
saddle, designed rather than defaulted. Use the frontend-design skill
for the visual pass.

Confirming End ride keeps the ride screen as it was at that moment, line
and mask frozen, with a Done button in place of End ride that leads to
the summary (Ed, 2026-10-29). Only a ride that runs to its end moves on
by itself.

Pause (Ed, 2026-10-30) freezes the ride clock, the line and the stats.
The button reads Resume until tapped again, when the ride carries on
from the same point. Paused time is not ridden time: it is cut from the
clock, not counted.

### After the ride

- Summary: duration, average watts, max watts, distance, average mph,
  time in each zone, FTP used.
- Saved to local storage with the ride name, difficulty and date. A
  history screen lists past rides newest first.

### Settings

- FTP (editable by hand as well as by test), nested under Bluetooth.
- Bluetooth on or off. Off hides FTP, the bike name, and Save, and the
  ride runs without a bike.
- Bike name, read only, filled when a bike is paired.

## Calls made after the builder check

These came from a reviewer reading the document as the builder. Each is
my call, not Ed's; Ed can overrule any of them.

- **Pairing takes one tap per ride.** Web Bluetooth needs a user gesture
  to open the device picker. "Pair and forget" means the app remembers
  the bike's name so the picker is quick and the pairing is obvious.
  Where Chrome exposes previously permitted devices, the app reconnects
  silently; otherwise one tap. Reconnect after a mid-ride drop retries
  automatically with no tap where the browser allows it.
- **The FTP test is a ride with a flag.** It uses the same engine and
  screen, appears in history, and the summary's "FTP used" is always the
  FTP at ride start. The new FTP applies to the next ride.
- **Dropped seconds are excluded.** Seconds with no bike data are left
  out of average watts, time in zone and distance, and the summary
  records how many seconds were missing. They are never counted as zero.
- **A ride has a ready state.** Pair the bike, then tap Start. The clock
  starts with the ride.

## Left to the builder

- The exact interval plans for the library. Five rides per grade per
  length (fifty rides) covering the archetypes, with mean intensity,
  zone 4+ and zone 5+ time rising with each grade.
  Ed will ride them and ask for changes.
- Nothing about the cadence bands: Ed set them.
- The power-to-speed curve if the bike does not broadcast speed.
- Parsing of the Cycling Power Measurement characteristic (flags, instant
  power, crank revolution data for cadence). Cadence must be derived
  from successive crank revolution counts and timestamps.
- How the app behaves when the Bluetooth connection drops mid-ride: it
  should keep the clock running, show the loss clearly and reconnect
  without user action where Chrome allows it.
- Keeping the screen awake during a ride (Screen Wake Lock API).
- Whether the ride clock is driven by the bike's data timestamps or the
  phone clock. The phone clock is the simple default.
- Library and summary screen layouts, within the same visual language as
  the ride screen.
- GitHub Pages deployment details, including the base path for the Vite
  build.

## Open items Ed owns

- Confirm the gym's Wattbike monitors are Model B with Bluetooth, and
  that the Bluetooth setting is reachable on the gym-floor bikes.
