require('dotenv').config();
const { MessageMedia } = require('whatsapp-web.js');
const whatsappService = require('./whatsappService');
const fs = require('fs');
const path = require('path');

const GROUP_ID = process.env.WHATSAPP_GROUP_ID;

console.log('Iniciando cliente para prueba...');
whatsappService.client.initialize();

whatsappService.client.on('ready', async () => {
    console.log('Conectado para la prueba inmediata...');
    
    if (!GROUP_ID) {
        console.error('ERROR: No hay WHATSAPP_GROUP_ID en el .env');
        process.exit(1);
    }

    try {
        console.log(`Enviando mensaje de prueba a: ${GROUP_ID}`);
        
        // Enviar mensaje de texto
        await whatsappService.client.sendMessage(GROUP_ID, '🤖 Prueba de automatización activa - ' + new Date().toLocaleString());
        
        // Enviar un archivo si existe uno para probar
        // Usaremos qr_server.png que existe en el directorio
        const testFilePath = path.join(__dirname, 'qr_server.png');
        
        if (fs.existsSync(testFilePath)) {
            console.log('Enviando archivo de prueba...');
            const media = MessageMedia.fromFilePath(testFilePath);
            await whatsappService.client.sendMessage(GROUP_ID, media);
            console.log('Archivo enviado con éxito.');
        } else {
            console.log('No se encontró qr_server.png, solo se envió el texto.');
        }
        
        console.log('Prueba completada. Cerrando en 5 segundos...');
        setTimeout(() => process.exit(0), 5000);
    } catch (error) {
        console.error('Error en la prueba:', error);
        process.exit(1);
    }
});

whatsappService.client.on('auth_failure', (msg) => {
    console.error('Error de autenticación:', msg);
    process.exit(1);
});
