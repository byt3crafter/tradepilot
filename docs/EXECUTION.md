# JTradePilot — Polymarket Execution Layer (Scoping)

Goal: act on the Quant report/verdict — **buy/sell on Polymarket from inside JTradePilot**.
Status: SCOPE ONLY (not built). P0 manual deep-links to Polymarket are already live.

## The reality of trading Polymarket programmatically
Polymarket is **on-chain (Polygon) + a CLOB** (central limit order book). To place an order you need:
1. A funded **Polygon address** with **USDC** (and a tiny MATIC for gas on approvals).
2. **Token approvals** for the CTF Exchange + NegRisk contracts (one-time, on-chain).
3. **CLOB API credentials** (key/secret/passphrase) derived by signing with that wallet.
4. Each order is an **EIP-712 signed** struct POSTed to `clob.polymarket.com`. Official lib: `@polymarket/clob-client` (TS) handles signing + posting.

So "buy/sell" = real money, real keys, real on-chain state. There is no shortcut button.

## Custody models (the core decision)
- **A. Non-custodial / user-signs (RECOMMENDED, safest).** User connects their own wallet (WalletConnect/MetaMask). Orders are signed client-side; we never hold keys or funds. Best for **manual** trading. Legally lowest-risk.
- **B. Delegated server-side creds.** User generates Polymarket API creds and grants them to us; we store them **encrypted** and sign **server-side**. Required for **automation/bot** (server must place orders without the user present). Higher trust + security burden (we can move their funds within Polymarket).
- **C. Custodial (we hold keys/funds). DO NOT.** Money-transmitter/regulatory + security nightmare.

## Phased plan
- **P0 — Deep-links (DONE).** "↗ Polymarket" from any wallet/market → trade manually there. Zero risk.
- **P1 — Non-custodial manual trade.** WalletConnect in-app → from a market, place a single order (YES/NO, price, size) signed by the user's wallet via `clob-client`. Confirm每 trade. ~1–2 wk.
- **P2 — Paper / simulated execution.** Run the bot's signals against simulated fills (no real money) to validate a strategy end-to-end. Reuses the EdgeScore engine. ~1 wk.
- **P3 — Live automation (the big one).** Server-side signing with the user's delegated creds (model B), driven by signals/copy, behind **hard risk limits**: per-trade cap, daily loss limit, max open exposure, slippage cap, **kill switch**, confirm-first mode. Real money. Multi-week + ongoing risk ownership.

## Risk controls (mandatory before any live order)
per-trade max %, daily loss limit + circuit breaker, max position/exposure, slippage limit, dry-run default, explicit confirmation, full audit log, one-click kill switch.

## Hard truths (from the EdgeScore §7 thesis)
- The best-metric wallets have the **least copyable** edge (speed/insider). Copy execution inherits an uncopyable edge **plus** your latency disadvantage. Manual, selective acting on the intelligence beats blind auto-copy.
- Execution is where you can lose real money fast. The **intelligence layer is the product**; execution is an optional, risk-heavy add-on.
- Regulatory: facilitating execution / copy-trading may be regulated by jurisdiction. Non-custodial + user-initiated (A/P1) is lowest-risk; automated copy (P3) is highest scrutiny — needs disclaimers, ToS, possibly geofencing/legal review.

## Decisions needed to start
1. Custody: **A (wallet-connect, manual)** first, or straight to **B (delegated, automation)**?
2. Start at **P1 (manual)** or jump toward **P3 (automation)**?
3. Jurisdiction / legal posture (disclaimers, geofencing) — needed before live automation.

Recommendation: **A + P1** (non-custodial manual trade) first — it makes the report actionable with the least risk and validates demand, then evaluate P2/P3.
