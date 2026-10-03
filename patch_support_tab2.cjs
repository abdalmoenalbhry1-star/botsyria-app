const fs = require('fs');
let content = fs.readFileSync('src/components/SupportTab.tsx', 'utf8');

const startIndex = content.indexOf('{/* Latest Sent Support Message');
const endIndex = content.lastIndexOf('</div>\n    </div>');

if (startIndex !== -1 && endIndex !== -1) {
  const newSection = `{/* Chat Interface for Latest Ticket */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-sky-400 px-1">
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            <span>المحادثة الحالية مع الإدارة</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal">
            يتم عرض آخر رسالة فقط
          </span>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-[#0e1628]/70 border border-sky-500/20 rounded-xl p-5 text-center text-xs text-slate-400">
            لا توجد محادثات حالية.
          </div>
        ) : (
          <div className="space-y-3 bg-[#0e1628]/90 border border-sky-500/20 rounded-xl p-3 shadow-xs">
            {/* User Message Bubble */}
            <div className="flex flex-col items-end w-full">
              <div className="flex items-center gap-1.5 mb-1 mr-1">
                <span className="text-[10px] text-slate-400">{tickets[0].timestamp}</span>
                <span className="text-[11px] font-bold text-slate-300">أنت</span>
              </div>
              <div className="bg-sky-600 text-white p-2.5 rounded-2xl rounded-tr-sm text-xs max-w-[85%] leading-relaxed shadow-sm">
                {tickets[0].message}
              </div>
            </div>

            {/* Admin Reply Bubble */}
            {tickets[0].adminReply && (
              <div className="flex flex-col items-start w-full mt-3">
                <div className="flex items-center gap-1.5 mb-1 ml-1">
                  <span className="text-[11px] font-bold text-emerald-400">الإدارة</span>
                  <span className="text-[10px] text-slate-400">{tickets[0].repliedAt}</span>
                </div>
                <div className="bg-[#1a253c] border border-slate-700 text-emerald-50 p-2.5 rounded-2xl rounded-tl-sm text-xs max-w-[85%] leading-relaxed shadow-sm">
                  {tickets[0].adminReply}
                </div>
              </div>
            )}
            
            {/* Pending State */}
            {!tickets[0].adminReply && (
              <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 px-1 animate-pulse">
                <Clock className="w-3 h-3" />
                <span>بانتظار رد الإدارة...</span>
              </div>
            )}
          </div>
        )}
      </div>
`;
  content = content.substring(0, startIndex) + newSection + content.substring(endIndex);
  fs.writeFileSync('src/components/SupportTab.tsx', content);
  console.log("Patched successfully!");
} else {
  console.log("Could not find start/end bounds.");
}
