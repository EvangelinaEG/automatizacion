const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot-ministraciones" }),
    puppeteer: {
        headless: true,
        executablePath: process.env.CHROME_PATH || undefined,
        protocolTimeout: 60000,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled',
            '--no-default-browser-check',
            '--no-first-run',
            '--disable-infobars'
        ],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
    },
});

client.on('qr', (qr) => {
    console.log('--- NUEVO QR GENERADO ---');
    qrcode.generate(qr, { small: true });
    
    // Guardar QR como imagen para el usuario
    const qrPath = path.join(__dirname, 'qr.png');
    QRCode.toFile(qrPath, qr, (err) => {
        if (err) console.error('Error al guardar qr.png:', err);
        else console.log('Imagen QR guardada en:', qrPath);
    });
});

client.on('ready', () => {
    console.log('¡Cliente de WhatsApp está listo y conectado!');
});

// Comentamos la inicialización automática para controlarla desde el archivo principal
// client.initialize();

/**
 * Envía un medio a un chat
 * @param {string} chatId - El ID del chat o grupo (ej: 'xxxxxxxx@g.us')
 * @param {string} mediaPath - Ruta local del archivo
 */
async function sendMediaToChat(chatId, mediaPath) {
    try {
        console.log(`Preparando archivo para enviar: ${mediaPath}`);
        const media = MessageMedia.fromFilePath(mediaPath);
        await client.sendMessage(chatId, media);
        console.log(`Enviado correctamente: ${mediaPath} a ${chatId}`);
    } catch (error) {
        console.error(`Error al enviar ${mediaPath}:`, error);
        throw error;
    }
}

module.exports = {
    client,
    sendMediaToChat
};
