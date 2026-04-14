const fs = require('fs');

let t = fs.readFileSync('routes/transfers.js', 'utf8');
t = t.replace(/    \}\);\r?\n\r?\n    try \{/g, '    }); };\n\n    try {');
fs.writeFileSync('routes/transfers.js', t);

let s = fs.readFileSync('routes/store.js', 'utf8');
s = s.replace(/    \}\);\r?\n\r?\n    try \{/g, '    }); };\n\n    try {');
fs.writeFileSync('routes/store.js', s);

console.log('Fixed syntax!');
