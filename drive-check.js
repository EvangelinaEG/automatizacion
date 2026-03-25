require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, 'google-credentials.json');

const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

async function check() {
    console.log("Checking Google Drive contents for exact name matches...");
    try {
        // 1. Find root
        const rootResponse = await drive.files.list({
            q: `name='ministraciones' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)'
        });
        const rootFolder = rootResponse.data.files[0];
        console.log("Root Folder:", rootFolder ? rootFolder.name : "Not found");
        
        if (rootFolder) {
            // 2. Find date
            const dateResponse = await drive.files.list({
                q: `'${rootFolder.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name, createdTime)'
            });
            console.log("Folders inside ministraciones:", dateResponse.data.files);
            
            const dateFolder = dateResponse.data.files.find(f => f.name === '2026-03-25');
            if (dateFolder) {
                // 3. Find time
                const timeResponse = await drive.files.list({
                    q: `'${dateFolder.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                    fields: 'files(id, name, createdTime)'
                });
                console.log("Folders inside 2026-03-25:", timeResponse.data.files);
            }
        }
    } catch (e) {
        console.error(e);
    }
}
check();
