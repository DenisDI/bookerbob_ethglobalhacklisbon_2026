# SPEC 03 — Web demo (apps/web): the race, not a tour

> One page, split screen, judged in video form. Direction canon:
> `DEMO-IMPROVEMENTS.md` + 00-final-plan B/J. Vite + React, dark canvas.

## Layout

```
+--------------------------------------------------------------+
|  who is behind an agent changes the terms it gets            |
+------------------------------+-------------------------------+
| BOT                          | VERIFIED                      |
| spent: $0.07 and counting    | spent: $0.00                  |
|------------------------------|-------------------------------|
| [narration feed]             | [narration feed]              |
| "no credential here.         | "my human is verified.        |
|  paying $0.01 for this query"|  requesting terms on their    |
|                              |  standing"                    |
|------------------------------|-------------------------------|
| 3 basic hotels, 100% prepay  | full inventory                |
|                              | -> HotelFinaleCard            |
+------------------------------+-------------------------------+
| [address/ENS input] [whale] [mid] [fresh]   <- showcase chips |
+--------------------------------------------------------------+
```

Same prompt fires both panes: "book me a hotel in Lisbon".

## Components

- `SpentCounters.tsx`: per-pane persistent header. Bot ticks up on every 402 settle
  (poll /spent); verified stays $0.00. Highest-priority WOW element, survives any cut.
- `NarrationFeed.tsx`: chat-like stream of gateway `narration[]`. Lowercase, warm,
  no crypto jargon; protocol details live in a collapsed dev pane. Degrades to
  static captions if hours run out (per 00-final-plan B.6).
- `AddressBands.tsx`: TEXT input for address/ENS (primary; WalletConnect is a
  cuttable encore). Three showcase chips pinned in demo.config: whale (T4),
  mid (T2-T3), fresh. Fresh renders the scripted line: "no onchain history yet.
  Human terms via the credential alone." Never an apology or error state.
- `HotelFinaleCard.tsx`: the finale is a BOOKING, not JSON. Photo, name, stars,
  real nightly rate (no % banners), underwriting term line, then "rate locked" +
  book_hash, then "settlement scheduled: [checkout date]" linking the OPEN HashScan
  schedule page. "cached inventory" badge when fixtures served.
- `VerifyFlow.tsx`: Selfie Check gate (Phase A, staging/sandbox) adding the
  eligibility line to the offer.

## Hard rules on this surface

- Zero discount language, zero % anywhere, no tier-matrix feature tour (matrix lives
  in README only).
- Bands only, never raw values or counts on screen.
- HashScan page visible, never a bare tx id.
- Every visible state must have a designed empty/failure twin: null bands, stale
  subgraph ("band unavailable"), fixtures fallback badge, 402 mid-payment spinner.

## Video mapping (why this page is shaped this way)

The page IS the video set (00-final-plan J): 0:10-1:00 race with counters + feeds;
1:00-1:40 whale address typed, bands light up, tier flips; 1:40-2:15 finale card +
HashScan; close on frozen counters side by side. Build states so each beat is
reachable by one click, no live re-setup between takes (Sat 23:00 safety take).
