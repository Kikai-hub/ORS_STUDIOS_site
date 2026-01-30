const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, './data/minecraft.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Ошибка подключения:', err);
        process.exit(1);
    }

    // Выдаем админку пользователю Kikai_zip
    db.run(
        'UPDATE users SET role = ? WHERE username = ?',
        ['admin', 'Kikai_zip'],
        function (err) {
            if (err) {
                console.error('❌ Ошибка при обновлении:', err.message);
                db.close();
                process.exit(1);
            }

            if (this.changes === 0) {
                console.error('❌ Пользователь Kikai_zip не найден в базе данных');
                db.close();
                process.exit(1);
            }

            console.log('✅ Успешно! Пользователю Kikai_zip выдана роль администратора');
            console.log('   Пользователь может теперь входить в админ-панель');
            
            // Показываем информацию о пользователе
            db.get('SELECT id, username, email, role FROM users WHERE username = ?', ['Kikai_zip'], (err, row) => {
                if (row) {
                    console.log('\n📋 Информация:');
                    console.log(`   ID: ${row.id}`);
                    console.log(`   Логин: ${row.username}`);
                    console.log(`   Email: ${row.email}`);
                    console.log(`   Роль: ${row.role}`);
                }
                db.close();
            });
        }
    );
});
