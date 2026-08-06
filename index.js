const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const fs = require('fs')
const fetch = require('node-fetch')
const pino = require('pino')
const { exec } = require('child_process')
const cron = require('node-cron')

// ===== CONFIG =====
const PREFIX = '.'
const OWNER = '𝐌𝐄𝐓𝐀'
const BOTNAME = '𝚖𝚎𝚝𝚊 𝚓𝚎𝚊𝚍𝚢'
const VERSION = '𝚟2.8.0'
const LOGO_PATH = './logo.jpg'
const LOGO_URL = 'https://raw.githubusercontent.com/djogof0yet-pixel/mon-bot-13/main/logo.jpg'

// ===== AUTO TÉLÉCHARGER LE LOGO =====
async function checkLogo() {
    if (!fs.existsSync(LOGO_PATH)) {
        console.log('[LOGO] Téléchargement du logo par défaut...')
        try {
            const res = await fetch(LOGO_URL)
            const buffer = await res.buffer()
            fs.writeFileSync(LOGO_PATH, buffer)
            console.log('[LOGO] Logo téléchargé avec succès')
        } catch { 
            console.log('[LOGO] Pas de logo sur GitHub, utilisation texte') 
        }
    }
}

// ===== AUTO UPDATE SYSTEM =====
console.log('====================================')
console.log(' BOT AUTO-UPDATE ACTIVE')
console.log(' Vérification toutes les 30 minutes')
console.log('====================================')

cron.schedule('*/30 * * * *', () => { // CORRIGE ICI
    console.log('[AUTO-UPDATE] Vérification des mises à jour...')
    exec('git pull origin main', (error, stdout) => {
        if (error) return console.log('[AUTO-UPDATE] Erreur git:', error.message)
        if (stdout.includes('Already up to date')) return console.log('[AUTO-UPDATE] Déjà à jour')
        if (stdout.includes('Updating') || stdout.includes('Fast-forward')) {
            console.log('[AUTO-UPDATE] Nouvelle mise à jour trouvée!')
            console.log(stdout)
            console.log('[AUTO-UPDATE] Redémarrage dans 5 secondes...')
            setTimeout(() => process.exit(0), 5000) // PM2 va relancer
        }
    })
})

// ===== BASE DE DONNÉES =====
let AUTOAI = {}
let LAST_AI_REPLY = {}
let ANTILINK = {}
let WARNINGS = {}

process.on('unhandledRejection', (err) => console.error('Erreur:', err))

// ===== MENU AVEC LIEN EN HAUT =====
const getMenu = () => `╭───『 𝚅𝙴𝚄𝚇 𝙲𝚁𝙴𝚁 𝚃𝙾𝙽 𝙿𝚁𝙾𝙿𝚁𝙴 𝙱𝙾𝚃 』───╮
║
║ 👆 𝙲𝙻𝙸𝚀𝚄𝙴 𝙸𝙲𝙸 👆
║ https://vpron.netlify.app
║
╰───────────────────────────────────────╯

╭───『 𝚂𝚃𝚈𝙻𝙴 𝙼𝙴𝚃𝙰 𝙹𝙴𝙰𝙳𝚈 』───╮
║
║ 👑 𝙾𝚆𝙽𝙴𝚁 : ${OWNER}
║ 🤖 𝙱𝙾𝚃 : ${BOTNAME}
║ 📦 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : ${VERSION}
║ 🔖 𝙿𝚁𝙴𝙵𝙸𝚇 : ${PREFIX}
║
╰───────────────────────────╯

╭───『 𝙰𝙳𝙼𝙸𝙽 𝙶𝚁𝙾𝚄𝙿𝙴 』───╮
║
║ ${PREFIX}𝚘𝚙𝚎𝚗
║ ${PREFIX}𝚌𝚕𝚘𝚜𝚎
║ ${PREFIX}𝚔𝚒𝚌𝚔 @𝚝𝚊𝚐
║ ${PREFIX}𝚝𝚊𝚐𝚊𝚕
║ ${PREFIX}𝚒𝚗𝚟𝚒𝚝𝚎
║ ${PREFIX}𝚊𝚗𝚝𝚒𝚕𝚒𝚗𝚔 𝚘𝚗/𝚘𝚏
║
╰───────────────────────────╯

╭───『 𝙸𝙰 𝙴𝚃 𝙾𝚄𝚃𝙸𝙻𝚂 』───╮
║
║ ${PREFIX}𝚊𝚒
║ ${PREFIX}𝚊𝚞𝚝𝚘𝚊𝚒 𝚘𝚗/𝚘𝚏
║ ${PREFIX}𝚊𝚒𝚖𝚐
║ ${PREFIX}𝚟
║
╰───────────────────────────╯

╭───『 𝚂𝚈𝚂𝚃𝙴𝙼𝙴 』───╮
║
║ ${PREFIX}𝚙𝚒𝚗𝚐
║ ${PREFIX}𝚖𝚎𝚗𝚞
║ ${PREFIX}𝚞𝚙𝚍𝚊𝚝𝚎
║ ${PREFIX}𝚜𝚝𝚊𝚝𝚞𝚜
║
╰───────────────────────────╯
© 2026 ${BOTNAME}`

