import {
    default as makeWASocket,
    DisconnectReason,
    // useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidNormalizedUser,
    Browsers,
    proto,
    delay
} from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import pino from 'pino';
import Spinnies from 'spinnies';

// IMPOR FUNGSI REDIS YANG BARU DIBUAT
import { useRedisAuthState } from './system/redis-auth.js'; 

import loader from './system/loader.js';
import * as session from './system/session.js';
import store from './system/store.js';
import socket from './system/socket.js';
import { processedMessages } from './system/mapping.js';
import database from './system/database.js';
import lid from './system/lid.js';

const configPath = path.join(process.cwd(), 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

class WhatsAppBot {
    constructor(options = {}) {
        this.msgRetryCounterCache = new NodeCache();
        this.spinnies = new Spinnies({
            spinner: {
                interval: 200,
                frames: ['∙∙∙', '●∙∙', '∙●∙', '∙∙●', '∙∙∙'],
            },
        });
        this.lastMessageTime = 0;
        this.clone = options || {
            status: options.status,
            number: options.number,
            botname: options.botname,
            socket: options.socket,
            session: options.session,
            filename: options.filename
        };
        this.owner = config.owner;
        this.emoticon = config.emoticon;
        this.client = null;
    }

    checkNumberType(input) {
        if (typeof input === 'string') {
            return input.replace(/\D/g, '');
        } else if (typeof input === 'number') {
            return input;
        } else {
            return false;
        }
    }

    isSpam(currentTime) {
        if (currentTime - this.lastMessageTime < 5000) {
            return true; 
        } else {
            this.lastMessageTime = currentTime; 
            return false; 
        }
    }

    async connect() {
        // MENGGUNAKAN REDIS AUTH STATE
        const { state, saveCreds } = await useRedisAuthState(this.clone.session);
        const { version, isLatest } = await fetchLatestBaileysVersion();

        const getMessage = async key => {
            if (store.cek(key.id)) {
                return (await store.loadMessage(key.id) || {}).message || undefined;
            }
            return proto.Message.fromObject({});
        };

        this.client = makeWASocket({
            logger: pino({ level: "silent" }),
            markOnlineOnConnect: false,
            printQRInTerminal: !(this.clone && this.clone.number),
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
            },
            browser: Browsers.ubuntu('Chrome'),
            msgRetryCounterCache: this.msgRetryCounterCache,
            generateHighQualityLinkPreview: true,
            getMessage: async (key) => {
                return await getMessage(key);
            },
            version: version,
        });

        // menggunakan extra dari loader
        const Extra = loader.get('extra');
        if (Extra) Extra(this.client, store);

        if (this.clone.status && this.clone.number && !this.client.authState.creds.registered) {
            const number = this.checkNumberType(this.clone.number);
            
            if (!number) {
                console.log(chalk.redBright.bold("Invalid number, Tipe data tidak dikenali!"));
                this.client.ws.close();
                return;
            }

            // Pengecekan folder session lokal diabaikan karena menggunakan Redis
            /*
            if (fs.existsSync(`./${this.clone.session}/creds.json`)) {
                console.log(chalk.yellowBright.bold('[ WARNING ]'), chalk.white('Session rusak, silahkan masukkan ulang pairing kode!'))
                await this.clearSessionAndRestart(this.clone.session);
                return;
            }
            */

            setTimeout(async () => {
                try {
                    if (this.client.ws.readyState === 2 || this.client.ws.readyState === 3) return;

                    let code = await this.client.requestPairingCode(number, config.pairing.code || "SURYADEV");
                    code = code.match(/.{1,4}/g).join('-') || code;
                    let currentTime = Date.now();
                    
                    if (!this.isSpam(currentTime)) {
                        console.log(chalk.black(chalk.bgGreen(` Your Pairing Code [CLONE] : `)), chalk.black(chalk.white(code)));
                    } else {
                        console.log(chalk.redBright.bold("Pairing Code Spam! Restarting..."));
                        await this.clearSessionAndRestart(this.clone.session);
                    }
                } catch (error) {
                    console.log(chalk.redBright('[CLONE] Gagal request pairing code:'), error?.output?.payload?.message || error.message);
                };
            }, 3000);
        }

        this.client.ev.on('creds.update', saveCreds);
        this.handleConnectionUpdate();
        this.handleMessages(store);
    }

    handleConnectionUpdate() {
        this.client.ev.on('connection.update', async (update) => {
            const { lastDisconnect, connection, qr } = update;
            
            if (connection === 'connecting') {
                console.log(chalk.yellowBright(`[CLONE] Connecting . . .`));
            } else if (connection === 'open') {
                const botname = (this.client.user.name || this.client.user.verifiedName || "WhatsApp Bot");
                console.log(chalk.cyanBright(`[CLONE] Connected, you login as ${botname}`));

                this.client.user.uptime = Date.now();
                const number = this.client.user.jid;
                const index = global.db.jadibot.findIndex(x => x.number === number);
                const settings = global.db.setting[this.client.user.jid];

                if (index !== -1) global.db.jadibot[index].botname = botname;
                if (settings && settings.botname === '~') settings.botname = botname;

                socket.set(number, this.client);
                session.backup(this.client, this.clone.session);
            } else if (connection === 'close') {
                const number = jidNormalizedUser(this.client?.user?.jid || this.client?.user?.id);
                socket.delete(number);
                this.handleDisconnect(lastDisconnect);
            }
        });
    }

    handleDisconnect(lastDisconnect) {
        this.client.ev.removeAllListeners();

        const reason = lastDisconnect?.error?.output?.statusCode;
        if (!reason) return;
        
        switch (reason) {
            case DisconnectReason.badSession:
                console.log(chalk.redBright('[CLONE] ✖ Bad session file'));
                session.deleteCreds(this.clone.session);
                this.restartSession(this.clone.session);
                break;
            case DisconnectReason.connectionClosed:
            case DisconnectReason.connectionLost:
            case DisconnectReason.restartRequired:
            case DisconnectReason.timedOut:
            case DisconnectReason.unavailableService:
            case 503:
                console.log(chalk.redBright('[CLONE] ✖ Connection error, reconnecting . . .'));
                this.connect().catch(() => this.connect());
                break;
            case DisconnectReason.connectionReplaced:
                console.log(chalk.redBright('[CLONE] ✖ Session running on another server'));
                this.client.ws.close();
                break;
            case DisconnectReason.loggedOut:
            case DisconnectReason.multideviceMismatch:
                console.log(chalk.redBright('[CLONE] ✖ Device logged out / Mismatch'));
                this.clearSessionAndRestart(this.clone.session);
                break;
            case 405:
                console.log(chalk.redBright('[CLONE] ✖ Method not allowed'));
                session.deleteCreds(this.clone.session);
                this.restartSession(this.clone.session);
                break;
            default:
                console.log(chalk.redBright('[CLONE] ✖ Connection error. (Reason: ' + reason + ')'));
                session.clearSession(this.clone.session);
        }
    }

    async clearSessionAndRestart(sessionFile) {
        const sessionFilePath = path.join(process.cwd(), sessionFile);
        fs.rmSync(sessionFilePath, { recursive: true, force: true });
        await this.client.end();
        this.client.ws.close();
    }

    async restartSession(sessionFile) {
        const backupExists = await session.isBackupExist(this.client);
        if (backupExists) {
            await session.restore(this.client, sessionFile);
            await delay(1500);
            this.connect().catch(() => this.connect());
        }
    }

    handleMessages(store) {
        this.client.ev.on('messages.upsert', async (update) => {
            try {
                if (!update.messages) return;
                if (update.type !== 'notify') return;

                for (const messages of update.messages) {
                    database(this.client, messages);

                    if (!messages.message) continue;
                    if (/^\d.*(@g\.us)$/.test(messages.key.remoteJid) && processedMessages.has(messages.key.id)) continue;
                    processedMessages.add(messages.key.id);

                    this.client.sendPresenceUpdate('unavailable');

                    // memanggil serialize dari loader
                    const serializeModule = loader.get('serialize');
                    if (serializeModule) serializeModule(this.client, messages, store);

                    store.assertMessageList(messages);

                    // eksekusi handler dinamis pada clone
                    const handler = loader.get('client');
                    if (handler) handler(this.client, messages, store);

                    if (global.db.setting[this.owner]?.maintenance) continue;

                    const settings = global.db.setting[this.client?.user?.jid];
                    if (!settings) continue;

                    if (settings.autoreadsw && messages.key.remoteJid === 'status@broadcast') {
                        if (messages.message?.protocolMessage || [this.owner].includes(messages.key?.participant)) continue;

                        await this.client.readMessages([messages.key]);

                        if (settings.autoreact && messages.mtype !== 'reactionMessage') {
                            if (messages.key.fromMe) continue;
                            
                            const maxTime = 5 * 60 * 1000;
                            const timeDiff = Date.now() - (messages.messageTimestamp * 1000);
                            
                            if (timeDiff <= maxTime) {
                                const key = messages.key;
                                const participant = key.participant || key.remoteJid;
                                if (participant.startsWith('status')) continue;
                                
                                const name = messages.pushName || '-';
                                console.log(chalk.green(`[CLONE] Read story from: ${name} [${participant.replace(/@.+/, '')}]`));
                                
                                const randomEmoji = this.emoticon[Math.floor(Math.random() * this.emoticon.length)];
                                try {
                                    await this.client.sendMessage(key.remoteJid, {
                                        react: {
                                            text: randomEmoji,
                                            key: { id: key.id, participant: participant, remoteJid: key.remoteJid }
                                        }
                                    }, { statusJidList: [participant] });
                                } catch (error) {
                                    console.error('Error sending reaction:', error);
                                }
                                await delay(1000);
                            }
                        }
                    }
                }
            } catch (e) {
                console.log(chalk.red('[CLONE] Error in messages.upsert:'), e);
            }
        });

        this.client.ev.on('call', async ([event]) => {
            const { from, id, status } = event;
            try {
                if (global.db.setting[this.owner]?.maintenance) return;

                // Tambahan fallback .id untuk jaga-jaga kalau .jid undefined di session clone
                const botId = jidNormalizedUser(this.client.user?.id || this.client.user?.jid);
                const settings = global.db.setting[botId];
                if (!settings) return;

                console.log(`[CLONE ${settings.botname}] Caller From ${from.replace(/@.+/g, '')}`);

                if (status === 'offer' && settings.anticall) {
                    let callerJid = from;
                    let callerLid = from;

                    // Resolusi otomatis: Jika LID cari JID-nya, jika JID cari LID-nya
                    if (lid.isLidUser(from)) {
                        const resolvedJid = lid.get(from);
                        if (resolvedJid) callerJid = resolvedJid;
                    } else if (lid.isPnUser(from)) {
                        const resolvedLid = lid.getLid(from);
                        if (resolvedLid) callerLid = resolvedLid;
                    }

                    // Cek apakah salah satu identitas ada di whitelist caller
                    const isCallerAllowed = settings.caller?.includes(callerJid) || settings.caller?.includes(callerLid);

                    if (!isCallerAllowed) {
                        await this.client.rejectCall(id, from);
                    }
                }
            } catch (error) {
                console.log('Error in caller:', error.message);
            }
        });

        this.client.ev.on('messaging-history.set', async (messaging) => {
            const { chats, contacts, messages, isLatest } = messaging;
            console.log(`[CLONE] recv ${chats.length} chats, ${contacts.length} contacts, ${messages.length} msgs`);
        });

        this.client.ev.on('contacts.update', (contacts) => {
            contacts.forEach(contact => {
                let id = jidNormalizedUser(contact.id);
                store.addContact(id, { id, name: contact.notify });
            });
        });

        this.client.ev.on('contacts.upsert', (contacts) => {
            contacts.forEach(contact => {
                let id = jidNormalizedUser(contact.id);
                store.addContact(id, { ...(contact || {}) });
            });
        });
    }
}

export default WhatsAppBot;