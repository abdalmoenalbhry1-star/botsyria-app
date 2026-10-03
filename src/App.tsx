import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ActiveTab, Task, TelegramUser, CloudSyncStatus } from './types';
import { 
  initTelegramWebApp, 
  getTelegramUser, 
  isRunningInTelegram 
} from './services/telegram';
import { 
  getUserBalance, 
  getReferralStats,
  verifyUserCaptchaStatus,
  updateProfileCache,
  submitSupportMessage,
  fetchTasksList,
  fetchUserUnderReviewProofs
} from './services/api';
import { Language, ThemeMode } from './utils/translations';
import { SplashScreen } from './components/SplashScreen';
import { CaptchaGateModal } from './components/CaptchaGateModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminPortalModal } from './components/AdminPortalModal';
import { UserHeader } from './components/UserHeader';
import { HomeTab } from './components/HomeTab';
import { TasksTab } from './components/TasksTab';
import { ReferralsTab } from './components/ReferralsTab';
import { WithdrawTab } from './components/WithdrawTab';
import { PromoCodeTab } from './components/PromoCodeTab';
import { SupportTab } from './components/SupportTab';
import { BottomNav } from './components/BottomNav';

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [showCaptchaGate, setShowCaptchaGate] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [user, setUser] = useState<TelegramUser>(() => getTelegramUser());
  const [balanceSYP, setBalanceSYP] = useState<number>(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isTelegram, setIsTelegram] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [pendingAdminCount, setPendingAdminCount] = useState(0);

  // Theme & Language (simple lightweight keys)
  const [language, setLanguage] = useState<Language>('ar');
  const [theme, setTheme] = useState<ThemeMode>('dark');

  // Apply language direction to HTML root
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Apply theme class to document body / root
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.className = "bg-[#070a13] text-[#f8fafc] font-['Cairo',sans-serif] antialiased select-none overflow-x-hidden";
    } else {
      document.documentElement.classList.remove('dark');
      document.body.className = "bg-[#f8fafc] text-[#0f172a] font-['Cairo',sans-serif] antialiased select-none overflow-x-hidden";
    }
  }, [theme]);

  // Telegram Initialization
  useEffect(() => {
    initTelegramWebApp();
    const currentUser = getTelegramUser();
    setUser(currentUser);
    setIsTelegram(isRunningInTelegram());
  }, []);

