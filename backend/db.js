const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      name TEXT,
      email TEXT,
      avatar_url TEXT,
      created_at TEXT,
      updated_at TEXT,
      UNIQUE(provider, provider_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT,
      details TEXT,
      created_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
});

function now() {
  return new Date().toISOString();
}

function saveUser(profile) {
  const provider = profile.provider || 'unknown';
  const providerId = profile.providerId || `${provider}:${profile.email}`;
  const name = profile.name || profile.email || 'Unknown User';
  const email = profile.email || '';
  const avatarUrl = profile.avatarUrl || '';

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO users (provider, provider_id, name, email, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(provider, provider_id) DO UPDATE SET
         name=excluded.name,
         email=excluded.email,
         avatar_url=excluded.avatar_url,
         updated_at=excluded.updated_at`,
      [provider, providerId, name, email, avatarUrl, now(), now()],
      function (err) {
        if (err) return reject(err);
        const userId = this.lastID;
        if (userId) return resolve(userId);
        db.get(`SELECT id FROM users WHERE provider = ? AND provider_id = ?`, [provider, providerId], (queryErr, row) => {
          if (queryErr) return reject(queryErr);
          resolve(row?.id);
        });
      }
    );
  });
}

function insertAudit(userId, action, details) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO audit_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)`,
      [userId || null, action, details || '', now()],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

module.exports = { db, saveUser, insertAudit };
