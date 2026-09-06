const { Menu, Tray, nativeImage } = require('electron');

async function createTray({ app, iconPath, onShow, onQuit }) {
    let trayIcon = nativeImage.createFromPath(iconPath);

    if (trayIcon.isEmpty()) {
        trayIcon = await app.getFileIcon(process.execPath, {
            size: 'small'
        });
    }

    const tray = new Tray(trayIcon.resize({
        width: 16,
        height: 16,
        quality: 'best'
    }));

    tray.setToolTip('剪貼簿紀錄');
    tray.setContextMenu(Menu.buildFromTemplate([
        {
            label: '顯示剪貼簿',
            click: onShow
        },
        { type: 'separator' },
        {
            label: '結束程式',
            click: onQuit
        }
    ]));
    tray.on('click', onShow);

    return tray;
}

module.exports = createTray;
