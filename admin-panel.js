const express = require('express');
const basicAuth = require('express-basic-auth');
const fs = require('fs');
const path = require('path');
const whatsappService = require('./whatsappService');

const app = express();
const PORT = process.env.PORT || 3000; // Intentamos con el puerto 3000 por defecto para evitar EACCES en servidores

// Credenciales para el panel
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

app.use(basicAuth({
    users: { [ADMIN_USER]: ADMIN_PASS },
    challenge: true,
    realm: 'Bot Admin Panel',
}));

app.get('/qr', (req, res) => {
    const qrPath = path.join(__dirname, 'qr.png');
    if (fs.existsSync(qrPath)) {
        res.sendFile(qrPath);
    } else {
        res.status(404).send('No se generó código QR aún.');
    }
});

app.get('/', (req, res) => {
    const logFile = path.join(__dirname, 'app.log');
    let logs = 'No hay logs disponibles.';
    if (fs.existsSync(logFile)) {
        logs = fs.readFileSync(logFile, 'utf8').split('\n').reverse().slice(0, 50).join('\n');
    }

    const isConnected = whatsappService.client.info ? '✅ CONECTADO' : '❌ DESCONECTADO';
    
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Panel de Control - Bot WhatsApp</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f0f2f5; color: #1c1e21; margin: 0; padding: 20px; }
                .container { max-width: 800px; margin: auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                h1 { color: #008069; }
                .status { padding: 15px; border-radius: 6px; font-weight: bold; margin-bottom: 20px; border: 1px solid #ddd; }
                .connected { background: #dcf8c6; color: #075e54; }
                .disconnected { background: #ffebee; color: #c62828; }
                .qr-container { text-align: center; background: #fff; padding: 20px; border: 1px solid #ddd; margin-bottom: 20px; border-radius: 8px; }
                .qr-container img { max-width: 250px; border: 1px solid #eee; padding: 10px; }
                pre { background: #1c1e21; color: #adbac7; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 13px; max-height: 400px; }
                .btn { display: inline-block; background: #008069; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px; border: none; cursor: pointer; }
                .btn-secondary { background: #54656f; }
                .btn:hover { opacity: 0.9; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Panel Admin de Automatización</h1>
                
                <div class="status ${whatsappService.client.info ? 'connected' : 'disconnected'}">
                    Estado actual: ${isConnected}
                </div>

                ${!whatsappService.client.info ? `
                    <div class="qr-container">
                        <h3>Escanea este código QR para conectar:</h3>
                        <img src="/qr?t=${Date.now()}" alt="QR Code" />
                        <p><small>(Si no ves el QR, espera unos segundos y refresca la página)</small></p>
                    </div>
                ` : ''}

                <h3>Acciones</h3>
                <form action="/test-now" method="POST" style="display:inline;">
                    <button class="btn">Probar Envío a Grupo Ahora</button>
                </form>
                <a href="/" class="btn btn-secondary">Actualizar Estado</a>

                <h3>Últimos logs</h3>
                <pre>${logs}</pre>
            </div>
        </body>
        </html>
    `);
});

app.post('/request-code', async (req, res) => {
    // Aquí invocamos la lógica de pairing
    console.log('--- Solicitud de código desde el panel ---');
    const phoneNumber = process.env.PHONE_NUMBER;
    if (!phoneNumber) return res.send('Error: PHONE_NUMBER no configurado.');

    try {
        const code = await whatsappService.client.requestPairingCode(phoneNumber);
        if (code) {
            const pairingPath = path.join(__dirname, 'pairing-code.txt');
            fs.writeFileSync(pairingPath, code);
        }
        res.redirect('/');
    } catch (e) {
        res.send('Error generating code: ' + e.message);
    }
});

app.post('/test-now', async (req, res) => {
    // Lógica para disparar el proceso inmediatamente
    console.log('--- Disparo manual desde el panel ---');
    const index = require('./index');
    index.processMinistrations('MANUAL-' + new Date().getHours());
    res.send('Tarea disparada. Revisa los logs en unos segundos. <a href="/">Volver</a>');
});

function startPanel() {
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`Panel de administración corriendo en puerto ${PORT}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Puerto ${PORT} ocupado, intentando con 3000...`);
            app.listen(3000);
        } else {
            console.error('Error al iniciar el panel:', err);
        }
    });
}

module.exports = { startPanel };
