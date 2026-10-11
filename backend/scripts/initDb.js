require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const schemaPath = path.join(__dirname, '..','..', 'database', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

console.log('📦 Running schema...');
db.exec(schema);
console.log('✅ Schema applied successfully.');

const tables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
).all();

console.log('\n📋 Tables in database:');
tables.forEach(t => console.log('  •', t.name));

console.log('\n🎉 Database is ready!');
process.exit(0);