import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, Trash2, Shield } from "lucide-react";
import { useWallet } from "../../contexts/WalletContext";
import { getTokenBalances, getTransactionHistory } from "../../utils/onchainos";
import type {
  Rule,
  RuleType,
  Transaction,
  TxStatus,
  WalletStats,
  ParsedRule,
} from "../../types/rules";

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function randomHex(len: number): string {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * 16)];
  return out;
}

function randomAddress(): string {
  return `0x${randomHex(40)}`;
}

function randomHash(): string {
  return `0x${randomHex(64)}`;
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function relativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ── Parser ───────────────────────────────────────────────────────────────────

function parseRule(input: string): ParsedRule {
  const lower = input.toLowerCase().trim();

  let type: RuleType = "block";
  let confidence = 0.4;

  if (/\b(block|stop|prevent|reject|deny)\b/.test(lower)) {
    type = "block";
    confidence = 0.7;
  } else if (/\b(alert|notify|warn|flag)\b/.test(lower)) {
    type = "alert";
    confidence = 0.7;
  } else if (/\b(limit|max|cap|over|exceed|more than|above)\b/.test(lower)) {
    type = "limit";
    confidence = 0.7;
  } else if (
    /\b(after|before|between|midnight|weekend|weekday|morning|evening|night)\b/.test(lower)
  ) {
    type = "schedule";
    confidence = 0.7;
  }

  let threshold: number | undefined;
  let unit: string | undefined;

  const dollarMatch = lower.match(/\$\s?([\d,.]+)/);
  const tokenMatch = lower.match(/([\d,.]+)\s*(eth|usdt|okb|usdc|btc|gwei)/i);

  if (dollarMatch) {
    threshold = parseFloat(dollarMatch[1].replace(/,/g, ""));
    unit = "USD";
  } else if (tokenMatch) {
    threshold = parseFloat(tokenMatch[1].replace(/,/g, ""));
    unit = tokenMatch[2].toUpperCase();
  }

  if (threshold !== undefined && confidence >= 0.7) {
    confidence = 0.95;
  }

  let label = input.trim();
  if (label.length > 60) label = label.slice(0, 57) + "...";

  let condition = "";
  switch (type) {
    case "block":
      condition = threshold
        ? `Block transactions over ${threshold} ${unit || "USD"}`
        : "Block matching transactions";
      break;
    case "alert":
      condition = threshold
        ? `Alert when value exceeds ${threshold} ${unit || "USD"}`
        : "Alert on matching transactions";
      break;
    case "limit":
      condition = threshold
        ? `Limit transactions to ${threshold} ${unit || "USD"}`
        : "Limit matching transactions";
      break;
    case "schedule":
      condition = "Time-based restriction";
      if (/midnight/.test(lower)) condition = "No transfers after midnight";
      if (/weekend/.test(lower)) condition = "No transfers on weekends";
      break;
  }

  if (lower.length < 5) confidence = 0.2;

  return { type, label, condition, threshold, unit, confidence };
}

// ── Rule evaluation ─────────────────────────────────────────────────────────

function evaluateRules(
  tx: { value: number; gasUsed: number; timestamp: Date },
  rules: Rule[]
): { status: TxStatus; firedRule?: Rule } {
  for (const rule of rules) {
    if (rule.status !== "active") continue;
    const lower = rule.raw.toLowerCase();

    if (
      (rule.type === "limit" || rule.type === "block") &&
      rule.threshold !== undefined
    ) {
      if (rule.unit === "USD" || !rule.unit) {
        if (tx.value > rule.threshold) {
          return { status: rule.type === "block" ? "blocked" : "alerted", firedRule: rule };
        }
      }
      if (rule.unit === "ETH" && /gas/i.test(lower)) {
        if (tx.gasUsed > rule.threshold) {
          return { status: rule.type === "block" ? "blocked" : "alerted", firedRule: rule };
        }
      }
    }

    if (rule.type === "alert" && rule.threshold !== undefined) {
      if (rule.unit === "ETH" && /gas/i.test(lower)) {
        if (tx.gasUsed > rule.threshold) return { status: "alerted", firedRule: rule };
      } else {
        if (tx.value > rule.threshold) return { status: "alerted", firedRule: rule };
      }
    }

    if (rule.type === "schedule") {
      const hour = tx.timestamp.getHours();
      if (/midnight/.test(lower) && hour >= 0 && hour < 6) {
        return { status: "blocked", firedRule: rule };
      }
      if (/weekend/.test(lower)) {
        const day = tx.timestamp.getDay();
        if (day === 0 || day === 6) return { status: "blocked", firedRule: rule };
      }
    }
  }

  return { status: "allowed" };
}

// ── Default rules ───────────────────────────────────────────────────────────

const defaultRules: Rule[] = [
  {
    id: uid(),
    raw: "block transfers over $200",
    type: "block",
    label: "block transfers over $200",
    condition: "Block transactions over 200 USD",
    threshold: 200,
    unit: "USD",
    status: "active",
    triggeredCount: 0,
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: uid(),
    raw: "alert if gas exceeds 0.01 ETH",
    type: "alert",
    label: "alert if gas exceeds 0.01 ETH",
    condition: "Alert when gas exceeds 0.01 ETH",
    threshold: 0.01,
    unit: "ETH",
    status: "active",
    triggeredCount: 0,
    createdAt: new Date(Date.now() - 43200000),
  },
  {
    id: uid(),
    raw: "no transfers after midnight",
    type: "schedule",
    label: "no transfers after midnight",
    condition: "No transfers after midnight",
    status: "active",
    triggeredCount: 0,
    createdAt: new Date(Date.now() - 3600000),
  },
];

// ── Local demo persistence ──────────────────────────────────────────────────

const STORAGE_KEYS = {
  rules: "rula.demo.rules.v1",
  transactions: "rula.demo.transactions.v1",
  auto: "rula.demo.auto.v1",
} as const;

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeRule(input: unknown): Rule | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Partial<Rule>;

  if (typeof obj.raw !== "string" || typeof obj.label !== "string" || typeof obj.condition !== "string") {
    return null;
  }

  const type: RuleType =
    obj.type === "limit" ||
    obj.type === "block" ||
    obj.type === "alert" ||
    obj.type === "schedule"
      ? obj.type
      : "block";

  const status = obj.status === "paused" || obj.status === "triggered" ? obj.status : "active";

  return {
    id: typeof obj.id === "string" ? obj.id : uid(),
    raw: obj.raw,
    type,
    label: obj.label,
    condition: obj.condition,
    threshold:
      typeof obj.threshold === "number" && Number.isFinite(obj.threshold)
        ? obj.threshold
        : undefined,
    unit: typeof obj.unit === "string" ? obj.unit : undefined,
    status,
    triggeredCount:
      typeof obj.triggeredCount === "number" && Number.isFinite(obj.triggeredCount)
        ? Math.max(0, obj.triggeredCount)
        : 0,
    createdAt: obj.createdAt ? new Date(obj.createdAt) : new Date(),
  };
}

