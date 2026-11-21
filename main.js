/* ==========================================================================
   ReyadMDX — عملية Electron الرئيسية
   ========================================================================== */
const { app, BrowserWindow, dialog, ipcMain, shell, Menu, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const windowsUpdate = require('./windows-update');

// أيقونة النافذة: يجرّب ico ثم png ثم يسيبها للنظام
function appIcon() {
  const candidates = [
    path.join(__dirname, 'build', 'icon.ico'),
    path.join(__dirname, 'app', 'icon.png'),
    path.join(process.resourcesPath || '', 'icon.ico')
  ];
  for (const c of candidates) {
    try { if (c && fsSync.existsSync(c)) return c; } catch (e) {}
  }
  return undefined;
}

// Each document owns its window, save state and undo state.
const windows = new Map();
const pendingPaths = [];
let updating = false;
let stagedUpdate;

// عنوان النافذة بيحمل رقم الإصدار عشان تعرف أي نسخة شغالة
const TITLE = 'ReyadMDX v' + app.getVersion();
app.setName('ReyadMDX');
// Preserve settings from existing Windows installations after the product rename.
app.setPath('userData', app.commandLine.getSwitchValue('user-data-dir') || path.join(app.getPath('appData'), 'mdx-reader'));

const MD_EXT = ['md', 'markdown', 'mdown', 'mkd', 'mdx', 'txt'];

/* ------------------------- التقاط الملف من ويندوز ------------------------ */
function pathFromArgv(argv, workingDirectory = process.cwd()) {
  const args = argv.slice(app.isPackaged ? 1 : 2);
  for (const a of args) {
    if (a.startsWith('-')) continue;
    const ext = path.extname(a).slice(1).toLowerCase();
    if (MD_EXT.includes(ext)) return path.resolve(workingDirectory, a);
  }
  return null;
}

// Keep one main process, with a separate document window for every launch.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv, workingDirectory) => {
    app.whenReady().then(() => createWindow(pathFromArgv(argv, workingDirectory)));
  });
}

// macOS
app.on('open-file', (e, p) => {
  e.preventDefault();
  if (app.isReady()) createWindow(p); else pendingPaths.push(p);
});

/* ------------------------------- النافذة -------------------------------- */
function createWindow(initialPath = null) {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 720,
    minHeight: 480,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0d1117' : '#ffffff',
    title: TITLE,
    icon: appIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  const context = { win, pendingPath: initialPath, isDirty: false, editRevision: 0, forceClose: false, closeAsked: false,
    editorHistory: { focused: false, canUndo: false, canRedo: false } };
  windows.set(win.id, context);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    windows.delete(win.id);
    context.finishUpdateSave?.(false);
  });
  win.webContents.on('render-process-gone', () => context.finishUpdateSave?.(false));
  win.webContents.on('did-start-navigation', (_event, _url, isInPlace, isMainFrame) => {
    if (isMainFrame && !isInPlace) context.finishUpdateSave?.(false);
  });

  /* سؤال الحفظ عند الإغلاق.
     بنستخدم showMessageBoxSync عن قصد: النسخة غير المتزامنة مع
     preventDefault بتسيب النافذة معلّقة لو حصل أي خطأ في الـ Promise.
     المتزامنة بتقف وتستنى الرد، ولو حصل خطأ بنحافظ على المستند. */
  win.on('close', (e) => {
    if (context.forceClose || !context.isDirty) return;
    if (context.closeAsked) { e.preventDefault(); return; }

    let choice = 2;
    context.closeAsked = true;
    try {
      choice = dialog.showMessageBoxSync(win, savePrompt(false));
    } catch (err) {
      choice = 2;
    }
    context.closeAsked = false;

    if (choice === 2) { e.preventDefault(); return; }   // إلغاء ⇒ ابقَ مفتوحًا
    if (choice === 1) { context.isDirty = false; return; }

    // احفظ ثم اغلق: الـ renderer ينادي close-now بعد نجاح الحفظ
    e.preventDefault();
    if (win) win.webContents.send('menu', 'save-then-close');
  });

  // أي رابط خارجي يفتح في المتصفح مش جوه التطبيق
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternal(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // شبكة أمان: النافذة متسيبش صفحة التطبيق أبدًا (كانت بتجيب شاشة سودا)
  win.webContents.on('will-navigate', (e, url) => {
    if (url === win.webContents.getURL()) return;   // إعادة تحميل عادية
    e.preventDefault();
    if (isSafeExternal(url)) shell.openExternal(url);
  });

  buildMenu();
  win.webContents.on('context-menu', (_event, params) => {
    const editorHistory = context.editorHistory;
    const flags = params.editFlags;
    const template = [];
    if (params.isEditable) {
      template.push(
        { label: 'تراجع / Undo', enabled: editorHistory.focused ? editorHistory.canUndo : flags.canUndo,
          click: () => win.webContents.send('menu', 'undo') },
        { label: 'إعادة / Redo', enabled: editorHistory.focused ? editorHistory.canRedo : flags.canRedo,
          click: () => win.webContents.send('menu', 'redo') },
        { type: 'separator' },
        { role: 'cut', label: 'قص / Cut', enabled: flags.canCut }
      );
    }
    template.push({ role: 'copy', label: 'نسخ / Copy', enabled: flags.canCopy });
    if (params.isEditable) template.push({ role: 'paste', label: 'لصق / Paste', enabled: flags.canPaste });
    template.push({ type: 'separator' }, { role: 'selectAll', label: 'تحديد الكل / Select all' });
    if (isSafeExternal(params.linkURL)) {
      template.push({ label: 'فتح الرابط / Open link', click: () => shell.openExternal(params.linkURL) });
    }
    Menu.buildFromTemplate(template).popup({ window: win });
  });
  return win;
}

