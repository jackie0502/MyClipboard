class ClipboardMonitor {
    constructor(systemClipboard, historyRepo) {
        this.systemClipboard = systemClipboard;
        this.historyRepo = historyRepo;

        this.lastText = '';
        this.timer = null;
        this.checking = false;
    }
    start(interval = 500) {
        if (this.timer) {
            return;
        }

        // 設定啟動時剪貼簿為初始值
        this.lastText = this.systemClipboard.readText();

        this.timer = setInterval(async () => {
            await this.checkClipboard();
        }, interval);
    }

    async checkClipboard() {
        // 確保前次檢查已完成
        if (this.checking) {
            return;
        }

        this.checking = true;

        try {
            const currentText =
                this.systemClipboard.readText();

            if (currentText && currentText !== this.lastText) {
                this.lastText = currentText;

                await this.historyRepo.add(currentText);

                console.log('偵測到新的剪貼簿內容：', currentText);
            }
        } catch (error) {
            console.error('監控剪貼簿失敗：', error);
        } finally {
            this.checking = false;
        }
    }
    stop() {
        if (!this.timer) {
            return;
        }

        clearInterval(this.timer);
        this.timer = null;
    }
}
module.exports = ClipboardMonitor;