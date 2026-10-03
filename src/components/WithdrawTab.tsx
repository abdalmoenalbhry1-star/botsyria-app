import { useState, type FormEvent, useEffect } from 'react';
import { TelegramUser, WithdrawalRequest, WithdrawalMethodType } from '../types';
import { 
  Banknote, 
  CheckCircle2, 
  AlertCircle, 
  ArrowDownCircle, 
  Loader2, 
  Clock, 
  Smartphone, 
  Building2, 
  Check, 
  XCircle,
  Sparkles,
  History
} from 'lucide-react';
import { triggerHaptic } from '../services/telegram';
import { 
  getSystemSettings, 
  getWithdrawalMethods, 
  submitWithdrawal, 
  getLatestWithdrawalRequest,
  getStoredWithdrawals,
  clearUserWithdrawalHistory
} from '../services/api';

interface WithdrawTabProps {
  user: TelegramUser;
  balanceSYP: number;
  onBalanceUpdated: () => void;
}

export function WithdrawTab({ user, balanceSYP, onBalanceUpdated }: WithdrawTabProps) {
  const [selectedMethodId, setSelectedMethodId] = useState<WithdrawalMethodType>('syriatel_cash');
  const [accountNumber, setAccountNumber] = useState('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [latestRequest, setLatestRequest] = useState<WithdrawalRequest | null>(() => getLatestWithdrawalRequest(user.id));
  const [userRequests, setUserRequests] = useState<WithdrawalRequest[]>(() => getStoredWithdrawals(user.id));

  const sysSettings = getSystemSettings();
  const minAmount = (sysSettings.minWithdrawalSYP || 3000);
  const withdrawalMethods = getWithdrawalMethods().map(m => ({ ...m, minAmountSYP: minAmount }));
  const selectedMethod = withdrawalMethods.find((m) => m.id === selectedMethodId) || withdrawalMethods[0];

  // Synchronize latest request state & withdrawal history
  useEffect(() => {
    setLatestRequest(getLatestWithdrawalRequest(user.id));
    setUserRequests(getStoredWithdrawals(user.id));
  }, [balanceSYP, user.id]);

  const parsedAmount = parseInt(amountInput, 10) || 0;
  const isBelowMin = parsedAmount > 0 && parsedAmount < selectedMethod.minAmountSYP;
  const isOverBalance = parsedAmount > balanceSYP;
  const isEligible = parsedAmount >= selectedMethod.minAmountSYP && parsedAmount <= balanceSYP && parsedAmount > 0;

  // Phone validation for Syriatel Cash
  const isSyriatelPhoneValid = selectedMethod.id === 'syriatel_cash'
    ? /^(09\d{8}|9\d{8})$/.test(accountNumber.trim().replace(/\s+/g, ''))
    : true;

  const handleSelectMethod = (id: WithdrawalMethodType) => {
    triggerHaptic('light');
    setSelectedMethodId(id);
  };

  const handleQuickAmount = (amt: number) => {
    triggerHaptic('light');
    setAmountInput(amt.toString());
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const cleanNum = accountNumber.trim().replace(/\s+/g, '');
    if (!cleanNum) {
      triggerHaptic('warning');
      setToastMessage({ text: 'يرجى إدخال رقم الهاتف أو الحساب بشكل صحيح', type: 'error' });
      return;
    }

    if (selectedMethod.id === 'syriatel_cash' && !/^(09\d{8}|9\d{8})$/.test(cleanNum)) {
      triggerHaptic('error');
      setToastMessage({ 
        text: '⚠️ يرجى إدخال رقم سيريتل كاش صحيح (يبدأ بـ 09 ومكون من 10 أرقام)', 
        type: 'error' 
      });
      return;
    }

    if (selectedMethod.id === 'cham_cash' && cleanNum.length < 4) {
      triggerHaptic('error');
      setToastMessage({ 
        text: '⚠️ يرجى إدخال رقم حساب أو هاتف شام كاش صحيح', 
        type: 'error' 
      });
      return;
    }

    if (isBelowMin) {
      triggerHaptic('error');
      setToastMessage({
        text: `⚠️ الحد الأدنى للسحب هو ${selectedMethod.minAmountSYP.toLocaleString('en-US')} ل.س`,
        type: 'error',
      });
      return;
    }

    if (isOverBalance) {
      triggerHaptic('error');
      setToastMessage({
        text: `⚠️ رصيدك المتوفر (${balanceSYP.toLocaleString('en-US')} ل.س) لا يكفي لسحب هذا المبلغ`,
        type: 'error',
      });
      return;
    }

    triggerHaptic('medium');
    setIsSubmitting(true);

    try {
      const res = await submitWithdrawal(
        user.id,
        selectedMethod.id,
        cleanNum,
        parsedAmount
      );

      if (res.success) {
        triggerHaptic('success');
        setToastMessage({ text: res.message, type: 'success' });
        setAccountNumber('');
        setAmountInput('');
        onBalanceUpdated();
        setLatestRequest(getLatestWithdrawalRequest(user.id));
        setUserRequests(getStoredWithdrawals(user.id));
      } else {
        triggerHaptic('error');
        setToastMessage({ text: res.message, type: 'error' });
      }
    } catch {
      triggerHaptic('error');
      setToastMessage({ text: 'حدث خطأ في الاتصال، يرجى المحاولة ثانية', type: 'error' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  return (
    <div id="withdraw-tab-content" className="w-full pb-28 pt-2 px-4 max-w-md mx-auto space-y-3.5">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          id="withdraw-toast"
          className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md animate-in fade-in duration-150 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-500/40'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border border-rose-500/40'
              : 'bg-slate-900/90 text-slate-200 border border-sky-500/30'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          )}
          <span className="flex-1">{toastMessage.text}</span>
        </div>
      )}

      {/* Clean Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>سحب الأرباح</span>
            <span className="text-[10px] text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded-full border border-sky-500/30">
              سيريتل وشام كاش
            </span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            الحد الأدنى للسحب هو <strong className="text-sky-300 font-mono">{minAmount.toLocaleString('en-US')}</strong> ل.س فقط
          </p>
        </div>

        <div className="text-left font-mono">
          <span className="text-[10px] text-slate-400 block">رصيدك الحالي</span>
          <span className="text-sm font-black text-white">{balanceSYP.toLocaleString('en-US')} ل.س</span>
        </div>
      </div>

      {/* 24-Hour Processing & Limit Notice Banner */}
      <div className="bg-sky-950/40 border border-sky-500/30 p-3 rounded-2xl flex items-center gap-2.5 text-xs text-sky-200">
        <Clock className="w-4.5 h-4.5 text-sky-400 shrink-0" />
        <div className="leading-tight space-y-0.5">
          <span className="font-bold text-white block">تعليمات وقوانين السحب:</span>
          <span className="text-[11px] text-slate-300">
            يُسمح بطلبين سحب كحد أقصى كل 24 ساعة. تبقى نتيجة أحدث طلب معروضة لمدة 5 ساعات ثم تختفي تلقائياً.
          </span>
        </div>
      </div>

      {/* Latest Withdrawal Request Card (اخر طلب سحب) */}
      {latestRequest && (() => {
        const referenceTime = latestRequest.processedTimeMs || latestRequest.requestTimeMs || Date.now();
        const elapsedMs = Math.max(0, Date.now() - referenceTime);
        const remainingMs = Math.max(0, 5 * 60 * 60 * 1000 - elapsedMs);
        const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
        const remainingMins = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

        return (
          <div
            id="latest-withdrawal-card"
            className={`rounded-2xl border p-4 space-y-3 shadow-md animate-in fade-in duration-200 ${
              latestRequest.status === 'approved'
                ? 'bg-emerald-950/50 border-emerald-500/50'
                : latestRequest.status === 'rejected'
                ? 'bg-rose-950/50 border-rose-500/50'
                : 'bg-[#0d1629] border-amber-500/50'
            }`}
          >
            {/* Status Header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                {latestRequest.status === 'pending' && (
                  <>
                    <Clock className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                    <span className="text-xs font-bold text-amber-300">طلب السحب قيد المعالجة والتدقيق</span>
                  </>
                )}
                {latestRequest.status === 'approved' && (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-emerald-300">تم الموافقة على الطلب وتحويل المبلغ بنجاح</span>
                  </>
                )}
                {latestRequest.status === 'rejected' && (
                  <>
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="text-xs font-bold text-rose-300">لقد تم رفض الطلب وتم استرجاع النقاط لرصيدك</span>
                  </>
                )}
              </div>

              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                يختفي خلال {remainingHours}س و {remainingMins}د
              </span>
            </div>

            {/* Account Details */}
            <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-[#070d1a] border border-slate-800">
              <div>
                <span className="text-slate-400 text-[11px] block">{latestRequest.methodName}</span>
                <span className="text-white font-mono font-bold">{latestRequest.destinationAccount}</span>
              </div>
              <div className="text-left font-mono">
                <span className="text-[10px] text-slate-400 block">المبلغ المطلوبة</span>
                <span className={`text-base font-black ${
                  latestRequest.status === 'approved' ? 'text-emerald-400' : latestRequest.status === 'rejected' ? 'text-rose-400' : 'text-amber-300'
                }`}>
                  {latestRequest.amountSYP.toLocaleString('en-US')} ل.س
                </span>
              </div>
            </div>

            {/* Admin Decision Notes if Rejected or Approved */}
            {latestRequest.status === 'rejected' && (
              <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800/60 text-xs text-rose-200 space-y-1">
                <span className="font-bold text-rose-300 block">سبب الرفض:</span>
                <p className="text-[11px] leading-relaxed">
                  {latestRequest.adminDecisionNotes || 'رقم الحساب غير صحيح أو فشل استقبال الحوالة في المحفظة. تم إعادة المبلغ كاملاً لرصيدك.'}
                </p>
              </div>
            )}

            {latestRequest.status === 'approved' && (
              <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-800/60 text-xs text-emerald-200">
                <p className="text-[11px] font-medium leading-relaxed">
                  ✓ تم تحويل مبلغ {latestRequest.amountSYP.toLocaleString('en-US')} ل.س إلى حسابك ({latestRequest.destinationAccount}) بنجاح.
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Method Selection (سيريتل كاش / شام كاش) */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-300 block">
          اختر وسيلة الاستلام:
        </label>
        <div className="grid grid-cols-2 gap-2">
          {withdrawalMethods.map((method) => {
            const isSelected = selectedMethod.id === method.id;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => handleSelectMethod(method.id)}
                className={`p-3 rounded-2xl border text-start transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500/15 border-sky-400 text-white shadow-xs'
                    : 'bg-[#0d1629] border-sky-500/20 text-slate-300 hover:border-sky-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {method.id === 'syriatel_cash' ? (
                      <Smartphone className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Building2 className="w-4 h-4 text-emerald-400" />
                    )}
                    <span className="text-xs font-bold">{method.name.split('(')[0].trim()}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </div>
                <div className="text-[10px] text-sky-300 font-mono font-bold">
                  الحد الأدنى: {minAmount.toLocaleString('en-US')} ل.س
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Withdrawal Form */}
      <form
        id="withdrawal-form"
        onSubmit={handleSubmit}
        className="bg-[#0d1629] border border-sky-500/25 rounded-2xl p-4 space-y-3.5 shadow-xs"
      >
        {/* Field: Phone or Account */}
        <div className="space-y-1">
          <label htmlFor="destination-account" className="text-xs font-bold text-slate-200 block">
            {selectedMethod.fieldLabel}:
          </label>
          <input
            id="destination-account"
            type="text"
            required
            placeholder={selectedMethod.placeholder}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="w-full bg-[#070d1a] border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 font-mono focus:outline-hidden focus:border-sky-500"
          />
          {selectedMethod.id === 'syriatel_cash' && accountNumber && (
            <span className={`text-[10px] font-mono block ${isSyriatelPhoneValid ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isSyriatelPhoneValid ? '✓ رقم سيريتل سليم' : '✕ يجب أن يبدأ بـ 09 (10 أرقام)'}
            </span>
          )}
        </div>

        {/* Field: Amount */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="withdraw-amount-input" className="font-bold text-slate-200">
              المبلغ المطلوب سحبه (ل.س):
            </label>
            <span className="text-sky-300 font-bold font-mono">
              الحد الأدنى: {minAmount.toLocaleString('en-US')} ل.س
            </span>
          </div>

          <input
            id="withdraw-amount-input"
            type="number"
            min={minAmount}
            max={balanceSYP}
            required
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder={`أدخل ${minAmount.toLocaleString('en-US')} أو أكثر...`}
            className={`w-full bg-[#070d1a] border rounded-xl p-2.5 text-sm text-center font-black text-white font-mono focus:outline-hidden ${
              isBelowMin || isOverBalance
                ? 'border-rose-500 text-rose-200'
                : 'border-slate-700 focus:border-sky-500'
            }`}
          />

          {balanceSYP >= minAmount && (
            <div className="text-right pt-0.5">
              <button
                type="button"
                onClick={() => handleQuickAmount(balanceSYP)}
                className="text-[11px] text-sky-400 hover:underline cursor-pointer"
              >
                سحب كامل الرصيد ({balanceSYP.toLocaleString('en-US')} ل.س)
              </button>
            </div>
          )}

          {/* Validation Feedback */}
          {isBelowMin && (
            <p className="text-rose-400 text-[11px] font-bold">
              ⚠️ المبلغ أقل من الحد الأدنى ({minAmount.toLocaleString('en-US')} ل.س).
            </p>
          )}
          {isOverBalance && (
            <p className="text-rose-400 text-[11px] font-bold">
              ⚠️ المبلغ أكبر من رصيدك المتوفر ({balanceSYP.toLocaleString('en-US')} ل.س).
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          id="confirm-withdrawal-btn"
          type="submit"
          disabled={!isEligible || isSubmitting}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            !isEligible || isSubmitting
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sm'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري تقديم الطلب...</span>
            </>
          ) : (
            <>
              <ArrowDownCircle className="w-4 h-4" />
              <span>تأكيد طلب السحب ({parsedAmount > 0 ? `${parsedAmount.toLocaleString('en-US')} ل.س` : `${minAmount.toLocaleString('en-US')} ل.س كحد أدنى`})</span>
            </>
          )}
        </button>
      </form>

      {/* Withdrawal Requests History List */}
      {userRequests.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-sky-400" />
              <span>طلبات السحب النشطة المعلقة</span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono">{userRequests.length} طلبات</span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  clearUserWithdrawalHistory(user.id);
                  setUserRequests([]);
                }}
                className="text-[10px] text-slate-400 hover:text-rose-400 bg-slate-800/60 hover:bg-rose-500/10 px-2 py-0.5 rounded-lg border border-slate-700 hover:border-rose-500/30 transition-colors cursor-pointer"
              >
                مسح السجل
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {userRequests.map((req) => (
              <div
                key={req.id}
                className="p-3 rounded-2xl bg-[#0d1629] border border-slate-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{req.methodName} ({req.destinationAccount})</span>
                  <span className="font-black text-sky-300 font-mono">{req.amountSYP.toLocaleString('en-US')} ل.س</span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400 font-mono">{req.timestamp}</span>
                  {req.status === 'pending' && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 animate-spin shrink-0" /> قيد المعالجة (خلال 24h)
                    </span>
                  )}
                  {req.status === 'approved' && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 shrink-0" /> تم التحويل بنجاح
                    </span>
                  )}
                  {req.status === 'rejected' && (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <XCircle className="w-3 h-3 shrink-0" /> مرفوض (تم إرجاع الرصيد)
                    </span>
                  )}
                </div>

                {req.adminDecisionNotes && req.status === 'rejected' && (
                  <p className="text-[10px] text-rose-300 bg-rose-950/40 p-2 rounded-xl border border-rose-800/40">
                    سبب الرفض: {req.adminDecisionNotes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
