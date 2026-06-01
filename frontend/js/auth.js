// ════════════════════════════════════════════════════════════
// ZEN SAVE — Lógica de Autenticación Frontend
// ════════════════════════════════════════════════════════════
// Maneja los formularios de login/registro y el estado de la sesión.
// ════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los formularios (solo existirán en index.html)
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Attach event listeners si los formularios existen
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Lógica para cambiar entre tabs de Login / Registro
    setupTabs();
});

/**
 * Maneja el envío del formulario de Login
 */
async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    const errorEl = document.getElementById('login-error');
    const btn = form.querySelector('button[type="submit"]');

    // Reset error
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
    
    // UI Loading state
    const originalBtnText = btn.textContent;
    btn.textContent = 'Iniciando sesión...';
    btn.disabled = true;

    try {
        const response = await window.API.post('/auth/login', { email, password });

        if (response.success) {
            // Guardar sesión en localStorage
            localStorage.setItem('zen_token', response.token);
            localStorage.setItem('zen_user', JSON.stringify(response.user));
            
            // Redirigir al dashboard
            window.location.href = 'dashboard.html';
        } else {
            // Mostrar error retornado por la API
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

/**
 * Maneja el envío del formulario de Registro
 */
async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    
    // Soporte para nuevo form (campo 'name') y form legacy (firstname + lastname)
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
    // confirm_password puede no existir en el nuevo form simplificado
    const confirmPassword = form.confirm_password ? form.confirm_password.value : password;

    const errorEl = document.getElementById('register-error');
    const btn = form.querySelector('button[type="submit"]');

    // Reset error
    errorEl.textContent = '';
    errorEl.classList.add('hidden');

    // Validación client-side: contraseñas coinciden
    if (password !== confirmPassword) {
        errorEl.textContent = 'Las contraseñas no coinciden';
        errorEl.classList.remove('hidden');
        return;
    }

    // UI Loading state
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<span>Creando cuenta...</span>';
    btn.disabled = true;

    try {
        const response = await window.API.post('/auth/register', { name, email, password });

        if (response.success) {
            // Guardar sesión y entrar directamente
            localStorage.setItem('zen_token', response.token);
            localStorage.setItem('zen_user', JSON.stringify(response.user));
            window.location.href = 'dashboard.html';
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

/**
 * Inicializa el comportamiento visual de los Tabs (Login/Register)
 */
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    if (tabBtns.length === 0) return;

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            
            // Remover active class de todos los botones y contenidos
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Activar tab clickeado
            btn.classList.add('active');
            document.getElementById(targetId).classList.add('active');
            
            // Ocultar posibles errores viejos
            document.getElementById('login-error')?.classList.add('hidden');
            document.getElementById('register-error')?.classList.add('hidden');
        });
    });
}

/**
 * Verifica si hay una sesión activa.
 * Debe ser llamada en el <head> o inicio de cada página protegida
 * (como dashboard.html, transactions.html, etc).
 */
function checkAuth() {
    const token = localStorage.getItem('zen_token');
    if (!token) {
        window.location.href = 'index.html';
    }
}

/**
 * Cierra la sesión limpiando el localStorage
 */
function logout() {
    localStorage.removeItem('zen_token');
    localStorage.removeItem('zen_user');
    window.location.href = 'index.html';
}

// Inyectar funciones globalmente para ser usadas en el HTML
window.checkAuth = checkAuth;
window.logout = logout;
