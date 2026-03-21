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
        fields: 'files(id, name)',
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
        throw new Error(`No se encontró la carpeta de la fecha "${dateString}" dentro de la carpeta principal.`);
    }
    
    console.log(`Buscando subcarpeta del horario ${timeString}...`);
    const timeFolder = await findFolder(timeString, dateFolder.id);
    if (!timeFolder) {
        throw new Error(`No se encontró la carpeta del horario "${timeString}" dentro de ${dateString}.`);
    }
    
    const files = await getFilesInFolder(timeFolder.id);
    if (files.length === 0) {
        console.log(`No hay archivos en la carpeta ${timeString}.`);
        return [];
    }
    
    console.log(`Iniciando descarga de ${files.length} archivo(s)...`);
    const downloadedPaths = [];
    for (const file of files) {
        console.log(`Descargando ${file.name}...`);
        try {
            const filePath = await downloadFile(file.id, file.name);
            downloadedPaths.push(filePath);
        } catch (err) {
            console.error(`Error al descargar ${file.name}:`, err.message);
            // Continuamos con los demás archivos
        }
    }
    
    return downloadedPaths;
}

module.exports = {
    downloadFilesFromFolder
};
