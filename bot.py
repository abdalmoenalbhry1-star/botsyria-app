# -*- coding: utf-8 -*-
"""
BotSyria - Telegram Bot & Local Flask Backend Server (SQLite3)
Engineered for Termux & Cloudflare Tunnel: https://christopher-jungle-offline-walter.trycloudflare.com
Zero Firebase dependencies - 100% Free, Local, and Fast.
"""

import os
import sys
import sqlite3
import threading
import time
import telebot
from telebot import types

# ----------------------------------------------------------------------
# 1. Database Configuration & Automatic Initialization
# ----------------------------------------------------------------------
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")

def get_db():
    """Returns a SQLite connection with row factory enabled."""
    conn = sqlite3.connect(DB_FILE, timeout=25, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """Initializes tables in database.db if they do not exist."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Users Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                telegram_id TEXT PRIMARY KEY,
                username TEXT,
                balanceSYP INTEGER DEFAULT 0,
                referralsCount INTEGER DEFAULT 0,
                referredBy TEXT
            );
        """)
        
        # Ensure username column exists if migrated from earlier schema
        cursor.execute("PRAGMA table_info(users);")
        u_cols = [c["name"] for c in cursor.fetchall()]
        if "username" not in u_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN username TEXT;")
        
        # 2. Tasks Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                reward INTEGER,
                link TEXT,
                active INTEGER DEFAULT 1
            );
        """)
        
        # 3. Completed Tasks Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS completed_tasks (
                user_id TEXT,
                task_id INTEGER
            );
        """)
        
        # 4. Support Tickets Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS support_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                username TEXT,
                message TEXT,
                status TEXT DEFAULT 'OPEN',
                admin_reply TEXT DEFAULT '',
                created_at TEXT DEFAULT ''
            );
        """)

        # Ensure admin_reply and created_at columns exist
        cursor.execute("PRAGMA table_info(support_tickets);")
        t_cols = [c["name"] for c in cursor.fetchall()]
        if "admin_reply" not in t_cols:
            cursor.execute("ALTER TABLE support_tickets ADD COLUMN admin_reply TEXT DEFAULT '';")
        if "created_at" not in t_cols:
            cursor.execute("ALTER TABLE support_tickets ADD COLUMN created_at TEXT DEFAULT '';")

        # 5. Task Submissions Table (Proof of Work)
        cursor.execute("""
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 6. Withdrawals Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS withdrawals (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                method TEXT,
                account_number TEXT,
                amount_syp INTEGER,
                status TEXT DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 7. System Settings Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        """)
        default_settings = [
            ('defaultTaskRewardSYP', '2500'),
            ('minWithdrawalSYP', '10000'),
            ('referralRewardSYP', '1500'),
            ('botMaintenanceMode', 'false'),
            ('announcementBanner', '🇸🇾 أهلاً بك في بوت سوريا الرسمي للسحب الفوري بالليرة السورية')
        ]
        for skey, sval in default_settings:
            cursor.execute("INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?);", (skey, sval))
        
        # Seed default tasks if empty
        cursor.execute("SELECT COUNT(*) as cnt FROM tasks;")
        if cursor.fetchone()["cnt"] == 0:
            cursor.execute("""
                INSERT INTO tasks (title, reward, link, active) VALUES 
                ('📢 الانضمام لقناة البوت الرسمية', 2500, 'https://t.me/abdalmoenal', 1),
                ('👥 متابعة قناة التحديثات والخدمات', 3000, 'https://t.me/BotSyria_2026_bot', 1);
            """)
        
        conn.commit()
    print("✅ [SQLite3] database.db verified and all 4 tables initialized successfully!")

# Initialize database
init_database()

# ----------------------------------------------------------------------
# 2. Telegram Bot Setup
# ----------------------------------------------------------------------
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8749338629:AAGB3rb1-EjqZu10sHoYGXghMFrpwXy_2GM")
bot = telebot.TeleBot(BOT_TOKEN)

ADMIN_IDS = set([841985444])
ADMIN_PASSCODE = "Syria2026"
WEBAPP_URL = "https://christopher-jungle-offline-walter.trycloudflare.com"

def send_safe_telegram_message(chat_id, text):
    """Sends a message safely with Markdown, falling back to plain text if Markdown parsing fails."""
    try:
        bot.send_message(int(chat_id), text, parse_mode="Markdown")
        return True
    except Exception as e:
        try:
            clean_text = text.replace("*", "").replace("_", "").replace("`", "").replace("[", "").replace("]", "")
            bot.send_message(int(chat_id), clean_text)
            return True
        except Exception as err:
            print(f"[Send Message Error] to {chat_id}: {err}")
            return False

def is_admin(user_id):
    try:
        return int(user_id) in ADMIN_IDS
    except Exception:
        return False

def get_main_keyboard(user_id):
    """Builds the main interactive keyboard with WebApp button."""
    keyboard = types.InlineKeyboardMarkup(row_width=2)
    
    app_btn = types.InlineKeyboardButton(
        text="🚀 فتح تطبيق BOT SYRIA",
        web_app=types.WebAppInfo(url=WEBAPP_URL)
    )
    balance_btn = types.InlineKeyboardButton(
        text="💰 رصيدي والإحالات",
        callback_data="btn_balance"
    )
    tasks_btn = types.InlineKeyboardButton(
        text="📋 قائمة المهام المتاحة",
        callback_data="btn_tasks"
    )
    support_btn = types.InlineKeyboardButton(
        text="📩 تذكرة دعم / شكوى",
        callback_data="btn_support"
    )
    channel_btn = types.InlineKeyboardButton(
        text="📢 قناة البوت الرسمية",
        url="https://t.me/abdalmoenal"
    )
    
    keyboard.add(app_btn)
    keyboard.row(balance_btn, tasks_btn)
    keyboard.row(support_btn, channel_btn)

    if is_admin(user_id):
        admin_btn = types.InlineKeyboardButton(
            text="🛠️ لوحة تحكم الإدارة",
            callback_data="btn_admin"
        )
        keyboard.add(admin_btn)

    return keyboard

# ----------------------------------------------------------------------
# 3. Start Command & Referral Engine (/start and /start ref_ID)
# ----------------------------------------------------------------------
@bot.message_handler(commands=['start'])
def handle_start(message):
    from_user = message.from_user
    user_id = str(from_user.id)
    first_name = from_user.first_name or "مستخدم"
    username = from_user.username or ""

    # Parse potential referral ID
    referred_by_id = ""
    parts = message.text.split()
    if len(parts) > 1:
        raw_ref = parts[1].strip()
        if raw_ref.startswith("ref_"):
            referred_by_id = raw_ref[4:]
        else:
            referred_by_id = raw_ref
        
        if not referred_by_id.isdigit() or referred_by_id == user_id:
            referred_by_id = ""

    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check if user already registered
        cursor.execute("SELECT * FROM users WHERE telegram_id = ?;", (user_id,))
        existing_user = cursor.fetchone()

        if not existing_user:
            # Reward inviter if valid
            if referred_by_id:
                cursor.execute("SELECT * FROM users WHERE telegram_id = ?;", (referred_by_id,))
                inviter = cursor.fetchone()
                if inviter:
                    cursor.execute("""
                        UPDATE users 
                        SET balanceSYP = balanceSYP + 1500, referralsCount = referralsCount + 1 
                        WHERE telegram_id = ?;
                    """, (referred_by_id,))
                    conn.commit()
                    
                    try:
                        bot.send_message(
                            int(referred_by_id),
                            f"🎉 *إشعار إحالة جديدة!*\n\n"
                            f"انضم صديق جديد عبر رابط الإحالة الخاص بك!\n"
                            f"🎁 تمت إضافة *+1,500 ل.س* إلى رصيدك فوراً في قاعدة البيانات!",
                            parse_mode="Markdown"
                        )
                    except Exception as err:
                        print(f"[Notice] Failed to notify inviter {referred_by_id}: {err}")
                else:
                    referred_by_id = ""

            cursor.execute("""
                INSERT INTO users (telegram_id, username, balanceSYP, referralsCount, referredBy)
                VALUES (?, ?, 0, 0, ?);
            """, (user_id, username, referred_by_id))
            conn.commit()
            print(f"✅ [SQLite3] Registered new user {user_id} (@{username}) with ref='{referred_by_id}'")
        else:
            # Update username if changed
            if username and existing_user["username"] != username:
                cursor.execute("UPDATE users SET username = ? WHERE telegram_id = ?;", (username, user_id))
                conn.commit()

        cursor.execute("SELECT balanceSYP, referralsCount FROM users WHERE telegram_id = ?;", (user_id,))
        row = cursor.fetchone()
        current_balance = row["balanceSYP"] if row else 0
        current_referrals = row["referralsCount"] if row else 0

    welcome_text = (
        "Welcome to BOT SYRIA! 🇸🇾\n\n"
        "• مرحباً بك في المنصة الرسمية لـ BOT SYRIA.\n"
        "-----------------------------\n"
        "• من هنا يمكنك كسب عملة SYP الرقمية بكل سهولة.\n"
        "• قم بإنجاز المهام اليومية ودعوة الأصدقاء لمضاعفة أرباحك.\n"
        "• انضم إلى قناتنا الرسمية لمتابعة أحدث التحديثات والأخبار.\n"
        "-----------------------------\n"
        "• اضغط على الأزرار أدناه للبدء والتصفح فوراً! 🔥"
    )

    # Custom Start Keyboard with exactly 2 buttons: WebApp and Channel
    keyboard = types.InlineKeyboardMarkup(row_width=1)
    app_btn = types.InlineKeyboardButton(
        text="فتح تطبيق BOT SYRIA 🚀",
        web_app=types.WebAppInfo(url=WEBAPP_URL)
    )
    channel_btn = types.InlineKeyboardButton(
        text="قناة البوت 📢",
        url="https://t.me/abdalmoenal"
    )
    keyboard.add(app_btn, channel_btn)

    photo_url = "https://share.gemini.google/M9GXUupnKThm"

    try:
        bot.send_photo(
            message.chat.id,
            photo_url,
            caption=welcome_text,
            reply_markup=keyboard,
            parse_mode="Markdown"
        )
    except Exception as err:
        print(f"[Start Photo Send Failed, falling back to message]: {err}")
        bot.send_message(
            message.chat.id,
            welcome_text,
            reply_markup=keyboard,
            parse_mode="Markdown"
        )

# ----------------------------------------------------------------------
# 4. User Balance & Tasks & Support Bot Handlers
# ----------------------------------------------------------------------
@bot.message_handler(commands=['balance'])
def handle_balance(message):
    user_id = str(message.from_user.id)
    send_balance_info(message.chat.id, user_id, message.from_user.first_name)

def send_balance_info(chat_id, user_id, first_name="المستخدم"):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT balanceSYP, referralsCount FROM users WHERE telegram_id = ?;", (user_id,))
        row = cursor.fetchone()

    if row:
        balance = row["balanceSYP"]
        referrals = row["referralsCount"]
        earnings = referrals * 1500
        msg = (
            f"📊 *تقرير الحساب المالي (SQLite Local)* 🇸🇾\n\n"
            f"👤 العضو: {first_name}\n"
            f"🆔 المعرف: `{user_id}`\n\n"
            f"💰 الرصيد الحالي: *{balance:,.0f} ل.س*\n"
            f"👥 إجمالي الإحالات: *{referrals} صديق*\n"
            f"🎁 أرباح الإحالات: *{earnings:,.0f} ل.س*\n\n"
            f"🔗 *رابط إحالتك الخاص:*\n"
            f"`https://t.me/BotSyria_2026_bot?start=ref_{user_id}`\n\n"
            f"💡 انسخ الرابط وشاركه مع أصدقائك، وستحصل على *1,500 ل.س* فور انضمام كل شخص!"
        )
    else:
        msg = "⚠️ لم يتم العثور على حسابك بعد. يرجى إرسال /start للتسجيل التلقائي فوراً."

    bot.send_message(chat_id, msg, parse_mode="Markdown")

@bot.message_handler(commands=['tasks'])
def handle_tasks_command(message):
    user_id = str(message.from_user.id)
    send_tasks_list(message.chat.id, user_id)

def send_tasks_list(chat_id, user_id):
    with get_db() as conn:
        cursor = conn.cursor()
        # Fetch active tasks that the user hasn't completed yet
        cursor.execute("""
            SELECT * FROM tasks 
            WHERE active = 1 AND id NOT IN (SELECT task_id FROM completed_tasks WHERE user_id = ?)
            ORDER BY id DESC;
        """, (user_id,))
        available_tasks = cursor.fetchall()

    if not available_tasks:
        bot.send_message(chat_id, "🎉 لقد أنجزت جميع المهام المتاحة حالياً! ترقب مهاماً جديدة قريباً.")
        return

    text = "📋 *قائمة المهام المتاحة لك لكسب الليرات:*\n\n"
    keyboard = types.InlineKeyboardMarkup(row_width=1)

    for task in available_tasks:
        text += (
            f"🔹 *{task['title']}*\n"
            f"💰 المكافأة: *{task['reward']:,} ل.س*\n"
            f"🔗 الرابط: {task['link']}\n"
            f"-------------------------------\n"
        )
        keyboard.add(types.InlineKeyboardButton(
            text=f"🚀 تنفيذ: {task['title']} (+{task['reward']:,} ل.س)",
            url=task['link']
        ))

    bot.send_message(chat_id, text, reply_markup=keyboard, parse_mode="Markdown")

@bot.message_handler(commands=['support', 'ticket'])
def handle_support(message):
    parts = message.text.split(None, 1)
    if len(parts) < 2:
        bot.reply_to(
            message,
            "⚠️ يرجى كتابة نص الشكوى بعد الأمر، مثال:\n"
            "`/support واجهت مشكلة في احتساب المكافأة`",
            parse_mode="Markdown"
        )
        return

    user_id = str(message.from_user.id)
    username = message.from_user.username or message.from_user.first_name or "N/A"
    ticket_msg = parts[1].strip()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO support_tickets (user_id, username, message, status)
            VALUES (?, ?, ?, 'OPEN');
        """, (user_id, username, ticket_msg))
        ticket_id = cursor.lastrowid
        conn.commit()

    bot.reply_to(
        message,
        f"✅ *تم تسجيل تذكرتك بنجاح برقم `#{ticket_id}`!*\n"
        f"سيقوم فريق الإدارة بمراجعتها والرد عليك فوراً.",
        parse_mode="Markdown"
    )

    alert_msg = (
        f"🚨 *تذكرة دعم جديدة واردة!* 📩\n\n"
        f"🎫 رقم التذكرة: `#{ticket_id}`\n"
        f"👤 المستخدم: @{username} (ID: `{user_id}`)\n"
        f"💬 الرسالة:\n\"{ticket_msg}\"\n\n"
        f"للرد على المستخدم: `/reply_ticket {ticket_id} نص الرد`"
    )
    for aid in ADMIN_IDS:
        try:
            bot.send_message(aid, alert_msg, parse_mode="Markdown")
        except Exception:
            pass

