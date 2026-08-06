import express from 'express'
import QRCode from 'qrcode'
import path from 'path'
import { default as makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

const __dirname = path.resolve()
const app = express()
const PORT = 3000

let qrCodeData = null
let sock = null

app.use(express.static('public'))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.get('/qr', async (req, res) => {
    if(qrCodeData){
        const qr = await QRCode.toDataURL(qrCodeData)
        res.json({ qr })
    } else {
        res.json({ qr: null })
    }
})

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session')
    sock = makeWASocket({ auth: state, printQRInTerminal: false })

    sock.ev.on('connection.update', (update) => {
        const { qr, connection, lastDisconnect } = update
        if(qr) qrCodeData = qr
        if(connection === 'open') {
            qrCodeData = null
            console.log('✅ Connecté à WhatsApp')
        }
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode!== DisconnectReason.loggedOut
            if(shouldReconnect) startBot()
        }
    })

    sock.ev.on('creds.update', saveCreds)

    // LES 15 COMMANDES
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if(!m.message || m.key.fromMe) return
        const from = m.key.remoteJid
        const text = m.message.conversation || m.message.extendedTextMessage?.text || ''
        const cmd = text.toLowerCase().split(' ')[0]

        // 1. MENU avec logo
        if(cmd === '.menu'){
            const menu = `🔥 *META JEADY 2.0* 🔥

👑 *15 COMMANDES DISPONIBLES* 👑

1..menu - Affiche ce menu
2..ping - Test vitesse bot
3..sticker - Réponds à une image
4..viewchannel [lien] - Voir un channel
5..toimg - Sticker en image
6..yt [lien] - Télécharger audio
7..owner - Infos du créateur
8..repo - Lien du repo
9..tagall - Tag tout le groupe
10..kick @user - Expulser
11..promote @user - Admin
12..demote @user - Retirer admin
13..group open/close - Ouvrir/fermer groupe
14..antilink on/off - Anti lien
15..qc "texte" - Faire une citation

Auteur: META JEADY 👑`
            await sock.sendMessage(from, {
                image: { url: './logo.jpg' },
                caption: menu
            })
        }

        // 2. PING
        if(cmd === '.ping') await sock.sendMessage(from, { text: `Pong! ${Date.now() - m.messageTimestamp*1000}ms` })

        // 3. STICKER
        if(cmd === '.sticker' && m.message.imageMessage) {
            const buffer = await sock.downloadMediaMessage(m)
            await sock.sendMessage(from, { sticker: buffer })
        }

        // 4. VIEWCHANNEL
        if(cmd === '.viewchannel') await sock.sendMessage(from, { text: 'Fonction ViewChannel en cours...' })

        // 5. TOIMG
        if(cmd === '.toimg' && m.message.stickerMessage) {
            const buffer = await sock.downloadMediaMessage(m)
            await sock.sendMessage(from, { image: buffer })
        }

        // 6. YT
        if(cmd === '.yt') await sock.sendMessage(from, { text: 'Envoi le lien youtube après.yt' })

        // 7. OWNER
        if(cmd === '.owner') await sock.sendMessage(from, { text: '👑 Créateur: META JEADY' })

        // 8. REPO
        if(cmd === '.repo') await sock.sendMessage(from, { text: 'https://github.com/meta-jeady/mon-bot-13' })

        // 9. TAGALL
        if(cmd === '.tagall' && from.endsWith('@g.us')){
            const group = await sock.groupMetadata(from)
            const participants = group.participants.map(p => p.id)
            await sock.sendMessage(from, { text: 'TAG ALL', mentions: participants })
        }

        // 10. KICK
        if(cmd === '.kick') await sock.sendMessage(from, { text: 'Utilise:.kick @user' })

        // 11. PROMOTE
        if(cmd === '.promote') await sock.sendMessage(from, { text: 'Utilise:.promote @user' })

        // 12. DEMOTE
        if(cmd === '.demote') await sock.sendMessage(from, { text: 'Utilise:.demote @user' })

        // 13. GROUP
        if(cmd === '.group') await sock.sendMessage(from, { text: 'Utilise:.group open ou.group close' })

        // 14. ANTILINK
        if(cmd === '.antilink') await sock.sendMessage(from, { text: 'Antilink activé/désactivé' })

        // 15. QC
        if(cmd === '.qc') {
            const txt = text.replace('.qc ', '')
            await sock.sendMessage(from, { text: `💬 "${txt}"\n- META JEADY` })
        }
    })
}

startBot()
app.listen(PORT, () => console.log(`🌐 Panel: http://localhost:${PORT}`))
