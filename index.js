const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const fs = require('fs')
const fetch = require('node-fetch')
const pino = require('pino')

const PREFIX = '.'
const OWNER = 'KČØ4P'
const BOTNAME = 'META JEADY'
const VERSION = 'v2.6.4'
const SIGNATURE = '> BY : _© 2026 KČØ4P TECH_'
const GROQ_KEY = process.env.GROQ_KEY // On met la clé dans Render

let ANTILINK = {}
let WARNINGS = {}
let WELCOME = {}

process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err))
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err))

const format = (text) => '> ' + text.split('\n').join('\n> ')

// MENU PRINCIPAL STYLE SQUICHY RX
const getSquichyMenu = () => format(`╭══════════╮
┃─────((✧ ${BOTNAME} ✧))─────
┃
┃ ➟ OWNER: ${OWNER}
┃ ➟ VERSION: ${VERSION}
┃ ➟ PREFIX: ${PREFIX}
┃ ➟ USER: Règles interdit
┃ ➟ COMMAND: 232
┃ ➟ TODAY: ${new Date().toLocaleDateString('en-US', {weekday: 'long'})}
┃ ➟ DATE: ${new Date().toLocaleDateString('fr-FR')}
┃ ➟ PLATFORM: linux
┃ ➟ RUNTIME: v24.18.0
┃ ➟ MODE: 🌍 Public
┃
╰══════════╯

╭══════════╮
┃─────((✧ SYSTEME ✧))─────
┃
┃ ➟ ${PREFIX}bot-menu
┃ ➟ ${PREFIX}ping
┃
╰══════════╯

╭══════════╮
┃─────((✧ ADMIN GROUPE ✧))─────
┃
┃ ➟ ${PREFIX}open
┃ ➟ ${PREFIX}close
┃ ➟ ${PREFIX}kick @tag
┃ ➟ ${PREFIX}antilink on/off
┃ ➟ ${PREFIX}warnings
┃ ➟ ${PREFIX}tagall
┃ ➟ ${PREFIX}welcome on/off
┃
╰══════════╯

╭══════════╮
┃─────((✧ IA ✧))─────
┃
┃ ➟ ${PREFIX}ai question
┃
╰══════════╯

╭══════════╮
┃─────((✧ OUTILS ✧))─────
┃
┃ ➟ ${PREFIX}vv
┃ ➟ ${PREFIX}bug-menu
┃
╰══════════╯`)

// MENU BUG STYLE SQUICHY RX
const getBugMenu = () => format(`╭══════════╮
┃─────((✧ BUG MENU ADMIN ✧))─────
┃
┃ ➟ ${PREFIX}kick @tag
┃ ➟ ${PREFIX}open
┃ ➟ ${PREFIX}close
┃ ➟ ${PREFIX}antilink on/off
┃ ➟ ${PREFIX}warnings
┃ ➟ ${PREFIX}welcome on/off
┃
╰══════════╯`)

