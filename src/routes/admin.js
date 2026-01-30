const express = require('express');
const db = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

// Получить всех пользователей
router.get('/users', (req, res) => {
  db.all(
    'SELECT id, username, email, role, minecraft_username, created_at FROM users',
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при получении пользователей' });
      }
      res.json(users);
    }
  );
});

// Получить пользователя по ID с привилегиями
router.get('/users/:id', (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    db.all(
      'SELECT privilege FROM privileges WHERE user_id = ?',
      [req.params.id],
      (err, privileges) => {
        res.json({
          user,
          privileges: privileges ? privileges.map(p => p.privilege) : []
        });
      }
    );
  });
});

// Выдать привилегию пользователю
router.post('/grant-privilege', (req, res) => {
  const { user_id, privilege } = req.body;

  if (!user_id || !privilege) {
    return res.status(400).json({ error: 'Необходимы user_id и privilege' });
  }

  const validPrivileges = ['can_whitelist', 'can_ban', 'can_manage_server', 'can_edit_ranks'];

  if (!validPrivileges.includes(privilege)) {
    return res.status(400).json({ error: 'Неизвестная привилегия' });
  }

  db.run(
    'INSERT INTO privileges (user_id, privilege, granted_by) VALUES (?, ?, ?)',
    [user_id, privilege, req.user.id],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Пользователь уже имеет эту привилегию' });
        }
        return res.status(500).json({ error: 'Ошибка при выдаче привилегии' });
      }

      // Логирование
      db.run(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details) VALUES (?, ?, ?, ?)',
        [req.user.id, 'grant_privilege', user_id, privilege]
      );

      res.json({ message: 'Привилегия выдана' });
    }
  );
});

// Отозвать привилегию
router.delete('/revoke-privilege', (req, res) => {
  const { user_id, privilege } = req.body;

  if (!user_id || !privilege) {
    return res.status(400).json({ error: 'Необходимы user_id и privilege' });
  }

  db.run(
    'DELETE FROM privileges WHERE user_id = ? AND privilege = ?',
    [user_id, privilege],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при отзыве привилегии' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Привилегия не найдена' });
      }

      // Логирование
      db.run(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details) VALUES (?, ?, ?, ?)',
        [req.user.id, 'revoke_privilege', user_id, privilege]
      );

      res.json({ message: 'Привилегия отозвана' });
    }
  );
});

// Изменить роль пользователя
router.put('/users/:id/role', (req, res) => {
  const { role } = req.body;

  if (!role || !['user', 'moderator', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Неверная роль' });
  }

  if (role === 'admin' && req.user.id !== 1) {
    return res.status(403).json({ error: 'Только главный администратор может делать администраторов' });
  }

  db.run(
    'UPDATE users SET role = ? WHERE id = ?',
    [role, req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при изменении роли' });
      }

      // Логирование
      db.run(
        'INSERT INTO admin_logs (admin_id, action, target_user_id, details) VALUES (?, ?, ?, ?)',
        [req.user.id, 'change_role', req.params.id, role]
      );

      res.json({ message: 'Роль изменена' });
    }
  );
});

// Удалить пользователя
router.delete('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id, 10);

  if (Number.isNaN(userId)) {
    return res.status(400).json({ error: 'Неверный ID пользователя' });
  }

  if (userId === req.user.id) {
    return res.status(403).json({ error: 'Нельзя удалить свой аккаунт' });
  }

  db.get('SELECT id, username, role FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (user.id === 1 && user.role === 'admin') {
      return res.status(403).json({ error: 'Нельзя удалить главного администратора' });
    }

    if (user.role === 'admin' && req.user.id !== 1) {
      return res.status(403).json({ error: 'Только главный администратор может удалять администраторов' });
    }

    db.serialize(() => {
      db.run('DELETE FROM privileges WHERE user_id = ?', [userId]);
      db.run('DELETE FROM posts WHERE author_id = ?', [userId]);
      db.run('DELETE FROM admin_logs WHERE admin_id = ? OR target_user_id = ?', [userId, userId]);

      db.run('DELETE FROM users WHERE id = ?', [userId], function (deleteErr) {
        if (deleteErr) {
          return res.status(500).json({ error: 'Ошибка при удалении пользователя' });
        }

        db.run(
          'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
          [req.user.id, 'delete_user', JSON.stringify({ deleted_user_id: userId, username: user.username })]
        );

        res.json({ message: 'Пользователь удалён' });
      });
    });
  });
});

// Получить логи админ действий
router.get('/logs', (req, res) => {
  db.all(
    `SELECT al.*, u.username as admin_username, u2.username as target_username
     FROM admin_logs al
     LEFT JOIN users u ON al.admin_id = u.id
     LEFT JOIN users u2 ON al.target_user_id = u2.id
     ORDER BY al.created_at DESC LIMIT 100`,
    (err, logs) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при получении логов' });
      }
      res.json(logs);
    }
  );
});

// Получить информацию о сервере
router.get('/server-info', (req, res) => {
  db.get('SELECT * FROM server_info ORDER BY id DESC LIMIT 1', (err, info) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка при получении информации' });
    }
    res.json(info || {});
  });
});

// Обновить информацию о сервере
router.put('/server-info', (req, res) => {
  const {
    server_name,
    server_ip,
    server_port,
    server_version,
    max_players,
    description,
    hero_image_url,
    hero_title,
    hero_subtitle,
    hero_text_color,
    hero_bg_color,
    hero_overlay_color
  } = req.body;

  db.all('PRAGMA table_info(server_info)', (schemaErr, columns) => {
    if (schemaErr) {
      return res.status(500).json({ error: 'Ошибка при проверке структуры таблицы' });
    }

    const existing = columns.map(col => col.name);
    const requiredColumns = [
      'hero_image_url',
      'hero_title',
      'hero_subtitle',
      'hero_text_color',
      'hero_bg_color',
      'hero_overlay_color'
    ];
    const missing = requiredColumns.filter(col => !existing.includes(col));

    db.serialize(() => {
      missing.forEach(col => {
        db.run(`ALTER TABLE server_info ADD COLUMN ${col} TEXT`);
      });

      db.run(
        `INSERT INTO server_info (server_name, server_ip, server_port, server_version, max_players, description, hero_image_url, hero_title, hero_subtitle, hero_text_color, hero_bg_color, hero_overlay_color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          server_name,
          server_ip,
          server_port,
          server_version,
          max_players,
          description,
          hero_image_url || null,
          hero_title || null,
          hero_subtitle || null,
          hero_text_color || null,
          hero_bg_color || null,
          hero_overlay_color || null
        ],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Ошибка при обновлении информации' });
          }

          // Логирование
          db.run(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
            [req.user.id, 'update_server_info', JSON.stringify(req.body)]
          );

          res.json({ message: 'Информация сервера обновлена' });
        }
      );
    });
  });
});

module.exports = router;
