const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();

// Регистрация
router.post('/register', async (req, res) => {
  const { username, email, password, minecraft_username } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO users (username, email, password, minecraft_username, role)
       VALUES (?, ?, ?, ?, 'user')`,
      [username, email, hashedPassword, minecraft_username || null],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Пользователь или email уже существует' });
          }
          return res.status(500).json({ error: 'Ошибка при регистрации' });
        }

        const user = { id: this.lastID, username, email, role: 'user' };
        const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
          message: 'Пользователь успешно зарегистрирован',
          token,
          user
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Логин и пароль обязательны' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'Неверные учетные данные' });
    }

    try {
      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.status(400).json({ error: 'Неверные учетные данные' });
      }

      db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Успешный вход',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          minecraft_username: user.minecraft_username
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });
});

module.exports = router;
