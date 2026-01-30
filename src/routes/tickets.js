const express = require('express');
const db = require('../database');
const { authMiddleware, adminOrModeratorMiddleware } = require('../middleware/auth');

const router = express.Router();

// Создать тикет
router.post('/', authMiddleware, (req, res) => {
  const { minecraft_username, account_name, title, description, image_url } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Название и описание обязательны' });
  }

  db.run(
    `INSERT INTO tickets (user_id, minecraft_username, account_name, title, description, image_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.user.id, minecraft_username || null, account_name || null, title, description, image_url || null],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при создании тикета' });
      }

      res.status(201).json({
        message: 'Тикет успешно создан',
        id: this.lastID
      });
    }
  );
});

// Получить все тикеты пользователя
router.get('/', authMiddleware, (req, res) => {
  db.all(
    `SELECT id, minecraft_username, account_name, title, description, image_url, status, created_at
     FROM tickets
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [req.user.id],
    (err, tickets) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при получении тикетов' });
      }
      res.json(tickets || []);
    }
  );
});

// Получить тикет по ID
router.get('/:id', authMiddleware, (req, res) => {
  // Админы и модераторы могут видеть все тикеты, пользователи - только свои
  const isStaff = req.user.role === 'admin' || req.user.role === 'moderator';
  
  let query, params;
  if (isStaff) {
    query = `SELECT id, user_id, minecraft_username, account_name, title, description, image_url, status, created_at
             FROM tickets
             WHERE id = ?`;
    params = [req.params.id];
  } else {
    query = `SELECT id, minecraft_username, account_name, title, description, image_url, status, created_at
             FROM tickets
             WHERE id = ? AND user_id = ?`;
    params = [req.params.id, req.user.id];
  }

  db.get(query, params, (err, ticket) => {
    if (err || !ticket) {
      return res.status(404).json({ error: 'Тикет не найден' });
    }
    res.json(ticket);
  });
});

// Получить все тикеты (для админов и модераторов)
router.get('/admin/all', authMiddleware, adminOrModeratorMiddleware, (req, res) => {
  db.all(
    `SELECT t.id, t.user_id, t.minecraft_username, t.account_name, t.title, t.description, 
            t.image_url, t.status, t.created_at, u.username
     FROM tickets t
     JOIN users u ON t.user_id = u.id
     ORDER BY t.created_at DESC`,
    (err, tickets) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при получении тикетов' });
      }
      res.json(tickets || []);
    }
  );
});

// Обновить статус тикета (для админов и модераторов)
router.put('/:id/status', authMiddleware, adminOrModeratorMiddleware, (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Статус обязателен' });
  }

  db.run(
    `UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [status, req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при обновлении тикета' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Тикет не найден' });
      }

      res.json({ message: 'Статус тикета обновлен' });
    }
  );
});

// Удалить тикет (только автор или администратор)
router.delete('/:id', authMiddleware, (req, res) => {
  db.get(
    'SELECT user_id FROM tickets WHERE id = ?',
    [req.params.id],
    (err, ticket) => {
      if (err || !ticket) {
        return res.status(404).json({ error: 'Тикет не найден' });
      }

      const isAuthorOrAdmin = ticket.user_id === req.user.id || req.user.role === 'admin';
      if (!isAuthorOrAdmin) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }

      db.run(
        'DELETE FROM tickets WHERE id = ?',
        [req.params.id],
        function (deleteErr) {
          if (deleteErr) {
            return res.status(500).json({ error: 'Ошибка при удалении тикета' });
          }

          res.json({ message: 'Тикет удален' });
        }
      );
    }
  );
});

module.exports = router;

// Добавить сообщение к тикету (администратор, модератор или создатель)
router.post('/:id/messages', authMiddleware, (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым' });
  }

  db.get(
    'SELECT user_id FROM tickets WHERE id = ?',
    [req.params.id],
    (err, ticket) => {
      if (err || !ticket) {
        return res.status(404).json({ error: 'Тикет не найден' });
      }

      const canReply = ticket.user_id === req.user.id || req.user.role === 'admin' || req.user.role === 'moderator';
      if (!canReply) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }

      db.run(
        `INSERT INTO ticket_messages (ticket_id, user_id, message) VALUES (?, ?, ?)`,
        [req.params.id, req.user.id, message.trim()],
        function (insertErr) {
          if (insertErr) {
            return res.status(500).json({ error: 'Ошибка при отправке сообщения' });
          }

          db.run('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
          res.status(201).json({ message: 'Сообщение отправлено', id: this.lastID });
        }
      );
    }
  );
});

// Получить сообщения тикета
router.get('/:id/messages', authMiddleware, (req, res) => {
  db.get(
    'SELECT user_id FROM tickets WHERE id = ?',
    [req.params.id],
    (err, ticket) => {
      if (err || !ticket) {
        return res.status(404).json({ error: 'Тикет не найден' });
      }

      const canView = ticket.user_id === req.user.id || req.user.role === 'admin' || req.user.role === 'moderator';
      if (!canView) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }

      db.all(
        `SELECT m.id, m.message, m.created_at, u.username, u.id as user_id, u.role
         FROM ticket_messages m
         JOIN users u ON m.user_id = u.id
         WHERE m.ticket_id = ?
         ORDER BY m.created_at ASC`,
        [req.params.id],
        (messErr, messages) => {
          if (messErr) {
            return res.status(500).json({ error: 'Ошибка при загрузке сообщений' });
          }
          res.json(messages || []);
        }
      );
    }
  );
});
