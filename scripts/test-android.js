/* Run against an unlocked emulator/device with the debug APK installed.
   Requires adb on PATH; native picker labels below assume English system UI. */
const { _android } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

(async () => {
  const device = (await _android.devices())[0];
  assert.ok(device, 'Connect an Android device/emulator first');
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || (process.platform === 'win32' ? path.join(os.homedir(), 'AppData/Local/Android/Sdk') : '');
  const adb = sdk ? path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb') : 'adb';
  async function shell(command) { return execFileSync(adb, ['-s', device.serial(), 'shell', '-T', command], { timeout: 30000 }); }
  const stem = 'RMDX-' + String(Date.now()).slice(-6);
  const filename = stem + '.md', copyName = stem + '-copy.md';
  const original = '# اختبار عربي\n\nOpened with Android\n';
  const changed = '# محفوظ\n\n' + Array.from({ length: 200 }, (_, i) => 'سطر ' + i + ': example();').join('\n');
  try {
    device.setDefaultTimeout(15000);
    // cmd input works on newer Android images where the legacy input wrapper fails.
    async function nodes() {
      await shell('uiautomator dump /sdcard/reyad-check-ui.xml');
      const xml = (await shell('cat /sdcard/reyad-check-ui.xml')).toString();
      return [...xml.matchAll(/<node\b[^>]*>/g)].map(match => match[0]);
    }
    async function nativeTap(attribute, value) {
      let element;
      for (let attempt = 0; attempt < 6 && !element; attempt++) {
        // Drawers are last in the hierarchy; their labels can duplicate the background toolbar.
        element = (await nodes()).findLast(node => node.includes(attribute + '="' + value + '"'));
      }
      assert.ok(element, 'Native control missing: ' + value);
      const [x1, y1, x2, y2] = element.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/).slice(1).map(Number);
      await shell('cmd input tap ' + Math.round((x1 + x2) / 2) + ' ' + Math.round((y1 + y2) / 2));
    }
    async function documentPage(name) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const resumed = await currentPage();
          resumed.setDefaultTimeout(15000);
          await resumed.waitForFunction(expected => document.getElementById('fileName')?.textContent === expected, name);
          return resumed;
        } catch (error) {
          if (attempt === 2 || !/closed|destroyed/i.test(error.message)) throw error;
        }
      }
    }
    async function currentPage() {
      const pid = (await shell('pidof dev.reyad.mdx')).toString().trim();
      return (await device.webView({ socketName: 'webview_devtools_remote_' + pid })).page();
    }
    await shell('am force-stop com.microsoft.playwright.androiddriver');
    await shell('am force-stop dev.reyad.mdx');
    await device.push(Buffer.from(original), '/sdcard/Download/' + filename);
    await shell('am start -W -f 0x10008000 -n dev.reyad.mdx/.MainActivity');
    let page = await currentPage();
    page.setDefaultTimeout(15000);
    await page.waitForFunction(() => !!window.mdxNative);
    assert.equal(await page.locator('#dirSel').inputValue(), 'rtl');
    for (const extension of ['md', 'markdown', 'mdown', 'mkd', 'mdx', 'txt']) {
      for (const mime of ['text/plain', 'application/octet-stream']) {
        const matches = await shell('cmd package query-activities --brief -a android.intent.action.VIEW -t ' + mime + ' -d content://example/documents/sample.' + extension);
        assert.ok(matches.toString().includes('dev.reyad.mdx'), 'Missing file association: ' + extension + ' / ' + mime);
      }
    }
    await page.locator('#btnOpen').click();
    await nativeTap('content-desc', 'Show roots');
    await nativeTap('text', device.model());
    await nativeTap('text', 'Download');
    await nativeTap('text', filename);
    page = await documentPage(filename);
    const editor = page.locator('#editor');
    assert.equal(await editor.inputValue(), original);
    await page.locator('[data-view="editor"]').click();
    await editor.fill(changed);
    await page.locator('#btnUndo').click(); assert.equal(await editor.inputValue(), original);
    await page.locator('#btnRedo').click(); assert.equal(await editor.inputValue(), changed);
    await editor.evaluate(el => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); });
    await page.locator('#btnScrollEdge').click(); assert.equal(await editor.evaluate(el => el.scrollTop), 0);
    await page.locator('#btnScrollEdge').click(); assert.ok(await editor.evaluate(el => el.scrollTop > 100));
    await page.locator('#btnSave').click();
    await page.waitForFunction(() => !document.getElementById('pathbar').classList.contains('is-dirty'));
    assert.equal((await shell('cat /sdcard/Download/' + filename)).toString(), changed);
    console.log('PASS: file associations, native open, UTF-8, undo/redo, scroll, save');

    await page.locator('#btnSaveAs').click();
    await nativeTap('class', 'android.widget.EditText');
    await shell('cmd input keyevent KEYCODE_MOVE_END');
    await shell('cmd input keyevent ' + Array(80).fill('KEYCODE_DEL').join(' '));
    await shell('cmd input text ' + copyName);
    await nativeTap('text', 'SAVE');
    page = await documentPage(copyName);
    assert.equal((await shell('cat /sdcard/Download/' + copyName)).toString(), changed);
    console.log('PASS: native Save As and document filename');

    await shell('am start -W -n dev.reyad.mdx/.MainActivity -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT received-shared-text');
    await page.waitForFunction(() => document.getElementById('editor').value === 'received-shared-text');
    console.log('PASS: warm-start shared text intent');
    await page.locator('[data-view="preview"]').click();
    fs.mkdirSync(path.resolve('test-results'), { recursive: true });
    fs.writeFileSync(path.resolve('test-results/android-smoke.png'), await device.screenshot());
  } finally {
    await shell('rm -f /sdcard/Download/' + filename + ' /sdcard/Download/' + copyName + ' /sdcard/reyad-check-ui.xml');
    await device.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
