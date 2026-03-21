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
        console.log(`Green-API: Preparando envío de archivo: ${mediaPath} a ${chatId}`);
        
        const url = `https://api.green-api.com/waInstance${idInstance}/sendFileByUpload/${apiTokenInstance}`;
        
        const fileBuffer = fs.readFileSync(mediaPath);
        const form = new FormData();
        form.append('chatId', chatId);
        form.append('file', fileBuffer, {
            filename: path.basename(mediaPath)
        });

        const response = await axios.post(url, form, {
            headers: {
                ...form.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.data && response.data.idMessage) {
            console.log(`Green-API: Enviado con éxito. ID: ${response.data.idMessage}`);
        } else {
            console.log('Green-API: Respuesta inesperada:', response.data);
        }

    } catch (error) {
        const errorDetail = error.response?.data || error.message;
        console.error(`Green-API Error al enviar ${mediaPath}:`, JSON.stringify(errorDetail, null, 2));
        throw new Error(`Green-API Error: ${JSON.stringify(errorDetail)}`);
    }
}

module.exports = {
    client,
    sendMediaToChat
};
