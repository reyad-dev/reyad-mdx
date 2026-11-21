const { execFile, spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const { createReadStream, createWriteStream } = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { promisify } = require('node:util');
const { selectRelease } = require('./app/updates');

// The existing NSIS identity derived from com.tariq.mdxreader.
const INSTALL_KEY = 'Software\\75137dbf-c976-5a36-960f-df12bd41223c';

async function installationScope(executable) {
  const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  // Emit UTF-8 so custom installation paths can contain Arabic or other Unicode.
  const slots = ['HKCU', 'HKLM'].map(hive =>
    "(Get-ItemProperty -LiteralPath '" + hive + ':\\' + INSTALL_KEY + "' -ErrorAction SilentlyContinue).InstallLocation");
  const command = '[Console]::OutputEncoding = [Text.Encoding]::UTF8; ' +
    'ConvertTo-Json -Compress -InputObject @(' + slots.join(', ') + ')';
  const { stdout } = await promisify(execFile)(powershell,
    ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, timeout: 8000 });
  const [user, machine] = JSON.parse(stdout);
  // A machine-wide NSIS upgrade may also remove a current-user installation.
  if (user && machine) return null;
  const directory = user || machine;
  if (!directory) return null;
  const installed = await fs.realpath(directory);
  const running = await fs.realpath(path.dirname(executable));
  if (installed.toLowerCase() !== running.toLowerCase()) return null;
  return user ? '/currentuser' : '/allusers';
}

async function responseForAsset(url, signal) {
  const response = await fetch(url, { redirect: 'manual', signal });
  if (response.status < 300 || response.status >= 400) return response;
  const target = new URL(response.headers.get('location'), url);
  if (target.protocol !== 'https:' || !['release-assets.githubusercontent.com', 'objects.githubusercontent.com'].includes(target.host)
    || target.username || target.password) throw new Error('Unexpected GitHub asset host');
  return fetch(target, { redirect: 'error', signal });
}

async function downloadInstaller(release, version, expectedVersion, userData) {
  const selected = selectRelease(release, { platform: 'windows', version, portable: false });
  if (selected.status !== 'available' || selected.version !== expectedVersion) throw new Error('Release changed');
  const asset = release.assets.find(item => item.browser_download_url === selected.url && item.state === 'uploaded' && item.size > 0);
  if (!/^sha256:[a-f0-9]{64}$/.test(asset.digest) || !Number.isSafeInteger(asset.size) || asset.size > 512 * 1024 * 1024) {
    throw new Error('Missing or invalid installer verification metadata');
  }

  const directory = path.join(userData, 'update-cache');
  await fs.mkdir(directory, { recursive: true });
  const file = path.join(directory, 'ReyadMDX-Setup.exe');
  const partial = file + '.part';
  const digest = createHash('sha256');
  let size = 0;
  const verify = new Transform({
    transform(chunk, encoding, callback) {
      size += chunk.length;
      if (size > asset.size) return callback(new Error('Installer exceeds published size'));
      digest.update(chunk);
      callback(null, chunk);
    }
  });
  await fs.rm(partial, { force: true });
  try {
    const signal = AbortSignal.timeout(300000);
    const response = await responseForAsset(selected.url, signal);
    if (!response.ok || !response.body) throw new Error('Could not download installer');
    await pipeline(Readable.fromWeb(response.body), verify, createWriteStream(partial, { flags: 'wx' }), { signal });
    if (size !== asset.size || 'sha256:' + digest.digest('hex') !== asset.digest) throw new Error('Installer verification failed');
    await fs.rename(partial, file);
    return { file, digest: asset.digest };
  } finally {
    await fs.rm(partial, { force: true });
  }
}

async function verifyInstaller({ file, digest }) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  if ('sha256:' + hash.digest('hex') !== digest) throw new Error('Cached installer verification failed');
}

function startInstaller({ file }, scope) {
  return new Promise((resolve, reject) => {
    const installer = spawn(file, ['/S', '--updated', '--force-run', '--update-parent=' + process.pid, scope], {
      detached: true, stdio: 'ignore'
    });
    installer.once('error', reject);
    installer.once('spawn', () => { installer.unref(); resolve(); });
  });
}

module.exports = { installationScope, downloadInstaller, verifyInstaller, startInstaller };
