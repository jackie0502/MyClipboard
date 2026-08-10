function registerClipboardHandlers(ipcMain, clipboardService) {
  ipcMain.handle('clipboard:read', () => {
    try {
      const text = clipboardService.read();

      return {
        success: true,
        data: text
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('clipboard:write', async (event, text) => {
    try {
      await clipboardService.copy(text);

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
}

module.exports = registerClipboardHandlers;