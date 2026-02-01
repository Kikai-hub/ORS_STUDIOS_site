const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/minecraft.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err);
  } else {
    console.log('Подключено к SQLite базе данных');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
  // Таблица пользователей
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      minecraft_username TEXT,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);

  db.run('ALTER TABLE users ADD COLUMN favorite_server TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Ошибка добавления favorite_server:', err.message);
    }
  });

  // Таблица привилегий
  db.run(`
    CREATE TABLE IF NOT EXISTS privileges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      privilege TEXT NOT NULL,
      granted_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (granted_by) REFERENCES users(id),
      UNIQUE(user_id, privilege)
    )
  `);

  // Таблица логов админ действий
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_user_id INTEGER,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id),
      FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Таблица информации сервера
  db.run(`
    CREATE TABLE IF NOT EXISTS server_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_name TEXT,
      server_ip TEXT,
      server_port INTEGER,
      server_version TEXT,
      max_players INTEGER,
      description TEXT,
      hero_image_url TEXT,
      hero_title TEXT,
      hero_subtitle TEXT,
      hero_text_color TEXT,
      hero_bg_color TEXT,
      hero_overlay_color TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run('ALTER TABLE server_info ADD COLUMN hero_title TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Ошибка добавления hero_title:', err.message);
    }
  });

  db.run('ALTER TABLE server_info ADD COLUMN hero_subtitle TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Ошибка добавления hero_subtitle:', err.message);
    }
  });

  db.run('ALTER TABLE server_info ADD COLUMN hero_text_color TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Ошибка добавления hero_text_color:', err.message);
    }
  });

  db.run('ALTER TABLE server_info ADD COLUMN hero_bg_color TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Ошибка добавления hero_bg_color:', err.message);
    }
  });

  db.run('ALTER TABLE server_info ADD COLUMN hero_overlay_color TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Ошибка добавления hero_overlay_color:', err.message);
    }
  });

  // Таблица постов
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      published BOOLEAN DEFAULT 1,
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Таблица комментариев к постам
  db.run(`
    CREATE TABLE IF NOT EXISTS post_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Таблица просмотров постов (уникальные просмотры на пользователя)
  db.run(`
    CREATE TABLE IF NOT EXISTS post_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Таблица тикетов
  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      minecraft_username TEXT,
      account_name TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Таблица сообщений в тикетах
  db.run(`
    CREATE TABLE IF NOT EXISTS ticket_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  });
}

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (!err) {
      console.log('Таблицы в базе:', tables.map(t => t.name).join(', '));
    }
  });
});

module.exports = db;
