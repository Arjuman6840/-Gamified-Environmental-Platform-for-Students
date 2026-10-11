
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Path to the database file
const dbDir = path.join(__dirname, '..', '..','..', 'database');
const dbPath = path.join(dbDir, 'eco_learn.db');

// Make sure the database folder exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create/open the database
const db = new Database(dbPath);

// Performance + safety settings
db.pragma('journal_mode = WAL');      // better concurrency
db.pragma('foreign_keys = ON');       // enforce foreign keys

console.log('✅ SQLite database connected at:', dbPath);

module.exports = db;