// ===== FONCTIONS IA =====
async function getAIResponse(text) {
    try {
        const url = `https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai-large&system=Tu es ${BOTNAME}, un assistant WhatsApp cool et humain. Réponds en 2 lignes max en français avec emoji.`
        const res = await fetch(url)
        return await res.text()
    } catch { return "⚠️ 𝙻'𝙸𝙰 𝚋𝚞𝚐 𝚛𝚎𝚜𝚊𝚒𝚎" }
}

async function generateImage(prompt) {
    try {
        const enhancedPrompt = `masterpiece, best quality, ultra detailed, highly detailed, 8k, sharp focus, professional photography, cinematic lighting, beautiful composition, ${prompt}`
        const seed = Math.floor(Math.random() * 999999)
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&model=flux&nologo=true&seed=${seed}&enhance=true`
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        if (!res.ok) throw new Error('Erreur génération')
        return await res.buffer()
    } catch (err) {
        console.error('Erreur generateImage:', err)
        throw err
    }
}

async function sendMenu(conn, from, mek) {
    const menu = getMenu()
    if (fs.existsSync(LOGO_PATH)) {
        await conn.sendMessage(from, { image: fs.readFileSync(LOGO_PATH), caption: menu }, { quoted: mek }).catch(() => conn.sendMessage(from, { text: menu }, { quoted: mek }))
    } else {
        await conn.sendMessage(from, { text: menu }, { quoted: mek })
    }
}

// ===== LANCEMENT BOT =====
async function startBot() {
    await checkLogo() // Télécharge le logo au démarrage
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const { version } = await fetchLatestBaileysVersion()

    const conn = makeWASocket({
        version,
        auth: state,
        browser: Browsers.windows('Chrome'),
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    })

    conn.ev.on('creds.update', saveCreds)

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) qrcode.generate(qr, { small: true })
        if (connection === 'open') console.log(`✅ ${BOTNAME} ${VERSION} CONNECTÉ`)
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut
            if (shouldReconnect) setTimeout(startBot, 3000)
        }
    })

    conn.ev.on('messages.upsert', async (m) => {
        if (!m.messages?.[0]?.message) return
        const mek = m.messages[0]
        const from = mek.key.remoteJid
        const sender = mek.key.participant || mek.key.remoteJid
        const isGroup = from.endsWith('@g.us')
        const isFromMe = mek.key.fromMe
        const botNumber = conn.user.id.split(':')[0]

        const body = mek.message.conversation || mek.message.extendedTextMessage?.text || ''
        const isCmd = body.startsWith(PREFIX)
        const command = isCmd? body.slice(PREFIX.length).trim().split(' ')[0].toLowerCase() : ''
        const q = isCmd? body.slice(PREFIX.length + command.length).trim() : ''
        const reply = (text, mentions = []) => conn.sendMessage(from, { text, mentions }, { quoted: mek })

        // ===== AUTO AI ANTI-SPAM =====
        if (isGroup && AUTOAI[from] &&!isCmd &&!isFromMe && body.length > 2) {
            const now = Date.now()
            if (LAST_AI_REPLY[from] && now - LAST_AI_REPLY[from] < 8000) return
            LAST_AI_REPLY[from] = now
            await conn.sendPresenceUpdate('composing', from)
            setTimeout(async () => {
                const aiReply = await getAIResponse(body)
                await conn.sendMessage(from, { text: aiReply }, { quoted: mek })
            }, 1500)
        }

        // ===== ANTI-LIEN =====
        if (isGroup && ANTILINK[from] && body) {
            if (body.includes('chat.whatsapp.com') || body.includes('wa.me')) {
                await conn.sendMessage(from, { delete: mek.key }).catch(() => {})
                const warns = (WARNINGS[sender] || 0) + 1
                WARNINGS[sender] = warns
                if (warns >= 3) {
                    await conn.groupParticipantsUpdate(from, [sender], 'remove').catch(() => {})
                    reply(`@${sender.split('@')[0]} 𝚔𝚒𝚌𝚔 𝚙𝚘𝚞𝚛 𝚕𝚒𝚎𝚗`, [sender])
                    WARNINGS[sender] = 0
                } else reply(`⚠️ 𝙻𝚒𝚎𝚗 𝚒𝚗𝚝𝚎𝚛𝚍𝚒𝚝! 𝚆𝚊𝚛𝚗 ${warns}/3 @${sender.split('@')[0]}`, [sender])
            }
        }

        // ===== COMMANDES =====
        switch (command) {
            case 'menu': await sendMenu(conn, from, mek); break

            case 'open': case 'close':
                if (!isGroup) return reply('❌ 𝚐𝚛𝚘𝚞𝚙𝚎 𝚜𝚎𝚞𝚕𝚎𝚖𝚎𝚗𝚝')
                const meta = await conn.groupMetadata(from)
                const botParticipant = meta.participants.find(p => p.id.split('@')[0] === botNumber)
                if (!botParticipant?.admin) return reply('❌ 𝙹𝚎 𝚗𝚎 𝚜𝚞𝚒𝚜 𝚙𝚊𝚜 𝚊𝚍𝚖𝚒𝚗')
                try {
                    if (command === 'open') {
                        await conn.groupSettingUpdate(from, 'not_announcement')
                        reply('✅ 𝙶𝚁𝙾𝚄𝙿𝙴 𝙾𝚄𝚅𝙴𝚁𝚃 🟢')
                    } else {
                        await conn.groupSettingUpdate(from, 'announcement')
                        reply('🔒 𝙶𝚁𝙾𝚄𝙿𝙴 𝙵𝙴𝚁𝙼𝙴́ 🔴')
                    }
                } catch { reply('❌ 𝙴𝚛𝚎𝚞𝚛 𝚆𝚑𝚊𝚝𝚜𝙰𝚙') }
                break

            case 'kick':
                if (!isGroup) return reply('❌ 𝚐𝚛𝚘𝚞𝚙𝚎 𝚜𝚎𝚞𝚕𝚎𝚖𝚎𝚗𝚝')
                const mention = mek.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
                if (!mention) return reply(`𝚞𝚜𝚊𝚐𝚎 : ${PREFIX}𝚔𝚒𝚌𝚔 @𝚝𝚊𝚐`)
                try {
                    await conn.groupParticipantsUpdate(from, [mention], 'remove')
                    reply(`✅ @${mention.split('@')[0]} 𝚔𝚒𝚌𝚔`, [mention])
                } catch { reply('❌ 𝙹𝚎 𝚗𝚎 𝚜𝚞𝚒𝚜 𝚙𝚊𝚜 𝚊𝚍𝚖𝚒𝚗') }
                break

            case 'tagall':
                if (!isGroup) return reply('❌ 𝚐𝚛𝚘𝚞𝚙𝚎 𝚜𝚎𝚞𝚕𝚎𝚖𝚎𝚗𝚝')
                const meta3 = await conn.groupMetadata(from)
                const members = meta3.participants.map(p => p.id)
                let text = `╭───『 𝚃𝙰𝙶 𝙰𝙻 』───╮\n│ 𝙶𝚁𝙾𝚄𝙿𝙴 : ${meta3.subject}\n│ 𝚃𝙾𝚃𝙰𝙻 : ${members.length}\n╰─────────────────╯\n\n`
                for (let mem of members) { text += `➥ @${mem.split('@')[0]}\n` }
                await conn.sendMessage(from, { text, mentions: members }, { quoted: mek })
                break

            case 'invite':
                if (!isGroup) return reply('❌ 𝚐𝚛𝚘𝚞𝚙𝚎 𝚜𝚎𝚞𝚕𝚎𝚖𝚎𝚗𝚝')
                const meta4 = await conn.groupMetadata(from)
                const code = await conn.groupInviteCode(from)
                const link = `https://chat.whatsapp.com/${code}`
                const objectif = meta4.participants.length + 50
                let txt = `╭───『 𝙾𝙽 𝙲𝙾𝙼𝙿𝚃𝙴 𝚂𝚄𝚁 𝚅𝙾𝚄𝚂 』───╮\n║\n║ 👑 𝙻𝚊 𝚏𝚊𝚖𝚒𝚕𝚎 𝚜'𝚊𝚐𝚛𝚊𝚗𝚍𝚒𝚝!\n║\n║ 𝙶𝚛𝚘𝚞𝚙𝚎 : *${meta4.subject}*\n║ 𝙾𝚋𝚓𝚎𝚌𝚝𝚒𝚏 : ${objectif} 𝙼𝚎𝚖𝚋𝚛𝚎𝚜 🔥\n║ 𝙰𝚌𝚝𝚞𝚎𝚕 : ${meta4.participants.length} 𝚖𝚎𝚖𝚋𝚛𝚎𝚜\n║\n║ 𝙲𝚑𝚊𝚚𝚞𝚎 𝚙𝚊𝚛𝚝𝚊𝚐𝚎 𝚌𝚘𝚖𝚙𝚝𝚎!\n║ 𝙰𝚒𝚍𝚎𝚣-𝚗𝚘𝚞𝚜 𝚊𝚝𝚎𝚒𝚗𝚍𝚛𝚎 𝚕'𝚘𝚋𝚓𝚎𝚌𝚝𝚒𝚏\n║\n║ 📎 𝚅𝚘𝚝𝚛𝚎 𝚕𝚒𝚎𝚗 𝚍'𝚒𝚗𝚟𝚒𝚝𝚊𝚝𝚒𝚘𝚗 :\n║ ${link}\n║\n╰────────────────────────────────╯\n𝙿𝚊𝚛𝚝𝚊𝚐𝚎𝚣 𝚖𝚊𝚒𝚗𝚝𝚎𝚗𝚊𝚗𝚝 👇 © ${BOTNAME}`
                await conn.sendMessage(from, { text: txt }, { quoted: mek })
                break

            case 'antilink':
                if (!isGroup) return reply('❌ 𝚐𝚛𝚘𝚞𝚙𝚎 𝚜𝚎𝚞𝚕𝚎𝚖𝚎𝚗𝚝')
                ANTILINK[from] = q === 'on'
                reply(`✅ 𝙰𝚗𝚝𝚒𝚕𝚒𝚗𝚔 : ${q === 'on'? '𝙾𝙽 🟢' : '𝙾𝙵 🔴'}`)
                break

            case 'autoai':
                if (!isGroup) return reply('❌ 𝚐𝚛𝚘𝚞𝚙𝚎 𝚜𝚎𝚞𝚕𝚎𝚖𝚎𝚗𝚝')
                AUTOAI[from] = q === 'on'
                reply(`✅ 𝙰𝚞𝚝𝚘𝙰𝙸 : ${q === 'on'? '𝙾𝙽 🟢' : '𝙾𝙵 🔴'}`)
                break

            case 'aiimg':
                if (!q) return reply(`𝚎𝚡𝚎𝚖𝚙𝚕𝚎 : ${PREFIX}𝚊𝚒𝚖𝚐 𝚞𝚗 𝚕𝚒𝚘𝚗 𝚖𝚊𝚓𝚎𝚜𝚝𝚞𝚎𝚞𝚡`)
                reply(`🎨 𝙶𝚎𝚗𝚎𝚛𝚊𝚝𝚒𝚘𝚗 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜...`)
                try {
                    const imgBuffer = await generateImage(q)
                    await conn.sendMessage(from, { image: imgBuffer, caption: `✅ 𝙿𝚛𝚘𝚖𝚙𝚝: ${q}\n© ${BOTNAME}` }, { quoted: mek })
                } catch { reply('❌ 𝙴𝚛𝚎𝚞𝚛 𝚍𝚎 𝚐𝚎𝚗𝚎𝚛𝚊𝚝𝚒𝚘𝚗') }
                break

            case 'vv':
                const quoted = mek.message.extendedTextMessage?.contextInfo?.quotedMessage
                if (!quoted) return reply('❌ 𝚁𝚎𝚙𝚘𝚗𝚍𝚜 𝚊 𝚞𝚗𝚎 𝚟𝚞𝚎 𝚞𝚗𝚎 𝚏𝚘𝚒𝚜 𝚊𝚟𝚎𝚌.𝚟𝚟')
                try {
                    const msgKey = mek.message.extendedTextMessage.contextInfo
                    const buffer = await downloadMediaMessage({ key: { remoteJid: from, id: msgKey.stanzaId }, message: quoted }, 'buffer', {}, { logger: pino() })
                    const type = Object.keys(quoted)[0]
                    const caption = `✅ 𝙳𝙴𝙱𝙻𝙾𝚀𝚄𝙴́\n© ${BOTNAME}`
                    if (type.includes('imageMessage')) await conn.sendMessage(from, { image: buffer, caption }, { quoted: mek })
                    else if (type.includes('videoMessage')) await conn.sendMessage(from, { video: buffer, caption }, { quoted: mek })
                } catch { reply('❌ 𝙴𝚛𝚎𝚞𝚛.𝚟𝚟') }
                break

            case 'ai':
                if (!q) return reply(`𝚞𝚜𝚊𝚐𝚎 : ${PREFIX}𝚊𝚒 𝚝𝚊 𝚚𝚞𝚎𝚜𝚝𝚒𝚘𝚗`)
                await conn.sendPresenceUpdate('composing', from)
                const aiReply = await getAIResponse(q)
                reply(aiReply)
                break

            case 'ping':
                const start = Date.now()
                const msg = await reply('🏓 𝙿𝚘𝚗𝚐...')
                await conn.sendMessage(from, { text: `🏓 𝙿𝚘𝚗𝚐! ${Date.now() - start}𝚖𝚜`, edit: msg.key })
                break

            case 'update':
                reply('🔄 Vérification mise à jour...')
                exec('git pull origin main', (error, stdout) => {
                    if (stdout.includes('Already up to date')) reply('✅ Déjà à jour')
                    else { reply('✅ Maj trouvée! Redémarrage...'); setTimeout(() => process.exit(0), 3000) }
                })
                break

            case 'status':
                reply(`✅ ${BOTNAME} ${VERSION}\n🔄 Auto-Update: Activé 30min\n📦 Logo: ${fs.existsSync(LOGO_PATH)? 'Trouvé ✅' : 'Manquant ❌'}`)
                break

            default: break
        }
    })
}

startBot()