function savePrompt(forUpdate) {
  return {
    type: 'warning',
    noLink: true,
    buttons: ['حفظ / Save', forUpdate ? 'متابعة بدون حفظ / Discard' : 'إغلاق بدون حفظ / Close', 'إلغاء / Cancel'],
    defaultId: 0,
    cancelId: 2,
    title: 'ReyadMDX',
    message: 'يوجد تعديلات غير محفوظة',
    detail: forUpdate ? 'احفظ تعديلاتك قبل تثبيت التحديث. / Save changes before installing the update.'
      : 'Save your changes before closing?'
  };
}

function saveForUpdate(context) {
  return new Promise(resolve => {
    context.finishUpdateSave = saved => {
      delete context.finishUpdateSave;
      resolve(saved);
    };
    context.win.webContents.send('menu', 'save-for-update');
  });
}

async function prepareUpdate() {
  const discarded = new Map();
  for (const context of [...windows.values()]) {
    if (context.win.isDestroyed() || !context.isDirty) continue;
    const revision = context.editRevision;
    const { response } = await dialog.showMessageBox(context.win, savePrompt(true));
    if (response === 2 || context.win.isDestroyed()) return false;
    if (response === 1) discarded.set(context, revision);
    else if (!await saveForUpdate(context)) return false;
  }
  return [...windows.values()].every(context => !context.isDirty || discarded.get(context) === context.editRevision);
}

function activeWindow() {
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
}

function sendMenu(action) {
  const win = activeWindow();
  if (win) win.webContents.send('menu', action);
}

