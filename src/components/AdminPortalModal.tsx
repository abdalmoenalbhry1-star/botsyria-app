import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileCheck2, 
  Banknote, 
  MessageSquare, 
  Search, 
  ExternalLink, 
  Eye, 
  Reply, 
  AlertTriangle,
  RefreshCw,
  Lock,
  Zap,
  Check,
  Smartphone,
  Wallet,
  PlusCircle,
  Trash2,
  Coins,
  Ticket,
  BarChart3,
  Settings,
  Server,
  Activity,
  Flame,
  Edit3,
  Save,
  CheckCheck
} from 'lucide-react';
import { 
  AdminManagementTab, 
  TaskProofSubmission, 
  WithdrawalRequest, 
  SupportTicket,
  Task,
  SystemPromoCodeDetails
} from '../types';
import { 
  getAdminTaskProofs, 
  fetchAdminTaskProofs,
  adminApproveProof, 
  adminRejectProof,
  getAdminWithdrawals, 
  fetchAdminWithdrawals,
  adminApproveWithdrawal, 
  adminRejectWithdrawal,
  getAdminSupportTickets, 
  fetchAdminSupportTickets,
  adminReplySupportTicket, 
  adminCloseSupportTicket,
  adminDeleteSupportTicket,
  adminDeleteAllResolvedTickets,
  getAdminPendingCounts,
  adminCreateTask,
  adminDeleteTask,
  adminEditTask,
  adminAddBalanceToUser,
  adminCreatePromoCode,
  adminDeletePromoCode,
  getSystemPromoCodesList,
  adminGetBotStats,
  getSystemSettings,
  fetchSystemSettings,
  saveSystemSettings,
  getMasterTasksCatalog,
  AdminSystemSettings,
  adminClearAllQueues
} from '../services/api';
import { triggerHaptic } from '../services/telegram';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
  tasks: Task[];
}

