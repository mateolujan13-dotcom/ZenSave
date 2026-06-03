document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    setupTabs();
});

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    const errorEl = document.getElementById('login-error');
    const btn = form.querySelector('button[type="submit"]');

    errorEl.textContent = '';
    errorEl.classList.add('hidden');
    
    const originalBtnText = btn.textContent;
    btn.textContent = 'Iniciando sesión...';
    btn.disabled = true;

    try {
        const response = await window.API.post('/auth/login', { email, contrasena: password });

        if (response.success) {
            localStorage.setItem('zen_token', response.token);
            localStorage.setItem('zen_user', JSON.stringify(response.user));
            window.location.href = 'panel-financiero.html';
        } else {
            errorEl.textContent = response.error || 'Error al iniciar sesión';
            errorEl.classList.remove('hidden');
        }
    } catch (error) {
        errorEl.textContent = 'Error de conexión con el servidor';
        errorEl.classList.remove('hidden');
    } finally {
        btn.textContent = originalBtnText;
        btn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    
    let name;
    if (form.name && form.name.value.trim()) {
        name = form.name.value.trim();
    } else {
        const firstname = form.firstname ? form.firstname.value.trim() : '';
        const lastname = form.lastname ? form.lastname.value.trim() : '';
        name = `${firstname} ${lastname}`.trim();
    }

    const email = form.email.value;
    const password = form.password.value;
    const confirmPassword = form.confirm_password ? form.confirm_password.value : password;

    const errorEl = document.getElementById('register-error');
    const btn = form.querySelector('button[type="submit"]');

    errorEl.textContent = '';
    errorEl.classList.add('hidden');

    if (password !== confirmPassword) {
        errorEl.textContent = 'Las contraseñas no coinciden';
        errorEl.classList.remove('hidden');
        return;
    }

    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<span>Creando cuenta...</span>';
    btn.disabled = true;

    try {
        const response = await window.API.post('/auth/register', { nombre: name, email, contrasena: password });

        if (response.success) {
            localStorage.setItem('zen_token', response.token);
            localStorage.setItem('zen_user', JSON.stringify(response.user));
            window.location.href = 'panel-financiero.html';
        } else {
            errorEl.textContent = response.error || 'Error al registrarse';
            errorEl.classList.remove('hidden');
        }
    } catch (error) {
        errorEl.textContent = 'Error de conexión con el servidor';
        errorEl.classList.remove('hidden');
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
    }
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    if (tabBtns.length === 0) return;

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(targetId).classList.add('active');
            document.getElementById('login-error')?.classList.add('hidden');
            document.getElementById('register-error')?.classList.add('hidden');
        });
    });
}

function checkAuth() {
    const token = localStorage.getItem('zen_token');
    if (!token) {
        window.location.href = 'index.html';
    }
}

function logout() {
    localStorage.removeItem('zen_token');
    localStorage.removeItem('zen_user');
    window.location.href = 'index.html';
}

window.checkAuth = checkAuth;
window.logout = logout;
