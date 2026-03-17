require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');

const phoneNumber = "5493416578068";

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot-ministraciones" }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
});

async function request() {
    try {
        console.log('--- SOLICITUD DE CÓDIGO POR NÚMERO ---');
        console.log(`Número: ${phoneNumber}`);
        
        await client.initialize();
        console.log('Cliente inicializado. Esperando 30 segundos para carga total...');
        await new Promise(r => setTimeout(r, 30000));

        const page = client.pupPage;
        const url = await page.url();
        console.log(`Página actual: ${url}`);

        console.log('Intentando obtener el código de vinculación...');
        const code = await client.requestPairingCode(phoneNumber);
        
        if (code) {
            console.log('\n*************************************');
            console.log('   TU CÓDIGO DE VINCULACIÓN ES:');
            console.log('           ' + code.toUpperCase());
            console.log('*************************************\n');
            console.log('Ve a WhatsApp > Dispositivos vinculados > Vincular con número.');
        } else {
            console.log('WhatsApp no devolvió un código (recibido: null/undefined).');
        }
    } catch (err) {
        console.error('\nERROR FATAL AL OBTENER CÓDIGO:');
        console.error(err);
        if (err.stack) console.error(err.stack);
    } finally {
        // Mantenemos el proceso vivo un rato para que no cierre el navegador
        console.log('El proceso se mantendrá vivo 5 minutos...');
        setTimeout(() => process.exit(0), 300000);
    }
}

request();
