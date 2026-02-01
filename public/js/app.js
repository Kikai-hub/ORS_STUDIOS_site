const API_URL = 'http://localhost:3000/api';

let currentUser = null;
let token = null;
let currentPostId = null;
let editingPostId = null;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    console.log('Инициализация приложения...');
    
    try {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (savedToken && savedUser) {
            token = savedToken;
            currentUser = JSON.parse(savedUser);
            console.log('Пользователь загружен:', currentUser.username);
            updateAuthUI();
        }
    } catch (error) {
        console.error('Ошибка при загрузке сохранённых данных:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
    
    // Показываем заглушку вместо загрузки постов
    const postsList = document.getElementById('postsList');
    if (postsList) {
        postsList.innerHTML = '<p style="text-align: center; padding: 2rem; color: #999;">📋 Новости загружаются...</p>';
        // Загружаем посты асинхронно без блокировки
        loadPostsAsync();
    }
    
    // Загружаем информацию о сервере для главной страницы
    loadServerInfo();
    
    // Инициализация анимации звезд
    initStarButton();

    // Инициализация анимации скролла
    initScrollAnimation();

    // Загрузка привилегий для страницы доната
    renderPrivilegesList();
    
    console.log('Инициализация завершена');
});

// --- Donate Section Logic --- //

const PRIVILEGES_DATA = [
    { id: 'general', name: 'General', price: 4999, colorClass: 'grad-general', desc: 'Самая высокая привилегия на сервере. Вы получаете полный контроль и уважение.' },
    { id: 'koman', name: 'Koman', price: 3999, colorClass: 'grad-koman', desc: 'Командующий состав. Доступ к управлению игровыми событиями.' },
    { id: 'spec', name: 'Spec', price: 2999, colorClass: 'grad-spec', desc: 'Специальное подразделение. Уникальные киты и возможности.' },
    { id: 'kapt', name: 'Kapt', price: 2299, colorClass: 'grad-kapt', desc: 'Капитан отряда. Возможность создавать свои кланы бесплатно.' },
    { id: 'snup', name: 'Snup', price: 1999, colorClass: 'grad-snup', desc: 'Снайпер. Доступ к дальнобойному оружию и маскировке.' },
    { id: 'sapr', name: 'Sapr', price: 1299, colorClass: 'grad-sapr', desc: 'Сапер. Доступ к взрывчатке и разминированию.' },
    { id: 'med', name: 'Med', price: 899, colorClass: 'grad-med', desc: 'Медик. Возможность лечить себя и других игроков.' },
    { id: 'razv', name: 'Razv', price: 449, colorClass: 'grad-razv', desc: 'Разведчик. Увеличенная скорость и невидимость на радарах.' },
    { id: 'serj', name: 'Serj', price: 249, colorClass: 'grad-serj', desc: 'Сержант. Начальный набор командных привилегий.' },
    { id: 'solder', name: 'Solder', price: 99, colorClass: 'grad-solder', desc: 'Солдат. Базовый донат для поддержки сервера.' }
];

let selectedPrivilege = null;

function renderPrivilegesList() {
    const listContainer = document.getElementById('privilegesListContainer');
    if (!listContainer) return;

    listContainer.innerHTML = PRIVILEGES_DATA.map(priv => `
        <div class="privilege-item" onclick="selectPrivilege('${priv.id}')" id="priv-item-${priv.id}">
            <span class="privilege-name ${priv.colorClass} grad-text">${priv.name}</span>
            <span class="privilege-price">${priv.price} ₽</span>
        </div>
    `).join('');
}

function selectPrivilege(id) {
    selectedPrivilege = PRIVILEGES_DATA.find(p => p.id === id);
    if (!selectedPrivilege) return;

    // Update UI active state
    document.querySelectorAll('.privilege-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`priv-item-${id}`).classList.add('active');

    // Show Details Panel
    document.querySelector('.privilege-placeholder').style.display = 'none';
    const contentPanel = document.getElementById('privilegeContent');
    contentPanel.style.display = 'flex';

    // Update Content
    const titleEl = document.getElementById('selectedPrivilegeTitle');
    titleEl.textContent = selectedPrivilege.name;
    titleEl.className = ''; // Reset classes
    titleEl.classList.add(selectedPrivilege.colorClass); // Add gradient class
    titleEl.classList.add('grad-text'); // Add animation class

    document.getElementById('selectedPrivilegeDesc').innerHTML = `
        <p>${selectedPrivilege.desc}</p>
        <ul>
            <li>Уникальный префикс в чате</li>
            <li>Доступ к команде /fly в лобби</li>
            <li>Сохранение инвентаря (частичное)</li>
            <li>Приоритетный вход на сервер</li>
        </ul>
    `;
    
    document.getElementById('selectedPrivilegePrice').textContent = `${selectedPrivilege.price} ₽`;
}

function showDonate() {
    showSection('donate');
}

function buyPrivilege() {
    const modal = document.getElementById('buyModal');
    const content = document.getElementById('buyModalContent');
    const modalContent = modal.querySelector('.modal-content');

    // Reset styles for modal content (remove any border)
    modalContent.style.border = '1px solid var(--border-color)';
    // Add glowing border effect matching the privilege color if selected
    if (selectedPrivilege) {
        // We can dynamically add a style or class, but let's stick to simple border for now
        // or maybe use the primary color. Let's keep it standard.
    }

    modal.style.display = 'flex';

    if (!token || !currentUser) {
        content.innerHTML = `
            <div class="buy-modal-auth-check">
                <i class="fas fa-lock" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
                <h3>Требуется авторизация</h3>
                <p style="color: var(--text-muted); margin-bottom: 2rem;">Для покупки привилегии необходимо войти в аккаунт.</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button onclick="switchModal('buyModal', 'loginModal')" class="btn btn-primary">Войти</button>
                    <button onclick="switchModal('buyModal', 'registerModal')" class="btn btn-outline">Регистрация</button>
                </div>
            </div>
        `;
    } else {
        content.innerHTML = `
            <div class="buy-modal-user">
                <h3 style="text-align: center; margin-bottom: 2rem;">Покупка <span class="${selectedPrivilege.colorClass} grad-text">${selectedPrivilege.name}</span></h3>
                
                <div class="promo-row">
                    <div class="form-group">
                        <label>Промокод:</label>
                        <input type="text" placeholder="CODE2026">
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-muted);">К оплате:</span>
                    <span style="font-size: 1.5rem; font-weight: 700;">${selectedPrivilege.price} ₽</span>
                </div>

                <button onclick="processPayment()" class="btn btn-primary btn-large btn-block">
                    <i class="fas fa-shopping-cart" style="margin-right: 0.5rem;"></i> Оплатить
                </button>
            </div>
        `;
    }
}

function processPayment() {
    alert('Система оплаты в разработке!');
    closeModal('buyModal');
}

function initScrollAnimation() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 }); // Trigger when 10% visible

    document.querySelectorAll('.info-cards .card').forEach((card, index) => {
        // Устанавливаем задержку через стиль, или используем CSS классы nth-child как сделано
        observer.observe(card);
    });
}

