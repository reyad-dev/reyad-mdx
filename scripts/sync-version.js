const fs = require('fs');
const path = require('path');
const { version } = require('../package.json');
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Expected a stable major.minor.patch version');
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== 'v' + version) {
  throw new Error('Release tag must match package.json version');
}
fs.writeFileSync(path.join(__dirname, '../app/version.js'),
  '// Generated from package.json by scripts/sync-version.js.\nwindow.MDX_VERSION = ' + JSON.stringify(version) + ';\n');
