const fs = require('fs');
let code = fs.readFileSync('routes/transfers.js', 'utf8');
code = code.replace(/async async function checkAutoMissions/g, 'async function checkAutoMissions');
fs.writeFileSync('routes/transfers.js', code);
console.log('Fixed double async in checkAutoMissions');
