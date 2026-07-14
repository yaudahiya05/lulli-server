import LocalDB from './localdb.js';

class Database {
    constructor() {
        this.dbInstance = new LocalDB();

        // Lock untuk mencegah Race Condition saat save (Data Safety)
        this.isSaving = false; 
    }

    initDatabase = async () => {
        // Sepenuhnya serahkan pembacaan file ke LocalDB (Prinsip DRY)
        const data = await this.dbInstance.read().catch((err) => {
            console.error("✗ Gagal membaca database:", err.message);
            return {};
        });

        // Inisialisasi struktur dasar ke global
        global.db = {
            users: {},
            groups: {},
            sticker: {},
            setting: {},
            ai_memory: {},
            jadibot: [],
            ...(data || {}) // Merge data dari storage
        };

        // SAFETY MEASURE: Pastikan object utama selalu ada (Anti-Crash)
        // Mencegah TypeError jika file JSON di disk tidak memiliki key tertentu
        global.db.users = global.db.users || {};
        global.db.groups = global.db.groups || {};
        global.db.sticker = global.db.sticker || {};
        global.db.setting = global.db.setting || {};
        global.db.ai_memory = global.db.ai_memory || {};
        global.db.jadibot = global.db.jadibot || [];

        // Simpan inisialisasi pertama
        await this.save();
    }

    save = async () => {
        // Mencegah penumpukan proses save yang memblokir Event Loop (Hemat CPU/RAM)
        if (!global.db || this.isSaving) return;

        this.isSaving = true; // Kunci proses
        try {
            await this.dbInstance.save(global.db);
        } catch (error) {
            console.error("✗ Error saving database:", error.message);
        } finally {
            this.isSaving = false; // Buka kunci proses setelah selesai
        }
    }
}

export default new Database();