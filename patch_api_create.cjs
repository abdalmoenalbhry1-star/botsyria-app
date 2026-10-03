const fs = require('fs');
let content = fs.readFileSync('src/services/api.ts', 'utf8');

content = content.replace(
  "totalSeats: 1000,",
  "totalSeats: taskData.totalSeats || undefined,"
);

content = content.replace(
  "remainingSeats: undefined,",
  "remainingSeats: taskData.totalSeats || undefined,"
);

fs.writeFileSync('src/services/api.ts', content);
