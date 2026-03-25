require('dotenv').config();
const axios = require('axios');

const idInstance = process.env.GREEN_API_ID_INSTANCE;
const apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE;
const chatId = process.env.WHATSAPP_GROUP_ID;

console.log("Iniciando prueba con:", {idInstance, token: apiTokenInstance ? "OK" : "MISSING", chatId});

async function testText() {
    try {
        const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
        const response = await axios.post(url, {
            chatId: chatId,
            message: "📢 Prueba del sistema de automatización - " + new Date().toLocaleString()
        });
        console.log("Respuesta Exitosa:", response.data);
    } catch (error) {
        console.log("Status Error:", error.response?.status);
        console.log("Response Data:", JSON.stringify(error.response?.data, null, 2));
        console.log("Message:", error.message);
    }
}

testText();
