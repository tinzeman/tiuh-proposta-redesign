/* Ticino Unihockey — script condiviso.
   Ogni modulo parte solo se trova il proprio elemento radice,
   così le pagine che non lo usano non producono errori. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia('(max-width:700px)');
  var noHover = window.matchMedia('(hover: none)');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ── dati del club, condivisi ─────────────────────────── */
  var SEZIONI = window.TIUH_SEZIONI || [];

  function mix(t) {
    var a = [22, 50, 79], b = [226, 35, 26], o = [];
    for (var i = 0; i < 3; i++) o.push(Math.round(a[i] + (b[i] - a[i]) * t));
    return 'rgb(' + o.join(',') + ')';
  }

  /* ── menu ─────────────────────────────────────────────── */
  (function menu() {
    var burger = $('.burger'), nav = $('#nav-main');
    if (!burger || !nav) return;

    function setMenu(open) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
      nav.setAttribute('data-open', String(open));
    }
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    small.addEventListener('change', function (e) { if (!e.matches) setMenu(false); });

    $$('nav.main > div').forEach(function (item) {
      var drop = $('.drop', item);
      if (!drop) return;
      var trigger = $('a.top', item);
      trigger.setAttribute('aria-haspopup', 'true');
      trigger.setAttribute('aria-expanded', 'false');

      function open(v) {
        item.setAttribute('data-open', String(v));
        trigger.setAttribute('aria-expanded', String(v));
      }
      item.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'mouse' && !small.matches) open(true);
      });
      item.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'mouse') open(false);
      });
      item.addEventListener('focusin', function () { if (!small.matches) open(true); });
      item.addEventListener('focusout', function (e) {
        if (!item.contains(e.relatedTarget)) open(false);
      });
      /* Su desktop il link naviga subito: la tendina si apre col passaggio del mouse.
         Senza hover (touch) il primo tocco apre, il secondo naviga. */
      trigger.addEventListener('click', function (e) {
        if (small.matches) return;
        if (noHover.matches && item.getAttribute('data-open') !== 'true') {
          e.preventDefault();
          open(true);
        }
      });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { open(false); trigger.focus(); }
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        setMenu(false); burger.focus();
      }
    });
  })();

  /* ── scroll: header compatto, barra di avanzamento, parallasse ── */
  (function scroll() {
    var header = $('#header'), bar = $('#progress'), pars = $$('[data-par]');
    if (!header) return;
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY || 0;
        header.classList.toggle('scrolled', y > 30);
        if (!reduce) {
          if (bar) {
            var max = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
          }
          var vh = window.innerHeight;
          for (var i = 0; i < pars.length; i++) {
            var el = pars[i], r = el.getBoundingClientRect();
            if (r.bottom < -200 || r.top > vh + 200) continue;
            var p = (r.top + r.height / 2 - vh / 2) / vh;
            el.style.transform = 'translate3d(0,' +
              (p * parseFloat(el.getAttribute('data-par'))).toFixed(2) + 'px,0)';
          }
        }
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  /* ── comparse allo scroll e contatori ─────────────────── */
  (function reveal() {
    function countUp(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      var pre = el.getAttribute('data-prefix') || '';
      var suf = el.getAttribute('data-suffix') || '';
      var done = false;
      function land() { if (!done) { done = true; el.textContent = pre + target + suf; } }
      if (reduce) { land(); return; }
      var t0 = Date.now(), dur = 1100;
      function step() {
        if (done) return;
        var p = Math.min((Date.now() - t0) / dur, 1);
        if (p >= 1) { land(); return; }
        el.textContent = pre + Math.round(target * (1 - Math.pow(1 - p, 3))) + suf;
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      setTimeout(land, dur + 120);
    }

    function activate(el) {
      el.classList.add('in');
      if (el.id === 'pyr') el.classList.add('go');
      $$('[data-count]', el).forEach(countUp);
      if (el.hasAttribute('data-count')) countUp(el);
    }

    var targets = $$('[data-rev]');
    if (!targets.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      targets.forEach(activate);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { activate(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach(function (t) { io.observe(t); });
  })();

  /* ── la piramide ──────────────────────────────────────── */
  (function piramide() {
    var rungs = $('#rungs'), out = $('#pyrOut');
    if (!rungs || !out || !SEZIONI.length) return;

    SEZIONI.forEach(function (s, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rung';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      btn.style.setProperty('--w', s.w);
      btn.style.setProperty('--bg', mix(i / (SEZIONI.length - 1)));
      btn.style.setProperty('--d', (SEZIONI.length - 1 - i) * 55 + 'ms');
      btn.innerHTML = '<b>' + s.b + '</b><i aria-hidden="true"></i>';
      btn.addEventListener('click', function () { show(i); });
      rungs.appendChild(btn);
    });

    function show(i) {
      var s = SEZIONI[i];
      $$('.rung', rungs).forEach(function (r, j) {
        r.setAttribute('aria-selected', String(j === i));
      });
      out.innerHTML = '<div class="fade"><h3><small>' + s.s + '</small>' + s.b + '</h3>' +
        '<p>' + s.d + '</p><p class="staff">' + s.st + '</p>' +
        '<p style="margin-top:12px"><a class="btn btn-ghost btn-sm" href="' + s.url + '">Vai alla squadra</a></p></div>';
    }
    show(SEZIONI.length - 1);
  })();

  /* ── selettore anno di nascita ────────────────────────── */
  (function selettore() {
    var box = $('#years');
    if (!box || !SEZIONI.length) return;

    var YEAR = 2026;
    var MAP = [
      { from: 2006, to: 2008, k: 'u21' }, { from: 2009, to: 2010, k: 'u18' },
      { from: 2011, to: 2012, k: 'u16a' }, { from: 2013, to: 2014, k: 'u14' },
      { from: 2015, to: 2015, k: 'jc' }, { from: 2016, to: 2017, k: 'jd' },
      { from: 2018, to: 2099, k: 'kids' }
    ];
    var byKey = {};
    SEZIONI.forEach(function (s) { byKey[s.k] = s; });

    var years = [];
    for (var y = YEAR - 3; y >= 2006; y--) years.push(y);
    years.push('adulti');

    years.forEach(function (y, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'yr';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.tabIndex = i === 0 ? 0 : -1;
      if (y === 'adulti') {
        b.innerHTML = '2005 o prima<small>settore attivo</small>';
        b.setAttribute('aria-label', 'Nato nel 2005 o prima');
      } else {
        b.innerHTML = y + '<small>' + (YEAR - y) + ' anni</small>';
      }
      b.addEventListener('click', function () { pick(y, b); });
      b.addEventListener('keydown', function (e) {
        var k = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].indexOf(e.key);
        if (k < 0) return;
        e.preventDefault();
        var list = $$('.yr', box);
        var n = list[(list.indexOf(b) + (k < 2 ? 1 : list.length - 1)) % list.length];
        n.focus(); n.click();
      });
      box.appendChild(b);
    });

    function pick(y, el) {
      $$('.yr', box).forEach(function (b) {
        b.setAttribute('aria-checked', 'false'); b.tabIndex = -1;
      });
      el.setAttribute('aria-checked', 'true'); el.tabIndex = 0;

      var s, label;
      if (y === 'adulti') { s = byKey.lnb; label = 'Prima squadra o Seniores'; }
      else {
        var k = 'kids';
        for (var j = 0; j < MAP.length; j++) {
          if (y >= MAP[j].from && y <= MAP[j].to) { k = MAP[j].k; break; }
        }
        s = byKey[k]; label = s.b;
      }

      $('#rBadge').textContent = s.b;
      $('#rName').textContent = 'Con ogni probabilità: ' + label;
      $('#rYears').textContent = (y === 'adulti')
        ? 'Nati nel 2005 o prima' : 'Nati nel ' + y + ' · ' + (YEAR - y) + ' anni';
      $('#rDesc').textContent = s.d;
      $('#rStaff').textContent = s.st;
      $('#rGym').textContent = s.g;
      $('#rContact').textContent = s.c;
      $('#rNote').textContent =
        'Indicazione orientativa: la categoria definitiva la conferma la Commissione Tecnica a inizio stagione.';
      var mail = $('#rMail');
      mail.setAttribute('href', 'mailto:' + s.m);
      mail.textContent = (s.k === 'kids') ? 'Scrivi alla responsabile' : 'Scrivi al club';
      var page = $('#rPage');
      if (page) page.setAttribute('href', s.url);
      $('#result').hidden = false;
      $('#live').textContent = 'Risultato: ' + label + '.';
      $('#rName').focus({ preventScroll: true });
    }
  })();

  /* ── partite da swiss unihockey ───────────────────────── */
  (function partite() {
    var listEl = $('#fxList'), nextEl = $('#nxWho');
    if (!listEl && !nextEl) return;

    var CLUB_ID = 435553, SEASON = 2026;
    var API = 'https://api-v2.swissunihockey.ch/api/games?mode=club&club_id=' + CLUB_ID +
      '&season=' + SEASON + '&games_per_page=300';
    var SNAP = window.TIUH_SNAPSHOT || [];
    var LIMIT = parseInt((listEl && listEl.getAttribute('data-limit')) || '10', 10);

    var COMP = {
      'Herren NLB': 'LNB maschile', 'Mobiliar Unihockey Cup Männer': 'Coppa svizzera',
      'Junioren U21 B': 'Juniores U21 B', 'Junioren U18 B': 'Juniores U18 B',
      'Junioren U16 A': 'Juniores U16 A', 'Junioren U16 C': 'Juniores U16 C',
      'Junioren U14 B': 'Juniores U14 B', 'Junioren C Regional': 'Juniores C',
      'Junioren D Regional': 'Juniores D'
    };
    var GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
    var MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

    function compLabel(c) {
      var base = (c || '').split(' · ')[0];
      return COMP[base] || base;
    }
    function toDate(g) {
      var p = (g.d || '').split('.');
      if (p.length !== 3) return null;
      var t = (g.t || '00:00').split(':');
      return new Date(+p[2], +p[1] - 1, +p[0], +(t[0] || 0), +(t[1] || 0));
    }
    function fmtDay(dt) {
      return GIORNI[dt.getDay()] + ' ' + dt.getDate() + ' ' + MESI[dt.getMonth()];
    }
    /* Quattro casi reali nei dati: designazione e palestra non coincidono sempre.
       Il badge segue la designazione ufficiale; il fuori sede è uno stato a sé. */
    function nostraCasa(v) { return /bellinzona|arti e mestieri/i.test(v || ''); }
    function stato(g) {
      if (g.h.indexOf('Ticino Unihockey') !== 0) return { txt: 'trasferta', cls: '' };
      return nostraCasa(g.v)
        ? { txt: 'in casa', cls: ' home' }
        : { txt: 'in casa · fuori sede', cls: ' offsite' };
    }

    var fxAll = [], fxFilter = 'Tutte';

    function parseApi(json) {
      var out = [];
      var regions = (json && json.data && json.data.regions) || [];
      regions.forEach(function (reg) {
        (reg.rows || []).forEach(function (row) {
          var c = row.cells || [];
          function txt(k) {
            var v = c[k] && c[k].text;
            return Object.prototype.toString.call(v) === '[object Array]' ? v : (v ? [v] : []);
          }
          var dt = txt(0);
          if (!dt.length || String(dt[0]).indexOf('.') < 0) return;
          out.push({
            d: dt[0], t: dt[1] || '', v: txt(1).join(', '), c: txt(2).join(' · '),
            h: txt(3)[0] || '', a: txt(4)[0] || '', r: txt(5)[0] || ''
          });
        });
      });
      return out;
    }

    function renderNext() {
      if (!nextEl) return;
      var now = new Date(), next = null;
      for (var i = 0; i < fxAll.length; i++) {
        var dt = toDate(fxAll[i]);
        if (dt && dt >= now) { next = fxAll[i]; next._dt = dt; break; }
      }
      if (!next) return;
      var ours = next.h.indexOf('Ticino Unihockey') === 0 ? next.h : next.a;
      var opp = next.h.indexOf('Ticino Unihockey') === 0 ? next.a : next.h;
      nextEl.textContent = ours + ' – ' + opp;
      $('#nxComp').textContent = compLabel(next.c) + ' · ' + stato(next).txt;
      $('#nxWhen').textContent = fmtDay(next._dt) + (next.t ? ' · ' + next.t : '');
      $('#nxWhere').textContent = next.v;
    }

    function renderFixtures() {
      if (!listEl) return;
      var now = new Date(), rows = [];
      for (var i = 0; i < fxAll.length && rows.length < LIMIT; i++) {
        var g = fxAll[i], dt = toDate(g);
        if (!dt || dt < now) continue;
        if (fxFilter !== 'Tutte' && compLabel(g.c) !== fxFilter) continue;
        rows.push({ g: g, dt: dt });
      }
      listEl.innerHTML = '';
      if (!rows.length) {
        listEl.innerHTML = '<li class="fx-empty">Nessuna partita in programma per questa selezione.</li>';
        return;
      }
      rows.forEach(function (r, k) {
        var g = r.g, isOurHome = g.h.indexOf('Ticino Unihockey') === 0;
        var us = isOurHome ? g.h : g.a, them = isOurHome ? g.a : g.h;
        var st = stato(g);
        var li = document.createElement('li');
        li.className = 'fx';
        li.style.animationDelay = (k * 35) + 'ms';
        li.innerHTML =
          '<div class="when"><b>' + fmtDay(r.dt) + '</b><span>' + (g.t || '') + '</span></div>' +
          '<div class="who"><b><em>' + us + '</em> – ' + them + '</b><span>' +
            compLabel(g.c) + ' · ' + g.v + '</span></div>' +
          '<span class="tagline' + st.cls + '">' + st.txt + '</span>';
        listEl.appendChild(li);
      });
    }

    function renderResults() {
      var el = $('#fxResults');
      if (!el) return;
      var now = new Date(), rows = [];
      for (var i = fxAll.length - 1; i >= 0 && rows.length < 8; i--) {
        var g = fxAll[i], dt = toDate(g);
        if (!dt || dt > now || !g.r || g.r.indexOf(':') < 0) continue;
        rows.push({ g: g, dt: dt });
      }
      el.innerHTML = '';
      if (!rows.length) {
        el.innerHTML = '<li class="fx-empty">La stagione non è ancora cominciata: qui compariranno i risultati.</li>';
        return;
      }
      rows.forEach(function (r) {
        var g = r.g, isOurHome = g.h.indexOf('Ticino Unihockey') === 0;
        var us = isOurHome ? g.h : g.a, them = isOurHome ? g.a : g.h;
        var p = g.r.split(':');
        var ourGoals = isOurHome ? parseInt(p[0], 10) : parseInt(p[1], 10);
        var theirGoals = isOurHome ? parseInt(p[1], 10) : parseInt(p[0], 10);
        var cls = ourGoals > theirGoals ? ' w' : (ourGoals < theirGoals ? ' l' : '');
        var li = document.createElement('li');
        li.innerHTML =
          '<div class="when"><b>' + fmtDay(r.dt) + '</b></div>' +
          '<div class="who"><b><em>' + us + '</em> – ' + them + '</b><span>' + compLabel(g.c) + '</span></div>' +
          '<span class="sc' + cls + '">' + ourGoals + ':' + theirGoals + '</span>';
        el.appendChild(li);
      });
    }

    function buildFilters() {
      var box = $('#fxFilters');
      if (!box) return;
      var seen = ['Tutte'], now = new Date();
      fxAll.forEach(function (g) {
        var dt = toDate(g);
        if (!dt || dt < now) return;
        var l = compLabel(g.c);
        if (seen.indexOf(l) < 0) seen.push(l);
      });
      box.innerHTML = '';
      seen.forEach(function (label) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.setAttribute('aria-pressed', String(label === fxFilter));
        b.addEventListener('click', function () {
          fxFilter = label;
          $$('button', box).forEach(function (c) {
            c.setAttribute('aria-pressed', String(c === b));
          });
          renderFixtures();
        });
        box.appendChild(b);
      });
    }

    function boot(list, live) {
      fxAll = list.slice().sort(function (a, b) {
        var x = toDate(a), y = toDate(b);
        return (x ? x.getTime() : 0) - (y ? y.getTime() : 0);
      });
      var st = $('#liveState');
      if (st) {
        st.className = 'live' + (live ? '' : ' offline');
        st.lastChild.textContent = live
          ? 'dati in diretta da swiss unihockey · ' + fxAll.length + ' partite in calendario'
          : 'copia locale dei dati — swiss unihockey non raggiungibile';
      }
      var note = $('#fxNote');
      if (note) {
        note.textContent = live
          ? 'Fonte: API pubblica di swiss unihockey, club 435553, stagione 2026/27.'
          : 'Il sito reale ricarica questi dati a ogni visita; qui è mostrata una copia salvata.';
      }
      buildFilters();
      renderFixtures();
      renderResults();
      renderNext();
    }

    var settled = false;
    function fallback() { if (!settled) { settled = true; boot(SNAP, false); } }
    var guard = setTimeout(fallback, 6000);

    if (window.fetch) {
      fetch(API, { mode: 'cors' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (j) {
          var list = parseApi(j);
          if (!list.length) throw new Error('vuoto');
          if (!settled) { settled = true; clearTimeout(guard); boot(list, true); }
        })
        .catch(function () { clearTimeout(guard); fallback(); });
    } else {
      clearTimeout(guard); fallback();
    }
  })();
})();
