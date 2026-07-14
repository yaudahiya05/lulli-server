import fs from 'fs';
import archiver from 'archiver';
import func from './functions.js';
import WhatsAppBot from '../clone.js';
import multidb from './multidb.js';
import { fileURLToPath } from 'url';
import socket from './socket.js';

const __filename = fileURLToPath(import.meta.url);
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const OWNER_JID = config.owner || '6285700408187@s.whatsapp.net';

export default async function handleEvents(client) {
    // Kunci Global: Mencegah eksekusi ganda jika dipanggil oleh socket clone
    if (global.isEventsStarted) return;
    global.isEventsStarted = true;

    if (global.db?.jadibot) {
        for (const clone of global.db.jadibot) {
            if (clone.status) {
                await new Promise(r => setTimeout(r, 5000));
                const bot = new WhatsAppBot(clone);
                bot.connect().catch(() => bot.connect());
            }
        }
    }
    try {
        await import('./newsletter.js');
    } catch {}

    function archiveFolders(dateStr) {
        console.log('Memulai Backup Session And Database...');
        
        // 1. GARBAGE COLLECTOR: Sapu bersih sisa file backup lama sebelum membuat yang baru
        try {
            const files = fs.readdirSync('./');
            for (const file of files) {
                if (file.startsWith('backup_') && file.endsWith('.zip')) {
                    fs.unlinkSync(`./${file}`);
                    console.log(`[CLEANUP] File backup lama dihapus: ${file}`);
                }
            }
        } catch (e) {
            console.error('✗ Gagal membersihkan backup lama:', e.message);
        }

        // 2. Nama file dinamis agar tidak EBUSY (Bentrokan dengan stream kemarin)
        const backupName = `backup_${dateStr.replace(/\//g, '-')}.zip`;
        const output = fs.createWriteStream(backupName);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', async () => {
            try {
                await client.sendMessage(OWNER_JID, {
                    document: { url: `./${backupName}` },
                    caption: `*Auto Backup*\nTotal size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB.`,
                    mimetype: 'application/zip',
                    fileName: backupName
                });

                console.log(`✓ Backup ${backupName} berhasil dikirim. Melanjutkan runtime bot...`);
            } catch (err) {
                console.error('✗ Gagal mengirim file backup:', err.message);
            } finally {
                // 3. Selalu eksekusi penghapusan file HARI INI di blok finally agar disk storage aman
                if (fs.existsSync(backupName)) {
                    fs.unlinkSync(backupName);
                }
            }
        });

        // Tangkap error jika archiver gagal membaca file
        archive.on('error', (err) => {
            console.error('✗ Gagal membuat archive ZIP:', err.message);
            output.destroy(); // Hancurkan stream agar tidak menggantung
            if (fs.existsSync(backupName)) fs.unlinkSync(backupName);
        });
        
        archive.pipe(output);
        
        // PENGAMAN: Hanya memasukkan folder/file yang benar-benar ada di server
        ['session', 'database', 'clone'].forEach(dir => {
            if (fs.existsSync(dir)) {
                const stat = fs.statSync(dir);
                if (stat.isDirectory()) {
                    archive.directory(`${dir}/`, dir);
                } else if (stat.isFile()) {
                    archive.file(dir, { name: dir });
                }
            }
        });
        
        archive.finalize();
    }

    const checkRoutines = async () => {
        // Ekstraksi waktu 100% Bulletproof (mengamankan format yang suka berubah di Replit)
        const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
        const h = d.getHours().toString().padStart(2, '0');
        const m = d.getMinutes().toString().padStart(2, '0');
        const timeNow = `${h}:${m}`;
        const dateToday = d.toLocaleDateString('id-ID'); // Format: DD/MM/YYYY

        if (!global.db) return; 

        global.db.backupInfo ??= { lastBackupDate: '' };

        // 1. Cek Auto Backup
        if (timeNow === '22:00' && global.db.backupInfo.lastBackupDate !== dateToday) {
            global.db.backupInfo.lastBackupDate = dateToday;
            archiveFolders(dateToday); // Melempar tanggal hari ini sebagai penamaan file
        }

        // 2. Cek Jadibot Expired
        if (global.db?.jadibot && Array.isArray(global.db.jadibot)) {
            // Gunakan iterasi mundur (dari belakang) agar proses splice(hapus) tidak mengacaukan urutan array
            for (let i = global.db.jadibot.length - 1; i >= 0; i--) {
                const botDb = global.db.jadibot[i];
                const nowMs = Date.now();

                // Abaikan pengecekan jika bot tersebut permanen atau expired-nya bernilai 0 / tidak valid
                if (botDb.expired === 'PERMANENT' || !botDb.expired || botDb.expired === 0 || isNaN(botDb.expired)) continue;

                if (botDb.expired < nowMs) {
                    const targetJid = botDb.number;

                    // Notif HANYA ke Owner
                    client.sendMessage(OWNER_JID, {
                        text: `⚠️ *JADIBOT EXPIRED*\n\nSesi Jadibot @${targetJid.split('@')[0]} telah habis dan dihapus secara permanen dari database.`,
                        mentions: [targetJid]
                    }).catch(() => {});

                    // Putuskan koneksi (jika sedang menyala saat expired)
                    const botSocket = socket.get ? socket.get(targetJid) : null;
                    if (botSocket) {
                        try { botSocket.end("Close"); } catch(e){}
                        if (botSocket.ws) botSocket.ws.close();
                    }

                    // Bersihkan folder sesi Jadibot tersebut agar storage tidak penuh
                    try {
                        const sessionDir = `./clone/${targetJid.split('@')[0]}`;
                        if (fs.existsSync(sessionDir)) {
                            fs.rmSync(sessionDir, { recursive: true, force: true });
                        }
                    } catch (err) {
                        console.error('Gagal menghapus folder clone:', err.message);
                    }

                    // Hapus data bot secara total dari database array (listbot)
                    global.db.jadibot.splice(i, 1);
                }
            }
        }
    }

    // Hanya 1 Interval untuk semua tugas repetitif
    setInterval(async () => {
        await checkRoutines();
        if (global.db) await multidb.save();
    }, 30_000);
}