document.addEventListener('DOMContentLoaded', () => {
    window.checkAuth();

    const user = JSON.parse(localStorage.getItem('zen_user'));
    if (user) {
        document.getElementById('user-name').textContent = user.name.split(' ')[0];
        document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();
        
        const now = new Date();
        const monthName = now.toLocaleString('es-ES', { month: 'long' });
        document.getElementById('current-month').textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1) + ' ' + now.getFullYear();
    }

    loadSummary();

    const observer = new MutationObserver(() => {
        if (donutChart || barChart) loadSummary();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});

let donutChart = null;
let barChart = null;

const CHART_COLORS = [
    '#00e676',
    '#FFB4AB',
    '#FFD54F',
    '#54e083',
    '#2e372e',
    '#ffba79',
];

function isLightMode() {
    return document.documentElement.classList.contains('light');
}

function chartColors() {
    return isLightMode() ? {
        text: '#2A3A2A',
        muted: '#5A6E5A',
        grid: 'rgba(0,0,0,0.06)',
        tooltipBg: 'rgba(250, 251, 250, 0.95)',
        tooltipText: '#2A3A2A',
    } : {
        text: '#dbe5d9',
        muted: '#bacbb9',
        grid: 'rgba(255,255,255,0.05)',
        tooltipBg: 'rgba(26, 26, 26, 0.9)',
        tooltipText: '#F9FAFB',
    };
}

function showSkeletons() {
    document.querySelectorAll('.skeleton').forEach(el => el.style.display = 'block');
    document.querySelectorAll('[id^="val-"]').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.card-subtitle').forEach(el => el.style.display = 'none');
}

function hideSkeletons() {
    document.querySelectorAll('.skeleton').forEach(el => el.style.display = 'none');
    document.querySelectorAll('[id^="val-"]').forEach(el => el.style.display = '');
    document.querySelectorAll('.card-subtitle').forEach(el => el.style.display = '');
}

async function loadSummary() {
    showSkeletons();

    const res = await window.API.get('/transactions/summary');
    
    if (res.success) {
        const data = res.data;
        const goal = data.monthly_goal || 0;
        
        hideSkeletons();
        updateCards(data);
        renderProgress(data.total_expense, goal);
        renderDonutChart(data.by_category);
        renderBarChart(data.monthly_trend);
        renderMicroExpenses(data.micro_expenses);
    } else {
        hideSkeletons();
        console.error('Error loading summary:', res.error);
    }
}

function updateCards(data) {
    const formatCurrency = (val) => '$' + val.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    
    document.getElementById('val-income').textContent = formatCurrency(data.total_income);
    document.getElementById('val-expense').textContent = formatCurrency(data.total_expense);
    
    const accum = data.accumulated_balance || data.balance;
    document.getElementById('val-balance').textContent = formatCurrency(accum);
    const balanceEl = document.getElementById('val-balance');
    balanceEl.className = 'font-data-display text-data-display text-4xl font-bold tracking-tight mb-1';
    if (accum > 0) {
        balanceEl.classList.add('text-primary');
    } else if (accum < 0) {
        balanceEl.classList.add('text-expense-red');
    } else {
        balanceEl.classList.add('text-on-background');
    }
    
    document.getElementById('val-monthly-balance').textContent = formatCurrency(data.balance);
    const mbEl = document.getElementById('val-monthly-balance');
    if (data.balance >= 0) {
        mbEl.classList.add('text-primary');
        mbEl.classList.remove('text-expense-red');
    } else {
        mbEl.classList.add('text-expense-red');
        mbEl.classList.remove('text-primary');
    }
    
    document.getElementById('val-savings').textContent = formatCurrency(data.savings_total || 0);
}

function renderProgress(expense, goal) {
    const barEl = document.getElementById('goal-bar');
    const textPercentEl = document.getElementById('goal-text-percent');
    const textEl = document.getElementById('goal-text');
    
    if (!goal || goal <= 0) {
        barEl.style.width = '0%';
        if (textPercentEl) textPercentEl.textContent = '0%';
        textEl.innerHTML = '<span class="col-span-2">No hay meta definida. <a href="settings.html" class="text-primary hover:underline">Ir a Ajustes</a></span>';
        return;
    }
    
    const percentage = Math.min((expense / goal) * 100, 100);
    barEl.style.width = `${percentage}%`;
    
    if (percentage < 75) {
        barEl.style.backgroundColor = '#00e676';
    } else if (percentage < 90) {
        barEl.style.backgroundColor = '#FFD54F';
    } else {
        barEl.style.backgroundColor = '#FFB4AB';
    }
    
    if (textPercentEl) textPercentEl.textContent = percentage.toFixed(0) + '%';
    textEl.innerHTML = `<span>Consumido: $${expense.toLocaleString()}</span><span>Total: $${goal.toLocaleString()}</span>`;
}

function renderDonutChart(categoriesData) {
    const ctx = document.getElementById('donut-chart');
    if (!ctx) return;

    if (categoriesData.length === 0) {
        document.getElementById('donut-container').innerHTML = '<div class="flex items-center justify-center h-full text-on-surface-variant">Aún no hay gastos este mes</div>';
        return;
    }

    const labels = categoriesData.map(c => c.category_name);
    const data = categoriesData.map(c => c.total);

    if (donutChart) donutChart.destroy();

    const c = chartColors();
    Chart.defaults.color = c.muted;
    Chart.defaults.font.family = "'Hanken Grotesk', sans-serif";

    donutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: CHART_COLORS,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: c.text,
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: c.tooltipBg,
                    titleColor: c.tooltipText,
                    bodyColor: c.tooltipText,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            let val = context.raw || 0;
                            return ' $' + val.toLocaleString('es-AR', {minimumFractionDigits: 2});
                        }
                    }
                }
            }
        }
    });
}

