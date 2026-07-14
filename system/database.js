const {
    jidNormalizedUser
} = require('@whiskeysockets/baileys');
const func = require('./functions.js');

module.exports = (client, chat) => {
    try {
        if (chat.key && chat.key.remoteJid === 'status@broadcast') return
        const chatId = chat.key.remoteJid;
        const botId = jidNormalizedUser(client.user.id) // client.user.id ? client.user.id.split(':')[0] + '@s.whatsapp.net' : client.user.jid;
        const userId = jidNormalizedUser(chat.key.fromMe ? botId : (chat.key.participant || chat.key.remoteJid));
        const pushname = chat.pushName || '~'
        const timezone = func.timezone()
        const calender = `${timezone.date} (${timezone.time})`;

        const models = {
            users: Object.freeze({
                date: calender
            }),
            settings: Object.freeze({
                botname: '~',
                packname: '𝐑𝐲𝐚𝐚𝐍𝐝𝐚𝐚ᯓᡣ𐭩',
                author: '',
                stickertag: 'https://files.catbox.moe/5h6umn.webp',
                prefix: '#',
                self: true,
                online: true,
                autoreadsw: true,
                autoreact: true,
                autosticker: false,
                autowm: false,
                anticall: true,
                antidelete: true,
                antiedited: true,
                antivirtex: true,
                antitag: true,
                caller: [],
                chats: [],
                stories: [],
            })
        }

        // Database User
        if (/^\d.*(@s\.whatsapp\.net)$/.test(userId)) {
            let user = global.db.users[userId];
            if (user) {
                execute(user, models.users);
            } else {
                global.db.users[userId] = {
                    jid: userId,
                    name: pushname,
                    date: calender,
                    ...(models?.users || {})
                }
            }
        }

        // Database Setting
        let setting = global.db.setting[botId];
        if (setting) {
            execute(setting, models.settings)
        } else {
            global.db.setting[botId] = {
                owner: botId,
                ...(models?.settings || {})
            }
        }

        function isType(val, type) {
            const typeCheckers = {
                number: val => typeof val === 'number' && !isNaN(val),
                string: val => typeof val === 'string',
                object: val => val !== null && typeof val === 'object' && !Array.isArray(val),
                boolean: val => typeof val === 'boolean',
                array: val => Array.isArray(val),
            };

            return typeCheckers[type] ? typeCheckers[type](val) : false;
        }
        
        function checkType(defaultValue) {
            return Array.isArray(defaultValue) ? 'array' : typeof defaultValue;
        }

        function execute(prefix, template, custom = {}) {
            // Iterate through the keys of the template object
            Object.keys(template).forEach(key => {
                const defaultValue = template[key];
                const type = checkType(defaultValue);

                // Check if the key is not present in prefix or has an incorrect type
                if (!(key in prefix) || !isType(prefix[key], type)) {
                    prefix[key] = defaultValue;
                }
            });

            // Add custom properties to the prefix object
            Object.keys(custom).forEach(key => {
                const defaultValue = custom[key];
                const type = checkType(defaultValue);

                if (!(key in prefix) || !isType(prefix[key], type)) {
                    prefix[key] = custom[key];
                }
            });
        }

    } catch (e) {
        console.log(e);
    }
}

func.reloadFile(__filename)