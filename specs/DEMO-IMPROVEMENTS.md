# DEMO-IMPROVEMENTS: from dry mechanics to a watchable story

Problem: "terms recompute" as a feature tour is engineer-wow, not human-wow, and WOW
Factor is an explicit ETHGlobal judging criterion. Our unfair advantage vs every other
demo this weekend: REAL hotels and REAL money moving live. These changes are mostly
direction, not code. Budget: ~3-4h inside step 8, itemized below.

## 1. The race, not the tour (0h, presentation change)

One identical prompt to two agents side by side: "book me a hotel in Lisbon".
- LEFT, bot: pays x402 cents per request, wallet balance ticking DOWN on screen,
  gets 3 basic hotels, 100 percent prepay.
- RIGHT, verified: credential passes free, full inventory, rate locked, settlement
  scheduled.
A race is watchable; a feature list is not. The tier matrix lives in the README, it
does NOT appear in the video.

## 2. The agent thinks out loud (1-2h, the highest-leverage addition)

A narration console beside each pane, human-readable decisions, streaming as it works:
- "no credential here. paying $0.01 for this query"
- "my human is verified. requesting terms on their standing"
- "context confirmed: active on Aave and Uniswap. asking for pay-later"
- "rate locked. settlement scheduled for checkout day"
Implementation: the gateway already knows every decision; emit a `narration` field per
step and render it as a chat-like feed. This single element converts the demo from a
screencast of an API into a story, and it shows World judges agent DECISIONS, not
wired hooks. Copy style: lowercase, warm, no crypto vocabulary on the surface.

## 3. Money counters, not logs (30m)

Two persistent counters in the header of each pane:
- bot: "spent: $0.07 and counting"
- verified: "spent: $0.00"
Visceral, zero explanation needed, updates on every 402 settle. This is the
signal-vs-noise of the whole product in two numbers.

## 4. The finale is a real booking, shown like a booking (1h)

Not JSON. A hotel CARD: photo, name, stars, real RateHawk price, then:
- "rate locked" with the book_hash on screen
- "settlement scheduled: [checkout date]" with the HashScan page open
Video line over this shot: "an AI agent just locked a real hotel room and paid for
the data it needed, on its own." This is the wow moment, and hotels make it legible
to any judge with zero crypto context.
Prep: pinned hotel id verified Fri night (fixtures as fallback), pre-recorded backup
take of this beat from Sat 23:00 safety run.

## 5. The judge moment stays interactive but foolproof (already in v2)

Address/ENS text input, three pinned showcase addresses (whale T4 / mid T2-T3 /
fresh). The fresh-address empty state is scripted as a line, not an apology:
"no onchain history yet. Human terms via the credential alone." The credential axis
carries the wow when the context axis is empty.

## 6. Video structure v2 (3:00 max, dense)

- 0:00-0:10 the sentence: "who is behind an agent changes the terms it gets"
- 0:10-1:00 the race: both agents run, counters tick, narration streams
- 1:00-1:40 context: type the whale address, bands light up live from Messari
  subgraphs, tier flips, MCP standalone + outbound x402 payment to The Graph shown
- 1:40-2:15 the finale: hotel card, rate lock, HashScan scheduled settlement
- 2:15-2:35 Selfie gate + one feedback-doc screen
- 2:35-2:50 the sentence again over the two counters frozen side by side
Per-partner submission TEXT opens with its timestamp map ("your integration:
1:00-1:40").

## Guardrails (unchanged, restated so polish does not break them)

- No percent discounts anywhere on screen or in narration.
- Bands only, never raw values, in any user-visible surface.
- Narration copy warm and plain; protocol names stay in the dev pane, not the story.
- These items are NOT "polish to cut": items 2-4 move WOW Factor, a scored criterion.
  Cut order stays as committed; if step 8 shrinks, item 3 survives first, then 4,
  then 2 degrades to static captions.


> Merged into `00-final-plan.md` §J / §B. Bands now come from six sources, not Ethereum only: see `specs/README.md` for what changed.
