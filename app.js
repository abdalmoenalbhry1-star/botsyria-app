/**
 * BotSyria Telegram Mini App - Client Engine (app.js)
 * Zero LocalStorage - 100% Real-time SQLite Backend via Cloudflare Tunnel
 */

(() => {
  // 1. Primary Backend API URL (Cloudflare Tunnel to Flask Server)
  const API_URL = "https://christopher-jungle-offline-walter.trycloudflare.com";
  window.API_URL = API_URL;

  // 2. Telegram WebApp Initialization
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }

  // Extract current user from Telegram WebApp
  function getTelegramUser() {
    const tgUser = tg?.initDataUnsafe?.user;
    if (tgUser && tgUser.id) {
      return {
        id: String(tgUser.id),
        name: tgUser.first_name || 'مستخدم',
        username: tgUser.username || ''
      };
    }
    // Fallback for browser preview
    return {
      id: "841985444",
      name: "مستخدم تجريبي",
      username: "demo_user"
    };
  }

  // State in Memory (Zero LocalStorage)
  let currentUser = getTelegramUser();
  let currentBalance = 0;
  let currentReferrals = 0;
  let tasksList = [];
  let activeTab = 'tasks';

  // ----------------------------------------------------------------------
  // 3. API Communication Layer (Pure fetch to Cloudflare Tunnel)
  // ----------------------------------------------------------------------

  /**
   * Fetch user details from Flask SQLite backend
   */
  async function fetchUserData() {
    try {
      const res = await fetch(`${API_URL}/api/user?id=${currentUser.id}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      
      currentBalance = Number(data.balanceSYP || 0);
      currentReferrals = Number(data.referralsCount || 0);
      renderHeader();
      renderReferralsTab();
      return data;
    } catch (err) {
      console.warn("[API_URL fetchUserData error]:", err);
    }
  }

  /**
   * Fetch available tasks that user has NOT completed yet
   */
  async function fetchTasks() {
    try {
      const res = await fetch(`${API_URL}/api/tasks?id=${currentUser.id}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      tasksList = Array.isArray(data.tasks) ? data.tasks : [];
      renderTasksTab();
      return tasksList;
    } catch (err) {
      console.warn("[API_URL fetchTasks error]:", err);
      tasksList = [];
      renderTasksTab();
    }
  }

  /**
   * Complete a task and directly credit reward in SQLite
   */
  async function completeTask(taskId, taskReward) {
    try {
      showNotification("⏳ جاري التحقق من إنجاز المهمة وإضافة الرصيد...");
      const res = await fetch(`${API_URL}/api/complete-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          task_id: taskId
        })
      });
      
      const data = await res.json();
      if (data.success) {
        currentBalance = Number(data.new_balance || (currentBalance + taskReward));
        renderHeader();
        // Remove from available tasks
        tasksList = tasksList.filter(t => t.id !== taskId);
        renderTasksTab();
        showNotification(`🎉 مبارك! تمت إضافة +${Number(taskReward).toLocaleString()} ل.س إلى رصيدك!`, "success");
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      } else {
        showNotification(data.error || "⚠️ تعذر إكمال المهمة، قد تكون منجزة مسبقاً", "error");
      }
    } catch (err) {
      console.error("[completeTask error]:", err);
      showNotification("❌ حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً", "error");
    }
  }

  /**
   * Submit support ticket to Flask SQLite support_tickets
   */
  async function submitSupportTicket(messageText) {
    if (!messageText || messageText.trim().length < 5) {
      showNotification("⚠️ يرجى كتابة نص الشكوى بوضوح (5 أحرف على الأقل)", "error");
      return;
    }

    try {
      showNotification("⏳ جاري إرسال التذكرة إلى إدارة البوت...");
      const res = await fetch(`${API_URL}/api/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          username: currentUser.username || currentUser.name,
          message: messageText.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        showNotification(`✅ تم إرسال تذكرتك بنجاح برقم #${data.ticket_id}! سيتم الرد عليك في تلغرام.`, "success");
        const input = document.getElementById('support-input');
        if (input) input.value = '';
      } else {
        showNotification("⚠️ تعذر إرسال التذكرة، يرجى المحاولة لاحقاً", "error");
      }
    } catch (err) {
      console.error("[submitSupportTicket error]:", err);
      showNotification("❌ تعذر الاتصال بالخادم", "error");
    }
  }

  // ----------------------------------------------------------------------
  // 4. UI Rendering Engine (Standalone & Responsive)
  // ----------------------------------------------------------------------

  function renderHeader() {
    const balEl = document.getElementById('user-balance-val');
    if (balEl) balEl.innerText = `${currentBalance.toLocaleString()} ل.س`;

    const nameEl = document.getElementById('user-name-val');
    if (nameEl) nameEl.innerText = currentUser.name;
  }

  function renderTasksTab() {
    const container = document.getElementById('tasks-container');
    if (!container) return;

    if (tasksList.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div style="font-size: 40px; margin-bottom: 10px;">🎉</div>
          <h3 style="margin: 0 0 5px 0; color: #fff;">لا توجد مهام متاحة حالياً</h3>
          <p style="margin: 0; color: #94a3b8; font-size: 13px;">لقد أنجزت جميع المهام المتاحة! انتظر مهاماً جديدة قريباً.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tasksList.map(task => `
      <div class="task-card">
        <div class="task-info">
          <div class="task-title">🔹 ${escapeHtml(task.title)}</div>
          <div class="task-reward">💰 المكافأة: +${Number(task.reward).toLocaleString()} ل.س</div>
        </div>
        <div class="task-actions">
          <a href="${escapeHtml(task.link)}" target="_blank" class="btn-task-open" onclick="if (window.Telegram?.WebApp) Telegram.WebApp.openLink('${escapeHtml(task.link)}');">
            🔗 فتح الرابط
          </a>
          <button class="btn-task-claim" onclick="BotSyriaApp.completeTask(${task.id}, ${task.reward})">
            ✅ تأكيد وكسب
          </button>
        </div>
      </div>
    `).join('');
  }

  function renderReferralsTab() {
    const refCountEl = document.getElementById('ref-count-val');
    if (refCountEl) refCountEl.innerText = currentReferrals;

    const refEarnEl = document.getElementById('ref-earnings-val');
    if (refEarnEl) refEarnEl.innerText = `${(currentReferrals * 1500).toLocaleString()} ل.س`;

    const linkInput = document.getElementById('ref-link-input');
    if (linkInput) {
      linkInput.value = `https://t.me/BotSyria_2026_bot?start=ref_${currentUser.id}`;
    }
  }

  function showNotification(msg, type = 'info') {
    let toast = document.getElementById('syria-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'syria-toast';
      document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.className = `toast visible ${type}`;
    setTimeout(() => {
      toast.className = 'toast';
    }, 4000);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text || '';
    return div.innerHTML;
  }

  // ----------------------------------------------------------------------
  // 5. Global Export & Initial Load
  // ----------------------------------------------------------------------
  window.BotSyriaApp = {
    API_URL,
    getTelegramUser,
    fetchUserData,
    fetchTasks,
    completeTask,
    submitSupportTicket,
    switchTab: (tabName) => {
      activeTab = tabName;
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      
      const activeBtn = document.getElementById(`tab-btn-${tabName}`);
      if (activeBtn) activeBtn.classList.add('active');

      const content = document.getElementById(`tab-content-${tabName}`);
      if (content) content.style.display = 'block';

      if (tabName === 'tasks') fetchTasks();
      if (tabName === 'referrals') fetchUserData();
    },
    copyReferralLink: () => {
      const link = `https://t.me/BotSyria_2026_bot?start=ref_${currentUser.id}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(() => {
          showNotification("📋 تم نسخ رابط الإحالة بنجاح!", "success");
        });
      } else {
        showNotification(`رابطك: ${link}`);
      }
    },
    shareReferralTelegram: () => {
      const link = `https://t.me/BotSyria_2026_bot?start=ref_${currentUser.id}`;
      const text = encodeURIComponent(`🇸🇾 انضم معي إلى تطبيق بوت سوريا واكسب ليرات سورية حقيقية من تنفيذ المهام السهلة!\n${link}`);
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`;
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, '_blank');
      }
    }
  };

  // Auto-run on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    fetchUserData();
    fetchTasks();
  });
})();