function initStarButton() {
    const btn = document.querySelector('.star-btn');
    if (!btn) return;

    let intervalId = null;

    btn.addEventListener('mouseenter', () => {
        // Запускаем генерацию звезд
        intervalId = setInterval(() => {
            // Генерируем больше звезд за раз
            createStar(btn);
            createStar(btn);
        }, 1000 / 30); // 30 раз в секунду (было 15)
    });

    btn.addEventListener('mouseleave', () => {
        if (intervalId) clearInterval(intervalId);
    });
}

function createStar(btn) {
    const star = document.createElement('div');
    star.classList.add('star-particle');
    
    // Размеры кнопки
    const rect = btn.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Случайная точка на периметре (примерно)
    // 0: top, 1: right, 2: bottom, 3: left
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    const offset = 5; // Смещение внутрь или наружу

    switch(side) {
        case 0: // Top
            x = Math.random() * width;
            y = -offset;
            break;
        case 1: // Right
            x = width + offset;
            y = Math.random() * height;
            break;
        case 2: // Bottom
            x = Math.random() * width;
            y = height + offset;
            break;
        case 3: // Left
            x = -offset;
            y = Math.random() * height;
            break;
    }

    star.style.left = `${x}px`;
    star.style.top = `${y}px`;
    
    // Размер звезды
    const size = Math.random() * 3 + 2; // 2-5px
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;

    btn.appendChild(star);

    // Анимация полета
    // Вектор движения от центра кнопки к точке появления
    const centerX = width / 2;
    const centerY = height / 2;
    
    let dirX = x - centerX;
    let dirY = y - centerY;
    
    // Нормализация и скорость
    const length = Math.sqrt(dirX*dirX + dirY*dirY);
    const speed = Math.random() * 20 + 30; // Скорость вылета
    
    dirX = (dirX / length) * speed;
    dirY = (dirY / length) * speed;

    // Гравитация (если не снизу)
    const gravity = side !== 2 ? 15 : 5; 
    
    // Messy route (случайное отклонение)
    const angle = (Math.random() - 0.5) * 0.5; // rad
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const finalDirX = dirX * cos - dirY * sin;
    const finalDirY = dirX * sin + dirY * cos;

    // Web Animations API для производительности
    const animation = star.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${finalDirX}px, ${finalDirY + gravity}px) scale(0)`, opacity: 0 }
    ], {
        duration: 750,
        easing: 'ease-out'
    });

    animation.onfinish = () => {
        star.remove();
    };
}


// Асинхронная загрузка постов без блокировки
function loadPostsAsync() {
    setTimeout(() => {
        loadPosts().catch(err => {
            console.error('Ошибка loadPosts:', err);
            const postsList = document.getElementById('postsList');
            if (postsList) {
                postsList.innerHTML = '<p style="text-align: center; padding: 2rem; color: #999;">📋 Не удалось загрузить новости</p>';
            }
        });
    }, 500);
}

// Обновление UI в зависимости от статуса авторизации
function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const adminPanelBtn = document.getElementById('adminPanelBtn');

    if (token && currentUser) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        if (currentUser.role === 'admin') {
            adminPanelBtn.style.display = 'block';
        } else {
            adminPanelBtn.style.display = 'none';
        }
    } else {
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
        adminPanelBtn.style.display = 'none';
    }
}

// Навигация
function showHome() {
    showSection('home');
    // Не перезагружаем посты если они уже загружены
}

function handleStartGame() {
    if (token && currentUser) {
        showProfile();
    } else {
        showLogin();
    }
}

function showAbout() {
    console.log('Открываем раздел "О сервере"');
    showSection('about');
    // Загружаем информацию о сервере с задержкой
    setTimeout(() => {
        loadServerInfo();
    }, 100);
}

function showProfile() {
    if (!token) {
        showLogin();
        return;
    }
    showSection('profile');
    loadProfile();
}

function showAdmin() {
    if (!token || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        showNotification('Доступ запрещен', 'error');
        return;
    }
    showSection('admin');
    loadAdminDashboard();
}

function showLogin() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
        console.log('Модальное окно входа открыто');
    } else {
        console.error('Элемент loginModal не найден');
    }
}

function showRegister() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.style.display = 'flex';
        console.log('Модальное окно регистрации открыто');
    } else {
        console.error('Элемент registerModal не найден');
    }
}

function showSection(sectionId) {
    console.log('Переключение на секцию:', sectionId);
    try {
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
        });
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            window.scrollTo(0, 0);
            console.log('Секция отображена:', sectionId);
        } else {
            console.error('Секция не найдена:', sectionId);
        }
    } catch (error) {
        console.error('Ошибка при переключении секции:', error);
    }
}

// Модальные окна
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function switchModal(fromModal, toModal) {
    closeModal(fromModal);
    document.getElementById(toModal).style.display = 'flex';
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// Аутентификация
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        token = data.token;
        currentUser = data.user;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(currentUser));

        closeModal('loginModal');
        updateAuthUI();
        showNotification('Вы успешно вошли', 'success');
        showHome();
    } catch (error) {
        showNotification(error.message || 'Ошибка при входе', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const minecraft_username = document.getElementById('registerMinecraft').value;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password,
                minecraft_username: minecraft_username || null
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        token = data.token;
        currentUser = data.user;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(currentUser));

        closeModal('registerModal');
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerMinecraft').value = '';

        updateAuthUI();
        showNotification('Вы успешно зарегистрировались', 'success');
        showHome();
    } catch (error) {
        showNotification(error.message || 'Ошибка при регистрации', 'error');
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI();
    showNotification('Вы вышли из аккаунта', 'success');
    showHome();
}

// Профиль
async function loadProfile() {
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        document.getElementById('profileUsername').value = data.user.username;
        document.getElementById('profileEmail').value = data.user.email;

        const minecraftUsername = data.user.minecraft_username || '';
        document.getElementById('profileMinecraftUsername').value = minecraftUsername;

        const favoriteServerInput = document.getElementById('profileFavoriteServerInput');
        if (favoriteServerInput) {
            favoriteServerInput.value = data.user.favorite_server || '';
        }

        const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar) {
            profileAvatar.src = minecraftUsername
                ? `https://mc-heads.net/avatar/${encodeURIComponent(minecraftUsername)}/128`
                : 'https://mc-heads.net/avatar/Steve/128';
        }

        const profileDisplayName = document.getElementById('profileDisplayName');
        if (profileDisplayName) {
            profileDisplayName.textContent = minecraftUsername || data.user.username || 'Игрок';
        }

        const profileFavoriteServer = document.getElementById('profileFavoriteServer');
        if (profileFavoriteServer) {
            profileFavoriteServer.textContent = data.user.favorite_server || 'Не указан';
        }

        const profileRole = document.getElementById('profileRole');
        const profileRoleGroup = document.getElementById('profileRoleGroup');
        if (profileRole) {
            profileRole.value = data.user.role;
        }

        if (profileRoleGroup) {
            if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator')) {
                profileRoleGroup.style.display = 'block';
            } else {
                profileRoleGroup.style.display = 'none';
            }
        }

        const privilegesList = document.getElementById('privilegesList');
        if (data.privileges && data.privileges.length > 0) {
            privilegesList.innerHTML = data.privileges.map(p => `
                <div class="privilege-item">
                    <strong>${p}</strong>
                </div>
            `).join('');
        } else {
            privilegesList.innerHTML = '<p>У вас нет привилегий</p>';
        }

        // Загрузить тикеты пользователя
        loadUserTickets();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function toggleProfileInfo() {
    const content = document.getElementById('profileInfoContent');
    const toggle = document.getElementById('profileInfoToggle');

    if (!content || !toggle) return;

    const isHidden = content.style.display === 'none' || content.style.display === '';
    content.style.display = isHidden ? 'block' : 'none';
    toggle.textContent = isHidden ? 'Скрыть профиль' : 'Показать профиль';
}