// --- SQLite / Flask API-Based Sync Effect ---
  useEffect(() => {
    const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user || getTelegramUser();
    const userIdStr = String(tgUser ? tgUser.id : "85934120");

    const loadAndSync = async () => {
      // 1. Fetch User Profile from SQLite
      try {
        const res = await fetch(`/api/user?id=${userIdStr}`);
        if (res.ok) {
          const userData = await res.json();
          if (userData && userData.status === 'success') {
            // Reconstruct UserProfileData format for api.ts memory cache compatibility
            const initialData = {
              userId: Number(userIdStr),
              userName: userData.username || [tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(' ') || `مستخدم #${userIdStr}`,
              userUsername: tgUser?.username || `user_${userIdStr}`,
              balanceSYP: userData.balanceSYP || 0,
              referralsCount: userData.referralsCount || 0,
              completedTasks: userData.completedTasks || [],
              referralStats: {
                totalReferrals: userData.referralsCount || 0,
                totalEarningsSYP: (userData.referralsCount || 0) * 1500,
                rewardPerReferralSYP: 1500,
                referralLink: `https://t.me/BotSyria_2026_bot?start=ref_${userIdStr}`,
                invitedUsers: [],
              },
              lockedTaskIds: [],
              submittedTaskProofs: [],
              redeemedPromoCodes: [],
              latestWithdrawal: null,
              withdrawalHistory: [],
              tickets: [],
              captchaTimestamp: null,
              lastSyncedAt: Date.now()
            };
            
            updateProfileCache(initialData as any);
            setBalanceSYP(userData.balanceSYP || 0);
            setCompletedTasks(userData.completedTasks || []);
            setUser({
              id: Number(userIdStr),
              first_name: initialData.userName,
              username: initialData.userUsername
            });
          }
        }
      } catch (err) {
        console.warn('API sync profile notice:', err);
      }

      // 2. Fetch Tasks List from SQLite
      try {
        const res = await fetch('/api/tasks');
        if (res.ok) {
          const tasksData = await res.json();
          if (Array.isArray(tasksData)) {
            setTasks(tasksData.map((t: any) => ({
              id: String(t.id),
              title: t.title || '',
              description: t.description || 'نفذ المهمة واكسب مكافأة الليرات السورية فوراً',
              rewardSYP: Number(t.reward || t.rewardSYP || 2500),
              actionUrl: t.actionUrl || t.link || '#',
              actionType: t.actionType || 'channel',
              category: t.category || 'telegram',
              status: completedTasks.includes(String(t.id)) ? ('completed' as const) : ('available' as const),
              totalSeats: t.totalSeats || 1000,
              remainingSeats: t.remainingSeats || 1000
            })));
            setIsLoadingTasks(false);
          }
        }
      } catch (err) {
        console.warn('API sync tasks notice:', err);
        setIsLoadingTasks(false);
      }
    };

    // Fast initial load
    loadAndSync();

    // High fidelity real-time polling loop (every 4 seconds)
    const interval = setInterval(loadAndSync, 4000);

    return () => clearInterval(interval);
  }, [completedTasks]);

  const handleTaskUpdated = (taskId: string, rewardSYP: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'under_review' as const } : t))
    );
  };

  const handleBalanceRefresh = () => {
    // Handled in real-time by Firestore snapshot listener!
  };

  const handleSYPEarned = (rewardSYP: number) => {
    // Handled in real-time by Firestore snapshot listener!
  };

  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
  const pendingTasksCount = tasks.filter((t) => t.status === 'available').length;
  const referralStats = getReferralStats(user.id, user.username);
  const isDark = theme === 'dark';

  return (
    <>
      {/* Splash Screen with BOT SYRIA Emblem */}
      {showSplash && (
        <SplashScreen
          language={language}
          onComplete={() => {
            setShowSplash(false);
            const captchaStatus = verifyUserCaptchaStatus();
            if (!captchaStatus.isValid) {
              setShowCaptchaGate(true);
            }
          }}
        />
      )}

      {/* Captcha Security Gate */}
      {!showSplash && showCaptchaGate && (
        <CaptchaGateModal
          language={language}
          onSuccess={() => {
            setShowCaptchaGate(false);
          }}
        />
      )}

      {/* Main Application Container */}
      <div
        id="tma-container"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        className={`min-h-screen flex flex-col antialiased selection:bg-sky-500 selection:text-white transition-colors duration-300 ${
          isDark ? 'bg-[#070a13] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
        }`}
      >
        {/* Telegram User & Balance Top Header */}
        <UserHeader
          user={user}
          balanceSYP={balanceSYP}
          isTelegram={isTelegram}
          language={language}
          theme={theme}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
        />

        {/* Main Content Area */}
        <main id="tma-main-content" className="flex-1 w-full flex flex-col overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex-1 w-full flex flex-col h-full overflow-y-auto"
            >
              {activeTab === 'home' && (
                <HomeTab
                  user={user}
                  balanceSYP={balanceSYP}
                  completedTasksCount={completedTasksCount}
                  pendingTasksCount={pendingTasksCount}
                  totalReferrals={referralStats.totalReferrals}
                  language={language}
                  theme={theme}
                  onNavigate={setActiveTab}
                />
              )}

              {activeTab === 'tasks' && (
                <TasksTab
                  tasks={tasks}
                  user={user}
                  onTaskUpdated={handleTaskUpdated}
                  onRefresh={async () => {}}
                  isLoading={isLoadingTasks}
                />
              )}

              {activeTab === 'referrals' && (
                <ReferralsTab user={user} />
              )}

              {activeTab === 'withdraw' && (
                <WithdrawTab
                  user={user}
                  balanceSYP={balanceSYP}
                  onBalanceUpdated={handleBalanceRefresh}
                />
              )}

              {activeTab === 'promocode' && (
                <PromoCodeTab
                  user={user}
                  onCodeRedeemed={handleSYPEarned}
                />
              )}

              {activeTab === 'support' && (
                <SupportTab user={user} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Fixed Bottom Navigation Bar */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingTasksCount={pendingTasksCount}
          language={language}
          theme={theme}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          language={language}
          onLanguageChange={setLanguage}
          theme={theme}
          onThemeChange={setTheme}
        />

        {/* Admin Portal Modal */}
        <AdminPortalModal
          isOpen={isAdminOpen}
          tasks={tasks}
          onClose={() => {
            setIsAdminOpen(false);
          }}
          onDataChanged={() => {}}
        />
      </div>
    </>
  );
}
