const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot-ministraciones" }),
    puppeteer: {
        headless: true, // REQUERIDO: true en Linux Server
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-extensions'
        ]
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    webVersionCache: {
        type: 'none'
    }
});

client.on('qr', (qr) => {
    console.log('--- REINTENTANDO VINCULACIÓN ---');
    console.log('Por favor escanea el NUEVO QR que aparecerá abajo:');
    qrcode.generate(qr, { small: true });
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
