// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Database Connection & Helpers (sql.js — pure WASM, no native build)
// ═══════════════════════════════════════════════════════════════════════════════

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', process.env.DB_NAME || 'orejacoins.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;
let saveTimer = null;

// ── Compatibility wrapper: mimics better-sqlite3 API on top of sql.js ────────
class PreparedStatement {
    constructor(sqlDb, sql) {
        this.sqlDb = sqlDb;
        this.sql = sql;
    }

    /**
     * Execute and return the first matching row as an object
     */
    get(...params) {
        const stmt = this.sqlDb.prepare(this.sql);
        try {
            if (params.length === 1 && Array.isArray(params[0])) params = params[0];
            if (params.length > 0) stmt.bind(params);
            if (stmt.step()) {
                return stmt.getAsObject();
            }
            return undefined;
        } finally {
            stmt.free();
        }
    }

    /**
     * Execute and return all matching rows as an array of objects
     */
    all(...params) {
        const stmt = this.sqlDb.prepare(this.sql);
        try {
            if (params.length === 1 && Array.isArray(params[0])) params = params[0];
            if (params.length > 0) stmt.bind(params);
            const results = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            return results;
        } finally {
            stmt.free();
        }
    }

    /**
     * Execute statement (INSERT/UPDATE/DELETE) and return { changes, lastInsertRowid }
     */
    run(...params) {
        if (params.length === 1 && Array.isArray(params[0])) params = params[0];
        if (params.length > 0) {
            this.sqlDb.run(this.sql, params);
        } else {
            this.sqlDb.run(this.sql);
        }
        const changes = this.sqlDb.getRowsModified();
        // Get last insert rowid
        const lastStmt = this.sqlDb.prepare('SELECT last_insert_rowid() as id');
        let lastInsertRowid = 0;
        if (lastStmt.step()) {
            lastInsertRowid = lastStmt.getAsObject().id;
        }
        lastStmt.free();

        // Schedule save to disk
        scheduleSave();

        return { changes, lastInsertRowid };
    }
}

class DatabaseWrapper {
    constructor(sqlDb) {
        this.sqlDb = sqlDb;
    }

    prepare(sql) {
        return new PreparedStatement(this.sqlDb, sql);
    }

    exec(sql) {
        this.sqlDb.exec(sql);
        scheduleSave();
    }

    pragma(pragmaStr) {
        try {
            this.sqlDb.exec(`PRAGMA ${pragmaStr}`);
        } catch (e) {
            // Some pragmas aren't supported in sql.js (like WAL)
        }
    }

    transaction(fn) {
        const self = this;
        return function (...args) {
            self.sqlDb.exec('BEGIN TRANSACTION');
            try {
                const result = fn(...args);
                self.sqlDb.exec('COMMIT');
                scheduleSave();
                return result;
            } catch (e) {
                self.sqlDb.exec('ROLLBACK');
                throw e;
            }
        };
    }

    close() {
        saveToDisk();
        if (saveTimer) clearTimeout(saveTimer);
        this.sqlDb.close();
    }
}

/**
 * Save database to disk (debounced)
 */
function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveToDisk, 500);
}

function saveToDisk() {
    if (!db) return;
    try {
        const data = db.sqlDb.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    } catch (e) {
        console.error('❌ Error saving database:', e.message);
    }
}

/**
 * Initializes the database connection and runs the schema
 */
async function initDB() {
    const SQL = await initSqlJs();

    // Load existing database or create new one
    let sqlDb;
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        sqlDb = new SQL.Database(fileBuffer);
        console.log('📂 Loaded existing database from', DB_PATH);
    } else {
        sqlDb = new SQL.Database();
        console.log('🆕 Created new database');
    }

    db = new DatabaseWrapper(sqlDb);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Run schema
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);

    // Migrations to add image_data fields dynamically if missing
    try { db.exec("ALTER TABLE transactions ADD COLUMN image_data TEXT;"); } catch(e) {}
    try { db.exec("ALTER TABLE missions ADD COLUMN image_data TEXT;"); } catch(e) {}

    // Save initial state
    saveToDisk();

    console.log('✅ Database initialized at', DB_PATH);
    return db;
}

/**
 * Returns the database instance
 */
function getDB() {
    if (!db) {
        throw new Error('Database not initialized. Call initDB() first.');
    }
    return db;
}

/**
 * Closes the database connection gracefully
 */
function closeDB() {
    if (db) {
        db.close();
        db = null;
        console.log('🔒 Database connection closed');
    }
}

module.exports = { initDB, getDB, closeDB };
