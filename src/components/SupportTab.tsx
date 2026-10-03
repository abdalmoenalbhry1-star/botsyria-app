import { useState, type FormEvent } from 'react';
import { TelegramUser, SupportTicket } from '../types';
import { 
  Headphones, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  History, 
  Clock, 
  Bot,
  MessageSquareQuote,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { triggerHaptic, openExternalLink } from '../services/telegram';
import { submitSupportMessage, getStoredTickets, BOT_URL } from '../services/api';

import botLogo from '../assets/images/bot_syria_logo_1789657238973.jpg';

interface SupportTabProps {
  user: TelegramUser;
}

export function SupportTab({ user }: SupportTabProps) {
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>(() => getStoredTickets());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      triggerHaptic('warning');
      return;
    }

    triggerHaptic('medium');
    setIsSubmitting(true);

    try {
      const payload = {
        userId: user.id,
        name: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User',
        username: user.username,
        category,
        message: message.trim(),
        timestamp: new Date().toLocaleDateString('ar-SA', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      const res = await submitSupportMessage(payload);

      if (res.success) {
        triggerHaptic('success');
        setStatusMessage({ text: res.message, type: 'success' });
        setMessage('');
        setTickets(getStoredTickets());
      } else {
        triggerHaptic('error');
        setStatusMessage({ text: res.message, type: 'error' });
      }
    } catch {
      triggerHaptic('error');
      setStatusMessage({ text: 'فشل في إرسال الرسالة، يرجى المحاولة ثانية', type: 'error' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleOpenBotDirect = () => {
    triggerHaptic('light');
    openExternalLink(BOT_URL);
  };

  return (
    <div id="support-tab-content" className="w-full pb-28 pt-3 px-4 max-w-md mx-auto space-y-4">
      {/* Toast Alert */}
      {statusMessage && (
        <div
          id="support-toast"
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-lg animate-in fade-in duration-200 ${
            statusMessage.type === 'success'
              ? 'bg-sky-950/90 text-sky-200 border border-sky-500/40 glow-cyan-sm'
              : 'bg-rose-950/90 text-rose-200 border border-rose-500/40'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="flex-1 leading-snug">{statusMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-sky-950/80 via-[#0d172e] to-cyan-950/70 border border-sky-500/30 rounded-2xl p-4.5 space-y-2 shadow-[0_0_25px_rgba(14,165,233,0.18)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 shadow-[0_0_15px_rgba(14,165,233,0.3)]">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">مركز الدعم الفني والمساعدة</h2>
              <p className="text-xs text-sky-200/80 mt-0.5">
                فريقنا متاح لمساعدتك وحل أي استفسار حول المهام أو السحوبات.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* High Security Encrypted Channel Card */}
      <div className="bg-[#080f22]/95 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-emerald-400">قناة مراسلات مشفرة 256-bit</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-400">تواصل آمن ومباشر وموثق مع الإدارة الرسمية لبوت سوريا</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          مشفر ومحمي
        </span>
      </div>

      {/* Direct Bot Help Option */}
      <div className="bg-[#0e1628]/95 border border-sky-500/25 rounded-2xl p-3.5 flex items-center justify-between shadow-[0_0_15px_rgba(14,165,233,0.08)]">
        <div className="flex items-center gap-2.5">
          <img src={botLogo} alt="Bot Logo" className="w-5 h-5 rounded-full object-cover border border-sky-500/30" />
          <div>
            <p className="text-xs font-bold text-white">الدعم عبر البوت الرسمي</p>
            <p className="text-[11px] text-slate-400 font-mono">@BotSyria_2026_bot</p>
          </div>
        </div>
        <button
          onClick={handleOpenBotDirect}
          className="py-1.5 px-3 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 text-xs font-bold rounded-xl border border-sky-500/30 transition-all cursor-pointer"
        >
          مراسلة البوت
        </button>
      </div>

      {/* Support Form */}
      <form
        id="support-form"
        onSubmit={handleSubmit}
        className="bg-[#0e1628]/95 border border-sky-500/25 rounded-2xl p-4 space-y-4 shadow-[0_0_20px_rgba(14,165,233,0.1)]"
      >
        <div className="space-y-1.5">
          <label htmlFor="support-category" className="text-xs font-bold text-slate-300 block">
            نوع المشكلة أو الاستفسار:
          </label>
          <select
            id="support-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[#080d18] border border-sky-500/30 rounded-xl p-2.5 px-3 text-xs text-slate-100 focus:outline-hidden focus:border-sky-500 transition-colors"
          >
            <option value="general">استفسار عام</option>
            <option value="withdrawal">مشكلة في عملية السحب</option>
            <option value="tasks">مشكلة في احتساب نقاط مهمة</option>
            <option value="referral">مشكلة في احتساب الإحالة</option>
            <option value="promo">مشكلة في تفعيل البرومو كود</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="support-message" className="text-xs font-bold text-slate-300 block">
            تفاصيل الرسالة:
          </label>
          <textarea
            id="support-message"
            rows={4}
            required
            placeholder="اكتب رسالتك واستفسارك بوضوح هنا..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-[#080d18] border border-sky-500/30 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-sky-500 transition-colors resize-none"
          />
        </div>

        <button
          id="send-support-btn"
          type="submit"
          disabled={isSubmitting || !message.trim()}
          className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isSubmitting || !message.trim()
              ? 'bg-[#131e36] text-slate-600 border border-slate-800 cursor-not-allowed'
              : 'bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-black shadow-[0_0_20px_rgba(14,165,233,0.4)] active:scale-[0.99]'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري الإرسال للإدارة...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>إرسال التذكرة للإدارة</span>
            </>
          )}
        </button>
      </form>

      {/* Chat Interface for Latest Ticket */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-sky-400 px-1">
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            <span>المحادثة الحالية مع الإدارة</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal">
            يتم عرض آخر رسالة فقط
          </span>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-[#0e1628]/70 border border-sky-500/20 rounded-xl p-5 text-center text-xs text-slate-400">
            لا توجد محادثات حالية.
          </div>
        ) : (
          <div className="space-y-3 bg-[#0e1628]/90 border border-sky-500/20 rounded-xl p-3 shadow-xs">
            {/* User Message Bubble */}
            <div className="flex flex-col items-end w-full">
              <div className="flex items-center gap-1.5 mb-1 mr-1">
                <span className="text-[10px] text-slate-400">{tickets[0].timestamp}</span>
                <span className="text-[11px] font-bold text-slate-300">أنت</span>
              </div>
              <div className="bg-sky-600 text-white p-2.5 rounded-2xl rounded-tr-sm text-xs max-w-[85%] leading-relaxed shadow-sm">
                {tickets[0].message}
              </div>
            </div>

            {/* Admin Reply Bubble */}
            {tickets[0].adminReply && (
              <div className="flex flex-col items-start w-full mt-3">
                <div className="flex items-center gap-1.5 mb-1 ml-1">
                  <span className="text-[11px] font-bold text-emerald-400">الإدارة</span>
                  <span className="text-[10px] text-slate-400">{tickets[0].repliedAt}</span>
                </div>
                <div className="bg-[#1a253c] border border-slate-700 text-emerald-50 p-2.5 rounded-2xl rounded-tl-sm text-xs max-w-[85%] leading-relaxed shadow-sm">
                  {tickets[0].adminReply}
                </div>
              </div>
            )}
            
            {/* Pending State */}
            {!tickets[0].adminReply && (
              <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 px-1 animate-pulse">
                <Clock className="w-3 h-3" />
                <span>بانتظار رد الإدارة...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
