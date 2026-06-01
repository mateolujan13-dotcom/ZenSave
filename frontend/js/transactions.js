// ════════════════════════════════════════════════════════════
// ZEN SAVE — Frontend Lógica de Transacciones (TPS)
// ════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar si hay sesión iniciada (Auth Guard)
    window.checkAuth();
    
    // 2. Cargar perfil del usuario en el Header
    const user = JSON.parse(localStorage.getItem('zen_user') || '{}');
    if (user && document.getElementById('user-name')) {
        document.getElementById('user-name').textContent = user.name ? user.name.split(' ')[0] : 'Usuario';
    }

    // 3. Listeners de Filtros
    document.getElementById('filter-type')?.addEventListener('change', loadTransactions);
    document.getElementById('filter-month')?.addEventListener('change', loadTransactions);
    
    // 3b. Search con debounce
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(loadTransactions, 300);
        });
    }
    
    // 4. Formularios inline (desktop) y modal (mobile)
    const txForm = document.getElementById('tx-form');
    if (txForm) {
        txForm.addEventListener('submit', submitTransaction);
    }
    const txFormMobile = document.getElementById('tx-form-mobile');
    if (txFormMobile) {
        txFormMobile.addEventListener('submit', submitTransaction);
    }
    
    // Botón "Nuevo Movimiento" (sidebar) — en mobile abre el modal, en desktop hace focus al form
    document.getElementById('btn-new-tx')?.addEventListener('click', () => {
        const modal = document.getElementById('tx-modal');
        if (window.innerWidth < 768 && modal) {
            modal.classList.add('active');
        } else {
            document.getElementById('tx-amount')?.focus();
        }
    });
    document.getElementById('btn-close-modal')?.addEventListener('click', () => {
        document.getElementById('tx-modal')?.classList.remove('active');
    });

    // 5. Logout
    document.getElementById('btn-logout')?.addEventListener('click', window.logout);

    // 6. Carga inicial
    loadCategories();
    loadTransactions();

    // 7. Set today's date on the inline form
    const today = new Date();
    const localISO = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const dateInput = document.getElementById('tx-date');
    if (dateInput) dateInput.value = localISO;
});

let categoriesData = [];
let editingId = null;

/**
 * Obtiene la lista de categorías del backend y llena el `<select>`
 */
