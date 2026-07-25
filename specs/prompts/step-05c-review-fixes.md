# Prompt — review of the Graph block, and the fixes

```
теперь давай код ревью всей этой истории с графом ревью логики скоупа баги
отловим и все остальное, чтобы это было аллайнд с нашим планом и треком
патнера и т.п.
```

Ten defects and three scope gaps against §D.3. The full list is in the plan file;
what follows is what actually changed and why.

## The one only a live run could find

`StdioClientTransport` forwards **only** `HOME, LOGNAME, PATH, SHELL, TERM, USER`
to a child process. So the gateway's Graph key never reached the context server.
Locally nothing looked wrong, because the package also reads `.env` off disk. In
the container there is no `.env`, secrets arrive as environment variables, and
every context lookup would have failed while the demo quietly served human terms
to everyone.

It surfaced only because a test of the failure path refused to fail: setting
`LISBON2026_GRAPH_API_KEY=broken` changed nothing, since the child was never
reading our environment in the first place. The child now gets an explicit
allowlist — the Graph keys and nothing else, so a subprocess is not handed the
booker token and the Hedera keys for no reason.

## Truthfulness

Narration said "no wallet shared here" whenever a lookup returned nothing,
including when an address had been given and the lookup failed. The two facts are
now distinct, and the failure says "i asked about their wallet and could not get
an answer".

## Logic

`clean` required only that some repayment existed, so an address that borrowed
$50,000 and returned $10 read as having paid it back. `clean` now asks that at
least half came back, and a fourth value `borrowing_open` names an address still
carrying the debt. In `terms.ts` an open loan closes pay-at-checkout and keeps the
rate lock: money already committed elsewhere is exposure, not a failing.

## A false claim in the README

The root README advertised `--http :3001` while the server exited with code 2 on
that flag. Rather than delete the line from two documents, the transport was
built: stateless streamable HTTP at `/mcp`, plus `/health`. It is now the shortest
proof the server is standalone, since a judge can curl it with no MCP client.
Verified live for `tools/list` and for a `resolve_name` call.

## The demo could not show any of this

`grep address apps/web/src` found nothing: the panes ran on the synthetic
`?tier=` lever and the whole Graph block was invisible in the product. Added the
address field with three pinned inputs, and a context file panel rendering the
four axes as segmented meters with the repayment line in words. `?autorun=1` now
takes `&address=`, so each video beat is one URL rather than a re-setup between
takes.

The backed pane asks as `tier=human` and lets the real bands decide whether that
becomes verified or elite. The tier is derived on screen, never asserted.

## Deliberate deviation from the plan

The plan said to write the x402 payer and mark it unverified. I did not. Shipping
a payment loop that has never once run would be a code path claiming a partner
integration we have not seen work, which `00-final-plan.md` §F forbids naming. So
the interface was reshaped to make the seam real — `Payer.fetchJson` owns the
whole round trip, because answering a 402 is a conversation and not a header —
and the absence is stated plainly in SKILL.md and in the feedback doc. It needs a
funded Base wallet, which is a human task.

Also reordered: the repayment change landed before the UI, since it altered the
response shape the UI renders.

Verified: typecheck clean, 27/27 gateway tests, 16/16 MCP tests offline, lexicon
clean, HTTP transport answering curl, cache turning a repeat lookup from 1.08s
into 2ms, and `vitalik.eth` reaching elite while the liquidated borrower stops at
a rate lock.
