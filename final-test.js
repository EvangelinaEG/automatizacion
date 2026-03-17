require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');

const GROUP_ID = process.env.WHATSAPP_GROUP_ID;

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot-ministraciones" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('ready', async () => {
    console.log('--- ENVIANDO MENSAJE DE PRUEBA FINAL ---');
    try {
        const text = `🚀 *Prueba de Sistema de Automatización*
        
✅ Sesión: *Activa y Vinculada*
🕒 Hora: ${new Date().toLocaleString('es-AR', {timeZone: 'America/Argentina/Buenos_Aires'})}
📱 Estado del teléfono: *No requiere estar encendido una vez vinculado.*

El bot ya está listo para las automatizaciones de las 09:00 y 10:00 AM.`;
        
        await client.sendMessage(GROUP_ID, text);
        console.log('Mensaje enviado con éxito al grupo.');
        process.exit(0);
    } catch (err) {
        console.error('Error al enviar mensaje:', err.message);
        process.exit(1);
    }
});

client.on('qr', () => {
    console.log('Error: La sesión no está activa. Necesitas vincular el dispositivo.');
    process.exit(1);
});

client.initialize();
