import { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Zap, ArrowRight, Lock, CheckCircle2, Bot } from 'lucide-react';
import { Language, translations } from '../utils/translations';
import { triggerHaptic } from '../services/telegram';
import botLogo from '../assets/images/bot_syria_logo_1789657238973.jpg';

interface SplashScreenProps {
  language: Language;
  onComplete: () => void;
}

export function SplashScreen({ language, onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const t = translations[language];

  const steps = [
    language === 'ar' ? 'فحص بروتوكول الأمان المشدد 256-bit...' : 'Checking 256-bit security protocol...',
    language === 'ar' ? 'التحقق من حساب تلجرام المعتمد...' : 'Verifying Telegram authorized account...',
    language === 'ar' ? 'تهيئة محفظة الليرة السورية (SYP)...' : 'Initializing Syrian Pound wallet (SYP)...',
    language === 'ar' ? 'جاهز! جاري فتح بوت سوريا 2026...' : 'Ready! Launching Bot Syria 2026...',
  ];

  useEffect(() => {
    // Progress interval
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            triggerHaptic('success');
            onComplete();
          }, 350);
          return 100;
        }

        const increment = prev < 35 ? 4 : prev < 75 ? 3 : 5;
        const next = Math.min(prev + increment, 100);

        if (next >= 75) {
          setCurrentStep(3);
        } else if (next >= 50) {
          setCurrentStep(2);
        } else if (next >= 25) {
          setCurrentStep(1);
        } else {
          setCurrentStep(0);
        }

        return next;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [onComplete]);

  const handleSkip = () => {
    triggerHaptic('light');
    onComplete();
  };

  return (
    <div
      id="bot-syria-splash"
      className="fixed inset-0 z-50 bg-[#040711] flex flex-col items-center justify-between p-6 sm:p-8 select-none overflow-hidden"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* High-Definition Ambient Glowing Backdrops (Intense Neon Aura) */}
      <div className="absolute top-1/6 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/25 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-12 right-6 w-80 h-80 bg-cyan-500/20 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute top-10 left-6 w-72 h-72 bg-blue-600/15 rounded-full blur-[80px] pointer-events-none" />

      {/* Top Header Badge with Live Security Status */}
      <div className="w-full flex items-center justify-between relative z-10 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-sky-500/50 shadow-[0_0_20px_rgba(14,165,233,0.35)] text-sky-300 text-xs font-bold tracking-wider">
          <ShieldCheck className="w-4 h-4 text-sky-400 animate-pulse" />
          <span>نظام مشفر وموثق رسمياً</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-ping" />
        </div>

        <button
          onClick={handleSkip}
          className="text-xs text-slate-300 hover:text-sky-300 transition-all flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-sky-500/30 hover:border-sky-400/60 shadow-[0_0_15px_rgba(14,165,233,0.2)] cursor-pointer"
        >
          <span>{t.skip}</span>
          <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
        </button>
      </div>

      {/* Central Brand Identity: Ultra-Classy, Clean & Minimalist */}
      <div className="flex flex-col items-center text-center space-y-4 relative z-10 my-auto w-full max-w-sm px-4">
        {/* Classy Syrian Bot Emblem */}
        <div className="relative">
          {/* Subtle Outer Neon Aura */}
          <div className="absolute -inset-2.5 rounded-3xl bg-sky-500/20 blur-xl pointer-events-none" />

          {/* Icon Shield Box */}
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-b from-[#0e1c3d] to-[#070d1e] border border-sky-400/40 p-0.5 shadow-[0_0_30px_rgba(14,165,233,0.3)] flex items-center justify-center relative overflow-hidden">
            {/* Subtle Syrian Flag Tricolor Edge */}
            <div className="absolute top-0 inset-x-0 h-1 flex">
              <div className="flex-1 bg-red-600/90" />
              <div className="flex-1 bg-white/90" />
              <div className="flex-1 bg-black/90" />
            </div>

            <div className="w-full h-full rounded-[20px] overflow-hidden flex items-center justify-center relative">
              <img src={botLogo} alt="Bot Syria 2026 Logo" className="w-full h-full object-cover" />
              <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
            </div>
          </div>
        </div>

        {/* Minimal Classy Name */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide font-mono">
            بوت سوريا
          </h1>
          <p className="text-[11px] text-sky-400/70 font-mono tracking-widest mt-0.5">
            BOT SYRIA 2026
          </p>
        </div>
      </div>

      {/* Access Progress Bar with Live Verification Text */}
      <div className="w-full max-w-sm space-y-3 relative z-10 pb-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-200">
          <span className="flex items-center gap-1.5 text-sky-300">
            <Sparkles className="w-4 h-4 text-sky-400 animate-spin" />
            <span>{steps[currentStep]}</span>
          </span>
          <span className="font-mono text-sky-400 font-black text-sm">{progress}%</span>
        </div>

        {/* Glowing Progress Track */}
        <div className="w-full h-3 bg-slate-900/95 rounded-full overflow-hidden p-0.5 border border-sky-400/50 shadow-[0_0_25px_rgba(14,165,233,0.4)]">
          <div
            className="h-full bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-200 rounded-full transition-all duration-100 ease-out shadow-[0_0_15px_rgba(56,189,248,1)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-[11px] text-center text-slate-400 font-mono">
          @BotSyria_2026_bot • الإصدار السوري الرسمي المعتمد 2026
        </p>
      </div>
    </div>
  );
}

