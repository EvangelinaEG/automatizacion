require('dotenv').config();
const driveService = require('./driveService');
const whatsappService = require('./whatsappService');
const cron = require('node-cron');
const fs = require('fs');

const GROUP_ID = process.env.WHATSAPP_GROUP_ID;

console.log('Iniciando sistema de automatización...');

function getFormattedDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function processMinistrations(timeString) {
    if (!GROUP_ID) {
        console.error("Error: WHATSAPP_GROUP_ID no está configurado en el archivo .env!");
        return;
    }

    try {
        const dateString = getFormattedDate();
        console.log(`\n--- Iniciando proceso para ${dateString} a las ${timeString} ---`);
        
        const downloadedFiles = await driveService.downloadFilesFromFolder(dateString, timeString);
        
        if (downloadedFiles.length === 0) {
            console.log(`No se encontraron archivos para enviar hoy a las ${timeString}.`);
            return;
        }

        console.log(`Enviando ${downloadedFiles.length} archivo(s) a WhatsApp...`);
        for (const filePath of downloadedFiles) {
            await whatsappService.sendMediaToChat(GROUP_ID, filePath);
            
            // Eliminar archivo local para liberar espacio
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Archivo temporal eliminado: ${filePath}`);
            }
        }
        console.log(`--- Proceso finalizado exitosamente ---`);
    } catch (error) {
        console.error(`Error en el proceso de las ${timeString}:`, error.message);
    }
}

// Programación de las 9:00 am de Lunes a Viernes
cron.schedule('0 9 * * 1-5', async () => {
    console.log('Cron: Ejecutando tarea de las 9:00 am...');
    await processMinistrations('09-00');
});

// Programación de las 10:00 am de Lunes a Viernes
cron.schedule('0 10 * * 1-5', async () => {
    console.log('Cron: Ejecutando tarea de las 10:00 am...');
    await processMinistrations('10-00');
});

// Función auxiliar para forzar la ejecución manual de prueba (opcional)
// processMinistrations('09-00');

console.log('Scheduler configurado (Lunes a Viernes, 09:00 y 10:00). Esperando tareas...');
