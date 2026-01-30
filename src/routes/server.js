const express = require('express');
const https = require('https');
const db = require('../database');

const router = express.Router();

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', (error) => reject(error));
  });
}

// Публичная проверка онлайна сервера
router.get('/status', (req, res) => {
  db.get('SELECT server_ip, server_port FROM server_info ORDER BY id DESC LIMIT 1', async (err, info) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка при получении настроек сервера' });
    }

    if (!info || !info.server_ip) {
      return res.json({ online: false, error: 'IP адрес не задан' });
    }

    const serverIp = info.server_ip;
    const serverPort = info.server_port;
    const address = serverPort ? `${serverIp}:${serverPort}` : serverIp;

    try {
      const url = `https://api.mcsrvstat.us/2/${encodeURIComponent(address)}`;
      const status = await fetchJson(url);

      const players = status.players
        ? { online: status.players.online || 0, max: status.players.max || 0 }
        : null;

      res.json({
        online: status.online === true,
        players,
        version: status.version || null,
        motd: status.motd && (status.motd.clean || status.motd.raw) ? status.motd.clean || status.motd.raw : null,
        ip: serverIp,
        port: serverPort || 25565
      });
    } catch (error) {
      res.status(502).json({ online: false, error: 'Не удалось проверить статус сервера' });
    }
  });
});


module.exports = router;