async function updateProfile() {
    if (!token) return;

    const email = document.getElementById('profileEmail').value;
    const minecraft_username = document.getElementById('profileMinecraftUsername').value;
    const favorite_server = document.getElementById('profileFavoriteServerInput')
        ? document.getElementById('profileFavoriteServerInput').value
        : '';

    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email, minecraft_username, favorite_server })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        currentUser.email = email;
        currentUser.minecraft_username = minecraft_username;
        currentUser.favorite_server = favorite_server;
        localStorage.setItem('user', JSON.stringify(currentUser));

        const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar) {
            profileAvatar.src = minecraft_username
                ? `https://mc-heads.net/avatar/${encodeURIComponent(minecraft_username)}/128`
                : 'https://mc-heads.net/avatar/Steve/128';
        }

        const profileDisplayName = document.getElementById('profileDisplayName');
        if (profileDisplayName) {
            profileDisplayName.textContent = minecraft_username || currentUser.username || 'Игрок';
        }

        const profileFavoriteServer = document.getElementById('profileFavoriteServer');
        if (profileFavoriteServer) {
            profileFavoriteServer.textContent = favorite_server || 'Не указан';
        }

        showNotification('Профиль обновлен', 'success');
    } catch (error) {
        showNotification(error.message || 'Ошибка при обновлении профиля', 'error');
    }
}

// Админ-панель
async function loadAdminDashboard() {
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 403) {
            showNotification('Доступ запрещен. Требуются права администратора', 'error');
            showHome();
            return;
        }

        if (!response.ok) {
            throw new Error('Ошибка при загрузке данных');
        }

        const users = await response.json();

        const totalUsers = users.length;
        const totalAdmins = users.filter(u => u.role === 'admin').length;
        const totalModerators = users.filter(u => u.role === 'moderator').length;

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('totalAdmins').textContent = totalAdmins;
        document.getElementById('totalModerators').textContent = totalModerators;

        loadUsers();
        loadServerInfo();
        loadAdminLogs();
    } catch (error) {
        showNotification(error.message || 'Ошибка при загрузке админ-панели', 'error');
    }
}

async function loadUsers() {
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Ошибка при загрузке списка пользователей');
        }

        const users = await response.json();
        const tbody = document.getElementById('usersTableBody');

        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Пользователей не найдено</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.minecraft_username || '-'}</td>
                <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
                <td>
                    <div class="action-buttons">
                        <button onclick="openUserManage(${user.id})" class="btn btn-secondary">Управление</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Ошибка:', error);
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">❌ ${error.message}</td></tr>`;
    }
}

function filterUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#usersTableBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

async function openUserManage(userId) {
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        const userManageContent = document.getElementById('userManageContent');

        userManageContent.innerHTML = `
            <div class="form-group">
                <label>Логин:</label>
                <input type="text" value="${data.user.username}" readonly>
            </div>
            <div class="form-group">
                <label>Email:</label>
                <input type="text" value="${data.user.email}" readonly>
            </div>
            <div class="form-group">
                <label>Роль:</label>
                <select id="userRole">
                    <option value="user" ${data.user.role === 'user' ? 'selected' : ''}>Пользователь</option>
                    <option value="moderator" ${data.user.role === 'moderator' ? 'selected' : ''}>Модератор</option>
                    <option value="admin" ${data.user.role === 'admin' ? 'selected' : ''}>Администратор</option>
                </select>
            </div>
            <div class="form-group">
                <label>Привилегии:</label>
                <div id="userPrivileges">
                    ${data.privileges.map(p => `
                        <div class="privilege-item">
                            <strong>${p}</strong>
                            <button type="button" onclick="revokePrivilege(${userId}, '${p}')" class="btn btn-danger" style="float: right; padding: 0.3rem 0.8rem;">Отозвать</button>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="form-group">
                <label>Добавить привилегию:</label>
                <select id="newPrivilege">
                    <option value="">Выберите привилегию</option>
                    <option value="can_whitelist">Управление вайтлистом</option>
                    <option value="can_ban">Банить игроков</option>
                    <option value="can_manage_server">Управлять сервером</option>
                    <option value="can_edit_ranks">Редактировать ранги</option>
                </select>
            </div>
            <button onclick="changeUserRole(${userId})" class="btn btn-primary">Изменить роль</button>
            <button onclick="grantPrivilege(${userId})" class="btn btn-primary">Добавить привилегию</button>
            ${currentUser && currentUser.id === data.user.id
                ? '<p style="margin-top: 0.75rem; color: #999;">Нельзя удалить свой аккаунт</p>'
                : `<button onclick="deleteUser(${userId})" class="btn btn-danger" style="margin-top: 0.75rem;">Удалить пользователя</button>`
            }
        `;

        document.getElementById('userManageModal').style.display = 'flex';
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function changeUserRole(userId) {
    if (!token || currentUser.role !== 'admin') return;

    const role = document.getElementById('userRole').value;

    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ role })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        showNotification('Роль изменена', 'success');
        loadUsers();
        closeModal('userManageModal');
    } catch (error) {
        showNotification(error.message || 'Ошибка при изменении роли', 'error');
    }
}

async function grantPrivilege(userId) {
    if (!token || currentUser.role !== 'admin') return;

    const privilege = document.getElementById('newPrivilege').value;

    if (!privilege) {
        showNotification('Выберите привилегию', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/grant-privilege`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ user_id: userId, privilege })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        showNotification('Привилегия выдана', 'success');
        openUserManage(userId);
    } catch (error) {
        showNotification(error.message || 'Ошибка при выдаче привилегии', 'error');
    }
}

async function revokePrivilege(userId, privilege) {
    if (!token || currentUser.role !== 'admin') return;

    try {
        const response = await fetch(`${API_URL}/admin/revoke-privilege`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ user_id: userId, privilege })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        showNotification('Привилегия отозвана', 'success');
        openUserManage(userId);
    } catch (error) {
        showNotification(error.message || 'Ошибка при отзыве привилегии', 'error');
    }
}

