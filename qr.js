const express = require('express');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const pino = require('pino');
const { default: Hans_Tech, useMultiFileAuthState, Browsers, delay } = require('@whiskeysockets/baileys');

const router = express.Router();

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const sessionId = Date.now().toString();
    const sessionPath = `./temp/${sessionId}`;

    async function HANS_XMD_QR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        try {
            const HansTzInc = Hans_Tech({
                auth: state,
                printQRInTerminal: false,
                logger: pino({ level: 'silent' }),
                browser: Browsers.macOS('Desktop'),
            });

            let qrSent = false;

            HansTzInc.ev.on('creds.update', saveCreds);

            HansTzInc.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                // Send QR as base64 only once
                if (qr && !qrSent && !res.headersSent) {
                    const qrImage = await QRCode.toDataURL(qr);
                    qrSent = true;
                    return res.json({ qr: qrImage });
                }

                // Connected
                if (connection === 'open') {
                    await delay(10000);

                    const credsPath = path.join(sessionPath, 'creds.json');
                    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
                    delete creds.lastPropHash;

                    const formattedCreds = JSON.stringify(creds);

                    await HansTzInc.groupAcceptInvite('Kjm8rnDFcpb04gQNSTbW2d');

                    await HansTzInc.sendMessage(HansTzInc.user.id, {
                        text: formattedCreds
                    });

                    await HansTzInc.sendMessage(HansTzInc.user.id, {
                        text: `
> Successfully Connected

> Place 📁 'sessions' folder in root directory

> Upload creds.json to sessions/creds.json

> BOT REPO: https://github.com/Mrhanstz/HANS-XMD_V2/fork

> WHATSAPP CHANNEL: https://whatsapp.com/channel/0029VasiOoR3bbUw5aV4qB31

> GITHUB: https://github.com/Mrhanstz
                        `
                    });

                    await delay(500);
                    await HansTzInc.ws.close();
                    removeFile(sessionPath);
                }

                // Reconnect on disconnection (not 401)
                if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== 401) {
                    console.log('Reconnecting...');
                    removeFile(sessionPath);
                    HANS_XMD_QR_CODE();
                }
            });

        } catch (err) {
            console.error('QR Code Error:', err);
            if (!res.headersSent) {
                res.status(500).json({ code: 'Service Unavailable' });
            }
            removeFile(sessionPath);
        }
    }

    await HANS_XMD_QR_CODE();
});

module.exports = router;