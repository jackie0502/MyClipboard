class ClipboardService {
    constructor(systemClipboard, historyRepo) {
        this.systemClipboard = systemClipboard;
        this.historyRepo = historyRepo;
    }

    read() {
        return this.systemClipboard.readText();
    }

    async copy(text) {
        if (typeof text !== 'string') {
        throw new TypeError('複製內容必須是字串');
        }

        this.systemClipboard.writeText(text);
        await this.historyRepo.add(text);
    }

    async getHistory() {
        const history = await this.historyRepo.getAll();

        return [...history].reverse();
    }
}

module.exports = ClipboardService;