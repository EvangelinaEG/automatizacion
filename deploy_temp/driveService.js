const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, 'google-credentials.json');

const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

async function findFolder(name, parentId = null) {
    let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) {
        query += ` and '${parentId}' in parents`;
    }
    
    const response = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
    });
    
    return response.data.files.length > 0 ? response.data.files[0] : null;
}

async function getFilesInFolder(folderId) {
    const response = await drive.files.list({
        q: `'${folderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
    });
    
    return response.data.files;
}

async function downloadFile(fileId, fileName) {
    const downloadsDir = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir);
    }
    
    const filePath = path.join(downloadsDir, fileName);
    const dest = fs.createWriteStream(filePath);
    
    const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
    );
    
    return new Promise((resolve, reject) => {
        res.data
            .on('end', () => resolve(filePath))
            .on('error', err => reject(err))
            .pipe(dest);
    });
}

/**
 * Busca y descarga archivos de una carpeta específica
 * @param {string} dateString La fecha en formato YYYY-MM-DD
 * @param {string} timeString El horario en formato HH-MM (ej: "09-00")
 */
async function downloadFilesFromFolder(dateString, timeString) {
    console.log(`Buscando carpeta principal 'ministraciones'...`);
    const mainFolder = await findFolder('ministraciones');
    if (!mainFolder) {
        throw new Error('No se encontró la carpeta "ministraciones" en Google Drive.');
    }
    
    console.log(`Buscando subcarpeta con fecha ${dateString}...`);
    const dateFolder = await findFolder(dateString, mainFolder.id);
    if (!dateFolder) {
        throw new Error(`No se encontró la carpeta de la fecha "${dateString}".`);
    }
    
    console.log(`Buscando subcarpeta del horario ${timeString}...`);
    const timeFolder = await findFolder(timeString, dateFolder.id);
    if (!timeFolder) {
        throw new Error(`No se encontró la carpeta del horario "${timeString}".`);
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
        const filePath = await downloadFile(file.id, file.name);
        downloadedPaths.push(filePath);
    }
    
    return downloadedPaths;
}

module.exports = {
    downloadFilesFromFolder
};
