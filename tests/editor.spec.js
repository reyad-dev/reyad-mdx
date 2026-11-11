const { test, expect, _electron } = require('@playwright/test');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');
const os = require('os');

const standalone = pathToFileURL(path.resolve('MDX-Reader-Standalone.html')).href;
const longText = '# عنوان عربي\n\n' + Array.from({ length: 200 }, (_, i) => `السطر ${i}: const example = "text";`).join('\n\n');

async function edit(page) {
  await page.locator('[data-view="editor"]').click();
  return page.locator('#editor');
}

test('RTL default migrates once, and explicit alternatives persist', async ({ page }) => {
  await page.goto(standalone);
  await expect(page.locator('#dirSel')).toHaveValue('rtl');
  await expect(page.locator('#editor')).toHaveAttribute('dir', 'rtl');
  await page.locator('#dirSel').selectOption('ltr');
  await page.reload();
  await expect(page.locator('#dirSel')).toHaveValue('ltr');
  await page.evaluate(() => localStorage.setItem('mdx.settings', JSON.stringify({ _v: 2, dir: 'smart' })));
  await page.reload();
  await expect(page.locator('#dirSel')).toHaveValue('rtl');
  await page.locator('#dirSel').selectOption('smart');
  await page.reload();
  await expect(page.locator('#dirSel')).toHaveValue('smart');
});

test('typing, formatting, Tab, undo/redo and branching preserve document content', async ({ page }) => {
  await page.goto(standalone);
  const editor = await edit(page);
  await editor.pressSequentially('hello');
  await expect(page.locator('#btnUndo')).toBeEnabled();
  await page.locator('#btnUndo').click();
  await expect(editor).toHaveValue('');
  await page.locator('#btnRedo').click();
  await expect(editor).toHaveValue('hello');
  await editor.press('Control+a');
  await editor.press('Control+b');
  await expect(editor).toHaveValue('**hello**');
  await editor.press('Control+z');
  await expect(editor).toHaveValue('hello');
  await editor.press('Control+Shift+z');
  await expect(editor).toHaveValue('**hello**');
  await editor.press('End');
  await editor.press('Tab');
  await expect(editor).toHaveValue('**hello**  ');
  await editor.press('Control+z');
  await expect(editor).toHaveValue('**hello**');
  await editor.pressSequentially('!');
  await expect(page.locator('#btnRedo')).toBeDisabled();
});

test('large paste scrolls the textarea; one edge button toggles both directions', async ({ page }) => {
  await page.goto(standalone);
  const editor = await edit(page);
  await editor.fill(longText);
  // Pasting typically leaves the caret and textarea at the bottom.
  await editor.evaluate(el => { el.setSelectionRange(el.value.length, el.value.length); el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); });
  const edge = page.locator('#btnScrollEdge');
  await expect(edge).toBeVisible();
  await expect(edge).toHaveAttribute('data-edge', 'top');
  await edge.click();
  await expect.poll(() => editor.evaluate(el => el.scrollTop)).toBe(0);
  await expect(edge).toHaveAttribute('data-edge', 'bottom');
  await edge.click();
  await expect.poll(() => editor.evaluate(el => el.scrollTop > 100)).toBe(true);
  await page.locator('[data-view="split"]').click();
  await editor.evaluate(el => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); });
  await expect.poll(() => page.locator('#panePreview').evaluate(el => el.scrollTop > 100)).toBe(true);
});

test('opening a different file resets history; TXT works on a phone layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(standalone);
  const editor = await edit(page);
  await editor.fill('old content');
  page.on('dialog', dialog => dialog.accept());
  await page.locator('#filePicker').setInputFiles({ name: 'ملاحظات.txt', mimeType: 'text/plain', buffer: Buffer.from(longText) });
  await expect(editor).toHaveValue(longText);
  await expect(page.locator('#fileName')).toHaveText('ملاحظات.txt');
  await expect(page.locator('#btnUndo')).toBeDisabled();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#btnToc').click();
  await expect(page.locator('#btnToc')).toHaveAttribute('aria-expanded', 'true');
});

test('Electron clipboard paste, native context menu, menu undo/redo and branding', async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'reyad-mdx-test-'));
  const { ELECTRON_RUN_AS_NODE, ...env } = process.env;
  const electron = await _electron.launch({ args: ['.', '--no-sandbox', '--user-data-dir=' + userData], cwd: process.cwd(), env });
  try {
    const page = await electron.firstWindow();
    await expect(page).toHaveTitle(/ReyadMDX/);
    const editor = await edit(page);
    await editor.focus();
    await electron.evaluate(({ clipboard }) => clipboard.writeText('مرحبا من الحافظة\nconst value = 42;'));
    await editor.press('Control+v');
    await expect(editor).toHaveValue('مرحبا من الحافظة\nconst value = 42;');
    await editor.press('Control+z');
    await expect(editor).toHaveValue('');
    await editor.press('Control+y');
    await expect(editor).toHaveValue('مرحبا من الحافظة\nconst value = 42;');
    await electron.evaluate(({ Menu }) => {
      const build = Menu.buildFromTemplate;
      Menu.buildFromTemplate = function (template) {
        global.contextItems = template.map(item => ({ label: item.label, enabled: item.enabled, role: item.role }));
        const menu = build.call(this, template);
        menu.popup = () => {};
        return menu;
      };
    });
    await editor.press('Control+a');
    await editor.click({ button: 'right' });
    await expect.poll(() => electron.evaluate(() => global.contextItems || [])).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'copy', enabled: true }),
      expect.objectContaining({ role: 'paste', enabled: true }),
      expect.objectContaining({ label: 'تراجع / Undo', enabled: true })
    ]));
    await electron.evaluate(({ Menu }) => Menu.getApplicationMenu().items[1].submenu.items[0].click());
    await expect(editor).toHaveValue('');
    await electron.evaluate(({ Menu }) => Menu.getApplicationMenu().items[1].submenu.items[1].click());
    await expect(editor).toHaveValue('مرحبا من الحافظة\nconst value = 42;');
    await page.locator('[data-view="preview"]').click();
    await page.locator('#preview').evaluate(el => {
      const range = document.createRange(); range.selectNodeContents(el);
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    });
    await page.locator('#preview').click({ button: 'right' });
    const items = await electron.evaluate(() => global.contextItems);
    expect(items.some(item => item.role === 'copy')).toBe(true);
    expect(items.some(item => item.role === 'paste')).toBe(false);
  } finally { await electron.close(); }
});
