const fs = require('fs');
let content = fs.readFileSync('src/services/api.ts', 'utf8');

const regexForceDefault = /\/\/\s*Keep any default tasks guaranteed in catalog[\s\S]*?if \(catalogUpdated\) \{[\s\S]*?\}\s*\}/;

content = content.replace(regexForceDefault, '// Default tasks are NO LONGER forced back if an admin deletes them.');

// Oh wait, there's a reference to taskData.totalSeats inside DEFAULT_TASKS.
// Lines 30-45: `totalSeats: taskData.totalSeats || undefined,`
// This is a reference error because taskData is not defined in the outer scope of api.ts!
// Let me fix that as well.

content = content.replace(/totalSeats:\s*taskData\.totalSeats\s*\|\|\s*undefined,/, 'totalSeats: undefined,');
content = content.replace(/remainingSeats:\s*taskData\.totalSeats\s*\|\|\s*undefined,/, 'remainingSeats: undefined,');

fs.writeFileSync('src/services/api.ts', content);
