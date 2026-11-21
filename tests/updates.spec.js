const { test, expect, _electron } = require('@playwright/test');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createHash } = require('node:crypto');
const { newer, selectRelease } = require('../app/updates');
const { downloadInstaller, verifyInstaller } = require('../windows-update');
const { version } = require('../package.json');
const standalone = pathToFileURL(path.resolve('MDX-Reader-Standalone.html')).href;
const api = 'https://api.github.com/repos/reyad-dev/reyad-mdx/releases/latest';
function release(v = '1.10.0') {
  return { tag_name: 'v' + v, draft: false, prerelease: false,
    assets: ['ReyadMDX-Setup-', 'ReyadMDX-Portable-', 'ReyadMDX-'].map((prefix, i) => {
      const name = prefix + v + (i === 2 ? '.apk' : '.exe');
      return { name, state: 'uploaded', size: 100,
        browser_download_url: 'https://github.com/reyad-dev/reyad-mdx/releases/download/v' + v + '/' + name };
    }) };
}

test('release policy compares numeric versions and requires the correct trusted asset', () => {
  expect(newer('1.10.0', '1.9.9')).toBe(true);
  expect(newer('v2.0.0', '1.99.99')).toBe(true);
  expect(newer(version, version)).toBe(false);
  expect(newer('1.2.1', version)).toBe(false);
  for (const invalid of ['v1.4.0-beta.1', '1.4', '01.4.0', '1.4.0/evil', '9007199254740992.0.0']) {
    expect(() => newer(invalid, version)).toThrow();
  }
  for (const [platform, portable, suffix] of [['windows', false, 'Setup-1.10.0.exe'],
    ['windows', true, 'Portable-1.10.0.exe'], ['android', false, 'ReyadMDX-1.10.0.apk']]) {
    const info = { version, platform, portable };
    expect(selectRelease(release(), info).url).toContain(suffix);
    expect(selectRelease({ ...release(), assets: [] }, info).status).toBe('pending');
    const bad = release();
    bad.assets.forEach(a => { a.browser_download_url = 'https://example.com/' + a.name; });
    expect(selectRelease(bad, info).status).toBe('pending');
    expect(selectRelease(release('1.2.1'), info).status).toBe('current');
    expect(() => selectRelease({ ...release(), prerelease: true }, info)).toThrow();
    expect(() => selectRelease({ ...release(), draft: true }, info)).toThrow();
  }
});

test('standalone shows its version, checks GitHub, localizes and opens the latest web copy', async ({ page }) => {
  await page.route(api, route => route.fulfill({ json: release() }));
  await page.goto(standalone);
  await expect(page.locator('#btnVersion')).toHaveText('v' + version);
  await page.locator('#btnVersion').click();
  await page.locator('#btnCheckUpdates').click();
  await expect(page.locator('#updateStatus')).toContainText('1.10.0');
  await expect(page.locator('#btnDownloadUpdate')).toHaveAttribute('href', 'https://reyad-dev.github.io/reyad-mdx/?v=1.10.0');
  await page.locator('#btnCloseSettings').click();
  await page.locator('#uiLang').selectOption('en');
  await page.locator('#updateNotice').click();
  await expect(page.locator('#updateHeading')).toHaveText('Version and updates');
  await expect(page.locator('#updateStatus')).toHaveText('New update available: v1.10.0');
});

test('offline, rate limits and malformed releases allow retries without disturbing edits', async ({ page }) => {
  let response = 'offline';
  await page.route(api, route => response === 'offline' ? route.abort('internetdisconnected')
    : response === 'limited' ? route.fulfill({ status: 403, json: {} })
    : response === 'invalid' ? route.fulfill({ json: { tag_name: 'garbage' } })
    : route.fulfill({ json: release(version) }));
  await page.goto(standalone);
  await page.locator('[data-view="editor"]').click();
  await page.locator('#editor').fill('شغل غير محفوظ');
  await page.locator('#btnVersion').click();
  for (const [mode, message] of [['offline', 'تعذّر التحقق'], ['limited', 'حد طلبات'], ['invalid', 'تعذّر قراءة'], ['current', 'أحدث إصدار']]) {
    response = mode;
    await page.locator('#btnCheckUpdates').click();
    await expect(page.locator('#updateStatus')).toContainText(message);
    await expect(page.locator('#btnCheckUpdates')).toBeEnabled();
    await expect(page.locator('#btnDownloadUpdate')).toBeHidden();
    await expect(page.locator('#editor')).toHaveValue('شغل غير محفوظ');
  }
});

