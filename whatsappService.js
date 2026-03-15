const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const path = require('path');

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot-ministraciones" }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-extensions',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote'
        ],
        // executablePath: '/usr/bin/google-chrome' // Removido para que Puppeteer use el suyo
    },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1018.571-alpha.html'
    }
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

client.on('ready', async () => {
    console.log('¡Cliente de WhatsApp está listo!');
    
    console.log('\n--- LISTA DE TUS GRUPOS ---');
    console.log('Busca el grupo al que deseas enviar y copia su ID en el archivo .env\n');
    try {
        const chats = await client.getChats();
        const groups = chats.filter(chat => chat.isGroup);
        if (groups.length === 0) {
            console.log('No tienes grupos en esta cuenta.');
        } else {
            for (const group of groups) {
                console.log(`Nombre: "${group.name}"  =>  ID: ${group.id._serialized}`);
            }
        }
        console.log('---------------------------\n');
    } catch (err) {
        console.error('Error al obtener la lista de grupos:', err);
    }
});

client.initialize();

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