# ----------------------------------------------------------------------
# 5. Full Admin Panel (/admin and Management Commands)
# ----------------------------------------------------------------------
def send_admin_menu(chat_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as c FROM users;")
        total_users = cursor.fetchone()["c"]

        cursor.execute("SELECT COALESCE(SUM(balanceSYP), 0) as s FROM users;")
        total_balance = cursor.fetchone()["s"]

        cursor.execute("SELECT COUNT(*) as c FROM tasks WHERE active = 1;")
        active_tasks = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM completed_tasks;")
        total_completed = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'OPEN';")
        open_tickets = cursor.fetchone()["c"]

    menu = (
        f"🛠️ *لوحة تحكم الإدارة الشاملة (Flask + SQLite3)* 🇸🇾\n"
        f"----------------------------------------\n"
        f"📊 *إحصائيات البوت الحقيقية:*\n"
        f"• 👥 إجمالي المستخدمين: *{total_users:,} مستخدم*\n"
        f"• 💰 مجموع الأرصدة الموزعة: *{total_balance:,} ل.س*\n"
        f"• 📋 المهام النشطة: *{active_tasks} مهمة*\n"
        f"• ✅ المهام المنجزة كلياً: *{total_completed} إنجاز*\n"
        f"• 📩 تذاكر الدعم المفتوحة: *{open_tickets} تذكرة*\n"
        f"----------------------------------------\n"
        f"⚙️ *أوامر التحكم والإدارة:*\n"
        f"➕ `/add_task العنوان | المكافأة | الرابط` - إضافة مهمة.\n"
        f"❌ `/delete_task <id>` - حذف مهمة بالرقم.\n"
        f"📋 `/list_tasks` - عرض جميع المهام المسجلة.\n"
        f"💰 `/add_balance <telegram_id> <amount>` - شحن رصيد.\n"
        f"⚙️ `/set_balance <telegram_id> <amount>` - تحديد رصيد مستخدم.\n"
        f"➖ `/deduct_balance <telegram_id> <amount>` - خصم رصيد.\n"
        f"👤 `/user_info <telegram_id>` - استعلام شامل عن مستخدم.\n"
        f"📩 `/list_tickets` - عرض تذاكر الدعم المفتوحة.\n"
        f"✉️ `/reply_ticket <id> <نص الرد>` - الرد المباشر على التذكرة.\n"
        f"📢 `/broadcast <نص الرسالة>` - إذاعة جماعية لكافة المستخدمين!"
    )
    bot.send_message(chat_id, menu, parse_mode="Markdown")

@bot.message_handler(commands=['admin'])
def handle_admin(message):
    uid = message.from_user.id
    if is_admin(uid):
        send_admin_menu(message.chat.id)
    else:
        bot.reply_to(message, "🔐 سجل دخول أولاً بإرسال:\n`/admin_login Syria2026`", parse_mode="Markdown")

@bot.message_handler(commands=['admin_login'])
def handle_admin_login(message):
    parts = message.text.split()
    if len(parts) < 2:
        bot.reply_to(message, "⚠️ يرجى إدخال كلمة المرور:\n`/admin_login كلمة_المرور`", parse_mode="Markdown")
        return
    if parts[1].strip() == ADMIN_PASSCODE:
        ADMIN_IDS.add(message.from_user.id)
        bot.reply_to(message, "🔓 تم تفعيل صلاحيات الأدمن بنجاح!")
        send_admin_menu(message.chat.id)
    else:
        bot.reply_to(message, "❌ كلمة المرور غير صحيحة!")

@bot.message_handler(commands=['broadcast'])
def handle_broadcast(message):
    if not is_admin(message.from_user.id):
        return
    parts = message.text.split(None, 1)
    if len(parts) < 2:
        bot.reply_to(message, "⚠️ الاستخدام: `/broadcast نص الرسالة الجماعية`", parse_mode="Markdown")
        return

    broadcast_text = parts[1].strip()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT telegram_id FROM users;")
        users = cursor.fetchall()

    success_count = 0
    fail_count = 0
    status_msg = bot.reply_to(message, f"⏳ جاري إرسال الإذاعة إلى {len(users)} مستخدم...")

    for row in users:
        uid_str = row["telegram_id"]
        try:
            bot.send_message(
                int(uid_str),
                f"📢 *تنبيه عام من إدارة BOT SYRIA:*\n\n{broadcast_text}",
                parse_mode="Markdown"
            )
            success_count += 1
            time.sleep(0.04)  # Rate limiting protection
        except Exception:
            fail_count += 1

    bot.edit_message_text(
        f"✅ *اكتملت الإذاعة الجماعية!*\n\n"
        f"• نجح الإرسال: *{success_count}*\n"
        f"• تعذر الإرسال: *{fail_count}*",
        chat_id=message.chat.id,
        message_id=status_msg.message_id,
        parse_mode="Markdown"
    )

@bot.message_handler(commands=['add_task'])
def handle_add_task(message):
    if not is_admin(message.from_user.id):
        return
    parts = message.text.split(None, 1)
    if len(parts) < 2:
        bot.reply_to(message, "⚠️ الصيغة: `/add_task العنوان | المكافأة | الرابط`", parse_mode="Markdown")
        return
    sub = [p.strip() for p in parts[1].split("|")]
    if len(sub) < 3 or not sub[1].isdigit():
        bot.reply_to(message, "⚠️ يجب إدخال: `العنوان | المكافأة (أرقام فقط) | الرابط`", parse_mode="Markdown")
        return

    title, reward, link = sub[0], int(sub[1]), sub[2]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO tasks (title, reward, link, active) VALUES (?, ?, ?, 1);", (title, reward, link))
        new_id = cursor.lastrowid
        conn.commit()

    bot.reply_to(message, f"✅ تمت إضافة المهمة `#{new_id}` بنجاح!\nالعنوان: {title}\nالمكافأة: {reward:,} ل.س")

@bot.message_handler(commands=['delete_task'])
def handle_delete_task(message):
    if not is_admin(message.from_user.id):
        return
    parts = message.text.split()
    if len(parts) < 2 or not parts[1].isdigit():
        bot.reply_to(message, "⚠️ الصيغة: `/delete_task <id>`", parse_mode="Markdown")
        return
    task_id = int(parts[1])
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tasks WHERE id = ?;", (task_id,))
        conn.commit()
    bot.reply_to(message, f"✅ تم حذف المهمة `#{task_id}` بنجاح.")

@bot.message_handler(commands=['list_tasks'])
def handle_list_tasks(message):
    if not is_admin(message.from_user.id):
        return
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tasks ORDER BY id ASC;")
        rows = cursor.fetchall()
    if not rows:
        bot.reply_to(message, "📋 جدول المهام فارغ.")
        return
    out = ["📋 *جميع المهام المسجلة:*", ""]
    for r in rows:
        status_sym = "🟢" if r["active"] == 1 else "🔴"
        out.append(f"{status_sym} `#{r['id']}` - *{r['title']}* (+{r['reward']:,} ل.س)")
        out.append(f"🔗 {r['link']}")
        out.append("----------------------------")
    bot.reply_to(message, "\n".join(out), parse_mode="Markdown")

@bot.message_handler(commands=['add_balance'])
def handle_add_balance(message):
    if not is_admin(message.from_user.id):
        return
    parts = message.text.split()
    if len(parts) < 3 or not parts[2].isdigit():
        bot.reply_to(message, "⚠️ الصيغة: `/add_balance <telegram_id> <amount>`", parse_mode="Markdown")
        return
    target_id, amount = parts[1].strip(), int(parts[2])
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET balanceSYP = balanceSYP + ? WHERE telegram_id = ?;", (amount, target_id))
        if cursor.rowcount == 0:
            cursor.execute("INSERT INTO users (telegram_id, username, balanceSYP, referralsCount, referredBy) VALUES (?, '', ?, 0, '');", (target_id, amount))
        cursor.execute("SELECT balanceSYP FROM users WHERE telegram_id = ?;", (target_id,))
        new_bal = cursor.fetchone()["balanceSYP"]
        conn.commit()
    bot.reply_to(message, f"✅ تم شحن +{amount:,} ل.س لحساب `{target_id}`. الرصيد: *{new_bal:,} ل.س*")
    try:
        bot.send_message(int(target_id), f"💰 *إشعار رصيد جديد!*\nتمت إضافة *+{amount:,} ل.س* لحسابك. رصيدك: *{new_bal:,} ل.س*.", parse_mode="Markdown")
    except Exception:
        pass

@bot.message_handler(commands=['set_balance'])
def handle_set_balance(message):
    if not is_admin(message.from_user.id):
        return
    parts = message.text.split()
    if len(parts) < 3 or not parts[2].isdigit():
        bot.reply_to(message, "⚠️ الصيغة: `/set_balance <telegram_id> <amount>`", parse_mode="Markdown")
        return
    target_id, amount = parts[1].strip(), int(parts[2])
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET balanceSYP = ? WHERE telegram_id = ?;", (amount, target_id))
        conn.commit()
    bot.reply_to(message, f"⚙️ تم تحديد رصيد `{target_id}` ليصبح: *{amount:,} ل.س*")

@bot.message_handler(commands=['deduct_balance'])
def handle_deduct_balance(message):
    if not is_admin(message.from_user.id):
        return
    parts = message.text.split()
    if len(parts) < 3 or not parts[2].isdigit():
        bot.reply_to(message, "⚠️ الصيغة: `/deduct_balance <telegram_id> <amount>`", parse_mode="Markdown")
        return
    target_id, amount = parts[1].strip(), int(parts[2])
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET balanceSYP = MAX(0, balanceSYP - ?) WHERE telegram_id = ?;", (amount, target_id))
        cursor.execute("SELECT balanceSYP FROM users WHERE telegram_id = ?;", (target_id,))
        row = cursor.fetchone()
        conn.commit()
    if row:
        bot.reply_to(message, f"📉 تم خصم -{amount:,} ل.س. الرصيد المتبقي: *{row['balanceSYP']:,} ل.س*")
    else:
        bot.reply_to(message, "❌ المستخدم غير موجود.")

@bot.message_handler(commands=['user_info'])
def handle_user_info(message):
    if not is_admin(message.from_user.id):
        return
    parts = message.text.split()
    if len(parts) < 2:
        bot.reply_to(message, "⚠️ الصيغة: `/user_info <telegram_id>`", parse_mode="Markdown")
        return
    target_id = parts[1].strip()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE telegram_id = ?;", (target_id,))
        u = cursor.fetchone()
    if u:
        bot.reply_to(
            message,
            f"👤 *بيانات المستخدم:*\n\n"
            f"🆔 المعرف: `{u['telegram_id']}`\n"
            f"👤 المعرف النصي: @{u['username'] or 'N/A'}\n"
            f"💰 الرصيد: *{u['balanceSYP']:,} ل.س*\n"
            f"👥 الإحالات: *{u['referralsCount']}*\n"
            f"🔗 تم دعوته عبر: `{u['referredBy'] or 'مباشر'}`",
            parse_mode="Markdown"
        )
    else:
        bot.reply_to(message, "❌ المستخدم غير موجود.")

@bot.message_handler(commands=['list_tickets'])
def handle_list_tickets(message):
    if not is_admin(message.from_user.id):
        return
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM support_tickets WHERE status = 'OPEN' ORDER BY id DESC LIMIT 20;")
        tickets = cursor.fetchall()
    if not tickets:
        bot.reply_to(message, "📩 لا توجد تذاكر دعم مفتوحة حالياً.")
        return
    out = ["📩 *تذاكر الدعم والشكاوى المفتوحة:*", ""]
    for t in tickets:
        out.append(f"🎫 *تذكرة #{t['id']}* من @{t['username']} (`{t['user_id']}`)")
        out.append(f"💬 \"{t['message']}\"")
        out.append("----------------------------")
    bot.reply_to(message, "\n".join(out), parse_mode="Markdown")

@bot.message_handler(commands=['reply_ticket'])
def handle_reply_ticket(message):
    if not is_admin(message.from_user.id):
        return
    parts = message.text.split(None, 2)
    if len(parts) < 3 or not parts[1].isdigit():
        bot.reply_to(message, "⚠️ الصيغة: `/reply_ticket <id> <نص الرد>`", parse_mode="Markdown")
        return
    ticket_id = int(parts[1])
    reply_text = parts[2].strip()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM support_tickets WHERE id = ?;", (ticket_id,))
        t = cursor.fetchone()
        if not t:
            bot.reply_to(message, "❌ التذكرة غير موجودة.")
            return
        # Delete ticket immediately so it never accumulates
        cursor.execute("DELETE FROM support_tickets WHERE id = ?;", (ticket_id,))
        conn.commit()

    reply_msg = (
        f"📩 *رد رسمي من إدارة الدعم الفني بخصوص تذكرتك #{ticket_id}:*\n\n"
        f"📝 استفسارك: \"{t['message']}\"\n\n"
        f"💬 *رد الإدارة:*\n{reply_text}"
    )
    delivered = send_safe_telegram_message(t["user_id"], reply_msg)
    if delivered:
        bot.reply_to(message, f"✅ تم إرسال الرد للمستخدم في تلغرام وحذف الشكوى #{ticket_id} من لوحة الإدارة نهائياً.")
    else:
        bot.reply_to(message, f"⚠️ تم حذف الشكوى #{ticket_id} بنجاح، ولكن الرد لم يصل لحساب المستخدم (ID: {t['user_id']})!\n\nالسبب الأساسي: تلغرام يمنع البوت من إرسال رسائل خاصة لأي مستخدم لم يقم بالدخول للبوت والضغط على (ابدأ / /start) من قبل!")

@bot.message_handler(commands=['delete_ticket'])
def handle_delete_ticket(message):
    if not is_admin(message.from_user.id):
        return
    parts = message.text.split()
    if len(parts) < 2 or not parts[1].isdigit():
        bot.reply_to(message, "⚠️ الصيغة: `/delete_ticket <id>`", parse_mode="Markdown")
        return
    ticket_id = int(parts[1])
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM support_tickets WHERE id = ?;", (ticket_id,))
        conn.commit()
    bot.reply_to(message, f"🗑️ تم حذف تذكرة الدعم #{ticket_id} نهائياً.")

@bot.message_handler(commands=['list_proofs', 'proofs'])
def handle_list_proofs(message):
    if not is_admin(message.from_user.id):
        return
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, task_id, task_title, user_id, username, created_at FROM task_submissions WHERE status = 'under_review' ORDER BY created_at DESC LIMIT 15;")
        rows = cursor.fetchall()
    if not rows:
        bot.reply_to(message, "✅ لا توجد إثباتات معلقة للمراجعة حالياً.")
        return
    out = ["📸 *قائمة الإثباتات المعلقة للمراجعة:*", ""]
    for r in rows:
        out.append(f"🎫 *إثبات:* `{r['id']}`")
        out.append(f"🔹 *المهمة:* {r['task_title']} (ID: {r['task_id']})")
        out.append(f"👤 *المستخدم:* @{r['username']} (`{r['user_id']}`)")
        out.append(f"✅ للموافقة: `/approve_proof {r['id']}`")
        out.append(f"❌ للرفض: `/reject_proof {r['id']}`")
        out.append("----------------------------")
    bot.reply_to(message, "\n".join(out), parse_mode="Markdown")

@bot.message_handler(commands=['approve_proof'])
def handle_approve_proof(message):
    if not is_admin(message.from_user.id):
        return
    parts = message.text.split()
    if len(parts) < 2:
        bot.reply_to(message, "⚠️ الصيغة: `/approve_proof <submission_id> [المبلغ_الاختياري]`", parse_mode="Markdown")
        return
    sub_id = parts[1].strip()
    reward = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 2500

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM task_submissions WHERE id = ?;", (sub_id,))
        sub = cursor.fetchone()
        if not sub:
            bot.reply_to(message, "❌ لم يتم العثور على الإثبات.")
            return
        if sub["status"] == "approved":
            bot.reply_to(message, "⚠️ تمت الموافقة على هذا الإثبات مسبقاً.")
            return

        cursor.execute("UPDATE task_submissions SET status = 'approved' WHERE id = ?;", (sub_id,))
        cursor.execute("UPDATE users SET balanceSYP = balanceSYP + ? WHERE telegram_id = ?;", (reward, sub["user_id"]))
        if sub["task_id"]:
            try:
                cursor.execute("INSERT INTO completed_tasks (user_id, task_id) VALUES (?, ?);", (sub["user_id"], int(sub["task_id"])))
            except Exception:
                pass
        cursor.execute("SELECT balanceSYP FROM users WHERE telegram_id = ?;", (sub["user_id"],))
        new_bal = cursor.fetchone()["balanceSYP"]
        conn.commit()

    try:
        bot.send_message(
            int(sub["user_id"]),
            f"🎉 *مبروك! تمت الموافقة على إثبات مهمتك:*\n\"{sub['task_title']}\"\n\n"
            f"💰 تمت إضافة *+{reward:,} ل.س* إلى رصيدك.\n"
            f"💵 رصيدك الجديد: *{new_bal:,} ل.س*.",
            parse_mode="Markdown"
        )
    except Exception:
        pass
    bot.reply_to(message, f"✅ تمت الموافقة بنجاح وصرف +{reward:,} ل.س للمستخدم `{sub['user_id']}`.")

@bot.message_handler(commands=['reject_proof'])
def handle_reject_proof(message):
    if not is_admin(message.from_user.id):
        return
    parts = message.text.split(None, 2)
    if len(parts) < 2:
        bot.reply_to(message, "⚠️ الصيغة: `/reject_proof <submission_id> [سبب_الرفض]`", parse_mode="Markdown")
        return
    sub_id = parts[1].strip()
    reason = parts[2].strip() if len(parts) > 2 else "الإثبات غير واضح أو لم يتم تنفيذ شروط المهمة"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM task_submissions WHERE id = ?;", (sub_id,))
        sub = cursor.fetchone()
        if not sub:
            bot.reply_to(message, "❌ لم يتم العثور على الإثبات.")
            return

        cursor.execute("UPDATE task_submissions SET status = 'rejected' WHERE id = ?;", (sub_id,))
        conn.commit()

    try:
        bot.send_message(
            int(sub["user_id"]),
            f"⚠️ *تنبيه بخصوص إثبات المهمة:*\n\"{sub['task_title']}\"\n\n"
            f"تم رفض الإثبات للسبب التالي:\n\"{reason}\"\n\n"
            f"يمكنك إعادة تنفيذ المهمة وتقديم إثبات دقيق.",
            parse_mode="Markdown"
        )
    except Exception:
        pass
    bot.reply_to(message, f"❌ تم رفض الإثبات وإشعار المستخدم.")

# ----------------------------------------------------------------------
# 6. Inline Button Handler
# ----------------------------------------------------------------------
@bot.callback_query_handler(func=lambda call: True)
def handle_callback(call):
    user_id = str(call.from_user.id)
    first_name = call.from_user.first_name or "المستخدم"

    if call.data == "btn_balance":
        bot.answer_callback_query(call.id)
        send_balance_info(call.message.chat.id, user_id, first_name)
    elif call.data == "btn_tasks":
        bot.answer_callback_query(call.id)
        send_tasks_list(call.message.chat.id, user_id)
    elif call.data == "btn_support":
        bot.answer_callback_query(call.id)
        bot.send_message(
            call.message.chat.id,
            "📩 *لإرسال شكوى أو استفسار:*\nأرسل الأمر متبوعاً بنص رسالتك، مثل:\n`/support واجهت مشكلة في المهمة`",
            parse_mode="Markdown"
        )
    elif call.data == "btn_admin":
        bot.answer_callback_query(call.id)
        if is_admin(call.from_user.id):
            send_admin_menu(call.message.chat.id)
        else:
            bot.send_message(call.message.chat.id, "🔐 يرجى تسجيل الدخول: `/admin_login Syria2026`", parse_mode="Markdown")

# ----------------------------------------------------------------------
# 7. Local Flask Backend API Server (Port 5000)
# ----------------------------------------------------------------------
def create_flask_app():
    try:
        from flask import Flask, request, jsonify
        from flask_cors import CORS
    except ImportError:
        print("⚠️ Flask/flask_cors is not installed yet. To run the HTTP API in Termux run:\n  pip install flask flask-cors pyTelegramBotAPI")
        return None

    app = Flask(__name__, static_folder="dist", static_url_path="")
    CORS(app)  # Enable Cross-Origin Resource Sharing for Cloudflare Tunnel

    @app.route("/", methods=["GET"])
    def root_route():
        try:
            return app.send_static_file("index.html")
        except Exception:
            return jsonify({
                "status": "online",
                "service": "BotSyria Flask Backend (dist/index.html not found)",
                "backend": "SQLite3 (database.db)",
                "cloudflare_tunnel": WEBAPP_URL
            })

    # 1. GET /api/user?id=X
    @app.route("/api/user", methods=["GET"])
    def api_get_user():
        uid = request.args.get("id", "").strip()
        if not uid:
            return jsonify({"error": "Missing user id"}), 400

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE telegram_id = ?;", (uid,))
            user = cursor.fetchone()

            if not user:
                # Auto-create user if not existing
                cursor.execute("""
                    INSERT INTO users (telegram_id, username, balanceSYP, referralsCount, referredBy)
                    VALUES (?, '', 0, 0, '');
                """, (uid,))
                conn.commit()
                cursor.execute("SELECT * FROM users WHERE telegram_id = ?;", (uid,))
                user = cursor.fetchone()

            return jsonify({
                "telegram_id": user["telegram_id"],
                "username": user["username"],
                "balanceSYP": user["balanceSYP"],
                "referralsCount": user["referralsCount"],
                "referredBy": user["referredBy"],
                "status": "success"
            })

    # 2. GET /api/tasks?id=X
    @app.route("/api/tasks", methods=["GET"])
    def api_get_tasks():
        uid = request.args.get("id", "").strip()
        with get_db() as conn:
            cursor = conn.cursor()
            if uid:
                # Active tasks user has NOT completed
                cursor.execute("""
                    SELECT id, title, reward, link FROM tasks 
                    WHERE active = 1 AND id NOT IN (SELECT task_id FROM completed_tasks WHERE user_id = ?)
                    ORDER BY id DESC;
                """, (uid,))
            else:
                cursor.execute("SELECT id, title, reward, link FROM tasks WHERE active = 1 ORDER BY id DESC;")
            
            rows = cursor.fetchall()
            tasks = [
                {
                    "id": r["id"],
                    "title": r["title"],
                    "reward": r["reward"],
                    "link": r["link"]
                }
                for r in rows
            ]
            return jsonify({"tasks": tasks, "status": "success"})

    # 3. POST /api/complete-task
    @app.route("/api/complete-task", methods=["POST"])
    def api_complete_task():
        data = request.get_json(force=True, silent=True) or {}
        user_id = str(data.get("user_id", "")).strip()
        task_id = data.get("task_id")

        if not user_id or task_id is None:
            return jsonify({"success": False, "error": "Missing user_id or task_id"}), 400

        try:
            task_id = int(task_id)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid task_id"}), 400

        with get_db() as conn:
            cursor = conn.cursor()
            # Verify task exists
            cursor.execute("SELECT * FROM tasks WHERE id = ? AND active = 1;", (task_id,))
            task = cursor.fetchone()
            if not task:
                return jsonify({"success": False, "error": "المهمة غير متوفرة أو معطلة"}), 404

            # Check if user already completed it
            cursor.execute("SELECT 1 FROM completed_tasks WHERE user_id = ? AND task_id = ?;", (user_id, task_id))
            if cursor.fetchone():
                return jsonify({"success": False, "error": "لقد قمت بإنجاز هذه المهمة مسبقاً!"}), 400

            reward = int(task["reward"])

            # 1. Insert into completed_tasks
            cursor.execute("INSERT INTO completed_tasks (user_id, task_id) VALUES (?, ?);", (user_id, task_id))

            # 2. Update user balance in SQLite
            cursor.execute("UPDATE users SET balanceSYP = balanceSYP + ? WHERE telegram_id = ?;", (reward, user_id))
            if cursor.rowcount == 0:
                cursor.execute("INSERT INTO users (telegram_id, username, balanceSYP, referralsCount, referredBy) VALUES (?, '', ?, 0, '');", (user_id, reward))

            cursor.execute("SELECT balanceSYP FROM users WHERE telegram_id = ?;", (user_id,))
            new_balance = cursor.fetchone()["balanceSYP"]
            conn.commit()

        # Send instant notification to user in Telegram
        try:
            bot.send_message(
                int(user_id),
                f"🎉 *تهانينا! تم إنجاز المهمة بنجاح!*\n\n"
                f"🔹 المهمة: *{task['title']}*\n"
                f"💰 تمت إضافة *+{reward:,} ل.س* إلى رصيدك.\n"
                f"💵 رصيدك الحالي: *{new_balance:,} ل.س*.",
                parse_mode="Markdown"
            )
        except Exception as e:
            print(f"[Notice] Could not notify user {user_id}: {e}")

        return jsonify({
            "success": True,
            "task_id": task_id,
            "reward": reward,
            "new_balance": new_balance,
            "message": "تم تأكيد إنجاز المهمة وإضافة الرصيد بنجاح!"
        })

    # 4. POST /api/support
    @app.route("/api/support", methods=["POST"])
    def api_submit_support():
        data = request.get_json(force=True, silent=True) or {}
        user_id = str(data.get("user_id", "")).strip()
        username = str(data.get("username", "N/A")).strip()
        message = str(data.get("message", "")).strip()

        if not user_id or not message:
            return jsonify({"success": False, "error": "Missing user_id or message"}), 400

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO support_tickets (user_id, username, message, status)
                VALUES (?, ?, ?, 'OPEN');
            """, (user_id, username, message))
            ticket_id = cursor.lastrowid
            conn.commit()

        # Notify Admin on Telegram
        alert_text = (
            f"🚨 *تذكرة دعم جديدة واردة من الميني أب!* 📩\n\n"
            f"🎫 رقم التذكرة: `#{ticket_id}`\n"
            f"👤 المستخدم: @{username} (ID: `{user_id}`)\n"
            f"💬 الرسالة:\n\"{message}\"\n\n"
            f"للرد على المستخدم: `/reply_ticket {ticket_id} نص الرد`"
        )
        for aid in ADMIN_IDS:
            try:
                bot.send_message(aid, alert_text, parse_mode="Markdown")
            except Exception:
                pass

        return jsonify({
            "success": True,
            "ticket_id": ticket_id,
            "message": "تم استلام الشكوى بنجاح وسيتم الرد عليك في تلغرام."
        })

    # 5. POST /api/submit-proof
    @app.route("/api/submit-proof", methods=["POST"])
    def api_submit_proof():
        data = request.get_json(force=True, silent=True) or {}
        task_id = str(data.get("taskId", "")).strip()
        task_title = data.get("taskTitle", f"مهمة #{task_id}")
        user_id = str(data.get("userId", "")).strip()
        user_name = data.get("userName", "مستخدم")
        account_username = data.get("accountUsername", "")
        notes = data.get("notes", "")
        proof_type = data.get("proofType", "both")
        proof_image = data.get("proofImageBase64", "")
        submission_id = f"sub_{int(time.time() * 1000)}_{user_id}"

        if not task_id or not user_id:
            return jsonify({"success": False, "error": "Missing taskId or userId"}), 400

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO task_submissions (id, task_id, task_title, user_id, username, proof_type, image_base64, notes, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'under_review');
            """, (submission_id, task_id, task_title, user_id, account_username or user_name, proof_type, proof_image, notes))
            conn.commit()

        # Send instant Telegram notification to Admin
        alert_msg = (
            f"📸 *إثبات مهمة جديد وارد للمراجعة!* 🇸🇾\n\n"
            f"🔹 *المهمة:* {task_title} (ID: `{task_id}`)\n"
            f"👤 *المستخدم:* {user_name} (@{account_username or 'N/A'})\n"
            f"🆔 *المعرف:* `{user_id}`\n"
            f"🖼️ *صورة مرفقة:* {'نعم ✅' if proof_image else 'لا ❌'}\n"
            + (f"📝 *ملاحظات:* {notes}\n" if notes else "") +
            f"\n💡 للموافقة عبر البوت: `/approve_proof {submission_id}`\n"
            f"💡 للرفض عبر البوت: `/reject_proof {submission_id}`"
        )
        for aid in ADMIN_IDS:
            try:
                bot.send_message(aid, alert_msg, parse_mode="Markdown")
            except Exception:
                pass

        return jsonify({
            "success": True,
            "submissionId": submission_id,
            "message": "تم تسجيل الإثبات بنجاح وهو الآن قيد المراجعة في قاعدة البيانات!"
        })

    # 6. GET /api/user-proofs/<userId>
    @app.route("/api/user-proofs/<userId>", methods=["GET"])
    def api_user_proofs(userId):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT task_id, status FROM task_submissions WHERE user_id = ?;", (str(userId),))
            rows = cursor.fetchall()
            return jsonify({"proofs": [{"task_id": r["task_id"], "status": r["status"]} for r in rows]})

    # 7. POST /api/withdraw
    @app.route("/api/withdraw", methods=["POST"])
    def api_withdraw():
        data = request.get_json(force=True, silent=True) or {}
        user_id = str(data.get("userId", "")).strip()
        method = str(data.get("method", "syriatel_cash")).strip()
        account_number = str(data.get("accountNumber", "")).strip()
        amount_syp = data.get("amountSYP")

        if not user_id or not account_number or not amount_syp:
            return jsonify({"success": False, "message": "يرجى تعبئة كافة بيانات السحب المطلوبة"}), 400

        try:
            amount = int(amount_syp)
        except ValueError:
            return jsonify({"success": False, "message": "المبلغ غير صالح"}), 400

        if amount < 10000:
            return jsonify({"success": False, "message": "الحد الأدنى للسحب هو 10,000 ليرة سورية"}), 400

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT balanceSYP, username FROM users WHERE telegram_id = ?;", (user_id,))
            u = cursor.fetchone()
            if not u or u["balanceSYP"] < amount:
                return jsonify({"success": False, "message": "رصيدك غير كافٍ لإتمام السحب"}), 400

            # Deduct balance
            cursor.execute("UPDATE users SET balanceSYP = balanceSYP - ? WHERE telegram_id = ?;", (amount, user_id))
            wid = f"wd_{int(time.time() * 1000)}_{user_id}"
            cursor.execute("""
                INSERT INTO withdrawals (id, user_id, method, account_number, amount_syp, status)
                VALUES (?, ?, ?, ?, ?, 'PENDING');
            """, (wid, user_id, method, account_number, amount))
            conn.commit()

        # Notify Admin on Telegram
        alert = (
            f"💸 *طلب سحب جديد وارد!* 🇸🇾\n\n"
            f"👤 المستخدم: @{u['username']} (`{user_id}`)\n"
            f"💰 المبلغ: *{amount:,} ل.س*\n"
            f"🏦 وسيلة السحب: *{method}*\n"
            f"📱 رقم الحساب: `{account_number}`\n"
            f"🆔 معرف الطلب: `{wid}`"
        )
        for aid in ADMIN_IDS:
            try:
                bot.send_message(aid, alert, parse_mode="Markdown")
            except Exception:
                pass

        return jsonify({
            "success": True,
            "withdrawalId": wid,
            "message": "تم تسجيل طلب السحب بنجاح وسيتم التحويل خلال 24 ساعة."
        })

    # 8. GET /api/admin/stats
    @app.route("/api/admin/stats", methods=["GET"])
    def api_admin_stats():
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as c FROM users;")
            total_users = cursor.fetchone()["c"]

            cursor.execute("SELECT COALESCE(SUM(balanceSYP), 0) as s FROM users;")
            total_dist = cursor.fetchone()["s"]

            cursor.execute("SELECT COUNT(*) as c FROM task_submissions WHERE status = 'under_review';")
            pending_proofs = cursor.fetchone()["c"]

            cursor.execute("SELECT COUNT(*) as c FROM withdrawals WHERE status = 'PENDING';")
            pending_wd = cursor.fetchone()["c"]

            cursor.execute("SELECT COUNT(*) as c FROM tasks WHERE active = 1;")
            active_tasks = cursor.fetchone()["c"]

            cursor.execute("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'OPEN';")
            open_tickets = cursor.fetchone()["c"]

            return jsonify({
                "stats": {
                    "totalUsers": total_users,
                    "totalEarningsDistributed": total_dist,
                    "pendingWithdrawals": pending_wd,
                    "approvedWithdrawals": 0,
                    "totalTasksCompleted": 0,
                    "activeTasksCount": active_tasks,
                    "activePromoCodesCount": 0,
                    "pendingProofs": pending_proofs,
                    "openTickets": open_tickets,
                    "uptime": "100% (Flask Server & SQLite database.db)"
                }
            })

    # 9. GET /api/admin/proofs
    @app.route("/api/admin/proofs", methods=["GET"])
    def api_admin_proofs():
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM task_submissions WHERE status = 'under_review' ORDER BY created_at DESC;")
            rows = cursor.fetchall()
            proofs = [
                {
                    "auditToken": r["id"],
                    "submissionId": r["id"],
                    "taskId": r["task_id"],
                    "taskTitle": r["task_title"],
                    "userId": r["user_id"],
                    "userName": r["username"],
                    "accountUsername": r["username"],
                    "proofType": r["proof_type"],
                    "proofImageBase64": r["image_base64"],
                    "notes": r["notes"],
                    "status": r["status"],
                    "submittedAt": str(r["created_at"])
                }
                for r in rows
            ]
            return jsonify({"proofs": proofs})

    # 10. POST /api/admin/approve-proof
    @app.route("/api/admin/approve-proof", methods=["POST"])
    def api_admin_approve_proof():
        data = request.get_json(force=True, silent=True) or {}
        submission_id = data.get("submissionId")
        task_id = data.get("taskId")
        user_id = str(data.get("userId", ""))
        reward_syp = int(data.get("rewardSYP", 2500))

        if not submission_id or not user_id:
            return jsonify({"success": False, "error": "Missing parameters"}), 400

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE task_submissions SET status = 'approved' WHERE id = ?;", (submission_id,))
            cursor.execute("UPDATE users SET balanceSYP = balanceSYP + ? WHERE telegram_id = ?;", (reward_syp, user_id))
            if task_id:
                try:
                    cursor.execute("INSERT INTO completed_tasks (user_id, task_id) VALUES (?, ?);", (user_id, int(task_id)))
                except Exception:
                    pass
            cursor.execute("SELECT balanceSYP FROM users WHERE telegram_id = ?;", (user_id,))
            new_bal = cursor.fetchone()["balanceSYP"]
            conn.commit()

        try:
            bot.send_message(
                int(user_id),
                f"🎉 *مبروك! تمت الموافقة على إثبات المهمة!*\n\n"
                f"💰 تمت إضافة *+{reward_syp:,} ل.س* إلى رصيدك.\n"
                f"💵 رصيدك الجديد: *{new_bal:,} ل.س*.",
                parse_mode="Markdown"
            )
        except Exception:
            pass

        return jsonify({"success": True, "rewardSYP": reward_syp, "newBalance": new_bal})

    # 11. POST /api/admin/reject-proof
    @app.route("/api/admin/reject-proof", methods=["POST"])
    def api_admin_reject_proof():
        data = request.get_json(force=True, silent=True) or {}
        submission_id = data.get("submissionId")
        user_id = str(data.get("userId", ""))
        reason = data.get("reason", "الإثبات غير واضح أو غير مكتمل")

        if not submission_id:
            return jsonify({"success": False, "error": "Missing submissionId"}), 400

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE task_submissions SET status = 'rejected' WHERE id = ?;", (submission_id,))
            conn.commit()

        if user_id:
            try:
                bot.send_message(
                    int(user_id),
                    f"⚠️ *تنبيه بخصوص إثبات المهمة:*\n\n"
                    f"تم رفض الإثبات للسبب التالي:\n\"{reason}\"\n"
                    f"يمكنك إعادة تنفيذ المهمة وإرسال إثبات واضح.",
                    parse_mode="Markdown"
                )
            except Exception:
                pass

        return jsonify({"success": True, "message": "تم رفض الإثبات وإشعار المستخدم."})

    # 12. GET /api/admin/tickets
    @app.route("/api/admin/tickets", methods=["GET"])
    def api_admin_tickets():
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM support_tickets ORDER BY id DESC LIMIT 50;")
            rows = cursor.fetchall()
            tickets = [
                {
                    "id": str(r["id"]),
                    "userId": int(r["user_id"]) if str(r["user_id"]).isdigit() else 0,
                    "userName": r["username"] or "مستخدم",
                    "category": "استفسار عام",
                    "message": r["message"],
                    "timestamp": r["created_at"] or "",
                    "status": "replied" if r["status"] == "RESOLVED" else "sent",
                    "adminReply": r["admin_reply"] or ""
                }
                for r in rows
            ]
            return jsonify({"tickets": tickets})

    # 13. POST /api/admin/reply-ticket
    @app.route("/api/admin/reply-ticket", methods=["POST"])
    def api_admin_reply_ticket():
        data = request.get_json(force=True, silent=True) or {}
        ticket_id = data.get("ticketId")
        reply_text = str(data.get("replyText", "")).strip()

        if not ticket_id or not reply_text:
            return jsonify({"success": False, "error": "Missing ticketId or replyText"}), 400

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM support_tickets WHERE id = ?;", (int(ticket_id),))
            t = cursor.fetchone()
            if not t:
                return jsonify({"success": False, "error": "التذكرة غير موجودة"}), 404

            # Delete ticket immediately so it never accumulates
            cursor.execute("DELETE FROM support_tickets WHERE id = ?;", (int(ticket_id),))
            conn.commit()

        # Send Telegram message to user with fallback
        reply_msg = (
            f"📩 *رد رسمي من إدارة الدعم الفني!* 🇸🇾\n\n"
            f"🎫 بخصوص استفسارك: \"{t['message']}\"\n\n"
            f"💬 *رد الإدارة:*\n{reply_text}"
        )
        delivered = send_safe_telegram_message(t["user_id"], reply_msg)

        if delivered:
            return jsonify({"success": True, "delivered": True, "message": "تم إرسال الرد للمستخدم في تلغرام وحذف الشكوى نهائياً!"})
        else:
            return jsonify({"success": True, "delivered": False, "message": f"⚠️ تم حذف الشكوى من لوحة الإدارة بنجاح، ولكن الرد لم يصل لحساب المستخدم (ID: {t['user_id']})!\n\nالسبب الأساسي: تلغرام يمنع البوت من إرسال رسائل خاصة لأي مستخدم لم يقم بالدخول للبوت والضغط على (ابدأ / /start) من قبل!"})

    # 14. POST /api/admin/delete-ticket
    @app.route("/api/admin/delete-ticket", methods=["POST"])
    def api_admin_delete_ticket():
        data = request.get_json(force=True, silent=True) or {}
        ticket_id = data.get("ticketId")
        if not ticket_id:
            return jsonify({"success": False, "error": "Missing ticketId"}), 400

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM support_tickets WHERE id = ?;", (int(ticket_id),))
            conn.commit()

        return jsonify({"success": True, "message": "تم حذف تذكرة الدعم نهائياً."})

    # 15. POST /api/admin/delete-all-resolved-tickets
    @app.route("/api/admin/delete-all-resolved-tickets", methods=["POST"])
    def api_admin_delete_all_resolved():
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM support_tickets WHERE status = 'RESOLVED';")
            count = cursor.rowcount
            conn.commit()
        return jsonify({"success": True, "count": count, "message": f"تم حذف {count} تذكرة مكتملة بنجاح."})

    # 16. POST /api/admin/tasks/create and /api/admin/create-task
    @app.route("/api/admin/tasks/create", methods=["POST"])
    @app.route("/api/admin/create-task", methods=["POST"])
    def api_admin_create_task():
        data = request.get_json(force=True, silent=True) or {}
        title = str(data.get("title", "")).strip()
        reward = int(data.get("rewardSYP", 2500))
        link = str(data.get("actionUrl") or data.get("link") or "").strip()

        if not title or not link:
            return jsonify({"success": False, "error": "Missing title or link"}), 400

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO tasks (title, reward, link, active) VALUES (?, ?, ?, 1);", (title, reward, link))
            task_id = cursor.lastrowid
            conn.commit()

        return jsonify({"success": True, "taskId": task_id, "message": "تم إنشاء ونشر المهمة بنجاح في قاعدة البيانات!"})

    # 17. POST /api/admin/tasks/delete and /api/admin/delete-task
    @app.route("/api/admin/tasks/delete", methods=["POST"])
    @app.route("/api/admin/delete-task", methods=["POST"])
    def api_admin_delete_task():
        data = request.get_json(force=True, silent=True) or {}
        task_id = data.get("taskId")
        if not task_id:
            return jsonify({"success": False, "error": "Missing taskId"}), 400

        tid = int(task_id)
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM tasks WHERE id = ?;", (tid,))
            cursor.execute("DELETE FROM completed_tasks WHERE task_id = ?;", (tid,))
            conn.commit()

        return jsonify({"success": True, "message": "تم حذف المهمة نهائياً من قاعدة البيانات وسحبها من المستخدمين."})

    # 18. POST /api/admin/tasks/edit and /api/admin/edit-task
    @app.route("/api/admin/tasks/edit", methods=["POST"])
    @app.route("/api/admin/edit-task", methods=["POST"])
    def api_admin_edit_task():
        data = request.get_json(force=True, silent=True) or {}
        task_id = data.get("taskId")
        title = str(data.get("title", "")).strip()
        reward = int(data.get("rewardSYP", 2500))
        link = str(data.get("actionUrl") or data.get("link") or "").strip()

        if not task_id or not title:
            return jsonify({"success": False, "error": "Missing parameters"}), 400

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE tasks SET title = ?, reward = ?, link = ? WHERE id = ?;", (title, reward, link, int(task_id)))
            conn.commit()

        return jsonify({"success": True, "message": "تم تعديل بيانات المهمة بنجاح!"})

    # 19. POST /api/admin/balance/add and /api/admin/add-balance
    @app.route("/api/admin/balance/add", methods=["POST"])
    @app.route("/api/admin/add-balance", methods=["POST"])
    def api_admin_add_balance():
        data = request.get_json(force=True, silent=True) or {}
        user_id = str(data.get("userId", "")).strip()
        amount = int(data.get("amount", 0))

        if not user_id:
            return jsonify({"success": False, "error": "Missing userId"}), 400

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET balanceSYP = balanceSYP + ? WHERE telegram_id = ?;", (amount, user_id))
            if cursor.rowcount == 0:
                cursor.execute("INSERT INTO users (telegram_id, username, balanceSYP, referralsCount, referredBy) VALUES (?, '', ?, 0, '');", (user_id, amount))
            cursor.execute("SELECT balanceSYP FROM users WHERE telegram_id = ?;", (user_id,))
            new_bal = cursor.fetchone()["balanceSYP"]
            conn.commit()

        send_safe_telegram_message(
            user_id,
            f"💰 *إشعار رصيد مالي من الإدارة!* 🇸🇾\n\nتمت إضافة *+{amount:,} ل.س* إلى حسابك.\nرصيدك الحالي: *{new_bal:,} ل.س*."
        )

        return jsonify({"success": True, "newBalance": new_bal, "message": f"تم تحديث رصيد المستخدم إلى {new_bal:,} ل.س"})

    # 20. GET /api/admin/settings and POST /api/admin/settings
    @app.route("/api/admin/settings", methods=["GET", "POST"])
    def api_admin_settings():
        with get_db() as conn:
            cursor = conn.cursor()
            if request.method == "POST":
                data = request.get_json(force=True, silent=True) or {}
                for k, v in data.items():
                    cursor.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?);", (str(k), str(v)))
                conn.commit()
                return jsonify({"success": True, "message": "✅ تم حفظ وتطبيق إعدادات وقيم النظام في قاعدة البيانات بنجاح!"})

            cursor.execute("SELECT * FROM system_settings;")
            rows = cursor.fetchall()
            s_map = {r["key"]: r["value"] for r in rows}
            return jsonify({
                "defaultTaskRewardSYP": int(s_map.get("defaultTaskRewardSYP", 2500)),
                "minWithdrawalSYP": int(s_map.get("minWithdrawalSYP", 10000)),
                "referralRewardSYP": int(s_map.get("referralRewardSYP", 1500)),
                "botMaintenanceMode": s_map.get("botMaintenanceMode") == "true",
                "announcementBanner": s_map.get("announcementBanner", "🇸🇾 أهلاً بك في بوت سوريا الرسمي للسحب الفوري بالليرة السورية")
            })

    return app

def run_flask_server():
    """Runs the Flask web server in a separate background thread on port 5000."""
    app = create_flask_app()
    if app:
        print("🚀 [Flask API] Starting local server on http://0.0.0.0:5000 (Cloudflare Tunnel Ready)...")
        app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False, threaded=True)

# ----------------------------------------------------------------------
# 8. Main Execution
# ----------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("🇸🇾 BotSyria Server & Telegram Bot Controller")
    print(f"📁 Local Database: {DB_FILE}")
    print(f"🌐 Cloudflare Tunnel: {WEBAPP_URL}")
    print("=" * 60)

    # Start Flask API in daemon thread
    flask_thread = threading.Thread(target=run_flask_server, daemon=True)
    flask_thread.start()

    # Start Telebot polling in main thread
    print("🤖 [Telebot] Starting Telegram Bot Polling...")
    bot.infinity_polling(timeout=20, long_polling_timeout=20)
