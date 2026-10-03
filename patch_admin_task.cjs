const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPortalModal.tsx', 'utf8');

// Add state for seats
content = content.replace(
  "const [newTaskUrl, setNewTaskUrl] = useState('');",
  "const [newTaskUrl, setNewTaskUrl] = useState('');\n  const [newTaskSeats, setNewTaskSeats] = useState('1000');"
);

// Update payload
content = content.replace(
  "category: 'telegram',",
  "category: 'telegram',\n      totalSeats: Number(newTaskSeats) || undefined,"
);

// Clear form
content = content.replace(
  "setNewTaskUrl('');",
  "setNewTaskUrl('');\n      setNewTaskSeats('1000');"
);

// Add the field to UI
const fieldHTML = `                  <div>
                    <label className="text-xs text-slate-300 block mb-1">المكافأة (ل.س)</label>
                    <input
                      type="number"
                      value={newTaskReward}
                      onChange={(e) => setNewTaskReward(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-sky-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">عدد المقاعد (اختياري)</label>
                    <input
                      type="number"
                      value={newTaskSeats}
                      onChange={(e) => setNewTaskSeats(e.target.value)}
                      placeholder="1000"
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-sky-400"
                    />
                  </div>`;

// Replace the reward field section to include seats. Let's find exactly how the reward field looks.
