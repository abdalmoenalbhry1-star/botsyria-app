const fs = require('fs');
let content = fs.readFileSync('src/services/api.ts', 'utf8');

content = content.replace(
  "category?: 'telegram' | 'social' | 'community';",
  "category?: 'telegram' | 'social' | 'community';\n  totalSeats?: number;"
);

content = content.replace(
  "totalSeats: 1000,",
  "totalSeats: taskData.totalSeats || undefined,"
);

content = content.replace(
  "remainingSeats: 999,",
  "remainingSeats: taskData.totalSeats || undefined,"
);

fs.writeFileSync('src/services/api.ts', content);
