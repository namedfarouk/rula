# Rula

Rula is an AI-powered spending guard for on-chain wallets on **X Layer**.

Users define wallet safety rules in plain English (for example: `block transfers over $200`), and Rula evaluates each transaction against those rules in real time.

## Built For

- OKX Build X Hackathon
- X Layer + OnchainOS ecosystem

## What Works Today

- Plain-English rule input with lightweight parser
- Rule types: `block`, `alert`, `limit`, `schedule`
- Live transaction simulator with rule enforcement feedback
- Wallet connection flow (OKX Wallet / MetaMask via EIP-1193)
- X Layer network switch/add prompt during connect
- Onchain token balance + transaction history fetch (when API key is available)
- Persistent demo state (rules, activity log, auto-simulate) across refresh

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Open: [http://localhost:5173](http://localhost:5173)

## Environment Variables

- `VITE_ONCHAINOS_API_KEY` (optional): enables richer wallet token/tx data from OnchainOS endpoints.

If this key is not set, the app still works in full demo/simulator mode.

## Scripts

```bash
npm run dev      # start local dev server
npm run build    # type-check and production build
npm run preview  # preview built app
```

## Demo Flow (Pitch Friendly)

1. Open `/demo`
2. Add a rule like `block transfers over $200`
3. Click `Simulate` (or enable `Auto`)
4. Show allowed vs blocked transactions and fired rule traces
5. Connect wallet to show X Layer integration path

## Project Structure

- `src/components/landing/LandingPage.tsx` - landing / narrative page
- `src/components/demo/DemoPage.tsx` - interactive demo, rule engine, simulator
- `src/hooks/useXLayerWallet.ts` - wallet connect + chain switching
- `src/utils/onchainos.ts` - X Layer RPC + OnchainOS API helpers
- `src/contexts/WalletContext.tsx` - global wallet state provider

## Current Limitations

- Rule parsing is heuristic (regex-based), not an LLM parser yet
- Enforcement in this prototype is demo-time simulation, not a production transaction firewall
- OnchainOS browser calls may be limited depending on API key and endpoint requirements

## Next Step Ideas

- Move rule parsing to an LLM endpoint with structured output
- Add server-side signed proxy for OnchainOS routes
- Add rule templates + profile presets (degen, payroll, treasury)
- Add persistent wallet-specific rule sets in a backend store

---

Built by Farouk for hackathon iteration speed.