async function deleteUser(userId) {
    if (!token || currentUser.role !== 'admin') return;

    if (currentUser && currentUser.id === userId) {
        showNotification('Нельзя удалить свой аккаунт', 'error');
        return;
    }

    const confirmed = confirm('Вы уверены, что хотите удалить пользователя? Это действие необратимо.');
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        showNotification('Пользователь удалён', 'success');
        closeModal('userManageModal');
        loadUsers();
    } catch (error) {
        showNotification(error.message || 'Ошибка при удалении пользователя', 'error');
    }
}

async function loadServerInfo() {
    console.log('Загрузка информации о сервере...');
    
    try {
        // Если нет токена, показываем базовую информацию
        if (!token) {
            console.log('Нет токена, показываем базовую информацию');
            displayServerInfo({
                server_name: 'ORIONIS',
                server_ip: 'play.example.com',
                server_port: 25565,
                server_version: '1.20',
                max_players: 20,
                description: 'Добро пожаловать на наш сервер!',
                hero_image_url: 'https://i.postimg.cc/P5HmdGhX/ORIONIS.png',
                hero_title: 'Добро пожаловать на ORIONIS',
                hero_subtitle: 'Присоединяйтесь к нашему сообществу прямо сейчас',
                hero_text_color: '#ffffff',
                hero_bg_color: '#6a0dad',
                hero_overlay_color: 'rgba(106, 13, 173, 0.75)'
            });
            return;
        }

        const response = await fetch(`${API_URL}/admin/server-info`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let data = await response.json();

        if (Object.keys(data).length === 0) {
            data = {
                server_name: 'ORIONIS',
                server_ip: 'Не установлен',
                server_port: 25565,
                server_version: '1.20',
                max_players: 20,
                description: 'Добро пожаловать на наш сервер!',
                hero_image_url: 'https://i.postimg.cc/P5HmdGhX/ORIONIS.png',
                hero_title: 'Добро пожаловать на ORIONIS',
                hero_subtitle: 'Присоединяйтесь к нашему сообществу прямо сейчас',
                hero_text_color: '#ffffff',
                hero_bg_color: '#6a0dad',
                hero_overlay_color: 'rgba(106, 13, 173, 0.75)'
            };
        }

        displayServerInfo(data);
    } catch (error) {
        console.error('Ошибка при загрузке информации о сервере:', error);
        // Показываем базовую информацию при ошибке
        displayServerInfo({
            server_name: 'ORIONIS',
            server_ip: 'Информация недоступна',
            server_port: 25565,
            server_version: '1.20',
            max_players: 20,
            description: 'Сервер временно недоступен',
            hero_image_url: 'https://i.postimg.cc/P5HmdGhX/ORIONIS.png',
            hero_title: 'Добро пожаловать на ORIONIS',
            hero_subtitle: 'Присоединяйтесь к нашему сообществу прямо сейчас',
            hero_text_color: '#ffffff',
            hero_bg_color: '#6a0dad',
            hero_overlay_color: 'rgba(106, 13, 173, 0.75)'
        });
    }
}

function displayServerInfo(data) {
    // Обновляем форму в админ-панели
    const serverName = document.getElementById('serverName');
    const serverIP = document.getElementById('serverIP');
    const serverPort = document.getElementById('serverPort');
    const serverVersion = document.getElementById('serverVersion');
    const maxPlayers = document.getElementById('maxPlayers');
    const serverDescription = document.getElementById('serverDescription');
    const serverHeroImageUrl = document.getElementById('serverHeroImageUrl');
    const serverHeroTitle = document.getElementById('serverHeroTitle');
    const serverHeroSubtitle = document.getElementById('serverHeroSubtitle');
    const serverHeroTextColor = document.getElementById('serverHeroTextColor');
    const serverHeroBgColor = document.getElementById('serverHeroBgColor');
    const serverHeroOverlayColor = document.getElementById('serverHeroOverlayColor');
    
    if (serverName) serverName.value = data.server_name || '';
    if (serverIP) serverIP.value = data.server_ip || '';
    if (serverPort) serverPort.value = data.server_port || '';
    if (serverVersion) serverVersion.value = data.server_version || '';
    if (maxPlayers) maxPlayers.value = data.max_players || '';
    if (serverDescription) serverDescription.value = data.description || '';
    if (serverHeroImageUrl) serverHeroImageUrl.value = data.hero_image_url || '';
    if (serverHeroTitle) serverHeroTitle.value = data.hero_title || '';
    if (serverHeroSubtitle) serverHeroSubtitle.value = data.hero_subtitle || '';
    if (serverHeroTextColor) serverHeroTextColor.value = data.hero_text_color || '';
    if (serverHeroBgColor) serverHeroBgColor.value = data.hero_bg_color || '';
    if (serverHeroOverlayColor) serverHeroOverlayColor.value = data.hero_overlay_color || '';

    const heroBanner = document.getElementById('heroBanner');
    const heroTitle = document.getElementById('heroTitle');
    const heroSubtitle = document.getElementById('heroSubtitle');

    if (heroTitle) {
        heroTitle.textContent = data.hero_title || 'Добро пожаловать на ORIONIS';
    }

    if (heroSubtitle) {
        heroSubtitle.textContent = data.hero_subtitle || 'Присоединяйтесь к нашему сообществу прямо сейчас';
    }

    if (heroBanner) {
        const textColor = data.hero_text_color || '#ffffff';
        heroBanner.style.color = textColor;
    }
    if (heroBanner) {
        const overlay = data.hero_overlay_color || 'rgba(106, 13, 173, 0.55)';
        const bgColor = data.hero_bg_color || '#6a0dad';
        const heroImage = data.hero_image_url || 'https://i.postimg.cc/P5HmdGhX/ORIONIS.png';

        if (heroImage) {
            heroBanner.style.backgroundImage = `linear-gradient(135deg, ${overlay} 0%, ${overlay} 100%), url('${heroImage}')`;
            heroBanner.style.backgroundSize = 'cover';
            heroBanner.style.backgroundPosition = 'center';
        } else {
            heroBanner.style.backgroundImage = 'none';
            heroBanner.style.backgroundColor = bgColor;
        }
    }

    // Обновляем информацию на странице "О сервере"
    const serverInfo = document.getElementById('serverInfo');
    if (serverInfo) {
        serverInfo.innerHTML = `
            <h3 class="server-info-title-gradient">${data.server_name || 'ORIONIS'}</h3>
            <div class="server-info-grid">
                <div class="info-item">
                    <span class="info-label"><i class="fas fa-globe"></i> IP адрес</span>
                    <span class="info-value" onclick="navigator.clipboard.writeText('${data.server_ip || 'play.example.com'}'); alert('IP скопирован!')" style="cursor: pointer; text-decoration: underline; text-decoration-style: dotted;">
                        ${data.server_ip || 'play.example.com'}
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label"><i class="fas fa-plug"></i> Порт</span>
                    <span class="info-value">${data.server_port || 25565}</span>
                </div>
                <div class="info-item">
                    <span class="info-label"><i class="fas fa-cube"></i> Версия</span>
                    <span class="info-value">${data.server_version || '1.20'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label"><i class="fas fa-users"></i> Онлаин</span>
                    <span class="info-value">0 / ${data.max_players || 20}</span>
                </div>
            </div>
            <div class="info-item" style="margin-top: 2rem; display: block;">
                <span class="info-label"><i class="fas fa-align-left"></i> Описание</span>
                <p style="color: var(--text-muted); line-height: 1.8; font-size: 1.1rem; margin-top: 1rem;">
                    ${data.description || 'Добро пожаловать на наш сервер!'}
                </p>
            </div>
        `;
        console.log('Информация о сервере отображена');
    }
}

async function updateServerInfo() {
    if (!token || currentUser.role !== 'admin') return;

    const serverData = {
        server_name: document.getElementById('serverName').value,
        server_ip: document.getElementById('serverIP').value,
        server_port: parseInt(document.getElementById('serverPort').value),
        server_version: document.getElementById('serverVersion').value,
        max_players: parseInt(document.getElementById('maxPlayers').value),
        description: document.getElementById('serverDescription').value,
        hero_image_url: document.getElementById('serverHeroImageUrl').value,
        hero_title: document.getElementById('serverHeroTitle').value,
        hero_subtitle: document.getElementById('serverHeroSubtitle').value,
        hero_text_color: document.getElementById('serverHeroTextColor').value,
        hero_bg_color: document.getElementById('serverHeroBgColor').value,
        hero_overlay_color: document.getElementById('serverHeroOverlayColor').value
    };

    try {
        const response = await fetch(`${API_URL}/admin/server-info`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(serverData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        showNotification('Информация о сервере обновлена', 'success');
    } catch (error) {
        showNotification(error.message || 'Ошибка при обновлении информации', 'error');
    }
}

async function loadAdminLogs() {
    if (!token || currentUser.role !== 'admin') return;

    try {
        const response = await fetch(`${API_URL}/admin/logs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const logs = await response.json();
        const tbody = document.getElementById('logsTableBody');

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">Логи не найдены</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.created_at).toLocaleString('ru-RU')}</td>
                <td>${log.admin_username || '-'}</td>
                <td>${translateAction(log.action)}</td>
                <td>${log.target_username || '-'}</td>
                <td>${log.details || '-'}</td>
            </tr>
        `).join('');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function translateAction(action) {
    const translations = {
        'grant_privilege': 'Выдана привилегия',
        'revoke_privilege': 'Отозвана привилегия',
        'change_role': 'Изменена роль',
        'update_server_info': 'Обновлена информация о сервере'
    };
    return translations[action] || action;
}

// Переключение табов в админ-панели
function switchAdminTab(tabName) {
    const tabs = document.querySelectorAll('.admin-tab');
    const buttons = document.querySelectorAll('.tab-button');

    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });
    buttons.forEach(btn => btn.classList.remove('active'));

    const tabElement = document.getElementById(tabName + 'Tab');
    if (tabElement) {
        tabElement.classList.add('active');
        tabElement.style.display = 'block';
    }
    
    if (event && event.target) {
        event.target.classList.add('active');
    }

    if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'posts') {
        loadAdminPosts();
    } else if (tabName === 'tickets') {
        loadAdminTickets();
    } else if (tabName === 'server') {
        loadServerInfo();
    } else if (tabName === 'logs') {
        loadAdminLogs();
    }
}

// Уведомления
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== ФУНКЦИИ ДЛЯ ПОСТОВ =====

// Загрузить все посты на главную страницу
async function loadPosts() {
    try {
        const postsList = document.getElementById('postsList');
        if (!postsList) {
            console.log('Элемент postsList не найден на странице');
            return;
        }
        
        console.log('Загружаем посты...');
        
        // Создаем запрос с таймаутом
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут
        
        const response = await fetch(`${API_URL}/posts`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const posts = await response.json();
        console.log('Посты загружены:', posts);
        
        if (!posts || posts.length === 0) {
            postsList.innerHTML = '<p style="text-align: center; padding: 2rem; color: #999;">📋 Постов пока нет.</p>';
            return;
        }

        postsList.innerHTML = posts.map(post => `
            <div class="post-card">
                ${post.image_url ? `<img src="${post.image_url}" alt="${post.title}" class="post-image" onerror="this.src='https://via.placeholder.com/400x200?text=Minecraft'">` : `<div class="post-image" style="display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); color: white; font-size: 3rem;">📰</div>`}
                <div class="post-content">
                    <div class="post-title">${escapeHtml(post.title)}</div>
                    <div class="post-meta">
                        <span>Автор: <strong>${post.username}</strong></span>
                        <span>${new Date(post.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <div class="post-excerpt">${escapeHtml(post.content.substring(0, 150))}...</div>
                    <div class="post-footer">
                        <div class="post-stats" style="display: flex; align-items: center; gap: 0.8rem;">
                            <span class="post-views">👁️ ${post.views}</span>
                            <span class="post-comments-count">💬 ${post.comments_count || 0}</span>
                        </div>
                        <a href="#" onclick="showPost(${post.id}); return false;" class="btn btn-secondary" style="padding: 0.5rem 1rem; text-decoration: none;">Читать дальше</a>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка при загрузке постов:', error);
        const postsList = document.getElementById('postsList');
        if (postsList) {
            if (error.name === 'AbortError') {
                postsList.innerHTML = '<p style="text-align: center; padding: 2rem; color: #999;">⏱️ Сервер не отвечает. Попробуйте позже.</p>';
            } else {
                postsList.innerHTML = '<p style="text-align: center; padding: 2rem; color: #999;">📋 Не удалось загрузить посты. Сервер может быть недоступен.</p>';
            }
        }
    }
}

// Загрузить посты для админ панели
async function loadAdminPosts() {
    if (!token || currentUser.role !== 'admin') {
        console.warn('Доступ к админ постам запрещен');
        return;
    }

    try {
        const adminPostsList = document.getElementById('adminPostsList');
        if (!adminPostsList) {
            console.log('Элемент adminPostsList не найден');
            return;
        }

        adminPostsList.innerHTML = '<p style="text-align: center;">⏳ Загрузка постов...</p>';
        
        const response = await fetch(`${API_URL}/posts/admin/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const posts = await response.json();

        if (!posts || posts.length === 0) {
            adminPostsList.innerHTML = '<p style="text-align: center; color: #999;">📋 Постов нет</p>';
            return;
        }

        adminPostsList.innerHTML = posts.map(post => `
            <div class="admin-post-item">
                <div class="admin-post-item-info">
                    <h5>${escapeHtml(post.title)}</h5>
                    <p>Автор: ${post.username} | ${new Date(post.created_at).toLocaleDateString('ru-RU')}</p>
                    <p>Просмотров: ${post.views} | 💬 ${post.comments_count || 0} ${post.published ? '✅ Опубликовано' : '❌ Черновик'}</p>
                </div>
                <div class="admin-post-item-actions">
                    <button onclick="editPost(${post.id})" class="btn btn-secondary">Редактировать</button>
                    <button onclick="deletePost(${post.id})" class="btn btn-danger">Удалить</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка при загрузке постов админа:', error);
        const adminPostsList = document.getElementById('adminPostsList');
        if (adminPostsList) {
            adminPostsList.innerHTML = `<p style="text-align: center; color: #999;">❌ Ошибка: ${error.message}</p>`;
        }
        showNotification('Ошибка при загрузке постов: ' + error.message, 'error');
    }
}

function getPostFormButton() {
    return document.querySelector('button[onclick="createPost()"]');
}

function setPostFormMode(isEditing) {
    const submitButton = getPostFormButton();
    if (submitButton) {
        submitButton.textContent = isEditing ? 'Сохранить изменения' : 'Опубликовать пост';
    }
}

function resetPostForm() {
    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
    document.getElementById('postImageUrl').value = '';
    editingPostId = null;
    setPostFormMode(false);
}

async function editPost(postId) {
    if (!token || currentUser.role !== 'admin') {
        showNotification('Доступ запрещен', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/posts/admin/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const posts = await response.json();
        const post = posts.find(p => p.id === postId);

        if (!post) {
            showNotification('Пост не найден', 'error');
            return;
        }

        document.getElementById('postTitle').value = post.title || '';
        document.getElementById('postContent').value = post.content || '';
        document.getElementById('postImageUrl').value = post.image_url || '';

        editingPostId = postId;
        setPostFormMode(true);

        const postTitleInput = document.getElementById('postTitle');
        if (postTitleInput) {
            postTitleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            postTitleInput.focus();
        }
    } catch (error) {
        showNotification(error.message || 'Ошибка при загрузке поста', 'error');
    }
}

async function updatePost() {
    if (!token || currentUser.role !== 'admin') {
        showNotification('Доступ запрещен', 'error');
        return;
    }

    if (!editingPostId) {
        showNotification('Пост для редактирования не выбран', 'error');
        return;
    }

    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const image_url = document.getElementById('postImageUrl').value.trim();

    if (!title || !content) {
        showNotification('Заполните заголовок и содержание', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/posts/${editingPostId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, content, image_url: image_url || null, published: 1 })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        showNotification('Пост обновлен', 'success');
        resetPostForm();
        loadAdminPosts();
        loadPosts();
    } catch (error) {
        showNotification(error.message || 'Ошибка при обновлении поста', 'error');
    }
}

// Создать новый пост
async function createPost() {
    if (editingPostId) {
        updatePost();
        return;
    }

    if (!token || currentUser.role !== 'admin') {
        showNotification('Доступ запрещен', 'error');
        return;
    }

    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const image_url = document.getElementById('postImageUrl').value.trim();

    if (!title || !content) {
        showNotification('Заполните заголовок и содержание', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, content, image_url: image_url || null })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        showNotification('Пост успешно опубликован!', 'success');
        resetPostForm();
        loadAdminPosts();
        loadPosts();
    } catch (error) {
        showNotification(error.message || 'Ошибка при создании поста', 'error');
    }
}

// Удалить пост
async function deletePost(postId) {
    if (!token || currentUser.role !== 'admin') {
        showNotification('Доступ запрещен', 'error');
        return;
    }

    if (!confirm('Вы уверены, что хотите удалить этот пост?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        showNotification('Пост удален', 'success');
        loadAdminPosts();
        loadPosts();
    } catch (error) {
        showNotification(error.message || 'Ошибка при удалении поста', 'error');
    }
}

// Функция для экранирования HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Просмотр поста с деталями и комментариями
function showPost(postId) {
    if (!token || !currentUser) {
        const choice = confirm('Для чтения поста и комментариев необходимо войти.\n\nНажмите OK для регистрации или Отмена для входа.');
        if (choice) {
            showRegister();
        } else {
            showLogin();
        }
        return;
    }

    currentPostId = postId;

    const modal = document.getElementById('postModal');
    if (modal) {
        modal.style.display = 'flex';
    }

    const commentsList = document.getElementById('postCommentsList');
    if (commentsList) {
        commentsList.innerHTML = '<p>Загрузка комментариев...</p>';
    }

    const content = document.getElementById('postModalContent');
    if (content) {
        content.innerHTML = 'Загрузка...';
    }

    loadPostDetails(postId);
}

async function loadPostDetails(postId) {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/details`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка при загрузке поста');
        }

        const post = data.post;

        const titleEl = document.getElementById('postModalTitle');
        if (titleEl) {
            titleEl.textContent = post.title;
        }

        const metaEl = document.getElementById('postModalMeta');
        if (metaEl) {
            metaEl.innerHTML = `
                <span>Автор: <strong>${escapeHtml(post.username)}</strong></span>
                <span>${new Date(post.created_at).toLocaleDateString('ru-RU')}</span>
            `;
        }

        const imageEl = document.getElementById('postModalImage');
        if (imageEl) {
            if (post.image_url) {
                imageEl.src = post.image_url;
                imageEl.style.display = 'block';
            } else {
                imageEl.style.display = 'none';
            }
        }

        const contentEl = document.getElementById('postModalContent');
        if (contentEl) {
            const safeContent = escapeHtml(post.content).replace(/\n/g, '<br>');
            contentEl.innerHTML = safeContent;
        }

        const viewsEl = document.getElementById('postModalViews');
        if (viewsEl) {
            viewsEl.textContent = `👁️ ${post.views} просмотров`;
        }

        const commentsList = document.getElementById('postCommentsList');
        if (commentsList) {
            if (!data.comments || data.comments.length === 0) {
                commentsList.innerHTML = '<p>Комментариев пока нет</p>';
            } else {
                const canModerateComments = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
                commentsList.innerHTML = data.comments.map(comment => {
                    let roleBadge = '';
                    if (comment.role === 'admin') {
                        roleBadge = '<span style="background: #e74c3c; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.7rem; color: white; margin-left: 0.3rem;">Admin</span>';
                    } else if (comment.role === 'moderator') {
                        roleBadge = '<span style="background: #3498db; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.7rem; color: white; margin-left: 0.3rem;">Moder</span>';
                    }
                    
                    return `
                        <div class="post-comment-item">
                            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                <strong>${escapeHtml(comment.username)}</strong>
                                ${roleBadge}
                                <span>• ${new Date(comment.created_at).toLocaleDateString('ru-RU')}</span>
                                ${canModerateComments ? `<button class="btn btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="deleteComment(${comment.id})">Удалить</button>` : ''}
                            </div>
                            <div>${escapeHtml(comment.content)}</div>
                        </div>
                    `;
                }).join('');
            }
        }
    } catch (error) {
        showNotification(error.message || 'Ошибка при загрузке поста', 'error');
        const contentEl = document.getElementById('postModalContent');
        if (contentEl) {
            contentEl.innerHTML = 'Не удалось загрузить пост.';
        }
    }
}

async function submitPostComment() {
    if (!token || !currentUser || !currentPostId) {
        showNotification('Необходимо войти в аккаунт', 'error');
        return;
    }

    const input = document.getElementById('postCommentInput');
    if (!input) return;

    const content = input.value.trim();
    if (!content) {
        showNotification('Комментарий не может быть пустым', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/posts/${currentPostId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка при добавлении комментария');
        }

        input.value = '';
        loadPostDetails(currentPostId);
    } catch (error) {
        showNotification(error.message || 'Ошибка при добавлении комментария', 'error');
    }
}

async function deleteComment(commentId) {
    if (!token || !currentUser || !currentPostId) {
        showNotification('Необходимо войти в аккаунт', 'error');
        return;
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'moderator') {
        showNotification('Доступ запрещен', 'error');
        return;
    }

    const confirmed = confirm('Удалить комментарий?');
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/posts/${currentPostId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка при удалении комментария');
        }

        showNotification('Комментарий удален', 'success');
        loadPostDetails(currentPostId);
    } catch (error) {
        showNotification(error.message || 'Ошибка при удалении комментария', 'error');
    }
}

// ===== ФУНКЦИИ ДЛЯ ТИКЕТОВ =====

function showTicketModal() {
    if (!token || !currentUser) {
        showNotification('Необходимо войти в аккаунт', 'error');
        return;
    }

    const modal = document.getElementById('ticketModal');
    document.getElementById('ticketAccountName').value = currentUser.username;
    document.getElementById('ticketMinecraftUsername').value = currentUser.minecraft_username || '';
    document.getElementById('ticketTitle').value = '';
    document.getElementById('ticketDescription').value = '';
    document.getElementById('ticketImageUrl').value = '';

    if (modal) {
        modal.style.display = 'flex';
    }
}

async function createTicket() {
    if (!token || !currentUser) {
        showNotification('Необходимо войти в аккаунт', 'error');
        return;
    }

    const minecraft_username = document.getElementById('ticketMinecraftUsername').value.trim();
    const account_name = document.getElementById('ticketAccountName').value.trim();
    const title = document.getElementById('ticketTitle').value.trim();
    const description = document.getElementById('ticketDescription').value.trim();
    const image_url = document.getElementById('ticketImageUrl').value.trim();

    if (!title || !description) {
        showNotification('Заполните название и описание', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                minecraft_username: minecraft_username || null,
                account_name: account_name || null,
                title,
                description,
                image_url: image_url || null
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка при создании тикета');
        }

        showNotification('Тикет успешно отправлен!', 'success');
        closeModal('ticketModal');
        // Перезагружаем список тикетов пользователя
        loadUserTickets();
    } catch (error) {
        showNotification(error.message || 'Ошибка при создании тикета', 'error');
    }
}

// Загрузить все тикеты для админ панели
async function loadAdminTickets() {
    if (!token || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        showNotification('Доступ запрещен', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/tickets/admin/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const tickets = await response.json();
        const ticketsList = document.getElementById('adminTicketsList');

        if (!tickets || tickets.length === 0) {
            ticketsList.innerHTML = '<p style="text-align: center; color: #999;">🎫 Тикетов нет</p>';
            return;
        }

        ticketsList.innerHTML = tickets.map(ticket => `
            <div style="background: var(--card-bg); padding: 1rem; border-radius: 10px; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
                    <div style="flex: 1;">
                        <h4>${escapeHtml(ticket.title)}</h4>
                        <p style="color: var(--text-secondary); margin: 0.5rem 0;">
                            👤 ${escapeHtml(ticket.username)} (${escapeHtml(ticket.minecraft_username || '-')})
                        </p>
                        <p style="color: var(--text-secondary); margin: 0.5rem 0; font-size: 0.85rem;">
                            ${new Date(ticket.created_at).toLocaleString('ru-RU')}
                        </p>
                        <p style="color: var(--text-secondary); margin: 0.5rem 0;">
                            Статус: <span style="background: ${ticket.status === 'open' ? '#9b59b6' : '#27ae60'}; padding: 0.2rem 0.5rem; border-radius: 4px;">
                                ${ticket.status === 'open' ? '🟠 Открыт' : '🟢 Закрыт'}
                            </span>
                        </p>
                    </div>
                    <button onclick="viewAdminTicket(${ticket.id})" class="btn btn-secondary">Открыть</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка при загрузке тикетов:', error);
        showNotification(error.message, 'error');
    }
}

let currentViewingTicketId = null;

async function viewAdminTicket(ticketId) {
    if (!token || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        showNotification('Доступ запрещен', 'error');
        return;
    }

    currentViewingTicketId = ticketId;

    try {
        // Получить информацию о тикете прямо через API
        const response = await fetch(`${API_URL}/tickets/${ticketId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Тикет не найден');
        }

        const ticket = await response.json();

        // Отобразить информацию тикета
        const content = document.getElementById('ticketViewContent');
        content.innerHTML = `
            <h3>${escapeHtml(ticket.title)}</h3>
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                👤 ${escapeHtml(ticket.minecraft_username || '-')} | ${new Date(ticket.created_at).toLocaleString('ru-RU')}
            </p>
            ${ticket.image_url ? `<img src="${ticket.image_url}" alt="Изображение" style="max-width: 100%; border-radius: 8px; margin: 1rem 0;">` : ''}
            <p style="line-height: 1.6; white-space: pre-wrap;">${escapeHtml(ticket.description)}</p>
            <div style="margin-top: 1rem;">
                <label>Статус:</label>
                <select id="ticketStatusSelect" style="padding: 0.5rem; border-radius: 4px; border: 1px solid var(--border-color);">
                    <option value="open" ${ticket.status === 'open' ? 'selected' : ''}>Открыт</option>
                    <option value="closed" ${ticket.status === 'closed' ? 'selected' : ''}>Закрыт</option>
                </select>
                <button onclick="updateTicketStatus(${ticketId})" class="btn btn-secondary" style="margin-left: 0.5rem;">Обновить</button>
            </div>
        `;

        document.getElementById('ticketViewId').textContent = ticketId;

        // Загрузить сообщения
        loadTicketMessages(ticketId);

        // Открыть модальное окно
        const modal = document.getElementById('ticketViewModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function loadTicketMessages(ticketId) {
    try {
        const response = await fetch(`${API_URL}/tickets/${ticketId}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Ошибка при загрузке сообщений');
        }

        const messages = await response.json();
        const messagesList = document.getElementById('ticketMessagesList');

        if (!messages || messages.length === 0) {
            messagesList.innerHTML = '<p style="text-align: center; color: #999;">Сообщений нет</p>';
        } else {
            messagesList.innerHTML = messages.map(msg => {
                let roleBadge = '';
                if (msg.role === 'admin') {
                    roleBadge = '<span style="background: #e74c3c; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.7rem; color: white; margin-left: 0.3rem;">Admin</span>';
                } else if (msg.role === 'moderator') {
                    roleBadge = '<span style="background: #3498db; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.7rem; color: white; margin-left: 0.3rem;">Moder</span>';
                }
                
                return `
                    <div style="background: ${msg.user_id === currentUser.id ? 'rgba(155, 89, 182, 0.2)' : 'var(--border-color)'}; padding: 0.8rem; border-radius: 6px;">
                        <strong>${escapeHtml(msg.username)}</strong>
                        ${roleBadge}
                        <span style="color: var(--text-secondary); font-size: 0.8rem; margin-left: 0.5rem;">
                            ${new Date(msg.created_at).toLocaleString('ru-RU')}
                        </span>
                        <p style="margin: 0.5rem 0 0 0; word-wrap: break-word;">${escapeHtml(msg.message)}</p>
                    </div>
                `;
            }).join('');

            // Скролл вниз
            messagesList.scrollTop = messagesList.scrollHeight;
        }
    } catch (error) {
        console.error('Ошибка:', error);
        const messagesList = document.getElementById('ticketMessagesList');
        messagesList.innerHTML = `<p style="color: red;">Ошибка при загрузке сообщений</p>`;
    }
}

async function sendTicketMessage() {
    if (!token || !currentViewingTicketId) {
        showNotification('Ошибка', 'error');
        return;
    }

    const messageInput = document.getElementById('ticketMessageInput');
    const message = messageInput.value.trim();

    if (!message) {
        showNotification('Напишите сообщение', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/tickets/${currentViewingTicketId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка при отправке сообщения');
        }

        messageInput.value = '';
        loadTicketMessages(currentViewingTicketId);
    } catch (error) {
        showNotification(error.message || 'Ошибка при отправке сообщения', 'error');
    }
}

async function updateTicketStatus(ticketId) {
    if (!token || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        showNotification('Доступ запрещен', 'error');
        return;
    }

    const status = document.getElementById('ticketStatusSelect').value;

    try {
        const response = await fetch(`${API_URL}/tickets/${ticketId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка при обновлении статуса');
        }

        showNotification('Статус тикета обновлен', 'success');
        loadAdminTickets();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Загрузить тикеты пользователя
async function loadUserTickets() {
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/tickets`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Ошибка при загрузке тикетов');
        }

        const tickets = await response.json();
        const ticketsList = document.getElementById('userTicketsList');

        if (!tickets || tickets.length === 0) {
            ticketsList.innerHTML = '<p style="text-align: center; color: #999;">🎫 У вас нет тикетов</p>';
            return;
        }

        ticketsList.innerHTML = tickets.map(ticket => `
            <div style="background: rgba(155, 89, 182, 0.1); padding: 0.8rem; border-radius: 8px; border-left: 3px solid #9b59b6;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 0.5rem 0;">${escapeHtml(ticket.title)}</h4>
                        <p style="margin: 0.3rem 0; font-size: 0.85rem; color: var(--text-secondary);">
                            ${new Date(ticket.created_at).toLocaleDateString('ru-RU')}
                        </p>
                        <p style="margin: 0.3rem 0; font-size: 0.85rem;">
                            Статус: <span style="background: ${ticket.status === 'open' ? '#9b59b6' : '#27ae60'}; padding: 0.2rem 0.4rem; border-radius: 3px; color: white;">
                                ${ticket.status === 'open' ? '🟠 Открыт' : '🟢 Закрыт'}
                            </span>
                        </p>
                    </div>
                    <button onclick="viewUserTicket(${ticket.id})" class="btn btn-secondary" style="white-space: nowrap;">Просмотр</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка:', error);
        const ticketsList = document.getElementById('userTicketsList');
        ticketsList.innerHTML = `<p style="color: red;">Ошибка при загрузке тикетов</p>`;
    }
}

let currentViewingUserTicketId = null;

async function viewUserTicket(ticketId) {
    if (!token) return;

    currentViewingUserTicketId = ticketId;

    try {
        const response = await fetch(`${API_URL}/tickets/${ticketId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            showNotification('Тикет не найден', 'error');
            return;
        }

        const ticket = await response.json();

        const content = document.getElementById('ticketViewContent');
        content.innerHTML = `
            <h3>${escapeHtml(ticket.title)}</h3>
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                🎮 ${escapeHtml(ticket.minecraft_username || '-')} | ${new Date(ticket.created_at).toLocaleString('ru-RU')}
            </p>
            ${ticket.image_url ? `<img src="${ticket.image_url}" alt="Изображение" style="max-width: 100%; border-radius: 8px; margin: 1rem 0;">` : ''}
            <p style="line-height: 1.6; white-space: pre-wrap;">${escapeHtml(ticket.description)}</p>
            <div style="margin-top: 1rem;">
                <p><strong>Статус:</strong> <span style="background: ${ticket.status === 'open' ? '#9b59b6' : '#27ae60'}; padding: 0.3rem 0.6rem; border-radius: 4px; color: white;">
                    ${ticket.status === 'open' ? '🟠 Открыт' : '🟢 Закрыт'}
                </span></p>
            </div>
        `;

        document.getElementById('ticketViewId').textContent = ticketId;

        // Загрузить сообщения
        loadUserTicketMessages(ticketId);

        // Открыть модальное окно
        const modal = document.getElementById('ticketViewModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function loadUserTicketMessages(ticketId) {
    try {
        const response = await fetch(`${API_URL}/tickets/${ticketId}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Ошибка при загрузке сообщений');
        }

        const messages = await response.json();
        const messagesList = document.getElementById('ticketMessagesList');

        if (!messages || messages.length === 0) {
            messagesList.innerHTML = '<p style="text-align: center; color: #999;">Сообщений нет</p>';
        } else {
            messagesList.innerHTML = messages.map(msg => {
                let roleBadge = '';
                if (msg.role === 'admin') {
                    roleBadge = '<span style="background: #e74c3c; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.7rem; color: white; margin-left: 0.3rem;">Admin</span>';
                } else if (msg.role === 'moderator') {
                    roleBadge = '<span style="background: #3498db; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.7rem; color: white; margin-left: 0.3rem;">Moder</span>';
                }
                
                return `
                    <div style="background: ${msg.user_id === currentUser.id ? 'rgba(155, 89, 182, 0.2)' : 'rgba(39, 174, 96, 0.2)'}; padding: 0.8rem; border-radius: 6px;">
                        <strong>${escapeHtml(msg.username)}</strong>
                        ${roleBadge}
                        <span style="color: var(--text-secondary); font-size: 0.8rem; margin-left: 0.5rem;">
                            ${new Date(msg.created_at).toLocaleString('ru-RU')}
                        </span>
                        <p style="margin: 0.5rem 0 0 0; word-wrap: break-word;">${escapeHtml(msg.message)}</p>
                    </div>
                `;
            }).join('');

            // Скролл вниз
            messagesList.scrollTop = messagesList.scrollHeight;
        }
    } catch (error) {
        console.error('Ошибка:', error);
        const messagesList = document.getElementById('ticketMessagesList');
        messagesList.innerHTML = `<p style="color: red;">Ошибка при загрузке сообщений</p>`;
    }
}
