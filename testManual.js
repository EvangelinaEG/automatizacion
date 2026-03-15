require('dotenv').config();
const driveService = require('./driveService');
const whatsappService = require('./whatsappService');
const fs = require('fs');

const GROUP_ID = process.env.WHATSAPP_GROUP_ID;

// Reutilizamos la misma lógica que index.js para probar
function getFormattedDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function runTest(timeString) {
    if (!GROUP_ID) {
        console.error("Error: WHATSAPP_GROUP_ID no está configurado en .env!");
        process.exit(1);
    }
    
    try {
        const dateString = getFormattedDate();
        console.log(`\n--- MODO DE PRUEBA MANUAL ---`);
        console.log(`Buscando fecha de hoy: ${dateString}`);
        console.log(`Buscando carpeta de la hora: ${timeString}`);
        
        const downloadedFiles = await driveService.downloadFilesFromFolder(dateString, timeString);
        
        if (downloadedFiles.length === 0) {
            console.log(`No se encontraron archivos en Google Drive para enviar.`);
            process.exit(0);
        }

        console.log(`Enviando ${downloadedFiles.length} archivo(s) a WhatsApp...`);
        for (const filePath of downloadedFiles) {
            await whatsappService.sendMediaToChat(GROUP_ID, filePath);
            
            // Eliminar archivo local
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Archivo temporal eliminado: ${filePath}`);
            }
        }
        console.log(`--- Prueba manual finalizada exitosamente ---`);
        process.exit(0);
    } catch (error) {
        console.error('Error durante la prueba:', error.message);
        process.exit(1);
    }
}

// Ejecutamos la prueba con la hora que le pasemos por comando o por defecto 09-00
whatsappService.client.on('ready', async () => {
    // Cuando whatsapp inicie, corremos el test inmediatamente
    const timeToTest = process.argv[2] || '09-00';
    await runTest(timeToTest);
});
