const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, 'google-credentials.json');
const SHARED_DRIVE_FOLDER_ID = process.env.SHARED_DRIVE_FOLDER_ID || null;

const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

/**
 * Busca una carpeta por nombre, opcionalmente dentro de una carpeta padre.
 * Soporta Unidades Compartidas.
 */
async function findFolder(name, parentId = null) {
    let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) {
        query += ` and '${parentId}' in parents`;
    }
    
    const response = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });
    
    return response.data.files.length > 0 ? response.data.files[0] : null;
}

/**
 * Obtiene los archivos dentro de una carpeta.
 * Soporta Unidades Compartidas.
 */
async function getFilesInFolder(folderId) {
    const response = await drive.files.list({
        q: `'${folderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name, size, webViewLink)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });
    
    return response.data.files;
}

/**
 * Descarga un archivo por su ID.
 * Soporta Unidades Compartidas.
 */
async function downloadFile(fileId, fileName) {
    const downloadsDir = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir);
    }
    
    const filePath = path.join(downloadsDir, fileName);
    const dest = fs.createWriteStream(filePath);
    
    const res = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' }
    );
    
    return new Promise((resolve, reject) => {
        dest.on('finish', () => {
            dest.close();
            resolve(filePath);
        });
        dest.on('error', err => {
            fs.unlink(filePath, () => reject(err));
        });
        res.data.on('error', err => {
            reject(err);
        });
        res.data.pipe(dest);
    });
}

/**
 * Busca y descarga archivos de una carpeta específica
 * Estructura esperada: ministraciones (o SHARED_DRIVE_FOLDER_ID) / YYYY-MM-DD / HH-MM
 * @param {string} dateString La fecha en formato YYYY-MM-DD
 * @param {string} timeString El horario en formato HH-MM (ej: "09-00")
 */
async function downloadFilesFromFolder(dateString, timeString) {
    let mainFolderId = SHARED_DRIVE_FOLDER_ID;
    
    if (!mainFolderId) {
        console.log(`Buscando carpeta principal 'ministraciones' en la raíz...`);
        const folder = await findFolder('ministraciones');
        if (!folder) {
            throw new Error('No se encontró la carpeta "ministraciones" en Google Drive y no hay SHARED_DRIVE_FOLDER_ID configurado.');
        }
        mainFolderId = folder.id;
    } else {
        console.log(`Usando ID de carpeta principal configurado en .env: ${mainFolderId}`);
    }
    
    console.log(`Buscando subcarpeta con fecha ${dateString}...`);
    const dateFolder = await findFolder(dateString, mainFolderId);
    if (!dateFolder) {
        console.log(`No se encontró la carpeta de la fecha "${dateString}".`);
        return [];
    }
    
    console.log(`Buscando subcarpeta del horario ${timeString}...`);
    const timeFolder = await findFolder(timeString, dateFolder.id);
    if (!timeFolder) {
        console.log(`No se encontró la carpeta del horario "${timeString}" para la fecha ${dateString}.`);
        return [];
    }
    
    const files = await getFilesInFolder(timeFolder.id);
    if (files.length === 0) {
        console.log(`No hay archivos en la carpeta ${timeString}.`);
        return [];
    }
    
    console.log(`Iniciando descarga de ${files.length} archivo(s)...`);
    const downloadedResults = [];
    for (const file of files) {
        console.log(`Procesando ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`);
        try {
            // Solo descargamos si el tamaño es razonable para enviar por WhatsApp (< 100MB)
            // Pero igual retornamos la info para que el bot decida
            let filePath = null;
            if (parseInt(file.size) < 100 * 1024 * 1024) {
                filePath = await downloadFile(file.id, file.name);
            } else {
                console.log(`Archivo demasiado grande para descargar: ${file.name}`);
            }

            downloadedResults.push({
                path: filePath,
                name: file.name,
                size: parseInt(file.size),
                link: file.webViewLink
            });
        } catch (err) {
            console.error(`Error al procesar ${file.name}:`, err.message);
        }
    }
    
    return downloadedResults;
}

module.exports = {
    downloadFilesFromFolder
};
