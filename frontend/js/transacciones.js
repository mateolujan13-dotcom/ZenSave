const PAGE_SIZE = 20;
let currentPage = 1;
let categoriesData = [];
let editingId = null;

document.addEventListener('DOMContentLoaded', () => {
    window.checkAuth();
    
    const user = JSON.parse(localStorage.getItem('zen_user') || '{}');
    if (user && document.getElementById('user-name')) {
        document.getElementById('user-name').textContent = user.nombre ? user.nombre.split(' ')[0] : 'Usuario';
    }

    document.getElementById('filter-type')?.addEventListener('change', () => loadTransactions(1));
    document.getElementById('filter-month')?.addEventListener('change', () => loadTransactions(1));

    document.getElementById('prev-page')?.addEventListener('click', () => {
        if (currentPage > 1) loadTransactions(currentPage - 1);
    });
    document.getElementById('next-page')?.addEventListener('click', () => {
        loadTransactions(currentPage + 1);
    });
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => loadTransactions(1), 300);
        });
    }
    
    document.getElementById('tx-form')?.addEventListener('submit', submitTransaction);
    document.getElementById('tx-form-mobile')?.addEventListener('submit', submitTransaction);
    
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

    document.getElementById('btn-logout')?.addEventListener('click', window.logout);

    Promise.all([loadCategories(), loadTransactions(1)]).catch(console.warn);

    const today = new Date();
    const localISO = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const dateInput = document.getElementById('tx-date');
    if (dateInput) dateInput.value = localISO;
});

async function loadCategories() {
    const select = document.getElementById('tx-category');
    if (!select) return;

    const res = await window.API.get('/categorias');
    
    if (res.success) {
        categoriesData = res.data;
        select.innerHTML = '<option value="">Selecciona una categoría (Opcional)</option>';
        
        res.data.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });
    } else {
        select.innerHTML = '<option value="">Error al cargar categorías</option>';
    }
}

