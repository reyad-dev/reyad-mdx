/* Shared stable-release policy and update UI for Windows, Android and standalone HTML. */
(function (root) {
  'use strict';
  var REPO = 'https://github.com/reyad-dev/reyad-mdx';
  var API = 'https://api.github.com/repos/reyad-dev/reyad-mdx/releases/latest';
  function parts(value) {
    var match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value || '');
    if (!match) throw new Error('Invalid stable version');
    var result = match.slice(1).map(Number);
    if (!result.every(Number.isSafeInteger)) throw new Error('Invalid version number');
    return result;
  }
  function newer(latest, current) {
    var a = parts(latest), b = parts(current);
    for (var i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] > b[i]; }
    return false;
  }
  function selectRelease(release, info) {
    if (!release || release.draft || release.prerelease) throw new Error('Not a public stable release');
    var version = parts(release.tag_name).join('.');
    if (!newer(version, info.version)) return { status: 'current', version: version };
    if (info.platform === 'web') return { status: 'available', version: version,
      url: 'https://reyad-dev.github.io/reyad-mdx/?v=' + version };
    var name = info.platform === 'android' ? 'ReyadMDX-' + version + '.apk'
      : 'ReyadMDX-' + (info.portable ? 'Portable-' : 'Setup-') + version + '.exe';
    var expected = REPO + '/releases/download/' + release.tag_name + '/' + name;
    var asset = (Array.isArray(release.assets) ? release.assets : []).find(function (item) {
      return item.name === name && item.state === 'uploaded' && item.size > 0 && item.browser_download_url === expected;
    });
    return { status: asset ? 'available' : 'pending', version: version, url: asset ? expected : null };
  }
  var policy = { newer: newer, selectRelease: selectRelease };
  if (typeof module === 'object' && module.exports) { module.exports = policy; return; }

  var N = root.mdxNative;
  var $ = function (id) { return document.getElementById(id); };
  var info = { version: root.MDX_VERSION, platform: 'web', portable: false };
  var state = { status: 'idle' }, busy = false;
  var strings = {
    ar: {
      heading: 'الإصدار والتحديثات', version: 'الإصدار الحالي', check: 'التحقق من التحديثات',
      download: 'تنزيل التحديث', openWeb: 'فتح النسخة الأحدث', idle: 'التحديثات من GitHub Releases',
      checking: 'جارٍ التحقق من التحديثات…', current: 'أنت تستخدم أحدث إصدار متاح.',
      available: 'تحديث جديد متاح: v', pending: 'الإصدار الجديد قيد تجهيز ملف التنزيل: v',
      network: 'تعذّر التحقق. تأكد من اتصال الإنترنت وحاول مجددًا.',
      'rate-limit': 'تم بلوغ حد طلبات GitHub. حاول لاحقًا.', 'no-release': 'لا يوجد إصدار منشور بعد.',
      invalid: 'تعذّر قراءة بيانات الإصدار المنشور. حاول لاحقًا.',
      hint: 'الفحص عند تشغيل التطبيق يحتاج إنترنت. بعد التنزيل، افتح الملف وأكمل التثبيت. احفظ شغلك قبل إغلاق النسخة الحالية.',
      portableHint: 'نزّل النسخة المحمولة الجديدة وشغّلها بعد حفظ شغلك وإغلاق النسخة الحالية.',
      webHint: 'يفتح الإصدار المنشور في تبويب جديد. نسخة HTML المحفوظة على جهازك تحتاج تنزيل نسخة جديدة.',
      notice: 'تحديث متاح · v', windows: 'ويندوز', android: 'أندرويد', web: 'الويب / HTML', portable: 'محمول'
    },
    en: {
      heading: 'Version and updates', version: 'Current version', check: 'Check for updates',
      download: 'Download update', openWeb: 'Open latest web version', idle: 'Updates from GitHub Releases',
      checking: 'Checking for updates…', current: 'You are using the latest available version.',
      available: 'New update available: v', pending: 'The new release download is being prepared: v',
      network: 'Could not check. Check your internet connection and try again.',
      'rate-limit': 'GitHub request limit reached. Try again later.', 'no-release': 'No release has been published yet.',
      invalid: 'Could not read the published release. Try again later.',
      hint: 'Startup checks need internet. After downloading, open the file to complete installation. Save your work before closing the current app.',
      portableHint: 'Download the new portable app, save your work, close the current copy and run the new one.',
      webHint: 'Opens the published version in a new tab. A saved HTML file needs a new download to update.',
      notice: 'Update available · v', windows: 'Windows', android: 'Android', web: 'Web / HTML', portable: 'Portable'
    }
  };
  function render() {
    var s = strings[document.documentElement.lang] || strings.en;
    $('updateHeading').textContent = s.heading;
    $('btnVersion').textContent = 'v' + info.version;
    $('btnVersion').title = s.heading;
    $('appVersion').textContent = 'ReyadMDX · v' + info.version + ' · ' + s[info.platform] + (info.portable ? ' · ' + s.portable : '');
    $('btnCheckUpdates').textContent = s.check;
    $('btnCheckUpdates').disabled = busy;
    $('updateStatus').textContent = s[state.status] + (state.status === 'available' || state.status === 'pending' ? state.version : '');
    $('updateHint').textContent = s[info.platform === 'web' ? 'webHint' : info.portable ? 'portableHint' : 'hint'];
    var download = $('btnDownloadUpdate');
    download.textContent = info.platform === 'web' ? s.openWeb : s.download;
    download.hidden = state.status !== 'available';
    if (state.url && state.status === 'available') download.href = state.url;
    else download.removeAttribute('href');
    $('btnVersion').classList.toggle('has-update', state.status === 'available');
    $('updateNotice').hidden = state.status !== 'available';
    $('updateNotice').textContent = s.notice + (state.version || '');
  }
  async function browserRelease() {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 15000);
    try {
      var response = await fetch(API, { headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal, cache: 'no-store', credentials: 'omit' });
      if (response.status === 404) return { ok: false, error: 'no-release' };
      if (response.status === 403 || response.status === 429) return { ok: false, error: 'rate-limit' };
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return { ok: true, release: await response.json() };
    } finally { clearTimeout(timer); }
  }
  var initialized = Promise.resolve();
  async function check() {
    if (busy) return;
    busy = true; state = { status: 'checking' }; render();
    try {
      await initialized;
      var result = N && N.getLatestRelease ? await N.getLatestRelease() : await browserRelease();
      if (!result.ok) state = { status: ['no-release', 'rate-limit'].includes(result.error) ? result.error : 'network' };
      else {
        try { state = selectRelease(result.release, info); }
        catch (error) { state = { status: 'invalid' }; }
      }
    } catch (error) { state = { status: 'network' }; }
    finally { busy = false; render(); }
  }
  function open() {
    $('settingsBack').classList.add('show');
    $('updateHeading').scrollIntoView({ block: 'start' });
    $('btnCheckUpdates').focus({ preventScroll: true });
  }
  function boot() {
    if (N && N.getAppInfo) initialized = N.getAppInfo().then(function (value) {
      parts(value.version);
      if (!['windows', 'android'].includes(value.platform)) throw new Error('Invalid platform');
      info = value; render();
    }).catch(function () { info.platform = N.platform || 'windows'; render(); });
    $('btnVersion').addEventListener('click', open);
    $('updateNotice').addEventListener('click', open);
    $('btnCheckUpdates').addEventListener('click', check);
    $('btnDownloadUpdate').addEventListener('click', function (event) {
      if (!N || !N.openExternal) return;
      event.preventDefault();
      if (state.status === 'available' && state.url) N.openExternal(state.url);
    });
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    render();
    if (N) check();
  }
  root.MDXUpdates = { open: open, check: check };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window === 'undefined' ? globalThis : window);
