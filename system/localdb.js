import fs from 'fs/promises';
import path from 'path';

export default class LocalDB {
    constructor() {
        this.file = path.join(process.cwd(), 'database', 'database.json');
        this.backupFile = path.join(process.cwd(), 'database', 'database.bak');
        this.tmpFile = path.join(process.cwd(), 'database', 'database.tmp');

        // Memori antrean untuk mencegah bentrok (Race Condition)
        this._queue = Promise.resolve();
    }

    read = async () => {
        let database = {};
        try {
            const fileContent = await fs.readFile(this.file, 'utf-8');
            database = JSON.parse(fileContent);
        } catch (error) {
            console.warn('⚠️ The database.json file is corrupted/empty. Restoring from backup...');
            try {
                const backupContent = await fs.readFile(this.backupFile, 'utf-8');
                database = JSON.parse(backupContent);
                
                // Tulis ulang ke file utama agar pulih
                await fs.writeFile(this.file, JSON.stringify(database));
                console.log('✅ Successfully restored database from backup.');
            } catch (backupError) {
                console.warn('⚠️ Backup is not available. Create a new database...');
                database = {};
                await this.save(database);
            }
        }
        return database;
    }

    // Fungsi save dipanggil, dimasukkan ke antrean
    save = (data) => {
        this._queue = this._queue.then(() => this._executeSave(data)).catch(console.error);
        return this._queue;
    }

    // Eksekutor asli, dijalankan bergantian satu per satu
    _executeSave = async (data) => {
        const dbData = data || global.db || {};
        const dirname = path.dirname(this.file);
        
        try {
            await fs.mkdir(dirname, { recursive: true });

            // Stringify menggunakan native V8 engine (Jauh lebih cepat dan hemat RAM)
            const jsonString = JSON.stringify(dbData);

            // Atomic write untuk mencegah corruption
            await fs.writeFile(this.tmpFile, jsonString);
            await fs.rename(this.tmpFile, this.file);

            // Membuat backup file dengan string yang sama (mengurangi beban kerja CPU 2x lipat)
            await fs.writeFile(this.backupFile, jsonString);
        } catch (error) {
            console.error('❌ Error saving local database:', error.message);
        }
        return this.file;
    }
}