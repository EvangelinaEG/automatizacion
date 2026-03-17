require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const path = require('path');

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot-ministraciones" }),
    puppeteer: {
        headless: true,
        executablePath: process.env.CHROME_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('\n--- NUEVO QR GENERADO ---');
    console.log('Escanea este código con tu WhatsApp (Dispositivos vinculados > Vincular un dispositivo)\n');
    qrcode.generate(qr, { small: true });
    
    // También lo guardamos como archivo por si no se ve bien en consola
    const qrPath = path.join(__dirname, 'qr_vincular.png');
    QRCode.toFile(qrPath, qr, (err) => {
        if (!err) console.log(`\nTambién puedes ver el QR en: ${qrPath}`);
    });
});

client.on('ready', () => {
    console.log('\n---------------------------------');
    console.log('¡BOT VINCULADO CON ÉXITO Y LISTO!');
    console.log('---------------------------------');
    setTimeout(() => process.exit(0), 2000);
});

console.log('Iniciando generador de QR... Espera unos segundos.');
client.initialize();
