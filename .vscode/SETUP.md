# VS Code Setup

## Рекомендуемые расширения

Установите эти расширения для лучшей разработки:

1. **REST Client** (humao.rest-client)
   - Для тестирования API запросов прямо в VS Code

2. **SQLite** (alexcvzz.vscode-sqlite)
   - Для просмотра и редактирования базы данных

3. **Thunder Client** (rangav.vscode-thunder-client)
   - Альтернатива REST Client для API тестирования

4. **Prettier** (esbenp.prettier-vscode)
   - Автоматическое форматирование кода

5. **ESLint** (dbaeumer.vscode-eslint)
   - Проверка качества кода

## Быстрый запуск в VS Code

1. Откройте папку проекта в VS Code
2. Нажмите `F5` или перейдите в `Run > Start Debugging`
3. Выберите "Launch Server"
4. Сервер запустится в режиме отладки

## Полезные комбинации клавиш

- `Ctrl + ~` - Открыть/закрыть встроенный терминал
- `Ctrl + Shift + D` - Открыть Debug view
- `F5` - Начать отладку
- `Ctrl + F5` - Запустить без отладки

## Отладка

В файле `.vscode/launch.json` уже настроена конфигурация для отладки Node.js приложения.

Вы можете устанавливать точки останова (breakpoints), нажимая на числа строк в левом краю редактора.

## Настройки проекта

Все настройки находятся в файле `.env`:

```
PORT=3000                                          # Порт сервера
JWT_SECRET=your_super_secret_minecraft_key_2026  # Секретный ключ для JWT
NODE_ENV=development                              # Окружение (development/production)
```

Измените эти значения при необходимости.
