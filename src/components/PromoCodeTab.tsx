import { useState, type FormEvent } from 'react';
import { TelegramUser, PromoCodeRecord } from '../types';
import { 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Loader2, 
  History, 
  Gift, 
  Banknote,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { triggerHaptic } from '../services/telegram';
import { redeemPromoCode, getRedeemedPromoCodes } from '../services/api';

interface PromoCodeTabProps {
  user: TelegramUser;
  onCodeRedeemed: (rewardSYP: number) => void;
}

export function PromoCodeTab({ user, onCodeRedeemed }: PromoCodeTabProps) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [history, setHistory] = useState<PromoCodeRecord[]>(() => getRedeemedPromoCodes(user.id));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    triggerHaptic('medium');
    setIsSubmitting(true);

    try {
      const result = await redeemPromoCode(code.trim(), user.id);
      if (result.success) {
        triggerHaptic('success');
        setToastMessage({ text: result.message, type: 'success' });
        onCodeRedeemed(result.rewardSYP);
        setCode('');
        setHistory(getRedeemedPromoCodes(user.id));
      } else {
        triggerHaptic('error');
        setToastMessage({ text: result.message, type: 'error' });
      }
    } catch {
      triggerHaptic('error');
      setToastMessage({ text: 'حدث خطأ أثناء معالجة الكود، حاول مجدداً', type: 'error' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setToastMessage(null);
      }, 4000);
    }
  };

  return (
    <div id="promocode-tab-content" className="w-full pb-28 pt-3 px-4 max-w-md mx-auto space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          id="promo-toast"
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-lg animate-in fade-in duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-sky-950/90 text-sky-200 border border-sky-500/40 glow-cyan-sm'
              : 'bg-rose-950/90 text-rose-200 border border-rose-500/40'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="flex-1 leading-snug">{toastMessage.text}</span>
        </div>
      )}

      {/* Unified Glowing Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-sky-950/80 via-[#0d172e] to-cyan-950/70 border border-sky-500/30 rounded-2xl p-4.5 space-y-2 shadow-[0_0_25px_rgba(14,165,233,0.18)]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 shadow-[0_0_15px_rgba(14,165,233,0.3)]">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">تفعيل البرومو كود بالليرة السورية</h2>
            <p className="text-xs text-sky-200/80 mt-0.5">
              أدخل الرموز الترويجية المعتمدة للحصول على مبالغ فورية بالليرة السورية (SYP).
            </p>
          </div>
        </div>
      </div>

      {/* Security & Anti-Brute-Force Banner */}
      <div className="bg-[#080f22]/95 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-emerald-400">حماية الكوبونات المشددة 256-bit</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-400">تشفير كامل وضمان استخدام الكود لمرة واحدة فقط لكل حساب</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          محمي 100%
        </span>
      </div>

      {/* Promo Code Form */}
      <form
        id="promo-code-form"
        onSubmit={handleSubmit}
        className="bg-[#0e1628]/95 border border-sky-500/25 rounded-2xl p-4 space-y-4 shadow-[0_0_20px_rgba(14,165,233,0.1)]"
      >
        <div className="space-y-1.5">
          <label htmlFor="promo-input" className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-sky-400" />
            <span>رمز البرومو كود (Promo Code):</span>
          </label>

          <div className="relative">
            <input
              id="promo-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="اكتب الكود هنا (مثال: SYRIA2026)"
              required
              className="w-full bg-[#080d18] border border-sky-500/30 rounded-xl p-3 text-sm text-center font-mono font-bold tracking-widest text-sky-300 placeholder-slate-600 focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500 uppercase transition-all"
            />
          </div>
        </div>

        {/* High Security Protection Badge */}
        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-200/90 leading-relaxed flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-sky-300 block">نظام حماية الأكواد المشدد 100%:</span>
            <p className="text-slate-300 text-[10px] leading-relaxed">
              محمي ضد التخمين والتكرار التلقائي، ومحدد بفترة أمان فاصلة. كل كود مخصص للاستخدام لمرة واحدة فقط لكل جهاز وحساب رسمي.
            </p>
          </div>
        </div>

        <button
          id="redeem-promo-btn"
          type="submit"
          disabled={isSubmitting || !code.trim()}
          className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isSubmitting || !code.trim()
              ? 'bg-[#131e36] text-slate-600 border border-slate-800 cursor-not-allowed'
              : 'bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-black shadow-[0_0_20px_rgba(14,165,233,0.4)] active:scale-[0.99]'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري التحقق من الكود...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>تفعيل الكود واستلام المكافأة (ل.س)</span>
            </>
          )}
        </button>
      </form>

      {/* Redemption History */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <History className="w-4 h-4 text-sky-400" />
          <span>سجل الأكواد المفعلة:</span>
        </h3>

        {history.length === 0 ? (
          <div className="p-5 rounded-2xl bg-[#0e1628]/60 border border-sky-500/15 text-center text-xs text-slate-500">
            لم تقم بتفعيل أي كود ترويجي حتى الآن.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((record, index) => (
              <div
                key={index}
                className="p-3 rounded-xl bg-[#0e1628] border border-sky-500/20 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <span className="font-mono font-bold text-white block">{record.code}</span>
                  <span className="text-[10px] text-slate-500">{record.redeemedAt}</span>
                </div>

                <div className="flex items-center gap-1 font-mono font-bold text-sky-400">
                  <Banknote className="w-3.5 h-3.5" />
                  <span>+{record.rewardSYP.toLocaleString('en-US')} ل.س</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
