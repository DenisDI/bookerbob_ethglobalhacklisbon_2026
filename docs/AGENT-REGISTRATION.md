# AgentKit registration (in-window proof)

The agent wallet was registered in the World AgentBook after hacking start, so a
human-backed agent flow can be verified on-chain rather than mocked.

| Field | Value |
|---|---|
| Agent wallet | `0x1597866E3F9870241EebC1153136fDbf71C3CBF3` |
| Registration tx | `0xfc2fe4d9ddbd26db6005e5328358afb57cc4d8f922c240bcd6b281159f02eeb1` |
| humanId (nullifier) | `0x2882ca323118cb3bfc375db1a2cd49158ba1210c76e19b8df5f523e11aaf67fb` |
| AgentBook contract | `0xA23aB2712eA7BBa896930544C7d6636a96b944dA` |
| Network | World Chain (eip155:480) |
| Registered | Sat 2026-07-25, during the hackathon window |

Verify anytime:

```
npx @worldcoin/agentkit-cli status 0x1597866E3F9870241EebC1153136fDbf71C3CBF3
# registered: true, humanId: 0x2882ca...aaf67fb
```

Notes:
- The agent wallet private key lives only in `.env` as `LISBON2026_AGENT_PRIVATE_KEY`
  and is never committed. The gateway signs agent requests with it; verification is an
  on-chain AgentBook read, so no human is in the loop at request time.
- The humanId is the on-chain nullifier of the verifying human, public by design, not a
  secret.
- Registration was submitted through the AgentKit default relay, so the agent wallet
  needed no gas.
