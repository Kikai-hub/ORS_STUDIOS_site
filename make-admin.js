const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, './data/minecraft.db');

const db = new sqlite3.Database(DB_PATH, async (err) => {
    if (err) {
        console.error('Ошибка подключения:', err);
        process.exit(1);
    }

    const username = process.argv[2] || 'admin';
    const password = process.argv[3] || 'admin123';
    const email = process.argv[4] || 'admin@minecraft.local';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Проверяем существует ли пользователь
        db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
            if (row) {
                // Обновляем существующего пользователя
                db.run(
                    'UPDATE users SET role = ?, password = ? WHERE username = ?',
                    ['admin', hashedPassword, username],
                    function (err) {
                        if (err) {
                            console.error('❌ Ошибка:', err.message);
                        } else {
                            console.log(`✅ Пользователь "${username}" получил роль администратора`);
                            console.log(`   Пароль: ${password}`);
                        }
                        db.close();
                    }
                );
            } else {
                // Создаем нового администратора
                db.run(
                    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                    [username, email, hashedPassword, 'admin'],
                    function (err) {
                        if (err) {
                            console.error('❌ Ошибка:', err.message);
                        } else {
                            console.log(`✅ Создан новый администратор`);
                            console.log(`   Логин: ${username}`);
                            console.log(`   Пароль: ${password}`);
                            console.log(`   Email: ${email}`);
                        }
                        db.close();
                    }
                );
            }
        });
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        db.close();
        process.exit(1);
    }
});
