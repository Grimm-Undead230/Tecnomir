

const loginBtn = document.getElementById('loginBtn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('errorMsg');


async function doLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
   
    errorMsg.classList.remove('show');
    errorMsg.innerText = '';
    
   
    if (!username || !password) {
        showError('Введите логин и пароль');
        return;
    }
    
   
    if (username.length < 3) {
        showError('Логин должен быть не менее 3 символов');
        return;
    }
    
    if (password.length < 4) {
        showError('Пароль должен быть не менее 4 символов');
        return;
    }
    
    try {
       
        await initSupabase();
        
        if (!supabaseClient) {
            showError('Ошибка подключения к базе данных');
            return;
        }
        
        
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password);
        
        if (error) {
            console.error('Ошибка запроса:', error);
            showError('Ошибка при входе. Попробуйте позже.');
            return;
        }
        
        if (!data || data.length === 0) {
            showError('❌ Неверный логин или пароль');
            
            document.querySelector('.login-box').style.animation = 'shake 0.5s ease';
            setTimeout(() => {
                document.querySelector('.login-box').style.animation = '';
            }, 500);
            return;
        }
       
        const user = data[0];
        localStorage.setItem('technomir_user', JSON.stringify(user));
        
      
        if (user.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'index.html';
        }
        
    } catch (err) {
        console.error('Ошибка:', err);
        showError('Произошла ошибка. Попробуйте позже.');
    }
}


function showError(message) {
    errorMsg.innerText = message;
    errorMsg.classList.add('show');
    
   
    clearTimeout(window.errorTimeout);
    window.errorTimeout = setTimeout(() => {
        errorMsg.classList.remove('show');
    }, 5000);
}


const styleShake = document.createElement('style');
styleShake.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-10px); }
        40% { transform: translateX(10px); }
        60% { transform: translateX(-10px); }
        80% { transform: translateX(10px); }
    }
`;
document.head.appendChild(styleShake);


loginBtn.onclick = doLogin;

passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        doLogin();
    }
});

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        passwordInput.focus();
    }
});


usernameInput.addEventListener('input', () => {
    errorMsg.classList.remove('show');
});

passwordInput.addEventListener('input', () => {
    errorMsg.classList.remove('show');
});


async function checkAlreadyLoggedIn() {
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
}


document.addEventListener('DOMContentLoaded', checkAlreadyLoggedIn);