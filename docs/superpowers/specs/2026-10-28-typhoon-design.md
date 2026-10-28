# Typhoon design

Date: 2026-10-28
Status: draft for Ed's approval

## Intent

Ed rides a Wattbike Pro/Trainer on the David Lloyd gym floor instead of
attending the club's Cyclone studio class. Typhoon puts a Cyclone-style
class on his phone: a power-zone ride plan driven by the bike's live
watts, with his own Spotify music chosen to suit each part of the ride.

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
- A library of distinct rides spanning very easy to very hard, with real
  variety of interval shapes inside each ride.
- Music from Ed's Spotify that follows the ride: track tempo chosen to
  suit the zone, with a dynamic mix of track changes and holds across
  zone boundaries.
- A ride screen that looks designed, not defaulted. Ed named this as the
  thing that would make him wince if wrong.
- FTP stored on the phone with an in-app test to set it.
- A post-ride summary and a history that builds up over weeks.

## Non-goals

- No accounts, no backend, no sync between devices.
- No video, no heart rate, no instructor voice, no coaching text, no
  riding-position cues (Ed always rides seated).
- No cadence targets shown on screen. Cadence is Ed's choice and he
  matches it to the music by ear.
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
- A soundtrack that changes track at every zone boundary like a metronome,
  or one that never changes. The mix must feel dynamic.
- Anything that needs the Spotify tempo endpoints. They are deprecated for
  new apps and return 403.

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
  Bluetooth and the Spotify redirect. A GitHub Action builds and deploys
  on every push to main.
- Stack: Vite, plain TypeScript, no UI framework. Ed asked for something
  lighter than his usual Next starter. Ed's guardrails still apply (one
  function per file, `@/` imports, explicit return types, verbose and
  explicit style, no barrel files).
- Spotify: Ed has Premium. The app is a Development Mode Spotify app
  registered to Ed (limit of five users is irrelevant for a one-user
  app). Login is the browser PKCE flow, so no client secret exists. The
  app controls playback on the phone's Spotify app through the Web API
  player endpoints (Spotify Connect), which keeps audio in the Spotify
  app and out of the browser tab. The Web Playback SDK is a fallback only
  if Connect proves unreliable on the phone.
- Tempo: Spotify's Audio Features and Audio Analysis endpoints are
  deprecated for apps registered after 27 November 2024 and extended
  quota needs a business with 250k monthly users. Track tempo therefore
  comes from GetSongBPM (free API key, looked up by title and artist).
  Their terms require a visible link back to GetSongBPM.com, which goes on
  the settings screen. The API key is pasted into settings and kept in
  local storage, never committed.
- Storage: everything (FTP, settings, BPM cache, ride history) lives in
  the browser's local storage on the phone.

## What Ed decided

### Rides

- Lengths: 30 and 45 minutes only.
- Difficulty: five levels, very easy to very hard. Each ride is written
  by hand as its own interval plan. Hard rides have longer work
  intervals, more steps up and shorter recoveries; easy rides the
  opposite. No ride is derived from another by scaling.
- A ride is a flat ordered list of intervals. Each interval is a target
  zone (1 to 7) and a duration in seconds. No names, no blocks, no
  cadence, no position.
- Interval shapes must vary within a ride: short sprints (10 to 30 s),
  stepped ramps (zone 2, 3, 4, 5 in succession), pyramids, over/unders
  (alternating zone 4 and zone 5 at 30 to 60 s each), surges (a short
  zone 6 inside a zone 3 block), as well as long steady blocks. Rides
  follow the Cyclone archetypes: climbs, time trials, HIIT, under/over
  threshold, endurance, and a "mash up" of several.
- Every ride starts with a warm-up and ends with a cool-down in zones 1
  and 2.

### Zones and FTP

Seven zones as percentages of FTP, matching Stages Flight:

| Zone | % of FTP | Colour |
|---|---|---|
| 1 | 0 to 55 | grey |
| 2 | 56 to 75 | blue |
| 3 | 76 to 90 | green |
| 4 | 91 to 105 | yellow |
| 5 | 106 to 120 | orange |
| 6 | 121 to 150 | red |
| 7 | 151 and up | purple |

