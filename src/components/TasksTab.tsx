import { useState, useRef, ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { Task, TelegramUser } from '../types';
import {
  Sparkles,
  Send,
  ExternalLink,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  MessageCircle,
  Video,
  Send as TelegramIcon,
  RefreshCw,
  Eye,
  ImageIcon,
  Users,
  UserCheck
} from 'lucide-react';
import { triggerHaptic, openExternalLink } from '../services/telegram';
import { submitTaskProof, isTaskLocked, isTaskUnderReview } from '../services/api';

interface TasksTabProps {
  user: TelegramUser;
  tasks: Task[];
  onTaskUpdated: (taskId: string, rewardSYP: number) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function TasksTab({
  user,
  tasks,
  onTaskUpdated,
  onRefresh,
  isLoading,
}: TasksTabProps) {
  const [activeTabFilter, setActiveTabFilter] = useState<'available' | 'under_review'>('available');
  const [selectedTaskForProof, setSelectedTaskForProof] = useState<Task | null>(null);

  // Proof form inputs
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState('');
  const [proofAccountUsername, setProofAccountUsername] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getTaskIcon = (iconType?: string) => {
    switch (iconType) {
      case 'telegram':
        return <TelegramIcon className="w-5 h-5 text-sky-400" />;
      case 'youtube':
        return <Video className="w-5 h-5 text-rose-400" />;
      case 'tiktok':
        return <MessageCircle className="w-5 h-5 text-cyan-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-sky-400" />;
    }
  };

  // Open task link directly
  const handleExecuteOnly = (task: Task) => {
    triggerHaptic('medium');
    if (task.actionUrl && task.actionUrl !== '#') {
      openExternalLink(task.actionUrl);
    }
  };

  // Open Proof Modal
  const handleOpenProofModal = (task: Task) => {
    triggerHaptic('medium');

    if (isTaskLocked(task.id, user.id) || task.status === 'under_review' || task.status === 'completed' || task.submittedProof?.status === 'approved') {
      triggerHaptic('error');
      showToast('⚠️ تم إرسال إثبات لهذه المهمة مسبقاً ولا يمكن تكرارها.', 'error');
      return;
    }

    setSelectedTaskForProof(task);
    setProofImage(null);
    setProofFileName('');
    setProofNotes('');
    setCooldownSeconds(0);

    if (user.username) {
      setProofAccountUsername(`@${user.username}`);
    } else if (user.id) {
      setProofAccountUsername(`ID: ${user.id}`);
    }
  };

  // Image Upload handler with automatic canvas compression (under 150KB for fast & reliable sending)
  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('يرجى اختيار ملف صورة صالح (JPG, PNG)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        // Compress image to max 1000px dimension and JPEG 0.72 quality
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1000;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
          setProofImage(compressedDataUrl);
          setProofFileName(file.name || 'screenshot.jpg');
          triggerHaptic('light');
        } else {
          setProofImage(readerEvent.target?.result as string);
          setProofFileName(file.name);
        }
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Submit Proof to Admin
  const handleSubmitProof = async () => {
    if (!selectedTaskForProof) return;

    if (isTaskLocked(selectedTaskForProof.id, user.id)) {
      triggerHaptic('error');
      showToast('⚠️ تم تقديم هذه المهمة مسبقاً!', 'error');
      setSelectedTaskForProof(null);
      return;
    }

    const finalAccountUsername = proofAccountUsername.trim() || (user.username ? `@${user.username}` : `ID: ${user.id}`);

    if (!proofImage && !proofAccountUsername.trim() && !proofNotes.trim()) {
      triggerHaptic('warning');
      showToast('يرجى إرفاق لقطة شاشة للإثبات أو كتابة يوزر حسابك أو ملاحظاتك', 'error');
      return;
    }

    triggerHaptic('medium');
    setIsSubmittingProof(true);

    try {
      const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'مستخدم تلجرام';
      const proofType = proofImage && finalAccountUsername ? 'both' : proofImage ? 'image' : 'text';

      const result = await submitTaskProof(
        selectedTaskForProof.id,
        { id: user.id, name: displayName },
        {
          proofType,
          proofImageBase64: proofImage || undefined,
          proofFileName: proofFileName || undefined,
          accountUsername: finalAccountUsername,
          notes: proofNotes.trim(),
        }
      );

      if (result.success) {
        triggerHaptic('success');
        onTaskUpdated(selectedTaskForProof.id, 0);
        showToast('تم إرسال الإثبات بنجاح وهو الآن قيد المراجعة', 'success');
        setSelectedTaskForProof(null);
        setActiveTabFilter('under_review');
      } else {
        triggerHaptic('error');
        showToast(result.message, 'error');
      }
    } catch {
      triggerHaptic('error');
      showToast('حدث خطأ أثناء إرسال الإثبات، يرجى المحاولة ثانية', 'error');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  /**
   * Filter Rules requested by user:
   * 1. Available tasks:
   *    - Must be status === 'available'
   *    - Must not be locked
   *    - Seats must NOT be finished (remainingSeats > 0 or undefined). IF SEATS END, DISAPPEARS!
   *    - Must not be approved or completed. IF APPROVED, DISAPPEARS!
   * 2. Under Review tasks:
   *    - Must be actively under review (status === 'under_review' or locked with pending proof)
   *    - MUST NOT be approved. ON APPROVAL, DISAPPEARS FROM UNDER REVIEW AS WELL!
   */
  const availableTasks = tasks.filter((t) => {
    // If seats ended, task disappears!
    if (t.remainingSeats !== undefined && t.remainingSeats <= 0) {
      return false;
    }
    // If completed or approved, task disappears!
    if (t.status === 'completed' || t.submittedProof?.status === 'approved') {
      return false;
    }
    // If under review or locked, it's not available
    if (isTaskUnderReview(t.id) || t.status === 'under_review' || isTaskLocked(t.id, user.id)) {
      return false;
    }
    return t.status === 'available';
  });

  const underReviewTasks = tasks.filter((t) => {
    // If completed or approved, task moves out of under review!
    if (t.status === 'completed' || t.submittedProof?.status === 'approved') {
      return false;
    }
    // Strictly show only tasks actively pending review
    return isTaskUnderReview(t.id) || t.status === 'under_review';
  });

  return (
    <div id="tasks-tab-content" className="w-full pb-28 pt-2 px-4 max-w-md mx-auto space-y-3.5">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          id="tasks-toast"
          className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md animate-in fade-in duration-150 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-500/40'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border border-rose-500/40'
              : 'bg-slate-900/90 text-slate-200 border border-sky-500/30'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="flex-1">{toastMessage.text}</span>
        </div>
      )}

      {/* Clean Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>المهام اليومية</span>
            <span className="text-[10px] text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded-full border border-sky-500/30">
              أرباح بالليرة
            </span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            نفّذ المهمة وأرسل الإثبات لتضاف أرباحك مباشرة
          </p>
        </div>

        <button
          id="refresh-tasks-btn"
          onClick={() => {
            triggerHaptic('light');
            onRefresh();
          }}
          disabled={isLoading}
          className="p-2 text-sky-400 hover:text-white bg-sky-500/10 hover:bg-sky-500/20 rounded-xl border border-sky-500/20 transition-colors cursor-pointer"
          title="تحديث المهام"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Clean Tabs: Available vs Under Review */}
      <div id="tasks-filter-tabs" className="grid grid-cols-2 gap-2 text-xs">
        <motion.button
          id="tab-available-tasks"
          onClick={() => {
            triggerHaptic('light');
            setActiveTabFilter('available');
          }}
          whileTap={{ scale: 0.95 }}
          className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTabFilter === 'available'
              ? 'bg-sky-500 text-slate-950 shadow-sm'
              : 'bg-[#0d1629] text-slate-300 hover:bg-[#13203c] border border-sky-500/20'
          }`}
        >
          <span>المهام المتاحة</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-900/30 text-[10px] font-mono">
            {availableTasks.length}
          </span>
        </motion.button>

        <motion.button
          id="tab-under-review-tasks"
          onClick={() => {
            triggerHaptic('light');
            setActiveTabFilter('under_review');
          }}
          whileTap={{ scale: 0.95 }}
          className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTabFilter === 'under_review'
              ? 'bg-sky-500 text-slate-950 shadow-sm'
              : 'bg-[#0d1629] text-slate-300 hover:bg-[#13203c] border border-sky-500/20'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>قيد المراجعة</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-900/30 text-[10px] font-mono">
            {underReviewTasks.length}
          </span>
        </motion.button>
      </div>

      {/* List: Available Tasks */}
      {activeTabFilter === 'available' && (
        <div id="available-tasks-list" className="space-y-3">
          {availableTasks.length === 0 ? (
            <div className="bg-[#0d1629]/90 border border-sky-500/20 rounded-2xl p-6 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-sky-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">لا توجد مهام متاحة حالياً</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                تم تنفيذ جميع المهام أو اكتملت المقاعد. يتم إضافة مهام جديدة يومياً!
              </p>
              {underReviewTasks.length > 0 && (
                <button
                  onClick={() => setActiveTabFilter('under_review')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 text-sky-300 text-xs font-bold hover:bg-sky-500/25 transition-all cursor-pointer mt-2"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>عرض المهام قيد المراجعة ({underReviewTasks.length})</span>
                </button>
              )}
            </div>
          ) : (
            availableTasks.map((task) => (
              <motion.div
              key={task.id}
              id={`task-card-${task.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-sky-500/20 bg-[#0d1629]/90 hover:border-sky-500/40 p-3.5 space-y-3 transition-colors shadow-xs"
            >
                {/* Header & Reward */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border bg-sky-500/10 border-sky-500/20 text-sky-400">
                      {getTaskIcon(task.iconType)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">
                        {task.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                        {task.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-left">
                    <span className="inline-flex items-center gap-1 font-black text-xs px-2 py-0.5 rounded-lg border bg-sky-500/15 border-sky-500/30 text-sky-300 font-mono">
                      <span>+{task.rewardSYP.toLocaleString('en-US')}</span>
                      <span className="text-[10px]">ل.س</span>
                    </span>
                  </div>
                </div>

                {/* Remaining Seats Counter */}
                {task.totalSeats && task.remainingSeats !== undefined && (
                  <div className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-xl bg-[#070d1a] border border-sky-500/15">
                    <span className="flex items-center gap-1 text-slate-400">
                      <UserCheck className="w-3 h-3 text-sky-400" />
                      <span>المقاعد المتبقية:</span>
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      <span className="text-emerald-400 font-bold">{task.remainingSeats}</span>
                      <span className="text-slate-500">/</span>
                      <span className="text-slate-400">{task.totalSeats}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons: تنفيذ المهمة بجانب إرسال الإثبات */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                  <motion.button
                    id={`task-exec-btn-${task.id}`}
                    onClick={() => handleExecuteOnly(task)}
                    whileTap={{ scale: 0.95 }}
                    className="py-2 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                    <span>تنفيذ المهمة</span>
                  </motion.button>

                  <motion.button
                    id={`task-proof-btn-${task.id}`}
                    onClick={() => handleOpenProofModal(task)}
                    whileTap={{ scale: 0.95 }}
                    className="py-2 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>إرسال الإثبات</span>
                  </motion.button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* List: Under Review Tasks */}
      {activeTabFilter === 'under_review' && (
        <div id="under-review-tasks-list" className="space-y-3">
          {underReviewTasks.length === 0 ? (
            <div className="bg-[#0d1629]/80 border border-sky-500/20 rounded-2xl p-6 text-center space-y-1.5">
              <Clock className="w-9 h-9 text-slate-500 mx-auto" />
              <p className="text-xs font-bold text-slate-300">لا توجد مهام قيد المراجعة</p>
              <p className="text-[11px] text-slate-400">
                عند إرسال إثبات مهمة تظهر هنا حتى تدقيقها، وتختفي فور الموافقة عليها وإيداع الرصيد.
              </p>
            </div>
          ) : (
            underReviewTasks.map((task) => (
              <div
                key={task.id}
                id={`task-review-${task.id}`}
                className="bg-[#0d1629]/90 border border-amber-500/30 rounded-2xl p-3.5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border bg-amber-500/10 border-amber-500/30 text-amber-400">
                      <Clock className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">{task.title}</h3>
                      <span className="text-[10px] text-amber-300 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>قيد المراجعة والتدقيق</span>
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-sky-300">
                    +{task.rewardSYP.toLocaleString('en-US')} ل.س
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 bg-[#060b17] p-2 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span>المكافأة ستضاف فور تأكيد الإثبات</span>
                  <span className="text-amber-400">تختفي بعد الموافقة</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Proof Submission Modal */}
      {selectedTaskForProof && (
        <div
          id="task-proof-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#0d1629] border border-sky-500/30 p-4 space-y-3.5 shadow-2xl text-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                  إثبات: {selectedTaskForProof.title}
                </h3>
                <span className="text-[11px] text-sky-400 font-mono">
                  المكافأة: +{selectedTaskForProof.rewardSYP.toLocaleString('en-US')} ل.س
                </span>
              </div>
              <button
                onClick={() => setSelectedTaskForProof(null)}
                disabled={isSubmittingProof}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Inputs */}
            <div className="space-y-3 text-xs">
              {/* Screenshot Upload */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                    <span>لقطة الشاشة (صورة الإثبات):</span>
                  </span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {proofImage ? (
                  <div className="rounded-xl border border-sky-500/30 bg-[#060b17] p-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={proofImage}
                        alt="Proof Preview"
                        className="w-10 h-10 rounded-lg object-cover border border-slate-700"
                      />
                      <span className="text-xs font-bold text-white truncate">
                        {proofFileName || 'صورة الإثبات'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProofImage(null);
                        setProofFileName('');
                      }}
                      className="p-1 rounded-lg text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3.5 px-3 rounded-xl border border-dashed border-sky-500/30 hover:border-sky-500/60 bg-[#060b17] flex items-center justify-center gap-2 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-sky-400" />
                    <span className="font-bold text-xs">اختر صورة أو لقطة شاشة</span>
                  </button>
                )}
              </div>

              {/* Account Username */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>معرف أو يوزر حسابك:</span>
                </label>
                <input
                  type="text"
                  value={proofAccountUsername}
                  onChange={(e) => setProofAccountUsername(e.target.value)}
                  placeholder="@username أو رقم الحساب"
                  className="w-full bg-[#060b17] border border-slate-700 rounded-xl p-2 text-xs font-mono text-sky-300 placeholder-slate-600 focus:outline-hidden focus:border-sky-500"
                />
              </div>

              {/* Optional Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-400">
                  ملاحظات (اختياري):
                </label>
                <input
                  type="text"
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  placeholder="أي تفاصيل إضافية للإدارة..."
                  className="w-full bg-[#060b17] border border-slate-700 rounded-xl p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            {/* Modal Footer: تنفيذ المهمة بجانب إرسال الإثبات */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExecuteOnly(selectedTaskForProof)}
                className="py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                title="فتح رابط المهمة لتنفيذها الآن"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span>تنفيذ المهمة</span>
              </button>

              <button
                type="button"
                onClick={handleSubmitProof}
                disabled={isSubmittingProof}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isSubmittingProof
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sm'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingProof ? 'جاري الإرسال...' : 'إرسال الإثبات'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
