const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const fs = require('fs')
const pino = require('pino')

const PREFIX = '.'
const OWNER = 'KING'
const BOTNAME = 'META JADAY'
const VERSION = 'v1.6.4'
const SIGNATURE = 'BY - © 2026 KING TECH'
const GROUP_KEY = process.env.GROUP_KEY

let ANTI_LINK = {}
let WARNINGS = {}
let WELCOME = {}

process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err))
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err))

const format = (text) => `*${text.split('\n').join('\n*')}*`

// MENU PRINCIPAL STYLE SQUIDY RX
const getSquidhyMenu = () => `
───((o ${BOTNAME} o))───
- OWNER: ${OWNER}
- VERSION: ${VERSION}
- PREFIX: ${PREFIX}
- USER: Règles interdit
- COMMAND: 222
- TODAY: ${new Date().toLocaleDateString('en-US', {weekday: 'long'})}
- DATE: ${new Date().toLocaleDateString('fr-FR')}
- PLATFORM: linux
- RUNTIME: v24.18.0
- MODE: 🟢 Public

───((o SYSTEME o))───
${PREFIX}bot-menu
${PREFIX}ping

───((o ADMIN GROUPE o))───
${PREFIX}open
${PREFIX}close
${PREFIX}kick @tag
${PREFIX}antiliink on/off
${PREFIX}warnings
${PREFIX}tagall
${PREFIX}welcome on/off

───((o IA o))───
${PREFIX}ai question

───((o OUTILS o))───
${PREFIX}vv
${PREFIX}bug-menu
`

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome')
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        
        if(qr) {
            qrcode.generate(qr, { small: true })
            console.log('QR CODE SCAN ME ↑↑')
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
