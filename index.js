const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason } = require('@whiskeysockets/baileys')
const QRCode = require('qrcode')
const fs = require('fs')
const pino = require('pino')

const PREFIX = '.'
const OWNER = 'KING'
const BOTNAME = 'META JADAY'
const VERSION = 'v1.6.4'
const SIGNATURE = 'BY - © 2026 KING TECH'

let ANTI_LINK = {}
let WARNINGS = {}
let WELCOME = {}

process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err))
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err))

const format = (text) => `*${text.split('\n').join('\n*')}*`

const getSquidhyMenu = () => `
───((o ${BOTNAME} o))───
- OWNER: ${OWNER}
- VERSION: ${VERSION}
- PREFIX: ${PREFIX}
- MODE: 🟢 Public
`

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
            const qrLink = await QRCode.toDataURL(qr)
            console.log('================================')
            console.log('SCANNE CE LIEN POUR LE QR:')
            console.log(qrLink)
            console.log('================================')
        }
        
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('Connection closed. Reconnecting...', shouldReconnect)
            if(shouldReconnect) {
                startBot()
            }
        }
        
        if(connection === 'open') {
            console.log('Bot connecté avec succès!')
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

startBot()
