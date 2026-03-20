require('dotenv').config();
const driveService = require('./driveService');
const whatsappService = require('./whatsappService');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const adminPanel = require('./admin-panel');

const GROUP_ID = process.env.WHATSAPP_GROUP_ID;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const logFile = path.join(__dirname, 'app.log');
const historyFile = path.join(__dirname, 'history.json');

function log(message) {
    const timestamp = new Date().toLocaleString("es-AR", {timeZone: "America/Argentina/Buenos_Aires"});
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    try {
        fs.appendFileSync(logFile, logMessage);
    } catch (e) {
        console.error("Error writing to log file:", e.message);
    }
}

function getFormattedDate() {
    const d = new Date().toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"});
    const now = new Date(d);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isSent(dateString, timeString) {
    if (!fs.existsSync(historyFile)) return false;
    try {
        const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        return history[dateString] && history[dateString].includes(timeString);
    } catch (e) {
        return false;
    }
}

function markAsSent(dateString, timeString) {
    let history = {};
    if (fs.existsSync(historyFile)) {
        try {
            history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        } catch (e) {
            history = {};
        }
    }
    if (!history[dateString]) history[dateString] = [];
    if (!history[dateString].includes(timeString)) {
        history[dateString].push(timeString);
    }
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

async function processMinistrations(timeString) {
    if (!GROUP_ID) {
        log("Error: WHATSAPP_GROUP_ID no está configurado en el archivo .env!");
        return;
    }

    const dateString = getFormattedDate();
    
    // Evitar duplicados
    if (isSent(dateString, timeString)) {
        log(`Saltando ${timeString} - Ya fue procesado hoy.`);
        return;
    }

    try {
        log(`--- Iniciando proceso para ${dateString} a las ${timeString} ---`);
        
        const downloadedFiles = await driveService.downloadFilesFromFolder(dateString, timeString);
        
        if (downloadedFiles.length === 0) {
            log(`No se encontraron archivos en Google Drive para enviar a las ${timeString}.`);
            // Lo marcamos como procesado igual para no volver a buscar hasta mañana
            markAsSent(dateString, timeString);
            return;
        }

        log(`Enviando ${downloadedFiles.length} archivo(s) a WhatsApp...`);
        let successCount = 0;
        for (const filePath of downloadedFiles) {
            try {
                await whatsappService.sendMediaToChat(GROUP_ID, filePath);
                successCount++;
                
                // Eliminar archivo local para liberar espacio
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    log(`Archivo temporal eliminado: ${filePath}`);
                }
            } catch (err) {
                log(`Error enviando archivo ${filePath}: ${err.message}`);
                // Si falla un archivo, intentamos con el siguiente
            }
        }
        
        if (successCount > 0) {
            markAsSent(dateString, timeString);
            log(`--- Proceso finalizado exitosamente (${successCount}/${downloadedFiles.length} archivos enviados) ---`);
        } else {
            log(`--- Proceso finalizado sin archivos enviados correctamente ---`);
        }
        
    } catch (error) {
        log(`Error fatal en el proceso de las ${timeString}: ${error.message}`);
    }
}

log('Iniciando sistema de automatización...');
whatsappService.client.initialize();
adminPanel.startPanel();

// Programación de las 9:00 am de Lunes a Viernes
cron.schedule('0 9 * * *', async () => {
    log('Cron: Ejecutando tarea programada de las 9:00 am...');
    await processMinistrations('09-00');
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});

// Programación de las 10:00 am de Lunes a Viernes
cron.schedule('0 10 * * *', async () => {
    log('Cron: Ejecutando tarea programada de las 10:00 am...');
    await processMinistrations('10-00');
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});

// Tarea de limpieza semanal para no llenar el history.json (opcional)
cron.schedule('0 0 * * 0', () => {
    log('Limpiando historial antiguo...');
    // Mantener solo los últimos 30 días si se desea
    if (fs.existsSync(historyFile)) {
        fs.writeFileSync(historyFile, '{}');
    }
});

whatsappService.client.on('ready', async () => {
    // Obtenemos la fecha y hora actual en la zona horaria de Argentina
    const argentinaTime = new Date().toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"});
    const now = new Date(argentinaTime);
    const hour = now.getHours();
    const day = now.getDay(); // 0: Dom, 1: Lun, ..., 6: Sab
    
    log(`Cliente de WhatsApp LISTO. Hora local (Argentina): ${hour}hs. Día: ${day}`);
    
    // Solo días de semana (1-5)
    if (hour >= 9) {
        log('Iniciando verificación de recuperación para las 09-00...');
        await processMinistrations('09-00');
    }
    if (hour >= 10) {
        log('Iniciando verificación de recuperación para las 10-00...');
        await processMinistrations('10-00');
    }
});

module.exports = { processMinistrations };
