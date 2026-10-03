import { motion } from 'motion/react';
import { ActiveTab } from '../types';
import { 
  Home, 
  CheckSquare, 
  Users, 
  Wallet, 
  KeyRound, 
  Headphones 
} from 'lucide-react';
import { triggerHaptic } from '../services/telegram';
import { Language, ThemeMode, translations } from '../utils/translations';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  pendingTasksCount: number;
  language: Language;
  theme: ThemeMode;
}

export function BottomNav({
  activeTab,
  onTabChange,
  pendingTasksCount,
  language,
  theme,
}: BottomNavProps) {
  const t = translations[language];
  const isDark = theme === 'dark';

  const handleTabClick = (tab: ActiveTab) => {
    if (tab !== activeTab) {
      triggerHaptic('light');
      onTabChange(tab);
    }
  };

  const navItems: { id: ActiveTab; label: string; icon: typeof Home; badge?: number }[] = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'tasks', label: t.navTasks, icon: CheckSquare, badge: pendingTasksCount },
    { id: 'referrals', label: t.navReferrals, icon: Users },
    { id: 'withdraw', label: t.navWithdraw, icon: Wallet },
    { id: 'promocode', label: t.navPromo, icon: KeyRound },
    { id: 'support', label: t.navSupport, icon: Headphones },
  ];

  return (
    <nav
      id="bottom-navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl border-t pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 transition-colors ${
        isDark
          ? 'bg-[#060a15]/95 border-sky-500/20 shadow-[0_-4px_25px_rgba(0,0,0,0.6)]'
          : 'bg-white/95 border-slate-200 shadow-lg'
      }`}
    >
      <div className="max-w-md mx-auto grid grid-cols-6 gap-0.5 px-1.5 sm:px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <motion.button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => handleTabClick(item.id)}
              whileTap={{ scale: 0.95 }}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-sky-400 font-bold'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-sky-500/5'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-all duration-200 ${
                    isActive
                      ? 'scale-110 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]'
                      : isDark
                      ? 'text-slate-400'
                      : 'text-slate-500'
                  }`}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-sky-500 text-slate-950 text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(14,165,233,0.6)]">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 leading-none truncate max-w-full font-medium ${
                  isActive
                    ? isDark
                      ? 'text-sky-300 font-bold glow-text-cyan'
                      : 'text-sky-600 font-bold'
                    : isDark
                    ? 'text-slate-400'
                    : 'text-slate-500'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <motion.span
                  layoutId="active-indicator"
                  className="w-5 h-0.5 bg-sky-400 rounded-full mt-1 shadow-[0_0_8px_rgba(56,189,248,0.9)]"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
