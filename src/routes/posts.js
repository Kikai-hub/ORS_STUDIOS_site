const express = require('express');
const db = require('../database');
const { authMiddleware, adminMiddleware, adminOrModeratorMiddleware } = require('../middleware/auth');

const router = express.Router();

// Получить все опубликованные посты (публичный endpoint)
router.get('/', (req, res) => {
  db.all(
    `SELECT p.id, p.title, p.content, p.image_url, p.views, p.created_at,
            u.username, u.id as author_id,
            COUNT(c.id) as comments_count
     FROM posts p
     JOIN users u ON p.author_id = u.id
     LEFT JOIN post_comments c ON c.post_id = p.id
     WHERE p.published = 1
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    (err, posts) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при получении постов' });
      }
      res.json(posts || []);
    }
  );
});

// Получить пост по ID (публичный endpoint)
router.get('/:id', (req, res) => {
  db.get(
    `SELECT p.id, p.title, p.content, p.image_url, p.views, p.created_at, p.updated_at,
            u.username, u.id as author_id
     FROM posts p
     JOIN users u ON p.author_id = u.id
     WHERE p.id = ? AND p.published = 1`,
    [req.params.id],
    (err, post) => {
      if (err || !post) {
        return res.status(404).json({ error: 'Пост не найден' });
      }
      res.json(post);
    }
  );
});

// Получить подробный пост с комментариями (только для авторизованных)
router.get('/:id/details', authMiddleware, (req, res) => {
  db.get(
    `SELECT p.id, p.title, p.content, p.image_url, p.views, p.created_at, p.updated_at,
            u.username, u.id as author_id
     FROM posts p
     JOIN users u ON p.author_id = u.id
     WHERE p.id = ? AND p.published = 1`,
    [req.params.id],
    (err, post) => {
      if (err || !post) {
        return res.status(404).json({ error: 'Пост не найден' });
      }

      db.get(
        'SELECT id FROM post_views WHERE post_id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        (viewErr, view) => {
          const shouldIncrement = !viewErr && !view;

          if (shouldIncrement) {
            db.run(
              'INSERT INTO post_views (post_id, user_id) VALUES (?, ?)',
              [req.params.id, req.user.id],
              () => {
                db.run('UPDATE posts SET views = views + 1 WHERE id = ?', [req.params.id]);
              }
            );
            post.views = (post.views || 0) + 1;
          }

          db.all(
            `SELECT c.id, c.content, c.created_at, u.username, u.role
             FROM post_comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.post_id = ?
             ORDER BY c.created_at DESC`,
            [req.params.id],
            (commentsErr, comments) => {
              if (commentsErr) {
                return res.status(500).json({ error: 'Ошибка при получении комментариев' });
              }

              res.json({ post, comments: comments || [] });
            }
          );
        }
      );
    }
  );
});

// Добавить комментарий к посту (только для авторизованных)
router.post('/:id/comments', authMiddleware, (req, res) => {
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Комментарий не может быть пустым' });
  }

  db.get('SELECT id FROM posts WHERE id = ? AND published = 1', [req.params.id], (err, post) => {
    if (err || !post) {
      return res.status(404).json({ error: 'Пост не найден' });
    }

    db.run(
      'INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [req.params.id, req.user.id, content.trim()],
      function (insertErr) {
        if (insertErr) {
          return res.status(500).json({ error: 'Ошибка при добавлении комментария' });
        }

        res.status(201).json({ message: 'Комментарий добавлен', id: this.lastID });
      }
    );
  });
});

// Удалить комментарий (администратор или модератор)
router.delete('/:postId/comments/:commentId', authMiddleware, adminOrModeratorMiddleware, (req, res) => {
  const { postId, commentId } = req.params;

  db.get(
    'SELECT id FROM post_comments WHERE id = ? AND post_id = ?',
    [commentId, postId],
    (err, comment) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при поиске комментария' });
      }

      if (!comment) {
        return res.status(404).json({ error: 'Комментарий не найден' });
      }

      db.run(
        'DELETE FROM post_comments WHERE id = ? AND post_id = ?',
        [commentId, postId],
        function (deleteErr) {
          if (deleteErr) {
            return res.status(500).json({ error: 'Ошибка при удалении комментария' });
          }

          res.json({ message: 'Комментарий удален' });
        }
      );
    }
  );
});

// Создать новый пост (только для администраторов)
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  const { title, content, image_url } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Название и содержание обязательны' });
  }

  db.run(
    `INSERT INTO posts (author_id, title, content, image_url, published)
     VALUES (?, ?, ?, ?, 1)`,
    [req.user.id, title, content, image_url || null],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при создании поста' });
      }

      // Логирование
      db.run(
        'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
        [req.user.id, 'create_post', title]
      );

      res.status(201).json({
        message: 'Пост успешно создан',
        id: this.lastID
      });
    }
  );
});

// Обновить пост (только для администраторов)
router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { title, content, image_url, published } = req.body;

  db.run(
    `UPDATE posts SET title = ?, content = ?, image_url = ?, published = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [title, content, image_url || null, published !== undefined ? published : 1, req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при обновлении поста' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Пост не найден' });
      }

      // Логирование
      db.run(
        'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
        [req.user.id, 'update_post', `Пост #${req.params.id}`]
      );

      res.json({ message: 'Пост обновлен' });
    }
  );
});

// Удалить пост (только для администраторов)
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.run(
    'DELETE FROM posts WHERE id = ?',
    [req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при удалении поста' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Пост не найден' });
      }

      // Логирование
      db.run(
        'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
        [req.user.id, 'delete_post', `Пост #${req.params.id}`]
      );

      res.json({ message: 'Пост удален' });
    }
  );
});

// Получить все посты для администратора (включая неопубликованные)
router.get('/admin/all', authMiddleware, adminMiddleware, (req, res) => {
  db.all(
    `SELECT p.id, p.title, p.content, p.image_url, p.views, p.published, p.created_at, p.updated_at,
            u.username, u.id as author_id,
            COUNT(c.id) as comments_count
     FROM posts p
     JOIN users u ON p.author_id = u.id
     LEFT JOIN post_comments c ON c.post_id = p.id
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    (err, posts) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при получении постов' });
      }
      res.json(posts || []);
    }
  );
});

module.exports = router;
