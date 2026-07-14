/**
 * Google Drive Storage - Stub
 * Placeholder for future Google Drive integration.
 * All methods return safe no-op results so unified-db.js won't crash.
 */

class GoogleDriveStorage {
    constructor() {
        this.connected = false;
    }

    async connect(credentials) {
        console.log('[GoogleDrive] Stub: Google Drive not configured');
        this.connected = false;
        return { success: false, message: 'Google Drive not configured' };
    }

    async disconnect() {
        this.connected = false;
        return { success: true };
    }

    async loadData(filename) {
        return null;
    }

    async saveData(filename, data) {
        return { success: false, message: 'Google Drive not configured' };
    }

    async upload(filePath, destination) {
        return { success: false, error: 'Google Drive not configured' };
    }

    async download(filePath, destination) {
        return { success: false, error: 'Google Drive not configured' };
    }

    async list(directory) {
        return [];
    }

    async delete(filePath) {
        return { success: false, error: 'Google Drive not configured' };
    }

    async migrateFromLocal(dbPath) {
        return { success: false, message: 'Google Drive not configured' };
    }

    async getStorageInfo() {
        return { total: 0, used: 0, free: 0, user: null };
    }
}

module.exports = new GoogleDriveStorage();
