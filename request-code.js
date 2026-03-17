require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

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

client.on('ready', () => {
    console.log('---------------------------------');
    console.log('¡CLIENTE VINCULADO CON ÉXITO!');
    console.log('---------------------------------');
    process.exit(0);
});

async function start() {
    const phoneNumber = process.env.PHONE_NUMBER;
    if (!phoneNumber) {
        console.error('ERROR: No PHONE_NUMBER in .env');
        process.exit(1);
    }

    try {
        console.log(`Iniciando flujo de vinculación para: ${phoneNumber}...`);
        
        // Inicializamos el cliente. No esperamos a que termine para pedir el código enseguida.
        console.log('Inicializando cliente en segundo plano...');
        client.initialize().catch(err => console.error('Error durante init:', err.message));
        
        console.log('Esperando breve momento para que el navegador esté listo...');
        await new Promise(r => setTimeout(r, 15000));

        console.log('Solicitando código de vinculación por número...');
        const code = await client.requestPairingCode(phoneNumber);
        
        if (code) {
            console.log('---------------------------------');
            console.log(`TU CÓDIGO DE VINCULACIÓN ES: ${code}`);
            console.log('---------------------------------');
            
            const pairingPath = path.join(__dirname, 'pairing-code.txt');
            fs.writeFileSync(pairingPath, code);
            console.log(`Guardado en ${pairingPath}`);
            console.log('Ingresa este código en WhatsApp > Vincular con número.');
        }

        // Mantener vivo (5 min) hasta que se conecte o caduque
        setTimeout(() => {
            console.log('Tiempo de espera finalizado.');
            process.exit(0);
        }, 300000);

    } catch (err) {
        console.log('---------------------------------');
        console.log('NO SE PUDO GENERAR EL CÓDIGO POR NÚMERO');
        console.log('---------------------------------');
        console.error('ERROR:', err.message);
        console.log('Te pediré que escanees el código QR tradicional en su lugar.');
        process.exit(1);
    }
}

start();
