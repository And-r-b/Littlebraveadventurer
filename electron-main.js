const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    kiosk: true,
    autoHideMenuBar: true,
    fullscreenable: false,
    webPreferences: {
      contextIsolation: true,
      devTools: false
    },
    icon: path.join(__dirname, 'icons', 'smallknight.ico')
  });

  win.webContents.on('devtools-opened', () => win.webContents.closeDevTools());
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  globalShortcut.register('CommandOrControl+R', () => {});
  globalShortcut.register('F5', () => {});
  globalShortcut.register('CommandOrControl+Shift+I', () => {});
  globalShortcut.register('F12', () => {});
  createWindow();
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });