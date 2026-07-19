const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason } = require('@whiskeysockets/baileys')
const QRCode = require('qrcode')
const express = require('express')
const pino = require('pino')

const app = express()
const PORT = process.env.PORT || 3000

let latestQR = ''
let isConnected = false
let botName = 'META JADAY'

app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

app.get('/', async (req, res) => {
    const status = isConnected ? 
    `<div class="status online">🟢 En ligne</div>` : 
    `<div class="status offline">🔴 Hors ligne</div>`

    const qrSection = !isConnected && latestQR ? 
    `<img src="${latestQR}" class="qr"/><p>Scan avec WhatsApp > Appareils liés</p>` :
    `<p>En attente du QR...</p>`

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>${botName} - Panneau</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body{background:#0a0e1a;color:white;font-family:Arial;text-align:center;padding:20px}
            .box{background:#131b2e;border:1px solid #1e2a47;border-radius:15px;padding:20px;margin:15px auto;max-width:400px}
            h1{color:#00ff88}
            .status{padding:10px;border-radius:10px;font-weight:bold}
            .offline{background:#3d1f1f}
            .online{background:#1f3d2a}
            .qr{width:250px;background:white;padding:10px;border-radius:10px}
            input{width:90%;padding:12px;border-radius:8px;border:none;background:#1e2a47;color:white;margin:10px 0}
            .btn{width:90%;padding:12px;border:none;border-radius:8px;font-weight:bold;font-size:16px;cursor:pointer;margin:5px 0}
            .deploy{background:linear-gradient(90deg,#00ff88,#00cc66);color:black}
            .stop{background:#ff0044;color:white}
        </style>
    </head>
    <body>
        <div class="box">
            <h1>${botName}</h1>
            <p>Assistant Bot WhatsApp - Panneau de Controle</p>
            <p style="color:#00ff88">Par KING TECH</p>
        </div>

        <div class="box">
            ${status}
        </div>

        <div class="box">
            <h2 style="color:#00ff88">Deploiement du Bot</h2>
            <form method="POST" action="/deploy">
                <input type="text" name="number" placeholder="Ex: 237651543248" />
                <button class="btn deploy" type="submit">Deployer</button>
            </form>
            <button class="btn stop" onclick="alert('Arreter le bot depuis Render')">Arreter</button>
            ${qrSection}
        </div>
    </body>
    </html>
    `)
})

app.post('/deploy', (req, res) => {
    res.redirect('/')
})

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome')
    })

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        
        if(qr) {
            latestQR = await QRCode.toDataURL(qr)
            console.log('Nouveau QR généré')
        }
        
        if(connection === 'close') {
            isConnected = false
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut
            if(shouldReconnect) startBot()
        }
        
        if(connection === 'open') {
            isConnected = true
            latestQR = ''
            console.log('Bot connecté avec succès!')
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

app.listen(PORT, () => console.log(`Panneau lancé sur le port ${PORT}`))
startBot()
