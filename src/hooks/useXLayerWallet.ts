import { useState, useCallback } from "react";
import { ethers } from "ethers";
import {
  getWalletBalance,
  XLAYER_CHAIN_ID,
  type WalletBalance,
} from "../utils/onchainos";

interface XLayerWalletState {
  address: string | null;
  balance: WalletBalance | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
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
    const ethereum = (window as unknown as Record<string, unknown>).ethereum as
      | ethers.Eip1193Provider
      | undefined;
    if (!ethereum) {
      setState((s) => ({
        ...s,
        error: "No wallet detected. Install OKX Wallet or MetaMask.",
      }));
      return;
    }

    setState((s) => ({ ...s, connecting: true, error: null }));

    try {
      const provider = new ethers.BrowserProvider(ethereum);

      // Request X Layer network switch
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${XLAYER_CHAIN_ID.toString(16)}` }],
        });
      } catch {
        // Chain not added — add it
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${XLAYER_CHAIN_ID.toString(16)}`,
              chainName: "X Layer",
              nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
              rpcUrls: ["https://rpc.xlayer.tech"],
              blockExplorerUrls: [
                "https://www.okx.com/web3/explorer/xlayer",
              ],
            },
          ],
        });
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // Fetch balance from X Layer RPC
      const balance = await getWalletBalance(address);

      setState({
        address,
        balance,
        connected: true,
        connecting: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        connecting: false,
        error: err instanceof Error ? err.message : "Connection failed",
      }));
    }
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
      const balance = await getWalletBalance(state.address);
      setState((s) => ({ ...s, balance }));
    } catch {
      // silent fail on refresh
    }
  }, [state.address]);

  return { ...state, connect, disconnect, refreshBalance };
}
