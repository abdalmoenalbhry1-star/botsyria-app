const fs = require('fs');
let content = fs.readFileSync('src/components/WithdrawTab.tsx', 'utf8');

// Replace imports
content = content.replace(
  "import { \n  getWithdrawalMethods,",
  "import { getSystemSettings, \n  getWithdrawalMethods,"
);

// Add sysSettings logic
content = content.replace(
  "const withdrawalMethods = getWithdrawalMethods();",
  "const sysSettings = getSystemSettings();\n  const minAmount = sysSettings.minimumWithdrawal;\n  const withdrawalMethods = getWithdrawalMethods().map(m => ({ ...m, minAmountSYP: minAmount }));"
);

// Remove hardcoded 300s
content = content.replace(/الحد الأدنى للسحب هو <strong className="text-sky-300 font-mono">300<\/strong> ل\.س فقط/, 'الحد الأدنى للسحب هو <strong className="text-sky-300 font-mono">{minAmount.toLocaleString(\'en-US\')}</strong> ل.س فقط');
content = content.replace(/الحد الأدنى: 300 ل\.س/g, 'الحد الأدنى: {minAmount.toLocaleString(\'en-US\')} ل.س');
content = content.replace(/min={300}/, 'min={minAmount}');
content = content.replace(/أدخل 300 أو أكثر.../, 'أدخل {minAmount} أو أكثر...');
content = content.replace(/balanceSYP >= 300/g, 'balanceSYP >= minAmount');
content = content.replace(/المبلغ أقل من الحد الأدنى \(300 ل\.س\)/, 'المبلغ أقل من الحد الأدنى ({minAmount.toLocaleString(\'en-US\')} ل.س)');

// Remove Quick Presets completely
const quickPresetsRegex = /\{\/\* Quick Presets \*\/\}[\s\S]*?<\/div>\s*<\/div>/;
content = content.replace(quickPresetsRegex, '');

fs.writeFileSync('src/components/WithdrawTab.tsx', content);
