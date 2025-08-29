// electron-main.js
const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron'); // <-- add ipcMain + globalShortcut
const path = require('path');

// For Dev Testing for sound.
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

let win;

function createWindow() {
  win = new BrowserWindow({
    // Allow toggling fullscreen freely:
    fullscreen: true,
    fullscreenable: true,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      devTools: false,
      preload: path.join(__dirname, 'preload.js') // <-- add this
    },
    icon: path.join(__dirname, 'icons', 'png', 'smallknight.png')
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  // F11 to toggle fullscreen
  globalShortcut.register('F11', () => {
    const focused = BrowserWindow.getFocusedWindow();
    if (focused) focused.setFullScreen(!focused.isFullScreen());
  });
});

// Renderer calls: window.electronAPI.toggleFullScreen()
ipcMain.handle('toggle-fullscreen', (event) => {
  const w = BrowserWindow.fromWebContents(event.sender);
  const next = !w.isFullScreen();
  w.setFullScreen(next);
  return next; // tell renderer the new state
});

ipcMain.handle('get-fullscreen-state', (event) => {
  const w = BrowserWindow.fromWebContents(event.sender);
  return w.isFullScreen();
});

ipcMain.handle("quit-app", () => {
  app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // usual quit behavior (keep whatever you already have)
  if (process.platform !== 'darwin') app.quit();
});