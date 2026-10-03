import { useState, FormEvent } from 'react';
import { TelegramUser, CloudSyncStatus } from '../types';
import { Banknote, Copy, Check, Settings, Bot, ShieldCheck, ShieldAlert, Cloud, Lock, X, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';
import { Language, ThemeMode, translations } from '../utils/translations';
import botLogo from '../assets/images/bot_syria_logo_1789657238973.jpg';

interface UserHeaderProps {
  user: TelegramUser;
  balanceSYP: number;
  isTelegram: boolean;
  language: Language;
  theme: ThemeMode;
  cloudSyncStatus?: CloudSyncStatus;
  onOpenSettings: () => void;
  onOpenAdmin?: () => void;
  pendingAdminCount?: number;
}

export function UserHeader({
  user,
  balanceSYP,
  isTelegram,
  language,
  theme,
  cloudSyncStatus,
  onOpenSettings,
  onOpenAdmin,
  pendingAdminCount = 0,
}: UserHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [isAdminPasswordOpen, setIsAdminPasswordOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const t = translations[language];
  const isDark = theme === 'dark';

  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || (language === 'ar' ? 'مستخدم تلجرام' : 'Telegram User');
  const initial = (user.first_name || 'T')[0].toUpperCase();

  const handleCopyId = () => {
    triggerHaptic('light');
    navigator.clipboard.writeText(user.id.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSettingsClick = () => {
    triggerHaptic('medium');
    onOpenSettings();
  };

  // Click on the orange shield button
  const handleAdminShieldClick = () => {
    triggerHaptic('medium');
    setAdminPasswordInput('');
    setPasswordError(null);
    setIsAdminPasswordOpen(true);
  };

  const handleVerifyAdminPassword = (e: FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput.trim() === 'Admin1234567890') {
      triggerHaptic('success');
      setIsAdminPasswordOpen(false);
      setAdminPasswordInput('');
      setPasswordError(null);
      onOpenAdmin?.();
    } else {
      triggerHaptic('error');
      setPasswordError('كلمة المرور غير صحيحة! يرجى إعادة المحاولة.');
    }
  };

  return (
    <>
      <header
        id="user-header"
        className={`w-full backdrop-blur-xl border-b p-3 sm:p-3.5 sticky top-0 z-30 transition-colors ${
          isDark
            ? 'bg-[#060a15]/95 border-sky-500/20 shadow-md'
            : 'bg-white/95 border-slate-200 shadow-xs'
        }`}
      >
        <div className="max-w-md mx-auto space-y-2.5">
          {/* Top Bar: Bot Identity & Top Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-sky-400/20 shadow-sm">
                <img src={botLogo} alt="Bot Syria 2026 Logo" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-white tracking-tight">
                    بوت سوريا 2026
                  </span>
                  <span className="text-[10px] text-sky-300 font-mono font-bold bg-sky-500/15 px-1.5 py-0.2 rounded-md">
                    @BotSyria_2026_bot
                  </span>
                </div>
              </div>
            </div>

            {/* Actions: Orange Shield & Settings */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenAdmin && (
                <button
                  id="top-admin-portal-btn"
                  onClick={handleAdminShieldClick}
                  aria-label="لوحة الإدارة"
                  title="الدرع البرتقالي - لوحة الإدارة"
                  className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    isDark
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] font-bold hidden sm:inline">الإدارة</span>
                </button>
              )}

              <button
                id="top-settings-btn"
                onClick={handleSettingsClick}
                aria-label={t.settings}
                title={t.settings}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                }`}
              >
                <Settings className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>

          {/* User Profile & Balance in a Single Compact, Clean Card */}
          <div
            id="user-balance-card"
            className={`border rounded-2xl p-3 flex items-center justify-between transition-colors ${
              isDark
                ? 'bg-[#0d1629]/95 border-sky-500/25 shadow-xs'
                : 'bg-gradient-to-r from-sky-50/90 to-indigo-50/70 border-sky-200 shadow-xs'
            }`}
          >
            {/* User Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden shadow-xs">
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {displayName}
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3" />
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                  <button
                    id="copy-telegram-id-btn"
                    onClick={handleCopyId}
                    className="hover:text-sky-400 transition-colors flex items-center gap-1 cursor-pointer"
                    title={t.copyId}
                  >
                    <span>ID: {user.id}</span>
                    {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Balance in Syrian Pounds */}
            <div className="text-left shrink-0 pl-1">
              <span className="text-[10px] text-slate-400 block font-medium">الرصيد المتاح:</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-lg font-black font-mono tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {(balanceSYP ?? 0).toLocaleString('en-US')}
                </span>
                <span className="text-[11px] font-bold text-sky-400">ل.س</span>
              </div>
            </div>
          </div>

          {/* Minimal Persistent Cloud Storage Indicator (Clean & non-cluttered) */}
          <div className="flex items-center justify-between text-[10px] px-1 text-slate-400">
            <span className="flex items-center gap-1">
              <Cloud className="w-3 h-3 text-emerald-400" />
              <span>البيانات والرصيد محفوظان تلقائياً بحسابك</span>
            </span>
            <span className="text-emerald-400 font-medium">100% مضمون</span>
          </div>
        </div>
      </header>

      {/* Admin Password Prompt Modal (Admin1234567890) */}
      {isAdminPasswordOpen && (
        <div
          id="admin-password-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#0b1328] border-2 border-amber-500/40 p-5 space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <ShieldAlert className="w-6 h-6" />
                <h3 className="text-sm font-bold text-white">التحقق من كلمة المرور</h3>
              </div>
              <button
                onClick={() => setIsAdminPasswordOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              يرجى إدخال كلمة المرور للمتابعة والدخول إلى لوحة إدارة البوت:
            </p>

            <form onSubmit={handleVerifyAdminPassword} className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  required
                  value={adminPasswordInput}
                  onChange={(e) => {
                    setAdminPasswordInput(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  placeholder="أدخل كلمة المرور..."
                  className="w-full bg-[#050814] border border-amber-500/40 rounded-xl py-2.5 pr-9 pl-10 text-sm text-white font-mono placeholder-slate-600 focus:outline-hidden focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {passwordError && (
                <div className="p-2 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 animate-in shake">
                  <span>⚠️</span>
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdminPasswordOpen(false)}
                  className="py-2 px-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-98"
                >
                  <span>دخول الإدارة</span>
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
