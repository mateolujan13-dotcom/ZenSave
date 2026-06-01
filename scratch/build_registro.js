const fs = require('fs');
const path = require('path');

let html = fs.readFileSync(path.join(__dirname, 'stitch_registro.html'), 'utf8');

// Add redirect script to head
const redirectScript = `
    <script>
        if (localStorage.getItem('zen_token')) {
            window.location.href = 'dashboard.html';
        }
    </script>
</head>`;
html = html.replace('</head>', redirectScript);

// Add form id
html = html.replace('<form class="flex flex-col gap-stack-gap relative z-10">', '<form id="register-form" class="flex flex-col gap-stack-gap relative z-10">\n<div id="register-error" class="hidden bg-error-container/20 border border-error/30 text-error p-3 rounded-lg text-sm mb-2"></div>');

// Add name attributes to inputs so auth.js FormData can pick them up
// "Nombre Completo"
html = html.replace('id="fullName"', 'id="fullName" name="name" required');
// "Correo Electrónico"
html = html.replace('id="email"', 'id="email" name="email" required');
// "Contraseña"
html = html.replace('id="password"', 'id="password" name="password" required');

// Change button to submit
html = html.replace('<button class="mt-4 w-full bg-primary-container text-on-primary-container font-headline-md text-body-md font-bold py-3 rounded-full shadow-[0_0_20px_rgba(0,230,118,0.2)] hover:shadow-[0_0_30px_rgba(0,230,118,0.4)] hover:bg-primary transition-all duration-300 active:scale-95" type="button">',
'<button class="mt-4 w-full bg-primary-container text-on-primary-container font-headline-md text-body-md font-bold py-3 rounded-full shadow-[0_0_20px_rgba(0,230,118,0.2)] hover:shadow-[0_0_30px_rgba(0,230,118,0.4)] hover:bg-primary transition-all duration-300 active:scale-95" type="submit">');

// Link back to index.html (login)
html = html.replace('href="#"', 'href="index.html"');

// Add auth scripts before </body>
const authScripts = `
<script src="js/api.js"></script>
<script src="js/auth.js"></script>
</body>`;
html = html.replace('</body>', authScripts);

fs.writeFileSync(path.join(__dirname, '../frontend/signup.html'), html);
console.log('Updated signup.html');
