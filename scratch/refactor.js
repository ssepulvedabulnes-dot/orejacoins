const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
files.push('../server.js');

for (const file of files) {
    const filePath = path.join(routesDir, file);
    let code = fs.readFileSync(filePath, 'utf-8');

    // 1. Handlers to async
    code = code.replace(/router\.(get|post|put|delete)\('([^']+)',\s*(.*?)\s*\(req,\s*res\)\s*=>\s*\{/g, 
        (match, method, route, middleware) => {
            if (middleware && middleware.trim().length > 0) {
                return `router.${method}('${route}', ${middleware} async (req, res) => {`;
            } else {
                return `router.${method}('${route}', async (req, res) => {`;
            }
        }
    );

    // 2. Prepare -> await db.method
    code = code.replace(/(db|tx)\.prepare\(\s*(`[^`]+`|'[^']+'|"[^"]+")\s*\)\.(get|all|run)\(([^)]*)\)/g, (match, prefix, sql, method, params) => {
        if (params.trim().length > 0) {
            return `await ${prefix}.${method}(${sql}, ${params})`;
        } else {
            return `await ${prefix}.${method}(${sql})`;
        }
    });

    // 3. Fix .get(...).count -> (await .get(...)).count
    code = code.replace(/(await (?:db|tx)\.get\([^)]+\))\.count/g, '($1).count');
    // It might have nested parentheses in params like (req.user.id), so the closing paren regex is weak `[^)]+`.
    // Let's do a safer string replace:
    code = code.replace(/await (db|tx)\.get\((.*?)\)\.count/g, '(await $1.get($2)).count');
    // And for double parens
    code = code.replace(/\(await (db|tx)\.get\((.*?)\)\)\.count\.count/g, '(await $1.get($2)).count'); // cleanup if double applied

    // 4. db.transaction(() => { -> await db.transaction(async (tx) => {
    // Note: since SQLite `transaction()` returned a function, they had: `const transfer = db.transaction(() => { ... }); transfer();`
    // Now Postgres `transaction` executes immediately.
    // So we replace `const transfer = db.transaction(() => {` with `const transfer = async () => { return await db.transaction(async (tx) => {`
    code = code.replace(/const (\w+) = db\.transaction\(\s*\(\)\s*=>\s*\{/g, 'const $1 = async () => { return await db.transaction(async (tx) => {');
    // And executing it: `const result = transfer();` -> `const result = await transfer();`
    code = code.replace(/const result = transfer\(\);/g, 'const result = await transfer();');
    code = code.replace(/const result = purchase\(\);/g, 'const result = await purchase();');
    code = code.replace(/const updatedUser = grant\(\);/g, 'const updatedUser = await grant();');

    // 5. checkAutoMissions is async
    code = code.replace(/checkAutoMissions\(db,/g, 'await checkAutoMissions(db,');
    if (file === 'transfers.js') {
        code = code.replace(/function checkAutoMissions/g, 'async function checkAutoMissions');
    }

    if (file === '../server.js') {
        code = code.replace(/const db = await initDB\(\);/g, 'await initDB();');
        code = code.replace(/await initDB\(\);/, 'await initDB();');
    }

    fs.writeFileSync(filePath, code, 'utf-8');
    
    // 6. Manual replace `db.` to `tx.` inside transactions. 
    // It's easier to just do it via manual edit or simple replace in known files.
}

// Post-process known files with `tx.` inside the `async (tx)` scope
let transfersPath = path.join(routesDir, 'transfers.js');
let tr = fs.readFileSync(transfersPath, 'utf8');
// Between "const sender = await db.get" to "return { transaction_id", change db to tx
tr = tr.replace(/const sender = await db\.get/g, 'const sender = await tx.get');
tr = tr.replace(/const receiver = await db\.get/g, 'const receiver = await tx.get');
tr = tr.replace(/await db\.run\('UPDATE users/g, 'await tx.run(\'UPDATE users');
tr = tr.replace(/const result = await db\.run\(\s*'INSERT INTO transactions/g, 'const result = await tx.run(\n            \'INSERT INTO transactions');
fs.writeFileSync(transfersPath, tr);

let storePath = path.join(routesDir, 'store.js');
let st = fs.readFileSync(storePath, 'utf8');
st = st.replace(/const user = await db\.get\('SELECT \* FROM users /g, 'const user = await tx.get(\'SELECT * FROM users ');
st = st.replace(/await db\.run\('UPDATE users/g, 'await tx.run(\'UPDATE users');
st = st.replace(/await db\.run\('UPDATE store_items/g, 'await tx.run(\'UPDATE store_items');
st = st.replace(/await db\.run\('INSERT INTO user_purchases/g, 'await tx.run(\'INSERT INTO user_purchases');
st = st.replace(/await db\.run\(\s*'INSERT INTO transactions/g, 'await tx.run(\n            \'INSERT INTO transactions');
fs.writeFileSync(storePath, st);

let usersPath = path.join(routesDir, 'users.js');
let us = fs.readFileSync(usersPath, 'utf8');
us = us.replace(/await db\.run\('UPDATE users/g, 'await tx.run(\'UPDATE users');
us = us.replace(/await db\.run\(\s*'INSERT INTO transactions/g, 'await tx.run(\n            \'INSERT INTO transactions');
us = us.replace(/return await db\.get\('SELECT id, username/g, 'return await tx.get(\'SELECT id, username');
fs.writeFileSync(usersPath, us);

console.log('✅ Done');
