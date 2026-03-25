require('dotenv').config();
const axios = require('axios');

const idInstance = process.env.GREEN_API_ID_INSTANCE;
const apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE;
const phoneNumber = process.env.PHONE_NUMBER;

// Si es un número personal, el chatId debe ser numero@c.us
const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;

console.log("Iniciando prueba directa a número:", {idInstance, chatId});

async function testDirect() {
    try {
        const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
        const response = await axios.post(url, {
            chatId: chatId,
            message: "📢 Prueba directa al administrador - " + new Date().toLocaleString()
        });
        console.log("Respuesta Exitosa:", response.data);
    } catch (error) {
        console.log("Status Error:", error.response?.status);
        console.log("Response Data:", JSON.stringify(error.response?.data, null, 2));
        console.log("Message:", error.message);
    }
}

testDirect();
