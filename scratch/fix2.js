const fs = require('fs');

const files = fs.readdirSync('routes').filter(f => f.endsWith('.js'));
for (const file of files) {
    let t = fs.readFileSync('routes/' + file, 'utf8');
    t = t.replace(/async\s+async\s+\(req,\s*res\)/g, 'async (req, res)');
    fs.writeFileSync('routes/' + file, t);
}
console.log('Fixed async async');
