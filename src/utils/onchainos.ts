// ── OnchainOS Configuration ─────────────────────────────────────────────────
// Rula fetches all real on-chain data through the OnchainOS API so every
// interaction counts toward the hackathon's "transactions must go through the
// OnchainOS API" requirement. No browser wallet, no direct RPC.

const ONCHAINOS_API_KEY = import.meta.env.VITE_ONCHAINOS_API_KEY ?? "";
const ONCHAINOS_BASE = "https://web3.okx.com/api/v6/dex";

// X Layer mainnet
export const XLAYER_CHAIN_INDEX = "196";
export const XLAYER_CHAIN_ID = 196;
export const XLAYER_EXPLORER = "https://www.okx.com/web3/explorer/xlayer";

// ── Wallet Balance (shape kept for compatibility) ───────────────────────────

export interface WalletBalance {
  address: string;
  balanceETH: string;
  balanceWei: bigint;
}

// ── OnchainOS API: token balances ───────────────────────────────────────────

interface OnchainOSTokenBalance {
  chainIndex: string;
  tokenContractAddress: string;
  symbol: string;
  balance: string;
  tokenPrice: string;
}

interface OnchainOSResponse<T> {
  code: string;
  msg: string;
  data: T[];
}

export async function getTokenBalances(
  address: string
): Promise<OnchainOSTokenBalance[]> {
  const url = `${ONCHAINOS_BASE}/balance/all-token-balances-by-address?address=${address}&chains=${XLAYER_CHAIN_INDEX}`;

  try {
    const res = await fetch(url, {
      headers: {
        "OK-ACCESS-KEY": ONCHAINOS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.warn("OnchainOS balance API returned", res.status);
      return [];
    }

    const json: OnchainOSResponse<OnchainOSTokenBalance> = await res.json();
    return json.data ?? [];
  } catch (err) {
    console.warn("OnchainOS balance fetch failed:", err);
    return [];
  }
}

// ── OnchainOS API: transaction history ──────────────────────────────────────

interface OnchainOSTx {
  txHash: string;
  txStatus: string; // "1"=pending, "2"=success, "3"=fail
  txTime: string;
  from: string;
  to: string;
  amount: string;
  symbol: string;
  txFee: string;
}

export async function getTransactionHistory(
  address: string,
  limit = 20
): Promise<OnchainOSTx[]> {
  const url = `${ONCHAINOS_BASE}/post-transaction/transactions-by-address?address=${address}&chains=${XLAYER_CHAIN_INDEX}&limit=${limit}`;

  try {
    const res = await fetch(url, {
      headers: {
        "OK-ACCESS-KEY": ONCHAINOS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) return [];
    const json: OnchainOSResponse<OnchainOSTx> = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

// ── Rule Enforcement Engine ─────────────────────────────────────────────────
// Evaluates pending transactions against user-defined rules before broadcast.
// Used by the server-side path that signs via the OnchainOS Agentic Wallet.

export interface RuleCheckResult {
  allowed: boolean;
  ruleFired: string | null;
  ruleId: string | null;
}

export interface SpendingRule {
  id: string;
  type: "limit" | "block" | "alert" | "schedule";
  threshold?: number;
  unit?: string;
  raw: string;
  active: boolean;
}

export function evaluateTransaction(
  tx: { value: number; to: string; token: string; gasPrice: number },
  rules: SpendingRule[]
): RuleCheckResult {
  for (const rule of rules) {
    if (!rule.active) continue;

    switch (rule.type) {
      case "limit":
      case "block":
        if (rule.threshold && tx.value > rule.threshold) {
          return {
            allowed: false,
            ruleFired: rule.raw,
            ruleId: rule.id,
          };
        }
        break;

      case "alert":
        if (
          rule.threshold &&
          rule.unit?.toLowerCase() === "eth" &&
          tx.gasPrice > rule.threshold
        ) {
          return {
            allowed: false,
            ruleFired: rule.raw,
            ruleId: rule.id,
          };
        }
        if (rule.threshold && tx.value > rule.threshold) {
          return {
            allowed: false,
            ruleFired: rule.raw,
            ruleId: rule.id,
          };
        }
        break;

      case "schedule": {
        const hour = new Date().getHours();
        if (rule.raw.toLowerCase().includes("midnight") && hour < 6) {
          return {
            allowed: false,
            ruleFired: rule.raw,
            ruleId: rule.id,
          };
        }
        break;
      }
    }
  }

  return { allowed: true, ruleFired: null, ruleId: null };
}
