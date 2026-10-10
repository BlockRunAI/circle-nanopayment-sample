# Circle Arc Testnet — x402 Nanopayment Sample

A minimal end-to-end proof-of-concept showing how an AI agent can autonomously pay for API access using [Circle Gateway nanopayments](https://developers.circle.com/gateway/nanopayments), the [x402 protocol](https://x402.org), and Circle's **Arc testnet**.

## What This Demonstrates

```
Client (AI agent)                Server (paid API)           Circle Gateway
─────────────────                ─────────────────           ──────────────
GET /risk-profile   ──────────►  402 Payment Required
                    ◄──────────  PAYMENT-REQUIRED header (GatewayWalletBatched)

sign EIP-3009 against
GatewayWallet contract

GET /risk-profile   ──────────►  decode Payment-Signature
  Payment-Signature: <sig>       verify  ───────────────► isValid: true
                                 settle  ───────────────► batched settlement ✅
                    ◄──────────  200 { risk_score: 87, ... }
```

**Key facts:**
- **Gas-free** — nanopayments are batched by Circle Gateway, no per-transaction gas
- **No local facilitator** — Circle Gateway handles verification & settlement
- **No Circle API key** — uses local private keys + Gateway's public endpoints
- **x402 v2 protocol** — uses `PAYMENT-REQUIRED` / `Payment-Signature` headers
- $0.01 USDC per API call, settled in batches on Arc testnet

---

## Arc Testnet

| Field | Value |
|-------|-------|
| Chain ID | 5042002 |
| RPC | `https://rpc.testnet.arc.io` |
| USDC | `0x3600000000000000000000000000000000000000` |
| Explorer | https://explorer.testnet.arc.io |
| Faucet | https://faucet.circle.com |

---

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Generate keys

```bash
npm run setup
```

Copy the output into `.env`:

```
CLIENT_PRIVATE_KEY=0x...
SERVER_PRIVATE_KEY=0x...
SERVER_ADDRESS=0x...
```

### 3. Fund wallets

Go to **https://faucet.circle.com**, select **Arc Testnet** + **USDC**, and fund the **client** address printed by `npm run setup`.

### 4. Deposit USDC into Gateway

The client needs USDC in Circle Gateway to make nanopayments:

```bash
npm run deposit -- 1     # deposits 1 USDC into Gateway
```

### 5. Run (2 terminals)

```bash
# Terminal 1 — paywalled API server
npm run server

# Terminal 2 — AI agent client
npm run client
```

**Expected output (client):**

```
Wallet: 0xF8eBf...

Wallet USDC: 18.97
Gateway available: 1
Gateway total: 1

Calling http://localhost:4021/risk-profile ...

✅ Nanopayment complete!
Paid: 0.01 USDC
Transaction: 76de04b4-d6da-42c3-8462-785ead8dc8f7
Response:
{
  "risk_score": 87,
  "risk_level": "high",
  "recommendation": "block_transaction"
}
```

### 6. Check seller earnings

```bash
npm run balance            # view seller's Gateway balance
npm run balance 0.5        # withdraw 0.5 USDC from Gateway
```

> **Note:** Seller earnings appear after Circle Gateway settles the batch on-chain. This may take a few minutes.

---

## Architecture

### `src/server.ts` — Paywalled API
Express server on port 4021. Uses `createGatewayMiddleware` from `@circle-fin/x402-batching` to gate `GET /risk-profile` behind a $0.01 USDC nanopayment. No local facilitator needed — Circle Gateway handles verification and settlement.

### `src/client.ts` — Autonomous Payment Client
Uses `GatewayClient` from `@circle-fin/x402-batching` to:
1. Check Gateway balance (deposit required first)
2. Call the API → `GatewayClient.pay()` handles the full 402 flow automatically
3. Signs EIP-3009 against the GatewayWallet contract (not USDC directly)
4. Receives the paid response

### `src/deposit.ts` — Gateway Deposit
Deposits USDC from the client's wallet into Circle Gateway. Required before making nanopayments.

### `src/balance.ts` — Seller Balance & Withdrawal
Checks the seller's Gateway balance and optionally withdraws earnings.

### `src/setup.ts` — Key Generator
Generates client and server private keys and prints the addresses to fund.

---

## x402 Nanopayment Flow

The [x402 protocol](https://github.com/coinbase/x402) with [Circle Gateway nanopayments](https://developers.circle.com/gateway/nanopayments):

1. **Client deposits** — one-time: USDC is deposited into the GatewayWallet contract
2. **402 Response** — server returns `PAYMENT-REQUIRED` header with `GatewayWalletBatched` scheme and the GatewayWallet `verifyingContract`
3. **Client signs** — EIP-3009 `TransferWithAuthorization` against the GatewayWallet contract (not the USDC token)
4. **Payment-Signature header** — signed authorization sent with the retry request
5. **Gateway verifies** — Circle Gateway checks signature validity
6. **Gateway settles** — payment is queued for batched on-chain settlement (gas-free for both parties)
7. **Server responds** — returns the API response immediately

### Why Nanopayments?

| | Standard x402 | Nanopayments |
|--|-------------|-------------|
| Settlement | Per-request on-chain tx | Batched by Gateway |
| Gas cost | Paid per transaction | Zero (Gateway absorbs) |
| Facilitator | Self-hosted required | Circle Gateway (hosted) |
| Latency | Depends on chain | Near-instant |
| Setup | 3 processes | 1 server process |

---

## Why Arc Testnet?

Arc is Circle's own EVM-compatible L1 where USDC is the native gas token, making it ideal for demonstrating USDC micropayments with minimal friction.

---

## Project Structure

```
circle-sample/
├── src/
│   ├── setup.ts         # Generate keypairs
│   ├── server.ts        # Paywalled API (port 4021)
│   ├── client.ts        # Autonomous nanopayment client
│   ├── deposit.ts       # Deposit USDC into Gateway
│   └── balance.ts       # Check seller balance / withdraw
├── .env.example
├── package.json
└── tsconfig.json
```

## npm Scripts

| Script | Description |
|--------|------------|
| `npm run setup` | Generate keypairs and print addresses |
| `npm run server` | Start the paywalled API server |
| `npm run client` | Run the autonomous payment client |
| `npm run deposit -- <amt>` | Deposit USDC into Gateway for nanopayments |
| `npm run balance [amt]` | Check seller balance / withdraw |
