const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const fetch = require('node-fetch')
const { exec } = require('child_process')
const cron = require('node-cron')

// ===== CONFIG =====
const PREFIX = '.'
const OWNER = 'META'
const BOTNAME = 'meta jeady'
const VERSION = 'v2.0'
const LOG0_PATH = './logo.jpg'
const LOGO_URL = 'https://raw.githubusercontent.com/djogofyet-pixel/mon-bot-13/main/logo.jpg'

// ===== AUTO TELECHARGER LE LOGO =====
async function checkLogo() {
    if (!fs.existsSync(LOG0_PATH)) {
        console.log(`[LOGO] Téléchargement du logo par défaut...`)
        try {
            const res = await fetch(LOGO_URL)
            const buffer = await res.buffer()
            fs.writeFileSync(LOG0_PATH, buffer)
            console.log(`[LOGO] Logo telechargé avec succes`)
        } catch {
            console.log(`[LOGO] Pas de logo sur Github, utilisation texte`)
        }
    }
}

// ===== AUTO UPDATE SYSTEM =====
console.log('=========================================')
console.log(` BOT AUTO-UPDATE ACTIVE`)
console.log(` Vérification toutes les 30 minutes`)
console.log('=========================================')

cron.schedule('*/30 *', () => {
    console.log(`[AUTO-UPDATE] Verification des mises a jour...`)
    exec(`git pull origin main`, (error, stdout) => {
        if (error) return console.log(`[AUTO-UPDATE] Erreur git:`, error.message)
        if (stdout.includes('Already up to date')) return console.log(`[AUTO-UPDATE] Deja a jour`)
        if (stdout.includes('Updating')) { 
            console.log(`[AUTO-UPDATE] Nouvelle mise a jour trouvee`)
            console.log(stdout)
            console.log(`[AUTO-UPDATE] Redemarrage dans 5 secondes...`)
            setTimeout(() => process.exit(0), 5000)
        }
    })
})

// ===== BASE DE DONNEES =====
let AUTOAI = {}
let LAST_AI_REPLY = {}
let ANTI1LIN = {}
let WARNINGS = {}

process.on('unhandledRejection', err => console.error(`Erreur:`, err))

// ===== MENU AVEC LIEN EN HAUT =====
const getMenu = () => { 
`╭─❏ *${BOTNAME.toUpperCase()} ${VERSION}* ❏
│
├ *⚡ GÉNÉRAL*
│ •.menu - Affiche ce menu
│ •.ping - Vérifier si le bot est en ligne
│ •.vv - Voir message vue unique
│
├ *👥 ADMIN GROUPE*
│ •.open - Ouvrir le groupe
│ •.close - Fermer le groupe
│ •.tagall - Mentionner tout le monde
│ •.kick @user - Expulser un membre
│ •.invite - Obtenir lien du groupe
│
├ *🤖 IA & UTILS*
│ •.ai <texte> - Parler avec l'IA
│ •.aiimg <desc> - Générer image IA
│ •.sticker - Transformer image en sticker
│ •.pub - Générer une pub
│
├ *⚙️ SYSTÈME*
│ •.ping - Vitesse du bot
│ •.menu - Ce menu
│ •.update - Mettre à jour le bot
│ •.status - Statut du bot
│
╰─❏ *👑 By ${OWNER}*`
}

// ===== STYLE META JEADY =====
const style = {
    CMD: `${PREFIX}commande`,
    BOT: BOTNAME,
    VERSION: VERSION,
    PREFIX: PREFIX
}

// ===== ADMIN GROUPE =====
const adminCmds = `
${PREFIX}open
${PREFIX}close
${PREFIX}tagall
${PREFIX}kick
${PREFIX}invite
${PREFIX}antilink on/off
`

// ===== IA ET OUTILS =====
const aiCmds = `
${PREFIX}ai
${PREFIX}aiimg
${PREFIX}ping
${PREFIX}vv
`

// ===== SYSTEME =====
const sysCmds = `
${PREFIX}ping
${PREFIX}menu
${PREFIX}update
${PREFIX}status
`

// ===== FONCTIONS IA =====
async function getAIResponse(text) {
    try {
        const url = `https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai-large&system=Tu es ${BOTNAME}.`
        const res = await fetch(url)
        return await res.text()
    } catch { 
        return `La IA bug ooooh` 
    }
}

