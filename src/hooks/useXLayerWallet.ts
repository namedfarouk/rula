import { useState, useCallback } from "react";
import { getTokenBalances, type WalletBalance } from "../utils/onchainos";

// The Agentic Wallet address Rula monitors. Signing happens server-side via
// the OnchainOS API — there is no browser wallet popup involved.
const AGENTIC_WALLET_ADDRESS =
  (import.meta.env.VITE_AGENTIC_WALLET_ADDRESS as string | undefined) ?? "";

interface XLayerWalletState {
  address: string | null;
  balance: WalletBalance | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

function toWei(decimal: string): bigint {
  // Convert a decimal string (e.g. "1.23") to wei as BigInt without pulling in
  // a signer library. Safe for up to 18 decimals of precision.
  const [whole, frac = ""] = decimal.split(".");
  const fracPadded = (frac + "000000000000000000").slice(0, 18);
  const cleaned = `${whole || "0"}${fracPadded}`.replace(/^0+(?=\d)/, "");
  try {
    return BigInt(cleaned || "0");
  } catch {
    return 0n;
  }
}

export function useXLayerWallet() {
  const [state, setState] = useState<XLayerWalletState>({
    address: null,
    balance: null,
    connected: false,
    connecting: false,
    error: null,
  });

  const connect = useCallback(async () => {
    if (!AGENTIC_WALLET_ADDRESS) {
      setState((s) => ({
        ...s,
        error: "Agentic Wallet address not configured (VITE_AGENTIC_WALLET_ADDRESS).",
      }));
      return;
    }

    setState((s) => ({ ...s, connecting: true, error: null }));

    // Pull real balance from OnchainOS — no browser wallet, no signature request.
    let balanceETH = "0";
    let balanceWei = 0n;
    try {
      const tokens = await getTokenBalances(AGENTIC_WALLET_ADDRESS);
      const okb = tokens.find((t) => t.symbol?.toUpperCase() === "OKB");
      if (okb?.balance) {
        balanceETH = okb.balance;
        balanceWei = toWei(okb.balance);
      }
    } catch {
      // silent — we still link even if the balance lookup fails
    }

    setState({
      address: AGENTIC_WALLET_ADDRESS,
      balance: { address: AGENTIC_WALLET_ADDRESS, balanceETH, balanceWei },
      connected: true,
      connecting: false,
      error: null,
    });
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      balance: null,
      connected: false,
      connecting: false,
      error: null,
    });
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!state.address) return;
    try {
      const tokens = await getTokenBalances(state.address);
      const okb = tokens.find((t) => t.symbol?.toUpperCase() === "OKB");
      if (okb?.balance) {
        setState((s) => ({
          ...s,
          balance: {
            address: state.address!,
            balanceETH: okb.balance,
            balanceWei: toWei(okb.balance),
          },
        }));
      }
    } catch {
      // silent
    }
  }, [state.address]);

  return { ...state, connect, disconnect, refreshBalance };
}