function normalizeTransaction(input: unknown): Transaction | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Partial<Transaction>;

  if (
    typeof obj.id !== "string" ||
    typeof obj.hash !== "string" ||
    typeof obj.from !== "string" ||
    typeof obj.to !== "string" ||
    typeof obj.value !== "number" ||
    !Number.isFinite(obj.value) ||
    typeof obj.token !== "string" ||
    typeof obj.gasUsed !== "number" ||
    !Number.isFinite(obj.gasUsed)
  ) {
    return null;
  }

  const status: TxStatus =
    obj.status === "blocked" || obj.status === "alerted" ? obj.status : "allowed";

  return {
    id: obj.id,
    hash: obj.hash,
    from: obj.from,
    to: obj.to,
    value: obj.value,
    token: obj.token,
    gasUsed: obj.gasUsed,
    timestamp: obj.timestamp ? new Date(obj.timestamp) : new Date(),
    status,
    ruleId: typeof obj.ruleId === "string" ? obj.ruleId : undefined,
    ruleFired: typeof obj.ruleFired === "string" ? obj.ruleFired : undefined,
  };
}

function loadStoredRules(): Rule[] {
  if (typeof window === "undefined") return defaultRules;
  const parsed = safeParse(window.localStorage.getItem(STORAGE_KEYS.rules));
  if (!Array.isArray(parsed)) return defaultRules;

  const normalized = parsed.map(normalizeRule).filter((rule): rule is Rule => rule !== null);
  return normalized.length === parsed.length ? normalized : defaultRules;
}

function loadStoredTransactions(): Transaction[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse(window.localStorage.getItem(STORAGE_KEYS.transactions));
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map(normalizeTransaction)
    .filter((tx): tx is Transaction => tx !== null)
    .slice(0, 100);
}

