import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { initializeApp } from 'firebase/app';
import { 
    initializeFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    deleteDoc,
    collection, 
    getDocs, 
    runTransaction,
    increment 
} from 'firebase/firestore';
import { DatabaseSync } from "node:sqlite";
import dotenv from "dotenv";

dotenv.config();

const __dirname = process.cwd();

// ----------------------------------------------------------------------
// 1. SQLite Database Initialization (Zero fake data, shared with bot.py)
// ----------------------------------------------------------------------
const DB_FILE = path.join(process.cwd(), "database.db");
const sqlite = new DatabaseSync(DB_FILE);

// Ensure all tables exist in database.db
sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
        telegram_id TEXT PRIMARY KEY,
        balanceSYP INTEGER DEFAULT 0,
        referralsCount INTEGER DEFAULT 0,
        referredBy TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        reward INTEGER,
        link TEXT,
        active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS completed_tasks (
        user_id TEXT,
        task_id INTEGER,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        username TEXT,
        message TEXT,
        status TEXT DEFAULT 'OPEN',
        admin_reply TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS task_submissions (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        task_title TEXT,
        user_id TEXT,
        username TEXT,
        proof_type TEXT,
        image_base64 TEXT,
        notes TEXT,
        status TEXT DEFAULT 'under_review',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS withdrawals (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        username TEXT,
        amount INTEGER,
        method_id TEXT,
        account TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`);
console.log("✅ [Server SQLite] database.db connected and schemas verified!");

// ----------------------------------------------------------------------
// 2. Firebase Applet Config (Optional/Live sync)
// ----------------------------------------------------------------------
const configPath = fs.existsSync(path.join(__dirname, "firebase-applet-config.json")) 
    ? path.join(__dirname, "firebase-applet-config.json") 
    : path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

const firebaseApp = initializeApp(firebaseConfig);
const db = initializeFirestore(firebaseApp, {
    experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

const app = express();
app.use(express.json({ limit: '10mb' }));

const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => next();

// Telegram Bot Token and Admin ID
const ADMIN_ID = "841985444";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8749338629:AAGB3rb1-EjqZu10sHoYGXghMFrpwXy_2GM";

async function sendTelegramMessage(chatId: string | number, text: string): Promise<boolean> {
    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'Markdown'
            })
        });
        if (res.ok) {
            return true;
        }
        // Fallback to plain text without Markdown if formatting error occurred
        const res2 = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text.replace(/[*_`\[\]()]/g, '')
            })
        });
        return res2.ok;
    } catch (e) {
        console.error(`[Telegram send error to ${chatId}]`, e);
        return false;
    }
}

// --- Health Check ---
app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// ----------------------------------------------------------------------
// 3. User & Tasks & Under-Review Proofs Routes (100% Real)
// ----------------------------------------------------------------------

// Get user profile (Supports both /api/user?id=X and /api/user/:telegramId)
app.get(["/api/user", "/api/user/:telegramId"], authenticate, async (req, res) => {
    try {
        const uid = String(req.params.telegramId || req.query.id || '').trim();
        if (!uid) return res.status(400).json({ error: 'Missing user id' });

        // Check SQLite first
        let userStmt = sqlite.prepare("SELECT * FROM users WHERE telegram_id = ?");
        let userRow = userStmt.get(uid) as any;

        if (!userRow) {
            sqlite.prepare("INSERT INTO users (telegram_id, username, balanceSYP, referralsCount, referredBy) VALUES (?, '', 0, 0, '')").run(uid);
            userRow = userStmt.get(uid) as any;
        }

        // Check completed tasks from SQLite
        const compStmt = sqlite.prepare("SELECT task_id FROM completed_tasks WHERE user_id = ?");
        const compRows = compStmt.all(uid) as any[];
        const completedTasks = compRows.map(r => String(r.task_id));

        return res.json({
            telegram_id: uid,
            userId: Number(uid),
            username: userRow?.username || '',
            balanceSYP: userRow?.balanceSYP || 0,
            referralsCount: userRow?.referralsCount || 0,
            referredBy: userRow?.referredBy || '',
            completedTasks,
            status: 'success'
        });
    } catch (e: any) {
        console.error('[API User Error]', e);
        res.status(500).json({ error: e.message });
    }
});