function updatePagination(total) {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const pagEl = document.getElementById('pagination');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const infoEl = document.getElementById('page-info');
    if (!pagEl) return;
    if (total <= PAGE_SIZE) {
        pagEl.classList.add('hidden');
        return;
    }
    pagEl.classList.remove('hidden');
    const from = (currentPage - 1) * PAGE_SIZE + 1;
    const to = Math.min(currentPage * PAGE_SIZE, total);
    infoEl.textContent = `${from}-${to} de ${total}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

async function loadTransactions(page) {
    currentPage = page || 1;
    const listEl = document.getElementById('transactions-list');
    if (!listEl) return;

    const type = document.getElementById('filter-type')?.value;
    const month = document.getElementById('filter-month')?.value;
    const search = document.getElementById('search-input')?.value;
    
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (month) params.append('month', month);
    if (search) params.append('search', search);
    params.append('limit', PAGE_SIZE);
    params.append('offset', (currentPage - 1) * PAGE_SIZE);

    listEl.innerHTML = '<div class="p-8 text-center text-on-surface-variant skeleton" style="border-radius: 12px">Cargando tus movimientos...</div>';

    const res = await window.API.get(`/transacciones?${params.toString()}`);
    
    if (res.success) {
        listEl.innerHTML = '';
        
        if (res.data.length === 0) {
            listEl.innerHTML = `
                <div class="bg-surface border border-border-subtle rounded-[24px] p-8 text-center text-on-surface-variant animate-fade-in-up">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">
                        <span class="material-symbols-outlined" style="font-size:inherit">spa</span>
                    </div>
                    <p>No hay movimientos registrados en este periodo.</p>
                </div>
            `;
            updatePagination(0);
            return;
        }

        res.data.forEach(t => {
            listEl.innerHTML += renderTransaction(t);
        });
        updatePagination(res.total);
    } else {
        listEl.innerHTML = `<div class="bg-surface border border-border-subtle rounded-[24px] p-8 text-center text-expense-red">Error: ${res.error}</div>`;
    }
}

function renderTransaction(t) {
    const isIncome = t.tipo === 'income';
    const sign = isIncome ? '+' : '-';
    const amountColor = isIncome ? 'text-primary' : 'text-expense-red';
    const iconBg = isIncome ? 'bg-primary/10 border-primary/20 group-hover:border-primary/50' : 'bg-surface-container-high border-border-subtle group-hover:border-primary/30';
    const iconColor = isIncome ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary';
    
    const iconName = t.category_icon || (isIncome ? 'payments' : 'receipt_long');
    const catName = t.category_name || (isIncome ? 'Ingreso General' : 'Egreso General');
    
    const descHTML = t.descripcion 
        ? `<span class="font-data-label text-data-label text-on-surface-variant mt-1 block">${t.descripcion}</span>` 
        : '';
    
    const dateObj = new Date(t.fecha);
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
                    <span class="font-data-display text-data-display ${amountColor}">${sign}$${t.monto.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
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

function openForm() {
    const modal = document.getElementById('tx-modal');
    const form = document.getElementById('tx-form');
    
    form.reset();
    
    const today = new Date();
    const localISOTime = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    document.getElementById('tx-date').value = localISOTime;
    
    modal.classList.add('active');
    
    setTimeout(() => {
        const amountInput = document.getElementById('tx-amount');
        if (amountInput) amountInput.focus();
    }, 100);
}

async function editTransaction(id) {
    const res = await window.API.get(`/transacciones/${id}`);
    if (!res.success) return;

    const tx = res.data;
    editingId = id;

    const form = document.getElementById('tx-form');
    if (form) {
        form.type.value = tx.tipo;
        form.amount.value = tx.monto;
        form.description.value = tx.descripcion || '';
        if (form.category_id) form.category_id.value = tx.categoria_id || '';
        if (form.date) form.date.value = tx.fecha;
        if (typeof setType === 'function') {
            const btns = document.querySelectorAll('.type-btn');
            const targetBtn = Array.from(btns).find(b => b.dataset.type === tx.tipo);
            if (targetBtn) setType(tx.tipo, targetBtn);
        }
    }

    const mobileForm = document.getElementById('tx-form-mobile');
    if (mobileForm) {
        mobileForm.type.value = tx.tipo;
        mobileForm.amount.value = tx.monto;
        mobileForm.description.value = tx.descripcion || '';
        if (mobileForm.category_id) mobileForm.category_id.value = tx.categoria_id || '';
        if (mobileForm.date) mobileForm.date.value = tx.fecha;
    }

    document.querySelectorAll('.form-heading').forEach(el => el.textContent = 'Editar Movimiento');
    document.querySelectorAll('#tx-form button[type="submit"], #tx-form-mobile button[type="submit"]').forEach(btn => {
        btn.innerHTML = '<span class="material-symbols-outlined">edit</span> Actualizar Movimiento';
    });

    document.querySelectorAll('.cancel-edit').forEach(el => el.classList.remove('hidden'));
    form?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (window.innerWidth < 768) {
        document.getElementById('tx-modal')?.classList.add('active');
    }
}

function cancelEdit() {
    editingId = null;
    const form = document.getElementById('tx-form');
    if (form) form.reset();
    const mobileForm = document.getElementById('tx-form-mobile');
    if (mobileForm) mobileForm.reset();

    if (typeof setType === 'function') setType('expense', document.querySelector('.type-btn[data-type="expense"]'));

    const today = new Date();
    const localISO = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    document.querySelectorAll('#tx-date, #tx-form-mobile [name="date"]').forEach(el => { if (el) el.value = localISO; });

    document.querySelectorAll('.form-heading').forEach(el => el.textContent = 'Nuevo Movimiento');
    document.querySelectorAll('#tx-form button[type="submit"], #tx-form-mobile button[type="submit"]').forEach(btn => {
        btn.innerHTML = '<span class="material-symbols-outlined">add_circle</span> Registrar Movimiento';
    });

    document.querySelectorAll('.cancel-edit').forEach(el => el.classList.add('hidden'));
}

async function submitTransaction(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;
    
    const data = {
        tipo: form.type.value || document.getElementById('tx-type')?.value || 'expense',
        monto: parseFloat(form.amount.value),
        categoria_id: form.category_id?.value ? parseInt(form.category_id.value) : null,
        descripcion: form.description?.value || '',
        fecha: form.date?.value || new Date().toISOString().split('T')[0]
    };

    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">hourglass_top</span> Guardando...';
    btn.disabled = true;

    const res = editingId
        ? await window.API.put(`/transacciones/${editingId}`, data)
        : await window.API.post('/transacciones', data);
    
    btn.innerHTML = originalHTML;
    btn.disabled = false;

    if (res.success) {
        cancelEdit();
        document.getElementById('tx-modal')?.classList.remove('active');
        showToast('Movimiento guardado', 'success');
        loadTransactions(currentPage);
        if (typeof loadSummary === 'function') loadSummary();
    } else {
        showToast(res.error || 'Ocurrió un error al guardar el movimiento', 'error');
    }
}

async function deleteTransaction(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este movimiento? Esta acción no se puede deshacer.')) {
        return;
    }
    
    const row = document.getElementById(`tx-${id}`);
    if (row) {
        row.style.opacity = '0.4';
        row.style.pointerEvents = 'none';
    }

    const res = await window.API.delete(`/transacciones/${id}`);
    
    if (res.success) {
        showToast('Movimiento eliminado', 'success');
        loadTransactions(currentPage);
    } else {
        showToast(res.error || 'Error al eliminar', 'error');
        if (row) {
            row.style.opacity = '1';
            row.style.pointerEvents = 'auto';
        }
    }
}

window.deleteTransaction = deleteTransaction;
window.editTransaction = editTransaction;
window.cancelEdit = cancelEdit;