function loadStoredAutoSimulate(): boolean {
  if (typeof window === "undefined") return false;
  return safeParse(window.localStorage.getItem(STORAGE_KEYS.auto)) === true;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function DemoPage() {
  const { address, balance, connected, connect, disconnect, connecting, error: walletError } = useWallet();
  const [rules, setRules] = useState<Rule[]>(() => loadStoredRules());
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadStoredTransactions());
  const [ruleInput, setRuleInput] = useState("");
  const [autoSimulate, setAutoSimulate] = useState<boolean>(() => loadStoredAutoSimulate());
  const [stats, setStats] = useState<WalletStats>({
    balance: 4827,
    totalTx: transactions.length,
    blockedTx: transactions.filter((tx) => tx.status === "blocked").length,
    savedAmount: transactions
      .filter((tx) => tx.status === "blocked")
      .reduce((sum, tx) => sum + tx.value, 0),
    rulesActive: rules.filter((rule) => rule.status === "active").length,
  });
  const [mobileTab, setMobileTab] = useState<"rules" | "simulate" | "log">("simulate");
  const [realTokens, setRealTokens] = useState<{ symbol: string; balance: string; tokenPrice: string }[]>([]);

  // Fetch real wallet data when connected
  useEffect(() => {
    if (!connected || !address) return;

    // Update balance from wallet
    if (balance) {
      const okbBalance = parseFloat(balance.balanceETH);
      setStats((s) => ({ ...s, balance: Math.round(okbBalance * 100) / 100 }));
    }

    // Fetch token balances via OnchainOS API
    getTokenBalances(address).then((tokens) => {
      if (tokens.length > 0) {
        setRealTokens(tokens.map((t) => ({ symbol: t.symbol, balance: t.balance, tokenPrice: t.tokenPrice })));
      }
    });

    // Fetch recent transaction history via OnchainOS API
    getTransactionHistory(address, 20).then((txs) => {
      if (txs.length > 0) {
        const mapped: Transaction[] = txs.map((tx) => {
          const value = parseFloat(tx.amount) || 0;
          const txResult = evaluateRules(
            { value, gasUsed: parseFloat(tx.txFee) || 0, timestamp: new Date(parseInt(tx.txTime) * 1000) },
            rules
          );
          return {
            id: tx.txHash.slice(0, 10),
            hash: tx.txHash,
            from: tx.from,
            to: tx.to,
            value,
            token: tx.symbol || "OKB",
            gasUsed: parseFloat(tx.txFee) || 0,
            timestamp: new Date(parseInt(tx.txTime) * 1000),
            status: txResult.status,
            ruleId: txResult.firedRule?.id,
            ruleFired: txResult.firedRule?.raw,
          };
        });
        setTransactions(mapped);
      }
    });
  }, [connected, address, balance, rules]);

  const parsed: ParsedRule | null =
    ruleInput.trim().length > 2 ? parseRule(ruleInput) : null;

  useEffect(() => {
    setStats((s) => ({
      ...s,
      rulesActive: rules.filter((r) => r.status === "active").length,
    }));
  }, [rules]);

  useEffect(() => {
    setStats((s) => ({
      ...s,
      totalTx: transactions.length,
      blockedTx: transactions.filter((tx) => tx.status === "blocked").length,
      savedAmount: transactions
        .filter((tx) => tx.status === "blocked")
        .reduce((sum, tx) => sum + tx.value, 0),
    }));
  }, [transactions]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.rules, JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.transactions,
      JSON.stringify(transactions.slice(0, 100))
    );
  }, [transactions]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.auto, JSON.stringify(autoSimulate));
  }, [autoSimulate]);

  const simulateTransaction = useCallback(() => {
    const tokens = ["ETH", "USDT", "OKB"];
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    const value = Math.round((Math.random() * 495 + 5) * 100) / 100;
    const gasUsed = Math.round((Math.random() * 49 + 1)) / 1000;

    const txBase = { value, gasUsed, timestamp: new Date() };
    const { status, firedRule } = evaluateRules(txBase, rules);

    const tx: Transaction = {
      id: uid(),
      hash: randomHash(),
      from: randomAddress(),
      to: randomAddress(),
      value,
      token,
      gasUsed,
      timestamp: new Date(),
      status,
      ruleId: firedRule?.id,
      ruleFired: firedRule?.raw,
    };

    if (firedRule) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === firedRule.id ? { ...r, triggeredCount: r.triggeredCount + 1 } : r
        )
      );
    }

    setTransactions((prev) => [tx, ...prev].slice(0, 100));
  }, [rules]);

  useEffect(() => {
    if (!autoSimulate) return;
    const delay = 3000 + Math.random() * 2000;
    const timer = setInterval(simulateTransaction, delay);
    return () => clearInterval(timer);
  }, [autoSimulate, simulateTransaction]);

  const addRule = () => {
    if (!parsed || ruleInput.trim().length < 3) return;
    const newRule: Rule = {
      id: uid(),
      raw: ruleInput.trim(),
      type: parsed.type,
      label: parsed.label,
      condition: parsed.condition,
      threshold: parsed.threshold,
      unit: parsed.unit,
      status: "active",
      triggeredCount: 0,
      createdAt: new Date(),
    };
    setRules((prev) => [...prev, newRule]);
    setRuleInput("");
  };

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: r.status === "active" ? "paused" : "active" } : r
      )
    );
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const clearTransactions = () => {
    setTransactions([]);
  };

  // Relative time ticker
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#F5F5F4', color: '#1C1917' }}>
      {/* ── TOP BAR ── */}
      <div className="h-14 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid #E7E5E4', paddingLeft: 24, paddingRight: 24 }}>
        <Link to="/" className="font-mono text-sm tracking-wider flex items-center gap-2" style={{ color: '#2563EB', fontWeight: 700 }}>
          <Shield size={28} strokeWidth={2.5} fill="#2563EB" color="#FFFFFF" />
          Rula
        </Link>
        <div className="flex items-center gap-3">
          {connected && address ? (
            <>
              <span className="font-mono text-[11px] text-[#3b82f6]" style={{ fontWeight: 500 }}>
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
              <span className="uppercase tracking-[0.2em] text-[9px] text-[#3b82f6]/60 border border-[#3b82f6]/20 rounded-[4px] px-3 py-0.5">
                LIVE
              </span>
              <button
                onClick={disconnect}
                className="text-[10px] text-[#44403C] hover:text-[#1C1917] transition-colors uppercase tracking-widest"
              >
                Disconnect
              </button>
            </>
          ) : (
            <>
              <span className="uppercase tracking-[0.2em] text-[9px] text-[#44403C] border border-[#D6D3D1] rounded-[4px] px-3 py-0.5">
                DEMO MODE
              </span>
              <button
                onClick={connect}
                disabled={connecting}
                style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: 6, padding: '8px 14px', cursor: 'pointer' }}
                className="text-[10px] font-medium transition-opacity disabled:opacity-50"
              >
                {connecting ? "Connecting..." : "Connect Wallet"}
              </button>
            </>
          )}
        </div>
        <Link
          to="/"
          className="text-[11px] text-[#292524] hover:text-[#1C1917] transition-colors"
        >
          Back to home
        </Link>
      </div>
      {walletError && (
        <div className="px-5 py-2 text-[11px] font-mono text-red-400/60 border-b border-[#D6D3D1]">
          {walletError}
        </div>
      )}

      {/* ── MOBILE TAB BAR ── */}
      <div className="flex lg:hidden flex-shrink-0 border-b border-[#D6D3D1]">
        {(["rules", "simulate", "log"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 uppercase tracking-widest text-[10px] transition-colors ${
              mobileTab === tab
                ? "text-[#3b82f6] border-b-2 border-[#3b82f6]"
                : "text-[#292524] border-b-2 border-transparent"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── THREE-COLUMN LAYOUT ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── LEFT PANEL: RULE BUILDER ── */}
        <aside
          className={`overflow-y-auto border-r border-[#D6D3D1] lg:block ${
            mobileTab === "rules" ? "block" : "hidden lg:block"
          }`}
          style={{ width: '30%', minWidth: 280, flexShrink: 0 }}
        >
          <div style={{ padding: '16px 20px' }}>
            {/* Header */}
            <div className="flex items-center justify-center gap-2 mb-5">
              <span className="uppercase tracking-[0.2em] text-[10px] text-[#44403C]" style={{ fontWeight: 700 }}>
                RULES
              </span>
              <span className="font-mono text-[11px] text-[#3b82f6]">
                {rules.length}
              </span>
            </div>

            {/* Terminal input */}
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#D6D3D1]">
              <span className="font-mono text-[13px] select-none text-[#3b82f6]/40">
                {">"}
              </span>
              <input
                type="text"
                value={ruleInput}
                onChange={(e) => setRuleInput(e.target.value)}
                placeholder="type a rule..."
                className="flex-1 bg-transparent font-mono text-[13px] text-[#0C0A09] placeholder:text-[#78716C] border-none outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRule();
                  }
                }}
              />
            </div>

            {/* Parse preview */}
            <AnimatePresence>
              {parsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="font-mono text-[11px] text-[#292524] p-3 space-y-0.5">
                    <div>
                      <span>type: </span>
                      <span>{parsed.type}</span>
                      {parsed.threshold !== undefined && (
                        <>
                          <span>{"  "}threshold: </span>
                          <span>
                            {parsed.unit === "USD" ? "$" : ""}
                            {parsed.threshold}
                            {parsed.unit && parsed.unit !== "USD" ? ` ${parsed.unit}` : ""}
                          </span>
                        </>
                      )}
                      <span>{"  "}confidence: </span>
                      <span
                        className={parsed.confidence >= 0.7 ? "text-[#3b82f6]" : ""}
                      >
                        {parsed.confidence.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add button */}
            <button
              onClick={addRule}
              disabled={!parsed || ruleInput.trim().length < 3}
              className="font-mono text-[11px] text-[#3b82f6]/60 uppercase tracking-widest hover:text-[#3b82f6] cursor-pointer mb-6 transition-colors disabled:opacity-20 disabled:cursor-default"
            >
              add
            </button>

            {/* Rule list */}
            <div>
              <AnimatePresence initial={false}>
                {rules.map((rule) => (
                  <motion.div
                    key={rule.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-start gap-2.5 py-3 px-4 border-b border-[#E7E5E4]"
                  >
                    {/* Status dot */}
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        rule.status === "active" ? "bg-[#3b82f6]" : "bg-[#A8A29E]"
                      }`}
                    />

                    {/* Rule content */}
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[12px] text-[#1C1917] leading-relaxed" style={{ fontWeight: 500 }}>
                        {rule.raw}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="uppercase tracking-widest text-[9px] text-[#44403C]">
                          {rule.type}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                      <span className="font-mono text-[10px] text-[#57534E] mr-1">
                        {rule.triggeredCount > 0 ? `${rule.triggeredCount}x` : ""}
                      </span>
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className="p-1 text-[#57534E] hover:text-[#292524] transition-colors"
                      >
                        {rule.status === "active" ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="p-1 text-[#57534E] hover:text-[#292524] transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </aside>

        {/* ── CENTER PANEL: SIMULATOR ── */}
        <main
          className={`flex flex-col min-w-0 lg:block ${
            mobileTab === "simulate" ? "block" : "hidden lg:block"
          }`}
          style={{ width: '40%' }}
        >
          {/* Stats row */}
          <div className="h-12 flex items-center justify-center gap-8 flex-shrink-0 border-b border-[#D6D3D1]">
            {[
              { label: connected ? "OKB" : "BALANCE", value: connected ? `${stats.balance}` : `$${stats.balance.toLocaleString()}` },
              { label: "TX", value: stats.totalTx.toString() },
              { label: "BLOCKED", value: stats.blockedTx.toString() },
              { label: "SAVED", value: connected ? `${Math.round(stats.savedAmount)} OKB` : `$${Math.round(stats.savedAmount)}` },
              ...realTokens.slice(0, 2).map((t) => ({ label: t.symbol, value: t.balance })),
            ].map((s) => (
              <div key={s.label} className="flex items-baseline">
                <span className="font-mono text-sm text-[#0C0A09]" style={{ fontWeight: 700 }}>
                  {s.value}
                </span>
                <span className="uppercase tracking-widest text-[9px] text-[#44403C] ml-1.5">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Simulator section */}
          <div className="flex-1 overflow-y-auto">
            {/* Section label */}
            <div className="pt-6 pb-3 flex justify-center">
              <span className="uppercase tracking-[0.2em] text-[10px] text-[#44403C]" style={{ fontWeight: 700 }}>
                TRANSACTION SIMULATOR
              </span>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <button
                onClick={simulateTransaction}
                className="font-mono text-[11px] uppercase tracking-widest rounded-[4px] px-4 py-1.5 transition-colors border border-[#3b82f6]/30 text-[#3b82f6]/60 hover:bg-[#3b82f6]/[0.05] hover:text-[#3b82f6]"
              >
                Simulate
              </button>
              <button
                onClick={() => setAutoSimulate(!autoSimulate)}
                className={`font-mono text-[11px] uppercase tracking-widest rounded-[4px] px-4 py-1.5 transition-colors border ${
                  autoSimulate
                    ? "border-[#3b82f6]/30 text-[#3b82f6]/60"
                    : "border-[#D6D3D1] text-[#44403C]"
                }`}
              >
                Auto{" "}
                {autoSimulate && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse ml-1 align-middle" />
                )}
              </button>
              <button
                onClick={clearTransactions}
                disabled={transactions.length === 0}
                className="font-mono text-[11px] uppercase tracking-widest rounded-[4px] px-4 py-1.5 transition-colors border border-[#D6D3D1] text-[#44403C] hover:text-[#1C1917] disabled:opacity-30 disabled:cursor-default"
              >
                Clear log
              </button>
            </div>

            {/* Transaction log */}
            <div className="pt-4 font-mono" style={{ width: '90%', margin: '0 auto' }}>
              {transactions.length === 0 ? (
                <div className="font-mono text-[11px] text-[#57534E] italic py-12 text-center">
                  no transactions yet...
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {transactions.map((tx) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center gap-2 text-[12px] py-1">
                        <span className="text-[#44403C]">
                          [{formatTime(tx.timestamp)}]
                        </span>
                        <span className="text-[#292524]">
                          {truncateHash(tx.hash)}
                        </span>
                        <span className="text-[#44403C]">{"→"}</span>
                        <span className="text-[#1C1917]">
                          {tx.value.toFixed(2)} {tx.token}
                        </span>
                        <span
                          className={
                            tx.status === "allowed"
                              ? "text-[#2563EB]"
                              : tx.status === "blocked"
                              ? "text-[#DC2626]"
                              : "text-[#2563EB]"
                          }
                          style={{ fontWeight: 600 }}
                        >
                          {tx.status.toUpperCase()}
                        </span>
                      </div>
                      {(tx.status === "blocked" || tx.status === "alerted") && tx.ruleFired && (
                        <div className="text-[11px] text-[#44403C] pb-1" style={{ paddingLeft: "12ch" }}>
                          {"↳"} rule: &quot;{tx.ruleFired}&quot;
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </main>

        {/* ── RIGHT PANEL: LIVE FEED ── */}
        <aside
          className={`overflow-y-auto border-l border-[#D6D3D1] lg:block ${
            mobileTab === "log" ? "block" : "hidden lg:block"
          }`}
          style={{ width: '30%', minWidth: 280, flexShrink: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-center py-3 border-b border-[#D6D3D1]" style={{ paddingLeft: 20, paddingRight: 20 }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse inline-block" style={{ marginRight: 8 }} />
            <span className="uppercase tracking-[0.2em] text-[10px] text-[#44403C]" style={{ fontWeight: 700 }}>
              LIVE ACTIVITY
            </span>
          </div>

          {/* Feed */}
          {transactions.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <span className="font-mono text-[11px] text-[#57534E] italic">
                waiting for transactions...
              </span>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {transactions.slice(0, 50).map((tx) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className={`border-b border-[#E7E5E4] py-3 border-l-2 ${
                    tx.status === "blocked"
                      ? "border-l-[#DC2626]"
                      : "border-l-[#2563EB]"
                  }`}
                  style={{ paddingLeft: 20, paddingRight: 20 }}
                >
                  {/* Row 1: status + time */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] uppercase tracking-widest ${
                        tx.status === "allowed" || tx.status === "alerted"
                          ? "text-[#2563EB]"
                          : "text-[#DC2626]"
                      }`}
                      style={{ fontWeight: 600 }}
                    >
                      {tx.status.toUpperCase()}
                    </span>
                    <span className="font-mono text-[10px] text-[#57534E]">
                      {relativeTime(tx.timestamp)}
                    </span>
                  </div>

                  {/* Row 2: hash + amount */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[11px] text-[#292524]">
                      {truncateHash(tx.hash)}
                    </span>
                    <span className="font-mono text-[11px] text-[#1C1917]">
                      {tx.value.toFixed(2)} {tx.token}
                    </span>
                  </div>

                  {/* Row 3: rule fired */}
                  {(tx.status === "blocked" || tx.status === "alerted") && tx.ruleFired && (
                    <div className="font-mono text-[10px] text-[#44403C] mt-1">
                      rule: &quot;{tx.ruleFired}&quot;
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </aside>
      </div>
    </div>
  );
}