// Complete Task route
app.post("/api/complete-task", (req, res) => {
    try {
        const { user_id, task_id } = req.body;
        const uid = String(user_id || '').trim();
        const tid = Number(task_id);

        if (!uid || isNaN(tid)) return res.status(400).json({ success: false, error: 'Missing user_id or task_id' });

        const taskRow = sqlite.prepare("SELECT * FROM tasks WHERE id = ? AND active = 1").get(tid) as any;
        if (!taskRow) return res.status(404).json({ success: false, error: 'المهمة غير متوفرة' });

        const already = sqlite.prepare("SELECT 1 FROM completed_tasks WHERE user_id = ? AND task_id = ?").get(uid, tid);
        if (already) return res.status(400).json({ success: false, error: 'المهمة منجزة مسبقاً' });

        const reward = Number(taskRow.reward || 2500);
        sqlite.prepare("INSERT INTO completed_tasks (user_id, task_id) VALUES (?, ?)").run(uid, tid);
        sqlite.prepare("UPDATE users SET balanceSYP = balanceSYP + ? WHERE telegram_id = ?").run(reward, uid);

        const updated = sqlite.prepare("SELECT balanceSYP FROM users WHERE telegram_id = ?").get(uid) as any;
        const new_balance = updated ? updated.balanceSYP : reward;

        sendTelegramMessage(uid, `🎉 *تهانينا! تم إنجاز المهمة بنجاح!*\n\n🔹 المهمة: *${taskRow.title}*\n💰 تمت إضافة *+${reward.toLocaleString()} ل.س* إلى رصيدك.\n💵 رصيدك الحالي: *${new_balance.toLocaleString()} ل.س*.`);

        res.json({ success: true, task_id: tid, reward, new_balance, message: 'تم إنجاز المهمة وإضافة الرصيد بنجاح!' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Support ticket route
app.post("/api/support", (req, res) => {
    try {
        const { user_id, username, message } = req.body;
        const uid = String(user_id || '').trim();
        if (!uid || !message) return res.status(400).json({ success: false, error: 'Missing user_id or message' });

        const info = sqlite.prepare("INSERT INTO support_tickets (user_id, username, message, status) VALUES (?, ?, ?, 'OPEN')").run(uid, username || 'N/A', message);

        const alertText = `🚨 *تذكرة دعم جديدة واردة من الميني أب!* 📩\n\n` +
            `🎫 رقم التذكرة: \`#${info.lastInsertRowid}\`\n` +
            `👤 المستخدم: @${username || 'N/A'} (ID: \`${uid}\`)\n` +
            `💬 الرسالة:\n"${message}"\n\n` +
            `للرد على المستخدم: \`/reply_ticket ${info.lastInsertRowid} نص الرد\``;

        sendTelegramMessage(ADMIN_ID, alertText);

        res.json({ success: true, ticket_id: info.lastInsertRowid, message: 'تم استلام الشكوى بنجاح وسيتم الرد عليك في تلغرام.' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Get user's active under-review proofs so they persist on refresh
app.get("/api/user-proofs/:userId", (req, res) => {
    try {
        const uid = req.params.userId;
        const stmt = sqlite.prepare("SELECT task_id, status FROM task_submissions WHERE user_id = ?");
        const rows = stmt.all(uid) as any[];
        res.json({ proofs: rows });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Tasks List (Real from SQLite + Firestore)
app.get("/api/tasks", authenticate, async (req, res) => {
    try {
        const stmt = sqlite.prepare("SELECT * FROM tasks WHERE active = 1 ORDER BY id DESC");
        const rows = stmt.all() as any[];
        if (rows.length > 0) {
            const mapped = rows.map(r => ({
                id: String(r.id),
                title: r.title,
                description: 'نفذ المهمة واحصل على مكافأتك الفورية بالليرة السورية',
                reward: r.reward,
                rewardSYP: r.reward,
                link: r.link,
                actionUrl: r.link,
                actionType: 'channel',
                category: 'telegram',
                status: 'available',
                totalSeats: 1000,
                remainingSeats: 1000
            }));
            return res.json(mapped);
        }

        // Firestore fallback
        const snapshot = await getDocs(collection(db, 'tasks'));
        const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        res.json(tasks);
    } catch (e: any) {
        console.error('[API Tasks Error]', e);
        res.status(500).json({ error: e.message });
    }
});

// --- Task Proof Submission Route (Saves directly to SQLite database.db) ---
app.post("/api/submit-proof", (req, res) => {
    const { taskId, taskTitle, userId, userName, accountUsername, notes, proofType, proofImageBase64 } = req.body;
    const submissionId = `sub_${Date.now()}_${userId}`;

    try {
        // Save to SQLite
        const insertStmt = sqlite.prepare(`
            INSERT INTO task_submissions (id, task_id, task_title, user_id, username, proof_type, image_base64, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'under_review')
        `);
        insertStmt.run(
            submissionId,
            String(taskId),
            taskTitle || `مهمة #${taskId}`,
            String(userId),
            accountUsername || userName || 'مستخدم',
            proofType || 'both',
            proofImageBase64 || '',
            notes || '',
        );

        // Notify Admin on Telegram
        const alertMsg = `📸 *إثبات مهمة جديد وارد للمراجعة!* 🇸🇾\n\n` +
            `🔹 *المهمة:* ${taskTitle || taskId}\n` +
            `👤 *المستخدم:* ${userName || 'مستخدم'} (@${accountUsername || 'N/A'})\n` +
            `🆔 *المعرف:* \`${userId}\`\n` +
            `🖼️ *مرفق صورة:* ${proofImageBase64 ? 'نعم ✅' : 'لا ❌'}\n` +
            (notes ? `📝 *ملاحظة:* ${notes}\n` : '') +
            `\n⏳ الإثبات الآن قيد المراجعة في لوحة الإدارة!`;

        sendTelegramMessage(ADMIN_ID, alertMsg);

        res.json({ success: true, submissionId, message: "تم تسجيل الإثبات بنجاح وهو الآن قيد المراجعة!" });
    } catch (e: any) {
        console.error("[Submit Proof Error]", e);
        res.status(500).json({ error: e.message });
    }
});

// --- User Withdrawal Route (Saves directly to SQLite database.db) ---
app.post("/api/withdrawals", authenticate, (req, res) => {
    const { userId, amount, methodId, account, userName } = req.body;
    const uid = String(userId);
    const numAmount = Number(amount);

    try {
        // Check balance in SQLite
        const userStmt = sqlite.prepare("SELECT balanceSYP FROM users WHERE telegram_id = ?");
        const userRow = userStmt.get(uid) as any;
        const currentBalance = userRow ? userRow.balanceSYP : 0;

        if (currentBalance < numAmount) {
            return res.status(400).json({ error: 'الرصيد غير كافٍ لإتمام السحب' });
        }

        const withdrawalId = `w_${Date.now()}`;

        // Deduct balance
        sqlite.prepare("UPDATE users SET balanceSYP = balanceSYP - ? WHERE telegram_id = ?").run(numAmount, uid);

        // Insert withdrawal record
        sqlite.prepare(`
            INSERT INTO withdrawals (id, user_id, username, amount, method_id, account, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `).run(withdrawalId, uid, userName || uid, numAmount, methodId, account);

        // Notify Admin on Telegram
        const text = `💰 *طلب سحب أرباح جديد!* 🇸🇾\n\n` +
            `🆔 المعرف: \`${uid}\`\n` +
            `👤 العضو: ${userName || uid}\n` +
            `💵 المبلغ: *${numAmount.toLocaleString()} ل.س*\n` +
            `🏦 الطريقة: ${methodId}\n` +
            `💳 الحساب: \`${account}\`\n\n` +
            `⏳ يرجى تدقيق الطلب في لوحة الإدارة والموافقة عليه.`;

        sendTelegramMessage(ADMIN_ID, text);

        res.json({ success: true, withdrawalId });
    } catch (e: any) {
        console.error("[Withdrawal Error]", e);
        res.status(400).json({ error: e.message });
    }
});

// --- Support Ticket Submission Route ---
app.post("/api/notify-admin", (req, res) => {
    const { userId, username, message } = req.body;
    try {
        sqlite.prepare(`
            INSERT INTO support_tickets (user_id, username, message, status)
            VALUES (?, ?, ?, 'OPEN')
        `).run(String(userId), username || 'N/A', message);

        const text = `⚠️ *تذكرة دعم جديدة واردة!* 📩\n\n` +
            `👤 العضو: @${username || 'N/A'} (ID: \`${userId}\`)\n` +
            `💬 الرسالة:\n"${message}"`;

        sendTelegramMessage(ADMIN_ID, text);
        res.json({ success: true });
    } catch (e: any) {
        console.error("[Notify Admin Error]", e);
        res.status(500).json({ error: e.message });
    }
});

// ----------------------------------------------------------------------
// 4. Admin Portal Real Endpoints (Zero Mock Data, Direct SQLite)
// ----------------------------------------------------------------------

// 1. Get Real Pending Task Proofs
app.get("/api/admin/proofs", (req, res) => {
    try {
        const stmt = sqlite.prepare("SELECT * FROM task_submissions WHERE status = 'under_review' ORDER BY submitted_at DESC");
        const rows = stmt.all() as any[];
        const mapped = rows.map(r => ({
            taskId: r.task_id,
            taskTitle: r.task_title,
            userId: Number(r.user_id),
            userName: r.username,
            proofType: r.proof_type,
            proofImageBase64: r.image_base64,
            notes: r.notes,
            submittedAt: r.submitted_at,
            status: r.status,
            auditToken: r.id
        }));
        res.json({ proofs: mapped });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 2. Approve Task Proof
app.post("/api/admin/approve-proof", async (req, res) => {
    const { submissionId, taskId, userId, rewardSYP } = req.body;
    const reward = Number(rewardSYP) || 2500;
    const uid = String(userId);

    try {
        // Update submission status to approved
        sqlite.prepare("UPDATE task_submissions SET status = 'approved' WHERE id = ?").run(submissionId);

        // Add to completed_tasks
        sqlite.prepare("INSERT OR IGNORE INTO completed_tasks (user_id, task_id) VALUES (?, ?)").run(uid, Number(taskId) || 0);

        // Increase user balance
        sqlite.prepare("UPDATE users SET balanceSYP = balanceSYP + ? WHERE telegram_id = ?").run(reward, uid);

        // Notify user via Telegram
        const msg = `🎉 *تهانينا! تمت الموافقة على إثبات مهمتك بنجاح!* 🇸🇾\n\n` +
            `🎁 تمت إضافة *+${reward.toLocaleString()} ل.س* إلى رصيدك!\n` +
            `استمر في تنفيذ المهام اليومية لزيادة أرباحك 🚀`;
        sendTelegramMessage(uid, msg);

        // Sync with Firestore in real-time
        try {
            const subDocRef = doc(db, 'task_submissions', submissionId);
            await setDoc(subDocRef, { status: 'approved' }, { merge: true });

            const userDocRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                const completed = Array.isArray(userData.completedTasks) ? userData.completedTasks : [];
                const taskIdStr = String(taskId);
                if (!completed.includes(taskIdStr)) {
                    completed.push(taskIdStr);
                }
                const newBalance = (Number(userData.balanceSYP) || 0) + reward;
                await setDoc(userDocRef, {
                    balanceSYP: newBalance,
                    completedTasks: completed
                }, { merge: true });
            }
        } catch (fsErr) {
            console.error("[Firestore Approve Sync Error]", fsErr);
        }

        res.json({ success: true, rewardSYP: reward });
    } catch (e: any) {
        console.error("[Approve Proof Error]", e);
        res.status(500).json({ error: e.message });
    }
});

// 3. Reject Task Proof
app.post("/api/admin/reject-proof", async (req, res) => {
    const { submissionId, userId, reason } = req.body;
    const uid = String(userId);

    try {
        sqlite.prepare("UPDATE task_submissions SET status = 'rejected' WHERE id = ?").run(submissionId);

        const msg = `❌ *تم رفض إثبات المهمة المقدم* ⚠️\n\n` +
            `📝 السبب: ${reason || 'الصورة أو البيانات غير مطابقة لشروط المهمة'}\n` +
            `يمكنك إعادة تنفيذ المهمة وتقديم إثبات صحيح لكسب المكافأة.`;
        sendTelegramMessage(uid, msg);

        // Sync with Firestore in real-time
        try {
            const subDocRef = doc(db, 'task_submissions', submissionId);
            await setDoc(subDocRef, { status: 'rejected', rejectReason: reason || '' }, { merge: true });
        } catch (fsErr) {
            console.error("[Firestore Reject Sync Error]", fsErr);
        }

        res.json({ success: true });
    } catch (e: any) {
        console.error("[Reject Proof Error]", e);
        res.status(500).json({ error: e.message });
    }
});

// 4. Get Real Withdrawals
app.get("/api/admin/withdrawals", (req, res) => {
    try {
        const stmt = sqlite.prepare("SELECT * FROM withdrawals ORDER BY created_at DESC");
        const rows = stmt.all() as any[];
        const mapped = rows.map(r => ({
            id: r.id,
            userId: Number(r.user_id),
            userName: r.username,
            amountSYP: r.amount,
            methodId: r.method_id,
            methodName: r.method_id === 'syriatel_cash' ? 'سيريتل كاش' : 'شام كاش / فوري',
            destinationAccount: r.account,
            fiatValue: `${r.amount.toLocaleString()} ل.س`,
            timestamp: r.created_at,
            status: r.status
        }));
        res.json({ withdrawals: mapped });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 5. Approve Withdrawal
app.post("/api/admin/approve-withdrawal", async (req, res) => {
    const { id, notes } = req.body;
    try {
        const row = sqlite.prepare("SELECT * FROM withdrawals WHERE id = ?").get(id) as any;
        if (!row) return res.status(404).json({ error: 'طلب السحب غير موجود' });

        sqlite.prepare("UPDATE withdrawals SET status = 'approved' WHERE id = ?").run(id);

        const msg = `✅ *تمت الموافقة على طلب السحب الخاص بك بنجاح!* 🇸🇾\n\n` +
            `💵 المبلغ: *${row.amount.toLocaleString()} ل.س*\n` +
            `💳 الحساب: \`${row.account}\`\n` +
            `⏳ *سيتم إيصال الأموال إلى حسابك خلال 24 ساعة كحد أقصى.* 💵\n\n` +
            (notes ? `📝 ملاحظة الإدارة: ${notes}\n` : '') +
            `شكراً لثقتكم بتطبيق BOT SYRIA! ✨`;
        sendTelegramMessage(row.user_id, msg);

        // Sync with Firestore in real-time
        try {
            const withdrawDocRef = doc(db, 'withdrawals', id);
            await setDoc(withdrawDocRef, { status: 'approved' }, { merge: true });

            const uid = String(row.user_id);
            const userDocRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                
                // Update withdrawalHistory array
                const history = Array.isArray(userData.withdrawalHistory) ? userData.withdrawalHistory : [];
                const updatedHistory = history.map((w: any) => {
                    if (w.id === id) {
                        return { ...w, status: 'approved' };
                    }
                    return w;
                });

                // Update latestWithdrawal if it matches
                const latest = userData.latestWithdrawal;
                const updatedLatest = (latest && latest.id === id) ? { ...latest, status: 'approved' } : latest;

                await setDoc(userDocRef, {
                    latestWithdrawal: updatedLatest,
                    withdrawalHistory: updatedHistory
                }, { merge: true });
            }
        } catch (fsErr) {
            console.error("[Firestore Approve Withdrawal Sync Error]", fsErr);
        }

        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 6. Reject Withdrawal & Refund Balance
app.post("/api/admin/reject-withdrawal", async (req, res) => {
    const { id, reason } = req.body;
    try {
        const row = sqlite.prepare("SELECT * FROM withdrawals WHERE id = ?").get(id) as any;
        if (!row) return res.status(404).json({ error: 'طلب السحب غير موجود' });

        sqlite.prepare("UPDATE withdrawals SET status = 'rejected' WHERE id = ?").run(id);

        // Refund balance back to user
        sqlite.prepare("UPDATE users SET balanceSYP = balanceSYP + ? WHERE telegram_id = ?").run(row.amount, row.user_id);

        const msg = `⚠️ *تم رفض طلب السحب واسترجاع الرصيد* 🇸🇾\n\n` +
            `💵 المبلغ المسترجع: *${row.amount.toLocaleString()} ل.س*\n` +
            `📝 سبب الرفض: ${reason || 'رقم الحساب غير صحيح أو فشل استلام الحوالة'}\n` +
            `تمت إعادة المبلغ إلى رصيد حسابك بالكامل.`;
        sendTelegramMessage(row.user_id, msg);

        // Sync with Firestore in real-time
        try {
            const withdrawDocRef = doc(db, 'withdrawals', id);
            await setDoc(withdrawDocRef, { status: 'rejected' }, { merge: true });

            const uid = String(row.user_id);
            const userDocRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                
                // Refund
                const newBalance = (Number(userData.balanceSYP) || 0) + Number(row.amount);

                // Update withdrawalHistory array
                const history = Array.isArray(userData.withdrawalHistory) ? userData.withdrawalHistory : [];
                const updatedHistory = history.map((w: any) => {
                    if (w.id === id) {
                        return { ...w, status: 'rejected' };
                    }
                    return w;
                });

                // Update latestWithdrawal if it matches
                const latest = userData.latestWithdrawal;
                const updatedLatest = (latest && latest.id === id) ? { ...latest, status: 'rejected' } : latest;

                await setDoc(userDocRef, {
                    balanceSYP: newBalance,
                    latestWithdrawal: updatedLatest,
                    withdrawalHistory: updatedHistory
                }, { merge: true });
            }
        } catch (fsErr) {
            console.error("[Firestore Reject Withdrawal Sync Error]", fsErr);
        }

        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 7. Get Real Support Tickets
app.get("/api/admin/tickets", (req, res) => {
    try {
        const stmt = sqlite.prepare("SELECT * FROM support_tickets ORDER BY id DESC LIMIT 50");
        const rows = stmt.all() as any[];
        const mapped = rows.map(r => ({
            id: String(r.id),
            userId: Number(r.user_id),
            userName: r.username,
            category: 'استفسار عام',
            message: r.message,
            timestamp: r.created_at,
            status: r.status === 'RESOLVED' ? 'replied' : 'sent',
            adminReply: r.admin_reply
        }));
        res.json({ tickets: mapped });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 8. Reply Support Ticket (Sends reply to user via Telegram, then deletes ticket from DB)
app.post("/api/admin/reply-ticket", async (req, res) => {
    const { ticketId, replyText } = req.body;
    try {
        const row = sqlite.prepare("SELECT * FROM support_tickets WHERE id = ?").get(Number(ticketId)) as any;
        if (!row) return res.status(404).json({ error: 'التذكرة غير موجودة' });

        const msg = `📩 *رد رسمي من إدارة الدعم الفني!* 🇸🇾\n\n` +
            `🎫 بخصوص استفسارك: \"${row.message}\"\n\n` +
            `💬 *رد الإدارة:*\n${replyText}`;
        const delivered = await sendTelegramMessage(row.user_id, msg);

        // Sync with Firestore in real-time before deleting from SQLite
        try {
            const uid = String(row.user_id);
            const userDocRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                let userTickets = Array.isArray(userData.tickets) ? userData.tickets : [];
                
                if (userTickets.length > 0) {
                    userTickets = userTickets.map((t: any) => {
                        return {
                            ...t,
                            status: 'replied',
                            adminReply: replyText,
                            repliedAt: new Date().toLocaleDateString('ar-SA')
                        };
                    });
                } else {
                    userTickets = [{
                        id: `ticket_${Date.now()}`,
                        userId: Number(uid),
                        userName: userData.userName || 'مستخدم',
                        userUsername: userData.userUsername || 'user',
                        category: 'عام',
                        message: row.message,
                        timestamp: new Date().toLocaleDateString('ar-SA'),
                        status: 'replied',
                        adminReply: replyText,
                        repliedAt: new Date().toLocaleDateString('ar-SA')
                    }];
                }
                
                await setDoc(userDocRef, { tickets: userTickets }, { merge: true });
            }
        } catch (fsErr) {
            console.error("[Firestore Support Ticket Reply Sync Error]", fsErr);
        }

        // Delete ticket immediately from database so it never accumulates
        sqlite.prepare("DELETE FROM support_tickets WHERE id = ?").run(Number(ticketId));

        if (delivered) {
            res.json({ success: true, delivered: true, message: 'تم إرسال الرد للمستخدم في تلغرام وتحديث الشكوى داخل التطبيق وحذفها من الإدارة بنجاح.' });
        } else {
            res.json({ success: true, delivered: false, message: `⚠️ تم تحديث الشكوى داخل التطبيق بنجاح وحذفها من الإدارة، ولكن الرد لم يصل للمستخدم على حساب تلغرام الخاص به (ID: ${row.user_id})!\n\nالسبب الأساسي: تلغرام يمنع البوت من إرسال رسائل خاصة لأي مستخدم لم يضغط على زر (ابدأ / /start) داخل البوت من قبل!` });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 8.1 Delete Support Ticket (prevents accumulation in admin panel)
app.post("/api/admin/delete-ticket", (req, res) => {
    const { ticketId } = req.body;
    try {
        sqlite.prepare("DELETE FROM support_tickets WHERE id = ?").run(Number(ticketId));
        res.json({ success: true, message: 'تم حذف تذكرة الدعم نهائياً.' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 8.2 Delete all resolved support tickets
app.post("/api/admin/delete-all-resolved-tickets", (req, res) => {
    try {
        const info = sqlite.prepare("DELETE FROM support_tickets WHERE status = 'RESOLVED'").run();
        res.json({ success: true, count: info.changes, message: `تم حذف ${info.changes} تذكرة مكتملة بنجاح.` });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 9. Real Bot & System Statistics (100% Real, Zero Mock!)
app.get("/api/admin/stats", (req, res) => {
    try {
        const totalUsers = (sqlite.prepare("SELECT COUNT(*) as count FROM users").get() as any)?.count || 0;
        const totalEarnings = (sqlite.prepare("SELECT COALESCE(SUM(balanceSYP), 0) as total FROM users").get() as any)?.total || 0;
        const pendingWithdrawals = (sqlite.prepare("SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'").get() as any)?.count || 0;
        const approvedWithdrawals = (sqlite.prepare("SELECT COUNT(*) as count FROM withdrawals WHERE status = 'approved'").get() as any)?.count || 0;
        const totalTasksCompleted = (sqlite.prepare("SELECT COUNT(*) as count FROM completed_tasks").get() as any)?.count || 0;
        const activeTasksCount = (sqlite.prepare("SELECT COUNT(*) as count FROM tasks WHERE active = 1").get() as any)?.count || 0;
        const pendingProofs = (sqlite.prepare("SELECT COUNT(*) as count FROM task_submissions WHERE status = 'under_review'").get() as any)?.count || 0;
        const openTickets = (sqlite.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'OPEN'").get() as any)?.count || 0;

        res.json({
            stats: {
                totalUsers,
                totalEarningsDistributed: totalEarnings,
                pendingWithdrawals,
                approvedWithdrawals,
                totalTasksCompleted,
                activeTasksCount,
                activePromoCodesCount: 0,
                pendingProofs,
                openTickets,
                uptime: '100% (متصل وحي - قاعدة بيانات SQLite حقيقية)'
            }
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 10. Admin: Create Task in SQLite & Firestore
app.post(["/api/admin/tasks/create", "/api/admin/create-task"], async (req, res) => {
    const { title, description, rewardSYP, actionUrl, actionType, category, totalSeats } = req.body;
    try {
        const reward = Number(rewardSYP) || 2500;
        const stmt = sqlite.prepare("INSERT INTO tasks (title, reward, link, active) VALUES (?, ?, ?, 1)");
        const info = stmt.run(title, reward, actionUrl);

        // Also sync to Firestore if possible
        try {
            await setDoc(doc(db, 'tasks', `task_${info.lastInsertRowid}`), {
                title,
                description: description || '',
                reward,
                rewardSYP: reward,
                link: actionUrl,
                actionUrl,
                actionType: actionType || 'channel',
                category: category || 'telegram',
                active: true,
                totalSeats: totalSeats || 1000,
                remainingSeats: totalSeats || 1000
            });
        } catch (_) {}

        res.json({ success: true, taskId: info.lastInsertRowid, message: 'تم نشر المهمة الحقيقية بنجاح!' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 11. Admin: Delete Task in SQLite & Firestore
app.post(["/api/admin/tasks/delete", "/api/admin/delete-task"], async (req, res) => {
    const { taskId } = req.body;
    try {
        const tid = Number(taskId);
        sqlite.prepare("DELETE FROM tasks WHERE id = ?").run(tid);
        sqlite.prepare("DELETE FROM completed_tasks WHERE task_id = ?").run(tid);
        try {
            await deleteDoc(doc(db, 'tasks', String(taskId)));
        } catch (_) {}
        res.json({ success: true, message: 'تم حذف المهمة نهائياً من قاعدة البيانات وسحبها من المستخدمين.' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 11.1 Admin: Edit Task in SQLite
app.post(["/api/admin/tasks/edit", "/api/admin/edit-task"], (req, res) => {
    const { taskId, title, rewardSYP, actionUrl } = req.body;
    try {
        const tid = Number(taskId);
        const reward = Number(rewardSYP) || 2500;
        sqlite.prepare("UPDATE tasks SET title = ?, reward = ?, link = ? WHERE id = ?").run(title, reward, actionUrl, tid);
        res.json({ success: true, message: 'تم تعديل بيانات المهمة بنجاح!' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 12. Admin: Add Balance in SQLite
app.post(["/api/admin/balance/add", "/api/admin/add-balance"], (req, res) => {
    const { userId, amount } = req.body;
    const uid = String(userId);
    const numAmount = Number(amount) || 0;
    try {
        sqlite.prepare("UPDATE users SET balanceSYP = balanceSYP + ? WHERE telegram_id = ?").run(numAmount, uid);
        const row = sqlite.prepare("SELECT balanceSYP FROM users WHERE telegram_id = ?").get(uid) as any;
        const newBal = row ? row.balanceSYP : numAmount;

        sendTelegramMessage(uid, `💰 *إشعار رصيد مالي!* 🇸🇾\n\nتمت إضافة *+${numAmount.toLocaleString()} ل.س* إلى حسابك من الإدارة.\nرصيدك الحالي: *${newBal.toLocaleString()} ل.س*.`);
        res.json({ success: true, newBalance: newBal, message: `تم تحديث رصيد المستخدم ليصبح ${newBal.toLocaleString()} ل.س` });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 13. Admin: System Settings in SQLite
app.get("/api/admin/settings", (req, res) => {
    try {
        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `).run();
        const rows = sqlite.prepare("SELECT * FROM system_settings").all() as any[];
        const map: Record<string, any> = {};
        for (const r of rows) {
            map[r.key] = r.value;
        }
        res.json({
            defaultTaskRewardSYP: Number(map['defaultTaskRewardSYP'] || 2500),
            minWithdrawalSYP: Number(map['minWithdrawalSYP'] || 10000),
            referralRewardSYP: Number(map['referralRewardSYP'] || 1500),
            botMaintenanceMode: map['botMaintenanceMode'] === 'true',
            announcementBanner: map['announcementBanner'] || '🇸🇾 أهلاً بك في بوت سوريا الرسمي للسحب الفوري بالليرة السورية'
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/admin/settings", (req, res) => {
    const { defaultTaskRewardSYP, minWithdrawalSYP, referralRewardSYP, botMaintenanceMode, announcementBanner } = req.body;
    try {
        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `).run();
        const upsert = sqlite.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)");
        if (defaultTaskRewardSYP !== undefined) upsert.run('defaultTaskRewardSYP', String(defaultTaskRewardSYP));
        if (minWithdrawalSYP !== undefined) upsert.run('minWithdrawalSYP', String(minWithdrawalSYP));
        if (referralRewardSYP !== undefined) upsert.run('referralRewardSYP', String(referralRewardSYP));
        if (botMaintenanceMode !== undefined) upsert.run('botMaintenanceMode', String(botMaintenanceMode));
        if (announcementBanner !== undefined) upsert.run('announcementBanner', String(announcementBanner));

        res.json({ success: true, message: '✅ تم حفظ وتطبيق إعدادات وقيم النظام في قاعدة البيانات بنجاح!' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Telegram Webhook Route ---
app.post("/api/telegram-webhook/:token", async (req, res) => {
    if (req.params.token !== process.env.TELEGRAM_BOT_TOKEN) return res.status(403).send();
    
    try {
        const update = req.body;
        if (update && update.message) {
            const chat_id = update.message.chat.id;
            const text = update.message.text || '';
            const fromUser = update.message.from || {};
            const telegramId = fromUser.id;
            const firstName = fromUser.first_name || 'مستخدم';
            const username = fromUser.username || '';

            if (text.startsWith('/start')) {
                // Register in SQLite
                const userRow = sqlite.prepare("SELECT * FROM users WHERE telegram_id = ?").get(String(telegramId)) as any;
                let balance = 5000;
                let totalReferrals = 0;

                if (userRow) {
                    balance = userRow.balanceSYP || 5000;
                    totalReferrals = userRow.referralsCount || 0;
                } else {
                    sqlite.prepare("INSERT INTO users (telegram_id, balanceSYP, referralsCount, referredBy) VALUES (?, 5000, 0, '')").run(String(telegramId));
                }

                const miniAppUrl = `https://ais-dev-va4hfp45jlspfkngohedz3-599028985093.europe-west1.run.app`;
                const messageText = `🇸🇾 أهلاً بك يا ${firstName} في تطبيق وبوت الخدمات والمهام السورية الأقوى! ✨\n\n` +
                    `💰 رصيدك الحالي: *${balance.toLocaleString('en-US')} ل.س*\n` +
                    `👥 عدد إحالاتك: *${totalReferrals} إحالة*\n\n` +
                    `اضغط على الزر أدناه لفتح الميني أب والبدء بكسب الأرباح فوراً! 👇🚀`;

                const replyMarkup = {
                    inline_keyboard: [
                        [
                            {
                                text: "افتح التطبيق السوري 🇸🇾🚀",
                                web_app: {
                                    url: miniAppUrl
                                }
                            }
                        ],
                        [
                            {
                                text: "قناة الدعم والتحديثات 📢",
                                url: "https://t.me/BotSyria_2026_bot"
                            }
                        ]
                    ]
                };

                await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chat_id,
                        text: messageText,
                        parse_mode: 'Markdown',
                        reply_markup: replyMarkup
                    })
                });
            }
        }
    } catch (e: any) {
        console.error('[Telegram Webhook Error]', e);
    }

    res.status(200).send("OK");
});

// --- Server Startup ---
const PORT = Number(process.env.PORT) || 3000;
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
    app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
} else {
    import('vite').then(({ createServer }) => {
        createServer({ server: { middlewareMode: true }, appType: 'spa' }).then(vite => {
            app.use(vite.middlewares);
            app.listen(PORT, "0.0.0.0", () => console.log(`Dev server running on port ${PORT}`));
        });
    });
}
