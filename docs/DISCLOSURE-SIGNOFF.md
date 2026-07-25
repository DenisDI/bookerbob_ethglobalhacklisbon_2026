# Disclosure: inventory source

This records our transparency stance on the hotel inventory source, so it is not
mistaken for a hidden pre-event project asset.

## What the inventory is

Rooms, rates, and prebook holds come from **RateHawk**, a third-party B2B hotel API
used by many travel companies. We reach it through a thin MCP wrapper at flexrep.xyz
that our team deployed before this event. The wrapper is ours; none of its code is in
this repository. It sits behind an inventory adapter as one of two interchangeable
sources: the repo also ships a snapshot captured live during the event
(`fixtures/lisbon.json`), and the demo runs on either.

## Why this is disclosed rather than signed off

We consume a third-party commercial API (RateHawk) the same way any project consumes
Stripe or a maps API. The only pre-existing piece is our thin access wrapper, and we
name its ownership explicitly in the README and here. All judged project code (gateway,
terms engine, context-bands MCP, web app) was written during the hackathon.

We are not claiming a separate written organizer sign-off, because we do not have one
and will not imply one we did not obtain. The disclosure above is public in the repo.
If an organizer asks, the answer is exactly this page.

## If extra assurance is wanted

Post one line to the ETHGlobal Discord: our hotel inventory is RateHawk (third-party)
reached through a thin wrapper our team deployed pre-event, used as an external data
source, all project code new. Save their acknowledgment here. Optional, not a blocker.
