const fs = require('fs');
let content = fs.readFileSync('src/components/ReferralsTab.tsx', 'utf8');

content = content.replace(
  "import { \n  getReferralStats,",
  "import { getSystemSettings, \n  getReferralStats,"
);

content = content.replace(
  "// Compute during render so updates take effect immediately\n  const stats = getReferralStats(user.id, user.username);",
  "// Compute during render so updates take effect immediately\n  const sysSettings = getSystemSettings();\n  const referralReward = sysSettings.referralReward;\n  const stats = getReferralStats(user.id, user.username);"
);

content = content.replace(
  "2 ل.س لكل إحالة",
  "{referralReward.toLocaleString('en-US')} ل.س لكل إحالة"
);

content = content.replace(
  "<strong className=\"text-sky-300 font-bold\">2 ليرة سورية</strong>",
  "<strong className=\"text-sky-300 font-bold\">{referralReward.toLocaleString('en-US')} ليرة سورية</strong>"
);

content = content.replace(/2 SYP per referral/g, 'Referral Reward');

fs.writeFileSync('src/components/ReferralsTab.tsx', content);
