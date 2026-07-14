import fs from 'fs';
import chalk from 'chalk';
import path from 'path';
import util from 'util';
import axios from 'axios';
import ms from 'parse-ms';
import fetch from 'node-fetch';
import crypto from 'crypto';
import FormData from 'form-data';
import { exec, spawn } from 'child_process';
import pkg from 'file-type';
const { fromBuffer } = pkg;
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Function {
    constructor() {
        this.readmore = String.fromCharCode(8206).repeat(4001);
    }

    getDevice(id) {
        return id.length > 21 ? 'Android' : id.substring(0, 2) === '3A' ? 'IOS' : 'WhatsApp Web';
    }

    toRupiah(angka) {
        var saldo = '';
        var angkarev = angka.toString().split('').reverse().join('');
        for (var i = 0; i < angkarev.length; i++)
            if (i % 3 == 0) saldo += angkarev.substr(i, 3) + '.';
        return '' + saldo.split('', saldo.length - 1).reverse().join('');
    }

    delCase(filePath, caseName) {
        fs.readFile(filePath, "utf8", (err, data) => {
            if (err) {
                console.error("Terjadi kesalahan:", err);
                return;
            }
            const regex = new RegExp(`case\\s+'${caseName}':[\\s\\S]*?break`, "g");
            const modifiedData = data.replace(regex, "");
            fs.writeFile(filePath, modifiedData, "utf8", (err) => {
                if (err) {
                    console.error("Terjadi kesalahan saat menulis file:", err);
                    return;
                }
                console.log(`teks dari case '${caseName}' telah dihapus dari file.`);
            });
        });
    }

    listCase(filePath) {
        const code = fs.readFileSync(filePath, 'utf8')
        var regex = /case\s+'([^']+)':/g;
        var matches = [];
        var match;
        while ((match = regex.exec(code))) {
            matches.push(match[1]);
        }
        let teks = `*Total Case*: ${matches.length}\n\n`
        matches.forEach(function(x) {
            teks += "  ◦  " + x + "\n"
        })
        return teks
    }

    getCase(filePath, caseName) {
        return "case " + `'${caseName}'` + fs.readFileSync(filePath).toString().split('case \'' + caseName + '\'')[1].split("break")[0] + "break"
    }

    timeZone() {
        const today = new Date();
        const date = new Date(today.toLocaleString('en-US', {
            timeZone: 'Asia/Jakarta'
        }));
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const day = today.getDate();
        const month = today.getMonth();
        const year = today.getFullYear();
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        const dayOfWeek = today.toLocaleDateString('id-ID', {
            weekday: 'long'
        });
        const timeNow = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        return {
            week: `${dayOfWeek}`,
            date: `${day} ${months[month]} ${year}`,
            time: `${timeNow} WIB`
        }
    }

    messageId(length) {
        return 'LULLI' + crypto.randomBytes(length).toString('hex').toUpperCase()
    }

    expiration(duration) {
        return duration == 7776000 ? 7776000 : duration == 604800 ? 604800 : duration == 86400 ? 86400 : duration == 0 ? 0 : 86400;
    }

    escapeRegExp(string) {
        return string.replace(/[.*=+:\-?^${}()|[\]\\]|\s/g, '\\$&')
    }

    delay(ms) {
        return new Promise(res => setTimeout(res, ms))
    }

    wa(number) {
        return number.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    }

    tag(number) {
        let user = number.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        return '@' + user.replace(/@.+/, '')
    }

    fstatus(text = '') {
        return {
            key: {
                fromMe: false,
                remoteJid: 'status@broadcast',
                participant: '0@s.whatsapp.net'
            },
            message: {
                extendedTextMessage: {
                    text: text
                },
            },
        }
    }

    fpayment = {
        key: {
            remoteJid: '0@s.whatsapp.net',
            fromMe: false,
            id: 'Mecha Bot Multi Device',
            participant: '0@s.whatsapp.net'
        },
        message: {
            requestPaymentMessage: {
                currencyCodeIso4217: 'USD',
                amount1000: 2026,
                requestFrom: '0@s.whatsapp.net',
                noteMessage: {
                    extendedTextMessage: {
                        text: 'Copyright © 2026 SuryaDev, AI. Mecha-Bot'
                    }
                },
                expiryTimestamp: 2023,
                amount: {
                    value: 1000000000000000,
                    offset: 1000,
                    currencyCode: 'USD'
                },
            },
        },
    }

    fverified = {
        key: {
            participant: '0@s.whatsapp.net',
            remoteJid: '0@s.whatsapp.net'
        },
        message: {
            conversation: 'SuryaDev Verified by WhatsApp'
        }
    }

    ftroli(text = '', thumb) {
        return {
            key: {
                fromMe: false,
                remoteJid: 'status@broadcast',
                participant: '0@s.whatsapp.net'
            },
            message: {
                orderMessage: {
                    itemCount: 1000000,
                    status: 1,
                    surface: 1,
                    message: text,
                    orderTitle: 'Copyright © 2026 SuryaDev.',
                    thumbnail: thumb,
                    sellerJid: '0@s.whatsapp.net'
                },
            },
        }
    }

    formatSize(size) {
        function round(value, precision) {
            var multiplier = Math.pow(10, precision || 0)
            return Math.round(value * multiplier) / multiplier
        }
        var megaByte = 1024 * 1024
        var gigaByte = 1024 * megaByte
        var teraByte = 1024 * gigaByte
        if (size < 1024) {
            return size + ' B'
        } else if (size < megaByte) {
            return round(size / 1024, 1) + ' KB'
        } else if (size < gigaByte) {
            return round(size / megaByte, 1) + ' MB'
        } else if (size < teraByte) {
            return round(size / gigaByte, 1) + ' GB'
        } else {
            return round(size / teraByte, 1) + ' TB'
        }
        return ''
    }

    expireTime(time) {
        let cek = ms(time - Date.now()); 
        return `${cek.days} hari ${cek.hours} jam ${cek.minutes} menit ${cek.seconds} detik`; 
    }

    toTime(time) {
        let cek = ms(time)
        let d = cek.days
        let h = cek.hours
        let m = cek.minutes
        let s = cek.seconds
        var dDisplay = d != 0 ? d + ' hari, ' : '';
        var hDisplay = h != 0 ? h + ' jam, ' : '';
        var mDisplay = m != 0 ? m + ' menit, ' : '';
        var sDisplay = s != 0 ? s + ' detik' : '';
        return dDisplay + hDisplay + mDisplay + sDisplay;
    }

    isNumber(number) {
        if (!number) return number
        number = parseInt(number)
        return typeof number == 'number' && !isNaN(number)
    }

    somematch(data, id) {
        let status = data.find((x) => x === id)
        return status ? true : false;
    }

    random(min, max = null) {
        if (max !== null) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        } else {
            return Math.floor(Math.random() * min) + 1
        }
    }

    async WAVersion() {
        let get = await fetch("https://web.whatsapp.com/check-update?version=1&platform=web").then(data => data.json())
        let version = [get.currentVersion.replace(/[.]/g, ', ')]
        return version
    }

    example(command, query) {
        return `_Example :_ ${command} ${query}`
    }

    generatePrompt(text) {
        return text[0].toUpperCase() + text.slice(1).toLowerCase();
    }

    jsonFormat(obj) {
        try {
            let print = (obj && (obj.constructor.name == 'Object' || obj.constructor.name == 'Array')) ? util.format(JSON.stringify(obj, null, 2)) : util.format(obj)
            return print
        } catch {
            return util.format(obj)
        }
    }

    formatNumber(integer) {
        let numb = parseInt(integer)
        return Number(numb).toLocaleString('id-ID')
    }

    filename(ext) {
        return `${Math.floor(Math.random() * 10000)}.${ext}`
    }

    isUrl(url) {
        return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/, 'gi'))
    }

    pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)]
    }

    findAdmin(arr) {
        return arr.filter((v) => v.admin !== null).map((i) => i.id)
    }

    toFirstCase(str) {
        let first = str.split(" ").map(nama => nama.charAt(0).toUpperCase() + nama.slice(1)).join(" ");
        return first
    }

    rupiah(x) {
        x = x.toString()
        var pattern = /(-?\d+)(\d{3})/;
        while (pattern.test(x)) x = x.replace(pattern, '$1.$2');
        return x;
    }

    ucword(str) {
        return (str + '').replace(/^([a-z])|\s+([a-z])/g, function(text) {
            return text.toUpperCase();
        })
    }

    texted(type, text) {
        if (type === 'bold') {
            return '*' + text + '*'
        } else if (type === 'italic') {
            return '_' + text + '_'
        } else if (type === 'monospace') {
            return '```' + text + '```'
        } else {
            return text
        }
    }

    clockString(ms) {
        let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
        let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
        let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
        return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
    }

    runtime(seconds) {
        seconds = Number(seconds);
        var d = Math.floor(seconds / (3600 * 24));
        var h = Math.floor(seconds % (3600 * 24) / 3600);
        var m = Math.floor(seconds % 3600 / 60);
        var s = Math.floor(seconds % 60);
        var dDisplay = d > 0 ? d + (d == 1 ? ' hari, ' : ' hari, ') : '';
        var hDisplay = h > 0 ? h + (h == 1 ? ' jam, ' : ' jam, ') : '';
        var mDisplay = m > 0 ? m + (m == 1 ? ' menit, ' : ' menit, ') : '';
        var sDisplay = s > 0 ? s + (s == 1 ? ' detik' : ' detik') : '';
        return dDisplay + hDisplay + mDisplay + sDisplay;
    }

    async getBuffer(url, options = {}) {
        try {
            let res = await axios({
                url,
                method: 'GET',
                headers: {
                    'DNT': 1,
                    'Upgrade-Insecure-Request': 1
                },
                ...options,
                responseType: 'arraybuffer'
            });
            return res.data;
        } catch (err) {
            return err
        }
    }

    bytesToSize(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    makeid(length) {
        let result = '';
        let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    isEmoji(emo) {
        let emoji_ranges = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
        let regexEmoji = new RegExp(emoji_ranges, 'gi');
        return emo.match(regexEmoji)
    }

    hitungmundur(tanggal, bulan, tahun) {
        let from = new Date(`${bulan} ${tanggal}, ${tahun} 00:00:00`).getTime();
        let now = Date.now();
        let distance = from - now;
        let days = Math.floor(distance / (1000 * 60 * 60 * 24));
        let hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor((distance % (1000 * 60)) / 1000);
        return days + ' hari ' + hours + ' jam ' + minutes + ' menit ' + seconds + ' detik'
    }

    reloadFile(file) {
        fs.watchFile(file, () => {
            fs.unwatchFile(file)
            console.log(chalk.greenBright.bold('[ UPDATE ]'), chalk.whiteBright(this.timeZone().time), chalk.cyan.bold('➠ ' + path.basename(file)))
        })
    }

    fileSize(number) {
        var SI_POSTFIXES = ["B", " KB", " MB", " GB", " TB", " PB", " EB"]
        var tier = Math.log10(Math.abs(number)) / 3 | 0
        if (tier == 0) return number
        var postfix = SI_POSTFIXES[tier]
        var scale = Math.pow(10, tier * 3)
        var scaled = number / scale
        var formatted = scaled.toFixed(1) + ''
        if (/\.0$/.test(formatted)) formatted = formatted.substr(0, formatted.length - 2)
        return formatted + postfix
    }

    async getSize(str) {
        if (!isNaN(str)) return this.formatSize(str)
        let header = await (await axios.get(str)).headers
        return this.formatSize(header['content-length'])
    }

    fetchText(url, options) {
        return new Promise(async (resolve, reject) => {
            fetch(url, options).then(response => response.text()).then(text => {
                resolve(text)
            }).catch((err) => {
                reject(err)
            })
        })
    }

    async fetchJson(url, options = {}) {
        try {
            const res = await axios({
                method: 'GET',
                url: url,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
                },
                ...options
            })
            return res.data
        } catch (err) {
            return err
        }
    }

    async fetchBuffer(file, options = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.isUrl(file)) {
                    let buff = await (await axios.get(file, {
                        responseType: "arraybuffer",
                        headers: options
                    })).data
                    resolve(buff)
                } else {
                    let buff = fs.readFileSync(file)
                    resolve(buff)
                }
            } catch {
                return ({
                    status: false
                })
            }
        })
    }

    ffmpeg(buffer, args = [], ext = '', ext2 = '') {
        return new Promise(async (resolve, reject) => {
            try {
                let tmp = path.join(__dirname, '../sampah', +new Date + '.' + ext)
                let out = tmp + '.' + ext2
                await fs.promises.writeFile(tmp, buffer)
                spawn("ffmpeg", ['-y', '-i', tmp, ...args,
                    out
                ]).on('error', reject).on('close', async (code) => {
                    try {
                        await fs.promises.unlink(tmp)
                        if (code !== 0) return reject(code)
                        resolve(await fs.promises.readFile(out))
                        await fs.promises.unlink(out)
                    } catch (e) {
                        reject(e)
                    }
                })
            } catch (e) {
                reject(e)
            }
        })
    }

    toPTT(buffer, ext) {
        return this.ffmpeg(buffer, ['-vn', '-c:a', 'libopus', '-b:a', '128k', '-vbr', 'on', '-compression_level', '10'], ext, 'opus')
    }

    async google(query) {
        try {
            let result;
            let res = await axios.get(`https://www.googleapis.com/customsearch/v1?key=AIzaSyB6HpEVkEvrexlhUFiwZii9R7dCqVEkBjk&cx=a3a45013127e34795&q=${encodeURIComponent(query)}`)
            if (res.data.items) {
                let items = res.data.items
                let results = []
                for (let i = 0; i < items.length; i++) {
                    let title = items[i].title
                    let link = items[i].link
                    let snippet = items[i].snippet
                    results.push({
                        title,
                        link,
                        snippet
                    })
                }
                result = {
                    status: true,
                    results: results
                }
            } else {
                result = {
                    status: false,
                    message: `Page Not found :/`
                }
            }
            return result
        } catch (error) {
            console.log(error)
            return {
                status: false,
                message: error.message
            }
        }
    }

    formatDate(n, locale = 'en') {
        let d = new Date(n * 1000);
        return d.toLocaleDateString(locale, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        });
    }

    async tiktokDl(url) {
        try {
            const domain = 'https://www.tikwm.com/api/';
            const res = await axios.post(domain, {}, {
                headers: {
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Origin': 'https://www.tikwm.com',
                    'Referer': 'https://www.tikwm.com/',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
                },
                params: {
                    url: url,
                    count: 12,
                    cursor: 0,
                    web: 1,
                    hd: 1
                }
            });
            const dataRes = res.data.data;
            if (!dataRes) {
                return {
                    status: false,
                    message: '✗ Gagal mengambil data TikTok atau video tidak ditemukan.'
                };
            }
            let mediaData = [];
            if (dataRes?.duration === 0) {
                dataRes.images.map(v => {
                    mediaData.push({
                        type: 'photo',
                        url: v
                    });
                });
            } else {
                mediaData.push({
                    type: 'watermark',
                    url: 'https://www.tikwm.com' + (dataRes?.wmplay || "/undefined"),
                }, {
                    type: 'nowatermark',
                    url: 'https://www.tikwm.com' + (dataRes?.play || "/undefined"),
                }, {
                    type: 'nowatermark_hd',
                    url: 'https://www.tikwm.com' + (dataRes?.hdplay || "/undefined")
                });
            }
            const json = {
                status: true,
                title: dataRes.title,
                taken_at: this.formatDate(dataRes.create_time).replace('1970', ''),
                region: dataRes.region,
                id: dataRes.id,
                durations: dataRes.duration,
                duration: dataRes.duration + ' Seconds',
                cover: 'https://www.tikwm.com' + dataRes.cover,
                size_wm: dataRes.wm_size,
                size_nowm: dataRes.size,
                size_nowm_hd: dataRes.hd_size,
                data: mediaData,
                music_info: {
                    id: dataRes.music_info.id,
                    title: dataRes.music_info.title,
                    author: dataRes.music_info.author,
                    album: dataRes.music_info.album ? dataRes.music_info.album : null,
                    url: 'https://www.tikwm.com' + (dataRes.music || dataRes.music_info.play)
                },
                stats: {
                    views: this.formatNumber(dataRes.play_count),
                    likes: this.formatNumber(dataRes.digg_count),
                    comment: this.formatNumber(dataRes.comment_count),
                    share: this.formatNumber(dataRes.share_count),
                    download: this.formatNumber(dataRes.download_count)
                },
                author: {
                    id: dataRes.author.id,
                    fullname: dataRes.author.unique_id,
                    nickname: dataRes.author.nickname,
                    avatar: 'https://www.tikwm.com' + dataRes.author.avatar
                }
            };
            return json;
        } catch (e) {
            console.error('✗ Error pada tiktokDl:', e.message);
            return {
                status: false,
                message: `✗ Terjadi kesalahan: ${e.message}`
            };
        }
    }

    generateLink(text) {
        const regex = /(https?:\/\/(?:www\.|(?!www))[^\s.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/gi;
        return text.match(regex) || [];
    }

    ttFixed(url) {
        if (!url.match(/(tiktok.com\/t\/)/g)) return url;
        let id = url.split('/t/')[1];
        return 'https://vm.tiktok.com/' + id;
    }

    filterDuplicates(array) {
        return [...new Set(array)];
    }

    async upscale(buffer, scale = "2") {
        try {
            const form = new FormData();
            form.append("image", Buffer.from(buffer), {
                filename: `${Date.now()}.png`,
                contentType: "image/png",
            });
            form.append("scale", scale);

            const { data } = await axios.post(
                "https://api2.pixelcut.app/image/upscale/v1",
                form, {
                    headers: {
                        ...form.getHeaders(),
                        "X-Client-Version": "web",
                        "X-Locale": "id",
                        accept: "application/json",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
                        "Referer": "https://www.pixelcut.ai/",
                        "Origin": "https://www.pixelcut.ai/",
                    },
                },
            );
            
            if (!data || !data.result_url) {
                throw new Error('✗ Tidak ada URL hasil dari API Pixelcut.app.');
            }

            return {
                status: true,
                result_url: data.result_url,
            };
        } catch (error) {
            console.error('✗ Error upscale (pixelcut.app):', error.response?.data || error.message);
            return {
                status: false,
                message: `✗ API Pixelcut.app gagal: ${error.response?.data?.message || error.message}`
            };
        }
    }
}

export default new Function();