async function getAIResponse(text) {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: `Tu es ${BOTNAME}. Parle naturellement. Réponses courtes 1-2 phrases.` },
                    { role: "user", content: text }
                ],
                max_tokens: 150,
                temperature: 0.85,
            })
        })
        const data = await response.json()
        if (data.error) return format("Oups, y'a un souci avec l'IA 😅")
        return format(data.choices?.[0]?.message?.content || "Je n'ai pas de réponse 😅")
    } catch (e) {
        console.error(e)
        return format("J'ai buggé désolé 😅")
    }
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const { version } = await fetchLatestBaileysVersion()

    const conn = makeWASocket({
        version,
        auth: state,
        browser: Browsers.windows('Chrome'),
        printQRInTerminal: false,
        syncFullHistory: false,
        logger: pino({ level: 'warn' })
    })

    conn.ev.on('creds.update', saveCreds)

    // WELCOME
    conn.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update
        if (!WELCOME[id]) return
        try {
            const meta = await conn.groupMetadata(id)
            for (let participant of participants) {
                const name = participant.split('@')[0]
                if (action === 'add') {
                    await conn.sendMessage(id, {
                        text: format(`╭══════════╮
┃─────((✧ BIENVENUE ✧))─────
┃
┃ ➟ @${name}
┃ ➟ Dans: *${meta.subject}*
┃
╰══════════╯

${SIGNATURE}`),
                        mentions: [participant]
                    })
                } else if (action === 'remove' || action === 'leave') {
                    await conn.sendMessage(id, {
                        text: format(`╭══════════╮
┃─────((✧ AU REVOIR ✧))─────
┃
┃ ➟ @${name} a quitté
┃
╰══════════╯`),
                        mentions: [participant]
                    })
                }
            }
        } catch (e) { console.error('Welcome Error:', e) }
    })

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) {
            console.log('🔄 Scan ce QR Code :')
            qrcode.generate(qr, { small: true })
        }
        if (connection === 'open') console.log(format(`✅ ${BOTNAME} ${VERSION} CONNECTÉ`))
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            const shouldReconnect = statusCode!== DisconnectReason.loggedOut
            console.log(format(`❌ Connexion fermée`))
            if (shouldReconnect) setTimeout(startBot, 3000)
        }
    })

    conn.ev.on('messages.upsert', async (m) => {
        if (!m.messages?.[0]?.message) return
        const mek = m.messages[0]
        const from = mek.key.remoteJid
        const sender = mek.key.participant || mek.key.remoteJid
        const isGroup = from.endsWith('@g.us')

        let body = ''
        if (mek.message.conversation) body = mek.message.conversation
        else if (mek.message.extendedTextMessage?.text) body = mek.message.extendedTextMessage.text
        else if (mek.message.imageMessage?.caption) body = mek.message.imageMessage.caption
        else if (mek.message.videoMessage?.caption) body = mek.message.videoMessage.caption

        const isCmd = body.startsWith(PREFIX)
        const command = isCmd? body.slice(PREFIX.length).trim().split(' ')[0].toLowerCase() : ''
        const q = isCmd? body.slice(PREFIX.length + command.length).trim() : ''
        const reply = (text, mentions = []) => conn.sendMessage(from, { text: format(text), mentions }, { quoted: mek })

        // ANTILINK
        if (isGroup && ANTILINK[from] &&!isCmd && body) {
            const linkRegex = /(https?:\/\/)?(chat\.whatsapp\.com|wa\.me|http)[^\s]+/i
            if (linkRegex.test(body)) {
                try {
                    const meta = await conn.groupMetadata(from)
                    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
                    if (!admins.includes(sender)) {
                        await conn.sendMessage(from, { delete: mek.key })
                        if (!WARNINGS[from]) WARNINGS[from] = {}
                        WARNINGS[from][sender] = (WARNINGS[from][sender] || 0) + 1
                        const warnCount = WARNINGS[from][sender]
                        const name = sender.split('@')[0]
                        if (warnCount < 3) {
                            reply(`⚠️ @${name} Pas de lien ici! ${warnCount}/3`, [sender])
                        } else {
                            await conn.groupParticipantsUpdate(from, [sender], "remove")
                            reply(`🚫 @${name} expulsé pour liens`, [sender])
                            delete WARNINGS[from][sender]
                        }
                    }
                } catch (e) { console.error('Antilink Error:', e) }
            }
        }

        if (!isCmd) return

        // COMMANDES
        if (command === 'bot-menu' || command === 'menu') {
            const menuText = getSquichyMenu()
            if (fs.existsSync('./logo.jpg')) {
                try { await conn.sendMessage(from, { image: fs.readFileSync('./logo.jpg'), caption: menuText }, { quoted: mek }) }
                catch { reply(menuText) }
            } else { reply(menuText) }
        }

        else if (command === 'bug-menu') {
            const menuText = getBugMenu()
            if (fs.existsSync('./logo.jpg')) {
                try { await conn.sendMessage(from, { image: fs.readFileSync('./logo.jpg'), caption: menuText }, { quoted: mek }) }
                catch { reply(menuText) }
            } else { reply(menuText) }
        }

        else if (command === 'ping') {
            const start = Date.now()
            const msg = await reply('🏓 Pong...')
            const end = Date.now()
            await conn.sendMessage(from, { text: format(`🏓 Pong! ${end - start}ms`), edit: msg.key })
        }

        else if (command === 'welcome') {
            if (!isGroup) return reply('❌ Groupe seulement')
            const meta = await conn.groupMetadata(from)
            if (!meta.participants.some(p => p.admin && p.id === sender)) return reply('❌ Admin seulement')
            if (q === 'on') { WELCOME[from] = true; reply('✅ *WELCOME ACTIVÉ*') }
            else if (q === 'off') { delete WELCOME[from]; reply('❌ *WELCOME DÉSACTIVÉ*') }
            else { reply(`Usage : ${PREFIX}welcome on / off`) }
        }

        else if (command === 'vv') {
            const quoted = mek.message.extendedTextMessage?.contextInfo?.quotedMessage
            if (!quoted) return reply('❌ Réponds à une photo/vidéo "voir une fois" avec.vv')
            try {
                const msgKey = mek.message.extendedTextMessage.contextInfo
                const buffer = await downloadMediaMessage(
                    { key: {...msgKey, id: msgKey.stanzaId }, message: quoted },
                    'buffer', {}, { logger: pino(), reuploadRequest: conn.updateMediaMessage }
                )
                const type = Object.keys(quoted)[0]
                const caption = format(`✅ *DÉBLOQUÉ*\n${SIGNATURE}`)
                if (type.includes('imageMessage'))
                    await conn.sendMessage(from, { image: buffer, caption, viewOnce: false }, { quoted: mek })
                else if (type.includes('videoMessage'))
                    await conn.sendMessage(from, { video: buffer, caption, viewOnce: false }, { quoted: mek })
                else reply('❌ Type non supporté')
            } catch (e) { console.error(e); reply('❌ Erreur. Installe ffmpeg') }
        }

        else if (command === 'open') {
            if (!isGroup) return reply('❌ Groupe seulement')
            const meta = await conn.groupMetadata(from)
            if (!meta.participants.some(p => p.admin && p.id === sender)) return reply('❌ Admin seulement')
            await conn.groupSettingUpdate(from, 'not_announcement')
            reply('✅ *GROUPE OUVERT*')
        }

        else if (command === 'close') {
            if (!isGroup) return reply('❌ Groupe seulement')
            const meta = await conn.groupMetadata(from)
            if (!meta.participants.some(p => p.admin && p.id === sender)) return reply('❌ Admin seulement')
            await conn.groupSettingUpdate(from, 'announcement')
            reply('🔒 *GROUPE FERMÉ*')
        }

        else if (command === 'kick') {
            if (!isGroup) return reply('❌ Groupe seulement')
            const mentioned = mek.message.extendedTextMessage?.contextInfo?.mentionedJid || []
            if (mentioned.length === 0) return reply(`Usage : ${PREFIX}kick @membre`)
            await conn.groupParticipantsUpdate(from, mentioned, "remove")
            reply(`✅ Membre(s) expulsé(s)`)
        }

        else if (command === 'antilink') {
            if (!isGroup) return reply('❌ Groupe seulement')
            ANTILINK[from] = q.toLowerCase() === 'on'
            reply(ANTILINK[from]? '✅ *ANTI-LINK ACTIVÉ*' : '❌ *ANTI-LINK DÉSACTIVÉ*')
        }

        else if (command === 'warnings') {
            if (!isGroup) return reply('❌ Groupe seulement')
            const warns = WARNINGS[from] || {}
            if (Object.keys(warns).length === 0) return reply('✅ Aucun warning')
            let msg = `╭══════════════════════════════════╮\n┃─────((✧ WARNINGS ✧))─────\n┃\n`
            for (let user in warns) { msg += `┃ ➟ @${user.split('@')[0]} : ${warns}/3\n` }
            msg += `╰══════════════════════════════════╯`
            reply(msg, Object.keys(warns))
        }

        else if (command === 'tagall') {
            if (!isGroup) return reply('❌ Groupe seulement')
            const meta = await conn.groupMetadata(from)
            const members = meta.participants.map(p => p.id)
            let text = `╭══════════╮\n┃─────((✧ TAG ALL ✧))─────\n┃\n┃ ➟ Groupe: ${meta.subject}\n┃ ➟ Total: ${members.length}\n╰══════════╯\n\n`
            for(let mem of members){ text += `➟ @${mem.split('@')[0]}\n` }
            await conn.sendMessage(from, { text: format(text), mentions: members }, { quoted: mek })
        }

        else if (command === 'ai') {
            if (!q) return reply(`Usage : ${PREFIX}ai ta question`)
            await conn.sendPresenceUpdate('composing', from)
            const aiReply = await getAIResponse(q)
            await conn.sendMessage(from, { text: aiReply }, { quoted: mek })
        }
    })
}

startBot()
