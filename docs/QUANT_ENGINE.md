# JTradePilot — Autonomous Quant Engine (architecture)

Goal: an **autonomous, self-learning quant engine** with a data+memory brain, an **auto/manual** switch, a learning loop that **keeps what works and stops what doesn't**, an agentic **wallet that compounds**, and a **shared data layer** other users can trade on. Built in phases; the real-money autonomous executor is **paper-first and gated**.

## Layers
1. **Ingestion** — on-chain (Polygon) indexer for *complete* wallet trade history (fixes the data-api cap), + the existing data-api/gamma for live feeds. Writes raw fills + resolutions.
2. **Data layer (Postgres)** —
   - `PmWallet` (current metrics) + **`PmWalletSnapshot`** (time-series → edge-decay, analytics, stats, quant features).
   - **Learning ledger**: `AgentDecision` (every auto/manual decision: signal/trade/verdict/strategy + rationale + mode) → `AgentOutcome` (realized pnl/roi/success) — the substrate for "what works".
   - **Vector memory (`QuantMemory`, pgvector)** — embeddings of learnings/wallet-notes/strategies for semantic recall by the AI/agent ("have we seen this pattern? did it work?").
3. **Analytics/quant** — stats over snapshots + outcomes (edge stability, ROI distribution, regime, win/loss attribution). Feeds both the UI and the agent.
4. **Decision/learning loop** — the agent forms a hypothesis (signal) → logs an `AgentDecision` → (paper or live) executes → records `AgentOutcome` → **reinforces strategies/wallets that work, disables those that don't** (self-healing). Memory + stats inform the next decision.
5. **Execution** — non-custodial Polymarket CLOB (P1, built). For automation: a delegated agent wallet with **hard risk limits + kill-switch** (stop when it doesn't work).
6. **Mode switch** — `quantMode = auto | manual`. **auto** = the agent decides + executes within limits. **manual** = human drives; agent only suggests. Default **manual** (safe).
7. **Shared intelligence** — the data/leaderboard/signals exposed (read) so other users can predict + opt into auto trade/buy/sell on their own wallet.

## The growing agentic wallet
A managed (or per-user delegated) wallet that trades the validated edge, sized by confidence, compounding wins — like a disciplined human would: only act on edges the learning loop has *proven* (positive realized outcome over N decisions), size down/stop on drawdown, never bet the whole bank. Self-healing = circuit-breakers + auto-disable of decaying strategies.

## Phases
- **P1 — Data & Memory foundation** (THIS): `PmWalletSnapshot` time-series + `AgentDecision`/`AgentOutcome` learning ledger + `quantMode` switch (Postgres). Install **pgvector** + `QuantMemory` for semantic memory. Snapshots written on every scan.
- **P2 — On-chain indexer**: complete Polygon trade history → accurate lifetime PnL/ROI/edge (fixes the credibility gap).
- **P3 — Learning loop (paper)**: agent logs decisions + simulated outcomes; analytics prove whether a signal/strategy/wallet actually has edge. **No real money.**
- **P4 — Self-healing controller**: reinforce winners, auto-disable losers, regime/drawdown circuit-breakers.
- **P5 — Autonomous executor (gated, live)**: real trades via delegated wallet, hard limits + kill-switch, starting tiny. Only signals P3/P4 proved. Legal/compliance review.
- **P6 — Shared marketplace**: other users opt into signals + auto-execute on their own wallets.

## Hard truths (must stay honest)
- An autonomous wallet that "grows" is what most quant funds attempt and most fail — **especially copying a structurally-disadvantaged edge** (speed/insider edges aren't copyable; our own EdgeScore thesis). Build it, but **prove edge on paper before real money**, measure against random/baseline, and assume it can lose.
- Real-money autonomy is safety-critical: every live action behind per-trade caps, daily-loss limits, max exposure, slippage caps, confirm/kill-switch.
- Activity-data cap makes today's numbers understate active wallets — P2 (on-chain) is the fix.
- Copy-trading/managed execution may be regulated → legal review before P5/P6.

## Optimization log (autonomous passes)
- **2026-06-27 — pass 1:** Measured paper performance by market focus (in-sample/backfill, n≈8.5k): only **Mixed (-18% ROI, 33% win)** and **Politics (-3.9%, 38%)** are negative; Sports +107%, Weather +164%, Crypto +38–165% positive. **Change:** `recordPaperSignals` now skips copy signals from wallets whose `marketFocus` is Mixed or Politics (null focus treated as Mixed → blocked). Forward before/after pending (live loop sparse); expected to remove negative-EV categories from future signals.
