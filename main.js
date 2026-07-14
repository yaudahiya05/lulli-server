import {
    default as makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidNormalizedUser,
    Browsers,
    proto,
    delay
} from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';
import os from 'os';
import fs from 'fs';
import chalk from 'chalk';
import pino from 'pino';
import path from 'path';
import figlet from 'figlet';
import Spinnies from 'spinnies';
import { useRedisAuthState } from './system/redis-auth.js'; 

// MANGGIL LOADER UTAMA
import loader from './system/loader.js';

import * as session from './system/session.js';
import func from './system/functions.js';
import store from './system/store.js';
import socket from './system/socket.js';
import multidb from './system/multidb.js';
import { processedMessages } from './system/mapping.js';
import events from './system/events.js';
import database from './system/database.js';
import lid from './system/lid.js';

const configPath = path.join(process.cwd(), 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const msgRetryCounterCache = new NodeCache();
process.on('uncaughtException', console.error);

const emoticon = config.emoticon;
const maxTime = 5 * 60 * 1000;

const spinnies = new Spinnies({
    spinner: {
        interval: 200,
        frames: ['∙∙∙', '●∙∙', '∙●∙', '∙∙●', '∙∙∙'],
    },
});

// DAFTARKAN SEMUA FILE KE LOADER AGAR AUTO-RELOAD
await loader.watch('extra', './system/extra.js');
await loader.watch('serialize', './system/serialize.js');
await loader.watch('console', './system/console.js');
await loader.watch('client', './client.js');

// starting to connect
const connect = async () => {
    const sessionFile = config.session;

    // MENGUBAH SINI: Menggunakan fungsi Redis yang sudah dibuat
    const { state, saveCreds } = await useRedisAuthState(redisClient, sessionFile); 
    const { version, isLatest } = await fetchLatestBaileysVersion();

    await multidb.initDatabase();

    const getMessage = async key => {
        if (store.cek(key.id)) {
            return (await store.loadMessage(key.id) || {}).message || undefined;
        }
        return proto.Message.fromObject({});
    };

    function checkNumberType(input) {
        if (typeof input === 'string') {
            return input.replace(/\D/g, '');
        } else if (typeof input === 'number') {
            return input;
        } else {
            return false;
        }
    }

    const clearSessionAndRestart = () => {
        const sessionFilePath = path.join(process.cwd(), sessionFile);
        fs.rmSync(sessionFilePath, { recursive: true, force: true });
        connect().catch(() => connect());
    };

    let lastMessageTime = 0;

    function isSpam(currentTime) {
        if (currentTime - lastMessageTime < 5000) {
            return true; 
        } else {
            lastMessageTime = currentTime; 
            return false; 
        }
    }

    const client = makeWASocket({
        logger: pino({ level: 'silent' }),
        markOnlineOnConnect: false,
        printQRInTerminal: !(config.pairing && config.pairing.status && config.pairing.number),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        browser: Browsers.ubuntu('Chrome'),
        msgRetryCounterCache: msgRetryCounterCache,
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
            return await getMessage(key);
        },
        version: version,
    });

    // menggunakan extra dari loader
    const Extra = loader.get('extra');
    if (Extra) Extra(client, store);

    if (config.pairing.status && config.pairing.number && !client.authState.creds.registered) {
        const number = checkNumberType(config.pairing.number || '');
        
        if (!number) {
            console.log(chalk.redBright.bold('Invalid number, Tipe data tidak dikenali!'));
            process.exit(0);
        }
        
        // Kita tidak memakai check folder lokal lagi, biarkan berjalan normal untuk Redis
        // if (config.pairing.status && config.pairing.number && fs.existsSync(`./${sessionFile}/creds.json`) && !client.authState.creds.registered) {
        //     console.log(chalk.yellowBright.bold('[ WARNING ]'), chalk.white('Session rusak, silahkan masukkan ulang pairing kode!'));
        //     session.clearSessionAndRestart(sessionFile);
        // }
        
        setTimeout(async () => {
            try {
                let code = await client.requestPairingCode(number, config.pairing.code || "SURYADEV");
                code = code.match(/.{1,4}/g).join('-') || code;
                let currentTime = Date.now(); 
                
                if (!isSpam(currentTime)) {
                    console.log(chalk.black(chalk.bgGreen(" Your Pairing Code : ")), chalk.black(chalk.white(code)));
                } else {
                    console.log(chalk.redBright.bold("Pairing Code Spam! Restarting..."));
                    session.clearSessionAndRestart(sessionFile);
                }
            } catch {};
        }, 3000);
    }

    client.ev.on('creds.update', saveCreds);

    client.ev.on('connection.update', async (update) => {
        let { lastDisconnect, connection, qr } = update;
        
        if (connection === 'connecting') {
            spinnies.add("start", { text: "Connecting . . .", color: "cyan" });
        } else if (connection === 'open') {
            const success = "Connected, you login as " + (client.user.name || client.user.verifiedName || "WhatsApp Bot");
            spinnies.succeed("start", { text: success });
            events(client);
            const number = client?.user?.jid || jidNormalizedUser(client.user?.id || '');
            socket.set(number, client);
            session.backup(client, sessionFile);
        } else if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (!reason) return;

            client.ev.removeAllListeners();

            if (reason === DisconnectReason.badSession) {
                console.log(chalk.redBright('✖ Bad session file'));
                session.deleteCreds(sessionFile);
                const backupExists = await session.isBackupExist(client);
                if (backupExists) {
                    await session.restore(client, sessionFile);
                    await delay(1500);
                    connect().catch(() => connect());
                }
            } else if (reason === DisconnectReason.connectionClosed) {
                console.log(chalk.redBright('✖ Connection closed, reconnecting . . .'));
                connect().catch(() => connect());
            } else if (reason === DisconnectReason.connectionLost) {
                console.log(chalk.redBright('✖ Connection lost, reconnecting . . .'));
                connect().catch(() => connect());
            } else if (reason === DisconnectReason.connectionReplaced) {
                console.log(chalk.redBright('✖ Session running on another server'));
                process.exit(0);
            } else if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.redBright('✖ Device logged out'));
                session.clearSessionAndRestart(sessionFile);
            } else if (reason === DisconnectReason.restartRequired) {
                connect().catch(() => connect());
            } else if (reason === DisconnectReason.multideviceMismatch) {
                console.log(chalk.redBright('✖ Multi device mismatch'));
                clearSessionAndRestart();
            } else if (reason === DisconnectReason.timedOut) {
                console.log(chalk.redBright('✖ Connection timed-out, reconnecting . . .'));
                connect().catch(() => connect());
            } else if (reason === DisconnectReason.unavailableService || reason === 503) {
                console.log(chalk.redBright('✖ Service unavailable, reconnecting . . .'));
                connect().catch(() => connect());
            } else if (reason === 405) {
                console.log(chalk.redBright('✖ Method not allowed'));
                session.clearSessionAndRestart(sessionFile);
            } else {
                console.log(chalk.redBright('✖ Connection error. (Reason: ' + reason + ')'));
                session.clearSession(sessionFile);
            }
        }
    });

    client.ev.on('messages.upsert', async (event) => {
        try {
            if (!event.messages) return;
            if (event.type !== 'notify') return;

            for (const messages of event.messages) {
                database(client, messages);

                if (!messages.message) continue;

                if (/^\d.*(@g\.us)$/.test(messages.key.remoteJid) && processedMessages.has(messages.key.id)) continue;
                processedMessages.add(messages.key.id);

                client.sendPresenceUpdate('unavailable');

                // menggunakan serialize dari loader
                const serialize = loader.get('serialize');
                if (serialize) serialize(client, messages, store);

                store.assertMessageList(messages);

                // menggunakan client.js dari loader
                const handler = loader.get('client');
                if (handler) handler(client, messages, store);

                const botJid = messages.bot || jidNormalizedUser(client.user?.id || '');
                const settings = global.db?.setting?.[botJid];
                
                if (!settings) continue;
                
                if (settings.autoreadsw && messages.key.remoteJid === 'status@broadcast') {
                    if (messages.message?.protocolMessage) continue;
                    
                    await client.readMessages([messages.key]);
                    
                    if (settings.autoreact && messages.mtype !== 'reactionMessage') {
                        if (messages.key.fromMe) continue;
                        
                        const timeDiff = Date.now() - (messages.messageTimestamp * 1000);
                        if (timeDiff <= maxTime) {
                            const key = messages.key;
                            const participant = key.participant || key.remoteJid;
                            const name = messages.pushName || '-';
                            console.log(`read story from: ${name} [${participant.replace(/@.+/, '')}]`);
                            
                            const randomEmoji = emoticon[Math.floor(Math.random() * emoticon.length)];
                            try {
                                await client.sendMessage(key.remoteJid, {
                                    react: {
                                        text: randomEmoji,
                                        key: {
                                            id: key.id,
                                            participant: participant,
                                            remoteJid: key.remoteJid
                                        }
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
            console.error(chalk.red('✗ Error in messages.upsert:'), e);
        }
    });

client.ev.on('call', async ([event]) => {
    const { from, id, status } = event;
    try {
        // Amankan pengambilan botId (kadang client.user.jid undefined, fallback ke client.user.id)
        const botId = jidNormalizedUser(client.user?.id || client.user?.jid);
        const settings = global.db?.setting?.[botId];
        if (!settings) return;
        
        console.log(`[${settings.botname} BOT] Caller From ${from.replace(/@.+/g, '')}`);
        
        if (status === 'offer' && settings.anticall) {
            let callerJid = from;
            let callerLid = from;

            // Jika yang masuk adalah LID, coba tarik JID aslinya dari memori Lid
            if (lid.isLidUser(from)) {
                const resolvedJid = lid.get(from);
                if (resolvedJid) callerJid = resolvedJid;
            } 
            // Jika yang masuk JID, coba tarik LID-nya
            else if (lid.isPnUser(from)) {
                const resolvedLid = lid.getLid(from);
                if (resolvedLid) callerLid = resolvedLid;
            }

            // Validasi: Cek apakah JID ATAU LID ada di dalam daftar caller (whitelist)
            const isCallerAllowed = settings.caller?.includes(callerJid) || settings.caller?.includes(callerLid);

            // Jika tidak ada di dalam daftar, reject panggilannya
            if (!isCallerAllowed) {
                await client.rejectCall(id, from);
                console.log(`[ANTICALL] Rejected call from: ${from}`);
            } else {
                console.log(`[ANTICALL] Allowed call from whitelist: ${from}`);
            }
        }
    } catch (error) {
        console.log('Error in caller:', error.message);
    }
});

    client.ev.on('messaging-history.set', async (messaging) => {
        const { chats, contacts, messages, isLatest } = messaging;
        console.log(`recv ${chats.length} chats, ${contacts.length} contacts, ${messages.length} msgs (is latest: ${isLatest})`);
    });

    client.ev.on('contacts.update', (contacts) => {
        for (let contact of contacts) {
            let id = jidNormalizedUser(contact.id);
            if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
        }
    });

    client.ev.on('contacts.upsert', (contacts) => {
        for (let contact of contacts) {
            let id = jidNormalizedUser(contact.id);
            if (store && store.contacts) store.contacts[id] = { ...(contact || {}), isContact: true };
        }
    });

    client.ev.on('presence.update', ({ id, presences }) => {
        store.presences[id] = store.presences[id] || {};
        Object.assign(store.presences[id], presences);
    });

    !fs.existsSync('./temp') && fs.mkdirSync('./temp');
    !fs.existsSync('./clone') && fs.mkdirSync('./clone');
    
    setInterval(async () => {
        try {
            const tmpFiles = fs.readdirSync('./temp');
            if (tmpFiles.length > 10) {
                tmpFiles.filter(v => !v.endsWith('.file')).map(v => fs.unlinkSync('./temp/' + v));
            }
        } catch (e) {
            console.log("Error clearing temp folder", e);
        }
    }, 60 * 1000 * 10);
}

const color = (text, color) => {
    return !color ? chalk.cyan(text) : chalk.keyword(color)(text);
}

const showLogoWithUsername = () => {
    let pkgVersion = '1.0.0';
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
        pkgVersion = pkg.version;
    } catch (e) {}
    
    const borderLine = color('─'.repeat(45), 'cyan');
    
    console.clear();
    console.log(color(figlet.textSync('SuryaAI', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default',
        width: 80,
        whitespaceBreak: false
    }), 'cyan'));

    console.log(borderLine);
    console.log(color(`  🚀 SYSTEM READY | Version: ${pkgVersion}`, 'cyan'));
    console.log(borderLine);

    const info = (label, value) => {
        console.log(`${color('  │', 'cyan')} ${color(label.padEnd(12), 'aqua')} : ${color(value, 'white')}`);
    };

    info('Owner Name', config.ownername || 'SuryaDev');
    info('Bot Name', config.botname || 'Surya – AI');
    info('Status', 'Online ✨');
    info('Developer', 'SuryaDev');

    console.log(color('  ├' + '─'.repeat(42), 'cyan'));

    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);

    info('OS', `${os.platform()} (${os.arch()})`);
    info('CPU', os.cpus()?.[0]?.model.split(' @')[0] || 'Unknown');
    info('RAM', `${freeMem}GB / ${totalMem}GB Free`);

    console.log(borderLine);
    console.log(color('  [!] Listening for incoming commands...', 'gray'));
    console.log(' ');
}

showLogoWithUsername();
connect().catch(() => connect());