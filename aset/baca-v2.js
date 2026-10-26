/* baca-v2.js - fungsi halaman baca artikel. Dipakai bersama oleh semua artikel (folder aset). */
(function () {
  'use strict';

  var root = document.documentElement;
  var container = document.getElementById('pagesContainer');
  var footerWrapper = document.getElementById('footerWrapper');
  var dotsEl = document.getElementById('pageDots');
  var btnShare = document.getElementById('btnShare');
  var btnTheme = document.getElementById('btnTheme');
  var btnDec = document.getElementById('btnDecrease');
  var btnInc = document.getElementById('btnIncrease');
  var fontIndicator = document.getElementById('fontIndicator');
  if (!container || !footerWrapper) return;

  /* ---------- Ukuran font (awal = yang diatur penulis saat publish) ---------- */
  var fontSize = parseInt(getComputedStyle(root).getPropertyValue('--base-font-size'), 10) || 16;
  function setFont(n) {
    fontSize = Math.min(Math.max(n, 12), 24);
    root.style.setProperty('--base-font-size', fontSize + 'px');
    if (fontIndicator) fontIndicator.textContent = fontSize + 'px';
  }
  if (fontIndicator) fontIndicator.textContent = fontSize + 'px';
  if (btnDec) btnDec.addEventListener('click', function (e) { e.stopPropagation(); setFont(fontSize - 1); });
  if (btnInc) btnInc.addEventListener('click', function (e) { e.stopPropagation(); setFont(fontSize + 1); });

  /* ---------- Mode desktop di layar sentuh: perbesar agar memenuhi browser ---------- */
  var scale = 1;
  function applyScale() {
    var s = 1;
    try {
      var coarse = window.matchMedia('(pointer: coarse)').matches;
      var devW = Math.min(window.screen.width, window.screen.height) || 480;
      var refW = Math.min(480, Math.max(300, devW));
      if (coarse && window.innerWidth > 600) s = Math.min(3, window.innerWidth / refW);
    } catch (e) {}
    scale = s;
    root.style.setProperty('--s', s);
  }
  function positionFooter() {
    var gap = Math.max(0, window.innerHeight - container.clientHeight);
    footerWrapper.style.bottom = (gap / scale) + 'px';
  }

  /* ---------- Halaman sampul: tampil hanya jika gambarnya ada ---------- */
  function pageCount() {
    var n = 0;
    for (var i = 0; i < container.children.length; i++) if (container.children[i].offsetWidth > 0) n++;
    return n;
  }
  var coverImg = container.querySelector('.cover-img');
  if (coverImg) {
    var coverPage = coverImg.parentNode, triedPng = false;
    var showCover = function () {
      coverPage.classList.add('ok');
      container.style.scrollBehavior = 'auto'; container.scrollLeft = 0; container.style.scrollBehavior = '';
      updateDots();
    };
    coverImg.addEventListener('load', showCover);
    var onFail = function () {
      if (!triedPng) { triedPng = true; coverImg.src = coverImg.src.replace(/\.jpe?g(\?.*)?$/i, '.png'); }
      else if (coverPage.parentNode) coverPage.parentNode.removeChild(coverPage);
      updateDots();
    };
    coverImg.addEventListener('error', onFail);
    /* gambar bisa selesai (atau gagal) sebelum skrip ini terpasang */
    if (coverImg.complete) { if (coverImg.naturalWidth > 0) showCover(); else onFail(); }
  }

  /* ---------- Penunjuk halaman ---------- */
  function currentIndex() { return Math.round(container.scrollLeft / container.clientWidth); }
  function updateDots() {
    if (!dotsEl) return;
    var total = pageCount(), idx = currentIndex(), html = '';
    for (var i = 0; i < total; i++) html += '<span class="dot' + (i === idx ? ' active' : '') + '"></span>';
    dotsEl.innerHTML = html;
  }
  container.addEventListener('scroll', updateDots);

  /* ---------- Pindah halaman dengan panah kiri/kanan ---------- */
  function goToPage(delta) {
    var total = pageCount(), cur = currentIndex();
    var target = Math.min(total - 1, Math.max(0, cur + delta));
    if (target === cur) return;
    container.scrollTo({ left: target * container.clientWidth, behavior: 'smooth' });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented) return;
    e.preventDefault();
    goToPage(e.key === 'ArrowRight' ? 1 : -1);
  });

  /* ---------- Tema terang/gelap (default terang, pilihan diingat) ---------- */
  var THEME_KEY = 'tema-artikel';
  var ICON_MOON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  function applyTheme(theme, save) {
    var dark = theme === 'dark';
    if (dark) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
    if (btnTheme) {
      btnTheme.innerHTML = dark ? ICON_SUN : ICON_MOON;
      btnTheme.setAttribute('aria-pressed', dark ? 'true' : 'false');
      btnTheme.title = dark ? 'Mode terang' : 'Mode gelap';
    }
    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', dark ? '#121212' : '#FBF8F3');
    if (save) { try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) {} }
  }
  var savedTheme = 'light';
  try { savedTheme = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch (e) {}
  applyTheme(savedTheme, false);
  if (btnTheme) btnTheme.addEventListener('click', function (e) {
    e.stopPropagation();
    applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
  });

  /* ---------- Bagikan link (alamat halaman yang sedang dibuka) ---------- */
  var toastTimer = null;
  function showToast(msg) {
    var t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2000);
  }
  function copyText(text) {
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-1000px;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (e) { return false; }
    }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }
  if (btnShare) btnShare.addEventListener('click', function (e) {
    e.stopPropagation();
    var url = window.location.href.split('#')[0];
    var title = document.title;
    var copy = function () {
      copyText(url).then(function (ok) { showToast(ok ? 'Link disalin' : 'Gagal menyalin link'); });
    };
    if (navigator.share) {
      navigator.share({ title: title, url: url }).catch(function (err) {
        if (err && err.name === 'AbortError') return; /* pembaca membatalkan */
        copy();
      });
    } else {
      copy();
    }
  });

  /* ---------- Mulai ---------- */
  applyScale();
  positionFooter();
  updateDots();
  window.addEventListener('resize', function () { applyScale(); positionFooter(); updateDots(); });
  window.addEventListener('load', function () { positionFooter(); updateDots(); });
})();
