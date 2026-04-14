const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool = null;

// Wrap a client or pool to have SQLite-like method signatures but async!
function createDbWrapper(clientOrPool) {
    return {
        async get(sql, ...params) {
            if (params.length === 1 && Array.isArray(params[0])) params = params[0];
            let i = 1; 
            const pgSql = sql.replace(/\?/g, () => `$${i++}`);
            const res = await clientOrPool.query(pgSql, params);
            return res.rows[0];
        },
        async all(sql, ...params) {
            if (params.length === 1 && Array.isArray(params[0])) params = params[0];
            let i = 1; 
            const pgSql = sql.replace(/\?/g, () => `$${i++}`);
            const res = await clientOrPool.query(pgSql, params);
            return res.rows;
        },
        async run(sql, ...params) {
            if (params.length === 1 && Array.isArray(params[0])) params = params[0];
            let i = 1; 
            let pgSql = sql.replace(/\?/g, () => `$${i++}`);
            
            // If it's an INSERT, we often need the lastInsertRowid.
            // In Postgres, we append "RETURNING id" if not present.
            if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
                pgSql += ' RETURNING id';
            }
            
            const res = await clientOrPool.query(pgSql, params);
            return {
                changes: res.rowCount,
                lastInsertRowid: res.rows[0]?.id
            };
        },
        async transaction(callbackAsync) {
            // Only a Pool can connect a client for a raw transaction
            if (clientOrPool.connect) {
                const client = await clientOrPool.connect();
                try {
                    await client.query('BEGIN');
                    const txWrapper = createDbWrapper(client);
                    const result = await callbackAsync(txWrapper);
                    await client.query('COMMIT');
                    return result;
                } catch (err) {
                    await client.query('ROLLBACK');
                    throw err;
                } finally {
                    client.release();
                }
            } else {
                // If it's already a client (nested transaction?), just run it
                return await callbackAsync(createDbWrapper(clientOrPool));
            }
        }
    };
}

let globalWrapper = null;

async function initDB() {
    pool = new Pool({
        // For security, use environment variable on production, fallback to string on DEV deployment
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:santisepu1234@db.fmnivdmwylyczgnvxvhy.supabase.co:5432/postgres',
        ssl: { rejectUnauthorized: false }
    });

    console.log('🔄 Conectando a Supabase PostgreSQL... (Esto puede tomar unos segundos)');
    await pool.query('SELECT 1');
    console.log('✅ Conectado a la base de datos Supabase correctamente!');

    globalWrapper = createDbWrapper(pool); // Use Pool as base

    try {
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
        await pool.query(schema);
        console.log('✅ Esquema verificado en Postgres');
    } catch (e) {
        console.error('Error aplicando esquema Postgres:', e);
    }

    return globalWrapper;
}

function getDB() {
    if (!globalWrapper) throw new Error('Database not initialized. Call initDB() first.');
    return globalWrapper;
}

function closeDB() {
    if (pool) {
        pool.end();
        globalWrapper = null;
    }
}

module.exports = { initDB, getDB, closeDB };
