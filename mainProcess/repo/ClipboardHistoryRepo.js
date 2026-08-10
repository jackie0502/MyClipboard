const fs = require('fs/promises');

class ClipboardHistoryRepo {
    constructor(historyFilePath) {
        this.historyFilePath = historyFilePath;
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
        const copiedAt = new Date().toISOString();

        const record = {
            id: copiedAt,
            text,
            copiedAt
        };

        history.push(record);

        await fs.writeFile(
            this.historyFilePath,
            JSON.stringify(history, null, 2),
            'utf8'
        );

        return record;
    }
}
module.exports = ClipboardHistoryRepo;