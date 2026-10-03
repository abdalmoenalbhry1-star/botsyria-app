const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPortalModal.tsx', 'utf8');

content = content.replace(
  '<div className="grid grid-cols-2 gap-3">',
  '<div className="grid grid-cols-3 gap-3">'
);

const oldSelect = `<option value="social">مواقع التواصل (Social)</option>
                    </select>
                  </div>`;

const newSelectAndSeats = `<option value="social">مواقع التواصل (Social)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">عدد المقاعد</label>
                    <input
                      type="number"
                      value={newTaskSeats}
                      onChange={(e) => setNewTaskSeats(e.target.value)}
                      placeholder="1000"
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-sky-400"
                    />
                  </div>`;

content = content.replace(oldSelect, newSelectAndSeats);

fs.writeFileSync('src/components/AdminPortalModal.tsx', content);
