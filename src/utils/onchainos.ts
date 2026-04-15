import { ethers } from "ethers";

// ── OnchainOS Configuration ─────────────────────────────────────────────────

const ONCHAINOS_API_KEY = import.meta.env.VITE_ONCHAINOS_API_KEY ?? "";
const ONCHAINOS_BASE = "https://web3.okx.com/api/v6/dex";

// X Layer mainnet
export const XLAYER_CHAIN_INDEX = "196";
export const XLAYER_RPC = "https://rpc.xlayer.tech";
export const XLAYER_CHAIN_ID = 196;
export const XLAYER_EXPLORER = "https://www.okx.com/web3/explorer/xlayer";

// ── Provider ─────────────────────────────────────────────────────────────────

let _provider: ethers.JsonRpcProvider | null = null;

export function getXLayerProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(XLAYER_RPC, {
      chainId: XLAYER_CHAIN_ID,
      name: "xlayer",
    });
  }
  return _provider;
}

// ── Wallet Balance (direct RPC — no HMAC needed) ────────────────────────────

export interface WalletBalance {
  address: string;
  balanceETH: string;
  balanceWei: bigint;
}

export async function getWalletBalance(
  address: string
): Promise<WalletBalance> {
  const provider = getXLayerProvider();
  const balanceWei = await provider.getBalance(address);
  return {
    address,
    balanceETH: ethers.formatEther(balanceWei),
    balanceWei,
  };
}

// ── Transaction Status (direct RPC) ─────────────────────────────────────────

export interface TxReceipt {
  hash: string;
  status: "success" | "failed" | "pending";
  blockNumber: number | null;
  gasUsed: string;
  from: string;
  to: string | null;
}

export async function getTransactionStatus(
  txHash: string
): Promise<TxReceipt> {
  const provider = getXLayerProvider();
  const receipt = await provider.getTransactionReceipt(txHash);

  if (!receipt) {
    return {
      hash: txHash,
      status: "pending",
      blockNumber: null,
      gasUsed: "0",
      from: "",
      to: null,
    };
  }

  return {
    hash: txHash,
    status: receipt.status === 1 ? "success" : "failed",
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    from: receipt.from,
    to: receipt.to,
  };
}

// ── OnchainOS API (requires HMAC — used when server-side proxy is available) ─

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

// ── Transaction History via OnchainOS ────────────────────────────────────────

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
// Evaluates pending transactions against user-defined rules before broadcast

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
        // "after midnight" = between 0:00 and 6:00
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

// ── Agentic Wallet Integration ──────────────────────────────────────────────
// Wraps ethers.Wallet for X Layer with rule enforcement pre-check

export function createAgenticSigner(
  privateKey: string
): ethers.Wallet {
  const provider = getXLayerProvider();
  return new ethers.Wallet(privateKey, provider);
}

export async function sendGuardedTransaction(
  signer: ethers.Wallet,
  to: string,
  valueEth: string,
  rules: SpendingRule[]
): Promise<{ hash: string; status: "sent" | "blocked"; ruleFired?: string }> {
  const valueWei = ethers.parseEther(valueEth);
  const valueNum = parseFloat(valueEth);

  // Get gas price for rule evaluation
  const provider = getXLayerProvider();
  const feeData = await provider.getFeeData();
  const gasPriceGwei = feeData.gasPrice
    ? parseFloat(ethers.formatUnits(feeData.gasPrice, "gwei"))
    : 0;

  // Pre-check against spending rules
  const check = evaluateTransaction(
    {
      value: valueNum,
      to,
      token: "OKB",
      gasPrice: gasPriceGwei / 1e9, // convert to ETH for comparison
    },
    rules
  );

  if (!check.allowed) {
    return {
      hash: "",
      status: "blocked",
      ruleFired: check.ruleFired ?? undefined,
    };
  }

  // Transaction passes all rules — send it
  const tx = await signer.sendTransaction({
    to,
    value: valueWei,
  });

  return { hash: tx.hash, status: "sent" };
}
