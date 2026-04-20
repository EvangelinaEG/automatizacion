const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
const EventEmitter = require('events');

// Mock del cliente para mantener compatibilidad con index.js
class ClientMock extends EventEmitter {
    constructor() {
        super();
        this.info = { pushname: 'Bot Admin', platform: 'Green-API' };
    }
    initialize() {
        console.log('--- Green-API Client Initialized ---');
        // Emitimos ready casi de inmediato ya que es una API REST
        setTimeout(() => this.emit('ready'), 2000);
    }
}

const client = new ClientMock();

const idInstance = process.env.GREEN_API_ID_INSTANCE;
const apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE;

/**
 * Envía un medio a un chat usando Green-API (sendFileByUpload)
 * @param {string} chatId - El ID del chat o grupo (ej: 'xxxxxxxx@g.us')
 * @param {string} mediaPath - Ruta local del archivo
 */
async function sendMediaToChat(chatId, mediaPath) {
    try {
        console.log(`Green-API: Preparando envío de archivo (2-pasos): ${mediaPath} a ${chatId}`);
        
        // Paso 1: Subir el archivo para obtener una URL interna
        let fileName = path.basename(mediaPath);
        if (fileName.toLowerCase().endsWith('.mpeg')) {
            fileName = fileName.replace(/\.mpeg$/i, '.mp4');
            console.log(`Green-API: Tratando .mpeg como .mp4 para compatibilidad: ${fileName}`);
        }

        const uploadUrl = `https://api.green-api.com/waInstance${idInstance}/uploadFile/${apiTokenInstance}`;
        const fileBuffer = fs.readFileSync(mediaPath);
        const uploadForm = new FormData();
        uploadForm.append('file', fileBuffer, {
            filename: fileName
        });

        const uploadResponse = await axios.post(uploadUrl, uploadForm, {
            headers: {
                ...uploadForm.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (!uploadResponse.data || !uploadResponse.data.urlFile) {
            throw new Error(`Error al subir archivo a Green-API: ${JSON.stringify(uploadResponse.data)}`);
        }

        const urlFile = uploadResponse.data.urlFile;
        console.log(`Green-API: Archivo subido con éxito. URL: ${urlFile}`);

        // Paso 2: Enviar el archivo usando la URL obtenida
        const sendUrl = `https://api.green-api.com/waInstance${idInstance}/sendFileByUrl/${apiTokenInstance}`;
        const sendResponse = await axios.post(sendUrl, {
            chatId: chatId,
            urlFile: urlFile,
            fileName: fileName
        });

        if (sendResponse.data && sendResponse.data.idMessage) {
            console.log(`Green-API: Enviado con éxito. ID: ${sendResponse.data.idMessage}`);
            return sendResponse.data;
        } else {
            console.log('Green-API: Respuesta inesperada:', JSON.stringify(sendResponse.data));
            return sendResponse.data;
        }

    } catch (error) {
        const errorDetail = error.response?.data || error.message;
        const status = error.response?.status || 'N/A';
        console.error(`Green-API Error [${status}] al enviar ${mediaPath}:`, JSON.stringify(errorDetail, null, 2));
        throw new Error(`Green-API Error [${status}]: ${JSON.stringify(errorDetail)}`);
    }
}

module.exports = {
    client,
    sendMediaToChat
};
