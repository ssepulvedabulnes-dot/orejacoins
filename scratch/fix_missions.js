const fs = require('fs');
let code = fs.readFileSync('routes/missions.js', 'utf8');
code = code.replace(/    \}\);\r?\n\r?\n    try \{/g, '    }); };\n\n    try {');
// If there's no try block, maybe it was just:
//     });
//     const result = await claim();
code = code.replace(/    \}\);\r?\n\s+const (\w+) = await (\w+)\(\);/g, '    }); };\n\n        const $1 = await $2();');
fs.writeFileSync('routes/missions.js', code);
// also do tx. inside missions.js
code = fs.readFileSync('routes/missions.js', 'utf8');
let tStart = code.indexOf('const claim = async () => {');
if (tStart > -1) {
    let tEnd = code.indexOf('    }); };', tStart) || code.indexOf('    });', tStart);
    if (tEnd > -1) {
        let inside = code.substring(tStart, tEnd + 10);
        inside = inside.replace(/await db\.run/g, 'await tx.run');
        inside = inside.replace(/await db\.get/g, 'await tx.get');
        code = code.substring(0, tStart) + inside + code.substring(tEnd + 10);
        fs.writeFileSync('routes/missions.js', code);
    }
}
console.log('Fixed missions');
