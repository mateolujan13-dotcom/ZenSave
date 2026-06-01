// ── ZEN SAVE — Servicio API ──

const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : 'https://zensave-production.up.railway.app/api';

if (!document.getElementById('zen-toast-styles')) {
    const s = document.createElement('style');
    s.id = 'zen-toast-styles';
    s.textContent = `@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`;
    document.head.appendChild(s);
}

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-8 right-8 z-[600] flex flex-col gap-2';
        document.body.appendChild(container);
    }
    
    const bg = type === 'success' ? 'bg-[#10B981]' : type === 'error' ? 'bg-[#EF4444]' : 'bg-primary';
    const toast = document.createElement('div');
    toast.className = `min-w-[280px] p-4 px-6 rounded-xl shadow-lg text-sm font-medium text-white flex items-center justify-between ${bg}`;
    toast.style.animation = 'slideInRight 0.3s ease forwards';
    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:white;cursor:pointer;font-size:1.2rem;line-height:1;">&times;</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function toggleLoading(show) {
    let spinner = document.getElementById('global-spinner');
    if (!spinner) {
        const header = document.querySelector('.header, .topbar, .chat-header');
        if (header) {
            spinner = document.createElement('div');
            spinner.id = 'global-spinner';
            spinner.className = 'w-6 h-6 border-2 border-white/10 border-t-primary rounded-full animate-spin';
            spinner.style.display = 'none';
            spinner.style.marginRight = '1rem';
            header.appendChild(spinner);
        }
    }
    if (spinner) {
        spinner.style.display = show ? 'block' : 'none';
    }
}

window.API = {
    async fetch(endpoint, options = {}, retries = 1) {
        const token = localStorage.getItem('zen_token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        toggleLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

            toggleLoading(false);

            if (response.status === 401) {
                localStorage.removeItem('zen_token');
                localStorage.removeItem('zen_user');
                showToast('Tu sesión ha expirado', 'error');
                setTimeout(() => window.location.href = 'index.html', 1500);
                return { success: false, error: 'No autorizado' };
            }

            const data = await response.json();

            if (!data.success && data.error) {
                if(options.method !== 'GET') showToast(data.error, 'error');
            }

            return data;

        } catch (error) {
            toggleLoading(false);
            
            if (retries > 0) {
                console.warn(`[ZEN API] Falla de red en ${endpoint}, reintentando...`);
                return this.fetch(endpoint, options, retries - 1);
            }
            
            console.error('API Network Error:', error);
            showToast('Sin conexión al servidor ZEN', 'error');
            return { success: false, error: 'Error de red' };
        }
    },

    get(endpoint) { return this.fetch(endpoint, { method: 'GET' }); },
    post(endpoint, body) { return this.fetch(endpoint, { method: 'POST', body: JSON.stringify(body) }); },
    put(endpoint, body) { return this.fetch(endpoint, { method: 'PUT', body: JSON.stringify(body) }); },
    delete(endpoint) { return this.fetch(endpoint, { method: 'DELETE' }); }
};

window.showToast = showToast;