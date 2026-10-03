import { TelegramUser, ActiveTab } from '../types';
import { 
  Users, 
  Wallet, 
  KeyRound, 
  Headphones, 
  CheckSquare, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2,
  Gift
} from 'lucide-react';
import { triggerHaptic } from '../services/telegram';
import { getSystemSettings } from '../services/api';
import { Language, ThemeMode, translations } from '../utils/translations';

interface HomeTabProps {
  user: TelegramUser;
  balanceSYP: number;
  completedTasksCount: number;
  pendingTasksCount: number;
  totalReferrals: number;
  language: Language;
  theme: ThemeMode;
  onNavigate: (tab: ActiveTab) => void;
}

export function HomeTab({
  balanceSYP,
  completedTasksCount,
  pendingTasksCount,
  totalReferrals,
  language,
  theme,
  onNavigate,
}: HomeTabProps) {
  const t = translations[language];
  const isDark = theme === 'dark';
  const isRtl = language === 'ar';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const sysSettings = getSystemSettings();
  const refReward = sysSettings.referralRewardSYP || 1500;
  const minWithdrawal = sysSettings.minWithdrawalSYP || 3000;

  return (
    <div id="home-tab-content" className="w-full pb-28 pt-2 px-4 max-w-md mx-auto space-y-3 relative overflow-hidden">
      {/* Moving Background Glowing Auras */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-sky-500/15 rounded-full blur-[90px] pointer-events-none animate-moving-glow" />
      <div className="absolute bottom-20 right-4 w-60 h-60 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse-slow" />
      {/* Quick Stats: Tasks & Referrals */}
      <div id="quick-stats-grid" className="grid grid-cols-2 gap-2">
        <div
          className={`border rounded-2xl p-3 space-y-0.5 transition-all ${
            isDark
              ? 'bg-[#0d1629] border-sky-500/20'
              : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>المهام المنجزة</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {completedTasksCount}
            </span>
            <span className="text-[10px] text-slate-400">مهمة</span>
          </div>
        </div>

        <div
          className={`border rounded-2xl p-3 space-y-0.5 transition-all ${
            isDark
              ? 'bg-[#0d1629] border-sky-500/20'
              : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>الأصدقاء المدعوون</span>
            <Users className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {totalReferrals}
            </span>
            <span className="text-[10px] text-slate-400">صديق ({refReward.toLocaleString('en-US')} ل.س/صديق)</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1 text-xs text-slate-400 font-medium">
          <span>أقسام البوت</span>
        </div>

        <div id="quick-nav-cards" className="space-y-2">
          {/* Tasks */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onNavigate('tasks');
            }}
            className={`w-full border rounded-2xl p-3 flex items-center justify-between transition-all group text-start cursor-pointer ${
              isDark
                ? 'bg-[#0d1629] hover:bg-[#121f3a] border-sky-500/20'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    المهام اليومية
                  </h3>
                  {pendingTasksCount > 0 && (
                    <span className="text-[10px] font-bold bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded-md font-mono">
                      {pendingTasksCount} متاحة
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  نفّذ المهام وارفع إثباتك لتحصل على ليرات سورية
                </p>
              </div>
            </div>
            <ArrowIcon className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
          </button>

          {/* Referrals */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onNavigate('referrals');
            }}
            className={`w-full border rounded-2xl p-3 flex items-center justify-between transition-all group text-start cursor-pointer ${
              isDark
                ? 'bg-[#0d1629] hover:bg-[#121f3a] border-sky-500/20'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    نظام الإحالات
                  </h3>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-md">
                    {refReward.toLocaleString('en-US')} ل.س لكل صديق
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  شارك رابطك واكسب {refReward.toLocaleString('en-US')} ليرة عن كل إحالة مؤكدة
                </p>
              </div>
            </div>
            <ArrowIcon className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
          </button>

          {/* Withdraw */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onNavigate('withdraw');
            }}
            className={`w-full border rounded-2xl p-3 flex items-center justify-between transition-all group text-start cursor-pointer ${
              isDark
                ? 'bg-[#0d1629] hover:bg-[#121f3a] border-sky-500/20'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    سحب الأرباح
                  </h3>
                  <span className="text-[10px] font-bold bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded-md font-mono">
                    الحد الأدنى {minWithdrawal.toLocaleString('en-US')} ل.س
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  سحب فوري عبر سيريتل كاش أو شام كاش
                </p>
              </div>
            </div>
            <ArrowIcon className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
          </button>

          {/* Promo Code */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onNavigate('promocode');
            }}
            className={`w-full border rounded-2xl p-3 flex items-center justify-between transition-all group text-start cursor-pointer ${
              isDark
                ? 'bg-[#0d1629] hover:bg-[#121f3a] border-sky-500/20'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  كود الهدية (برومو كود)
                </h3>
                <p className="text-[11px] text-slate-400">
                  شحن رصيد بالليرة السورية باستخدام الكود الترويجي
                </p>
              </div>
            </div>
            <ArrowIcon className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
          </button>

          {/* Support */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onNavigate('support');
            }}
            className={`w-full border rounded-2xl p-3 flex items-center justify-between transition-all group text-start cursor-pointer ${
              isDark
                ? 'bg-[#0d1629] hover:bg-[#121f3a] border-sky-500/20'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  الدعم الفني والمساعدة
                </h3>
                <p className="text-[11px] text-slate-400">
                  تواصل مباشر مع الإدارة لحل أي مشكلة
                </p>
              </div>
            </div>
            <ArrowIcon className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
