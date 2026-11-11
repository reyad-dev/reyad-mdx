/* ReyadMDX — mobile-only interaction helpers. */
(function () {
  'use strict';

  var mq = window.matchMedia('(max-width: 820px)');
  var main = document.getElementById('main');
  var toc = document.getElementById('toc');
  var btn = document.getElementById('btnToc');

  if (!main || !toc || !btn) return;

  function isMobile() {
    return mq.matches;
  }

  function closeToc() {
    main.classList.remove('mobile-toc-open');
    if (isMobile()) btn.classList.remove('active');
    btn.setAttribute('aria-expanded', 'false');
  }

  function syncLayout() {
    if (isMobile()) {
      closeToc();
      btn.setAttribute('aria-controls', 'toc');
      btn.setAttribute('aria-expanded', 'false');
    } else {
      main.classList.remove('mobile-toc-open');
      btn.removeAttribute('aria-expanded');
    }
  }

  /* Capture phase prevents the desktop TOC handler from changing persisted
     desktop settings while the mobile drawer is being used. */
  btn.addEventListener('click', function (event) {
    if (!isMobile()) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    var open = !main.classList.contains('mobile-toc-open');
    main.classList.toggle('mobile-toc-open', open);
    btn.classList.toggle('active', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }, true);

  toc.addEventListener('click', function (event) {
    if (isMobile() && event.target.closest('a')) closeToc();
  });

  main.addEventListener('click', function (event) {
    if (!isMobile() || !main.classList.contains('mobile-toc-open')) return;
    if (!toc.contains(event.target)) closeToc();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isMobile()) closeToc();
  });

  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', syncLayout);
  } else if (typeof mq.addListener === 'function') {
    mq.addListener(syncLayout);
  }

  syncLayout();
})();
