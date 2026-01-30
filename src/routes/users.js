const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// Получить профиль текущего пользователя
router.get('/profile', (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    db.all(
      'SELECT privilege FROM privileges WHERE user_id = ?',
      [req.user.id],
      (err, privileges) => {
        res.json({
          user,
          privileges: privileges ? privileges.map(p => p.privilege) : []
        });
      }
    );
  });
});

// Обновить профиль
router.put('/profile', (req, res) => {
  const { minecraft_username, email, favorite_server } = req.body;

  db.run(
    'UPDATE users SET minecraft_username = ?, email = ?, favorite_server = ? WHERE id = ?',
    [minecraft_username, email, favorite_server || null, req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при обновлении профиля' });
      }

      res.json({ message: 'Профиль обновлен' });
    }
  );
});

// Список всех пользователей (только для админов)
router.get('/list', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }

  db.all('SELECT id, username, email, role, minecraft_username, created_at FROM users', (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка при получении списка' });
    }

    res.json(users);
  });
});

module.exports = router;
