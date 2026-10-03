import { useState, useEffect, FormEvent } from 'react';
import { 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Bot, 
  Sparkles, 
  KeyRound,
  AlertTriangle
} from 'lucide-react';
import { triggerHaptic } from '../services/telegram';
import { verifyUserCaptchaStatus, recordCaptchaSuccess } from '../services/api';
import { Language } from '../utils/translations';
import botLogo from '../assets/images/bot_syria_logo_1789657238973.jpg';

interface CaptchaGateModalProps {
  language: Language;
  onSuccess: () => void;
}

interface MathProblem {
  num1: number;
  num2: number;
  operator: '+' | '-';
  answer: number;
  questionText: string;
}

export function CaptchaGateModal({ language, onSuccess }: CaptchaGateModalProps) {
  const [problem, setProblem] = useState<MathProblem>({ num1: 7, num2: 5, operator: '+', answer: 12, questionText: '7 + 5' });
  const [userAnswer, setUserAnswer] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Generate a random math problem suitable for quick anti-bot check
  const generateNewProblem = () => {
    const isAdd = Math.random() > 0.35;
    if (isAdd) {
      const a = Math.floor(Math.random() * 20) + 5;
      const b = Math.floor(Math.random() * 15) + 3;
      setProblem({
        num1: a,
        num2: b,
        operator: '+',
        answer: a + b,
        questionText: `${a} + ${b}`,
      });
    } else {
      const a = Math.floor(Math.random() * 25) + 15;
      const b = Math.floor(Math.random() * 12) + 2;
      setProblem({
        num1: a,
        num2: b,
        operator: '-',
        answer: a - b,
        questionText: `${a} - ${b}`,
      });
    }
    setUserAnswer('');
    setErrorMsg(null);
  };

  useEffect(() => {
    generateNewProblem();
  }, []);

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (isVerifying || isSuccess) return;

    const trimmed = userAnswer.trim();
    if (!trimmed) {
      triggerHaptic('error');
      setErrorMsg(language === 'ar' ? 'يرجى كتابة الناتج للتحقق من أنك إنسان' : 'Please enter the answer');
      return;
    }

    const parsed = parseInt(trimmed, 10);
    setIsVerifying(true);
    setErrorMsg(null);

    setTimeout(() => {
      if (parsed === problem.answer) {
        triggerHaptic('success');
        setIsSuccess(true);
        setIsVerifying(false);
        // Save captcha pass state valid for 34 hours
        recordCaptchaSuccess();

        setTimeout(() => {
          onSuccess();
        }, 900);
      } else {
        triggerHaptic('error');
        setIsVerifying(false);
        setAttempts((prev) => prev + 1);
        setErrorMsg(
          language === 'ar' 
            ? '❌ الإجابة غير صحيحة! لا يمكن الدخول، حاول مرة أخرى.' 
            : 'Incorrect captcha answer. Access denied.'
        );
        // Refresh with a new challenge on error
        setTimeout(() => {
          generateNewProblem();
        }, 1200);
      }
    }, 450);
  };

  return (
    <div
      id="captcha-gate-overlay"
      className="fixed inset-0 z-50 bg-[#030611]/95 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none overflow-y-auto"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* High Intensity Glowing Backdrops (Neon Blue & Cyan Glow) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-sky-500/25 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative w-full max-w-sm rounded-3xl bg-[#080f24] border border-sky-400/50 p-6 shadow-[0_0_50px_rgba(14,165,233,0.35)] space-y-5 my-auto">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between border-b border-sky-500/20 pb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-sky-400/40 shadow-[0_0_15px_rgba(56,189,248,0.3)] text-sky-300 text-xs font-bold">
            <Lock className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>بوابة الحماية المشددة</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">
            كل 34 ساعة مرة واحدة
          </span>
        </div>

        {/* Center Icon & Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#0f2452] to-[#070e22] border border-sky-400/60 flex items-center justify-center shadow-[0_0_30px_rgba(56,189,248,0.4)] overflow-hidden">
              {isSuccess ? (
                <CheckCircle2 className="w-9 h-9 text-emerald-400 animate-bounce" />
              ) : (
                <img src={botLogo} alt="Bot Syria Logo" className="w-full h-full object-cover" />
              )}
            </div>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#080f24] shadow-[0_0_8px_#34d399]" />
          </div>

          <h2 className="text-lg font-black text-white font-mono tracking-tight drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]">
            التحقق الأمني من الكابتشا (Captcha)
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
            لحماية نظام الأرباح السوري ومنع الروبوتات الوهمية؛ يُطلب التحقق البشري
            <span className="text-sky-400 font-bold mx-1">مرة واحدة كل 34 ساعة فقط</span>.
            {language === 'ar' && (
              <span className="block mt-1 text-[11px] text-amber-300/90 font-medium">
                ⚠️ لا تُحتسب أي أرباح أو إحالات جديدة إلا بعد اجتياز هذا التحقق بنجاح.
              </span>
            )}
          </p>
        </div>

        {/* Captcha Box */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#040817] border border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.15)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                <span>حل المعادلة الحسابية لتأكيد هويتك:</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  generateNewProblem();
                }}
                className="p-1.5 rounded-lg hover:bg-sky-500/20 text-slate-400 hover:text-sky-300 transition-all cursor-pointer"
                title="تحديث المسألة"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Math challenge display */}
            <div className="py-3 px-4 rounded-xl bg-slate-900/90 border border-sky-400/40 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-cyan-500/15 to-sky-500/10 animate-pulse pointer-events-none" />
              <div className="text-2xl font-mono font-black text-sky-300 tracking-wider flex items-center justify-center gap-3 drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]">
                <span>{problem.questionText}</span>
                <span className="text-slate-400">=</span>
                <span className="text-emerald-400">؟</span>
              </div>
            </div>

            {/* User Input */}
            <div className="space-y-1">
              <input
                id="captcha-answer-input"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
                placeholder="اكتب الناتج هنا..."
                value={userAnswer}
                onChange={(e) => {
                  setUserAnswer(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full text-center py-2.5 px-4 rounded-xl bg-[#08122c] border border-sky-400/40 focus:border-sky-400 focus:shadow-[0_0_20px_rgba(56,189,248,0.5)] outline-none text-white text-base font-mono font-bold transition-all placeholder:text-slate-500 placeholder:text-xs"
              />
            </div>

            {/* Error or Success feedback */}
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {isSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-bold animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>تم التحقق بنجاح! تم اعتماد الجلسة واحتساب الإحالات لمدة 34 ساعة.</span>
              </div>
            )}
          </div>

          {/* Verification Submit Button */}
          <button
            type="submit"
            disabled={isVerifying || isSuccess}
            className={`w-full py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isSuccess
                ? 'bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.7)]'
                : 'bg-gradient-to-r from-sky-500 via-blue-600 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white shadow-[0_0_30px_rgba(14,165,233,0.5)] active:scale-[0.98]'
            }`}
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>جاري التحقق من الكابتشا...</span>
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>تم التحقق! جاري الدخول...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>تأكيد الكابتشا والدخول للبوت</span>
              </>
            )}
          </button>
        </form>

        {/* Security Footer Notice */}
        <div className="text-center pt-1 border-t border-sky-500/20">
          <p className="text-[10px] text-slate-400 font-mono">
            نظام التحقق الدوري المعتمد 34H • بوت سوريا 2026
          </p>
        </div>
      </div>
    </div>
  );
}
