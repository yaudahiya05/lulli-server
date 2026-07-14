/*
 * Nama Pengembang: SuryaDev.
 * Kontak Whatsapp: wa.me/6285700408187
 * Kontak Telegram: t.me/surya_skylark
 * Akun Instagram: surya_skylark05
 * Catatan: tolong laporkan kepada saya jika anda menemukan ada yang menjual script ini tanpa seizin saya.
 */

const chalk = require('chalk');
const fs = require('fs');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Jakarta').locale('id');
const func = require('./functions.js');
const env = require('../config.json');
const {
    green,
    greenBright,
    cyanBright,
    redBright
} = chalk;

const isPastTime = (milliseconds) => {
    const currentTime = Date.now();
    return milliseconds < currentTime;
}

const color = (text, color = 'green') => {
    return chalk.keyword(color).bold(text)
}

module.exports = async (client, m, msg = false) => {
    if (!m.budy) return (m.mtype ? console.log('\n' + greenBright.bold('[ TYPE ]'), m.mtype) : 'TYPE NOT FOUND')
    const index = global.db.jadibot.findIndex(x => x.number === m.bot);

    if (index !== -1 && m.bot !== func.wa(env.pairing.number)) {
        const expired = global.db.jadibot[index].expired;
        if (!isNaN(expired) && isPastTime(expired)) {
            await client.reply(m.bot, 'Bot pribadimu udah habis, hubungi owner kalo mau pake lagi! 😉', null, {
                expiration: m.expiration
            }).then(async () => {
                global.db.jadibot[index].status = false;
                await client.end();
                client.ws.close();
            })
        }
    }
    const who = m.fromMe ? 'Bot' : m.pushname || 'NO NAME';
    const time = m.messageTimestamp;
    const groupName = m.isGc ? ('GROUP' || 'NO NAME') : '';

    const logMessage = (type) => {
        const formattedTime = moment(time * 1000).format('DD/MM/YY HH:mm:ss');
        const sender = color(`[${m.sender.split('@')[0]}]`, 'orange');
        const chat = color(`[${m.chat}]`, 'orange');
        const message = `\n${m.budy}`;

        console.log(`\n${greenBright.bold(`[ ${type} ]`)} ${formattedTime} ${green.bold('from')} ${cyanBright.bold(who)} ${green.bold('in')} ${chat} ${groupName}${message}`);
    };

    if (m.isPrefix) logMessage('CMD');
    if (msg) logMessage('MSG');
};

func.reloadFile(__filename);