function renderBarChart(trendData) {
    const ctx = document.getElementById('bar-chart');
    if (!ctx) return;

    if (trendData.length === 0) {
        document.getElementById('bar-container').innerHTML = '<div class="flex items-center justify-center h-full text-on-surface-variant">No hay datos históricos para mostrar</div>';
        return;
    }

    const labels = trendData.map(t => {
        const [y, m] = t.month.split('-');
        const date = new Date(y, m - 1);
        const name = date.toLocaleString('es-ES', { month: 'short' });
        return name.charAt(0).toUpperCase() + name.slice(1) + ' ' + y;
    });
    
    const incomes = trendData.map(t => t.income);
    const expenses = trendData.map(t => t.expense);

    if (barChart) barChart.destroy();

    const c = chartColors();
    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ingresos',
                    data: incomes,
                    backgroundColor: '#00e676',
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8
                },
                {
                    label: 'Egresos',
                    data: expenses,
                    backgroundColor: '#FFB4AB',
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: { color: c.text, usePointStyle: true, boxWidth: 8 }
                },
                tooltip: {
                    backgroundColor: c.tooltipBg,
                    titleColor: c.tooltipText,
                    bodyColor: c.tooltipText,
                    padding: 12,
                    callbacks: {
                        label: (ctx) => ' $' + ctx.raw.toLocaleString('es-AR', {minimumFractionDigits: 2})
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: c.grid, drawBorder: false },
                    ticks: {
                        color: c.muted,
                        callback: (value) => '$' + value.toLocaleString()
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: c.muted }
                }
            }
        }
    });
}

function renderMicroExpenses(microData) {
    const listEl = document.getElementById('micro-expenses-list');
    
    if (microData.length === 0) {
        listEl.innerHTML = `
            <div class="text-center p-4">
                <span class="text-2xl opacity-50 block mb-2">🎉</span>
                <p class="text-sm text-on-surface-variant">¡Genial! No detectamos gastos hormiga este mes.</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = '';
    
    microData.forEach((m, idx) => {
        const delay = idx < 5 ? `delay-${idx+1}` : '';
        
        listEl.innerHTML += `
            <div class="flex items-center justify-between p-3 border-b border-border-subtle last:border-0 animate-fade-in-up ${delay}">
                <div>
                    <strong class="block text-sm">${m.description}</strong>
                    <span class="text-xs text-warning-amber">Repetido ${m.count} veces</span>
                </div>
                <div class="text-right">
                    <strong class="text-expense-red block text-sm">-$${m.amount.toLocaleString('es-AR', {minimumFractionDigits:2})}</strong>
                    <span class="text-xs text-on-surface-variant">Total acumulado</span>
                </div>
            </div>
        `;
    });
}