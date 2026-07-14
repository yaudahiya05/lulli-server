import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mqtt from 'mqtt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const unhandledRejections = new Map();
process.on('unhandledRejection', (reason, promise) => {
    unhandledRejections.set(promise, reason);
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('rejectionHandled', (promise) => {
    unhandledRejections.delete(promise);
});
process.on('uncaughtException', function(err) {
    console.log('Caught exception: ', err);
});

// Tambahkan flag untuk mencegah proses berjalan dobel
let isRunning = false;

function start() {
    if (isRunning) return;
    isRunning = true;

    let args = [path.join(__dirname, 'main.js'), ...process.argv.slice(2)];
    let p = spawn(process.argv[0], args, {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });

    p.on('message', data => {
        if (data === 'reset') {
            console.log('Restarting by request...');
            p.kill(); 
        }
    });

    p.on('exit', code => {
        console.error('Process exited with code:', code);
        isRunning = false;

        // Kasih jeda 1 detik sebelum restart supaya CPU gak jebol kalau error beruntun
        setTimeout(() => {
            start();
        }, 1000);
    });
}

start();

// SERVER & DASHBOARD SECTION
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, { 
    cors: { origin: "*", methods: ["GET", "POST"] }, 
    pingTimeout: 60000, 
    pingInterval: 25000,
    maxHttpBufferSize: 1e8 
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Anti-spam dan blokir IP
const requestLog = new Map();
const blockedIPs = new Map();

const RATE_LIMIT = 10;
const BLOCK_DURATION = 24 * 60 * 60 * 1000;

function isBlocked(ip) {
    if (!blockedIPs.has(ip)) return false;
    
    const unblockTime = blockedIPs.get(ip);
    if (Date.now() > unblockTime) {
        blockedIPs.delete(ip);
        return false;
    }
    return true;
}

function checkRateLimit(ip) {
    const now = Date.now();
    
    if (!requestLog.has(ip)) {
        requestLog.set(ip, { count: 1, lastReset: now });
        return true;
    }

    const data = requestLog.get(ip);

    if (now - data.lastReset > 60000) {
        data.count = 1;
        data.lastReset = now;
        return true;
    }

    data.count++;

    if (data.count > RATE_LIMIT) {
        const unblockTime = now + BLOCK_DURATION;
        blockedIPs.set(ip, unblockTime);
        console.log(`[ANTI-SPAM] IP ${ip} diblokir 24 jam`);
        return false;
    }

    return true;
}

function antiSpamMiddleware(req, res, next) {
    // Penanganan IP Replit yang berada di balik proxy (x-forwarded-for) sudah benar
    const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown';

    if (isBlocked(ip)) {
        return res.status(429).json({ success: false, error: "IP diblokir sementara." });
    }

    if (!checkRateLimit(ip)) {
        return res.status(429).json({ success: false, error: "Terlalu banyak request. IP diblokir 24 jam." });
    }

    next();
}

// State bot dan request
const pendingChannelRequests = new Map();
const activeNodes = new Map();

function getActiveBots() {
    return Array.from(activeNodes.values()).filter(b => b.id);
}

function sendChannelCommand(payload, options = {}) {
    return new Promise((resolve, reject) => {
        const requestId = `ch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const timeout = setTimeout(() => {
            if (pendingChannelRequests.has(requestId)) {
                pendingChannelRequests.delete(requestId);
                reject(new Error('Request timeout'));
            }
        }, options.timeoutMs || 45000);

        pendingChannelRequests.set(requestId, { resolve, reject, timeout });

        const message = {
            command: "channel_action",
            payload: payload,
            requestId
        };

        if (payload.action === "get_meta") {
            const target = getActiveBots()[0];
            if (target) message.targetBotId = target.id;
        }

        mqttClient.publish("lullibot/komando", JSON.stringify(message));
    });
}

// Eksekusi massal bot untuk aksi channel
async function sendToMultipleBots(payload, count) {
    let selectedBots = getActiveBots();
    
    if (count && count !== 'all') {
        const limit = parseInt(count);
        if (isNaN(limit) || limit <= 0) throw new Error("Format jumlah tidak valid");
        selectedBots = selectedBots.sort(() => 0.5 - Math.random()).slice(0, limit);
    }

    if (!selectedBots.length) throw new Error("Tidak ada bot aktif");

    const promises = selectedBots.map(bot => {
        return new Promise((resolve) => {
            const requestId = `ch_react_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            
            const timeout = setTimeout(() => {
                pendingChannelRequests.delete(requestId);
                resolve({ data: { success: 0, failed: 1 } }); 
            }, 45000);

            pendingChannelRequests.set(requestId, { resolve, timeout });

            mqttClient.publish("lullibot/komando", JSON.stringify({
                command: "channel_action",
                targetBotId: bot.id, 
                payload: payload,
                requestId
            }));
        }).catch(() => ({ data: { success: 0, failed: 1 } }));
    });

    const results = await Promise.all(promises);

    let totalSuccess = 0;
    let totalFailed = 0;

    results.forEach(res => {
        if (res?.data) {
            totalSuccess += res.data.success || 0;
            totalFailed += res.data.failed || 0;
        }
    });

    return {
        requested: selectedBots.length,
        success: totalSuccess,
        failed: totalFailed
    };
}

// Cache metadata channel
const channelMetaCache = new Map();

async function getChannelMeta(link) {
    if (channelMetaCache.has(link)) return channelMetaCache.get(link);

    try {
        const result = await sendChannelCommand({ action: "get_meta", link });
        if (result.error) throw new Error(result.error);

        const cachedData = {
            jid: result.jid,
            name: result.name || result.jid
        };

        channelMetaCache.set(link, cachedData);
        return cachedData;
    } catch (err) {
        throw new Error(`Gagal ambil metadata: ${err.message}`);
    }
}

// Koneksi MQTT
const mqttUrl = 'mqtts://e298425c670743aebc3bae5e30e412c5.s1.eu.hivemq.cloud:8883';
const mqttClient = mqtt.connect(mqttUrl, {
    username: 'suryadev',
    password: 'U3VyeWFEZXY',
    reconnectPeriod: 5000
});

mqttClient.on('connect', () => {
    console.log('[MQTT] Terhubung ke Cloud HiveMQ');
    mqttClient.subscribe('lullibot/bot_report');
    mqttClient.subscribe('lullibot/result');
    mqttClient.subscribe('lullibot/live_chat_log');
    mqttClient.subscribe('lullibot/file_list_result');
    mqttClient.subscribe('lullibot/file_result');
    mqttClient.subscribe('lullibot/group_list_result');
    mqttClient.subscribe('lullibot/channel_meta_result');
    mqttClient.subscribe('lullibot/system_log');
});

mqttClient.on('error', (err) => {
    console.error("[MQTT ERROR]:", err.message);
});

mqttClient.on('message', (topic, message) => {
    try {
        const data = message.toString();

        if (topic === 'lullibot/system_log') {
            io.emit('system_log', data);
            return;
        }

        const parsed = JSON.parse(data);

        if (parsed.requestId && pendingChannelRequests.has(parsed.requestId)) {
            const { resolve, timeout } = pendingChannelRequests.get(parsed.requestId);
            clearTimeout(timeout);
            pendingChannelRequests.delete(parsed.requestId);
            resolve(parsed);
            return;
        }

        switch (topic) {
            case 'lullibot/bot_report':
                if (Array.isArray(parsed)) {
                    parsed.forEach(bot => {
                        bot.lastSeen = Date.now();
                        activeNodes.set(bot.id, bot);
                    });
                    for (let [id, bot] of activeNodes.entries()) {
                        if (Date.now() - bot.lastSeen > 45000) activeNodes.delete(id);
                    }
                    io.emit('update_bot_list', Array.from(activeNodes.values()));
                }
                break;
            case 'lullibot/result':
                io.emit('system_log', `[${parsed.botName || 'BOT'}] ${parsed.message || parsed.result || data}`);
                break;
            case 'lullibot/live_chat_log':
                io.emit('receive_chat_log', parsed);
                break;
            case 'lullibot/file_list_result':
                io.emit('file_list_result', parsed);
                break;
            case 'lullibot/file_result':
                io.emit('file_result', parsed);
                break;
            case 'lullibot/group_list_result':
                io.emit('group_list_result', parsed);
                break;
            case 'lullibot/channel_meta_result':
                io.emit('channel_meta_result', parsed);
                break;
        }
    } catch (e) {}
});

io.on('connection', (socket) => {
    console.log(`[Socket] Browser terhubung: ${socket.id}`);

    if (activeNodes.size > 0) {
        socket.emit('update_bot_list', Array.from(activeNodes.values()));
    }

    socket.on('remote_command', (data) => {
        if (mqttClient.connected) {
            mqttClient.publish("lullibot/komando", JSON.stringify(data));
        } else {
            socket.emit('system_log', `[ERROR] MQTT terputus.`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Browser terputus: ${socket.id}`);
    });
});

// Endpoint API
app.post('/api/channel/meta', antiSpamMiddleware, async (req, res) => {
    try {
        const { link } = req.body;
        if (!link) return res.status(400).json({ success: false, error: "Parameter 'link' wajib" });

        const result = await sendChannelCommand({ action: "get_meta", link });
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/channel/follow', antiSpamMiddleware, async (req, res) => {
    try {
        const { link, count } = req.body;
        if (!link) return res.status(400).json({ success: false, error: "Parameter 'link' wajib" });

        const meta = await getChannelMeta(link);

        if (count && count !== 'all') {
            const result = await sendToMultipleBots({ action: "follow", jid: meta.jid }, count);
            return res.json({ success: true, data: result });
        }

        const result = await sendChannelCommand({ action: "follow", jid: meta.jid });
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/channel/react', antiSpamMiddleware, async (req, res) => {
    try {
        const { link, serverMsgId, emojis, count } = req.body;
        if (!link || !serverMsgId || !emojis) {
            return res.status(400).json({ success: false, error: "Parameter link, serverMsgId, emojis wajib" });
        }

        const meta = await getChannelMeta(link);
        const result = await sendToMultipleBots({ action: "react", jid: meta.jid, serverMsgId, emojis, link }, count || 'all');
        
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Dashboard berjalan di port ${PORT}`);
});