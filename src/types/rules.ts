export type RuleType = "limit" | "block" | "alert" | "schedule" | "whitelist";
export type RuleStatus = "active" | "paused" | "triggered";

export interface Rule {
  id: string;
  raw: string; // plain English input
  type: RuleType;
  label: string;
  condition: string;
  threshold?: number;
  unit?: string;
  status: RuleStatus;
  triggeredCount: number;
  createdAt: Date;
}

export type TxStatus = "allowed" | "blocked" | "alerted";

export interface Transaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: number;
  token: string;
  gasUsed: number;
  timestamp: Date;
  status: TxStatus;
  ruleId?: string;
  ruleFired?: string;
}

export interface WalletStats {
  balance: number;
  totalTx: number;
  blockedTx: number;
  savedAmount: number;
  rulesActive: number;
}

export interface ParsedRule {
  type: RuleType;
  label: string;
  condition: string;
  threshold?: number;
  unit?: string;
  confidence: number;
}