async function loadCategories() {
    const select = document.getElementById('tx-category');
    if (!select) return;

    const res = await window.API.get('/categories');
    
    if (res.success) {
        categoriesData = res.data;
        // Limpiar
        select.innerHTML = '<option value="">Selecciona una categoría (Opcional)</option>';
        
        res.data.forEach(c => {
            // Un select nativo no renderiza iconos de fuentes de iconos,
            // pero podemos mostrar el nombre limpio.
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    } else {
        select.innerHTML = '<option value="">Error al cargar categorías</option>';
    }
}

/**
 * Obtiene las transacciones según los filtros aplicados y las dibuja
 */
async function loadTransactions() {
    const listEl = document.getElementById('transactions-list');
    if (!listEl) return;

    const type = document.getElementById('filter-type')?.value;
    const month = document.getElementById('filter-month')?.value;
    const search = document.getElementById('search-input')?.value;
    
    // Construir query string
    let url = '/transactions?';
    if (type) url += `type=${type}&`;
    if (month) url += `month=${month}`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    // Mostrar loader state
    listEl.innerHTML = '<div class="p-8 text-center text-on-surface-variant skeleton" style="border-radius: 12px">Cargando tus movimientos...</div>';

    const res = await window.API.get(url);
    
    if (res.success) {
        listEl.innerHTML = '';
        
        // Empty state
        if (res.data.length === 0) {
            listEl.innerHTML = `
                <div class="bg-surface border border-border-subtle rounded-[24px] p-8 text-center text-on-surface-variant animate-fade-in-up">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">
                        <span class="material-symbols-outlined" style="font-size:inherit">spa</span>
                    </div>
                    <p>No hay movimientos registrados en este periodo.</p>
                </div>
            `;
            return;
        }

        // Renderizar cada fila
        res.data.forEach(t => {
            listEl.innerHTML += renderTransaction(t);
        });
    } else {
        listEl.innerHTML = `<div class="bg-surface border border-border-subtle rounded-[24px] p-8 text-center text-expense-red">Error: ${res.error}</div>`;
    }
}

/**
 * Genera el HTML de una transacción
 */
function renderTransaction(t) {
    const isIncome = t.type === 'income';
    const sign = isIncome ? '+' : '-';
    const amountColor = isIncome ? 'text-primary' : 'text-expense-red';
    const iconBg = isIncome ? 'bg-primary/10 border-primary/20 group-hover:border-primary/50' : 'bg-surface-container-high border-border-subtle group-hover:border-primary/30';
    const iconColor = isIncome ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary';
    
    const iconName = t.category_icon || (isIncome ? 'payments' : 'receipt_long');
    const catName = t.category_name || (isIncome ? 'Ingreso General' : 'Egreso General');
    
    const descHTML = t.description 
        ? `<span class="font-data-label text-data-label text-on-surface-variant mt-1 block">${t.description}</span>` 
        : '';
    
    const dateObj = new Date(t.date);
    const dateStr = dateObj.toLocaleDateString('es-ES', { 
        timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric'
    });

    return `
        <div class="bg-surface border border-border-subtle rounded-[24px] p-2 hover-glow transition-all duration-300" id="tx-${t.id}">
            <div class="flex items-center justify-between p-4 rounded-[20px] hover:bg-surface-variant/50 transition-colors cursor-pointer group">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full ${iconBg} flex items-center justify-center border transition-colors ${isIncome ? 'relative overflow-hidden' : ''}">
                        ${isIncome ? '<div class="absolute inset-0 bg-primary/20 blur-md rounded-full"></div>' : ''}
                        <span class="material-symbols-outlined ${iconColor} relative z-10">${iconName}</span>
                    </div>
                    <div>
                        <p class="font-body-md text-body-md text-on-surface font-medium">${catName}</p>
                        ${descHTML}
                        <p class="font-data-label text-data-label text-on-surface-variant mt-1">${dateStr}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-data-display text-data-display ${amountColor}">${sign}$${t.amount.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    <button onclick="editTransaction(${t.id})" class="text-on-surface-variant hover:text-primary transition-colors p-1 rounded-full hover:bg-primary/10" title="Editar">
                        <span class="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button onclick="deleteTransaction(${t.id})" class="text-on-surface-variant hover:text-expense-red transition-colors p-1 rounded-full hover:bg-expense-red/10" title="Eliminar">
                        <span class="material-symbols-outlined text-[20px]">delete_outline</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Abre el modal y lo resetea
 */
function openForm() {
    const modal = document.getElementById('tx-modal');
    const form = document.getElementById('tx-form');
    
    form.reset();
    
    // Setear fecha por defecto a HOY (formato YYYY-MM-DD)
    const today = new Date();
    // Ajustar a timezone local para que 'hoy' sea correcto
    const localISOTime = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    document.getElementById('tx-date').value = localISOTime;
    
    modal.classList.add('active');
    
    // Auto-focus en monto para carga rápida
    setTimeout(() => {
        const amountInput = document.getElementById('tx-amount');
        if (amountInput) amountInput.focus();
    }, 100);
}

/**
 * Edita una transacción: carga sus datos en el formulario
 */
async function editTransaction(id) {
    // Obtener datos del backend
    const res = await window.API.get(`/transactions/${id}`);
    if (!res.success) return;

    const tx = res.data;

    editingId = id;

    // Poblar el formulario desktop
    const form = document.getElementById('tx-form');
    if (form) {
        form.type.value = tx.type;
        form.amount.value = tx.amount;
        form.description.value = tx.description || '';
        if (form.category_id) form.category_id.value = tx.category_id || '';
        if (form.date) form.date.value = tx.date;
        // Actualizar toggle visual
        if (typeof setType === 'function') {
            const btns = document.querySelectorAll('.type-btn');
            const targetBtn = Array.from(btns).find(b => b.dataset.type === tx.type);
            if (targetBtn) setType(tx.type, targetBtn);
        }
    }

    // Poblar el formulario mobile
    const mobileForm = document.getElementById('tx-form-mobile');
    if (mobileForm) {
        mobileForm.type.value = tx.type;
        mobileForm.amount.value = tx.amount;
        mobileForm.description.value = tx.description || '';
        if (mobileForm.category_id) mobileForm.category_id.value = tx.category_id || '';
        if (mobileForm.date) mobileForm.date.value = tx.date;
    }

    // Cambiar heading + botón submit
    document.querySelectorAll('.form-heading').forEach(el => el.textContent = 'Editar Movimiento');
    document.querySelectorAll('#tx-form button[type="submit"], #tx-form-mobile button[type="submit"]').forEach(btn => {
        btn.innerHTML = '<span class="material-symbols-outlined">edit</span> Actualizar Movimiento';
    });

    // Mostrar botón cancelar
    document.querySelectorAll('.cancel-edit').forEach(el => el.classList.remove('hidden'));

    // Scroll al formulario
    form?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Si está en mobile, abrir modal
    if (window.innerWidth < 768) {
        document.getElementById('tx-modal')?.classList.add('active');
    }
}

/**
 * Cancela la edición y resetea el formulario
 */
function cancelEdit() {
    editingId = null;
    const form = document.getElementById('tx-form');
    if (form) form.reset();
    const mobileForm = document.getElementById('tx-form-mobile');
    if (mobileForm) mobileForm.reset();

    // Resetear tipo a expense
    if (typeof setType === 'function') setType('expense', document.querySelector('.type-btn[data-type="expense"]'));

    // Resetear fecha
    const today = new Date();
    const localISO = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    document.querySelectorAll('#tx-date, #tx-form-mobile [name="date"]').forEach(el => { if (el) el.value = localISO; });

    // Restaurar heading + botón submit
    document.querySelectorAll('.form-heading').forEach(el => el.textContent = 'Nuevo Movimiento');
    document.querySelectorAll('#tx-form button[type="submit"], #tx-form-mobile button[type="submit"]').forEach(btn => {
        btn.innerHTML = '<span class="material-symbols-outlined">add_circle</span> Registrar Movimiento';
    });

    // Ocultar botón cancelar
    document.querySelectorAll('.cancel-edit').forEach(el => el.classList.add('hidden'));
}

/**
 * Envía el formulario al backend (crear o actualizar)
 */
async function submitTransaction(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;
    
    const data = {
        type: form.type.value || document.getElementById('tx-type')?.value || 'expense',
        amount: parseFloat(form.amount.value),
        category_id: form.category_id?.value ? parseInt(form.category_id.value) : null,
        description: form.description?.value || '',
        date: form.date?.value || new Date().toISOString().split('T')[0]
    };

    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">hourglass_top</span> Guardando...';
    btn.disabled = true;

    const res = editingId
        ? await window.API.put(`/transactions/${editingId}`, data)
        : await window.API.post('/transactions', data);
    
    btn.innerHTML = originalHTML;
    btn.disabled = false;

    if (res.success) {
        cancelEdit();
        // Cerrar modal mobile si está abierto
        document.getElementById('tx-modal')?.classList.remove('active');
        // Refrescar lista
        loadTransactions();
        // Refrescar summary del dashboard si estamos en esa página
        if (typeof loadSummary === 'function') loadSummary();
    } else {
        alert(res.error || 'Ocurrió un error al guardar el movimiento');
    }
}

/**
 * Elimina una transacción, requiere confirmación
 */
async function deleteTransaction(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este movimiento? Esta acción no se puede deshacer.')) {
        return;
    }
    
    const row = document.getElementById(`tx-${id}`);
    if (row) {
        row.style.opacity = '0.4';
        row.style.pointerEvents = 'none';
    }

    const res = await window.API.delete(`/transactions/${id}`);
    
    if (res.success) {
        if (row) {
            // Animación de salida (opcional, podemos solo removerlo)
            row.style.transform = 'translateX(20px)';
            row.style.opacity = '0';
            setTimeout(() => {
                row.remove();
                if (document.querySelectorAll('[id^="tx-"]').length === 0) {
                    loadTransactions();
                }
            }, 250);
        }
    } else {
        alert(res.error || 'Error al eliminar');
        if (row) {
            row.style.opacity = '1';
            row.style.pointerEvents = 'auto';
        }
    }
}

// Hacer globales las funciones que se llaman desde onClick en HTML
window.deleteTransaction = deleteTransaction;
window.editTransaction = editTransaction;
window.cancelEdit = cancelEdit;