export function AdminPortalModal({ isOpen, onClose, onDataChanged, tasks }: AdminPortalModalProps) {
  const [activeTab, setActiveTab] = useState<AdminManagementTab>('proofs');
  
  // Data states
  const [proofs, setProofs] = useState<TaskProofSubmission[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [pendingCounts, setPendingCounts] = useState({ proofs: 0, withdrawals: 0, support: 0, total: 0 });
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const tasksCatalog = localTasks;

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const [botStats, setBotStats] = useState({
    totalUsers: 1,
    totalEarningsDistributed: 0,
    pendingWithdrawals: 0,
    approvedWithdrawals: 0,
    totalTasksCompleted: 0,
    activeTasksCount: 0,
    activePromoCodesCount: 0,
    uptime: '100% (متصل وحي - قاعدة بيانات SQLite حقيقية)',
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [ticketFilter, setTicketFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [proofTypeFilter, setProofTypeFilter] = useState<'all' | 'task' | 'receipt'>('all');

  // Interactive Action States
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [replyingTicketId, setReplyingTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);

  // Edit Task Inline State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editReward, setEditReward] = useState('2500');
  const [editLink, setEditLink] = useState('');

  // New Admin Forms States
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskReward, setNewTaskReward] = useState('2500');
  const [newTaskActionType, setNewTaskActionType] = useState<'channel' | 'group' | 'bot' | 'external' | 'social'>('channel');
  const [newTaskUrl, setNewTaskUrl] = useState('');
  const [newTaskSeats, setNewTaskSeats] = useState('1000');

  const [targetUserId, setTargetUserId] = useState('');
  const [balanceAmount, setBalanceAmount] = useState('5000');

  const [promoCodeName, setPromoCodeName] = useState('');
  const [promoCodeReward, setPromoCodeReward] = useState('10000');
  const [promoCodeMaxUses, setPromoCodeMaxUses] = useState('50');
  const [systemPromoCodes, setSystemPromoCodes] = useState<SystemPromoCodeDetails[]>([]);

  const [sysSettings, setSysSettings] = useState<AdminSystemSettings>(getSystemSettings());

  // Load all admin data
  const loadData = async () => {
    try {
      const [p, w, t, stats, settings] = await Promise.all([
        fetchAdminTaskProofs(),
        fetchAdminWithdrawals(),
        fetchAdminSupportTickets(),
        adminGetBotStats(),
        fetchSystemSettings(),
      ]);
      setProofs(p);
      setWithdrawals(w);
      setTickets(t);
      setPendingCounts(getAdminPendingCounts());
      setBotStats(stats);
      setSysSettings(settings);
      setSystemPromoCodes(getSystemPromoCodesList());
    } catch (e) {
      console.error('Failed to load admin data:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleClearAllQueues = () => {
    adminClearAllQueues();
    loadData();
    showFeedback('🗑️ تم تصفير وتفريغ جميع قوائم الإدارة (الإثباتات، السحوبات، ودعم فني) بنجاح.');
  };

  // Proof Handlers
  const handleApproveProof = async (item: TaskProofSubmission) => {
    triggerHaptic('success');
    const res = await adminApproveProof(item.auditToken || item.taskId, item.taskId, item.userId, item.rewardSYP || 2500);
    if (res.success) {
      showFeedback(`تمت الموافقة على الإثبات بنجاح! تم قيد المكافأة (${(res.rewardSYP || 2500).toLocaleString()} ل.س) للمستخدم.`);
      await loadData();
      onDataChanged?.();
    }
  };

  const handleRejectProof = async (item: TaskProofSubmission) => {
    triggerHaptic('warning');
    const ok = await adminRejectProof(item.auditToken || item.taskId, item.userId, 'الإثبات غير واضح أو لم يستوفِ شروط التحقق');
    if (ok) {
      showFeedback('تم رفض الإثبات وإشعار الحساب برفض العملية.');
      await loadData();
      onDataChanged?.();
    }
  };

  // Withdrawal Handlers
  const handleApproveWithdrawal = async (w: WithdrawalRequest) => {
    triggerHaptic('success');
    const res = await adminApproveWithdrawal(w.id, 'تم تحويل الكاش السوري بنجاح عبر البوابة المعتمدة.');
    if (res.success) {
      showFeedback(`تمت الموافقة على حوالة #${w.id} بمبلغ ${w.amountSYP.toLocaleString()} ل.س بنجاح!`);
      await loadData();
      onDataChanged?.();
    }
  };

  const handleRejectWithdrawal = async (w: WithdrawalRequest) => {
    triggerHaptic('warning');
    const res = await adminRejectWithdrawal(w.id, 'رقم الحساب غير صحيح أو فشل استقبال الحوالة في المحفظة.');
    if (res.success) {
      showFeedback(`تم رفض طلب السحب #${w.id} واسترجاع ${w.amountSYP.toLocaleString()} ل.س إلى رصيد المستخدم.`);
      await loadData();
      onDataChanged?.();
    }
  };

  // Support Reply Handlers
  const handleSendReply = async (ticketId: string) => {
    if (!replyText.trim() || isActionPending) return;
    const textToSend = replyText.trim();
    triggerHaptic('success');
    setIsActionPending(true);

    // 1. Remove ticket immediately from admin view so it never accumulates
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setReplyingTicketId(null);
    setReplyText('');

    showFeedback('⏳ جاري إرسال الرد للمستخدم في تلغرام وحذف الشكوى من لوحة الإدارة...');
    const result = await adminReplySupportTicket(ticketId, textToSend);
    setIsActionPending(false);

    showFeedback(result.message);
    loadData();
    onDataChanged?.();
  };

  const handleDeleteTicket = async (ticketId: string) => {
    triggerHaptic('warning');
    // Optimistic UI: remove immediately so tickets never accumulate
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    showFeedback('🗑️ تم حذف تذكرة الدعم نهائياً لمنع التراكم.');
    await adminDeleteSupportTicket(ticketId);
    loadData();
  };

  const handleDeleteResolvedTickets = async () => {
    triggerHaptic('warning');
    setTickets(prev => prev.filter(t => t.status !== 'replied' && t.status !== 'closed'));
    showFeedback('🗑️ تم تنظيف وحذف جميع التذاكر التي تم الرد عليها بنجاح.');
    await adminDeleteAllResolvedTickets();
    loadData();
  };

  const handleCloseTicket = (ticketId: string) => {
    triggerHaptic('light');
    adminCloseSupportTicket(ticketId);
    showFeedback('تم إغلاق تذكرة الدعم.');
    loadData();
  };

  // Task Handlers (Add, Delete, and Edit)
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskUrl.trim() || isActionPending) {
      showFeedback('⚠️ يرجى إدخال عنوان المهمة ورابط التنفيذ.');
      return;
    }
    triggerHaptic('success');
    setIsActionPending(true);
    const res = await adminCreateTask({
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || 'نفذ المهمة واحصل على مكافأتك الفورية بالليرة السورية',
      rewardSYP: Number(newTaskReward) || 2500,
      actionType: newTaskActionType,
      actionUrl: newTaskUrl.trim(),
      category: 'telegram',
      totalSeats: Number(newTaskSeats) || undefined,
    });
    setIsActionPending(false);
    showFeedback(res.message);
    if (res.success) {
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskUrl('');
      setNewTaskSeats('1000');
      loadData();
      onDataChanged?.();
    }
  };

  const handleDeleteTaskItem = async (taskId: string) => {
    triggerHaptic('warning');
    // Optimistic delete: remove from catalog immediately so user sees instant response without freezing
    setLocalTasks(prev => prev.filter(t => t.id !== taskId));
    showFeedback('🗑️ جاري حذف المهمة وسحبها من هواتف جميع المستخدمين...');
    const res = await adminDeleteTask(taskId);
    showFeedback(res.message);
    loadData();
    onDataChanged?.();
  };

  const handleStartEditTask = (t: Task) => {
    triggerHaptic('light');
    setEditingTaskId(t.id);
    setEditTitle(t.title);
    setEditReward(String(t.rewardSYP || 2500));
    setEditLink(t.actionUrl || '#');
  };

  const handleSaveTaskEdit = async (taskId: string) => {
    if (!editTitle.trim()) return;
    triggerHaptic('success');
    const newRew = Number(editReward) || 2500;
    // Optimistic update
    setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, title: editTitle, rewardSYP: newRew, actionUrl: editLink } : t));
    setEditingTaskId(null);
    showFeedback('⏳ جاري حفظ التعديل في قاعدة البيانات...');
    const res = await adminEditTask(taskId, editTitle.trim(), newRew, editLink.trim());
    showFeedback(res.message);
    loadData();
    onDataChanged?.();
  };

  const handleAddBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = Number(targetUserId);
    const amt = Number(balanceAmount);
    if (!uid || isNaN(uid) || isActionPending) {
      showFeedback('⚠️ يرجى إدخال رقم أيدي مستخدم صحيح.');
      return;
    }
    triggerHaptic('success');
    setIsActionPending(true);
    const res = await adminAddBalanceToUser(uid, amt);
    setIsActionPending(false);
    showFeedback(res.message);
    if (res.success) {
      setTargetUserId('');
      loadData();
      onDataChanged?.();
    }
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeName.trim()) {
      showFeedback('⚠️ يرجى إدخال رمز البرومو كود.');
      return;
    }
    triggerHaptic('success');
    const res = adminCreatePromoCode(
      promoCodeName.trim(), 
      Number(promoCodeReward) || 10000,
      Number(promoCodeMaxUses) || 50
    );
    showFeedback(res.message);
    if (res.success) {
      setPromoCodeName('');
      loadData();
    }
  };

  const handleDeletePromo = (code: string) => {
    triggerHaptic('medium');
    const res = adminDeletePromoCode(code);
    showFeedback(res.message);
    loadData();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('success');
    showFeedback('⏳ جاري حفظ الإعدادات في قاعدة بيانات SQLite...');
    const ok = await saveSystemSettings(sysSettings);
    if (ok) {
      showFeedback('✅ تم حفظ وتطبيق إعدادات وقيم النظام بنجاح تام في قاعدة البيانات!');
      loadData();
    } else {
      showFeedback('❌ فشل حفظ الإعدادات.');
    }
  };

  // Filtered Lists
  const filteredProofs = proofs.filter((p) => {
    if (proofTypeFilter === 'task' && p.proofType === 'withdrawal_receipt') return false;
    if (proofTypeFilter === 'receipt' && p.proofType !== 'withdrawal_receipt') return false;
    if (statusFilter === 'pending' && p.status !== 'under_review') return false;
    if (statusFilter === 'approved' && p.status !== 'approved') return false;
    if (statusFilter === 'rejected' && p.status !== 'rejected') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.userName?.toLowerCase().includes(q) ||
        p.taskTitle?.toLowerCase().includes(q) ||
        p.userId.toString().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (statusFilter === 'pending' && w.status !== 'pending') return false;
    if (statusFilter === 'approved' && w.status !== 'approved') return false;
    if (statusFilter === 'rejected' && w.status !== 'rejected') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        w.userName?.toLowerCase().includes(q) ||
        w.destinationAccount?.toLowerCase().includes(q) ||
        w.userId.toString().includes(q) ||
        w.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-[#050914] flex flex-col overflow-y-auto animate-fade-in" dir="rtl">
      <div className="relative w-full min-h-full flex flex-col bg-[#050914] overflow-x-hidden">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-sky-500/30 flex items-center justify-between bg-slate-900/90 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-sky-300 shadow-[0_0_20px_rgba(14,165,233,0.5)]">
              <ShieldAlert className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight glow-text-cyan">
                  لوحة إدارة بوت سوريا الشاملة
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-bold text-emerald-300">
                  حقيقي 100%
                </span>
              </div>
              <p className="text-xs text-slate-400">
                إدارة الإثباتات، السحوبات، المهام، الأرصدة، الأكواد، الإحصائيات والإعدادات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAllQueues}
              title="تصفير وتفريغ جميع قوائم الإدارة (صفر الآن)"
              className="px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 hover:text-white hover:bg-red-600/30 transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>تصفير الإدارة</span>
            </button>
            <button
              onClick={loadData}
              title="تحديث البيانات"
              className="p-2 rounded-xl bg-slate-800/80 border border-sky-500/30 text-sky-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {actionNotice && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-sky-500/20 border border-sky-400/60 shadow-[0_0_20px_rgba(14,165,233,0.3)] flex items-center gap-2 text-xs font-bold text-sky-200 animate-slide-down">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Navigation Tabs Bar (Scrollable grid for all admin sections) */}
        <div className="p-3 border-b border-sky-500/20 bg-[#060a17] grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 overflow-x-auto">
          {/* 1. الإثباتات */}
          <button
            onClick={() => { triggerHaptic('light'); setActiveTab('proofs'); }}
            className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'proofs'
                ? 'bg-sky-600 text-white shadow-[0_0_15px_rgba(14,165,233,0.5)] border border-sky-400'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>الإثباتات</span>
            {pendingCounts.proofs > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                {pendingCounts.proofs}
              </span>
            )}
          </button>

          {/* 2. السحوبات */}
          <button
            onClick={() => { triggerHaptic('light'); setActiveTab('withdrawals'); }}
            className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'withdrawals'
                ? 'bg-sky-600 text-white shadow-[0_0_15px_rgba(14,165,233,0.5)] border border-sky-400'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>السحوبات</span>
            {pendingCounts.withdrawals > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px]">
                {pendingCounts.withdrawals}
              </span>
            )}
          </button>

          {/* 3. الدعم */}
          <button
            onClick={() => { triggerHaptic('light'); setActiveTab('support'); }}
            className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'support'
                ? 'bg-sky-600 text-white shadow-[0_0_15px_rgba(14,165,233,0.5)] border border-sky-400'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>الدعم</span>
            {pendingCounts.support > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black text-[10px]">
                {pendingCounts.support}
              </span>
            )}
          </button>

          {/* 4. إضافة مهمة */}
          <button
            onClick={() => { triggerHaptic('light'); setActiveTab('add_task'); }}
            className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'add_task'
                ? 'bg-sky-600 text-white shadow-[0_0_15px_rgba(14,165,233,0.5)] border border-sky-400'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>إضافة مهمة</span>
          </button>

          {/* 5. حذف مهمة */}
          <button
            onClick={() => { triggerHaptic('light'); setActiveTab('delete_task'); }}
            className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'delete_task'
                ? 'bg-sky-600 text-white shadow-[0_0_15px_rgba(14,165,233,0.5)] border border-sky-400'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>حذف مهمة</span>
          </button>

          {/* 6. إضافة رصيد */}
          <button
            onClick={() => { triggerHaptic('light'); setActiveTab('add_balance'); }}
            className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'add_balance'
                ? 'bg-sky-600 text-white shadow-[0_0_15px_rgba(14,165,233,0.5)] border border-sky-400'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>إضافة رصيد</span>
          </button>

          {/* 7. برومو كود */}
          <button
            onClick={() => { triggerHaptic('light'); setActiveTab('promo_code'); }}
            className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'promo_code'
                ? 'bg-sky-600 text-white shadow-[0_0_15px_rgba(14,165,233,0.5)] border border-sky-400'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Ticket className="w-3.5 h-3.5 text-sky-400" />
            <span>برومو كود</span>
          </button>

          {/* 8. إحصائيات البوت */}
          <button
            onClick={() => { triggerHaptic('light'); setActiveTab('stats'); }}
            className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'stats'
                ? 'bg-sky-600 text-white shadow-[0_0_15px_rgba(14,165,233,0.5)] border border-sky-400'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyan-300" />
            <span>الإحصائيات</span>
          </button>

          {/* 9. تعديل القيم */}
          <button
            onClick={() => { triggerHaptic('light'); setActiveTab('settings'); }}
            className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-sky-600 text-white shadow-[0_0_15px_rgba(14,165,233,0.5)] border border-sky-400'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-purple-400" />
            <span>تعديل القيم</span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* ================= TAB 1: PROOFS ================= */}
          {activeTab === 'proofs' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث باسم المستخدم أو رقم الأيدي..."
                    className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="pending">قيد المراجعة</option>
                    <option value="approved">مقبولة</option>
                    <option value="rejected">مرفوضة</option>
                  </select>
                </div>
              </div>

              {filteredProofs.length === 0 ? (
                <div className="text-center py-16 text-slate-500 space-y-2">
                  <FileCheck2 className="w-12 h-12 mx-auto opacity-30" />
                  <p className="text-sm font-bold">لا توجد إثباتات مطابقة للبحث أو التصفية</p>
                </div>
              ) : (
                filteredProofs.map((p, index) => (
                  <div key={p.id || `proof-${index}`} className="p-4 rounded-2xl bg-slate-900/80 border border-sky-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-sky-500/20 flex items-center justify-center font-mono font-bold text-sky-400 text-xs">
                          #{p.userId}
                        </span>
                        <div>
                          <span className="font-bold text-white block text-sm">{p.userName || 'مستخدم تلجرام'}</span>
                          <span className="text-[11px] text-slate-400">{p.taskTitle || 'مهمة رسمية'}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        p.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        p.status === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {p.status === 'approved' ? 'مقبولة ✅' : p.status === 'rejected' ? 'مرفوضة ❌' : 'قيد المراجعة ⏳'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-slate-300 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                      <span>المكافأة: <strong className="text-emerald-400">+{p.rewardSYP} ل.س</strong></span>
                      <span>{p.timestamp}</span>
                    </div>

                    {p.proofImageBase64 && (
                      <div className="flex items-center gap-3">
                        <img
                          src={p.proofImageBase64}
                          alt="إثبات المستخدم"
                          className="w-16 h-16 object-cover rounded-xl border border-sky-400/40 cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => setPreviewImage(p.proofImageBase64 || null)}
                        />
                        <button
                          onClick={() => setPreviewImage(p.proofImageBase64 || null)}
                          className="text-xs text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض الصورة بالحجم الكامل</span>
                        </button>
                      </div>
                    )}

                    {p.status === 'under_review' && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleRejectProof(p)}
                          className="px-4 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500 hover:text-white transition-all text-xs font-bold cursor-pointer"
                        >
                          رفض الإثبات
                        </button>
                        <button
                          onClick={() => handleApproveProof(p)}
                          className="px-5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all text-xs font-black cursor-pointer shadow-sm"
                        >
                          موافقة وقيد المكافأة الفورية
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ================= TAB 2: WITHDRAWALS ================= */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-300 font-bold">طلبات السحب الواردة (سيريتل كاش وشام كاش)</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                >
                  <option value="all">الكل</option>
                  <option value="pending">قيد الانتظار</option>
                  <option value="approved">مقبولة ومحولة</option>
                  <option value="rejected">مرفوضة</option>
                </select>
              </div>

              {filteredWithdrawals.length === 0 ? (
                <div className="text-center py-16 text-slate-500 space-y-2">
                  <Banknote className="w-12 h-12 mx-auto opacity-30" />
                  <p className="text-sm font-bold">لا توجد طلبات سحب مطابقة</p>
                </div>
              ) : (
                filteredWithdrawals.map((w, index) => (
                  <div key={w.id || `withdrawal-${index}`} className="p-4 rounded-2xl bg-slate-900/80 border border-sky-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-sky-400 text-sm">حوالة #{w.id}</span>
                        <span className="text-xs text-slate-400 block">{w.methodName}</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        w.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        w.status === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {w.status === 'approved' ? 'تم التحويل ✅' : w.status === 'rejected' ? 'مرفوضة ❌' : 'قيد المراجعة ⏳'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                      <div>المستخدم: <strong className="text-white">#{w.userId}</strong></div>
                      <div>المبلغ المطلوب: <strong className="text-emerald-400">{w.amountSYP} ل.س</strong></div>
                      <div className="col-span-2">الحساب المُستهدف: <strong className="text-sky-300 font-mono">{w.destinationAccount}</strong></div>
                      <div className="col-span-2 text-[10px] text-slate-400">{w.timestamp}</div>
                    </div>

                    {w.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleRejectWithdrawal(w)}
                          className="px-4 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500 hover:text-white transition-all text-xs font-bold cursor-pointer"
                        >
                          رفض واسترداد الرصيد
                        </button>
                        <button
                          onClick={() => handleApproveWithdrawal(w)}
                          className="px-5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all text-xs font-black cursor-pointer shadow-sm"
                        >
                          تأكيد التحويل وإرسال الحوالة الكاش
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ================= TAB 3: SUPPORT ================= */}
          {activeTab === 'support' && (
            <div className="space-y-4 animate-fade-in">
              {/* Support Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  <button
                    onClick={() => setTicketFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      ticketFilter === 'all'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    جميع التذاكر ({tickets.length})
                  </button>
                  <button
                    onClick={() => setTicketFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      ticketFilter === 'pending'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    🔴 بانتظار الرد ({tickets.filter(t => t.status !== 'replied' && t.status !== 'closed').length})
                  </button>
                  <button
                    onClick={() => setTicketFilter('resolved')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      ticketFilter === 'resolved'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    ✅ تم الرد ({tickets.filter(t => t.status === 'replied' || t.status === 'closed').length})
                  </button>
                </div>

                {tickets.some(t => t.status === 'replied' || t.status === 'closed') && (
                  <button
                    onClick={handleDeleteResolvedTickets}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    title="حذف جميع التذاكر التي تم الرد عليها لتفريغ اللوحة ومنع التراكم"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>مسح التذاكر المكتملة</span>
                  </button>
                )}
              </div>

              {(() => {
                const filteredTickets = tickets.filter(t => {
                  if (ticketFilter === 'pending') return t.status !== 'replied' && t.status !== 'closed';
                  if (ticketFilter === 'resolved') return t.status === 'replied' || t.status === 'closed';
                  return true;
                });

                if (filteredTickets.length === 0) {
                  return (
                    <div className="text-center py-16 text-slate-500 space-y-2">
                      <MessageSquare className="w-12 h-12 mx-auto opacity-30" />
                      <p className="text-sm font-bold">لا توجد رسائل دعم فني في هذا القسم</p>
                    </div>
                  );
                }

                return filteredTickets.map((t, index) => {
                  const isReplied = t.status === 'replied' || t.status === 'closed';
                  return (
                    <div key={t.id || `ticket-${index}`} className="p-4 rounded-2xl bg-slate-900/80 border border-sky-500/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-sky-400 font-bold">تذكرة #{t.id}</span>
                          <span className="text-[11px] text-slate-400 font-mono">ID: {t.userId}</span>
                          {t.userName && <span className="text-xs text-slate-300">({t.userName})</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            isReplied 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                          }`}>
                            {isReplied ? '✅ تم الرد ومغلقة' : '🔴 بانتظار رد الإدارة'}
                          </span>
                          <button
                            onClick={() => handleDeleteTicket(t.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                            title="حذف التذكرة نهائياً لمنع التراكم"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 block font-bold">نص شكوى / استفسار المستخدم:</span>
                        <p className="text-xs text-white leading-relaxed">{t.message}</p>
                      </div>

                      {t.adminReply && (
                        <div className="text-xs bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-emerald-300 space-y-1">
                          <span className="font-bold flex items-center gap-1">
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>رد الإدارة (تم إرساله لتلغرام المستخدم):</span>
                          </span>
                          <p className="leading-relaxed">{t.adminReply}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleDeleteTicket(t.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف الشكوى</span>
                        </button>

                        {replyingTicketId === t.id ? (
                          <div className="space-y-2 w-full">
                            <textarea
                              rows={3}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="اكتب ردك الرسمي هنا (سيصل فوراً كإشعار رسالة خاصة للمستخدم في تلغرام)..."
                              className="w-full p-2.5 rounded-xl bg-slate-950 border border-sky-400 text-white text-xs"
                              disabled={isActionPending}
                            />
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setReplyingTicketId(null)} 
                                disabled={isActionPending}
                                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
                              >
                                إلغاء
                              </button>
                              <button 
                                onClick={() => handleSendReply(t.id)} 
                                disabled={isActionPending || !replyText.trim()}
                                className="px-4 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                              >
                                <Reply className="w-3.5 h-3.5" />
                                <span>{isActionPending ? 'جاري الإرسال...' : 'إرسال الرد لتلغرام'}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setReplyingTicketId(t.id); setReplyText(t.adminReply || ''); }}
                            className="px-4 py-1.5 rounded-xl bg-sky-500/20 border border-sky-400 text-sky-300 hover:bg-sky-500 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Reply className="w-3.5 h-3.5" />
                            <span>{isReplied ? 'تعديل أو إعادة الرد' : 'الرد على التذكرة'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* ================= TAB 4: ADD TASK ================= */}
          {activeTab === 'add_task' && (
            <div className="max-w-xl mx-auto p-5 rounded-2xl bg-slate-900/90 border border-sky-500/30 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">إضافة مهمة جديدة للبوت (فوري وحقيقي في SQLite)</h3>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3.5">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">عنوان المهمة</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="مثال: انضم لقناة سوريا الرسمية على تليجرام"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">وصف المهمة</label>
                  <textarea
                    rows={2}
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="اشترك في القناة وتأكد من البقاء فيها لكسب المكافأة"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">المكافأة (ل.س)</label>
                    <input
                      type="number"
                      value={newTaskReward}
                      onChange={(e) => setNewTaskReward(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-sky-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">نوع التنفيذ (Action Type)</label>
                    <select
                      value={newTaskActionType}
                      onChange={(e) => setNewTaskActionType(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                    >
                      <option value="channel">قناة (Channel)</option>
                      <option value="group">مجموعة (Group)</option>
                      <option value="bot">بوت (Bot)</option>
                      <option value="external">رابط خارجي (External)</option>
                      <option value="social">مواقع التواصل (Social)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">عدد المقاعد</label>
                    <input
                      type="number"
                      value={newTaskSeats}
                      onChange={(e) => setNewTaskSeats(e.target.value)}
                      placeholder="1000"
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">رابط التنفيذ (Action URL)</label>
                  <input
                    type="url"
                    value={newTaskUrl}
                    onChange={(e) => setNewTaskUrl(e.target.value)}
                    placeholder="https://t.me/SyriaBotOfficial"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-sky-400"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isActionPending}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 font-black text-xs hover:from-emerald-500 hover:to-teal-400 transition-all cursor-pointer shadow-lg mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{isActionPending ? 'جاري النشر في قاعدة البيانات...' : 'نشر المهمة فوراً لجميع المستخدمين'}</span>
                </button>
              </form>
            </div>
          )}

          {/* ================= TAB 5: DELETE & MANAGE TASKS ================= */}
          {activeTab === 'delete_task' && (
            <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
              <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-300 font-bold">إدارة وتعديل وحذف المهام (تطبيق فوري في SQLite وسحب من الهواتف)</span>
                <span className="text-xs font-mono text-sky-400 font-bold">{tasksCatalog.length} مهام</span>
              </div>

              {tasksCatalog.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <p className="text-sm font-bold">لا توجد مهام نشطة حالياً</p>
                </div>
              ) : (
                tasksCatalog.map((t, index) => {
                  const isEditing = editingTaskId === t.id;
                  return (
                    <div key={t.id || `task-${index}`} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                      {isEditing ? (
                        <div className="space-y-3 bg-slate-950 p-3.5 rounded-xl border border-sky-500/40">
                          <span className="text-xs text-sky-400 font-bold block">✏️ تعديل بيانات المهمة #{t.id}:</span>
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">عنوان المهمة:</label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] text-slate-400 block mb-1">المكافأة (ل.س):</label>
                              <input
                                type="number"
                                value={editReward}
                                onChange={(e) => setEditReward(e.target.value)}
                                className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-400 block mb-1">رابط التنفيذ:</label>
                              <input
                                type="url"
                                value={editLink}
                                onChange={(e) => setEditLink(e.target.value)}
                                className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              onClick={() => setEditingTaskId(null)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                            >
                              إلغاء
                            </button>
                            <button
                              onClick={() => handleSaveTaskEdit(t.id)}
                              className="px-4 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>حفظ التعديل</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-bold text-white text-sm truncate">{t.title}</h4>
                            <p className="text-xs text-slate-400 truncate">{t.description}</p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] font-mono">
                              <span className="text-emerald-400 font-bold">+{t.rewardSYP?.toLocaleString()} ل.س</span>
                              <span className="text-slate-500">|</span>
                              <span className="text-sky-300 truncate max-w-[200px]">{t.actionUrl}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleStartEditTask(t)}
                              className="px-3 py-2 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-300 hover:bg-sky-500 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>
                            <button
                              onClick={() => handleDeleteTaskItem(t.id)}
                              className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ================= TAB 6: ADD BALANCE ================= */}
          {activeTab === 'add_balance' && (
            <div className="max-w-xl mx-auto p-5 rounded-2xl bg-slate-900/90 border border-sky-500/30 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <Coins className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">إضافة / خصم رصيد لمستخدم عبر رقم الأيدي (User ID)</h3>
              </div>

              <form onSubmit={handleAddBalance} className="space-y-3.5">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">رقم الأيدي (Telegram User ID)</label>
                  <input
                    type="number"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    placeholder="مثال: 948172901"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-sky-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">المبلغ بالليرة السورية (اكتب قيمة سالبة لخصم الرصيد)</label>
                  <input
                    type="number"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    placeholder="مثال: 5000 أو -1000"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-sky-400"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs hover:from-amber-400 hover:to-yellow-300 transition-all cursor-pointer shadow-lg mt-2 flex items-center justify-center gap-2"
                >
                  <Coins className="w-4 h-4" />
                  <span>تحديث رصيد المستخدم فوراً في التخزين السحابي</span>
                </button>
              </form>
            </div>
          )}

          {/* ================= TAB 7: PROMO CODE ================= */}
          {activeTab === 'promo_code' && (
            <div className="max-w-xl mx-auto space-y-4 animate-fade-in">
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-sky-500/30 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                  <Ticket className="w-5 h-5 text-sky-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">إنشاء كود برومو (Promo Code) جديد</h3>
                    <p className="text-[11px] text-slate-400">حدد عدد الأشخاص والمكافأة ليختفي الكود تلقائياً بعد استنفاده</p>
                  </div>
                </div>

                <form onSubmit={handleCreatePromo} className="space-y-3.5">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">رمز البرومو (مثال: DAMASCUS2026)</label>
                    <input
                      type="text"
                      value={promoCodeName}
                      onChange={(e) => setPromoCodeName(e.target.value)}
                      placeholder="RAMADAN2026"
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono uppercase focus:outline-none focus:border-sky-400"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">المكافأة (ل.س SYP)</label>
                      <input
                        type="number"
                        value={promoCodeReward}
                        onChange={(e) => setPromoCodeReward(e.target.value)}
                        placeholder="10000"
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-sky-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block mb-1">عدد الأشخاص المسموح لهم</label>
                      <input
                        type="number"
                        value={promoCodeMaxUses}
                        onChange={(e) => setPromoCodeMaxUses(e.target.value)}
                        placeholder="50"
                        min="1"
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-sky-400"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 text-white font-black text-xs hover:from-sky-500 hover:to-cyan-400 transition-all cursor-pointer shadow-lg mt-2 flex items-center justify-center gap-2"
                  >
                    <Ticket className="w-4 h-4" />
                    <span>تفعيل الكود وإتاحته للاستخدام الفوري</span>
                  </button>
                </form>
              </div>

              {/* Active System Promo Codes List */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>أكواد البرومو النشطة بالنظام ({systemPromoCodes.length})</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">تختفي عند اكتمال العدد</span>
                </div>

                {systemPromoCodes.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">لا يوجد أكواد برومو نشطة حالياً.</p>
                ) : (
                  <div className="space-y-2">
                    {systemPromoCodes.map((p) => (
                      <div
                        key={p.code}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black font-mono text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded-md border border-sky-500/30">
                              {p.code}
                            </span>
                            <span className="text-xs font-bold text-emerald-400 font-mono">
                              +{p.rewardSYP.toLocaleString()} ل.س
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span>
                              الاستخدام: <strong className="text-amber-300 font-mono">{p.usedCount || 0}</strong> / <strong className="text-slate-200 font-mono">{p.maxUses}</strong> شخص
                            </span>
                            {p.createdAt && <span>• {p.createdAt}</span>}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeletePromo(p.code)}
                          className="py-1.5 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-colors cursor-pointer shrink-0"
                        >
                          حذف الكود
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 8: STATS ================= */}
          {activeTab === 'stats' && (
            <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-sky-500/30 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>إجمالي المستخدمين</span>
                    <BarChart3 className="w-4 h-4 text-sky-400" />
                  </div>
                  <span className="text-2xl font-black text-white font-mono">{botStats.totalUsers.toLocaleString()}</span>
                  <span className="text-[10px] text-emerald-400 block">🟢 متصل ومحفوظ سحابياً</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-sky-500/30 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>الأرباح الموزعة والمصحوبة</span>
                    <Coins className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-2xl font-black text-emerald-400 font-mono">{botStats.totalEarningsDistributed.toLocaleString()} ل.س</span>
                  <span className="text-[10px] text-slate-400 block">مدفوعات الكاش السوري</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-sky-500/30 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>طلبات السحب المعلقة</span>
                    <Clock className="w-4 h-4 text-amber-300" />
                  </div>
                  <span className="text-2xl font-black text-amber-300 font-mono">{botStats.pendingWithdrawals}</span>
                  <span className="text-[10px] text-slate-400 block">بانتظار موافقة الإدارة</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-sky-500/30 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>طلبات السحب المقبولة</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-2xl font-black text-white font-mono">{botStats.approvedWithdrawals}</span>
                  <span className="text-[10px] text-emerald-400 block">تم تحويلها بنجاح</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-sky-500/30 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>المهام المنجزة</span>
                    <FileCheck2 className="w-4 h-4 text-sky-400" />
                  </div>
                  <span className="text-2xl font-black text-white font-mono">{botStats.totalTasksCompleted}</span>
                  <span className="text-[10px] text-slate-400 block">مهام موثقة</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-sky-500/30 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>المهام النشطة حالياً</span>
                    <Zap className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="text-2xl font-black text-white font-mono">{botStats.activeTasksCount}</span>
                  <span className="text-[10px] text-slate-400 block">متاحة للمستخدمين</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <span>استقرار الخادم وحالة النظام:</span>
                </span>
                <span className="font-mono text-emerald-400 font-bold">{botStats.uptime}</span>
              </div>
            </div>
          )}

          {/* ================= TAB 9: SETTINGS ================= */}
          {activeTab === 'settings' && (
            <div className="max-w-xl mx-auto p-5 rounded-2xl bg-slate-900/90 border border-sky-500/30 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <Settings className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">تعديل جميع قيم وإعدادات البوت والعملات</h3>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-3.5">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">مكافأة المهمة الافتراضية (ل.س)</label>
                  <input
                    type="number"
                    value={sysSettings.defaultTaskRewardSYP}
                    onChange={(e) => setSysSettings({ ...sysSettings, defaultTaskRewardSYP: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">الحد الأدنى للسحب (ل.س)</label>
                  <input
                    type="number"
                    value={sysSettings.minWithdrawalSYP}
                    onChange={(e) => setSysSettings({ ...sysSettings, minWithdrawalSYP: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">مكافأة الإحالة لكل صديق (ل.س)</label>
                  <input
                    type="number"
                    value={sysSettings.referralRewardSYP}
                    onChange={(e) => setSysSettings({ ...sysSettings, referralRewardSYP: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">نص إعلان شريط الترحيب العلوي</label>
                  <input
                    type="text"
                    value={sysSettings.announcementBanner}
                    onChange={(e) => setSysSettings({ ...sysSettings, announcementBanner: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                    required
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-white font-bold">وضع الصيانة العامة للبوت (Maintenance Mode)</span>
                  <input
                    type="checkbox"
                    checked={sysSettings.botMaintenanceMode}
                    onChange={(e) => setSysSettings({ ...sysSettings, botMaintenanceMode: e.target.checked })}
                    className="w-4 h-4 accent-sky-500 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-black text-xs hover:from-purple-500 hover:to-indigo-400 transition-all cursor-pointer shadow-lg mt-2 flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>حفظ وتطبيق التعديلات على البوت فوراً</span>
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-sky-500/20 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>نظام الإدارة متصل ومتزامن 100% بدون أي بيانات وهمية</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Image Full-Screen Modal Preview */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] p-2 rounded-2xl bg-slate-900 border border-sky-500/60 shadow-[0_0_40px_rgba(14,165,233,0.8)] overflow-hidden">
            <img
              src={previewImage}
              alt="معاينة الإثبات بالحجم الكامل"
              className="max-h-[78vh] w-auto object-contain rounded-xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 left-4 p-2 rounded-full bg-black/70 text-white hover:bg-black transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
