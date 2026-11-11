const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  workers: 1,
  timeout: 30000,
  use: { headless: true },
  reporter: 'list'
});
