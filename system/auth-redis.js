// system/redis-auth.js
import { initAuthCreds, BufferJSON, proto } from '@whiskeysockets/baileys';
import Redis from 'ioredis';

// Inisialisasi client Redis (URL Upstash)
const redisClient = new Redis('rediss://default:gQAAAAAAAj90AAIgcDJmMjE0ODRkZTI5YmY0YjQwYTExODBjZTYxY2RhNDA3Yg@rich-lizard-147316.upstash.io:6379');

// Fungsi Custom untuk Redis Auth State Baileys
async function useRedisAuthState(sessionId) {
    const writeData = async (data, id) => {
        const key = `wabot_${sessionId}:${id}`;
        await redisClient.set(key, JSON.stringify(data, BufferJSON.replacer));
    };

    const readData = async (id) => {
        const key = `wabot_${sessionId}:${id}`;
        const data = await redisClient.get(key);
        if (data) {
            return JSON.parse(data, BufferJSON.reviver);
        }
        return null;
    };

    const removeData = async (id) => {
        const key = `wabot_${sessionId}:${id}`;
        await redisClient.del(key);
    };

    const creds = await readData('creds') || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async id => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const fileId = `${category}-${id}`;
                            tasks.push(value ? writeData(value, fileId) : removeData(fileId));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => writeData(creds, 'creds')
    };
}

export { redisClient, useRedisAuthState };