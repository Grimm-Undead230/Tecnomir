const registerBtn = document.getElementById('registerBtn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirmPassword');
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');


const strengthBarInner = document.createElement('div');
strengthBarInner.style.cssText = 'height: 100%; border-radius: 10px; transition: width 0.3s; background: #2ecc71; width: 0%;';

const passwordHint = document.createElement('div');
passwordHint.id = 'password-hint';
passwordHint.style.cssText = 'font-size: 0.8rem; margin-top: -10px; margin-bottom: 15px; color: #666; text-align: left;';
passwordHint.textContent = 'Минимум 4 символа';


const passwordParent = passwordInput.parentNode;
const barContainer = document.createElement('div');
barContainer.style.cssText = 'width: 100%; height: 6px; background: #e0e0e0; border-radius: 10px; margin: 8px 0; overflow: hidden;';
barContainer.appendChild(strengthBarInner);
passwordParent.insertBefore(barContainer, passwordInput.nextSibling);
passwordParent.insertBefore(passwordHint, barContainer.nextSibling);


const confirmHint = document.createElement('div');
confirmHint.id = 'confirm-hint';
confirmHint.style.cssText = 'font-size: 0.8rem; margin-top: -10px; margin-bottom: 15px; color: #666; text-align: left;';
confirmHint.textContent = 'Пароли должны совпадать';
const confirmParent = confirmInput.parentNode;
confirmParent.insertBefore(confirmHint, confirmInput.nextSibling);

//сообщение об ошибке
function showError(message) {
    errorMsg.innerText = message;
    errorMsg.classList.add('show');
    document.querySelector('.register-box').style.animation = 'shake 0.5s ease';
    setTimeout(() => {
        document.querySelector('.register-box').style.animation = '';
    }, 500);
}

//проверка на сложность пароля
function checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return score;
}

//регистрация, ошибки, интерфейс
async function doRegister() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    errorMsg.classList.remove('show');
    successMsg.classList.remove('show');
    errorMsg.innerText = '';
    successMsg.innerText = '';

    if (!username || username.length < 3) {
        showError('Логин должен быть не менее 3 символов');
        usernameInput.focus();
        return;
    }
    
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        showError('Логин: 3-20 символов, только буквы, цифры и _');
        usernameInput.focus();
        return;
    }

    if (!password || password.length < 4) {
        showError('Пароль должен быть не менее 4 символов');
        passwordInput.focus();
        return;
    }

    if (password !== confirm) {
        showError('Пароли не совпадают');
        confirmInput.focus();
        return;
    }

    registerBtn.disabled = true;
    registerBtn.textContent = 'Регистрация...';

    try {
        await initSupabase();
        
        if (!supabaseClient) {
            showError('Ошибка подключения к базе данных');
            registerBtn.disabled = false;
            registerBtn.textContent = 'Зарегистрироваться';
            return;
        }

        const { data: existingUser, error: checkError } = await supabaseClient
            .from('users')
            .select('username')
            .eq('username', username);

        if (checkError) {
            console.error('Ошибка проверки:', checkError);
            showError('Ошибка проверки пользователя');
            registerBtn.disabled = false;
            registerBtn.textContent = 'Зарегистрироваться';
            return;
        }

        if (existingUser && existingUser.length > 0) {
            showError('Этот логин уже занят');
            usernameInput.focus();
            registerBtn.disabled = false;
            registerBtn.textContent = 'Зарегистрироваться';
            return;
        }

        console.log('Создаём пользователя:', username);

        const { data, error } = await supabaseClient
            .from('users')
            .insert([{
                username: username,
                password: password,
                role: 'user',
                registered_at: new Date().toISOString()
            }])
            .select();

        if (error) {
            console.error('Ошибка регистрации:', error);
            showError('Ошибка: ' + error.message);
            registerBtn.disabled = false;
            registerBtn.textContent = 'Зарегистрироваться';
            return;
        }

        if (!data || data.length === 0) {
            showError('Ошибка: пользователь не создан');
            registerBtn.disabled = false;
            registerBtn.textContent = 'Зарегистрироваться';
            return;
        }

        const newUser = data[0];
        console.log('Пользователь создан в БД:', newUser);
        
        localStorage.setItem('technomir_user', JSON.stringify(newUser));
        
        successMsg.innerText = 'Регистрация успешна! Перенаправление...';
        successMsg.classList.add('show');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (err) {
        console.error('Ошибка:', err);
        showError('Произошла ошибка. Попробуйте позже.');
        registerBtn.disabled = false;
        registerBtn.textContent = 'Зарегистрироваться';
    }
}

//кол-во символов
passwordInput.addEventListener('input', function() {
    const value = this.value;
    const strength = checkPasswordStrength(value);
    
    if (value.length === 0) {
        strengthBarInner.style.width = '0%';
        passwordHint.textContent = 'Минимум 4 символа';
        passwordHint.style.color = '#666';
        this.className = '';
        return;
    }
    
    if (value.length < 4) {
        this.className = 'invalid';
        passwordHint.textContent = '❌ Минимум 4 символа';
        passwordHint.style.color = '#ff4757';
        strengthBarInner.style.width = '20%';
        strengthBarInner.style.background = '#ff4757';
        return;
    }
    
    if (value.length < 6) {
        this.className = 'valid';
        passwordHint.textContent = '⚠️ Слабый пароль (минимум 6 символов)';
        passwordHint.style.color = '#ffa502';
        strengthBarInner.style.width = '40%';
        strengthBarInner.style.background = '#ffa502';
        return;
    }
    
    this.className = 'valid';
    
    if (strength <= 2) {
        strengthBarInner.style.width = '40%';
        strengthBarInner.style.background = '#ffa502';
        passwordHint.textContent = '⚠️ Слабый пароль';
        passwordHint.style.color = '#ffa502';
    } else if (strength <= 3) {
        strengthBarInner.style.width = '66%';
        strengthBarInner.style.background = '#3498db';
        passwordHint.textContent = '🔄 Средний пароль';
        passwordHint.style.color = '#3498db';
    } else {
        strengthBarInner.style.width = '100%';
        strengthBarInner.style.background = '#2ecc71';
        passwordHint.textContent = '✅ Сильный пароль!';
        passwordHint.style.color = '#2ecc71';
    }
});

//совпадение пароля
confirmInput.addEventListener('input', function() {
    const password = passwordInput.value;
    const value = this.value;
    
    if (value.length === 0) {
        this.className = '';
        confirmHint.textContent = 'Пароли должны совпадать';
        confirmHint.style.color = '#666';
        return;
    }
    
    if (value === password && password.length > 0) {
        this.className = 'valid';
        confirmHint.textContent = '✅ Пароли совпадают';
        confirmHint.style.color = '#2ecc71';
    } else {
        this.className = 'invalid';
        confirmHint.textContent = '❌ Пароли не совпадают';
        confirmHint.style.color = '#ff4757';
    }
});

//Enter кнопка
registerBtn.onclick = doRegister;

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        passwordInput.focus();
    }
});

passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        confirmInput.focus();
    }
});

confirmInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        doRegister();
    }
});

document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
        errorMsg.classList.remove('show');
        successMsg.classList.remove('show');
    });
});
//проверка авторизации
async function checkAlreadyLoggedIn() {
    try {
        await initSupabase();
        const saved = localStorage.getItem('technomir_user');
        if (saved) {
            const user = JSON.parse(saved);
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        }
    } catch (err) {
        console.error('Ошибка проверки авторизации:', err);
    }
}

document.addEventListener('DOMContentLoaded', checkAlreadyLoggedIn);