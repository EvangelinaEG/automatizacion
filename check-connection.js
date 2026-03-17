require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot-ministraciones" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('ready', () => {
    console.log('--- ESTADO DE CONEXIÓN ---');
    console.log('ESTADO: ¡Conectado y listo!');
    console.log('Información del usuario:', client.info.pushname, `(${client.info.wid.user})`);
    console.log('---------------------------');
    process.exit(0);
});

client.on('auth_failure', (msg) => {
    console.log('--- ESTADO DE CONEXIÓN ---');
    console.log('ESTADO: Error de autenticación.');
    console.log('Detalle:', msg);
    console.log('---------------------------');
    process.exit(1);
});

setTimeout(() => {
    console.log('--- ESTADO DE CONEXIÓN ---');
    console.log('ESTADO: Tiempo de espera agotado (no se detectó conexión activa).');
    console.log('---------------------------');
    process.exit(1);
}, 30000);

console.log('Verificando sesión existente...');
client.initialize();
