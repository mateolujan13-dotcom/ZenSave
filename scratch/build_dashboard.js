const fs = require('fs');
const path = require('path');

const stitchFile = path.join(__dirname, 'stitch_dashboard.html');
const outFile = path.join(__dirname, '../frontend/dashboard.html');

let html = fs.readFileSync(stitchFile, 'utf8');

// 1. Inyectar librerías en el <head>
const headInjections = `
    <!-- CSS Adicional -->
    <link rel="stylesheet" href="css/variables.css">
    <link rel="stylesheet" href="css/components.css">
    
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <script src="js/api.js"></script>
    <script src="js/auth.js"></script>
    <script>
        // Verificar autenticación
        window.checkAuth();
    </script>
</head>`;
html = html.replace('</head>', headInjections);

// 2. Modificar Enlaces (Desktop SideNav y Mobile BottomNav)
html = html.replace(/href="#"(.*?)>\s*<span class="material-symbols-outlined.*?>space_dashboard<\/span>\s*Sanctuary/g, 'href="dashboard.html"$1>\n<span class="material-symbols-outlined">grid_view</span>\nResumen');
html = html.replace(/href="#"(.*?)>\s*<span class="material-symbols-outlined.*?>auto_graph<\/span>\s*Flow/g, 'href="dashboard.html#insights"$1>\n<span class="material-symbols-outlined">insights</span>\nMétricas');
html = html.replace(/href="#"(.*?)>\s*<span class="material-symbols-outlined.*?>query_stats<\/span>\s*Insight/g, 'href="transactions.html"$1>\n<span class="material-symbols-outlined">receipt_long</span>\nMovimientos');
html = html.replace(/href="#"(.*?)>\s*<span class="material-symbols-outlined.*?>history<\/span>\s*Archive/g, 'href="ai.html"$1>\n<span class="material-symbols-outlined">smart_toy</span>\nAsesor ZEN');
html = html.replace(/href="#"(.*?)>\s*<span class="material-symbols-outlined.*?>psychology<\/span>\s*Presence/g, 'href="settings.html"$1>\n<span class="material-symbols-outlined">settings</span>\nAjustes');
// Ajustes y Logout (Desktop)
html = html.replace(/href="#"(.*?)>\s*<span class="material-symbols-outlined text-sm">settings<\/span>\s*<span class="text-sm">Settings<\/span>/g, 'href="settings.html"$1>\n<span class="material-symbols-outlined text-sm">settings</span>\n<span class="text-sm">Ajustes</span>');
html = html.replace(/href="#"(.*?)>\s*<span class="material-symbols-outlined text-sm">logout<\/span>\s*<span class="text-sm">Logout<\/span>/g, 'href="#" onclick="handleLogout()"$1>\n<span class="material-symbols-outlined text-sm">logout</span>\n<span class="text-sm">Cerrar Sesión</span>');

// Summon AI (Desktop)
html = html.replace(/<button class="w-full bg-primary-container.*?Summon AI\s*<\/button>/s, '<a href="ai.html" class="w-full bg-primary-container text-on-primary-container py-3 rounded-full font-bold shadow-sm hover:shadow-md transition-shadow flex items-center justify-center gap-2 neon-btn-glow">\n<span class="material-symbols-outlined text-sm">smart_toy</span>\nAsesor ZEN\n</a>');

// Mobile Bottom Nav
html = html.replace(/href="#"(.*?)>\s*<span class="material-symbols-outlined.*?space_dashboard<\/span>\s*<span class="font-data-label text-\[10px\] mt-1">Sanctuary<\/span>/g, 'href="dashboard.html"$1>\n<span class="material-symbols-outlined">grid_view</span>\n<span class="font-data-label text-[10px] mt-1">Resumen</span>');
html = html.replace(/href="#"(.*?)>\s*<span class="material-symbols-outlined.*?auto_graph<\/span>\s*<span class="font-data-label text-\[10px\] mt-1">Flow<\/span>/g, 'href="dashboard.html#insights"$1>\n<span class="material-symbols-outlined">insights</span>\n<span class="font-data-label text-[10px] mt-1">Métricas</span>');
html = html.replace(/href="#"(.*?)>\s*<span class="material-symbols-outlined.*?query_stats<\/span>\s*<span class="font-data-label text-\[10px\] mt-1">Insight<\/span>/g, 'href="transactions.html"$1>\n<span class="material-symbols-outlined">receipt_long</span>\n<span class="font-data-label text-[10px] mt-1">Movimientos</span>');
html = html.replace(/href="#"(.*?)>\s*<span class="material-symbols-outlined.*?history<\/span>\s*<span class="font-data-label text-\[10px\] mt-1">Archive<\/span>/g, 'href="settings.html"$1>\n<span class="material-symbols-outlined">settings</span>\n<span class="font-data-label text-[10px] mt-1">Ajustes</span>');
// Mobile FAB -> AI
html = html.replace(/<button class="w-12 h-12 rounded-full bg-primary.*?<\/button>/s, '<a href="ai.html" class="w-12 h-12 rounded-full bg-primary text-on-primary-fixed flex items-center justify-center shadow-lg -mt-6 neon-btn-glow border-4 border-background">\n<span class="material-symbols-outlined">smart_toy</span>\n</a>');

// 3. Inyectar IDs
html = html.replace('Hola de nuevo, Alex', 'Resumen de <span id="current-month" class="text-primary">...</span></h2>\n<p class="text-on-surface-variant mt-1">Hola de nuevo, <span id="user-name" class="font-bold text-on-surface">Usuario</span>. Aquí está el flujo de tu energía financiera.');
html = html.replace('<div class="font-data-display text-data-display text-primary text-3xl font-bold tracking-tight mb-1">$5,240.00</div>', '<div id="val-income" class="font-data-display text-data-display text-primary text-3xl font-bold tracking-tight mb-1">$0.00</div>');
html = html.replace('<div class="font-data-display text-data-display text-expense-red text-3xl font-bold tracking-tight mb-1">$3,120.50</div>', '<div id="val-expense" class="font-data-display text-data-display text-expense-red text-3xl font-bold tracking-tight mb-1">$0.00</div>');
html = html.replace('<div class="font-data-display text-data-display text-on-background text-4xl font-bold tracking-tight mb-1">$2,119.50</div>', '<div id="val-balance" class="font-data-display text-data-display text-on-background text-4xl font-bold tracking-tight mb-1">$0.00</div>');
html = html.replace('<div class="w-8 h-8 rounded-full bg-surface-variant overflow-hidden border border-border-subtle ml-2">', '<div id="user-avatar" class="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm ml-2">U</div><div class="hidden">');

// 4. Modificar gráficos para usar Chart.js (Opción B)
html = html.replace(/<div class="flex-1 relative flex items-end justify-between pt-8 pb-6 border-b border-white\/5 h-48">.*?<\/div>\s*<\/div>/s, '<div class="h-[250px] w-full" id="bar-container">\n<canvas id="bar-chart"></canvas>\n</div>\n</div>');
html = html.replace(/<div class="w-32 h-32 donut-chart mb-4 shadow-\[0_0_20px_rgba\(0,0,0,0.5\)\]">.*?<\/div>\s*<\/div>/s, '<div class="flex-1 min-h-[150px] relative w-full flex items-center justify-center" id="donut-container">\n<canvas id="donut-chart"></canvas>\n</div>\n');

// 5. Presupuesto
html = html.replace('<span class="font-data-display text-data-display text-sm text-on-background">75%</span>', '<span id="goal-text-percent" class="font-data-display text-data-display text-sm text-on-background"></span>');
html = html.replace('<div class="bg-primary h-3 rounded-full progress-fill shadow-[0_0_10px_rgba(117,255,158,0.5)]" style="width: 75%;"></div>', '<div id="goal-bar" class="bg-primary h-3 rounded-full progress-fill shadow-[0_0_10px_rgba(117,255,158,0.5)]" style="width: 0%;"></div>');
html = html.replace('<span>Consumido: $3,000</span>\n<span>Total: $4,000</span>', '<span id="goal-text" class="col-span-2">Cargando presupuesto...</span>');

// 6. Gastos Hormiga
html = html.replace(/<ul class="space-y-4">.*?<\/ul>/s, '<ul id="micro-expenses-list" class="space-y-4 max-h-[250px] overflow-y-auto pr-2">\n<li class="p-4 bg-background/50 rounded-xl animate-pulse h-16"></li>\n</ul>');

// 7. Footer scripts
html = html.replace('</body>', `
    <div id="toast-container" class="toast-container"></div>
    <script src="js/dashboard.js"></script>
    <script>
        function handleLogout() {
            if (confirm('¿Estás seguro de que quieres cerrar la sesión de tu santuario?')) {
                window.logout();
            }
        }
    </script>
</body>`);

fs.writeFileSync(outFile, html);
console.log('Dashboard successfully built!');
