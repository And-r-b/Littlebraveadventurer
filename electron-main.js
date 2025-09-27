
// electron-main.js
const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron'); // <-- add ipcMain + globalShortcut
const path = require('path');
const fs = require('fs');

// For Dev Testing for sound.
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

try {
  // This must run in the main process, before BrowserWindow
  require('steamworks.js').electronEnableSteamOverlay();
  console.log('[Steam] Overlay hook enabled');
} catch (e) {
  console.warn('[Steam] Overlay hook failed:', e?.message || e);
}

// Ensure only one instance of the app
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

let win;
const SAVE_FILE = path.join(app.getPath('userData'), 'save.json');

function createWindow() {
  win = new BrowserWindow({
    // Allow toggling fullscreen freely:
    fullscreen: true,
    fullscreenable: true,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      devTools: false,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js') // <-- add this
    },
    icon: path.join(__dirname, 'icons', 'smallknight.ico')
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

ipcMain.handle('save:read', async () => {
  try {
    if (!fs.existsSync(SAVE_FILE)) return null;
    const raw = fs.readFileSync(SAVE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('read save failed', e);
    return null;
  }
});

ipcMain.handle('save:write', async (_evt, saveObj) => {
  try {
    fs.mkdirSync(path.dirname(SAVE_FILE), { recursive: true });
    fs.writeFileSync(SAVE_FILE, JSON.stringify(saveObj, null, 2), 'utf-8');
    return { ok: true };
  } catch (e) {
    console.error('write save failed', e);
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle('save:clear', async () => {
  try {
    if (fs.existsSync(SAVE_FILE)) fs.unlinkSync(SAVE_FILE);
    return { ok: true };
  } catch (e) {
    console.error('clear save failed', e);
    return { ok: false, error: String(e) };
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // usual quit behavior (keep whatever you already have)
  if (process.platform !== 'darwin') app.quit();
});