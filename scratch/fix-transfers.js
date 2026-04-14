const fs = require('fs');

let code = fs.readFileSync('routes/transfers.js', 'utf8');

// 1. Handlers
code = code.replace(/router\.(get|post|put|delete)\('([^']+)',\s*(.*?)\s*\(req,\s*res\)\s*=>\s*\{/g, 
    (match, method, route, middleware) => {
        if (middleware && middleware.trim().length > 0) {
            return `router.${method}('${route}', ${middleware} async (req, res) => {`;
        } else {
            return `router.${method}('${route}', async (req, res) => {`;
        }
    }
);

// 2. Prepare
code = code.replace(/(db|tx)\.prepare\(\s*(`[^`]+`|'[^']+'|"[^"]+")\s*\)\.(get|all|run)\(([^)]*)\)/g, (match, prefix, sql, method, params) => {
    if (params && params.trim().length > 0) {
        return `await ${prefix}.${method}(${sql}, ${params})`;
    } else {
        return `await ${prefix}.${method}(${sql})`;
    }
});

// 3. Counts
code = code.replace(/await (db|tx)\.get\((.*?)\)\.count/g, '(await $1.get($2)).count');
code = code.replace(/\(await (db|tx)\.get\((.*?)\)\)\.count\.count/g, '(await $1.get($2)).count');

// 4. Transaction
code = code.replace(/const (\w+) = db\.transaction\(\s*\(\)\s*=>\s*\{/g, 'const $1 = async () => { return await db.transaction(async (tx) => {');
code = code.replace(/const result = transfer\(\);/g, 'const result = await transfer();');

// 5. checkAutoMissions declaration AND call
code = code.replace(/checkAutoMissions\(db,/g, 'await checkAutoMissions(db,');
code = code.replace(/function await checkAutoMissions/g, 'async function checkAutoMissions');
code = code.replace(/function checkAutoMissions/g, 'async function checkAutoMissions');

// Since we replaced db.transaction return with a closure, fix closing brace
code = code.replace(/    \}\);\r?\n\r?\n    try \{/g, '    }); };\n\n    try {');

// Fix `db.` to `tx.` inside transaction:
// Specifically between "const transfer = async" and "try {"
let parts = code.split('try {');
if (parts.length > 1) {
    let beforeTry = parts[0];
    let fnStart = beforeTry.lastIndexOf('const transfer = async () => {');
    if (fnStart > -1) {
        let insideTx = beforeTry.substring(fnStart);
        insideTx = insideTx.replace(/await db\.get/g, 'await tx.get');
        insideTx = insideTx.replace(/await db\.run/g, 'await tx.run');
        parts[0] = beforeTry.substring(0, fnStart) + insideTx;
    }
}
code = parts.join('try {');

fs.writeFileSync('routes/transfers.js', code, 'utf8');
console.log('Fixed transfers.js');
