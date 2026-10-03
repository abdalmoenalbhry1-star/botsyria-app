import { useState } from 'react';
import { motion } from 'motion/react';
import { TelegramUser, ReferralStats, TopReferrer } from '../types';
import { 
  Users, 
  Copy, 
  Check, 
  Share2, 
  Gift, 
  Banknote, 
  Trophy, 
  Crown, 
  X, 
  Send 
} from 'lucide-react';
import { triggerHaptic, openExternalLink } from '../services/telegram';
import { getSystemSettings, 
  getReferralStats, 
  getTopReferrers, 
  OFFICIAL_REFERRAL_URL 
} from '../services/api';

interface ReferralsTabProps {
  user: TelegramUser;
}

export function ReferralsTab({ user }: ReferralsTabProps) {
  const [copied, setCopied] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  
  // Compute during render so updates take effect immediately
  const sysSettings = getSystemSettings();
  const referralReward = (sysSettings.referralRewardSYP || 1500);
  const stats = getReferralStats(user.id, user.username);
  const [topReferrers] = useState<TopReferrer[]>(() => 
    getTopReferrers(user.id, [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'مستخدم تلجرام', stats.totalReferrals)
  );

  const userReferralLink = stats.referralLink || `${OFFICIAL_REFERRAL_URL}?start=${user.id}`;

  const handleCopyLink = () => {
    triggerHaptic('light');
    navigator.clipboard.writeText(userReferralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const invitationText = `انضم الآن عبر بوت سوريا الرسمي واكسب أرباحك فوراً بالليرة السورية! 🇸🇾\n${userReferralLink}`;

  const shareToTelegram = () => {
    triggerHaptic('light');
    const url = `https://t.me/share/url?url=${encodeURIComponent(userReferralLink)}&text=${encodeURIComponent('انضم الآن عبر بوت سوريا الرسمي واكسب بالليرة السورية 🇸🇾💰')}`;
    openExternalLink(url);
  };

  const shareToWhatsApp = () => {
    triggerHaptic('light');
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(invitationText)}`;
    openExternalLink(url);
  };

  return (
    <div id="referrals-tab-content" className="w-full pb-28 pt-2 px-4 max-w-md mx-auto space-y-3.5">
      {/* Clean Header */}
      <div className="rounded-2xl border border-sky-500/25 bg-[#0d1629] p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">دعوة الأصدقاء</h2>
              <span className="text-[11px] text-slate-400">نظام الإحالات</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
            {referralReward.toLocaleString('en-US')} ل.س لكل إحالة
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          شارك رابطك المخصص مع أصدقائك، واكسب <strong className="text-sky-300 font-bold">{referralReward.toLocaleString('en-US')} ليرة سورية</strong> تضاف لرصيدك مباشرة عند انضمام أي صديق عبر رابطك.
        </p>
      </div>

      {/* Referral Link Box */}
      <div className="rounded-2xl border border-sky-500/20 bg-[#0d1629] p-3.5 space-y-2.5">
        <label className="text-xs font-bold text-slate-300 block">
          رابط الدعوة الخاص بك:
        </label>

        <div className="flex items-center gap-2 bg-[#070d1a] border border-slate-700 rounded-xl p-2 px-3">
          <span className="text-xs text-slate-300 font-mono truncate flex-1 select-all">
            {userReferralLink}
          </span>
          <motion.button
            onClick={handleCopyLink}
            whileTap={{ scale: 0.95 }}
            className="py-1 px-2.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">تم</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <motion.button
            onClick={shareToTelegram}
            whileTap={{ scale: 0.95 }}
            className="py-2 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>مشاركة بتلجرام</span>
          </motion.button>
          <motion.button
            onClick={shareToWhatsApp}
            whileTap={{ scale: 0.95 }}
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>مشاركة بواتساب</span>
          </motion.button>
        </div>
      </div>

      {/* Stats Cards: Referral Reward */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#0d1629] border border-sky-500/20 rounded-2xl p-3 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium block">عدد الإحالات</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-white font-mono">{stats.totalReferrals}</span>
            <span className="text-[11px] text-slate-400">صديق</span>
          </div>
        </div>

        <div className="bg-[#0d1629] border border-sky-500/20 rounded-2xl p-3 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium block">أرباح الإحالات</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-sky-400 font-mono">
              +{stats.totalEarningsSYP.toLocaleString('en-US')}
            </span>
            <span className="text-[11px] text-sky-300 font-bold">ل.س</span>
          </div>
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white">المتصدرون في الإحالات</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">TOP 10</span>
        </div>

        <div className="space-y-1.5">
          {topReferrers.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#0d1629] border border-slate-800 text-center space-y-2">
              <Trophy className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-xs font-bold text-slate-300">لا يوجد متصدرون حالياً</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                فرصتك لتتصدر القائمة! شارك رابط الإحالة الخاص بك مع أصدقائك وكن أول المتصدرين.
              </p>
            </div>
          ) : (
            topReferrers.map((item) => {
              const isRank1 = item.rank === 1;
              return (
                <motion.div
                  key={item.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                    item.isCurrentUser
                      ? 'bg-sky-500/15 border-sky-400 text-white'
                      : isRank1
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-[#0d1629] border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] font-mono shrink-0 ${
                      isRank1 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {isRank1 ? <Crown className="w-3.5 h-3.5" /> : item.rank}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-white truncate block">
                        {item.displayName} {item.isCurrentUser && '(أنت)'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        @{item.username}
                      </span>
                    </div>
                  </div>

                  <div className="text-left font-mono shrink-0">
                    <span className="font-bold text-sky-400 block">{item.totalReferrals ?? 0} إحالة</span>
                    <span className="text-[10px] text-slate-400">+{ (item.totalEarningsSYP ?? 0).toLocaleString('en-US') } ل.س</span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
