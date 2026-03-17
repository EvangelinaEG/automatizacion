require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');

const GROUP_ID = process.env.WHATSAPP_GROUP_ID;

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot-ministraciones" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

client.on('ready', async () => {
    console.log('--- SESIÓN ENCONTRADA Y LISTA ---');
    console.log('Enviando mensaje de confirmación al grupo...');
    try {
        await client.sendMessage(GROUP_ID, '🤖 Verificación de Automatización Automatizada: Sesión activa y lista para operar. - ' + new Date().toLocaleString());
        console.log('Mensaje enviado con éxito.');
        process.exit(0);
    } catch (err) {
        console.error('Error al enviar mensaje:', err.message);
        process.exit(1);
    }
});

client.on('qr', (qr) => {
    console.log('--- ERROR: NO SE ENCONTRÓ SESIÓN ---');
    console.log('El bot está solicitando un QR (no hay sesión activa en .wwebjs_auth).');
    process.exit(0);
});

client.on('auth_failure', (msg) => {
    console.error('--- ERROR: FALLO DE AUTENTICACIÓN ---');
    console.error(msg);
    process.exit(1);
});

setTimeout(() => {
    console.log('--- TIEMPO DE ESPERA AGOTADO ---');
    console.log('No se pudo inicializar la sesión en 90 segundos.');
    process.exit(1);
}, 90000);

console.log('Iniciando cliente con sesión guardada (esperando hasta 90s)...');
client.initialize();
