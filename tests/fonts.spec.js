const { test, expect, _electron } = require('@playwright/test');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');
const os = require('os');

const standalone = pathToFileURL(path.resolve('MDX-Reader-Standalone.html')).href;
const appIndex = pathToFileURL(path.resolve('app', 'index.html')).href;

test.describe('Arabic local fonts (Cairo, Almarai, Tajawal)', () => {
  for (const [name, url] of [['Standalone', standalone], ['App Index', appIndex]]) {
    test(`loads and applies Cairo, Almarai, and Tajawal in ${name}`, async ({ page }) => {
      await page.goto(url);

      // Verify fonts load successfully via FontFace API (normal and bold)
      const fontsLoaded = await page.evaluate(async () => {
        const cairo = await document.fonts.load('16px Cairo');
        const cairoBold = await document.fonts.load('bold 16px Cairo');
        const almarai = await document.fonts.load('16px Almarai');
        const almaraiBold = await document.fonts.load('bold 16px Almarai');
        const tajawal = await document.fonts.load('16px Tajawal');
        const tajawalBold = await document.fonts.load('bold 16px Tajawal');
        return {
          cairo: cairo.length > 0 && document.fonts.check('16px Cairo'),
          cairoBold: cairoBold.length > 0 && document.fonts.check('bold 16px Cairo'),
          almarai: almarai.length > 0 && document.fonts.check('16px Almarai'),
          almaraiBold: almaraiBold.length > 0 && document.fonts.check('bold 16px Almarai'),
          tajawal: tajawal.length > 0 && document.fonts.check('16px Tajawal'),
          tajawalBold: tajawalBold.length > 0 && document.fonts.check('bold 16px Tajawal')
        };
      });

      expect(fontsLoaded.cairo).toBe(true);
      expect(fontsLoaded.cairoBold).toBe(true);
      expect(fontsLoaded.almarai).toBe(true);
      expect(fontsLoaded.almaraiBold).toBe(true);
      expect(fontsLoaded.tajawal).toBe(true);
      expect(fontsLoaded.tajawalBold).toBe(true);

      // Open settings modal
      await page.locator('#btnSettings').click();
      await expect(page.locator('#settingsBack')).toHaveClass(/show/);

      // 1. Test selecting Cairo
      await page.locator('#fontSel').selectOption('"Cairo","Segoe UI",sans-serif');
      const cairoFont = await page.evaluate(() => document.documentElement.style.getPropertyValue('--ar-font'));
      expect(cairoFont).toContain('Cairo');

      // 2. Test selecting Almarai
      await page.locator('#fontSel').selectOption('"Almarai","Segoe UI",sans-serif');
      const almaraiFont = await page.evaluate(() => document.documentElement.style.getPropertyValue('--ar-font'));
      expect(almaraiFont).toContain('Almarai');

      // 3. Test selecting Tajawal
      await page.locator('#fontSel').selectOption('"Tajawal","Segoe UI",sans-serif');
      const tajawalFont = await page.evaluate(() => document.documentElement.style.getPropertyValue('--ar-font'));
      expect(tajawalFont).toContain('Tajawal');

      // Test persistence across reload
      await page.reload();
      const persistedFont = await page.evaluate(() => document.documentElement.style.getPropertyValue('--ar-font'));
      expect(persistedFont).toContain('Tajawal');
      await expect(page.locator('#fontSel')).toHaveValue('"Tajawal","Segoe UI",sans-serif');
    });
  }

  test('loads local fonts in Electron app', async () => {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'reyad-mdx-font-test-'));
    const { ELECTRON_RUN_AS_NODE, ...env } = process.env;
    const electron = await _electron.launch({ args: ['.', '--no-sandbox', '--user-data-dir=' + userData], cwd: process.cwd(), env });
    try {
      const page = await electron.firstWindow();
      const fontsLoaded = await page.evaluate(async () => {
        const cairo = await document.fonts.load('16px Cairo');
        const almarai = await document.fonts.load('16px Almarai');
        const tajawal = await document.fonts.load('16px Tajawal');
        return {
          cairo: cairo.length > 0 && document.fonts.check('16px Cairo'),
          almarai: almarai.length > 0 && document.fonts.check('16px Almarai'),
          tajawal: tajawal.length > 0 && document.fonts.check('16px Tajawal')
        };
      });

      expect(fontsLoaded.cairo).toBe(true);
      expect(fontsLoaded.almarai).toBe(true);
      expect(fontsLoaded.tajawal).toBe(true);

      await page.locator('#btnSettings').click();
      await expect(page.locator('#settingsBack')).toHaveClass(/show/);
      await page.locator('#fontSel').selectOption('"Cairo","Segoe UI",sans-serif');
      const applied = await page.evaluate(() => document.documentElement.style.getPropertyValue('--ar-font'));
      expect(applied).toContain('Cairo');
    } finally {
      await electron.close();
    }
  });
});
