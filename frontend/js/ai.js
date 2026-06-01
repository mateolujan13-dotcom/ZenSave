// ════════════════════════════════════════════════════════════
// ZEN SAVE — Lógica del Asesor ZEN (IA)
// ════════════════════════════════════════════════════════════

let conversationHistory = [];

document.addEventListener('DOMContentLoaded', () => {
    window.checkAuth();
    
    // Header UI
    const user = JSON.parse(localStorage.getItem('zen_user') || '{}');
    const userNameEl = document.getElementById('user-name');
    if (userNameEl && user.name) {
        userNameEl.textContent = user.name;
    }

    // Inicializar chat con mensaje de bienvenida
    const displayName = user.name ? user.name.split(' ')[0] : 'usuario';
    conversationHistory.push({
        role: 'ai',
        text: `¡Hola **${displayName}**! Soy tu Asesor ZEN. He analizado tu perfil financiero y estoy listo para ayudarte. ¿En qué te puedo asesorar hoy?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    renderHistory();

    // Eventos del chat
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', handleChatSubmit);
    }

    // Eventos de sugerencias rápidas
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            const text = chip.childNodes[chip.childNodes.length - 1].textContent.trim();
            sendMessage(text);
        });
    });

    // Eventos de Retos de Ahorro
    const newChallengeBtn = document.getElementById('btn-new-challenge');
    const challengeModal = document.getElementById('challenge-modal');
    if (newChallengeBtn && challengeModal) {
        newChallengeBtn.addEventListener('click', () => challengeModal.classList.add('active'));
        document.getElementById('btn-close-challenge')?.addEventListener('click', () => challengeModal.classList.remove('active'));
        document.getElementById('challenge-form')?.addEventListener('submit', handleCreateChallenge);
    }

    loadChallenges();
});

/**
 * Renderiza todo el historial de conversación en el DOM
 */
function renderHistory() {
    const container = document.getElementById('chat-history');
    if (!container) return;

    container.innerHTML = '';
    conversationHistory.forEach(msg => {
        container.innerHTML += renderMessage(msg);
    });

    // Auto-scroll al fondo
    container.scrollTop = container.scrollHeight;
}

/**
 * Simple Markdown Parser (Bold, Italics, Lists)
 */
function parseMarkdown(text) {
    let html = text;
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italics
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Unordered Lists (basic)
    html = html.replace(/^- (.*)$/gm, '<li class="ml-4 list-disc">$1</li>');
    // Newlines
    html = html.replace(/\n/g, '<br>');
    return html;
}

/**
 * Construye el HTML de una burbuja de chat
 */
function renderMessage(msg) {
    const isUser = msg.role === 'user';
    
    if (isUser) {
        return `
            <div class="flex gap-3 items-start justify-end max-w-2xl ml-auto animate-fade-in-up">
                <div class="bg-surface-container-high rounded-2xl rounded-tr-sm p-4 border border-border-subtle text-on-surface">
                    <p class="text-sm leading-relaxed">${parseMarkdown(msg.text)}</p>
                    <span class="text-xs text-on-surface-variant mt-1 block text-right">${msg.time}</span>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="flex gap-3 items-start max-w-2xl animate-fade-in-up">
                <div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0 border border-primary/20">
                    <span class="material-symbols-outlined text-primary text-lg" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
                </div>
                <div class="bg-surface-container backdrop-blur-md rounded-2xl rounded-tl-sm p-4 border border-border-subtle card-glow flex-1">
                    <div class="text-sm leading-relaxed">${parseMarkdown(msg.text)}</div>
                    <span class="text-xs text-on-surface-variant mt-1 block">${msg.time}</span>
                </div>
            </div>
        `;
    }
}


/**
 * Maneja el envío del formulario del chat
 */
function handleChatSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    input.value = '';
    sendMessage(text);
}

/**
 * Agrega el mensaje del usuario y llama a la API de Gemini
 */
async function sendMessage(text) {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Mostrar mensaje del usuario
    conversationHistory.push({ role: 'user', text: text, time: timeNow });
    renderHistory();

    // 2. Mostrar indicador de "Escribiendo..."
    const container = document.getElementById('chat-history');
    const typingId = 'typing-' + Date.now();
    container.innerHTML += `
        <div id="${typingId}" class="flex gap-3 items-start max-w-2xl animate-fade-in-up">
            <div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0 border border-primary/20">
                <span class="material-symbols-outlined text-primary text-lg" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
            </div>
            <div class="bg-surface-container backdrop-blur-md rounded-2xl rounded-tl-sm px-4 py-3 border border-border-subtle flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style="animation-delay: 0s;"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style="animation-delay: 0.15s;"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style="animation-delay: 0.3s;"></span>
            </div>
        </div>
    `;
    container.scrollTop = container.scrollHeight;
    
    // Deshabilitar input
    const input = document.getElementById('chat-input');
    const btn = document.getElementById('btn-send');
    if (input) input.disabled = true;
    if (btn) btn.disabled = true;

    // 3. Llamar a la API
    const res = await window.API.post('/ai/advice', { message: text });
    
    // Restaurar UI
    if (input) input.disabled = false;
    if (btn) btn.disabled = false;
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    // 4. Mostrar respuesta
    if (res.success) {
        conversationHistory.push({
            role: 'ai',
            text: res.data.reply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    } else {
        conversationHistory.push({
            role: 'ai',
            text: `⚠️ Hubo un problema de conexión con el sistema neuronal. (${res.error})`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    }
    
    renderHistory();
    if (input) input.focus();
}

/**
 * Carga y renderiza los Retos de Ahorro
 */
async function loadChallenges() {
    const listEl = document.getElementById('challenges-list');
    if (!listEl) return;

    listEl.innerHTML = '<div class="text-center text-on-surface-variant text-sm py-4">Cargando retos...</div>';

    const res = await window.API.get('/ai/challenges');
    if (res.success) {
        if (res.data.length === 0) {
            listEl.innerHTML = '<div class="text-center text-on-surface-variant text-sm py-6 bg-surface-container-low rounded-xl border border-dashed border-border-subtle">No tienes retos activos.<br>¡Pídele una idea al Asesor ZEN!</div>';
            return;
        }

        listEl.innerHTML = '';
        res.data.forEach(ch => {
            const progress = Math.min(100, (ch.current / ch.target) * 100);
            const progressColor = progress >= 100 ? 'bg-secondary' : 'bg-primary';
            const glowColor = progress >= 100 ? 'rgba(84,224,131,0.6)' : 'rgba(0,230,118,0.6)';
            const statusLabel = progress >= 100 ? 'Completado' : 'En curso';
            
                    listEl.innerHTML += `
                <div class="bg-surface rounded-xl p-3 border border-border-subtle card-glow">
                    <div class="flex justify-between items-center mb-1.5">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="material-symbols-outlined text-primary text-sm shrink-0">emoji_events</span>
                            <h4 class="text-xs font-bold text-on-surface truncate" title="${ch.title}">${ch.title}</h4>
                        </div>
                        <span class="font-data-label text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded shrink-0">${statusLabel}</span>
                    </div>
                    <p class="font-data-display text-xs text-on-surface-variant mb-1.5">$${ch.current.toLocaleString()} <span class="text-[10px] opacity-50">/ $${ch.target.toLocaleString()}</span></p>
                    <div class="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden relative mb-1">
                        <div class="absolute top-0 left-0 h-full ${progressColor} rounded-full" style="width: ${progress}%; box-shadow: 0 0 6px ${glowColor};"></div>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <span class="font-data-label text-[10px] text-primary">${Math.round(progress)}%</span>
                        <button onclick='openDepositModal(${ch.id}, "${ch.title.replace(/'/g, "\\'")}")' class="text-primary hover:text-primary-fixed text-[11px] font-medium flex items-center gap-0.5 transition-colors">
                            <span class='material-symbols-outlined text-xs'>add_circle</span>
                            Agregar
                        </button>
                    </div>
                </div>
            `;
        });

    } else {
        listEl.innerHTML = '<div class="text-expense-red text-sm">Error al cargar retos</div>';
    }
}

/**
 * Crea un nuevo reto de ahorro
 */
async function handleCreateChallenge(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    
    const title = form.title.value;
    const target = parseFloat(form.target.value);
    
    btn.disabled = true;
    btn.textContent = 'Creando...';

    const res = await window.API.post('/ai/challenges', { title, target });
    
    btn.disabled = false;
    btn.textContent = 'Guardar Reto';

    if (res.success) {
        document.getElementById('challenge-modal').classList.remove('active');
        form.reset();
        loadChallenges();
        
        // El AI felicita
        conversationHistory.push({
            role: 'ai',
            text: `¡Excelente iniciativa! Acabo de registrar tu nuevo reto de ahorro: "${title}". Vamos a trabajar juntos para alcanzar esa meta.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        renderHistory();
    } else {
        alert(res.error || 'Error al crear reto');
    }
}

let currentDepositChallengeId = null;

function openDepositModal(id, title) {
    currentDepositChallengeId = id;
    document.getElementById('deposit-modal-title').textContent = 'Agregar a: ' + title;
    document.getElementById('deposit-amount').value = '';
    document.getElementById('deposit-modal').classList.add('active');
}

function closeDepositModal() {
    document.getElementById('deposit-modal').classList.remove('active');
    currentDepositChallengeId = null;
}

async function confirmDeposit() {
    const amount = parseFloat(document.getElementById('deposit-amount').value);
    if (!amount || amount <= 0) {
        window.showToast('Ingresa un monto valido', 'error');
        return;
    }
    const res = await window.API.fetch('/ai/challenges/' + currentDepositChallengeId + '/deposit', {
        method: 'PATCH',
        body: JSON.stringify({ amount: amount })
    });
    if (res.success) {
        closeDepositModal();
        loadChallenges();
        const msg = res.data.progress >= 100 ? 'Reto completado!' : 'Monto agregado correctamente';
        window.showToast(msg, res.data.progress >= 100 ? 'success' : 'info');
    }
}

window.openDepositModal = openDepositModal;
window.closeDepositModal = closeDepositModal;
window.confirmDeposit = confirmDeposit;
