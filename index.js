require('dotenv').config();
const driveService = require('./driveService');
const whatsappService = require('./whatsappService');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const adminPanel = require('./admin-panel');

const sleep = ms => new Promise(res => setTimeout(res, ms));

const GROUP_ID = process.env.WHATSAPP_GROUP_ID;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const logFile = path.join(__dirname, 'app.log');
const historyFile = path.join(__dirname, 'history.json');

function log(message) {
    const now = new Date();
    const timestamp = now.toLocaleString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour12: false
    });
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(`[${timestamp}] ${message}`);
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

async function processMinistrations(timeString, overrideDate = null) {
    if (!GROUP_ID) {
        log("Error: WHATSAPP_GROUP_ID no está configurado en el archivo .env!");
        return;
    }

    const dateString = overrideDate || getFormattedDate();
    
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
            // Lo marcamos como procesado igual para no volver a buscar hasta maÃ±ana
            markAsSent(dateString, timeString);
            return;
        }

        // Ordenar archivos por tamaÃ±o (menor a mayor) antes de enviar
        downloadedFiles.sort((a, b) => a.size - b.size);
        log(`Archivos ordenados por tamaÃ±o: ${downloadedFiles.map(f => `${f.name} (${(f.size/1024).toFixed(1)}KB)`).join(', ')}`);

        log(`Enviando ${downloadedFiles.length} archivo(s) a WhatsApp...`);
        let successCount = 0;
        for (const fileObj of downloadedFiles) {
            try {
                if (fileObj.path) {
                    try {
                        // El archivo es pequéño y fue descargado, intentamos enviarlo
                        await whatsappService.sendMediaToChat(GROUP_ID, fileObj.path);
                        successCount++;
                        
                        // Eliminar archivo local para liberar espacio
                        if (fs.existsSync(fileObj.path)) {
                            fs.unlinkSync(fileObj.path);
                            log(`Archivo temporal eliminado: ${fileObj.path}`);
                        }
                    } catch (uploadErr) {
                        log(`Fallo envío de archivo ${fileObj.name}, usando fallback de link: ${uploadErr.message}`);
                        // FALLBACK: Si falla el envío del archivo, enviamos el link
                        const fallbackMsg = `*Aviso:* No se pudo enviar el archivo "${fileObj.name}" directamente.\nPuedes verlo aquÃ­:\n${fileObj.link}`;
                        const sendUrl = `https://api.green-api.com/waInstance${process.env.GREEN_API_ID_INSTANCE}/sendMessage/${process.env.GREEN_API_TOKEN_INSTANCE}`;
                        await axios.post(sendUrl, {
                            chatId: GROUP_ID,
                            message: fallbackMsg
                        });
                        successCount++;
                    }
                } else {
                    // El archivo es grande, enviamos el link
                    const message = `*Archivo Grande Detectado:* El archivo "${fileObj.name}" supera los 100MB.\nPuedes verlo/descargarlo aquÃ­:\n${fileObj.link}`;
                    const sendTextUrl = `https://api.green-api.com/waInstance${process.env.GREEN_API_ID_INSTANCE}/sendMessage/${process.env.GREEN_API_TOKEN_INSTANCE}`;
                    
                    await axios.post(sendTextUrl, {
                        chatId: GROUP_ID,
                        message: message
                    });
                    
                    log(`Enviado link para archivo grande: ${fileObj.name}`);
                    successCount++;
                }

                // Delay de 3 segundos entre mensajes para evitar saturaciÃ³n
                if (downloadedFiles.length > 1) {
                    log(`Esperando 3 segundos para el prÃ³ximo envÃ­o...`);
                    await sleep(3000);
                }
            } catch (err) {
                log(`Error procesando archivo ${fileObj.name}: ${err.message}`);
                // Si falla un archivo, intentamos con el siguiente
            }
        }
        
        // Solo marcamos como enviado si el 100% de los archivos de la carpeta se procesaron bien
        if (successCount === downloadedFiles.length && downloadedFiles.length > 0) {
            markAsSent(dateString, timeString);
            log(`--- Proceso finalizado exitosamente (${successCount}/${downloadedFiles.length} procesados) ---`);
        } else if (downloadedFiles.length > 0) {
            log(`--- Proceso incompleto: ${successCount}/${downloadedFiles.length} procesados. Se reintentarÃ¡ en el prÃ³ximo ciclo. ---`);
        }
        
    } catch (error) {
        log(`Error fatal en el proceso de las ${timeString}: ${error.message}`);
    }
}

if (require.main === module) {
    log('Iniciando sistema de automatizaciÃ³n...');
    whatsappService.client.initialize();
    adminPanel.startPanel();

    // ProgramaciÃ³n de las 9:00 am de Lunes a Viernes
    cron.schedule('0 9 * * *', async () => {
        log('Cron: Ejecutando tarea programada de las 9:00 am...');
        await processMinistrations('09-00');
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    // ProgramaciÃ³n de las 10:00 am de Lunes a Viernes
    cron.schedule('0 10 * * *', async () => {
        log('Cron: Ejecutando tarea programada de las 10:00 am...');
        await processMinistrations('10-00');
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    whatsappService.client.on('ready', async () => {
        // Obtenemos la hora actual en Argentina
        const argentinaTime = new Date().toLocaleString("en-US", { 
            timeZone: "America/Argentina/Buenos_Aires",
            hour12: false 
        });
        const now = new Date(argentinaTime);
        const hour = now.getHours();
        
        log(`Cliente de WhatsApp LISTO. Hora actual en Argentina: ${hour}hs.`);
        
        // VerificaciÃ³n de recuperaciÃ³n al arrancar
        if (hour >= 9) {
            log('Verificando si la tarea de las 09-00 ya se enviÃ³ hoy...');
            await processMinistrations('09-00');
        }
        if (hour >= 10) {
            log('Verificando si la tarea de las 10-00 ya se enviÃ³ hoy...');
            await processMinistrations('10-00');
        }
    });
}

module.exports = { processMinistrations };
