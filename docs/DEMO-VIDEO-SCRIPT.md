# BookerBob demo video: script + requirements cross-check

## Context

Founder wants a demo video scenario, cross-checked against ETHGlobal's rules. This is a
shootable script: timings, what to say (live voice), what to show on screen, plus the
hard rules and production notes. One video, product story, each partner visible at its
moment. Target 3:00, hard limits 2:00 to 4:00.

## Hard rules (from the submission page), pre-checked into the script

- 2 to 4 minutes. Target 3:00. Under 2:00 or over 4:00 is auto-rejected.
- 720p or higher. Record the laptop screen at 1080p. Never a phone.
- Live human voice. No AI voiceover, no text-to-speech.
- Do not speed up the video. So pre-stage everything and cut dead time in the edit,
  never time-compress.
- No "music over text describing the project". Talk over it.
- Intro under 20 seconds. The opening below is ~20s.
- Slides allowed, max 4 bullets each. Use one or two, sparingly.
- Show it in action, skip waiting.

## Structure (target 3:00)

### 0:00 to 0:22 — the hook (the problem, better opening)
Live voice over a clean title card or the site's hero.

> AI agents are about to start transacting for us: booking, buying, negotiating. When an
> agent walks up to a business, the business has two bad options. Treat it as fraud and
> make it prepay everything. Or trust it, and let bots farm the place, one wallet booking
> out the whole hotel. The missing piece is simple: who is behind the request. BookerBob
> is a hotel desk where the answer changes the terms. Same rooms, same nightly rate for
> everyone. What changes is who carries the risk between booking and the stay.

Keep it to ~20s. This frames both halves the founder wanted: proof earns you terms, and
agents are here and need to be underwritten, not blocked.

### 0:22 to 1:05 — how it works (the stack), recorded FROM the website
Screen: the Overview tab, scrolling the perks ladder (partner logos visible at each rung).
This is where recording from our own site looks strong, as the founder said.

> Proving who is behind a booking has three parts, and we did not build them, we composed
> three ecosystems.

- World (on the credential rung): "an agent proves a real human stands behind it with
  World AgentKit, or a person proves themselves directly with World ID. Either way, the
  desk knows a real, unique human is accountable."
- The Graph (on the context rung): "we read that human's onchain history through The
  Graph, as coarse bands, never raw numbers. Time you cannot buy back, depth, breadth,
  size. That is the underwriting signal."
- Show the tiers here, briefly, as the ladder lights up: anonymous pays the whole stay up
  front; a backed human leaves a deposit; a proven history holds the price and pays later;
  a long clean record settles at checkout.
- Hedera (on the settlement rung): "pay later is not a promise, it is a real scheduled
  transaction on Hedera, and anonymous agents pay per query over x402. Machines pay
  machines, on rails."

One optional slide here, 4 bullets max: World / The Graph / Hedera / one engine for people
and agents.

### 1:05 to 2:20 — the race (show it in action), 3 primary beats + elite as the peak
Screen: the race tab, then a real booking. Recommend THREE clear jumps, with elite as a
quick fourth flourish so it does not drag (4 tiers narrated, 3 felt).

1. Anonymous agent: the spent counter ticks up, it hits the x402 paywall live (pays cents
   to even ask), gets a short list, must prepay the whole stay. "This is a stranger."
2. Human-backed agent (World credential verified on screen): full list, a deposit instead
   of prepay. "A real human is now accountable, so the desk extends terms."
3. + context (type a known rich address, The Graph bands light up live): tier flips to
   verified, the price is held, pay later. Quick beat: a top history flips to elite, pay
   at checkout. "History earned deferred settlement."
4. The finale (the money shot): a real hotel card, real rate, "rate locked", then
   "settlement scheduled" opening a real Hedera transaction on HashScan.
   > An AI agent just held a real hotel room and scheduled a real payment for checkout,
   > on its own.

Pre-stage so nothing waits on camera: pinned showcase address, a hotel with confirmed
rates, the World step through the simulator (labelled), the race auto-run by URL so each
beat is one click. Cut any load time in the edit, do not speed up.

### 2:20 to 2:45 — the machine view (optional, strong for technical judges)
Toggle to the machine view: the same booking as the agent sees it, the 402 challenge, the
credential, the typed bands, the scheduled settlement. "This is the protocol underneath.
Every partner is native here, not a logo: x402 at the challenge, World at the credential,
The Graph at the bands, Hedera at the settlement." Keep to ~20s or cut if over time.

### 2:45 to 3:00 — close
Back to the hero.

> BookerBob serves people and AI agents from one desk and one engine. Prove who is behind
> the booking, and the terms follow. That is how commerce works when your agent is the one
> at the counter. Who is behind an agent changes the terms it gets.

## 3 or 4 cases? Recommendation

Narrate all four tiers, but FEEL three jumps: anonymous prepay, human deposit, context
pay-later, and let elite be the one-line peak inside beat 3. Four separate full beats
drags a 3-minute video; three clean contrasts plus a peak reads best.

## Per-prize submission TEXT (not the video): the timestamp map

The video is one product story. In each partner's submission text, open with where they
appear so a judge does not scrub:
- World: 0:22-0:35 (credential) and 1:15-1:40 (verified on screen); real e2e in
  docs/WORLD-AGENTKIT-PATH.md.
- The Graph: 0:35-0:50 and 1:40-2:05 (bands light up live); the reusable MCP is the
  artifact.
- Hedera: 0:50-1:05 and 2:05-2:20 (scheduled settlement on HashScan).

## Production notes

- Record 1080p screen capture, founder's real voice, quiet room, decent mic.
- Rehearse once with a timer; the safety take (a clean full run) should already exist.
- Edit only to cut dead air, never to speed up. Keep 2:45 to 3:00 final.
- No music narrating over text; if music, keep it under the voice.
- Guardrails on screen: no discounts or percentages, bands not numbers, HashScan page
  visible not a bare tx id, the Selfie step labelled as simulator.

## Verification

- Final export is 720p+ , between 2:00 and 4:00, not sped up, real voice.
- Each of the four tiers is visible; the finale shows a real HashScan settlement.
- Each partner is on screen at a nameable timestamp for its submission text.