async function generateImage(prompt) {
    try {
        const enhancedPrompt = `masterpiece, best quality, ultra detailed, highly detailed, 8k, sharp focus, professional ${prompt}`
        const seed = Math.floor(Math.random() * 99999)
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&seed=${seed}`
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        if (!res.ok) throw new Error('Erreur generation')
        return await res.buffer()
    } catch (err) {
        console.error('Erreur generateImage:', err)
        throw err
    }
}

async function sendMenu(conn, from, mek) {
    const menu = getMenu()
    if (fs.existsSync(LOG0_PATH)){
        await conn.sendMessage(from, { image: fs.readFileSync(LOG0_PATH), caption: menu }, { quoted: mek }).catch(() => conn.sendMessage(from, { text: menu }, { quoted: mek }))
    } else {
        await conn.sendMessage(from, { text: menu }, { quoted: mek })
    }
}

// ===== LANCEMENT BOT =====
async function startBot() {
    await checkLogo()
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const { version } = await fetchLatestBaileysVersion()

    const conn = makeWASocket({
        version,
        state,
        browser: Browsers.windows('Chrome'),
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    })

    conn.ev.on('creds.update', saveCreds)

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'open') console.log(`[${BOTNAME} ${VERSION}] CONNECTE`)
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut
            if (shouldReconnect) setTimeout(() => startBot(), 3000)
        }
    })

    conn.ev.on('messages.upsert', async (m) => {
        if (!m.messages[0]) return
        const msg = m.messages[0]
        const from = msg.key.remoteJid
        const sender = msg.key.participant || msg.key.remoteJid
        const isGroup = from.endsWith('@g.us')
        const isFromMe = msg.key.fromMe
        const botNumber = conn.user.id.split(':')[0]

        const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
        const isCmd = body.startsWith(PREFIX)
        const command = isCmd? body.slice(PREFIX.length).trim().split(' ')[0].toLowerCase() : ''
        const q = isCmd? body.slice(PREFIX.length + command.length).trim() : ''
        const reply = (text, mentions = []) => conn.sendMessage(from, { text, mentions }, { quoted: msg })

        // ===== COMMANDES =====
        switch (command) {
            case 'menu': 
                await sendMenu(conn, from, msg)
                break

            case 'open':
                if (!isGroup) return reply(`❌ groupe seulement`)
                await conn.groupSettingUpdate(from, 'not_announcement')
                reply(`✅ GROUPE OUVERT`)
                break

            case 'close':
                if (!isGroup) return reply(`❌ groupe seulement`)
                await conn.groupSettingUpdate(from, 'announcement')
                reply(`🔒 GROUPE FERME`)
                break

            case 'kick':
                if (!isGroup) return reply(`❌ groupe seulement`)
                const mention = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
                if (!mention) return reply(`Exemple: ${PREFIX}kick @tag`)
                await conn.groupParticipantsUpdate(from, [mention], 'remove')
                reply(`✅ @${mention.split('@')[0]} kick`, [mention])
                break

            case 'tagall':
                if (!isGroup) return reply(`❌ groupe seulement`)
                const meta = await conn.groupMetadata(from)
                let members = meta.participants.map(p => p.id)
                let text = `╭─❏ TAG ALL ❏\n│ GROUPE: ${meta.subject}\n│ TOTAL: ${members.length}\n╰────────\n`
                for (let mem of members) { text += ` @${mem.split('@')[0]}\n` }
                await conn.sendMessage(from, { text, mentions: members }, { quoted: msg })
                break

            case 'invite':
                if (!isGroup) return reply(`❌ groupe seulement`)
                const met = await conn.groupMetadata(from)
                const code = await conn.groupInviteCode(from)
                const link = 'https://chat.whatsapp.com/'+code
                let txt = `╭─❏ ON COMPTE SUR VOUS ❏\n│ La famille s'agrandit!\n│ Groupe: ${met.subject}\n╰─❏ ${link}`
                await conn.sendMessage(from, { text: txt }, { quoted: msg })
                break

            case 'vv':
                const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage
                if (!quoted) return reply(`Réponds a une vue une fois avec.vv`)
                try {
                    const msgKey = msg.message.extendedTextMessage.contextInfo
                    const buffer = await downloadMediaMessage({ key: msgKey, message: quoted }, 'buffer', {}, { reuploadRequest: conn.updateMediaMessage })
                    const type = Object.keys(quoted)[0]
                    if (type.includes('imageMessage')) await conn.sendMessage(from, { image: buffer, caption: `👁️ ${BOTNAME}` }, { quoted: msg })
                    else if (type.includes('videoMessage')) await conn.sendMessage(from, { video: buffer, caption: `👁️ ${BOTNAME}` }, { quoted: msg })
                } catch { 
                    reply(`❌ Erreur vv`)
                }
                break

            case 'ai':
                if (!q) return reply(`Exemple: ${PREFIX}ai ta question`)
                await conn.sendPresenceUpdate('composing', from)
                const aiReply = await getAIResponse(q)
                reply(aiReply)
                break

            case 'aiimg':
                if (!q) return reply(`Exemple: ${PREFIX}aiimg un lion majestueux`)
                reply(`🎨 Generation en cours...`)
                try {
                    const imgBuffer = await generateImage(q)
                    await conn.sendMessage(from, { image: imgBuffer, caption: `Prompt: ${q}\n${BOTNAME}` }, { quoted: msg })
                } catch { 
                    reply(`❌ Erreur de generation`)
                }
                break

            case 'ping':
                const start = Date.now()
                const msgP = await reply(`🏓 Ping...`)
                await conn.sendMessage(from, { text: `🏓 Pong! ${Date.now() - start}ms` }, { edit: msgP.key })
                break

            case 'update':
                reply(`🔄 Verification mise a jour...`)
                exec(`git pull origin main`, (error, stdout) => {
                    if (stdout.includes('Already up to date')) reply(`✅ Déjà à jour`)
                    else { 
                        reply(`✅ Maj trouvée! Redemarrage...`)
                        setTimeout(() => process.exit(0), 3000) 
                    }
                })
                break

            case 'status':
                reply(`*${BOTNAME}* ${VERSION}\nAuto-Update: Active 30min\nLogo: ${fs.existsSync(LOG0_PATH)? 'Trouvé' : 'Non trouvé'}`)
                break

            default: break
        }
    })
}

startBot()