- FTP is stored on the phone. Default is 150 W when none has been set
  (Cyclone's own default for riders without one).
- FTP test: a separate short ride consisting of a warm-up, a 1, 3 or 5
  minute all-out seated effort, and a cool-down. FTP is set to 70, 80 or
  85 percent of the average power over the test interval respectively.
  Ed confirms the new value before it is saved.
- The test is also offered as a standalone item in the ride library so
  it can be redone every six to eight weeks.

### The ride screen (Ed chose this from mockups)

Landscape. Three bands:

1. **Top band**: the current track (artwork, title, artist, bpm) on the
   left, the current interval countdown on the right, coloured in the
   current target zone's colour.
2. **Middle band, the main event**: the ride profile drawn as bars, one
   per interval, width proportional to duration and height proportional
   to zone. Completed intervals dimmed, the current one outlined. A dot
   plots Ed's live effort on the current bar, vertically by his current
   percentage of FTP, so he sees himself ride the shape.
3. **Bottom band**: one small stats strip. Watts (coloured by current
   zone), rpm, mph, average mph, miles, time remaining in the ride.

No gauge, no cadence target, no text cues. Styling is a first-class
requirement: dark, legible from the saddle, designed rather than
defaulted. Use the frontend-design skill for the visual pass.

### Music

- Source: one Spotify playlist of Ed's, chosen in settings.
- Tempo: each track's bpm is looked up once from GetSongBPM and cached
  on the phone. Tracks with no result are still playable and are treated
  as unknown tempo.
- Zone to tempo band: each zone maps to a cadence band, and a track fits
  a zone if its bpm, half its bpm or double its bpm falls in the band.
  The exact bands are left to the builder (start with roughly 75 to 85
  rpm for zones 1 and 2, 85 to 95 for 3 and 4, 95 and up for 5 to 7, and
  tune after riding). Tracks of unknown tempo are eligible for any zone
  but never preferred.
- Track selection at a zone boundary is a weighted coin flip, Ed's
  explicit wish being "mix it up so the soundtrack is interesting and
  dynamic":
  - Never cut a track that has played for under about 60 seconds.
  - A zone jump of two or more usually brings a new track in the new
    zone's band.
  - A step of one zone usually holds the current track.
  - Zero change (same zone, new interval) always holds.
  - When a track ends naturally the next track is picked for the current
    zone.
- The coin flip and the bands live in one small function so they are
  easy to tune.
- Spotify's own crossfade setting handles blending; the app only skips.
- Ed likes riding to a fixed beat across several zones and working the
  resistance lever to move between zones. The hold behaviour above is
  what makes that happen; nothing else is needed for it.

### After the ride

- Summary: duration, average watts, max watts, distance, average mph,
  time in each zone, FTP used.
- Saved to local storage with the ride name, difficulty and date. A
  history screen lists past rides newest first.

### Settings

- FTP (editable by hand as well as by test).
- Spotify: connect and disconnect, playlist picker.
- GetSongBPM API key, with the required link back to GetSongBPM.com.
- Bike: pair and forget.

## Calls made after the builder check

These came from a reviewer reading the document as the builder. Each is
my call, not Ed's; Ed can overrule any of them.

- **The app owns the queue.** Playback is started per track by URI with
  no playlist context, so Spotify never auto-advances on its own. The app
  polls player state every couple of seconds, and a few seconds before
  the current track ends it queues the next pick for the current zone so
  Spotify's crossfade still works. Zone-boundary changes are an immediate
  skip to a fresh pick. "Hold" means doing nothing.
- **Pairing takes one tap per ride.** Web Bluetooth needs a user gesture
  to open the device picker. "Pair and forget" means the app remembers
  the bike's name so the picker is quick and the pairing is obvious.
  Where Chrome exposes previously permitted devices, the app reconnects
  silently; otherwise one tap. Reconnect after a mid-ride drop retries
  automatically with no tap where the browser allows it.
- **Music is optional.** A ride runs with the bike alone. If Spotify is
  not connected or its token cannot be refreshed, the top band shows "no
  music" and nothing else changes. Spotify is never a reason a ride
  refuses to start. Token refresh runs before the ride starts and again
  in the background when due.
- **The FTP test is a ride with a flag.** It uses the same engine and
  screen, appears in history, and the summary's "FTP used" is always the
  FTP at ride start. The new FTP applies to the next ride.
- **Dropped seconds are excluded.** Seconds with no bike data are left
  out of average watts, time in zone and distance, and the summary
  records how many seconds were missing. They are never counted as zero.
- **A ride has a ready state.** Pair the bike, see the first track
  picked for the warm-up zone, then tap Start. Music and clock start
  together. The coin flip applies at every boundary including into the
  cool-down.
- **Tempo lookups run up front.** Choosing a playlist in settings looks
  up every track with a progress indicator and the results are cached
  for good. Lookups are rate-limited to stay inside GetSongBPM's free
  tier; if a lookup is interrupted it resumes next time settings opens,
  and unlooked-up tracks count as unknown tempo in the meantime.

## Left to the builder

- The exact interval plans for the first library. Aim for at least two
  rides per difficulty per length (twenty rides) covering the archetypes.
  Ed will ride them and ask for changes.
- The cadence bands per zone and the coin-flip weights, within the
  guidance above.
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
  build and the Spotify redirect URI.

## Open items Ed owns

- Confirm the gym's Wattbike monitors are Model B with Bluetooth, and
  that the Bluetooth setting is reachable on the gym-floor bikes.
- Register the Spotify developer app and create a GetSongBPM key.
- Choose the playlist.
