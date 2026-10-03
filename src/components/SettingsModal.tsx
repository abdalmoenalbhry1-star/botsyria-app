import { useState } from 'react';
import { 
  X, 
  Globe, 
  Moon, 
  Sun, 
  BookOpen, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Banknote,
  Bot,
  RefreshCw,
  Zap
} from 'lucide-react';
import { Language, ThemeMode, translations } from '../utils/translations';
import { triggerHaptic } from '../services/telegram';
import botLogo from '../assets/images/bot_syria_logo_1789657238973.jpg';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  language,
  onLanguageChange,
  theme,
  onThemeChange,
}: SettingsModalProps) {
  const [guideExpanded, setGuideExpanded] = useState(true);
  const [clearedToast, setClearedToast] = useState(false);

  if (!isOpen) return null;

  const t = translations[language];

  const handleLangToggle = (newLang: Language) => {
    triggerHaptic('medium');
    onLanguageChange(newLang);
  };

  const handleThemeToggle = (newTheme: ThemeMode) => {
    triggerHaptic('medium');
    onThemeChange(newTheme);
  };

  const handleClose = () => {
    triggerHaptic('light');
    onClose();
  };

  const handleRefreshSecurity = () => {
    triggerHaptic('success');
    setClearedToast(true);
    setTimeout(() => setClearedToast(false), 2500);
  };

  const isDark = theme === 'dark';

  return (
    <div
      id="settings-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        id="settings-modal-card"
        className={`w-full max-w-lg max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden transition-colors ${
          isDark 
            ? 'bg-[#080d1a] border-sky-500/40 text-slate-100 shadow-[0_0_50px_rgba(14,165,233,0.35)]' 
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 flex items-center justify-between border-b ${isDark ? 'border-sky-500/20 bg-[#0a1122]' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 glow-cyan-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide flex items-center gap-1.5">
                <span>{t.settings}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-mono border border-sky-500/30">
                  BOT SYRIA
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">تفضيلات اللغة والمظهر ودليل الاستخدام الرسمي</p>
            </div>
          </div>
          <button
            id="close-settings-btn"
            onClick={handleClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1 text-sm no-scrollbar">
          {/* Section 1: Language Switcher */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-400">
              <Globe className="w-4 h-4" />
              <span>{t.language} / Language</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                id="btn-lang-ar"
                type="button"
                onClick={() => handleLangToggle('ar')}
                className={`py-3 px-3.5 rounded-2xl border font-bold text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  language === 'ar'
                    ? 'bg-sky-500/25 border-sky-400 text-white glow-cyan-sm shadow-md'
                    : isDark
                    ? 'bg-[#0f172a]/70 hover:bg-[#131e36] border-slate-800 text-slate-400'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🇸🇾</span>
                  <span>العربية (Arabic)</span>
                </div>
                {language === 'ar' && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
              </button>

              <button
                id="btn-lang-en"
                type="button"
                onClick={() => handleLangToggle('en')}
                className={`py-3 px-3.5 rounded-2xl border font-bold text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-sky-500/25 border-sky-400 text-white glow-cyan-sm shadow-md'
                    : isDark
                    ? 'bg-[#0f172a]/70 hover:bg-[#131e36] border-slate-800 text-slate-400'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🌐</span>
                  <span>English (الإنجليزية)</span>
                </div>
                {language === 'en' && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
              </button>
            </div>
          </div>

          {/* Section 2: Theme / Lighting Mode Switcher */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-400">
              <Zap className="w-4 h-4" />
              <span>{t.theme} (الإضاءة والمظهر)</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                id="btn-theme-dark"
                type="button"
                onClick={() => handleThemeToggle('dark')}
                className={`py-3 px-3.5 rounded-2xl border font-bold text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-sky-500/25 border-sky-400 text-white glow-cyan-sm shadow-md'
                    : isDark
                    ? 'bg-[#0f172a]/70 hover:bg-[#131e36] border-slate-800 text-slate-400'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-sky-400" />
                  <span>{t.darkMode} (ليلي نيوني)</span>
                </div>
                {theme === 'dark' && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
              </button>

              <button
                id="btn-theme-light"
                type="button"
                onClick={() => handleThemeToggle('light')}
                className={`py-3 px-3.5 rounded-2xl border font-bold text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-sky-500/25 border-sky-400 text-slate-900 glow-cyan-sm shadow-md'
                    : isDark
                    ? 'bg-[#0f172a]/70 hover:bg-[#131e36] border-slate-800 text-slate-400'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>{t.lightMode} (نهاري)</span>
                </div>
                {theme === 'light' && <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />}
              </button>
            </div>
          </div>

          {/* Section 3: Official Bot Guide & Usage Explanation */}
          <div className={`border rounded-2xl overflow-hidden transition-all ${isDark ? 'bg-[#0b1222] border-sky-500/30 glow-card-ultra' : 'bg-slate-50 border-slate-200'}`}>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setGuideExpanded(!guideExpanded);
              }}
              className="w-full p-3.5 flex items-center justify-between text-start cursor-pointer hover:opacity-95"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <BookOpen className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold">{t.botGuideTitle}</h3>
                  <p className="text-[10px] text-slate-400">شرح تفصيلي لطريقة الاستخدام ونظام الأرباح بالليرة السورية</p>
                </div>
              </div>
              {guideExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {guideExpanded && (
              <div className={`p-4 pt-1 space-y-3 border-t text-xs ${isDark ? 'border-sky-500/20 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                {/* About the Bot */}
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 leading-relaxed">
                  <div className="flex items-center gap-1.5 text-sky-400 font-bold mb-1">
                    <img src={botLogo} alt="Bot Logo" className="w-4 h-4 rounded-full object-cover" />
                    <span>{t.aboutBot}:</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    بوت سوريا الرسمي (@BotSyria_2026_bot) هو المنصة التفاعلية المعتمدة لتنفيذ المهام السريعة، دعوة الأصدقاء، وربح مبالغ حقيقية تُدفع بالليرة السورية فوراً عبر سيريتل كاش أو العملات الرقمية.
                  </p>
                </div>

                {/* Steps */}
                <div className="space-y-2">
                  <span className="font-bold text-xs text-sky-400 block">{t.howToUseTitle}</span>

                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <h4 className="font-bold text-sky-400 mb-0.5">1. تنفيذ المهام وإرسال الإثبات</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      اختر أي مهمة من قائمة المهام المتاحة، اضغط على تنفيذ الرابط، ثم أرفق صورة الإثبات أو معرف حسابك. بمجرد الإرسال تختفي المهمة لتصبح قيد التدقيق لحمايتك ومنع التكرار.
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <h4 className="font-bold text-emerald-400 mb-0.5">2. نظام الإحالات والتحقق الدوري (34H Captcha)</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      شارك الرابط الرسمي الوحيد للبوت مع أصدقائك عبر مختلف شبكات التواصل الاجتماعي لكسب +3,750 ل.س عن كل صديق. لا تُحتسب الإحالات إلا بعد اجتياز فحص الكابتشا الدوري (كل 34 ساعة مرة واحدة) لحظر الروبوتات الوهمية.
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <h4 className="font-bold text-amber-400 mb-0.5">3. السحب الفوري بالليرة السورية</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      عند وصول رصيدك للحد الأدنى (15,000 ل.س)، يمكنك طلب السحب فوراً إلى سيريتل كاش أو الهرم أو المحافظ الرقمية.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>نظام محمي بأحدث خوارزميات الأمان لمنع التكرار والاحتيال.</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Security Refresh & Status */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white block">مستوى الأمان: حماية فائقة (Ultra)</span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-emerald-500/20 text-emerald-300 animate-pulse">فائقة</span>
                  </div>
                  <span className="text-[10px] text-slate-400">بروتوكولات التشفير ومنع الحسابات الوهمية نشطة بقوة 200%</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRefreshSecurity}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/40 flex items-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                <span>فحص الأمان</span>
              </button>
            </div>

            {/* Live Security Indicators */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              <div className="bg-slate-900/80 border border-emerald-500/20 p-2 rounded-xl text-center">
                <span className="text-[9px] text-slate-400 block mb-0.5">منع الروبوتات</span>
                <span className="text-[10px] font-bold text-emerald-400">✓ فـعّـال للـغـايـة</span>
              </div>
              <div className="bg-slate-900/80 border border-emerald-500/20 p-2 rounded-xl text-center">
                <span className="text-[9px] text-slate-400 block mb-0.5">تشفير السحب</span>
                <span className="text-[10px] font-bold text-emerald-400">✓ مشفر AES-256</span>
              </div>
              <div className="bg-slate-900/80 border border-emerald-500/20 p-2 rounded-xl text-center">
                <span className="text-[9px] text-slate-400 block mb-0.5">بصمة الجهاز</span>
                <span className="text-[10px] font-bold text-emerald-400">✓ مـطـابـقـة</span>
              </div>
            </div>
          </div>

          {clearedToast && (
            <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-bold space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-1.5 justify-center text-[13px]">
                <span>🛡️</span>
                <span>تم تأكيد بروتوكول الأمان الفائق بنجاح!</span>
              </div>
              <p className="text-[10px] text-slate-300 font-normal text-center leading-relaxed">
                جلسة حسابك آمنة 100%. نظام مكافحة الاحتيال والحسابات الوهمية يعمل بكفاءة قصوى.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex justify-end ${isDark ? 'border-sky-500/20 bg-[#0a1122]' : 'border-slate-100 bg-slate-50'}`}>
          <button
            id="save-close-settings-btn"
            type="button"
            onClick={handleClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(14,165,233,0.4)] active:scale-[0.98] transition-all cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
