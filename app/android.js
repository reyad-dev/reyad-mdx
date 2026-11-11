/* Origin-scoped Android bridge, loaded only by the packaged Android app. */
(function () {
  'use strict';
  if (!window.ReyadAndroid) return;
  var pending = new Map(), serial = 0, onOpen = function () {}, onMenu = function () {}, onSaved = function () {};
  window.ReyadAndroid.onmessage = function (event) {
    var message = JSON.parse(event.data);
    if (message.event === 'open-path') { onOpen(message.data); return; }
    if (message.event === 'menu') { onMenu(message.data); return; }
    if (message.event === 'saved-path') { onSaved(message.data); return; }
    var resolve = pending.get(message.id);
    if (resolve) { pending.delete(message.id); resolve(message.result); }
  };
  function call(action, args) {
    return new Promise(function (resolve) {
      var id = ++serial;
      pending.set(id, resolve);
      window.ReyadAndroid.postMessage(JSON.stringify({ id: id, action: action, args: args || [] }));
    });
  }
  window.mdxNative = {
    platform: 'android',
    ready: function () { return call('ready'); },
    openFile: function () { return call('open-file'); },
    readPath: function (p) { return call('read-path', [p]); },
    saveFile: function (p, c) { return call('save-file', [p, c]); },
    saveFileAs: function (name, c) { return call('save-file-as', [name, c]); },
    setDirty: function (v) { return call('set-dirty', [v]); },
    closeNow: function () { return call('close-now'); },
    openExternal: function (url) { return call('open-external', [url]); },
    setTitle: function (name) { return call('set-title', [name]); },
    print: function () { return call('print'); },
    onOpenPath: function (cb) { onOpen = cb; },
    onMenu: function (cb) { onMenu = cb; },
    onSavedPath: function (cb) { onSaved = cb; }
  };
})();
