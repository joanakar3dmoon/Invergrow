export type TransactionType = 'WITHDRAWAL' | 'DEPOSIT' | 'PAYROLL' | 'AI_REVENUE_WITHDRAW' | 'AI_REINVEST';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number; // in Euros
  date: string;
  reference: string;
  description: string;
  gateway?: 'STRIPE' | 'CUSTOM' | 'INTERNAL' | 'AI_ENGINE';
}

export interface Collaborator {
  id: string;
  name: string;
  role: string;
  wage: number; // monthly salary in Euros
  lastPaymentDate: string; // YYYY-MM-DD format
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  type: string;
  status: 'SUCCESS' | 'ERROR';
  payload: any;
  message: string;
}

export interface AIWorker {
  id: string;
  name: string;
  role: string;
  status: 'ACTIVE' | 'IDLE' | 'UPGRADING';
  level: number;
  model: string;
  baseIncomeRate: number; // income per simulation tick/minute
  unlocked: boolean;
  costToUnlock: number;
  costToUpgrade: number;
  totalGenerated: number;
  icon: string;
}

export interface AILog {
  id: string;
  timestamp: string;
  workerName: string;
  action: string;
  revenue: number;
  details: string;
}

export interface APIConfig {
  geminiConnected: boolean;
  distributionWebhook: string;
  targetMarket: string;
  payoutModel: 'SPLIT_70_30' | '100_REINVEST' | '100_WITHDRAW';
}

export interface SystemState {
  balance: number;
  investedCapital: number;
  totalWithdrawals: number;
  reinvestmentFund: number;
  netGains: number;
  collaborators: Collaborator[];
  transactions: Transaction[];
  webhookLogs: WebhookLog[];
  aiWorkers: AIWorker[];
  aiLogs: AILog[];
  apiConfig: APIConfig;
}

