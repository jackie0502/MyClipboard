const fs = require('fs/promises');
const EventEmitter = require('events');

class ClipboardHistoryRepo extends EventEmitter{
    constructor(historyFilePath, maxRecords = 5) {
        super();
        this.historyFilePath = historyFilePath;
        this.maxRecords = maxRecords;
    }

    async getAll() {
        try {
            const json = await fs.readFile(this.historyFilePath, 'utf8');
            const history = JSON.parse(json);

            return Array.isArray(history) ? history : [];

        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }

            throw error;
        }
    }

    async add(text){
        const history = await this.getAll();
        const alreadyExists = history.some((record) => 
            record.text === text
        );

        if (alreadyExists)return null;

        const copiedAt = new Date().toISOString();
        const record = {
            id: copiedAt,
            text,
            copiedAt
        };

        history.push(record);

        const limitedHistory = history.slice(-this.maxRecords);
        await fs.writeFile(this.historyFilePath, JSON.stringify(limitedHistory, null, 2), 'utf8');
        
        this.emit('changed', record);

        return record;
    }
    async existsByText(text) {
        const history = await this.getAll();

        return history.some((record) => 
            record.text === text
        );
    }
}
module.exports = ClipboardHistoryRepo;