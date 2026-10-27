/* baca-v3.js - fungsi halaman baca artikel. Dipakai bersama oleh semua artikel (folder aset). */
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
    if (quizItems && quizItems.length) { dotsEl.innerHTML = quizProgressHtml(); return; }
    var total = pageCount(), idx = currentIndex(), html = '';
    for (var i = 0; i < total; i++) html += '<span class="dot' + (i === idx ? ' active' : '') + '"></span>';
    dotsEl.innerHTML = html;
  }
  container.addEventListener('scroll', updateDots);


  /* ---------- Mode kuis (aktif jika ada halaman "Ke-1" berisi "Benar atau salah?") ---------- */
  var quizLocked = false, quizFinished = false;
  var quizItems = [];      /* {q: halaman soal, a: halaman jawaban, key: true|false} */
  var quizEnd = null;      /* halaman penutup setelah soal terakhir */
  var quizStage = null;    /* satu-satunya halaman yang boleh dibuka saat terkunci */
  var quizCorrect = 0, quizDone = 0, quizLastMsg = -1, quizRetry = null;
  var MSG_OK = [
    'Jawaban Anda cocok!!', 'Tepat sekali!', 'Pas! Pemahaman Anda mantap.', 'Kena! Sesuai kuncinya.',
    'Jitu, itulah jawabannya.', 'Mantap, jawaban Anda sejalan dengan dalil.', 'Sesuai! Lanjutkan semangatnya.'
  ];
  var MSG_NO = [
    'Jawabanmu meleset.', 'Ah, sayang jawabannya bukan itu.', 'Belum cocok kali ini. Simak dalilnya, ya.',
    'Hampir! Cermati penjelasan di atas.', 'Belum sesuai kunci. Tidak apa-apa, ayo baca dalilnya.',
    'Kali ini belum pas, tapi ilmunya bertambah.', 'Jawaban belum tepat. Mari simak penjelasannya.'
  ];

  function visIndex(el) {
    var n = 0;
    for (var i = 0; i < container.children.length; i++) {
      var c = container.children[i];
      if (c === el) return n;
      if (c.offsetWidth > 0) n++;
    }
    return -1;
  }
  function quizScore() { return quizItems.length ? Math.round(quizCorrect / quizItems.length * 100) : 0; }
  function quizGoTo(el) {
    quizStage = el;
    el.scrollTop = 0;
    container.scrollTo({ left: visIndex(el) * container.clientWidth, behavior: 'smooth' });
    setTimeout(updateDots, 450);
  }
  function quizProgressHtml() {
    var cur = null, idx = currentIndex(), n = 0, txt = '';
    for (var i = 0; i < container.children.length; i++) {
      if (container.children[i].offsetWidth > 0) { if (n === idx) { cur = container.children[i]; break; } n++; }
    }
    for (var k = 0; k < quizItems.length; k++) {
      if (cur === quizItems[k].q || cur === quizItems[k].a) { txt = 'Soal ' + (k + 1) + ' / ' + quizItems.length; break; }
    }
    if (!txt) txt = cur === quizEnd ? 'Selesai' : (idx < visIndex(quizItems[0].q) ? quizItems.length + ' soal' : '');
    return '<span class="quiz-progress">' + txt + '</span>';
  }

  var quizBar = null;
  function ensureQuizBar() {
    if (quizBar) return quizBar;
    quizBar = document.createElement('div');
    quizBar.className = 'quiz-bar';
    quizBar.setAttribute('role', 'status');
    quizBar.innerHTML = '<div class="quiz-bar-text"><span class="quiz-msg"></span><span class="quiz-skor"></span></div>' +
      '<button type="button" class="f-btn primary quiz-next">Lanjut</button>';
    footerWrapper.insertBefore(quizBar, footerWrapper.firstChild);
    quizBar.querySelector('.quiz-next').addEventListener('click', function (e) {
      e.stopPropagation();
      quizBar.classList.remove('show');
      var idx = -1;
      for (var i = 0; i < quizItems.length; i++) if (quizItems[i].a === quizStage) idx = i;
      if (idx < 0) return;
      if (idx + 1 < quizItems.length) quizGoTo(quizItems[idx + 1].q);
      else if (quizEnd) {
        showResult(); quizGoTo(quizEnd);
        quizFinished = true; quizLocked = false; /* selesai: pembaca bebas menggeser (mis. ke halaman terima kasih) */
        container.classList.remove('quiz-lock');
        setTimeout(updateDots, 500);
      }
    });
    return quizBar;
  }

  function showResult() {
    if (!quizEnd) return;
    var art = quizEnd.querySelector('article');
    if (!art) return;
    var box = art.querySelector('.quiz-result');
    if (!box) {
      box = document.createElement('div');
      box.className = 'quiz-result';
      box.innerHTML = '<div class="quiz-result-label">Skor akhir</div><div class="quiz-result-score"></div>' +
        '<button type="button" class="quiz-btn quiz-retry">Ulangi</button>';
      art.appendChild(box);
      box.querySelector('.quiz-retry').addEventListener('click', function (e) { e.stopPropagation(); quizReset(); });
    }
    box.querySelector('.quiz-result-score').textContent = quizScore() + ' / 100';
  }

  function quizReset() {
    quizCorrect = 0; quizDone = 0; quizFinished = false; quizLocked = true;
    container.classList.add('quiz-lock');
    quizItems.forEach(function (it) { it.done = false; });
    quizItems.forEach(function (it) {
      Array.prototype.forEach.call(it.q.querySelectorAll('.quiz-btn'), function (b) {
        b.disabled = false; b.classList.remove('picked');
      });
    });
    if (quizBar) quizBar.classList.remove('show');
    quizGoTo(quizItems[0].q);
  }

  function quizAnswer(item, choice, btnWrap) {
    if (item.done) return;
    item.done = true;
    quizDone++;
    var match = (choice === item.key);
    if (match) quizCorrect++;
    Array.prototype.forEach.call(btnWrap.querySelectorAll('.quiz-btn'), function (b) {
      b.disabled = true;
      if ((b.getAttribute('data-v') === 'true') === choice) b.classList.add('picked');
    });
    var list = match ? MSG_OK : MSG_NO, k;
    do { k = Math.floor(Math.random() * list.length); } while (list.length > 1 && k === quizLastMsg);
    quizLastMsg = k;
    var bar = ensureQuizBar();
    bar.querySelector('.quiz-msg').textContent = list[k];
    bar.querySelector('.quiz-skor').textContent = 'Skor: ' + quizScore() + '/100';
    bar.classList.add('show');
    quizGoTo(item.a);
  }

  (function initQuiz() {
    var pages = Array.prototype.slice.call(container.children);
    for (var i = 0; i < pages.length - 1; i++) {
      var h1 = pages[i].querySelector('h1');
      if (!h1 || !/^Ke-\d+$/i.test(h1.textContent.trim())) continue;
      var h2 = null, hs = pages[i].querySelectorAll('h2');
      for (var j = 0; j < hs.length; j++) if (/benar\s+atau\s+salah/i.test(hs[j].textContent)) { h2 = hs[j]; break; }
      if (!h2) continue;
      var ans = pages[i + 1], ah = ans.querySelectorAll('h2'), key = null;
      for (var m = 0; m < ah.length; m++) {
        var t = ah[m].textContent;
        if (t.indexOf('✅') >= 0 || /\bbenar\b/i.test(t)) { key = true; break; }
        if (t.indexOf('❌') >= 0 || /\bsalah\b/i.test(t)) { key = false; break; }
      }
      if (key === null) continue;
      quizItems.push({ q: pages[i], a: ans, key: key, done: false });
      ans.querySelector('article') && ans.querySelector('article').classList.add('quiz-ans');
      (function (item, h2el) {
        var wrap = document.createElement('div');
        wrap.className = 'quiz-choices';
        wrap.innerHTML = '<button type="button" class="quiz-btn" data-v="true">Benar</button>' +
                         '<button type="button" class="quiz-btn" data-v="false">Salah</button>';
        h2el.parentNode.replaceChild(wrap, h2el);
        Array.prototype.forEach.call(wrap.querySelectorAll('.quiz-btn'), function (b) {
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            if (quizStage !== item.q) return;
            quizAnswer(item, b.getAttribute('data-v') === 'true', wrap);
          });
        });
      })(quizItems[quizItems.length - 1], h2);
      i++; /* lewati halaman jawaban */
    }
    if (!quizItems.length) return;
    var last = quizItems[quizItems.length - 1].a;
    quizEnd = last.nextElementSibling || null;
    if (quizEnd) quizEnd.querySelector('article') && quizEnd.querySelector('article').classList.add('quiz-ans');
  })();

  /* Kunci aktif begitu pembaca sampai di halaman soal pertama */
  var lockTimer = null;
  function checkQuizLock() {
    if (!quizItems.length || quizLocked || quizFinished) return;
    var first = visIndex(quizItems[0].q);
    if (first >= 0 && currentIndex() >= first) {
      quizLocked = true;
      container.classList.add('quiz-lock');
      quizStage = quizItems[0].q;
      container.scrollTo({ left: first * container.clientWidth, behavior: 'auto' });
      updateDots();
    }
  }
  container.addEventListener('scroll', function () {
    if (!quizItems.length || quizFinished) return;
    clearTimeout(lockTimer);
    lockTimer = setTimeout(function () {
      if (!quizLocked) { checkQuizLock(); return; }
      /* pengaman: jika terlanjur bergeser keluar halaman yang diizinkan, kembalikan */
      var want = visIndex(quizStage);
      if (want >= 0 && currentIndex() !== want) container.scrollTo({ left: want * container.clientWidth, behavior: 'auto' });
    }, 150);
  });

  /* ---------- Pindah halaman dengan panah kiri/kanan ---------- */
  function goToPage(delta) {
    if (quizLocked) return; /* mode kuis: pindah halaman hanya lewat tombol */
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
  checkQuizLock();
  window.addEventListener('resize', function () { applyScale(); positionFooter(); updateDots(); });
  window.addEventListener('load', function () { positionFooter(); updateDots(); checkQuizLock(); });
})();
