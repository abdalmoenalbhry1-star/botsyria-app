const fs = require('fs');

let withdraw = fs.readFileSync('src/components/WithdrawTab.tsx', 'utf8');
withdraw = withdraw.replace(/sysSettings\.minimumWithdrawal/g, '(sysSettings.minWithdrawalSYP || 3000)');
fs.writeFileSync('src/components/WithdrawTab.tsx', withdraw);

let referrals = fs.readFileSync('src/components/ReferralsTab.tsx', 'utf8');
referrals = referrals.replace(/sysSettings\.referralReward/g, '(sysSettings.referralRewardSYP || 1500)');
fs.writeFileSync('src/components/ReferralsTab.tsx', referrals);