function buildMenu() {
  const template = [
    {
      label: 'ملف / File',
      submenu: [
        { label: 'نافذة جديدة / New window', accelerator: 'CmdOrCtrl+N', click: () => createWindow() },
        { label: 'فتح… / Open…', accelerator: 'CmdOrCtrl+O', click: () => sendMenu('open') },
        { label: 'حفظ / Save', accelerator: 'CmdOrCtrl+S', click: () => sendMenu('save') },
        { label: 'إغلاق الملف / Close document', accelerator: 'CmdOrCtrl+W', click: () => sendMenu('close-document') },
        { type: 'separator' },
        { label: 'طباعة / Print', accelerator: 'CmdOrCtrl+P', click: () => { const win = activeWindow(); if (win) win.webContents.print(); } },
        { type: 'separator' },
        {
          label: 'إغلاق إجباري بدون حفظ / Force close',
          accelerator: 'CmdOrCtrl+Shift+Q',
          click: () => { const win = activeWindow(); if (win) { windows.get(win.id).forceClose = true; win.close(); } }
        },
        { role: 'quit', label: 'خروج / Quit' }
      ]
    },
    {
      label: 'تحرير / Edit',
      submenu: [
        { label: 'تراجع / Undo', accelerator: 'CmdOrCtrl+Z', click: () => sendMenu('undo') },
        { label: 'إعادة / Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => sendMenu('redo') },
        { label: 'إعادة / Redo', accelerator: 'Ctrl+Y', visible: false, click: () => sendMenu('redo') },
        { type: 'separator' },
        { role: 'cut', label: 'قص' }, { role: 'copy', label: 'نسخ' },
        { role: 'paste', label: 'لصق' }, { role: 'selectAll', label: 'تحديد الكل' }
      ]
    },
    {
      label: 'عرض / View',
      submenu: [
        { role: 'reload', label: 'إعادة تحميل' },
        { role: 'toggleDevTools', label: 'أدوات المطور' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'حجم افتراضي' },
        { role: 'zoomIn', label: 'تكبير' },
        { role: 'zoomOut', label: 'تصغير' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'ملء الشاشة' }
      ]
    }
  ];
  template.push({
    label: 'مساعدة / Help',
    submenu: [{ label: 'الإصدار والتحديثات / Version and updates',
      click: () => sendMenu('check-updates') }]
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function sendOpen(win, p) {
  try {
    const content = await fs.readFile(p, 'utf8');
    if (win.isDestroyed()) return;
    win.webContents.send('open-path', { ok: true, path: p, content });
    win.setTitle(path.basename(p) + ' — ' + TITLE);
  } catch (err) {
    if (!win.isDestroyed()) win.webContents.send('open-path', { ok: false, error: String(err) });
  }
}

/* --------------------------------- IPC ---------------------------------- */
async function updateScope() {
  if (!app.isPackaged || process.platform !== 'win32' || process.env.PORTABLE_EXECUTABLE_FILE) return null;
  return windowsUpdate.installationScope(process.execPath);
}

ipcMain.handle('app-info', async () => ({ version: app.getVersion(), platform: 'windows',
  portable: !!process.env.PORTABLE_EXECUTABLE_FILE,
  canInstallUpdate: !!await updateScope().catch(() => null) }));

// Fixed endpoint: renderer content cannot use this bridge to request arbitrary URLs.
async function latestRelease() {
  try {
    const response = await fetch('https://api.github.com/repos/reyad-dev/reyad-mdx/releases/latest', {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ReyadMDX/' + app.getVersion(),
        'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(15000), redirect: 'error'
    });
    if (response.status === 404) return { ok: false, error: 'no-release' };
    if (response.status === 403 || response.status === 429) return { ok: false, error: 'rate-limit' };
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return { ok: true, release: await response.json() };
  } catch (error) { return { ok: false, error: 'network' }; }
}
ipcMain.handle('latest-release', latestRelease);

ipcMain.handle('install-update', async (event, version) => {
  windowContext(event);
  if (updating) return { status: 'update-busy' };
  updating = true;
  try {
    const scope = await updateScope();
    if (!scope) throw new Error('No matching installed copy');
    if (stagedUpdate?.version !== version) {
      const { ok, release } = await latestRelease();
      if (!ok) throw new Error('Could not refresh release metadata');
      const installer = await windowsUpdate.downloadInstaller(release, app.getVersion(), version, app.getPath('userData'));
      stagedUpdate = { ...installer, version };
    }
    await windowsUpdate.verifyInstaller(stagedUpdate);
    if (!await prepareUpdate()) return { status: 'update-canceled' };
    // Prevent further input while handing off to the installer.
    for (const { win } of windows.values()) win.setEnabled(false);
    await windowsUpdate.startInstaller(stagedUpdate, scope);
    for (const context of windows.values()) context.forceClose = true;
    app.quit();
    return { status: 'installing' };
  } catch (error) {
    stagedUpdate = undefined;
    for (const { win } of windows.values()) win.setEnabled(true);
    console.error('Windows update failed:', error);
    return { status: 'update-failed' };
  } finally {
    updating = false;
  }
});

function windowContext(event) {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || !windows.has(win.id)) throw new Error('Unknown document window');
  return windows.get(win.id);
}

ipcMain.handle('new-window', () => { createWindow(); return { ok: true }; });

ipcMain.handle('ready', (event) => {
  const context = windowContext(event);
  const p = context.pendingPath;
  context.pendingPath = null;
  if (p) sendOpen(context.win, p);
  return true;
});

ipcMain.handle('open-file', async (event, options) => {
  const { win } = windowContext(event);
  const r = await dialog.showOpenDialog(win, {
    title: 'اختر ملف Markdown',
    properties: ['openFile'],
    filters: [
      { name: 'Markdown', extensions: MD_EXT },
      { name: 'كل الملفات / All files', extensions: ['*'] }
    ]
  });
  if (r.canceled || !r.filePaths.length) return { ok: false, canceled: true };
  if (options && options.newWindow) {
    createWindow(r.filePaths[0]);
    return { ok: false, openedInNewWindow: true };
  }
  try {
    const p = r.filePaths[0];
    const content = await fs.readFile(p, 'utf8');
    win.setTitle(path.basename(p) + ' — ' + TITLE);
    return { ok: true, path: p, content };
  } catch (err) { return { ok: false, error: String(err) }; }
});

ipcMain.handle('read-path', async (_e, p) => {
  // ملفات Markdown/نص بس — النافذة متقدرش تطلب أي ملف تاني من الجهاز
  if (typeof p !== 'string' || !MD_EXT.includes(path.extname(p).slice(1).toLowerCase())) {
    return { ok: false, error: 'Unsupported file type' };
  }
  try { return { ok: true, path: p, content: await fs.readFile(p, 'utf8') }; }
  catch (err) { return { ok: false, error: String(err) }; }
});

ipcMain.handle('save-file', async (_e, p, content) => {
  try { await fs.writeFile(p, content, 'utf8'); return { ok: true, path: p }; }
  catch (err) { return { ok: false, error: String(err) }; }
});

ipcMain.handle('save-file-as', async (event, suggested, content) => {
  const { win } = windowContext(event);
  const r = await dialog.showSaveDialog(win, {
    title: 'حفظ باسم',
    defaultPath: suggested,
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'HTML', extensions: ['html'] },
      { name: 'كل الملفات / All files', extensions: ['*'] }
    ]
  });
  if (r.canceled || !r.filePath) return { ok: false, canceled: true };
  try {
    await fs.writeFile(r.filePath, content, 'utf8');
    return { ok: true, path: r.filePath };
  } catch (err) { return { ok: false, error: String(err) }; }
});

ipcMain.handle('set-dirty', (event, v) => {
  const context = windowContext(event);
  context.isDirty = !!v;
  context.editRevision++;
});
ipcMain.handle('finish-update-save', (event) => {
  const context = windowContext(event);
  context.finishUpdateSave?.(!context.isDirty);
});
ipcMain.handle('edit-state', (event, state) => {
  windowContext(event).editorHistory = { focused: !!state.focused, canUndo: !!state.canUndo, canRedo: !!state.canRedo };
});

ipcMain.handle('close-now', (event) => {
  const context = windowContext(event);
  context.forceClose = true;
  context.isDirty = false;
  context.win.close();
});

// المسموح بس: http / https / mailto
function isSafeExternal(url) {
  try { return ['http:', 'https:', 'mailto:'].includes(new URL(url).protocol); }
  catch (e) { return false; }
}

ipcMain.handle('open-external', (_e, url) => { if (isSafeExternal(url)) shell.openExternal(url); });
ipcMain.handle('set-title', (event, name) => { windowContext(event).win.setTitle(name ? name + ' — ' + TITLE : TITLE); });

/* -------------------------------- الإقلاع -------------------------------- */
app.whenReady().then(() => {
  if (!gotLock) return;
  if (pendingPaths.length) pendingPaths.splice(0).forEach(p => createWindow(p));
  else createWindow(pathFromArgv(process.argv));
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
