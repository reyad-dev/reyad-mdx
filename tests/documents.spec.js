const { test, expect, _electron } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const standalone = pathToFileURL(path.resolve('MDX-Reader-Standalone.html')).href;

test('New and Close document protect unsaved content and clear the Android draft and undo history', async ({ page }) => {
  await page.addInitScript(() => {
    window.mdxNative = { platform: 'android', ready() {}, onMenu() {}, onOpenPath() {}, setDirty() {}, setTitle() {} };
  });
  await page.goto(standalone);
  await page.locator('[data-view="editor"]').click();
  await page.locator('#editor').fill('مستند قديم غير محفوظ');
  page.once('dialog', d => d.dismiss());
  await page.locator('#btnNew').click();
  await expect(page.locator('#editor')).toHaveValue('مستند قديم غير محفوظ');
  page.once('dialog', d => d.accept());
  await page.locator('#btnNew').click();
  await expect(page.locator('#editor')).toHaveValue('');
  await expect(page.locator('#btnUndo')).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('mdx.android.draft'))).toBeNull();
  await page.reload();
  await expect(page.locator('#editor')).toHaveValue('');
  await page.locator('#editor').fill('مسودة جديدة');
  await page.reload();
  await expect(page.locator('#editor')).toHaveValue('مسودة جديدة');
  page.once('dialog', d => d.accept());
  await page.locator('#btnCloseDoc').click();
  await page.reload();
  await expect(page.locator('#editor')).toHaveValue('');
});

test('Android native closed state suppresses a stale draft and closes only after durable confirmation', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mdx.android.draft', JSON.stringify({text: 'stale old document', savedText: 'stale old document'}));
    window.mdxNative = { platform: 'android', ready() {}, onMenu() {}, onOpenPath() {}, setDirty() {}, setTitle() {},
      getDocumentState: async () => ({closed: true}),
      setDocumentClosed: closed => closed ? new Promise(resolve => {window.finishClose = () => resolve({ok:true});}) : Promise.resolve({ok:true}) };
  });
  await page.goto(standalone);
  await expect(page.locator('#editor')).toHaveValue('');
  await page.locator('[data-view="editor"]').click();
  await page.locator('#editor').fill('new draft');
  page.once('dialog', d => d.accept());
  await page.locator('#btnCloseDoc').click();
  await expect(page.locator('#editor')).toHaveValue('new draft');
  await page.evaluate(() => window.finishClose());
  await expect(page.locator('#editor')).toHaveValue('');
  expect(await page.evaluate(() => localStorage.getItem('mdx.android.draft'))).toBeNull();
});

test('a previous document save finishing after New cannot mark the new draft saved', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mdx.android.draft', JSON.stringify({text: 'old', savedText: 'old', name: 'old.md', path: 'content://old'}));
    window.mdxNative = { platform: 'android', ready() {}, onMenu() {}, onOpenPath() {}, setDirty() {}, setTitle() {},
      saveFile: () => new Promise(resolve => { window.completeSave = () => resolve({ ok: true }); }) };
  });
  await page.goto(standalone);
  await page.locator('[data-view="editor"]').click();
  await page.locator('#editor').fill('old changed');
  await page.locator('#btnSave').click();
  page.once('dialog', d => d.accept());
  await page.locator('#btnNew').click();
  await page.locator('#editor').fill('new changed');
  await page.evaluate(() => window.completeSave());
  await expect(page.locator('#pathbar')).toHaveClass(/is-dirty/);
  await expect(page.locator('#editor')).toHaveValue('new changed');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mdx.android.draft')).path)).toBeNull();
});

test('Windows opens separate documents, saves and reloads independently, and protects only the closing window', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'reyad-windows-'));
  const firstPath = path.join(temp, 'first.md'), secondPath = path.join(temp, 'second.md'), thirdPath = path.join(temp, 'third.md');
  fs.writeFileSync(firstPath, '# First'); fs.writeFileSync(secondPath, '# Second'); fs.writeFileSync(thirdPath, '# Third');
  const { ELECTRON_RUN_AS_NODE, ...env } = process.env;
  const electron = await _electron.launch({ args: ['.', '--no-sandbox', '--user-data-dir=' + temp, firstPath], env });
  try {
    const first = await electron.firstWindow();
    await expect(first.locator('#editor')).toHaveValue('# First');
    await first.locator('[data-view="editor"]').click();
    await first.locator('#editor').fill('first edits');
    // Exercise the real OS second-instance event by launching another Electron process.
    const secondWindow = electron.waitForEvent('window');
    const child = spawn(require('electron'), ['.', '--no-sandbox', '--user-data-dir=' + temp, secondPath],
      { env, stdio: 'ignore' });
    child.unref();
    const second = await secondWindow;
    await expect(second.locator('#editor')).toHaveValue('# Second');
    await expect(first.locator('#editor')).toHaveValue('first edits');
    await expect(first.locator('#fileName')).toHaveText('first.md');
    await expect(second.locator('#fileName')).toHaveText('second.md');
    await second.locator('[data-view="editor"]').click();
    await second.locator('#editor').fill('second edits');
    await second.locator('#btnSave').click();
    await expect.poll(() => fs.readFileSync(secondPath, 'utf8')).toBe('second edits');
    expect(fs.readFileSync(firstPath, 'utf8')).toBe('# First');
    await second.reload();
    await expect(second.locator('#editor')).toHaveValue('second edits');
    await first.reload();
    await expect(first.locator('#editor')).toHaveValue('first edits');
    await expect(first.locator('#pathbar')).toHaveClass(/is-dirty/);
    // Opening through the toolbar also leaves an existing document intact.
    await electron.evaluate(({ dialog }, file) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] }); }, thirdPath);
    const thirdWindow = electron.waitForEvent('window');
    await first.locator('#btnOpen').click();
    const third = await thirdWindow;
    await expect(third.locator('#editor')).toHaveValue('# Third');
    await expect(first.locator('#editor')).toHaveValue('first edits');
    await first.locator('#btnSave').click();
    await expect.poll(() => fs.readFileSync(firstPath, 'utf8')).toBe('first edits');
    await first.locator('#editor').fill('unsaved first');
    await first.evaluate(() => window.mdxNative.setDirty(true));
    await electron.evaluate(({ dialog }) => {
      globalThis.closePrompts = [];
      dialog.showMessageBoxSync = win => { globalThis.closePrompts.push(win.id); return 2; };
    });
    await electron.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(win => win.getTitle().startsWith('second.md')).close());
    await expect.poll(() => electron.windows().length).toBe(2);
    expect(await electron.evaluate(() => globalThis.closePrompts)).toEqual([]);
    await electron.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(win => win.getTitle().startsWith('first.md')).close());
    expect((await electron.evaluate(() => globalThis.closePrompts)).length).toBe(1);
    await expect(first.locator('#editor')).toHaveValue('unsaved first');
    const blankWindow = electron.waitForEvent('window');
    await first.locator('#btnNew').click();
    const blank = await blankWindow;
    await expect(blank.locator('#editor')).toHaveValue('');
    await expect(first.locator('#editor')).toHaveValue('unsaved first');
  } finally {
    await electron.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach(win => win.destroy()));
    await electron.close();
    fs.rmSync(temp, { force: true, recursive: true });
  }
});
