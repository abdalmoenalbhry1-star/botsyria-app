export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

export type TaskStatus = 'available' | 'under_review' | 'completed' | 'rejected';

export interface TaskProofSubmission {
  taskId: string;
  taskTitle?: string;
  userId: number;
  userName: string;
  proofType: 'image' | 'text' | 'both' | 'withdrawal_receipt';
  proofImageBase64?: string;
  proofFileName?: string;
  accountUsername?: string;
  notes?: string;
  submittedAt: string;
  submittedTimestamp?: number;
  status: 'under_review' | 'approved' | 'rejected';
  auditToken?: string;
  rewardSYP?: number;
  adminDecisionNotes?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  rewardSYP: number; // Pure Syrian currency (ل.س)
  actionUrl: string;
  actionType: 'channel' | 'group' | 'bot' | 'external' | 'social';
  status: TaskStatus;
  category: 'telegram' | 'social' | 'community';
  iconType?: string;
  submittedProof?: TaskProofSubmission;
  totalSeats?: number;
  remainingSeats?: number;
}

export interface SupportTicket {
  id: string;
  userId: number;
  userName: string;
  userUsername?: string;
  category: string;
  message: string;
  timestamp: string;
  status: 'sent' | 'received' | 'replied' | 'closed';
  adminReply?: string;
  repliedAt?: string;
}

export interface SupportRequestPayload {
  userId: number;
  name: string;
  username?: string;
  category: string;
  message: string;
  timestamp: string;
}

export interface ReferralUser {
  id: number;
  name: string;
  username?: string;
  joinDate: string;
  rewardEarnedSYP: number;
}

export interface ReferralStats {
  totalReferrals: number;
  totalEarningsSYP: number;
  rewardPerReferralSYP: number;
  referralLink: string;
  invitedUsers: ReferralUser[];
}

export interface PromoCodeRecord {
  code: string;
  rewardSYP: number;
  redeemedAt: string;
}

export interface SystemPromoCodeDetails {
  code: string;
  rewardSYP: number;
  maxUses: number;
  usedCount: number;
  usedByUsers: number[];
  createdAt: string;
}

export type WithdrawalMethodType = 'syriatel_cash' | 'cham_cash';

export interface WithdrawalMethod {
  id: WithdrawalMethodType;
  name: string;
  symbol: string;
  minAmountSYP: number; // Syrian currency minimum
  rateDescription: string;
  iconType: 'syriatel' | 'cham' | 'bank' | 'wallet';
  placeholder: string;
  fieldLabel: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: number;
  userName?: string;
  userUsername?: string;
  methodId: WithdrawalMethodType;
  methodName: string;
  destinationAccount: string;
  amountSYP: number;
  fiatValue: string;
  timestamp: string;
  requestTimeMs?: number;
  processedTimeMs?: number;
  status: 'pending' | 'approved' | 'rejected';
  securityAuditToken?: string;
  securityHash?: string;
  receiptImageBase64?: string;
  receiptNotes?: string;
  adminDecisionNotes?: string;
  processedAt?: string;
}

export type AdminManagementTab = 'proofs' | 'withdrawals' | 'support' | 'add_task' | 'delete_task' | 'add_balance' | 'promo_code' | 'stats' | 'settings';

export interface TopReferrer {
  rank: number;
  userId: number;
  displayName: string;
  username?: string;
  totalReferrals: number;
  totalEarningsSYP: number;
  isVerified: boolean;
  badge: string;
  country: string;
  isCurrentUser?: boolean;
}

export type ActiveTab = 'home' | 'tasks' | 'referrals' | 'withdraw' | 'promocode' | 'support';

export interface UserProfileData {
  userId: number;
  userName: string;
  userUsername?: string;
  balanceSYP: number;
  referralsCount?: number;
  referredBy?: string;
  completedTasks?: string[];
  referralStats: ReferralStats;
  lockedTaskIds: string[];
  submittedTaskProofs: TaskProofSubmission[];
  redeemedPromoCodes: PromoCodeRecord[];
  latestWithdrawal: WithdrawalRequest | null;
  withdrawalHistory: WithdrawalRequest[];
  withdrawalTimestamps24h?: number[];
  tickets: SupportTicket[];
  captchaTimestamp: number | null;
  lastSyncedAt: number;
  taskRejectionCounts?: Record<string, number>;
  permanentlyRejectedTaskIds?: string[];
  supportMessages?: SupportTicket[];
}

export interface CloudSyncStatus {
  isCloudAvailable: boolean;
  isSynced: boolean;
  lastSyncTime: number;
  userId: number;
  syncedKeysCount: number;
  storageProvider: 'telegram_cloud' | 'local_secure' | 'hybrid';
  isSyncing?: boolean;
  lastSynced?: string | null;
  error?: string | null;
}