for (const platform of ['android', 'windows']) {
  test(`${platform} checks at startup and downloads its platform update using the native bridge`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(({ platform, version, release }) => {
      window.updateChecks = 0;
      window.mdxNative = {
        platform, ready() {}, onOpenPath() {}, onMenu() {}, setDirty() {}, setEditState() {},
        getAppInfo: async () => ({ platform, version, portable: platform === 'windows' }),
        getLatestRelease: async () => { window.updateChecks++; return { ok: true, release }; },
        openExternal: url => { window.downloaded = url; }
      };
    }, { platform, version, release: release() });
    await page.goto(standalone);
    await expect(page.locator('#updateNotice')).toBeVisible();
    await page.locator('#updateNotice').click();
    await expect(page.locator('#appVersion')).toContainText(version);
    await page.locator('#btnDownloadUpdate').click();
    await expect.poll(() => page.evaluate(() => window.downloaded)).toContain(platform === 'android' ? '.apk' : 'Portable-');
    expect(await page.evaluate(() => window.updateChecks)).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('Electron exposes installed version and checks/downloads through the main process', async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'reyad-updates-'));
  const { ELECTRON_RUN_AS_NODE, ...env } = process.env;
  const electron = await _electron.launch({ args: ['.', '--no-sandbox', '--user-data-dir=' + userData], env });
  try {
    const page = await electron.firstWindow();
    expect(await page.evaluate(() => window.mdxNative.getAppInfo())).toMatchObject({ version, platform: 'windows' });
    await electron.evaluate(({ shell }, payload) => {
      globalThis.fetch = async () => ({ status: 200, ok: true, json: async () => payload });
      shell.openExternal = async url => { globalThis.testDownload = url; };
    }, release());
    await page.reload();
    await expect(page.locator('#updateStatus')).toContainText('1.10.0');
    await page.locator('#updateNotice').click();
    await page.locator('#btnDownloadUpdate').click();
    expect(await electron.evaluate(() => globalThis.testDownload)).toContain('ReyadMDX-Setup-1.10.0.exe');
    await electron.evaluate(({ Menu }) => Menu.getApplicationMenu().items.at(-1).submenu.items[0].click());
    await expect(page.locator('#settingsBack')).toHaveClass(/show/);
  } finally {
    await electron.close();
    fs.rmSync(userData, { recursive: true, force: true });
  }
});

test('Windows stages only the installer matching the published SHA-256', async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'reyad-update-digest-'));
  const originalFetch = global.fetch;
  try {
    const bytes = Buffer.from('test installer bytes');
    const published = release();
    const [asset] = published.assets;
    asset.size = bytes.length;
    asset.digest = 'sha256:' + createHash('sha256').update(bytes).digest('hex');
    global.fetch = async () => new Response(Buffer.alloc(bytes.length));
    await expect(downloadInstaller(published, version, '1.10.0', userData)).rejects.toThrow('verification failed');
    expect(fs.readdirSync(path.join(userData, 'update-cache'))).toEqual([]);
    global.fetch = async url => url === asset.browser_download_url
      ? Response.redirect('https://release-assets.githubusercontent.com/test')
      : new Response(bytes);
    const cached = await downloadInstaller(published, version, '1.10.0', userData);
    await verifyInstaller(cached);
    fs.writeFileSync(cached.file, 'changed');
    await expect(verifyInstaller(cached)).rejects.toThrow('verification failed');
  } finally {
    global.fetch = originalFetch;
    fs.rmSync(userData, { recursive: true, force: true });
  }
});

test('installed Windows update respects cancel and Save As, then saves and discards in separate windows', async () => {
  test.skip(process.platform !== 'win32', 'Windows installer handoff');
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'reyad-update-handoff-'));
  const savedFile = path.join(userData, 'saved.md');
  const discardedFile = path.join(userData, 'discarded.md');
  fs.writeFileSync(discardedFile, 'original');
  const { ELECTRON_RUN_AS_NODE, ...env } = process.env;
  const electron = await _electron.launch({ args: ['.', '--user-data-dir=' + userData], env });
  try {
    const page = await electron.firstWindow();
    await electron.evaluate(({ app, dialog }, { published, savedFile, discardedFile }) => {
      const requireFromApp = process.getBuiltinModule('module').createRequire(app.getAppPath() + '/package.json');
      const updater = requireFromApp('./windows-update');
      Object.defineProperty(app, 'isPackaged', { value: true });
      globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => published });
      globalThis.updateTest = { responses: [2, 0, 0, 1], downloads: 0, starts: [], saveAs: 0, closed: false };
      const state = globalThis.updateTest;
      updater.installationScope = async () => '/currentuser';
      updater.downloadInstaller = async () => { state.downloads++; return { file: 'fixture' }; };
      updater.verifyInstaller = async () => {};
      updater.startInstaller = async (_, scope) => { state.starts.push(scope); };
      dialog.showMessageBox = async () => ({ response: state.responses.shift() });
      dialog.showSaveDialog = async () => state.saveAs++ === 0
        ? { canceled: true } : { filePath: savedFile };
      dialog.showOpenDialog = async () => ({ filePaths: [discardedFile] });
      app.quit = () => { state.closed = true; };
    }, { published: release(), savedFile, discardedFile });
    await page.locator('[data-view="editor"]').click();
    await page.locator('#editor').fill('save this');
    const otherPromise = electron.waitForEvent('window');
    await page.evaluate(() => window.mdxNative.openFile({ newWindow: true }));
    const other = await otherPromise;
    await other.locator('[data-view="editor"]').click();
    await expect(other.locator('#editor')).toHaveValue('original');
    await other.locator('#editor').fill('discard this');

    for (let attempt = 0; attempt < 2; attempt++) {
      const stopped = await page.evaluate(() => window.mdxNative.installUpdate('1.10.0'));
      expect(stopped.status).toBe('update-canceled');
      await expect(page.locator('#editor')).toHaveValue('save this');
      await expect(other.locator('#editor')).toHaveValue('discard this');
      expect(fs.existsSync(savedFile)).toBe(false);
    }
    const installed = await page.evaluate(() => window.mdxNative.installUpdate('1.10.0'));
    expect(installed.status).toBe('installing');
    expect(await electron.evaluate(() => globalThis.updateTest)).toMatchObject({
      downloads: 1, starts: ['/currentuser'], closed: true, responses: []
    });
    expect(fs.readFileSync(savedFile, 'utf8')).toBe('save this');
    expect(fs.readFileSync(discardedFile, 'utf8')).toBe('original');
  } finally {
    await electron.evaluate(({ app, BrowserWindow }) => {
      for (const win of BrowserWindow.getAllWindows()) win.destroy();
      app.exit();
    }).catch(() => {});
    await electron.close();
    fs.rmSync(userData, { recursive: true, force: true });
  }
});
